import { FastifyInstance } from "fastify";
import { supabase } from "@/lib/supabase.js";
import { NotFoundError, ValidationError } from "@/core/errors/index.js";
import { requireRoles } from "@/core/middleware/auth.js";
import { auditLog } from "@/core/utils/index.js";
import { z } from "zod";

const servicioSchema = z.object({
  titulo: z.string().min(1),
  descripcion: z.string().optional(),
  cliente_email: z.string().email().optional(),
  area_id: z.number().int().nullable().optional(),
  prioridad: z.enum(["baja", "media", "alta", "urgente"]).optional(),
  tiempo_estimado: z.number().int().positive().nullable().optional(),
  // Nuevos campos
  cliente_dni: z.string().optional(),
  cliente_apellido_paterno: z.string().optional(),
  cliente_apellido_materno: z.string().optional(),
  cliente_nombres: z.string().optional(),
  cliente_telefono: z.string().optional(),
  descripcion_equipo: z.string().optional(),
  serie_equipo: z.string().optional(),
  detalles_equipo: z.string().optional(),
  descripcion_accesorio: z.string().optional(),
  detalles_accesorio: z.string().optional(),
  cliente_reporte: z.string().optional(),
  diagnostico_inicial: z.string().optional(),
  id_plantilla_inicial: z.number().int().nullable().optional(),
  colaborador_id: z.number().int().nullable().optional(),
});

const tareaSchema = z.object({
  titulo: z.string().min(1),
  descripcion: z.string().optional(),
});

