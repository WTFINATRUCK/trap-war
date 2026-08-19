import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AuthService } from "./service.js";

const guestBody = z.object({}).strict();

export function registerAuthRoutes(app: FastifyInstance, authService: AuthService): void {
  app.post("/api/v1/auth/guest", async (request, reply) => {
    guestBody.parse(request.body ?? {});
    const result = await authService.createGuest();
    request.log.info({ playerId: result.player.playerId }, "guest session created");
    return reply.status(201).send(result);
  });
}
