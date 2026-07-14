import { FastifyInstance } from "fastify";
import { supabase } from "@/lib/supabase.js";
import { NotFoundError, ValidationError } from "@/core/errors/index.js";
import { requireRoles } from "@/core/middleware/auth.js";
import { z } from "zod";

export async function tiposServicioController(app: FastifyInstance) {
  // ── Schemas ──────────────────────────────────────────────
  const crearTipoSchema = z.object({
    nombre: z.string().min(1, "Nombre es requerido"),
    descripcion: z.string().nullable().optional(),
    tiempo_estimado_min: z.number().int().min(0),
  });

  const actualizarTipoSchema = z.object({
    nombre: z.string().min(1).optional(),
    descripcion: z.string().nullable().optional(),
    tiempo_estimado_min: z.number().int().min(0).optional(),
  });

  const crearFallaSchema = z.object({
    nombre: z.string().min(1, "Nombre es requerido"),
    descripcion: z.string().nullable().optional(),
  });

  const actualizarFallaSchema = z.object({
    nombre: z.string().min(1).optional(),
    descripcion: z.string().nullable().optional(),
  });

  // ── GET /api/tipos-servicio ──────────────────────────────
  app.get("/api/tipos-servicio", { preHandler: [requireRoles()] }, async (_request) => {
    const { data } = await (supabase as any)
      .from("tipos_servicio")
      .select("*")
      .order("nombre");

    return { data: data || [] };
  });

  // ── GET /api/tipos-servicio/:id ──────────────────────────
  app.get("/api/tipos-servicio/:id", { preHandler: [requireRoles()] }, async (request) => {
    const { id } = request.params as { id: string };
    const { data, error } = await (supabase as any)
      .from("tipos_servicio")
      .select("*, fallas_comunes(*)")
      .eq("id", parseInt(id))
      .single();

    if (error || !data) throw new NotFoundError("Tipo de servicio no encontrado");
    return { data };
  });

  // ── POST /api/tipos-servicio ─────────────────────────────
  app.post("/api/tipos-servicio", { preHandler: [requireRoles("admin", "sistema")] }, async (request, reply) => {
    const input = crearTipoSchema.parse(request.body);
    const { data, error } = await (supabase as any)
      .from("tipos_servicio")
      .insert({
        nombre: input.nombre,
        descripcion: input.descripcion || null,
        tiempo_estimado_min: input.tiempo_estimado_min,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return reply.status(201).send({ data });
  });

  // ── PUT /api/tipos-servicio/:id ──────────────────────────
  app.put("/api/tipos-servicio/:id", { preHandler: [requireRoles("admin", "sistema")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = actualizarTipoSchema.parse(request.body);

    const updateData: Record<string, unknown> = {};
    if (input.nombre !== undefined) updateData.nombre = input.nombre;
    if (input.descripcion !== undefined) updateData.descripcion = input.descripcion;
    if (input.tiempo_estimado_min !== undefined) updateData.tiempo_estimado_min = input.tiempo_estimado_min;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await (supabase as any)
      .from("tipos_servicio")
      .update(updateData)
      .eq("id", parseInt(id))
      .select()
      .single();

    if (error) throw new NotFoundError("Tipo de servicio no encontrado");
    return reply.send({ data });
  });

  // ── DELETE /api/tipos-servicio/:id (soft) ────────────────
  app.delete("/api/tipos-servicio/:id", { preHandler: [requireRoles("admin", "sistema")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { error } = await (supabase as any)
      .from("tipos_servicio")
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq("id", parseInt(id));

    if (error) throw new NotFoundError("Tipo de servicio no encontrado");
    return reply.status(204).send();
  });

  // ── GET /api/tipos-servicio/:id/fallas ───────────────────
  app.get("/api/tipos-servicio/:id/fallas", { preHandler: [requireRoles()] }, async (request) => {
    const { id } = request.params as { id: string };
    const { data } = await (supabase as any)
      .from("fallas_comunes")
      .select("*")
      .eq("tipo_servicio_id", parseInt(id))
      .order("nombre");

    return { data: data || [] };
  });

  // ── POST /api/tipos-servicio/:id/fallas ──────────────────
  app.post("/api/tipos-servicio/:id/fallas", { preHandler: [requireRoles("admin", "sistema")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = crearFallaSchema.parse(request.body);

    const { data, error } = await (supabase as any)
      .from("fallas_comunes")
      .insert({
        tipo_servicio_id: parseInt(id),
        nombre: input.nombre,
        descripcion: input.descripcion || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return reply.status(201).send({ data });
  });

  // ── PUT /api/fallas-comunes/:id ──────────────────────────
  app.put("/api/fallas-comunes/:id", { preHandler: [requireRoles("admin", "sistema")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = actualizarFallaSchema.parse(request.body);

    const updateData: Record<string, unknown> = {};
    if (input.nombre !== undefined) updateData.nombre = input.nombre;
    if (input.descripcion !== undefined) updateData.descripcion = input.descripcion;

    const { data, error } = await (supabase as any)
      .from("fallas_comunes")
      .update(updateData)
      .eq("id", parseInt(id))
      .select()
      .single();

    if (error) throw new NotFoundError("Falla no encontrada");
    return reply.send({ data });
  });

  // ── DELETE /api/fallas-comunes/:id (soft) ────────────────
  app.delete("/api/fallas-comunes/:id", { preHandler: [requireRoles("admin", "sistema")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { error } = await (supabase as any)
      .from("fallas_comunes")
      .update({ activo: false })
      .eq("id", parseInt(id));

    if (error) throw new NotFoundError("Falla no encontrada");
    return reply.status(204).send();
  });
}
