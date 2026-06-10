import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "@/core/errors/index.js";
import { ZodError } from "zod";

export function errorHandler(
  error: FastifyError | AppError | ZodError | Error,
  _request: FastifyRequest,
  reply: FastifyReply
) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      type: `https://api.serviciolocalsts.com/errors/${error.code.toLowerCase()}`,
      title: error.code,
      status: error.statusCode,
      detail: error.message,
    });
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      type: "https://api.serviciolocalsts.com/errors/validation",
      title: "VALIDATION_ERROR",
      status: 400,
      detail: "Datos inválidos",
      errors: error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }

  console.error("Error no manejado:", error);
  return reply.status(500).send({
    type: "https://api.serviciolocalsts.com/errors/internal",
    title: "INTERNAL_ERROR",
    status: 500,
    detail: "Error interno del servidor",
  });
}
