import { FastifyInstance } from "fastify";
import { loginUser, generateJwtPayload } from "./auth.service.js";
import { config } from "@/core/config/index.js";
import { loginSchema } from "./auth.schema.js";

export async function authController(app: FastifyInstance) {
  // ── POST /api/auth/login ──
  app.post("/api/auth/login", async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const result = await loginUser(input.username, input.password);

    const token = app.jwt.sign(
      { user_id: result.user.id, rol: result.user.rol },
      { expiresIn: config.jwt.expiresIn }
    );

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
      return reply.send({
        data: {
          user_id: (request.user as any).user_id,
          rol: (request.user as any).rol,
        },
      });
    }
  );
}
