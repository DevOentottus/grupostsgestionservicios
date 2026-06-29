import { FastifyInstance } from "fastify";
import { supabase } from "@/lib/supabase.js";
import { ValidationError, NotFoundError } from "@/core/errors/index.js";
import { requireRoles } from "@/core/middleware/auth.js";
import { z } from "zod";

export async function notificacionesController(app: FastifyInstance) {
  // ----------------------------------
  // GET /api/notificaciones — List notifications for authenticated user, paginated
  // ----------------------------------
  app.get(
    "/api/notificaciones",
    { preHandler: [requireRoles()] },
    async (request) => {
      const user = request.user as { user_id: number };
      const query = request.query as { page?: string; limit?: string };

      const page = Math.max(1, parseInt(query.page || "1", 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(query.limit || "20", 10) || 20));
      const offset = (page - 1) * limit;

      const { data: rows, error } = await supabase
        .from("notificaciones")
        .select("*")
        .eq("usuario_id", user.user_id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw new ValidationError("Error al obtener notificaciones: " + error.message);

      return { data: (rows || []).map(mapNotificacion) };
    }
  );

  // ----------------------------------
  // GET /api/notificaciones/no-leidas — Count of unread notifications
  // ----------------------------------
  app.get(
    "/api/notificaciones/no-leidas",
    { preHandler: [requireRoles()] },
    async (request) => {
      const user = request.user as { user_id: number };

      const { count, error } = await supabase
        .from("notificaciones")
        .select("*", { count: "exact", head: true })
        .eq("usuario_id", user.user_id)
        .eq("leida", false);

      if (error) throw new ValidationError("Error al contar notificaciones: " + error.message);

      return { data: count ?? 0 };
    }
  );

  // ----------------------------------
  // PATCH /api/notificaciones/:id/leer — Mark a single notification as read
  // ----------------------------------
  app.patch(
    "/api/notificaciones/:id/leer",
    { preHandler: [requireRoles()] },
    async (request) => {
      const { id } = request.params as { id: string };
      const user = request.user as { user_id: number };
      const notificacionId = parseInt(id, 10);

      // Verify it belongs to the authenticated user
      const { data: notif } = await supabase
        .from("notificaciones")
        .select("notificacion_id, usuario_id")
        .eq("notificacion_id", notificacionId)
        .single();

      if (!notif) throw new NotFoundError("Notificación no encontrada");
      if (notif.usuario_id !== user.user_id) {
        throw new ValidationError("No tenés acceso a esta notificación");
      }

      const { error } = await supabase
        .from("notificaciones")
        .update({ leida: true })
        .eq("notificacion_id", notificacionId);

      if (error) throw new ValidationError("Error al marcar notificación como leída: " + error.message);

      return { data: { id: notificacionId, leida: true } };
    }
  );

  // ----------------------------------
  // PATCH /api/notificaciones/leer-todas — Mark ALL notifications as read
  // ----------------------------------
  app.patch(
    "/api/notificaciones/leer-todas",
    { preHandler: [requireRoles()] },
    async (request) => {
      const user = request.user as { user_id: number };

      const { error } = await supabase
        .from("notificaciones")
        .update({ leida: true })
        .eq("usuario_id", user.user_id)
        .eq("leida", false);

      if (error) throw new ValidationError("Error al marcar notificaciones como leídas: " + error.message);

      return { data: { success: true } };
    }
  );

  // ----------------------------------
  // POST /api/notificaciones/enviar — Create a notification for a user
  // ----------------------------------
  const enviarSchema = z.object({
    usuario_id: z.number().int(),
    titulo: z.string().min(1),
    mensaje: z.string().min(1),
    tipo: z.string().optional().default("general"),
    referencia_id: z.number().int().optional(),
  });

  app.post(
    "/api/notificaciones/enviar",
    { preHandler: [requireRoles()] },
    async (request) => {
      const input = enviarSchema.parse(request.body);

      const { data: rows, error } = await supabase
        .from("notificaciones")
        .insert({
          usuario_id: input.usuario_id,
          titulo: input.titulo,
          mensaje: input.mensaje,
          tipo: input.tipo || "general",
          referencia_id: input.referencia_id ?? null,
        })
        .select()
        .limit(1);

      if (error) throw new ValidationError("Error al enviar notificación: " + error.message);

      return { data: mapNotificacion(rows?.[0]) };
    }
  );

  // ----------------------------------
  // GET /api/notificaciones/:id — Get single notification detail
  // ----------------------------------
  app.get(
    "/api/notificaciones/:id",
    { preHandler: [requireRoles()] },
    async (request) => {
      const { id } = request.params as { id: string };
      const user = request.user as { user_id: number };
      const notificacionId = parseInt(id, 10);

      const { data: row, error } = await supabase
        .from("notificaciones")
        .select("*")
        .eq("notificacion_id", notificacionId)
        .eq("usuario_id", user.user_id)
        .single();

      if (error || !row) throw new NotFoundError("Notificación no encontrada");

      return { data: mapNotificacion(row) };
    }
  );
}

// -- Mapper --

function mapNotificacion(row: any) {
  return {
    id: row.notificacion_id,
    usuario_id: row.usuario_id,
    titulo: row.titulo,
    mensaje: row.mensaje,
    tipo: row.tipo,
    referencia_id: row.referencia_id,
    leida: row.leida,
    created_at: row.created_at,
  };
}
