import Fastify, { type FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { AuthService } from "./auth/service.js";
import { registerAuthRoutes } from "./auth/routes.js";
import type { ApiConfig } from "./config.js";
import type { AppDatabase } from "./database/client.js";
import { registerErrorHandler } from "./http/errors.js";
import { registerRateLimit } from "./http/rate-limit.js";
import { registerRunRoutes } from "./runs/routes.js";
import { RunService, type RunServiceOptions } from "./runs/service.js";

export interface BuildAppOptions {
  db: AppDatabase;
  config: ApiConfig;
  runServiceOptions?: RunServiceOptions;
  logger?: boolean;
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify({
    logger: options.logger === false ? false : { level: options.config.logLevel },
    bodyLimit: 32 * 1_024,
    requestIdHeader: "x-request-id",
  });
  const authService = new AuthService(options.db, options.config);
  const runService = new RunService(options.db, options.config, options.runServiceOptions);

  registerErrorHandler(app);
  registerRateLimit(app, options.config);
  registerAuthRoutes(app, authService);
  registerRunRoutes(app, authService, runService);

  app.get("/health", async () => ({ status: "ok" }));
  app.get("/ready", async (_request, reply) => {
    try {
      await options.db.execute(sql`select 1`);
      return { status: "ready" };
    } catch {
      return reply.status(503).send({ status: "not_ready" });
    }
  });

  return app;
}
