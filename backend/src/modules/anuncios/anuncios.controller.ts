import { FastifyInstance } from "fastify";
import { supabase } from "@/lib/supabase.js";
import { NotFoundError } from "@/core/errors/index.js";
import { authenticate, authorize } from "@/core/middleware/auth.js";
import { auditLog } from "@/core/utils/index.js";
import { z } from "zod";

const crearAnuncioSchema = z.object({
  titulo: z.string().min(1, "Título requerido").max(200),
  contenido: z.string().min(1, "Contenido requerido"),
  prioridad: z.enum(["informativo", "importante", "urgente"]).default("informativo"),
  fecha_expiracion: z.string().nullable().optional(),
});

const actualizarAnuncioSchema = z.object({
  titulo: z.string().min(1).max(200).optional(),
  contenido: z.string().min(1).optional(),
  prioridad: z.enum(["informativo", "importante", "urgente"]).optional(),
  activo: z.boolean().optional(),
  fecha_expiracion: z.string().nullable().optional(),
});

export async function anunciosController(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // ── GET /api/anuncios — listar activos (todos los roles) ──
  app.get(
    "/api/anuncios",
    { preHandler: [authorize("admin", "encargado", "colaborador")] },
    async () => {
      const today = new Date().toISOString().split("T")[0];

      const { data: anunciosData, error } = await supabase
        .from("anuncios")
        .select(`
          *,
          usuarios!anuncios_usuario_id_fkey (
            usuario_id,
            usuario_nombres
          )
        `)
        .eq("anuncio_activo", true)
        .or(`anuncio_fecha_expiracion.is.null,anuncio_fecha_expiracion.gte.${today}`)
        .order("anuncio_fecha_publicacion", { ascending: false })
        .order("anuncio_hora_publicacion", { ascending: false });

      if (error) throw new Error(error.message);

      const rows = (anunciosData || []).map((a: any) => ({
        id: a.anuncio_id,
        usuario_id: a.usuario_id,
        titulo: a.anuncio_titulo,
        contenido: a.anuncio_contenido,
        activo: a.anuncio_activo,
        prioridad: a.anuncio_prioridad,
        fecha_publicacion: a.anuncio_fecha_publicacion,
        hora_publicacion: a.anuncio_hora_publicacion,
        fecha_expiracion: a.anuncio_fecha_expiracion,
        fecha_creacion: a.anuncio_fecha_creacion,
        hora_creacion: a.anuncio_hora_creacion,
        autor: a.usuarios
          ? {
              id: a.usuarios.usuario_id,
              nombres: a.usuarios.usuario_nombres,
            }
          : null,
      }));

      return { data: rows };
    }
  );

  // ── GET /api/anuncios/todos — listar todos (admin only, incluye inactivos) ──
  app.get(
    "/api/anuncios/todos",
    { preHandler: [authorize("sistema")] },
    async () => {
      const { data: anunciosData, error } = await supabase
        .from("anuncios")
        .select(`
          *,
          usuarios!anuncios_usuario_id_fkey (
            usuario_id,
            usuario_nombres
          )
        `)
        .order("anuncio_fecha_publicacion", { ascending: false })
        .order("anuncio_hora_publicacion", { ascending: false });

      if (error) throw new Error(error.message);

      const rows = (anunciosData || []).map((a: any) => ({
        id: a.anuncio_id,
        usuario_id: a.usuario_id,
        titulo: a.anuncio_titulo,
        contenido: a.anuncio_contenido,
        activo: a.anuncio_activo,
        prioridad: a.anuncio_prioridad,
        fecha_publicacion: a.anuncio_fecha_publicacion,
        hora_publicacion: a.anuncio_hora_publicacion,
        fecha_expiracion: a.anuncio_fecha_expiracion,
        fecha_creacion: a.anuncio_fecha_creacion,
        hora_creacion: a.anuncio_hora_creacion,
        autor: a.usuarios
          ? {
              id: a.usuarios.usuario_id,
              nombres: a.usuarios.usuario_nombres,
            }
          : null,
      }));

      return { data: rows };
    }
  );

  // ── POST /api/anuncios — crear anuncio (admin) ──
  app.post(
    "/api/anuncios",
    { preHandler: [authorize("sistema")] },
    async (request, reply) => {
      const input = crearAnuncioSchema.parse(request.body);
      const user = request.user as { user_id: number };
      const now = new Date();

      const { data: newAnuncios, error } = await supabase
        .from("anuncios")
        .insert({
          usuario_id: user.user_id,
          anuncio_titulo: input.titulo,
          anuncio_contenido: input.contenido,
          anuncio_prioridad: input.prioridad,
          anuncio_fecha_expiracion: input.fecha_expiracion ?? null,
          anuncio_fecha_publicacion: now.toISOString().split("T")[0],
          anuncio_hora_publicacion: now.toTimeString().split(" ")[0],
          anuncio_fecha_creacion: now.toISOString().split("T")[0],
          anuncio_hora_creacion: now.toTimeString().split(" ")[0],
        })
        .select();

      if (error) throw new Error(error.message);
      const anuncio = newAnuncios?.[0];
      if (!anuncio) throw new Error("No se pudo crear el anuncio");

      await auditLog(null, user.user_id, "CREATE", "anuncio", anuncio.anuncio_id, {
        titulo: input.titulo,
        prioridad: input.prioridad,
      });

      return reply.status(201).send({
        data: {
          id: anuncio.anuncio_id,
          usuario_id: anuncio.usuario_id,
          titulo: anuncio.anuncio_titulo,
          contenido: anuncio.anuncio_contenido,
          activo: anuncio.anuncio_activo,
          prioridad: anuncio.anuncio_prioridad,
          fecha_publicacion: anuncio.anuncio_fecha_publicacion,
          hora_publicacion: anuncio.anuncio_hora_publicacion,
          fecha_expiracion: anuncio.anuncio_fecha_expiracion,
          fecha_creacion: anuncio.anuncio_fecha_creacion,
          hora_creacion: anuncio.anuncio_hora_creacion,
        },
      });
    }
  );

  // ── PATCH /api/anuncios/:id — editar/desactivar (admin) ──
  app.patch(
    "/api/anuncios/:id",
    { preHandler: [authorize("sistema")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = actualizarAnuncioSchema.parse(request.body);
      const anuncioId = parseInt(id);
      const user = request.user as { user_id: number };

      const { data: existing } = await supabase
        .from("anuncios")
        .select("anuncio_id")
        .eq("anuncio_id", anuncioId)
        .limit(1);

      if (!existing?.length) throw new NotFoundError("Anuncio no encontrado");

      const updateData: Record<string, unknown> = {};
      if (input.titulo !== undefined) updateData.anuncio_titulo = input.titulo;
      if (input.contenido !== undefined) updateData.anuncio_contenido = input.contenido;
      if (input.prioridad !== undefined) updateData.anuncio_prioridad = input.prioridad;
      if (input.activo !== undefined) updateData.anuncio_activo = input.activo;
      if (input.fecha_expiracion !== undefined) updateData.anuncio_fecha_expiracion = input.fecha_expiracion;

      const { data: updatedAnuncios } = await supabase
        .from("anuncios")
        .update(updateData)
        .eq("anuncio_id", anuncioId)
        .select();

      const updated = updatedAnuncios?.[0];

      await auditLog(null, user.user_id, "UPDATE", "anuncio", anuncioId, {
        campos: Object.keys(input),
      });

      return reply.send({
        data: updated
          ? {
              id: updated.anuncio_id,
              usuario_id: updated.usuario_id,
              titulo: updated.anuncio_titulo,
              contenido: updated.anuncio_contenido,
              activo: updated.anuncio_activo,
              prioridad: updated.anuncio_prioridad,
              fecha_publicacion: updated.anuncio_fecha_publicacion,
              hora_publicacion: updated.anuncio_hora_publicacion,
              fecha_expiracion: updated.anuncio_fecha_expiracion,
              fecha_creacion: updated.anuncio_fecha_creacion,
              hora_creacion: updated.anuncio_hora_creacion,
            }
          : null,
      });
    }
  );

  // ── DELETE /api/anuncios/:id — eliminar (admin) ──
  app.delete(
    "/api/anuncios/:id",
    { preHandler: [authorize("sistema")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const anuncioId = parseInt(id);
      const user = request.user as { user_id: number };

      const { data: anuncios } = await supabase
        .from("anuncios")
        .select("anuncio_id, anuncio_titulo")
        .eq("anuncio_id", anuncioId)
        .limit(1);

      const anuncio = anuncios?.[0];
      if (!anuncio) throw new NotFoundError("Anuncio no encontrado");

      await supabase.from("anuncios").delete().eq("anuncio_id", anuncioId);

      await auditLog(null, user.user_id, "DELETE", "anuncio", anuncioId, {
        titulo: anuncio.anuncio_titulo,
      });

      return reply.status(204).send();
    }
  );
}
