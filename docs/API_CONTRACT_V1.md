# Trap Wars API Contract V1

Base path: `/api/v1`

All request and response bodies are JSON. Mutating run endpoints require `Authorization: Bearer <accessToken>` and `Idempotency-Key: <1-128 safe characters>`. Command IDs use the same safe-character and length policy. Unknown fields are rejected.

## Guest authentication

`POST /api/v1/auth/guest`

Request: `{}`

Response `201`:

```json
{
  "accessToken": "opaque-token-returned-once",
  "expiresAt": "2026-08-12T00:00:00.000Z",
  "player": { "playerId": "uuid" }
}
```

Only a SHA-256 token hash is stored. The current M6 token is a minimum integration session, not the final account/recovery system.

## Create run

`POST /api/v1/runs`

Request: `{}`

Response `201`:

```json
{
  "run": {
    "runId": "uuid",
    "status": "active",
    "stateVersion": 1,
    "versions": {
      "economyVersion": "economy-v2.m5.6",
      "contentVersion": "content-v2.m5.6.1",
      "balanceVersion": "balance-v2.m5.6.1",
      "randomStrategyVersion": "hmac-sha256-streams.1"
    },
    "day": 1,
    "actionsRemaining": 3,
    "legalActions": []
  },
  "events": []
}
```

The actual projection also includes visible cash, reserves, liabilities, location, prices, inventory, stashes, gear, rank, reputation, unlocked locations, clients, known forecasts, stats, and final result fields when complete. Protected seed material and server-only forecast evidence are absent.

Repeating the same create request with the same idempotency key returns the stored `201` result and does not create another run.

## Submit command

`POST /api/v1/runs/{runId}/commands`

Envelope:

```json
{
  "commandId": "device-session-42",
  "expectedStateVersion": 1,
  "commandType": "BuyAsset",
  "payload": { "assetId": "weed", "quantity": 1 }
}
```

Supported V1 command types and payloads:

| Type | Payload |
| --- | --- |
| `BuyAsset` | `{ assetId, quantity }` |
| `SellAsset` | `{ assetId, quantity }` |
| `Travel` | `{ destinationLocationId, mode }` |
| `DepositStash` | `{ assetId, quantity }` |
| `WithdrawStash` | `{ locationId, assetId, quantity }` |
| `AcceptClient` | `{ clientId }` |
| `UsePlug` | `{ assetId, locationId }` |
| `EndDay` | `{}` |
| `EndRun` | `{}` |

`StartRun` is not accepted at the command boundary; run creation owns initialization.

An accepted command returns `200` with `{ run, events }`. `run.stateVersion` is the next authoritative version. Events are presentation-safe outcomes and omit the internal `CommandCommitted` event.

## Load run

`GET /api/v1/runs/{runId}`

Returns `200` with `{ run }`, including current legal actions. Foreign-owned and unknown runs both return `404 RUN_NOT_FOUND`.

## Conflict reconciliation

A stale command returns `409 STATE_CONFLICT`. `error.details.currentStateVersion` and `error.details.run` contain a safe current projection. Unity must replace its authoritative model from that projection before offering another economic command.

## Error envelope

```json
{
  "error": {
    "code": "COMMAND_REJECTED",
    "message": "Not enough liquid cash for this purchase.",
    "requestId": "request-correlation-id",
    "details": {
      "reasonCode": "INSUFFICIENT_CASH",
      "legalActions": []
    }
  }
}
```

| HTTP | Code | Meaning |
| --- | --- | --- |
| `400` | `INVALID_COMMAND` | Schema, header, or payload validation failed |
| `401` | `AUTH_REQUIRED` | Bearer session is missing, invalid, revoked, or expired |
| `404` | `RUN_NOT_FOUND` | Run is absent or not owned by the authenticated player |
| `409` | `STATE_CONFLICT` | Expected state version is stale |
| `409` | `IDEMPOTENCY_CONFLICT` | Key or command ID was reused with different request data |
| `422` | `COMMAND_REJECTED` | Valid request is illegal under economy rules |
| `429` | `RATE_LIMITED` | Local request budget exceeded |
| `500` | `INTERNAL_ERROR` | Unexpected server failure; no internal detail is exposed |

## Service endpoints

- `GET /health` returns `{ "status": "ok" }` without probing dependencies.
- `GET /ready` executes `select 1`; it returns `200` when PostgreSQL is reachable and `503` otherwise.
