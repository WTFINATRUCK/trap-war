import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  API_HOST: z.string().default("127.0.0.1"),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(8_787),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  AUTH_SESSION_TTL_SECONDS: z.coerce.number().int().min(300).max(31_536_000).default(86_400),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(120),
  RUN_SEED_ENCRYPTION_KEY: z.string().min(1),
});

export interface ApiConfig {
  nodeEnv: "development" | "test" | "production";
  databaseUrl: string;
  host: string;
  port: number;
  logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
  authSessionTtlSeconds: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  runSeedEncryptionKey: Buffer;
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): ApiConfig {
  const parsed = environmentSchema.parse(environment);
  const runSeedEncryptionKey = Buffer.from(parsed.RUN_SEED_ENCRYPTION_KEY, "base64");
  if (runSeedEncryptionKey.length !== 32) {
    throw new Error("RUN_SEED_ENCRYPTION_KEY must decode to exactly 32 bytes");
  }
  return {
    nodeEnv: parsed.NODE_ENV,
    databaseUrl: parsed.DATABASE_URL,
    host: parsed.API_HOST,
    port: parsed.API_PORT,
    logLevel: parsed.LOG_LEVEL,
    authSessionTtlSeconds: parsed.AUTH_SESSION_TTL_SECONDS,
    rateLimitWindowMs: parsed.RATE_LIMIT_WINDOW_MS,
    rateLimitMaxRequests: parsed.RATE_LIMIT_MAX_REQUESTS,
    runSeedEncryptionKey,
  };
}
