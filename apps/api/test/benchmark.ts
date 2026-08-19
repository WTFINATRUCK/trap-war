import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { buildApp } from "../src/app.js";
import type { ApiConfig } from "../src/config.js";
import type { AppDatabase } from "../src/database/client.js";
import { applyMigrations } from "../src/database/migrations.js";
import * as schema from "../src/database/schema.js";
import { RunService } from "../src/runs/service.js";

const config: ApiConfig = {
  nodeEnv: "test",
  databaseUrl: "pglite://memory",
  host: "127.0.0.1",
  port: 8_787,
  logLevel: "silent",
  authSessionTtlSeconds: 86_400,
  rateLimitWindowMs: 60_000,
  rateLimitMaxRequests: 100_000,
  runSeedEncryptionKey: Buffer.alloc(32, 11),
};

function distribution(samples: number[]) {
  const sorted = [...samples].sort((left, right) => left - right);
  const percentile = (value: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * value))] ?? 0;
  return {
    samples: samples.length,
    p50Ms: Number(percentile(0.5).toFixed(3)),
    p95Ms: Number(percentile(0.95).toFixed(3)),
    maxMs: Number((sorted.at(-1) ?? 0).toFixed(3)),
  };
}

async function timed<T>(operation: () => Promise<T>): Promise<{ elapsed: number; value: T }> {
  const startedAt = performance.now();
  const value = await operation();
  return { elapsed: performance.now() - startedAt, value };
}

const client = new PGlite();
await applyMigrations({
  async execute(statement) {
    const results = await client.exec(statement);
    return { rows: results.at(-1)?.rows ?? [] };
  },
});
const db = drizzle(client, { schema }) as unknown as AppDatabase;
const app = buildApp({ db, config, logger: false });
await app.ready();

const createSamples: number[] = [];
let benchmarkToken = "";
let benchmarkPlayerId = "";
let benchmarkRunId = "";
for (let index = 0; index < 20; index += 1) {
  const guest = await app.inject({ method: "POST", url: "/api/v1/auth/guest", payload: {} });
  const session = guest.json() as { accessToken: string; player: { playerId: string } };
  const created = await timed(() => app.inject({
    method: "POST",
    url: "/api/v1/runs",
    headers: { authorization: `Bearer ${session.accessToken}`, "idempotency-key": `create-${index}` },
    payload: {},
  }));
  if (created.value.statusCode !== 201) throw new Error(created.value.body);
  createSamples.push(created.elapsed);
  if (index === 0) {
    benchmarkToken = session.accessToken;
    benchmarkPlayerId = session.player.playerId;
    benchmarkRunId = (created.value.json() as { run: { runId: string } }).run.runId;
  }
}

const commandSamples: number[] = [];
let stateVersion = 1;
for (let index = 0; index < 20; index += 1) {
  const command = await timed(() => app.inject({
    method: "POST",
    url: `/api/v1/runs/${benchmarkRunId}/commands`,
    headers: { authorization: `Bearer ${benchmarkToken}`, "idempotency-key": `command-${index}` },
    payload: {
      commandId: `benchmark-${index}`,
      expectedStateVersion: stateVersion,
      commandType: "EndDay",
      payload: {},
    },
  }));
  if (command.value.statusCode !== 200) throw new Error(command.value.body);
  stateVersion = (command.value.json() as { run: { stateVersion: number } }).run.stateVersion;
  commandSamples.push(command.elapsed);
}

const transactionSamples: number[] = [];
for (let index = 0; index < 100; index += 1) {
  const transaction = await timed(() => db.transaction(async (tx) => tx.execute(sql`select 1`)));
  transactionSamples.push(transaction.elapsed);
}

const service = new RunService(db, config);
const replaySamples: number[] = [];
for (let index = 0; index < 50; index += 1) {
  const replay = await timed(() => service.replayRun(
    { playerId: benchmarkPlayerId, sessionId: "benchmark" },
    benchmarkRunId,
  ));
  replaySamples.push(replay.elapsed);
}

const stateResponse = await app.inject({
  method: "GET",
  url: `/api/v1/runs/${benchmarkRunId}`,
  headers: { authorization: `Bearer ${benchmarkToken}` },
});
const report = {
  generatedAt: new Date().toISOString(),
  runtime: "PGlite 0.5.4 in-process PostgreSQL/WASM development baseline",
  node: process.version,
  platform: `${process.platform}-${process.arch}`,
  warmupExcluded: true,
  runCreation: distribution(createSamples),
  command: distribution(commandSamples),
  databaseTransaction: distribution(transactionSamples),
  replay: distribution(replaySamples),
  stateSerializationBytes: Buffer.byteLength(stateResponse.body, "utf8"),
};

const outputPath = resolve(import.meta.dirname, "performance-baseline.json");
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

await app.close();
await client.close();