export async function serviciosController(app: FastifyInstance) {
  // NOTA: No usar app.addHook + route-level preHandler combinados en serverless/emit (causa timeout).
  // autenticación por ruta.

  // ── GET /api/servicios ──
  app.get("/api/servicios", { preHandler: [requireRoles()] }, async (request) => {
    const query = request.query as { estado?: string };
    const user = request.user as { user_id: number; rol: string; area_id: number | null };

    let dbQuery = supabase
      .from("servicios")
      .select("*, usuario_colaborador:usuarios!tecnico_principal_id(usuario_nombres, usuario_apellido_paterno)");

    // Colaborador: solo ve servicios donde está asignado
    if (user.rol === "colaborador") {
      dbQuery = dbQuery.eq("tecnico_principal_id", user.user_id);
    }
    // Encargado: solo ve servicios de su área
    if (user.rol === "encargado" && user.area_id) {
      dbQuery = dbQuery.eq("area_id", user.area_id);
    }

    if (query.estado) {
      dbQuery = dbQuery.eq("servicio_estado", query.estado);
    }

    const { data: rows } = await dbQuery
      .order("servicio_fecha_creacion", { ascending: true });

    return {
      data: (rows || []).map((s: any) => mapServicio(s)),
    };
  });

  // ── GET /api/servicios/:id ──
  app.get("/api/servicios/:id", { preHandler: [requireRoles()] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { data: servicios } = await supabase
      .from("servicios")
      .select("*, usuario_colaborador:usuarios!tecnico_principal_id(usuario_nombres, usuario_apellido_paterno)")
      .eq("servicio_id", parseInt(id))
      .limit(1);

    const servicio = servicios?.[0];
    if (!servicio) throw new NotFoundError("Servicio no encontrado");

    return { data: mapServicio(servicio) };
  });

  // ── POST /api/servicios ──
  app.post("/api/servicios", { preHandler: [requireRoles()] }, async (request, reply) => {
    const input = servicioSchema.parse(request.body);

    const now = new Date();
    const codigo = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0"),
    ].join("");
    const { data: newServicios, error } = await supabase
      .from("servicios")
      .insert({
        servicio_codigo: codigo,
        servicio_nombre: input.titulo,
        servicio_descripcion: input.descripcion || null,
        servicio_estado: "pendiente",
        servicio_tiempo_estimado: input.tiempo_estimado ?? null,
        area_id: input.area_id ?? null,
        tecnico_principal_id: input.colaborador_id ?? null,
        cliente_dni: input.cliente_dni || null,
        cliente_apellido_paterno: input.cliente_apellido_paterno || null,
        cliente_apellido_materno: input.cliente_apellido_materno || null,
        cliente_nombres: input.cliente_nombres || null,
        cliente_telefono: input.cliente_telefono || null,
        servicio_descripcion_equipo: input.descripcion_equipo || null,
        servicio_serie_equipo: input.serie_equipo || null,
        servicio_detalles_equipo: input.detalles_equipo || null,
        servicio_descripcion_accesorio: input.descripcion_accesorio || null,
        servicio_detalles_accesorio: input.detalles_accesorio || null,
        servicio_cliente_reporte: input.cliente_reporte || null,
        servicio_diagnostico_inicial: input.diagnostico_inicial || null,
        id_plantilla_inicial: input.id_plantilla_inicial ?? null,
        servicio_fecha_creacion: now.toISOString().split("T")[0],
        servicio_hora_creacion: now.toTimeString().split(" ")[0],
      })
      .select();

    if (error) throw new Error(error.message);
    const servicio = newServicios?.[0];
    if (!servicio) throw new Error("No se pudo crear el servicio");

    const authUser = request.user as { user_id: number };
    await auditLog(null, authUser.user_id, "CREATE", "servicio", servicio.servicio_id, {
      codigo,
      titulo: input.titulo,
    });

    return reply.status(201).send({ data: mapServicio(servicio) });
  });

  // ── PUT /api/servicios/:id ──
  app.put("/api/servicios/:id", { preHandler: [requireRoles()] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = servicioSchema.parse(request.body);

    const { data: updatedServicios, error } = await supabase
      .from("servicios")
      .update({
        servicio_nombre: input.titulo,
        servicio_descripcion: input.descripcion || null,
      })
      .eq("servicio_id", parseInt(id))
      .select();

    if (error) throw new Error(error.message);
    if (!updatedServicios?.length) throw new NotFoundError("Servicio no encontrado");

    const authUser = request.user as { user_id: number };
    await auditLog(null, authUser.user_id, "UPDATE", "servicio", parseInt(id), {
      campos: Object.keys(input),
    });

    return reply.send({ data: mapServicio(updatedServicios[0]) });
  });

  // ── PATCH /api/servicios/:id/estado ──
  app.patch("/api/servicios/:id/estado", { preHandler: [requireRoles("admin", "encargado")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { estado, motivo } = request.body as { estado: string; motivo?: string };
    const validos = ["pendiente", "en_progreso", "completado", "cancelado", "bloqueado"];
    if (!validos.includes(estado)) throw new ValidationError("Estado inválido");
    if (estado === "bloqueado" && !motivo) throw new ValidationError("Se requiere motivo para bloquear");

    const { data: servicios } = await supabase
      .from("servicios")
      .select("servicio_id, servicio_estado, servicio_fecha_inicio")
      .eq("servicio_id", parseInt(id))
      .limit(1);

    if (!servicios?.length) throw new NotFoundError("Servicio no encontrado");
    const servicioActual = servicios[0];

    const updateData: Record<string, unknown> = {
      servicio_estado: estado,
    };

    if (estado === "en_progreso" && !servicioActual.servicio_fecha_inicio) {
      const now = new Date();
      updateData.servicio_fecha_inicio = now.toISOString().split("T")[0];
      updateData.servicio_hora_inicio = now.toTimeString().split(" ")[0];
    }

    const { data: updatedServicios } = await supabase
      .from("servicios")
      .update(updateData)
      .eq("servicio_id", parseInt(id))
      .select();

    if (!updatedServicios?.length) throw new NotFoundError("Servicio no encontrado");

    const userEstado = request.user as { user_id: number };
    await auditLog(null, userEstado.user_id, "STATUS_CHANGE", "servicio", parseInt(id), {
      estado_anterior: servicioActual.servicio_estado,
      estado_nuevo: estado,
      motivo: motivo || null,
    });

    return reply.send({ data: mapServicio(updatedServicios[0]) });
  });

  // ── POST /api/servicios/:id/iniciar ──
  app.post("/api/servicios/:id/iniciar", { preHandler: [requireRoles()] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user as { user_id: number };
    const servicioId = parseInt(id);

    const { data: servicios } = await supabase
      .from("servicios")
      .select("*")
      .eq("servicio_id", servicioId)
      .limit(1);

    if (!servicios?.length) throw new NotFoundError("Servicio no encontrado");
    const servicio = servicios[0];

    if (servicio.servicio_estado !== "pendiente") {
      throw new ValidationError("Solo se puede iniciar un servicio en estado pendiente");
    }

    const now = new Date();
    const { data: updatedServicios } = await supabase
      .from("servicios")
      .update({
        servicio_estado: "en_progreso",
        servicio_fecha_inicio: now.toISOString().split("T")[0],
        servicio_hora_inicio: now.toTimeString().split(" ")[0],
      })
      .eq("servicio_id", servicioId)
      .select();

    if (!updatedServicios?.length) throw new NotFoundError("Servicio no encontrado");

    await auditLog(null, user.user_id, "STATUS_CHANGE", "servicio", servicioId, {
      accion: "iniciar",
      estado_anterior: "pendiente",
      estado_nuevo: "en_progreso",
    });

    return reply.send({ data: mapServicio(updatedServicios[0]) });
  });

  // ────────────────────
  // TAREAS
  // ────────────────────

  // GET /api/servicios/:id/tareas
  app.get("/api/servicios/:id/tareas", { preHandler: [requireRoles()] }, async (request) => {
    const { id } = request.params as { id: string };
    const servicioId = parseInt(id);

    const { data: tareasData } = await supabase
      .from("tareas")
      .select("*")
      .eq("servicio_id", servicioId)
      .order("tarea_orden", { ascending: true });

    const rows = (tareasData || []).map((t: any) => ({
      id: t.tarea_id,
      servicio_id: t.servicio_id,
      titulo: t.tarea_titulo,
      descripcion: null, // Supabase tareas no tiene descripcion
      orden: t.tarea_orden,
      completada: t.tarea_estado === "completado",
      completada_por: t.tarea_completado_por,
      completada_at: t.tarea_fecha_completado
        ? new Date(`${t.tarea_fecha_completado}T${t.tarea_hora_completado || "00:00:00"}`).toISOString()
        : null,
      area_id: null, // no disponible en Supabase
      tiempo_estimado: null, // no disponible en Supabase tareas
      asignado_a: null, // no disponible en Supabase tareas
      created_at: t.tarea_fecha_creacion,
      has_active_tracking: false, // tiempo_tracking no existe en Supabase
    }));

    return { data: rows };
  });

  // POST /api/servicios/:id/tareas
  app.post("/api/servicios/:id/tareas", { preHandler: [requireRoles()] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = tareaSchema.parse(request.body);
    const servicioId = parseInt(id);
    const user = request.user as { user_id: number };

    // Obtener el orden máximo
    const { data: maxTareas } = await supabase
      .from("tareas")
      .select("tarea_orden")
      .eq("servicio_id", servicioId)
      .order("tarea_orden", { ascending: true })
      .limit(1);

    const maxOrden = maxTareas?.[0]?.tarea_orden ?? -1;
    const nuevoOrden = maxOrden + 1;

    const now = new Date();
    const { data: newTareas } = await supabase
      .from("tareas")
      .insert({
        servicio_id: servicioId,
        tarea_titulo: input.titulo,
        tarea_orden: nuevoOrden,
        tarea_estado: "pendiente",
        tarea_fecha_creacion: now.toISOString().split("T")[0],
        tarea_hora_creacion: now.toTimeString().split(" ")[0],
      })
      .select();

    const tarea = newTareas?.[0];
    if (!tarea) throw new Error("No se pudo crear la tarea");

    await auditLog(null, user.user_id, "CREATE", "tarea", tarea.tarea_id, {
      servicio_id: servicioId,
      titulo: input.titulo,
    });

    return reply.status(201).send({
      data: {
        id: tarea.tarea_id,
        servicio_id: tarea.servicio_id,
        titulo: tarea.tarea_titulo,
        orden: tarea.tarea_orden,
        completada: false,
        created_at: tarea.tarea_fecha_creacion,
      },
    });
  });

  // PUT /api/tareas/:id
  app.put("/api/tareas/:id", { preHandler: [requireRoles()] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = tareaSchema.parse(request.body);

    const updateData: Record<string, unknown> = {};
    if (input.titulo !== undefined) updateData.tarea_titulo = input.titulo;

    const { data: updatedTareas } = await supabase
      .from("tareas")
      .update(updateData)
      .eq("tarea_id", parseInt(id))
      .select();

    if (!updatedTareas?.length) throw new NotFoundError("Tarea no encontrada");

    const t = updatedTareas[0];
    return reply.send({
      data: {
        id: t.tarea_id,
        servicio_id: t.servicio_id,
        titulo: t.tarea_titulo,
        orden: t.tarea_orden,
      },
    });
  });

  // DELETE /api/tareas/:id
  app.delete("/api/tareas/:id", { preHandler: [requireRoles()] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user as { user_id: number };
    const tareaId = parseInt(id);

    // Obtener datos para auditoría antes de borrar
    const { data: tareas } = await supabase
      .from("tareas")
      .select("tarea_id, tarea_titulo, servicio_id")
      .eq("tarea_id", tareaId)
      .limit(1);

    const tarea = tareas?.[0];
    if (tarea) {
      // Eliminar comentarios de tarea primero
      await supabase.from("tareacomentarios").delete().eq("tarea_id", tareaId);
      await supabase.from("tareas").delete().eq("tarea_id", tareaId);
    }

    if (tarea) {
      await auditLog(null, user.user_id, "DELETE", "tarea", tareaId, {
        titulo: tarea.tarea_titulo,
        servicio_id: tarea.servicio_id,
      });
    }

    return reply.status(204).send();
  });

  // PATCH /api/servicios/:id/tareas/:tareaId
  app.patch("/api/servicios/:id/tareas/:tareaId", { preHandler: [requireRoles()] }, async (request, reply) => {
    const { tareaId } = request.params as { id: string; tareaId: string };
    const { titulo } = request.body as { titulo?: string };

    if (titulo === undefined) {
      throw new ValidationError("titulo es requerido");
    }

    const { data: updatedTareas } = await supabase
      .from("tareas")
      .update({ tarea_titulo: titulo })
      .eq("tarea_id", parseInt(tareaId))
      .select();

    if (!updatedTareas?.length) throw new NotFoundError("Tarea no encontrada");

    return reply.send({ data: updatedTareas[0] });
  });

  // PATCH /api/tareas/:id/completar
  app.patch("/api/tareas/:id/completar", { preHandler: [requireRoles()] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user as { user_id: number };
    const now = new Date();

    const { data: updatedTareas } = await supabase
      .from("tareas")
      .update({
        tarea_estado: "completado",
        tarea_completado_por: user.user_id,
        tarea_fecha_completado: now.toISOString().split("T")[0],
        tarea_hora_completado: now.toTimeString().split(" ")[0],
      })
      .eq("tarea_id", parseInt(id))
      .select();

    if (!updatedTareas?.length) throw new NotFoundError("Tarea no encontrada");

    const t = updatedTareas[0];
    await auditLog(null, user.user_id, "COMPLETE", "tarea", parseInt(id), {
      titulo: t.tarea_titulo,
      servicio_id: t.servicio_id,
    });

    return reply.send({
      data: {
        id: t.tarea_id,
        servicio_id: t.servicio_id,
        titulo: t.tarea_titulo,
        orden: t.tarea_orden,
        completada: true,
        completada_por: t.tarea_completado_por,
        completada_at: t.tarea_fecha_completado,
      },
    });
  });

  // PATCH /api/tareas/:id/reabrir
  app.patch("/api/tareas/:id/reabrir", { preHandler: [requireRoles()] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user as { user_id: number };

    const { data: updatedTareas } = await supabase
      .from("tareas")
      .update({
        tarea_estado: "pendiente",
        tarea_completado_por: null,
        tarea_fecha_completado: null,
        tarea_hora_completado: null,
      })
      .eq("tarea_id", parseInt(id))
      .select();

    if (!updatedTareas?.length) throw new NotFoundError("Tarea no encontrada");

    const t = updatedTareas[0];
    await auditLog(null, user.user_id, "REOPEN", "tarea", parseInt(id), {
      titulo: t.tarea_titulo,
      servicio_id: t.servicio_id,
    });

    return reply.send({
      data: {
        id: t.tarea_id,
        servicio_id: t.servicio_id,
        titulo: t.tarea_titulo,
        completada: false,
      },
    });
  });

  // PUT /api/tareas/reordenar
  app.put("/api/tareas/reordenar", { preHandler: [requireRoles()] }, async (request, reply) => {
    const { tareas: items } = request.body as { tareas: { id: number; orden: number }[] };
    const user = request.user as { user_id: number };

    for (const item of items) {
      await supabase
        .from("tareas")
        .update({ tarea_orden: item.orden })
        .eq("tarea_id", item.id);
    }

    if (items.length > 0) {
      await auditLog(null, user.user_id, "UPDATE", "tarea-reordenar", null, {
        cantidad: items.length,
      });
    }

    return reply.send({ data: { success: true } });
  });
}

