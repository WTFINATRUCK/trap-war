CREATE TABLE players (
  player_id uuid PRIMARY KEY,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DELETED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE player_identities (
  identity_id uuid PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('GUEST', 'EMAIL', 'SOCIAL', 'BASE_ACCOUNT', 'EXTERNAL_WALLET', 'TELEGRAM_LEGACY')),
  provider_subject text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_subject)
);

CREATE INDEX player_identities_player_idx ON player_identities(player_id);

CREATE TABLE game_sessions (
  session_id uuid PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX game_sessions_player_idx ON game_sessions(player_id);
CREATE INDEX game_sessions_active_token_idx ON game_sessions(token_hash, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE game_runs (
  run_id uuid PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES players(player_id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('ACTIVE', 'COMPLETED')),
  seed_ciphertext text NOT NULL,
  seed_iv text NOT NULL,
  seed_auth_tag text NOT NULL,
  economy_version text NOT NULL,
  content_version text NOT NULL,
  balance_version text NOT NULL,
  random_strategy_version text NOT NULL,
  next_event_sequence bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX game_runs_player_created_idx ON game_runs(player_id, created_at DESC);

CREATE TABLE game_run_state (
  run_id uuid PRIMARY KEY REFERENCES game_runs(run_id) ON DELETE CASCADE,
  state_version bigint NOT NULL,
  state_json jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE game_commands (
  command_record_id uuid PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES game_runs(run_id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(player_id) ON DELETE RESTRICT,
  command_id text NOT NULL,
  command_type text NOT NULL,
  expected_state_version bigint NOT NULL,
  request_hash text NOT NULL,
  status text NOT NULL CHECK (status IN ('ACCEPTED')),
  resulting_state_version bigint NOT NULL,
  random_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  response_status integer NOT NULL,
  response_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, command_id)
);

CREATE INDEX game_commands_player_created_idx ON game_commands(player_id, created_at DESC);

CREATE TABLE game_events (
  run_id uuid NOT NULL REFERENCES game_runs(run_id) ON DELETE CASCADE,
  sequence bigint NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  event_version integer NOT NULL DEFAULT 1,
  event_payload jsonb NOT NULL,
  occurred_day integer NOT NULL,
  command_id text NOT NULL,
  correlation_id text NOT NULL,
  economy_version text NOT NULL,
  content_version text NOT NULL,
  balance_version text NOT NULL,
  random_strategy_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (run_id, sequence),
  UNIQUE (run_id, event_id)
);

CREATE INDEX game_events_command_idx ON game_events(run_id, command_id);

CREATE TABLE outbox_events (
  outbox_event_id uuid PRIMARY KEY,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  event_type text NOT NULL,
  event_payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  published_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX outbox_pending_idx ON outbox_events(status, available_at, created_at);

CREATE TABLE idempotency_records (
  player_id uuid NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  scope text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  response_status integer NOT NULL,
  response_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (player_id, scope, idempotency_key)
);

CREATE INDEX idempotency_expiry_idx ON idempotency_records(expires_at);
