import { FastifyRequest, FastifyReply } from "fastify";
import { ForbiddenError, UnauthorizedError } from "@/core/errors/index.js";
import type { Rol } from "@/core/types/index.js";

export async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    throw new UnauthorizedError("Token inválido o expirado");
  }
}

export function authorize(...roles: Rol[]) {
  return (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user || !("rol" in request.user)) {
      throw new UnauthorizedError("No autenticado");
    }
    const userRole = (request.user as { rol: Rol }).rol;
    if (!roles.includes(userRole)) {
      throw new ForbiddenError(`Se requiere rol: ${roles.join(" o ")}`);
    }
  };
}
