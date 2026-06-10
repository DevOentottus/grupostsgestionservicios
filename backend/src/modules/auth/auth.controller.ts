import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase.js";
import { loginUser, generateJwtPayload } from "./auth.service.js";
import { config } from "@/core/config/index.js";
import { loginSchema } from "./auth.schema.js";
import { auditLog } from "@/core/utils/index.js";
import { NotFoundError, ValidationError } from "@/core/errors/index.js";

export async function authController(app: FastifyInstance) {
  // ── POST /api/auth/login ──
  app.post("/api/auth/login", async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const result = await loginUser(input.username, input.password);

    const token = app.jwt.sign(
      {
        user_id: result.user.id,
        rol: result.user.rol,
        area_id: result.user.area_id,
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

  // ── GET /api/auth/me ──
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

  // ── PATCH /api/auth/password — cambiar propia contraseña ──
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
