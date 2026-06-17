import { FastifyInstance } from "fastify";
import { supabase, type TablesUpdate } from "@/lib/supabase.js";
import { NotFoundError } from "@/core/errors/index.js";
import { requireRoles } from "@/core/middleware/auth.js";
import { auditLog } from "@/core/utils/index.js";
import { z } from "zod";

const crearSolicitudSchema = z.object({
  tipo: z.enum(["apoyo", "herramienta", "equipo", "otro"]),
  descripcion: z.string().min(1, "Descripción requerida"),
  prioridad: z.enum(["baja", "media", "alta", "urgente"]).default("media"),
});

const atenderSolicitudSchema = z.object({
  estado: z.enum(["en_proceso", "resuelto", "rechazado"]),
  respuesta: z.string().nullable().optional(),
});

export async function solicitudesController(app: FastifyInstance) {
  // NOTA: No usar app.addHook + route-level preHandler combinados en serverless/emit (causa timeout).

  // -- GET /api/solicitudes -- listar solicitudes --
  app.get(
    "/api/solicitudes",
    { preHandler: [requireRoles("admin", "encargado", "colaborador")] },
    async (request) => {
      const user = request.user as {
        rol: string;
        user_id: number;
        area_id: number | null;
      };

      let query = supabase
        .from("solicitudes")
        .select(`
          *,
          usuarios!solicitudes_usuario_id_fkey (
            usuario_id,
            usuario_nombres,
            usuario_correo,
            usuario_username
          ),
          atendido_por:usuarios!solicitudes_atendido_por_fkey (
            usuario_id,
            usuario_nombres,
            usuario_correo,
            usuario_username
          )
        `)
        .order("solicitud_fecha_creacion", { ascending: false })
        .order("solicitud_hora_creacion", { ascending: false });

      if (user.rol === "colaborador") {
        // Colaborador: solo sus propias solicitudes
        query = query.eq("usuario_id", user.user_id);
      } else if (user.rol === "encargado") {
        // Encargado: solicitudes de colaboradores de su área + las propias
        const { data: areasData } = await supabase
          .from("areas")
          .select("area_id")
          .eq("area_encargado_id", user.user_id);

        const areaIds = (areasData || []).map((a) => a.area_id);

        if (areaIds.length > 0) {
          const { data: cols } = await supabase
            .from("areacolaboradores")
            .select("colaborador_id")
            .in("area_id", areaIds);

          const userIds = (cols || []).map((c) => c.colaborador_id).filter(Boolean);
          // Incluir las propias solicitudes del encargado
          if (!userIds.includes(user.user_id)) {
            userIds.push(user.user_id);
          }

          if (userIds.length > 0) {
            query = query.in("usuario_id", userIds);
          } else {
            return { data: [] };
          }
        } else {
          // Encargado sin área asignada: solo sus solicitudes
          query = query.eq("usuario_id", user.user_id);
        }
      }
      // Admin: todas (sin filtro)

      const { data: solicitudesData, error } = await query;
      if (error) throw new Error(error.message);

      const rows = (solicitudesData || []).map((s: any) => ({
        id: s.solicitud_id,
        usuario_id: s.usuario_id,
        tipo: s.solicitud_tipo,
        descripcion: s.solicitud_descripcion,
        estado: s.solicitud_estado,
        prioridad: s.solicitud_prioridad,
        atendido_por: s.atendido_por,
        respuesta: s.solicitud_respuesta,
        fecha_creacion: s.solicitud_fecha_creacion,
        hora_creacion: s.solicitud_hora_creacion,
        fecha_atencion: s.solicitud_fecha_atencion,
        hora_atencion: s.solicitud_hora_atencion,
        usuario: s.usuarios
          ? {
              id: s.usuarios.usuario_id,
              nombres: s.usuarios.usuario_nombres,
              correo: s.usuarios.usuario_correo,
              username: s.usuarios.usuario_username,
            }
          : null,
        atendido_por_usuario: s.atendido_por
          ? {
              id: s.atendido_por.usuario_id,
              nombres: s.atendido_por.usuario_nombres,
              correo: s.atendido_por.usuario_correo,
              username: s.atendido_por.usuario_username,
            }
          : null,
      }));

      return { data: rows };
    }
  );

  // -- GET /api/solicitudes/mis-solicitudes -- shortcut para usuario autenticado --
  app.get(
    "/api/solicitudes/mis-solicitudes",
    { preHandler: [requireRoles("admin", "encargado", "colaborador")] },
    async (request) => {
      const user = request.user as { user_id: number };

      const { data: solicitudesData, error } = await supabase
        .from("solicitudes")
        .select(`
          *,
          usuarios!solicitudes_usuario_id_fkey (
            usuario_id,
            usuario_nombres,
            usuario_correo,
            usuario_username
          ),
          atendido_por:usuarios!solicitudes_atendido_por_fkey (
            usuario_id,
            usuario_nombres,
            usuario_correo,
            usuario_username
          )
        `)
        .eq("usuario_id", user.user_id)
        .order("solicitud_fecha_creacion", { ascending: false })
        .order("solicitud_hora_creacion", { ascending: false });

      if (error) throw new Error(error.message);

      const rows = (solicitudesData || []).map((s: any) => ({
        id: s.solicitud_id,
        usuario_id: s.usuario_id,
        tipo: s.solicitud_tipo,
        descripcion: s.solicitud_descripcion,
        estado: s.solicitud_estado,
        prioridad: s.solicitud_prioridad,
        atendido_por: s.atendido_por,
        respuesta: s.solicitud_respuesta,
        fecha_creacion: s.solicitud_fecha_creacion,
        hora_creacion: s.solicitud_hora_creacion,
        fecha_atencion: s.solicitud_fecha_atencion,
        hora_atencion: s.solicitud_hora_atencion,
        usuario: s.usuarios
          ? {
              id: s.usuarios.usuario_id,
              nombres: s.usuarios.usuario_nombres,
              correo: s.usuarios.usuario_correo,
              username: s.usuarios.usuario_username,
            }
          : null,
        atendido_por_usuario: s.atendido_por
          ? {
              id: s.atendido_por.usuario_id,
              nombres: s.atendido_por.usuario_nombres,
              correo: s.atendido_por.usuario_correo,
              username: s.atendido_por.usuario_username,
            }
          : null,
      }));

      return { data: rows };
    }
  );

  // -- POST /api/solicitudes -- crear solicitud --
  app.post(
    "/api/solicitudes",
    { preHandler: [requireRoles("admin", "encargado", "colaborador")] },
    async (request, reply) => {
      const input = crearSolicitudSchema.parse(request.body);
      const user = request.user as { user_id: number };
      const now = new Date();

      const { data: newSolicitudes, error } = await supabase
        .from("solicitudes")
        .insert({
          usuario_id: user.user_id,
          solicitud_tipo: input.tipo,
          solicitud_descripcion: input.descripcion,
          solicitud_prioridad: input.prioridad,
          solicitud_fecha_creacion: now.toISOString().split("T")[0],
          solicitud_hora_creacion: now.toTimeString().split(" ")[0],
        })
        .select();

      if (error) throw new Error(error.message);
      const solicitud = newSolicitudes?.[0];
      if (!solicitud) throw new Error("No se pudo crear la solicitud");

      await auditLog(null, user.user_id, "CREATE", "solicitud", solicitud.solicitud_id, {
        tipo: input.tipo,
        prioridad: input.prioridad,
      });

      return reply.status(201).send({
        data: {
          id: solicitud.solicitud_id,
          usuario_id: solicitud.usuario_id,
          tipo: solicitud.solicitud_tipo,
          descripcion: solicitud.solicitud_descripcion,
          estado: solicitud.solicitud_estado,
          prioridad: solicitud.solicitud_prioridad,
          respuesta: solicitud.solicitud_respuesta,
          fecha_creacion: solicitud.solicitud_fecha_creacion,
          hora_creacion: solicitud.solicitud_hora_creacion,
        },
      });
    }
  );

  // -- PATCH /api/solicitudes/:id/atender -- atender/resolver solicitud --
  app.patch(
    "/api/solicitudes/:id/atender",
    { preHandler: [requireRoles("admin", "encargado")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = atenderSolicitudSchema.parse(request.body);
      const solicitudId = parseInt(id);
      const user = request.user as { user_id: number };
      const now = new Date();

      const { data: existing } = await supabase
        .from("solicitudes")
        .select("solicitud_id")
        .eq("solicitud_id", solicitudId)
        .limit(1);

      if (!existing?.length) throw new NotFoundError("Solicitud no encontrada");

      const updateData: TablesUpdate<"solicitudes"> = {
        solicitud_estado: input.estado,
        atendido_por: user.user_id,
        solicitud_respuesta: input.respuesta ?? null,
        solicitud_fecha_atencion: now.toISOString().split("T")[0],
        solicitud_hora_atencion: now.toTimeString().split(" ")[0],
      };

      const { data: updatedSolicitudes } = await supabase
        .from("solicitudes")
        .update(updateData)
        .eq("solicitud_id", solicitudId)
        .select();

      const updated = updatedSolicitudes?.[0];

      await auditLog(null, user.user_id, "UPDATE", "solicitud", solicitudId, {
        estado: input.estado,
      });

      return reply.send({
        data: updated
          ? {
              id: updated.solicitud_id,
              usuario_id: updated.usuario_id,
              tipo: updated.solicitud_tipo,
              descripcion: updated.solicitud_descripcion,
              estado: updated.solicitud_estado,
              prioridad: updated.solicitud_prioridad,
              atendido_por: updated.atendido_por,
              respuesta: updated.solicitud_respuesta,
              fecha_creacion: updated.solicitud_fecha_creacion,
              hora_creacion: updated.solicitud_hora_creacion,
              fecha_atencion: updated.solicitud_fecha_atencion,
              hora_atencion: updated.solicitud_hora_atencion,
            }
          : null,
      });
    }
  );
}

