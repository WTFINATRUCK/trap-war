import type { EconomyState, RandomEvidence } from "@trap-wars/economy-engine";
import { bigint, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

const timestampColumn = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const players = pgTable("players", {
  playerId: uuid("player_id").primaryKey(),
  status: text("status").notNull().default("ACTIVE"),
  createdAt: timestampColumn("created_at").notNull().defaultNow(),
  updatedAt: timestampColumn("updated_at").notNull().defaultNow(),
});

export const playerIdentities = pgTable("player_identities", {
  identityId: uuid("identity_id").primaryKey(),
  playerId: uuid("player_id").notNull().references(() => players.playerId, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerSubject: text("provider_subject").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestampColumn("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("player_identities_provider_subject_idx").on(table.provider, table.providerSubject),
  index("player_identities_player_idx").on(table.playerId),
]);

export const gameSessions = pgTable("game_sessions", {
  sessionId: uuid("session_id").primaryKey(),
  playerId: uuid("player_id").notNull().references(() => players.playerId, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestampColumn("expires_at").notNull(),
  revokedAt: timestampColumn("revoked_at"),
  createdAt: timestampColumn("created_at").notNull().defaultNow(),
  lastSeenAt: timestampColumn("last_seen_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("game_sessions_token_hash_idx").on(table.tokenHash),
  index("game_sessions_player_idx").on(table.playerId),
]);

export const gameRuns = pgTable("game_runs", {
  runId: uuid("run_id").primaryKey(),
  playerId: uuid("player_id").notNull().references(() => players.playerId, { onDelete: "restrict" }),
  status: text("status").notNull(),
  seedCiphertext: text("seed_ciphertext").notNull(),
  seedIv: text("seed_iv").notNull(),
  seedAuthTag: text("seed_auth_tag").notNull(),
  economyVersion: text("economy_version").notNull(),
  contentVersion: text("content_version").notNull(),
  balanceVersion: text("balance_version").notNull(),
  randomStrategyVersion: text("random_strategy_version").notNull(),
  nextEventSequence: bigint("next_event_sequence", { mode: "number" }).notNull().default(0),
  createdAt: timestampColumn("created_at").notNull().defaultNow(),
  updatedAt: timestampColumn("updated_at").notNull().defaultNow(),
  completedAt: timestampColumn("completed_at"),
}, (table) => [index("game_runs_player_created_idx").on(table.playerId, table.createdAt)]);

export const gameRunState = pgTable("game_run_state", {
  runId: uuid("run_id").primaryKey().references(() => gameRuns.runId, { onDelete: "cascade" }),
  stateVersion: bigint("state_version", { mode: "number" }).notNull(),
  stateJson: jsonb("state_json").$type<EconomyState>().notNull(),
  updatedAt: timestampColumn("updated_at").notNull().defaultNow(),
});

export const gameCommands = pgTable("game_commands", {
  commandRecordId: uuid("command_record_id").primaryKey(),
  runId: uuid("run_id").notNull().references(() => gameRuns.runId, { onDelete: "cascade" }),
  playerId: uuid("player_id").notNull().references(() => players.playerId, { onDelete: "restrict" }),
  commandId: text("command_id").notNull(),
  commandType: text("command_type").notNull(),
  expectedStateVersion: bigint("expected_state_version", { mode: "number" }).notNull(),
  requestHash: text("request_hash").notNull(),
  status: text("status").notNull(),
  resultingStateVersion: bigint("resulting_state_version", { mode: "number" }).notNull(),
  randomEvidence: jsonb("random_evidence").$type<RandomEvidence[]>().notNull().default([]),
  responseStatus: integer("response_status").notNull(),
  responseJson: jsonb("response_json").$type<Record<string, unknown>>().notNull(),
  createdAt: timestampColumn("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("game_commands_run_command_idx").on(table.runId, table.commandId),
  index("game_commands_player_created_idx").on(table.playerId, table.createdAt),
]);

export const gameEvents = pgTable("game_events", {
  runId: uuid("run_id").notNull().references(() => gameRuns.runId, { onDelete: "cascade" }),
  sequence: bigint("sequence", { mode: "number" }).notNull(),
  eventId: text("event_id").notNull(),
  eventType: text("event_type").notNull(),
  eventVersion: integer("event_version").notNull().default(1),
  eventPayload: jsonb("event_payload").$type<Record<string, unknown>>().notNull(),
  occurredDay: integer("occurred_day").notNull(),
  commandId: text("command_id").notNull(),
  correlationId: text("correlation_id").notNull(),
  economyVersion: text("economy_version").notNull(),
  contentVersion: text("content_version").notNull(),
  balanceVersion: text("balance_version").notNull(),
  randomStrategyVersion: text("random_strategy_version").notNull(),
  createdAt: timestampColumn("created_at").notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.runId, table.sequence] }),
  uniqueIndex("game_events_run_event_idx").on(table.runId, table.eventId),
  index("game_events_command_idx").on(table.runId, table.commandId),
]);

export const outboxEvents = pgTable("outbox_events", {
  outboxEventId: uuid("outbox_event_id").primaryKey(),
  aggregateType: text("aggregate_type").notNull(),
  aggregateId: uuid("aggregate_id").notNull(),
  eventType: text("event_type").notNull(),
  eventPayload: jsonb("event_payload").$type<Record<string, unknown>>().notNull(),
  status: text("status").notNull().default("PENDING"),
  attempts: integer("attempts").notNull().default(0),
  availableAt: timestampColumn("available_at").notNull().defaultNow(),
  lockedAt: timestampColumn("locked_at"),
  publishedAt: timestampColumn("published_at"),
  lastError: text("last_error"),
  createdAt: timestampColumn("created_at").notNull().defaultNow(),
}, (table) => [index("outbox_pending_idx").on(table.status, table.availableAt, table.createdAt)]);

export const idempotencyRecords = pgTable("idempotency_records", {
  playerId: uuid("player_id").notNull().references(() => players.playerId, { onDelete: "cascade" }),
  scope: text("scope").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  responseStatus: integer("response_status").notNull(),
  responseJson: jsonb("response_json").$type<Record<string, unknown>>().notNull(),
  createdAt: timestampColumn("created_at").notNull().defaultNow(),
  expiresAt: timestampColumn("expires_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.playerId, table.scope, table.idempotencyKey] }),
  index("idempotency_expiry_idx").on(table.expiresAt),
]);
