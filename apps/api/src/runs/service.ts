import {
  DEFAULT_ECONOMY_CONTENT,
  V2_VERSIONS,
  executeCommand as executeEconomyCommand,
  reduceEvents,
  type DomainEvent,
  type EconomyCommand,
  type EconomyState,
} from "@trap-wars/economy-engine";
import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { ApiConfig } from "../config.js";
import type { AppDatabase } from "../database/client.js";
import {
  gameCommands,
  gameEvents,
  gameRuns,
  gameRunState,
  idempotencyRecords,
  outboxEvents,
  players,
} from "../database/schema.js";
import { ApiError } from "../http/errors.js";
import { createRunSeed, decryptSecret, encryptSecret, hashRequest } from "../infrastructure/crypto.js";
import type { AuthenticatedPlayer } from "../auth/service.js";
import type { RunCommandBody } from "./command-schema.js";
import { toEconomyCommand } from "./command-schema.js";
import { projectEvents, projectRun } from "./projection.js";

export interface StoredServiceResponse {
  statusCode: number;
  body: Record<string, unknown>;
}

export interface RunServiceOptions {
  afterEventsPersisted?: () => Promise<void>;
}

function asJson(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function eventRows(runId: string, firstSequence: number, correlationId: string, events: DomainEvent[]) {
  return events.map((event, offset) => ({
    runId,
    sequence: firstSequence + offset,
    eventId: event.eventId,
    eventType: event.type,
    eventVersion: 1,
    eventPayload: asJson(event),
    occurredDay: event.occurredDay,
    commandId: event.commandId,
    correlationId,
    economyVersion: V2_VERSIONS.economyVersion,
    contentVersion: V2_VERSIONS.contentVersion,
    balanceVersion: V2_VERSIONS.balanceVersion,
    randomStrategyVersion: V2_VERSIONS.randomStrategyVersion,
  }));
}

function outboxRows(runId: string, events: DomainEvent[]) {
  return events.map((event) => ({
    outboxEventId: randomUUID(),
    aggregateType: "GAME_RUN",
    aggregateId: runId,
    eventType: event.type,
    eventPayload: asJson(event),
  }));
}

function activeStatus(state: EconomyState): "ACTIVE" | "COMPLETED" {
  return state.status === "completed" ? "COMPLETED" : "ACTIVE";
}

export class RunService {
  constructor(
    private readonly db: AppDatabase,
    private readonly config: ApiConfig,
    private readonly options: RunServiceOptions = {},
  ) {}

  async createRun(
    player: AuthenticatedPlayer,
    idempotencyKey: string,
    correlationId: string,
  ): Promise<StoredServiceResponse> {
    const scope = "create_run";
    const requestHash = hashRequest({ apiVersion: 1, body: {} });
    return this.db.transaction(async (transaction) => {
      const lockedPlayers = await transaction
        .select({ playerId: players.playerId })
        .from(players)
        .where(eq(players.playerId, player.playerId))
        .for("update")
        .limit(1);
      if (!lockedPlayers[0]) throw new ApiError(401, "AUTH_REQUIRED", "The player session is no longer valid.");

      const existing = await transaction
        .select()
        .from(idempotencyRecords)
        .where(and(
          eq(idempotencyRecords.playerId, player.playerId),
          eq(idempotencyRecords.scope, scope),
          eq(idempotencyRecords.idempotencyKey, idempotencyKey),
        ))
        .limit(1);
      if (existing[0] && existing[0].expiresAt > new Date()) {
        if (existing[0].requestHash !== requestHash) {
          throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "The idempotency key was already used for a different request.");
        }
        return { statusCode: existing[0].responseStatus, body: existing[0].responseJson };
      }
      if (existing[0]) {
        await transaction.delete(idempotencyRecords).where(and(
          eq(idempotencyRecords.playerId, player.playerId),
          eq(idempotencyRecords.scope, scope),
          eq(idempotencyRecords.idempotencyKey, idempotencyKey),
        ));
      }

      const runId = randomUUID();
      const commandId = randomUUID();
      const runSeed = createRunSeed();
      const encryptedSeed = encryptSecret(runSeed, this.config.runSeedEncryptionKey);
      const command: EconomyCommand = { type: "StartRun", runId, commandId, expectedStateVersion: 0 };
      const result = executeEconomyCommand(undefined, command, { runSeed });
      if (result.status === "rejected") throw new Error(`StartRun rejected: ${result.code}`);

      const body = asJson({
        run: projectRun(result.state),
        events: projectEvents(result.events),
      });
      const expiresAt = new Date(Date.now() + this.config.authSessionTtlSeconds * 1_000);

      await transaction.insert(gameRuns).values({
        runId,
        playerId: player.playerId,
        status: activeStatus(result.state),
        seedCiphertext: encryptedSeed.ciphertext,
        seedIv: encryptedSeed.iv,
        seedAuthTag: encryptedSeed.authTag,
        economyVersion: V2_VERSIONS.economyVersion,
        contentVersion: V2_VERSIONS.contentVersion,
        balanceVersion: V2_VERSIONS.balanceVersion,
        randomStrategyVersion: V2_VERSIONS.randomStrategyVersion,
        nextEventSequence: result.events.length,
      });
      await transaction.insert(gameEvents).values(eventRows(runId, 0, correlationId, result.events));
      await this.options.afterEventsPersisted?.();
      await transaction.insert(outboxEvents).values(outboxRows(runId, result.events));
      await transaction.insert(gameRunState).values({
        runId,
        stateVersion: result.resultingStateVersion,
        stateJson: result.state,
      });
      await transaction.insert(gameCommands).values({
        commandRecordId: randomUUID(),
        runId,
        playerId: player.playerId,
        commandId,
        commandType: "StartRun",
        expectedStateVersion: 0,
        requestHash,
        status: "ACCEPTED",
        resultingStateVersion: result.resultingStateVersion,
        randomEvidence: result.randomEvidence,
        responseStatus: 201,
        responseJson: body,
      });
      await transaction.insert(idempotencyRecords).values({
        playerId: player.playerId,
        scope,
        idempotencyKey,
        requestHash,
        responseStatus: 201,
        responseJson: body,
        expiresAt,
      });
      return { statusCode: 201, body };
    });
  }

  async executeCommand(
    player: AuthenticatedPlayer,
    runId: string,
    body: RunCommandBody,
    idempotencyKey: string,
    correlationId: string,
  ): Promise<StoredServiceResponse> {
    const scope = `run_command:${runId}`;
    const requestHash = hashRequest({ apiVersion: 1, runId, body });
    return this.db.transaction(async (transaction) => {
      const lockedRuns = await transaction
        .select()
        .from(gameRuns)
        .where(eq(gameRuns.runId, runId))
        .for("update")
        .limit(1);
      const run = lockedRuns[0];
      if (!run || run.playerId !== player.playerId) throw new ApiError(404, "RUN_NOT_FOUND", "Run not found.");

      const existingIdempotency = await transaction
        .select()
        .from(idempotencyRecords)
        .where(and(
          eq(idempotencyRecords.playerId, player.playerId),
          eq(idempotencyRecords.scope, scope),
          eq(idempotencyRecords.idempotencyKey, idempotencyKey),
        ))
        .limit(1);
      if (existingIdempotency[0] && existingIdempotency[0].expiresAt > new Date()) {
        if (existingIdempotency[0].requestHash !== requestHash) {
          throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "The idempotency key was already used for a different request.");
        }
        return {
          statusCode: existingIdempotency[0].responseStatus,
          body: existingIdempotency[0].responseJson,
        };
      }
      if (existingIdempotency[0]) {
        await transaction.delete(idempotencyRecords).where(and(
          eq(idempotencyRecords.playerId, player.playerId),
          eq(idempotencyRecords.scope, scope),
          eq(idempotencyRecords.idempotencyKey, idempotencyKey),
        ));
      }

      const existingCommands = await transaction
        .select()
        .from(gameCommands)
        .where(and(eq(gameCommands.runId, runId), eq(gameCommands.commandId, body.commandId)))
        .limit(1);
      if (existingCommands[0]) {
        if (existingCommands[0].requestHash !== requestHash) {
          throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "The command ID was already used for a different request.");
        }
        return { statusCode: existingCommands[0].responseStatus, body: existingCommands[0].responseJson };
      }

      const snapshots = await transaction
        .select()
        .from(gameRunState)
        .where(eq(gameRunState.runId, runId))
        .limit(1);
      const snapshot = snapshots[0];
      if (!snapshot) throw new Error(`Missing state snapshot for run ${runId}`);
      if (body.expectedStateVersion !== snapshot.stateVersion) {
        throw new ApiError(409, "STATE_CONFLICT", "Expected state version does not match the authoritative state.", {
          currentStateVersion: snapshot.stateVersion,
          run: projectRun(snapshot.stateJson),
        });
      }

      const runSeed = decryptSecret({
        ciphertext: run.seedCiphertext,
        iv: run.seedIv,
        authTag: run.seedAuthTag,
      }, this.config.runSeedEncryptionKey);
      const command = toEconomyCommand(body);
      const result = executeEconomyCommand(snapshot.stateJson, command, { runSeed });
      if (result.status === "rejected") {
        throw new ApiError(422, "COMMAND_REJECTED", result.message, {
          reasonCode: result.code,
          ...(result.detail ? { detail: result.detail } : {}),
          legalActions: result.legalActions,
          run: projectRun(snapshot.stateJson),
        });
      }

      const responseBody = asJson({
        run: projectRun(result.state),
        events: projectEvents(result.events),
      });
      const expiresAt = new Date(Date.now() + this.config.authSessionTtlSeconds * 1_000);
      const firstSequence = run.nextEventSequence;

      await transaction.insert(gameEvents).values(eventRows(runId, firstSequence, correlationId, result.events));
      await this.options.afterEventsPersisted?.();
      await transaction.insert(outboxEvents).values(outboxRows(runId, result.events));
      await transaction.update(gameRunState).set({
        stateVersion: result.resultingStateVersion,
        stateJson: result.state,
        updatedAt: new Date(),
      }).where(eq(gameRunState.runId, runId));
      await transaction.update(gameRuns).set({
        status: activeStatus(result.state),
        nextEventSequence: firstSequence + result.events.length,
        updatedAt: new Date(),
        ...(result.state.status === "completed" ? { completedAt: new Date() } : {}),
      }).where(eq(gameRuns.runId, runId));
      await transaction.insert(gameCommands).values({
        commandRecordId: randomUUID(),
        runId,
        playerId: player.playerId,
        commandId: body.commandId,
        commandType: body.commandType,
        expectedStateVersion: body.expectedStateVersion,
        requestHash,
        status: "ACCEPTED",
        resultingStateVersion: result.resultingStateVersion,
        randomEvidence: result.randomEvidence,
        responseStatus: 200,
        responseJson: responseBody,
      });
      await transaction.insert(idempotencyRecords).values({
        playerId: player.playerId,
        scope,
        idempotencyKey,
        requestHash,
        responseStatus: 200,
        responseJson: responseBody,
        expiresAt,
      });
      return { statusCode: 200, body: responseBody };
    });
  }

  async getRun(player: AuthenticatedPlayer, runId: string): Promise<StoredServiceResponse> {
    const rows = await this.db
      .select({ playerId: gameRuns.playerId, state: gameRunState.stateJson })
      .from(gameRuns)
      .innerJoin(gameRunState, eq(gameRunState.runId, gameRuns.runId))
      .where(eq(gameRuns.runId, runId))
      .limit(1);
    const row = rows[0];
    if (!row || row.playerId !== player.playerId) throw new ApiError(404, "RUN_NOT_FOUND", "Run not found.");
    return { statusCode: 200, body: asJson({ run: projectRun(row.state) }) };
  }

  async replayRun(player: AuthenticatedPlayer, runId: string): Promise<EconomyState> {
    const ownedRuns = await this.db
      .select({ playerId: gameRuns.playerId })
      .from(gameRuns)
      .where(eq(gameRuns.runId, runId))
      .limit(1);
    if (!ownedRuns[0] || ownedRuns[0].playerId !== player.playerId) {
      throw new ApiError(404, "RUN_NOT_FOUND", "Run not found.");
    }
    const rows = await this.db
      .select({ eventPayload: gameEvents.eventPayload })
      .from(gameEvents)
      .where(eq(gameEvents.runId, runId))
      .orderBy(asc(gameEvents.sequence));
    return reduceEvents(undefined, rows.map((row) => row.eventPayload as unknown as DomainEvent));
  }
}
