import { FastifyInstance } from "fastify";
import { supabase } from "@/lib/supabase.js";
import { NotFoundError, ValidationError } from "@/core/errors/index.js";
import { requireRoles } from "@/core/middleware/auth.js";
import { auditLog } from "@/core/utils/index.js";
import { z } from "zod";

const crearComentarioSchema = z.object({
  contenido: z
    .string()
    .min(1, "El comentario no puede estar vacío")
    .max(2000, "El comentario no puede exceder 2000 caracteres"),
});

export async function comentariosController(app: FastifyInstance) {
  // NOTA: No usar app.addHook + route-level preHandler combinados en serverless/emit (causa timeout).
  // autenticación por ruta.

  // -- GET /api/servicios/:servicioId/comentarios --
  app.get(
    "/api/servicios/:servicioId/comentarios",
    { preHandler: [requireRoles()] },
    async (request) => {
      const { servicioId } = request.params as { servicioId: string };

      // Supabase: los comentarios de servicio están en serviciocomentarios
      const { data: comentariosData } = await supabase
        .from("serviciocomentarios")
        .select(`
          serviciocomentario_id,
          servicio_id,
          usuario_id,
          serviciocomentario_contenido,
          serviciocomentario_fecha,
          usuarios!serviciocomentarios_usuario_id_fkey (
            usuario_id,
            usuario_nombres,
            usuario_username
          )
        `)
        .eq("servicio_id", parseInt(servicioId))
        .order("serviciocomentario_id", { ascending: true });

      const rows = (comentariosData || []).map((c: any) => ({
        id: c.serviciocomentario_id,
        servicio_id: c.servicio_id,
        tarea_id: null, // serviciocomentarios no tiene tarea_id
        usuario_id: c.usuario_id,
        contenido: c.serviciocomentario_contenido,
        created_at: c.serviciocomentario_fecha,
        usuario: c.usuarios
          ? {
              id: c.usuarios.usuario_id,
              nombres: c.usuarios.usuario_nombres,
              username: c.usuarios.usuario_username,
            }
          : null,
        tarea: null,
      }));

      return { data: rows };
    }
  );

  // -- POST /api/servicios/:servicioId/comentarios --
  app.post(
    "/api/servicios/:servicioId/comentarios",
    { preHandler: [requireRoles()] },
    async (request, reply) => {
      const { servicioId } = request.params as { servicioId: string };
      const user = request.user as { user_id: number; rol: string };
      const body = request.body as { contenido: string; tarea_id?: number | null };
      const input = crearComentarioSchema.parse(body);

      const { data: servicios } = await supabase
        .from("servicios")
        .select("servicio_id")
        .eq("servicio_id", parseInt(servicioId))
        .limit(1);

      if (!servicios?.length) throw new NotFoundError("Servicio no encontrado");

      // Insertar en serviciocomentarios
      const { data: nuevos } = await supabase
        .from("serviciocomentarios")
        .insert({
          servicio_id: parseInt(servicioId),
          usuario_id: user.user_id,
          serviciocomentario_contenido: input.contenido,
          serviciocomentario_fecha: new Date().toISOString().split("T")[0],
          serviciocomentario_hora: new Date().toTimeString().split(" ")[0],
        })
        .select();

      const comentario = nuevos?.[0];

      await auditLog(null, user.user_id, "CREATE", "comentario", comentario?.serviciocomentario_id ?? 0, {
        servicio_id: parseInt(servicioId),
        tarea_id: body.tarea_id ?? null,
      });

      return reply.status(201).send({
        data: comentario
          ? {
              id: comentario.serviciocomentario_id,
              servicio_id: comentario.servicio_id,
              usuario_id: comentario.usuario_id,
              contenido: comentario.serviciocomentario_contenido,
              created_at: comentario.serviciocomentario_fecha,
            }
          : null,
      });
    }
  );

  // -- POST /api/servicios/:servicioId/tareas/:tareaId/comentarios --
  app.post(
    "/api/servicios/:servicioId/tareas/:tareaId/comentarios",
    { preHandler: [requireRoles()] },
    async (request, reply) => {
      const { servicioId, tareaId } = request.params as {
        servicioId: string;
        tareaId: string;
      };
      const user = request.user as { user_id: number; rol: string };
      const body = request.body as { contenido: string };
      const input = crearComentarioSchema.parse(body);

      const { data: tareas } = await supabase
        .from("tareas")
        .select("tarea_id")
        .eq("tarea_id", parseInt(tareaId))
        .eq("servicio_id", parseInt(servicioId))
        .limit(1);

      if (!tareas?.length) throw new NotFoundError("Tarea no encontrada en este servicio");

      // Los comentarios de tarea están en tareacomentarios
      const { data: nuevos } = await supabase
        .from("tareacomentarios")
        .insert({
          tarea_id: parseInt(tareaId),
          usuario_id: user.user_id,
          tareacomentario_contenido: input.contenido,
          tareacomentario_fecha: new Date().toISOString().split("T")[0],
          tareacomentario_hora: new Date().toTimeString().split(" ")[0],
        })
        .select();

      const comentario = nuevos?.[0];

      await auditLog(null, user.user_id, "CREATE", "comentario", comentario?.tareacomentario_id ?? 0, {
        servicio_id: parseInt(servicioId),
        tarea_id: parseInt(tareaId),
      });

      return reply.status(201).send({
        data: comentario
          ? {
              id: comentario.tareacomentario_id,
              tarea_id: comentario.tarea_id,
              usuario_id: comentario.usuario_id,
              contenido: comentario.tareacomentario_contenido,
              created_at: comentario.tareacomentario_fecha,
            }
          : null,
      });
    }
  );

  // -- DELETE /api/comentarios/:id --
  // Nota: en Supabase los comentarios de servicio y de tarea están en tablas separadas.
  // Buscamos en serviciocomentarios primero, luego en tareacomentarios.
  app.delete(
    "/api/comentarios/:id",
    { preHandler: [requireRoles()] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user as { user_id: number; rol: string };
      const comentarioId = parseInt(id);

      // Buscar en serviciocomentarios
      const { data: sc } = await supabase
        .from("serviciocomentarios")
        .select("serviciocomentario_id, usuario_id")
        .eq("serviciocomentario_id", comentarioId)
        .limit(1);

      if (sc?.length) {
        const isAuthor = sc[0].usuario_id === user.user_id;
        const isAdmin = user.rol === "admin";
        if (!isAuthor && !isAdmin) {
          throw new ValidationError("No tienes permiso para eliminar este comentario");
        }
        await supabase.from("serviciocomentarios").delete().eq("serviciocomentario_id", comentarioId);

        await auditLog(null, user.user_id, "DELETE", "comentario", comentarioId, {});
        return reply.status(204).send();
      }

      // Buscar en tareacomentarios
      const { data: tc } = await supabase
        .from("tareacomentarios")
        .select("tareacomentario_id, usuario_id")
        .eq("tareacomentario_id", comentarioId)
        .limit(1);

      if (tc?.length) {
        const isAuthor = tc[0].usuario_id === user.user_id;
        const isAdmin = user.rol === "admin";
        if (!isAuthor && !isAdmin) {
          throw new ValidationError("No tienes permiso para eliminar este comentario");
        }
        await supabase.from("tareacomentarios").delete().eq("tareacomentario_id", comentarioId);

        await auditLog(null, user.user_id, "DELETE", "comentario", comentarioId, {});
        return reply.status(204).send();
      }

      throw new NotFoundError("Comentario no encontrado");
    }
  );
}

