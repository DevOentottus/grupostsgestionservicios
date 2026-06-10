import { FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "@/lib/supabase.js";
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

/**
 * Middleware que verifica que el usuario autenticado tenga acceso al área
 * determinada por `areaIdResolver`.
 *
 * - admin: acceso total
 * - encargado: solo su propia área (req.user.area_id)
 * - colaborador: solo si está asignado al área via areacolaboradores
 */
export function authorizeByArea(areaIdResolver: (req: FastifyRequest) => number | undefined) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user || !("rol" in request.user)) {
      throw new UnauthorizedError("No autenticado");
    }
    const user = request.user as { user_id: number; rol: Rol; area_id: number | null };

    // Admin: acceso total
    if (user.rol === "admin") return;

    const targetAreaId = areaIdResolver(request);
    if (!targetAreaId) {
      throw new ForbiddenError("No tienes acceso a esta área");
    }

    // Encargado: solo su propia área
    if (user.rol === "encargado") {
      if (user.area_id !== targetAreaId) {
        throw new ForbiddenError("No tienes acceso a esta área");
      }
      return;
    }

    // Colaborador: solo si está asignado al área
    if (user.rol === "colaborador") {
      const { data: assignments } = await supabase
        .from("areacolaboradores")
        .select("areacolaborador_id")
        .eq("area_id", targetAreaId)
        .eq("colaborador_id", user.user_id)
        .limit(1);

      if (!assignments?.length) {
        throw new ForbiddenError("No tienes acceso a esta área");
      }
      return;
    }

    throw new ForbiddenError("Acceso denegado");
  };
}
