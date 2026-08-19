import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import type { ApiConfig } from "../src/config.js";
import type { AppDatabase } from "../src/database/client.js";
import { applyMigrations } from "../src/database/migrations.js";
import * as schema from "../src/database/schema.js";
import {
  gameCommands,
  gameEvents,
  gameRunState,
  idempotencyRecords,
  outboxEvents,
} from "../src/database/schema.js";
import { RunService, type RunServiceOptions } from "../src/runs/service.js";
import { OutboxWorker } from "../src/outbox/worker.js";

const config: ApiConfig = {
  nodeEnv: "test",
  databaseUrl: "pglite://memory",
  host: "127.0.0.1",
  port: 8_787,
  logLevel: "silent",
  authSessionTtlSeconds: 86_400,
  rateLimitWindowMs: 60_000,
  rateLimitMaxRequests: 10_000,
  runSeedEncryptionKey: Buffer.alloc(32, 7),
};

interface Harness {
  app: FastifyInstance;
  db: AppDatabase;
  client: PGlite;
  close(): Promise<void>;
}

interface GuestSession {
  accessToken: string;
  player: { playerId: string };
}

interface RunResponse {
  run: {
    runId: string;
    status: "active" | "completed";
    stateVersion: number;
    day: number;
    randomSeedId?: string;
    processedCommands?: unknown;
  };
  events?: Array<Record<string, unknown>>;
}

async function createHarness(runServiceOptions?: RunServiceOptions): Promise<Harness> {
  const client = new PGlite();
  await applyMigrations({
    async execute(statement) {
      const results = await client.exec(statement);
      return { rows: results.at(-1)?.rows ?? [] };
    },
  });
  const db = drizzle(client, { schema }) as unknown as AppDatabase;
  const app = buildApp({ db, config, runServiceOptions, logger: false });
  await app.ready();
  return {
    app,
    db,
    client,
    async close() {
      await app.close();
      await client.close();
    },
  };
}

async function guest(app: FastifyInstance): Promise<GuestSession> {
  const response = await app.inject({ method: "POST", url: "/api/v1/auth/guest", payload: {} });
  assert.equal(response.statusCode, 201, response.body);
  return response.json() as GuestSession;
}

async function createRun(app: FastifyInstance, accessToken: string, key = "create-1") {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/runs",
    headers: { authorization: `Bearer ${accessToken}`, "idempotency-key": key },
    payload: {},
  });
  assert.equal(response.statusCode, 201, response.body);
  return { response, body: response.json() as RunResponse };
}

function commandRequest(
  accessToken: string,
  runId: string,
  key: string,
  commandId: string,
  stateVersion: number,
  commandType: "BuyAsset" | "EndDay" | "EndRun",
  payload: Record<string, unknown> = {},
) {
  return {
    method: "POST" as const,
    url: `/api/v1/runs/${runId}/commands`,
    headers: { authorization: `Bearer ${accessToken}`, "idempotency-key": key },
    payload: { commandId, expectedStateVersion: stateVersion, commandType, payload },
  };
}

test("creates a guest-owned authoritative run without leaking seed material", async () => {
  const harness = await createHarness();
  try {
    const session = await guest(harness.app);
    const { response, body } = await createRun(harness.app, session.accessToken);
    assert.equal(body.run.stateVersion, 1);
    assert.equal(body.run.day, 1);
    assert.equal(body.run.randomSeedId, undefined);
    assert.equal(body.run.processedCommands, undefined);
    assert.doesNotMatch(response.body, /randomSeed|randomDecisionIds|sourceQualityBps/);
    const commandRecords = await harness.db.select().from(gameCommands)
      .where(eq(gameCommands.runId, body.run.runId));
    assert.ok((commandRecords[0]?.randomEvidence.length ?? 0) > 0);

    const retried = await harness.app.inject({
      method: "POST",
      url: "/api/v1/runs",
      headers: { authorization: `Bearer ${session.accessToken}`, "idempotency-key": "create-1" },
      payload: {},
    });
    assert.equal(retried.statusCode, 201);
    assert.deepEqual(retried.json(), response.json());
  } finally {
    await harness.close();
  }
});

