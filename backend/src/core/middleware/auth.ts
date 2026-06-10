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

/**
 * PreHandler ÚNICO que autentica + autoriza roles.
 * En serverless/emit mode, Fastify no maneja bien arrays de preHandler
 * con funciones async+sync mezcladas. Esta función unifica ambas en UNA.
 */
export function requireRoles(...roles: Rol[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new UnauthorizedError("Token inválido o expirado");
    }
    const user = request.user as { user_id: number; rol: Rol; area_id: number | null } | undefined;
    if (!user) {
      throw new UnauthorizedError("No autenticado");
    }
    if (user.rol === "sistema") return;
    if (roles.length > 0 && !roles.includes(user.rol)) {
      throw new ForbiddenError(`Se requiere rol: ${roles.join(" o ")}`);
    }
  };
}

export function authorize(...roles: Rol[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const user = request.user as { user_id: number; rol: Rol; area_id: number | null } | undefined;
    if (!user) {
      throw new UnauthorizedError("No autenticado");
    }
    // Sistema (super-admin) tiene acceso a todo
    if (user.rol === "sistema") return;
    if (!roles.includes(user.rol)) {
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
    const user = request.user as { user_id: number; rol: Rol; area_id: number | null } | undefined;
    if (!user) {
      throw new UnauthorizedError("No autenticado");
    }

    // Sistema y Admin: acceso total
    if (user.rol === "sistema" || user.rol === "admin") return;

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
