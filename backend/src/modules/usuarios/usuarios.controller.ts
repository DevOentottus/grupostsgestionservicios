import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, schema } from "@/db/connection.js";
import { NotFoundError } from "@/core/errors/index.js";
import { authenticate, authorize } from "@/core/middleware/auth.js";
import { crearUsuarioSchema } from "@/modules/auth/auth.schema.js";

export async function usuariosController(app: FastifyInstance) {
  // Todas las rutas requieren autenticación
  app.addHook("preHandler", authenticate);

  // ── GET /api/usuarios ──
  app.get(
    "/api/usuarios",
    { preHandler: [authorize("admin", "encargado")] },
    async () => {
      const rows = await db
        .select({
          id: schema.usuarios.id,
          username: schema.usuarios.username,
          nombres: schema.usuarios.nombres,
          email: schema.usuarios.email,
          rol: schema.usuarios.rol,
          activo: schema.usuarios.activo,
          created_at: schema.usuarios.created_at,
        })
        .from(schema.usuarios)
        .orderBy(schema.usuarios.nombres);
      return { data: rows };
    }
  );

  // ── POST /api/usuarios ──
  app.post(
    "/api/usuarios",
    { preHandler: [authorize("admin")] },
    async (request, reply) => {
      const input = crearUsuarioSchema.parse(request.body);
      const hash = bcrypt.hashSync(input.password, 10);
      const [user] = await db
        .insert(schema.usuarios)
        .values({
          username: input.username,
          password_hash: hash,
          nombres: input.nombres,
          email: input.email,
          rol: input.rol,
        })
        .returning({
          id: schema.usuarios.id,
          username: schema.usuarios.username,
          nombres: schema.usuarios.nombres,
          email: schema.usuarios.email,
          rol: schema.usuarios.rol,
          activo: schema.usuarios.activo,
          created_at: schema.usuarios.created_at,
        });
      return reply.status(201).send({ data: user });
    }
  );

  // ── PUT /api/usuarios/:id ──
  app.put(
    "/api/usuarios/:id",
    { preHandler: [authorize("admin")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { nombres?: string; email?: string; rol?: string };
      const [updated] = await db
        .update(schema.usuarios)
        .set({
          ...(body.nombres && { nombres: body.nombres }),
          ...(body.email && { email: body.email }),
          ...(body.rol && { rol: body.rol as any }),
        })
        .where(eq(schema.usuarios.id, parseInt(id)))
        .returning({
          id: schema.usuarios.id,
          username: schema.usuarios.username,
          nombres: schema.usuarios.nombres,
          email: schema.usuarios.email,
          rol: schema.usuarios.rol,
          activo: schema.usuarios.activo,
        });
      if (!updated) throw new NotFoundError("Usuario no encontrado");
      return reply.send({ data: updated });
    }
  );

  // ── PATCH /api/usuarios/:id/estado ──
  app.patch(
    "/api/usuarios/:id/estado",
    { preHandler: [authorize("admin")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const [user] = await db
        .select()
        .from(schema.usuarios)
        .where(eq(schema.usuarios.id, parseInt(id)))
        .limit(1);
      if (!user) throw new NotFoundError("Usuario no encontrado");
      const [updated] = await db
        .update(schema.usuarios)
        .set({ activo: !user.activo })
        .where(eq(schema.usuarios.id, parseInt(id)))
        .returning({ id: schema.usuarios.id, activo: schema.usuarios.activo });
      return reply.send({ data: updated });
    }
  );
}
