import { FastifyInstance, FastifyRequest } from "fastify";
import { supabase } from "@/lib/supabase.js";
import { NotFoundError, ForbiddenError } from "@/core/errors/index.js";
import { requireRoles } from "@/core/middleware/auth.js";
import { z } from "zod";

const crearSchema = z.object({
  mensaje: z.string().min(1, "El mensaje no puede estar vacío").max(2000),
  tipo: z.enum(["avance", "consulta", "notificacion", "finalizacion"]).default("avance"),
});

const publicCrearSchema = z.object({
  mensaje: z.string().min(1, "El mensaje no puede estar vacío").max(2000),
  dni: z.string().min(1, "DNI obligatorio"),
});

/** Mapea una fila de comunicaciones al formato de respuesta */
function mapComunicacion(c: any) {
  let remitente: string | null = null;
  let esCliente = false;
  if (c.es_cliente) {
    remitente = c.remitente_nombre || "Cliente";
    esCliente = true;
  } else if (c.usuarios) {
    remitente = [c.usuarios.usuario_nombres, c.usuarios.usuario_apellido_paterno]
      .filter(Boolean).join(" ");
  }
  return {
    id: c.comunicacion_id,
    servicio_id: c.servicio_id,
    mensaje: c.comunicacion_mensaje,
    tipo: c.comunicacion_tipo,
    remitente,
    es_cliente: esCliente,
    created_at: c.created_at,
  };
}

/** Query base de comunicaciones con join a usuarios (left join, usuario_id nullable) */
function baseQuery() {
  return (supabase as any)
    .from("comunicaciones")
    .select(`
      comunicacion_id,
      servicio_id,
      usuario_id,
      comunicacion_mensaje,
      comunicacion_tipo,
      remitente_nombre,
      es_cliente,
      created_at,
      usuarios!comunicaciones_usuario_id_fkey (
        usuario_nombres,
        usuario_apellido_paterno
      )
    `);
}

/** Valida que el codigo+dni correspondan a un servicio activo, devuelve el servicio */
async function validarAccesoPublico(codigo: string, dni: string) {
  const { data: svc } = await (supabase as any)
    .from("servicios")
    .select("servicio_id, cliente_nombres, cliente_dni")
    .eq("servicio_codigo", codigo)
    .limit(1);
  if (!svc?.length) throw new NotFoundError("Servicio no encontrado");
  if (svc[0].cliente_dni !== dni) {
    throw new ForbiddenError("DNI incorrecto");
  }
  return svc[0] as { servicio_id: number; cliente_nombres: string; cliente_dni: string };
}

export async function comunicacionesController(app: FastifyInstance) {
  // -- GET /api/servicios/:id/comunicaciones (interno) --
  app.get(
    "/api/servicios/:id/comunicaciones",
    { preHandler: [requireRoles()] },
    async (request) => {
      const { id } = request.params as { id: string };
      const { data: comunicaciones, error } = await baseQuery()
        .eq("servicio_id", parseInt(id))
        .order("created_at", { ascending: false });

      if (error) throw error;
      return { data: (comunicaciones || []).map(mapComunicacion) };
    }
  );

  // -- POST /api/servicios/:id/comunicaciones (interno) --
  app.post(
    "/api/servicios/:id/comunicaciones",
    { preHandler: [requireRoles()] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const authUser = request.user as { user_id: number };
      const input = crearSchema.parse(request.body);

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
          remitente_nombre: null,
          es_cliente: false,
        })
        .select(`
          comunicacion_id,
          servicio_id,
          usuario_id,
          comunicacion_mensaje,
          comunicacion_tipo,
          remitente_nombre,
          es_cliente,
          created_at,
          usuarios!comunicaciones_usuario_id_fkey (
            usuario_nombres,
            usuario_apellido_paterno
          )
        `)
        .limit(1);

      if (error) throw error;
      return reply.status(201).send({ data: inserted?.[0] ? mapComunicacion(inserted[0]) : null });
    }
  );

  // -- GET /api/public/servicios/:codigo/comunicaciones (público) --
  app.get(
    "/api/public/servicios/:codigo/comunicaciones",
    async (request) => {
      const { codigo } = request.params as { codigo: string };
      const query = request.query as { dni?: string };
      if (!query?.dni) throw new ForbiddenError("DNI obligatorio");

      const svc = await validarAccesoPublico(codigo, query.dni);

      const { data: comunicaciones, error } = await baseQuery()
        .eq("servicio_id", svc.servicio_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return { data: (comunicaciones || []).map(mapComunicacion) };
    }
  );

  // -- POST /api/public/servicios/:codigo/comunicaciones (público) --
  app.post(
    "/api/public/servicios/:codigo/comunicaciones",
    async (request, reply) => {
      const { codigo } = request.params as { codigo: string };
      const input = publicCrearSchema.parse(request.body);

      const svc = await validarAccesoPublico(codigo, input.dni);

      const { data: inserted, error } = await (supabase as any)
        .from("comunicaciones")
        .insert({
          servicio_id: svc.servicio_id,
          usuario_id: null,
          comunicacion_mensaje: input.mensaje,
          comunicacion_tipo: "consulta",
          remitente_nombre: svc.cliente_nombres || "Cliente",
          es_cliente: true,
        })
        .select(`
          comunicacion_id,
          servicio_id,
          usuario_id,
          comunicacion_mensaje,
          comunicacion_tipo,
          remitente_nombre,
          es_cliente,
          created_at,
          usuarios!comunicaciones_usuario_id_fkey (
            usuario_nombres,
            usuario_apellido_paterno
          )
        `)
        .limit(1);

      if (error) throw error;
      return reply.status(201).send({ data: inserted?.[0] ? mapComunicacion(inserted[0]) : null });
    }
  );
}
