import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "RUN_NOT_FOUND"
  | "STATE_CONFLICT"
  | "INVALID_COMMAND"
  | "COMMAND_REJECTED"
  | "IDEMPOTENCY_CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

function errorBody(request: FastifyRequest, code: ApiErrorCode, message: string, details?: unknown) {
  return {
    error: {
      code,
      message,
      requestId: request.id,
      ...(details === undefined ? {} : { details }),
    },
  };
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | ApiError | ZodError, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof ApiError) {
      request.log.info({ code: error.code, statusCode: error.statusCode }, "request rejected");
      void reply.status(error.statusCode).send(errorBody(request, error.code, error.message, error.details));
      return;
    }
    if (error instanceof ZodError) {
      void reply.status(400).send(errorBody(request, "INVALID_COMMAND", "Request validation failed.", {
        issues: error.issues.map((issue) => ({ path: issue.path.join("."), code: issue.code, message: issue.message })),
      }));
      return;
    }
    request.log.error({ err: error }, "unhandled request error");
    void reply.status(500).send(errorBody(request, "INTERNAL_ERROR", "An internal error occurred."));
  });
}
