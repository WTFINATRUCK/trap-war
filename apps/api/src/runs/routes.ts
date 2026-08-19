import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { AuthService } from "../auth/service.js";
import { ApiError } from "../http/errors.js";
import { runCommandBodySchema } from "./command-schema.js";
import type { RunService } from "./service.js";

const emptyBodySchema = z.object({}).strict();
const runParamsSchema = z.object({ runId: z.string().uuid() }).strict();
const idempotencyKeySchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9._:-]+$/);

function idempotencyKey(request: FastifyRequest): string {
  const header = request.headers["idempotency-key"];
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) throw new ApiError(400, "INVALID_COMMAND", "Idempotency-Key header is required.");
  return idempotencyKeySchema.parse(value);
}

export function registerRunRoutes(app: FastifyInstance, authService: AuthService, runService: RunService): void {
  app.post("/api/v1/runs", async (request, reply) => {
    const startedAt = performance.now();
    emptyBodySchema.parse(request.body ?? {});
    const player = await authService.authenticate(request.headers.authorization);
    try {
      const result = await runService.createRun(player, idempotencyKey(request), request.id);
      request.log.info({
        playerId: player.playerId,
        result: "accepted",
        statusCode: result.statusCode,
        latencyMs: Number((performance.now() - startedAt).toFixed(3)),
      }, "run creation handled");
      return reply.status(result.statusCode).send(result.body);
    } catch (error) {
      request.log.info({
        playerId: player.playerId,
        result: "rejected",
        latencyMs: Number((performance.now() - startedAt).toFixed(3)),
      }, "run creation rejected");
      throw error;
    }
  });

  app.post("/api/v1/runs/:runId/commands", async (request, reply) => {
    const startedAt = performance.now();
    const { runId } = runParamsSchema.parse(request.params);
    const body = runCommandBodySchema.parse(request.body);
    const player = await authService.authenticate(request.headers.authorization);
    try {
      const result = await runService.executeCommand(player, runId, body, idempotencyKey(request), request.id);
      request.log.info({
        playerId: player.playerId,
        runId,
        commandId: body.commandId,
        commandType: body.commandType,
        result: "accepted",
        statusCode: result.statusCode,
        latencyMs: Number((performance.now() - startedAt).toFixed(3)),
      }, "run command handled");
      return reply.status(result.statusCode).send(result.body);
    } catch (error) {
      request.log.info({
        playerId: player.playerId,
        runId,
        commandId: body.commandId,
        commandType: body.commandType,
        result: "rejected",
        latencyMs: Number((performance.now() - startedAt).toFixed(3)),
      }, "run command rejected");
      throw error;
    }
  });

  app.get("/api/v1/runs/:runId", async (request, reply) => {
    const { runId } = runParamsSchema.parse(request.params);
    const player = await authService.authenticate(request.headers.authorization);
    const result = await runService.getRun(player, runId);
    return reply.status(result.statusCode).send(result.body);
  });
}
