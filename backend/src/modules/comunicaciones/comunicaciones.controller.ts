import { FastifyInstance } from "fastify";
import { supabase } from "@/lib/supabase.js";
import { NotFoundError } from "@/core/errors/index.js";
import { requireRoles } from "@/core/middleware/auth.js";
import { z } from "zod";

const crearSchema = z.object({
  mensaje: z.string().min(1, "El mensaje no puede estar vacío").max(2000),
  tipo: z.enum(["avance", "consulta", "notificacion", "finalizacion"]).default("avance"),
});

export async function comunicacionesController(app: FastifyInstance) {
  // GET /api/servicios/:id/comunicaciones
  app.get(
    "/api/servicios/:id/comunicaciones",
    { preHandler: [requireRoles()] },
    async (request) => {
      const { id } = request.params as { id: string };
      const { data: comunicaciones, error } = await (supabase as any)
        .from("comunicaciones")
        .select(`
          comunicacion_id,
          servicio_id,
          usuario_id,
          comunicacion_mensaje,
          comunicacion_tipo,
          created_at,
          usuarios!comunicaciones_usuario_id_fkey (
            usuario_nombres,
            usuario_apellido_paterno
          )
        `)
        .eq("servicio_id", parseInt(id))
        .order("created_at", { ascending: false });

      if (error) throw error;

      return {
        data: (comunicaciones || []).map((c: any) => ({
          id: c.comunicacion_id,
          servicio_id: c.servicio_id,
          mensaje: c.comunicacion_mensaje,
          tipo: c.comunicacion_tipo,
          created_at: c.created_at,
          usuario: c.usuarios
            ? {
                nombres: [
                  c.usuarios.usuario_nombres,
                  c.usuarios.usuario_apellido_paterno,
                ]
                  .filter(Boolean)
                  .join(" "),
              }
            : null,
        })),
      };
    }
  );

  // POST /api/servicios/:id/comunicaciones
  app.post(
    "/api/servicios/:id/comunicaciones",
    { preHandler: [requireRoles()] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const authUser = request.user as { user_id: number };
      const input = crearSchema.parse(request.body);

      // Verificar que el servicio existe
      const { data: svc } = await supabase
        .from("servicios")
        .select("servicio_id")
        .eq("servicio_id", parseInt(id))
        .limit(1);
      if (!svc?.length) throw new NotFoundError("Servicio no encontrado");

      const { data: inserted, error } = await (supabase as any)
        .from("comunicaciones")
        .insert({
          servicio_id: parseInt(id),
          usuario_id: authUser.user_id,
          comunicacion_mensaje: input.mensaje,
          comunicacion_tipo: input.tipo,
        })
        .select(`
          comunicacion_id,
          servicio_id,
          usuario_id,
          comunicacion_mensaje,
          comunicacion_tipo,
          created_at,
          usuarios!comunicaciones_usuario_id_fkey (
            usuario_nombres,
            usuario_apellido_paterno
          )
        `)
        .limit(1);

      if (error) throw error;
      const c = inserted?.[0];

      return reply.status(201).send({
        data: c
          ? {
              id: c.comunicacion_id,
              servicio_id: c.servicio_id,
              mensaje: c.comunicacion_mensaje,
              tipo: c.comunicacion_tipo,
              created_at: c.created_at,
              usuario: c.usuarios
                ? {
                    nombres: [
                      c.usuarios.usuario_nombres,
                      c.usuarios.usuario_apellido_paterno,
                    ]
                      .filter(Boolean)
                      .join(" "),
                  }
                : null,
            }
          : null,
      });
    }
  );
}
