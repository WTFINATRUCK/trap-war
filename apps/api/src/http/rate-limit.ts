import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ApiConfig } from "../config.js";
import { ApiError } from "./errors.js";

interface Bucket {
  count: number;
  resetsAt: number;
}

export function registerRateLimit(app: FastifyInstance, config: ApiConfig): void {
  const buckets = new Map<string, Bucket>();
  app.addHook("onRequest", async (request: FastifyRequest) => {
    if (request.url === "/health" || request.url === "/ready") return;
    const authorization = request.headers.authorization ?? "anonymous";
    const key = `${request.ip}:${authorization.slice(-24)}`;
    const now = Date.now();
    const current = buckets.get(key);
    const bucket = !current || current.resetsAt <= now
      ? { count: 0, resetsAt: now + config.rateLimitWindowMs }
      : current;
    bucket.count += 1;
    buckets.set(key, bucket);
    if (bucket.count > config.rateLimitMaxRequests) {
      throw new ApiError(429, "RATE_LIMITED", "Request rate limit exceeded.", {
        retryAfterMs: Math.max(0, bucket.resetsAt - now),
      });
    }
    if (buckets.size > 10_000) {
      for (const [bucketKey, value] of buckets) if (value.resetsAt <= now) buckets.delete(bucketKey);
    }
  });
}
