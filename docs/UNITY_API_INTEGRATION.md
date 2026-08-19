# Unity API Integration

Status: M7 implementation against the approved M6 `/api/v1` contract.

## Configuration

`TrapWarsRuntimeConfig` selects Local, Staging, or Production and is loaded from `Resources/TrapWarsRuntimeConfig` when an asset exists. The fallback is Local at `http://127.0.0.1:8787`, 15-second timeout, two transport retries, and real API mode. Staging and Production defaults use `.invalid` hosts so an unconfigured build fails closed.

No gameplay component contains an API base URL. To use the deterministic mock, create the configuration asset and opt into `useMockApi`; mock mode is never selected by a transport failure.

## Implemented flow

1. `POST /api/v1/auth/guest` creates or resumes the development session.
2. `GET /api/v1/runs/{runId}` reloads a remembered run; `POST /api/v1/runs` creates one when no valid run exists.
3. The client maps the safe run projection into `RunPresentationModel`.
4. Buy, sell, stash deposit/withdraw, and End Day produce typed command bodies.
5. `POST /api/v1/runs/{runId}/commands` carries bearer auth, `X-Request-Id`, `Idempotency-Key`, `commandId`, and `expectedStateVersion`.
6. On success, the complete local presentation model is replaced before consequence feedback runs.

Money and state/sequence versions use C# `long`. Event extension data uses `JToken` because M6 domain event bodies are intentionally heterogeneous; it is the only loose transport boundary. UI consumes the presentation model, not transport DTOs.

## Retry and uncertain completion

GET requests and requests with an idempotency key receive bounded transport/5xx retries. The serialized body, command ID, and idempotency key are created before the first send and reused for every attempt. A new ID is never generated inside retry logic. Business rejections and conflicts are not automatically retried.

During a request, `NetworkStatus` drives a visible loading/connection surface and economy controls remain pending. M7 never switches to offline economic authority. The player can use the development Reload Projection control after reconnection.

## Conflict and rejection handling

For `STATE_CONFLICT`, `GameRunService` accepts `error.details.run`, replaces `GameStateStore`, clears the in-flight state in the calling UI, and leaves the rejected intention unapplied. Server truth wins. Other structured rejections retain current state and display the safe server message. `CONNECTION_LOST` leaves the last confirmed projection intact.

## Save and resume

`DevProjectionPersistence` stores only access token metadata, player ID, expiry, and run ID. On restart, the run ID locates the server projection; local data cannot restore balances, inventory, prices, or day state. If loading returns `RUN_NOT_FOUND`, the client creates a new run. A 401 currently causes guest-session recovery through a new guest path; production account recovery is not part of M7.

## Real backend runbook

1. Start PostgreSQL with `docker compose up -d postgres`.
2. Copy the M6 values from `.env.example` into a local `.env`, using a real random 32-byte Base64 run-seed key.
3. Run `npm run db:migrate`.
4. Run `npm run api:start` and verify `http://127.0.0.1:8787/ready`.
5. Open `game/unity/` in Unity `6000.3.20f1` and leave `useMockApi` disabled.
6. Enter Play Mode, submit a market command, close Play Mode, enter again, and confirm the same run reloads from PostgreSQL.

This environment could not perform that full route: Docker/PostgreSQL was unavailable and the Unity Editor reported no valid license. M6 PGlite integration tests and all Unity source/test assembly static compiles were run, but they are not substitutes for the required real Unity-to-PostgreSQL acceptance pass.

## Security constraints

- No seed, random evidence, database credential, or server secret enters Unity.
- Tokens are not logged or placed in analytics.
- Player position is presentation evidence only; it is not trusted economic authority.
- Production must replace PlayerPrefs token storage with the secure store appropriate to each platform.
- CORS and HTTPS are deployment configuration, not client bypasses.