// ── Helper: mapea servicio de Supabase al formato ServicioLocalSTS ──
function mapServicio(s: any) {
  const colab = s.usuario_colaborador;
  const colaboradorNombre = colab
    ? `${colab.usuario_nombres || ""} ${colab.usuario_apellido_paterno || ""}`.trim()
    : null;

  return {
    id: s.servicio_id,
    codigo: s.servicio_codigo,
    titulo: s.servicio_nombre,
    descripcion: s.servicio_descripcion,
    estado: s.servicio_estado,
    prioridad: "media", // no disponible en Supabase
    area_id: s.area_id,
    colaborador_id: s.tecnico_principal_id,
    colaborador_nombre: colaboradorNombre,
    cliente_nombre: s.cliente_id ? `Cliente #${s.cliente_id}` : null,
    cliente_email: null, // no disponible en servicios
    cliente_dni: s.cliente_dni || null,
    cliente_apellido_paterno: s.cliente_apellido_paterno || null,
    cliente_apellido_materno: s.cliente_apellido_materno || null,
    cliente_nombres: s.cliente_nombres || null,
    cliente_telefono: s.cliente_telefono || null,
    descripcion_equipo: s.servicio_descripcion_equipo || null,
    serie_equipo: s.servicio_serie_equipo || null,
    detalles_equipo: s.servicio_detalles_equipo || null,
    descripcion_accesorio: s.servicio_descripcion_accesorio || null,
    detalles_accesorio: s.servicio_detalles_accesorio || null,
    cliente_reporte: s.servicio_cliente_reporte || null,
    diagnostico_inicial: s.servicio_diagnostico_inicial || null,
    id_plantilla_inicial: s.id_plantilla_inicial || null,
    datos_completos: false, // no disponible en Supabase
    consultado_cliente: false, // no disponible en Supabase
    tiempo_estimado: s.servicio_tiempo_estimado,
    fecha_inicio: s.servicio_fecha_inicio,
    fecha_fin: s.servicio_fecha_fin,
    bloqueado_motivo: null, // no disponible en Supabase
    created_at: s.servicio_fecha_creacion,
    updated_at: null,
  };
}