test("commits accepted commands and leaves domain-rejected commands untouched", async () => {
  const harness = await createHarness();
  try {
    const session = await guest(harness.app);
    const created = await createRun(harness.app, session.accessToken);
    const runId = created.body.run.runId;
    const accepted = await harness.app.inject(commandRequest(
      session.accessToken, runId, "buy-1", "buy-1", 1, "BuyAsset", { assetId: "weed", quantity: 1 },
    ));
    assert.equal(accepted.statusCode, 200, accepted.body);
    const acceptedBody = accepted.json() as RunResponse;
    assert.equal(acceptedBody.run.stateVersion, 2);

    const beforeReject = await Promise.all([
      harness.db.select({ count: sql<number>`count(*)::int` }).from(gameCommands),
      harness.db.select({ count: sql<number>`count(*)::int` }).from(gameEvents),
      harness.db.select({ count: sql<number>`count(*)::int` }).from(outboxEvents),
      harness.db.select({ count: sql<number>`count(*)::int` }).from(idempotencyRecords),
    ]);

    const rejected = await harness.app.inject(commandRequest(
      session.accessToken, runId, "buy-too-much", "buy-too-much", 2, "BuyAsset", { assetId: "weed", quantity: 1_000_000 },
    ));
    assert.equal(rejected.statusCode, 422, rejected.body);
    assert.equal((rejected.json() as { error: { details: { reasonCode: string } } }).error.details.reasonCode, "INSUFFICIENT_CASH");

    const afterReject = await Promise.all([
      harness.db.select({ count: sql<number>`count(*)::int` }).from(gameCommands),
      harness.db.select({ count: sql<number>`count(*)::int` }).from(gameEvents),
      harness.db.select({ count: sql<number>`count(*)::int` }).from(outboxEvents),
      harness.db.select({ count: sql<number>`count(*)::int` }).from(idempotencyRecords),
    ]);
    assert.deepEqual(afterReject, beforeReject);

    const current = await harness.app.inject({
      method: "GET",
      url: `/api/v1/runs/${runId}`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    assert.equal((current.json() as RunResponse).run.stateVersion, 2);
  } finally {
    await harness.close();
  }
});

test("serializes concurrent writers and rejects the stale state version", async () => {
  const harness = await createHarness();
  try {
    const session = await guest(harness.app);
    const created = await createRun(harness.app, session.accessToken);
    const runId = created.body.run.runId;
    const [left, right] = await Promise.all([
      harness.app.inject(commandRequest(session.accessToken, runId, "concurrent-left", "concurrent-left", 1, "EndDay")),
      harness.app.inject(commandRequest(session.accessToken, runId, "concurrent-right", "concurrent-right", 1, "EndDay")),
    ]);
    assert.deepEqual([left.statusCode, right.statusCode].sort(), [200, 409]);
    const conflict = left.statusCode === 409 ? left : right;
    assert.equal((conflict.json() as { error: { code: string } }).error.code, "STATE_CONFLICT");
  } finally {
    await harness.close();
  }
});

test("returns the exact stored response for command retries without duplicate events", async () => {
  const harness = await createHarness();
  try {
    const session = await guest(harness.app);
    const created = await createRun(harness.app, session.accessToken);
    const request = commandRequest(session.accessToken, created.body.run.runId, "retry-key", "retry-command", 1, "EndDay");
    const first = await harness.app.inject(request);
    const countAfterFirst = await harness.db.select({ count: sql<number>`count(*)::int` }).from(gameEvents)
      .where(eq(gameEvents.runId, created.body.run.runId));
    const second = await harness.app.inject(request);
    const countAfterSecond = await harness.db.select({ count: sql<number>`count(*)::int` }).from(gameEvents)
      .where(eq(gameEvents.runId, created.body.run.runId));
    assert.equal(first.statusCode, 200, first.body);
    assert.deepEqual(second.json(), first.json());
    assert.equal(countAfterSecond[0]?.count, countAfterFirst[0]?.count);
  } finally {
    await harness.close();
  }
});

test("rolls back events, snapshot, command, idempotency, and outbox on transaction failure", async () => {
  let fail = false;
  const harness = await createHarness({
    async afterEventsPersisted() {
      if (fail) throw new Error("injected transaction failure");
    },
  });
  try {
    const session = await guest(harness.app);
    const created = await createRun(harness.app, session.accessToken);
    const runId = created.body.run.runId;
    const countsBefore = await Promise.all([
      harness.db.select({ count: sql<number>`count(*)::int` }).from(gameCommands),
      harness.db.select({ count: sql<number>`count(*)::int` }).from(gameEvents),
      harness.db.select({ count: sql<number>`count(*)::int` }).from(outboxEvents),
      harness.db.select({ count: sql<number>`count(*)::int` }).from(idempotencyRecords),
    ]);
    fail = true;
    const failed = await harness.app.inject(commandRequest(session.accessToken, runId, "fail-key", "fail-command", 1, "EndDay"));
    assert.equal(failed.statusCode, 500, failed.body);
    const countsAfter = await Promise.all([
      harness.db.select({ count: sql<number>`count(*)::int` }).from(gameCommands),
      harness.db.select({ count: sql<number>`count(*)::int` }).from(gameEvents),
      harness.db.select({ count: sql<number>`count(*)::int` }).from(outboxEvents),
      harness.db.select({ count: sql<number>`count(*)::int` }).from(idempotencyRecords),
    ]);
    const snapshot = await harness.db.select().from(gameRunState).where(eq(gameRunState.runId, runId));
    assert.deepEqual(countsAfter, countsBefore);
    assert.equal(snapshot[0]?.stateVersion, 1);
  } finally {
    await harness.close();
  }
});

test("conceals runs from players who do not own them", async () => {
  const harness = await createHarness();
  try {
    const owner = await guest(harness.app);
    const stranger = await guest(harness.app);
    const created = await createRun(harness.app, owner.accessToken);
    const read = await harness.app.inject({
      method: "GET",
      url: `/api/v1/runs/${created.body.run.runId}`,
      headers: { authorization: `Bearer ${stranger.accessToken}` },
    });
    const write = await harness.app.inject(commandRequest(
      stranger.accessToken, created.body.run.runId, "stranger", "stranger", 1, "EndDay",
    ));
    assert.equal(read.statusCode, 404);
    assert.equal(write.statusCode, 404);
  } finally {
    await harness.close();
  }
});

test("replays immutable events to the exact stored state", async () => {
  const harness = await createHarness();
  try {
    const session = await guest(harness.app);
    const created = await createRun(harness.app, session.accessToken);
    const command = await harness.app.inject(commandRequest(
      session.accessToken, created.body.run.runId, "replay-day", "replay-day", 1, "EndDay",
    ));
    assert.equal(command.statusCode, 200, command.body);
    const service = new RunService(harness.db, config);
    const replayed = await service.replayRun({ playerId: session.player.playerId, sessionId: "test" }, created.body.run.runId);
    const stored = await harness.db.select().from(gameRunState).where(eq(gameRunState.runId, created.body.run.runId));
    assert.deepEqual(replayed, stored[0]?.stateJson);
  } finally {
    await harness.close();
  }
});

test("publishes committed outbox records through the database poller", async () => {
  const harness = await createHarness();
  try {
    const session = await guest(harness.app);
    await createRun(harness.app, session.accessToken);
    const published: string[] = [];
    const worker = new OutboxWorker(harness.db, {
      async publish(message) {
        published.push(message.outboxEventId);
      },
    });
    const result = await worker.pollOnce();
    const stored = await harness.db.select().from(outboxEvents);
    assert.ok(result.claimed > 0);
    assert.equal(result.published, result.claimed);
    assert.equal(published.length, result.claimed);
    assert.ok(stored.every((event) => event.status === "PUBLISHED"));
  } finally {
    await harness.close();
  }
});

test("completes the authoritative run at day 30", async () => {
  const harness = await createHarness();
  try {
    const session = await guest(harness.app);
    const created = await createRun(harness.app, session.accessToken);
    let stateVersion = created.body.run.stateVersion;
    let latest = created.body;
    for (let day = 1; day <= 30; day += 1) {
      const response = await harness.app.inject(commandRequest(
        session.accessToken,
        created.body.run.runId,
        `day-${day}`,
        `day-${day}`,
        stateVersion,
        "EndDay",
      ));
      assert.equal(response.statusCode, 200, response.body);
      latest = response.json() as RunResponse;
      stateVersion = latest.run.stateVersion;
    }
    assert.equal(latest.run.status, "completed");
    assert.equal(latest.run.day, 30);
  } finally {
    await harness.close();
  }
});
