import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase.js";
import { loginUser, generateJwtPayload } from "./auth.service.js";
import { config } from "@/core/config/index.js";
import { loginSchema } from "./auth.schema.js";
import { auditLog } from "@/core/utils/index.js";
import { NotFoundError, ValidationError, UnauthorizedError } from "@/core/errors/index.js";

export async function authController(app: FastifyInstance) {
  // -- POST /api/auth/login --
  app.post("/api/auth/login", async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const ip = (request.ip as string) ||
      (request.headers["x-forwarded-for"] as string) || null;
    const ua = (request.headers["user-agent"] as string) || null;

    const result = await loginUser(input.username, input.password, ip, ua);

    const token = app.jwt.sign(
      {
        user_id: result.user.id,
        rol: result.user.rol,
        area_id: result.user.area_id,
        jti: result.jti,
      },
      { expiresIn: config.jwt.expiresIn }
    );

    // Auditoría: login exitoso
    await auditLog(null, result.user.id, "LOGIN", "auth", result.user.id);

    return reply.send({
      data: {
        token,
        user: result.user,
      },
    });
  });

  // -- POST /api/auth/refresh --
  app.post("/api/auth/refresh", async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Token requerido");
    }

    const oldToken = authHeader.slice(7);
    let payload: { user_id: number; rol: string; area_id: number | null; jti?: string };
    try {
      // Verificar incluso si expiró (ignoreExpiration) -- el token sigue siendo válido
      payload = app.jwt.verify<{ user_id: number; rol: string; area_id: number | null; jti?: string }>(
        oldToken,
        { ignoreExpiration: true }
      );
    } catch {
      throw new UnauthorizedError("Token inválido");
    }

    // Verificar que el usuario siga activo y re-obtener area_id
    const { data: usuarios } = await supabase
      .from("usuarios")
      .select("usuario_id, usuario_activo, usuario_rol")
      .eq("usuario_id", payload.user_id)
      .limit(1);

    const usuario = usuarios?.[0];
    if (!usuario || !usuario.usuario_activo) {
      throw new UnauthorizedError("Usuario desactivado");
    }

    // Re-obtener area_id actualizado
    let area_id: number | null = null;
    if (usuario.usuario_rol?.toLowerCase() === "encargado") {
      const { data: areaData } = await supabase
        .from("areas")
        .select("area_id")
        .eq("area_encargado_id", payload.user_id)
        .limit(1);
      if (areaData?.length) area_id = areaData[0].area_id;
    } else if (usuario.usuario_rol?.toLowerCase() === "colaborador") {
      const { data: acData } = await supabase
        .from("areacolaboradores")
        .select("area_id")
        .eq("colaborador_id", payload.user_id)
        .limit(1);
      if (acData?.length) area_id = acData[0].area_id;
    }

    // Extraer jti del token viejo y actualizar last_activity en la sesión
    const jti = payload.jti;
    if (jti) {
      try {
        await supabase
          .from("sessions")
          .update({ last_activity: new Date().toISOString() })
          .eq("token_jti", jti);
      } catch {
        // No fallar si la sesión no existe (tokens emitidos antes de esta feature)
      }
    }

    // Emitir nuevo token con el mismo jti (la sesión es la misma)
    const newToken = app.jwt.sign(
      {
        user_id: payload.user_id,
        rol: payload.rol,
        area_id,
        jti,
      },
      { expiresIn: config.jwt.expiresIn }
    );

    return reply.send({ data: { token: newToken } });
  });

  // -- GET /api/auth/me --
  app.get(
    "/api/auth/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = request.user as {
        user_id: number;
        rol: string;
        area_id: number | null;
      };
      return reply.send({
        data: {
          user_id: user.user_id,
          rol: user.rol,
          area_id: user.area_id ?? null,
        },
      });
    }
  );

  // -- PATCH /api/auth/password -- cambiar propia contraseña --
  app.patch(
    "/api/auth/password",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = request.user as { user_id: number };
      const { current_password, new_password } = request.body as {
        current_password: string;
        new_password: string;
      };

      if (!current_password || !new_password) {
        throw new ValidationError("Contraseña actual y nueva son requeridas");
      }
      if (new_password.length < 6) {
        throw new ValidationError("La nueva contraseña debe tener al menos 6 caracteres");
      }

      const { data: usuarios } = await supabase
        .from("usuarios")
        .select("usuario_id, usuario_contrasena")
        .eq("usuario_id", user.user_id)
        .limit(1);

      const usuario = usuarios?.[0];
      if (!usuario) throw new NotFoundError("Usuario no encontrado");

      const valida = bcrypt.compareSync(current_password, usuario.usuario_contrasena);
      if (!valida) throw new ValidationError("La contraseña actual no es correcta");

      const nuevaHash = bcrypt.hashSync(new_password, 10);
      await supabase
        .from("usuarios")
        .update({ usuario_contrasena: nuevaHash })
        .eq("usuario_id", user.user_id);

      await auditLog(null, user.user_id, "UPDATE", "usuario-password", user.user_id, {
        accion: "cambio_propio",
      });

      return reply.send({ data: { success: true, message: "Contraseña actualizada" } });
    }
  );
}
