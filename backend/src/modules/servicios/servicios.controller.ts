import { FastifyInstance } from "fastify";
import { eq, asc, and } from "drizzle-orm";
import { db, schema } from "@/db/connection.js";
import { NotFoundError, ValidationError } from "@/core/errors/index.js";
import { authenticate, authorize } from "@/core/middleware/auth.js";
import { z } from "zod";

const servicioSchema = z.object({
  titulo: z.string().min(1),
  descripcion: z.string().optional(),
  cliente_nombre: z.string().min(1),
  cliente_email: z.string().email().optional(),
});

const tareaSchema = z.object({
  titulo: z.string().min(1),
  descripcion: z.string().optional(),
});

export async function serviciosController(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // ── GET /api/servicios ──
  app.get("/api/servicios", async (request) => {
    const query = request.query as { estado?: string };
    const filter = query.estado
      ? eq(schema.servicios.estado, query.estado as any)
      : undefined;
    const rows = await db
      .select()
      .from(schema.servicios)
      .where(filter)
      .orderBy(asc(schema.servicios.created_at));
    return { data: rows };
  });

  // ── GET /api/servicios/:id ──
  app.get("/api/servicios/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [servicio] = await db
      .select()
      .from(schema.servicios)
      .where(eq(schema.servicios.id, parseInt(id)))
      .limit(1);
    if (!servicio) throw new NotFoundError("Servicio no encontrado");
    return { data: servicio };
  });

  // ── POST /api/servicios ──
  app.post("/api/servicios", async (request, reply) => {
    const input = servicioSchema.parse(request.body);
    const count = await db.$count(schema.servicios);
    const codigo = `SVC-${String(count + 1).padStart(4, "0")}`;
    const [servicio] = await db
      .insert(schema.servicios)
      .values({
        codigo,
        titulo: input.titulo,
        descripcion: input.descripcion || null,
        cliente_nombre: input.cliente_nombre,
        cliente_email: input.cliente_email || null,
        datos_completos: !!input.cliente_email && !!input.descripcion,
      })
      .returning();
    return reply.status(201).send({ data: servicio });
  });

  // ── PUT /api/servicios/:id ──
  app.put("/api/servicios/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = servicioSchema.parse(request.body);
    const [updated] = await db
      .update(schema.servicios)
      .set({
        titulo: input.titulo,
        descripcion: input.descripcion || null,
        cliente_nombre: input.cliente_nombre,
        cliente_email: input.cliente_email || null,
        datos_completos: !!input.cliente_email && !!input.descripcion,
        updated_at: new Date(),
      })
      .where(eq(schema.servicios.id, parseInt(id)))
      .returning();
    if (!updated) throw new NotFoundError("Servicio no encontrado");
    return reply.send({ data: updated });
  });

  // ── PATCH /api/servicios/:id/estado ──
  app.patch("/api/servicios/:id/estado", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { estado } = request.body as { estado: string };
    const validos = ["pendiente", "en_progreso", "completado", "cancelado"];
    if (!validos.includes(estado)) throw new ValidationError("Estado inválido");
    const [updated] = await db
      .update(schema.servicios)
      .set({ estado: estado as any, updated_at: new Date() })
      .where(eq(schema.servicios.id, parseInt(id)))
      .returning();
    if (!updated) throw new NotFoundError("Servicio no encontrado");
    return reply.send({ data: updated });
  });

  // ── Tareas ──

  // GET /api/servicios/:id/tareas
  app.get("/api/servicios/:id/tareas", async (request) => {
    const { id } = request.params as { id: string };
    const rows = await db
      .select()
      .from(schema.tareas)
      .where(eq(schema.tareas.servicio_id, parseInt(id)))
      .orderBy(asc(schema.tareas.orden));
    return { data: rows };
  });

  // POST /api/servicios/:id/tareas
  app.post("/api/servicios/:id/tareas", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = tareaSchema.parse(request.body);
    // Obtener el orden máximo
    const [max] = await db
      .select({ max_orden: schema.tareas.orden })
      .from(schema.tareas)
      .where(eq(schema.tareas.servicio_id, parseInt(id)))
      .orderBy(asc(schema.tareas.orden))
      .limit(1);
    const nuevoOrden = (max?.max_orden ?? -1) + 1;
    const [tarea] = await db
      .insert(schema.tareas)
      .values({
        servicio_id: parseInt(id),
        titulo: input.titulo,
        descripcion: input.descripcion || null,
        orden: nuevoOrden,
      })
      .returning();
    return reply.status(201).send({ data: tarea });
  });

  // PUT /api/tareas/:id
  app.put("/api/tareas/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = tareaSchema.parse(request.body);
    const [updated] = await db
      .update(schema.tareas)
      .set({ titulo: input.titulo, descripcion: input.descripcion || null })
      .where(eq(schema.tareas.id, parseInt(id)))
      .returning();
    if (!updated) throw new NotFoundError("Tarea no encontrada");
    return reply.send({ data: updated });
  });

  // DELETE /api/tareas/:id
  app.delete("/api/tareas/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.delete(schema.tareas).where(eq(schema.tareas.id, parseInt(id)));
    return reply.status(204).send();
  });

  // PATCH /api/tareas/:id/completar
  app.patch("/api/tareas/:id/completar", async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user as { user_id: number };
    const [updated] = await db
      .update(schema.tareas)
      .set({
        completada: true,
        completada_por: user.user_id,
        completada_at: new Date(),
      })
      .where(eq(schema.tareas.id, parseInt(id)))
      .returning();
    if (!updated) throw new NotFoundError("Tarea no encontrada");
    return reply.send({ data: updated });
  });

  // PATCH /api/tareas/:id/reabrir
  app.patch("/api/tareas/:id/reabrir", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [updated] = await db
      .update(schema.tareas)
      .set({ completada: false, completada_por: null, completada_at: null })
      .where(eq(schema.tareas.id, parseInt(id)))
      .returning();
    if (!updated) throw new NotFoundError("Tarea no encontrada");
    return reply.send({ data: updated });
  });

  // PUT /api/tareas/reordenar
  app.put("/api/tareas/reordenar", async (request) => {
    const { tareas: items } = request.body as { tareas: { id: number; orden: number }[] };
    for (const item of items) {
      await db
        .update(schema.tareas)
        .set({ orden: item.orden })
        .where(eq(schema.tareas.id, item.id));
    }
    return reply.send({ data: { success: true } });
  });
}
