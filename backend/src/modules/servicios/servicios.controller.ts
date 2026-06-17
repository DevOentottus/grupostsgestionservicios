import { FastifyInstance } from "fastify";
import { supabase, type TablesUpdate } from "@/lib/supabase.js";
import { NotFoundError, ValidationError } from "@/core/errors/index.js";
import { requireRoles } from "@/core/middleware/auth.js";
import { auditLog } from "@/core/utils/index.js";
import { z } from "zod";

const servicioSchema = z.object({
  titulo: z.string().min(1),
  descripcion: z.string().nullable().optional(),
  cliente_email: z.string().email().nullable().optional(),
  area_id: z.number().int().nullable().optional(),
  prioridad: z.enum(["baja", "media", "alta", "urgente"]).nullable().optional(),
  tiempo_estimado: z.number().int().positive().nullable().optional(),
  cliente_dni: z.string().min(1, "DNI del cliente es requerido"),
  cliente_apellido_paterno: z.string().nullable().optional(),
  cliente_apellido_materno: z.string().nullable().optional(),
  cliente_nombres: z.string().nullable().optional(),
  cliente_telefono: z.string().nullable().optional(),
  descripcion_equipo: z.string().nullable().optional(),
  serie_equipo: z.string().nullable().optional(),
  detalles_equipo: z.string().nullable().optional(),
  descripcion_accesorio: z.string().nullable().optional(),
  detalles_accesorio: z.string().nullable().optional(),
  cliente_reporte: z.string().nullable().optional(),
  diagnostico_inicial: z.string().nullable().optional(),
  servicio_audio_cliente: z.string().nullable().optional(),
  servicio_audio_diagnostico: z.string().nullable().optional(),
  id_plantilla_inicial: z.number().int().nullable().optional(),
  colaborador_id: z.number().int(),
  permite_evidencia: z.boolean().nullable().optional(),
  codigo: z.string().nullable().optional(),
});

const tareaSchema = z.object({
  titulo: z.string().min(1),
  descripcion: z.string().optional(),
});

// -- Helpers de autorización y orden --
async function verificarPermisoModificar(
  servicioId: number,
  user: { user_id: number; rol: string; area_id: number | null }
) {
  if (user.rol === "admin" || user.rol === "sistema") return;
  const { data: servicios } = await supabase
    .from("servicios")
    .select("servicio_id, tecnico_principal_id, area_id")
    .eq("servicio_id", servicioId)
    .limit(1);
  if (!servicios?.length) throw new NotFoundError("Servicio no encontrado");
  const s = servicios[0];
  if (user.rol === "encargado") {
    if (s.area_id !== user.area_id)
      throw new ValidationError("No tenés permiso para modificar este servicio");
    return;
  }
  if (s.tecnico_principal_id !== user.user_id)
    throw new ValidationError("Solo el técnico asignado puede modificar este servicio");
}

async function verificarOrdenTarea(tareaId: number) {
  const { data: tareas } = await supabase
    .from("tareas")
    .select("tarea_id, tarea_orden, servicio_id, tarea_estado")
    .eq("tarea_id", tareaId)
    .limit(1);
  if (!tareas?.length) throw new NotFoundError("Tarea no encontrada");
  const t = tareas[0];
  const { data: prevTareas } = await supabase
    .from("tareas")
    .select("tarea_estado")
    .eq("servicio_id", t.servicio_id)
    .eq("tarea_orden", t.tarea_orden - 1)
    .limit(1);
  if (prevTareas?.length && prevTareas[0].tarea_estado !== "completado")
    throw new ValidationError("Completá la tarea anterior primero");
  return t;
}

export async function serviciosController(app: FastifyInstance) {
  // NOTA: No usar app.addHook + route-level preHandler combinados en serverless/emit (causa timeout).
  // autenticación por ruta.

  // -- GET /api/servicios --
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

  // -- GET /api/servicios/:id --
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

  // -- POST /api/servicios --
  app.post("/api/servicios", { preHandler: [requireRoles()] }, async (request, reply) => {
    const input = servicioSchema.parse(request.body);

    const now = new Date();
    const codigo = "SRV" + [
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
        servicio_codigo: input.codigo || codigo,
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
        servicio_audio_cliente: input.servicio_audio_cliente || null,
        servicio_audio_diagnostico: input.servicio_audio_diagnostico || null,
        id_plantilla_inicial: input.id_plantilla_inicial ?? null,
        servicio_permite_evidencia: input.permite_evidencia ?? true,
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

  // -- PUT /api/servicios/:id --
  app.put("/api/servicios/:id", { preHandler: [requireRoles()] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user as { user_id: number; rol: string; area_id: number | null };
    const input = servicioSchema.parse(request.body);

    await verificarPermisoModificar(parseInt(id), user);

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

  // -- PATCH /api/servicios/:id/estado --
  app.patch("/api/servicios/:id/estado", { preHandler: [requireRoles("admin", "encargado")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { estado, motivo } = request.body as { estado: string; motivo?: string };
    const validos = ["pendiente", "en_progreso", "completado", "cancelado", "bloqueado"];
    if (!validos.includes(estado)) throw new ValidationError("Estado inválido");
    if (estado === "bloqueado" && !motivo) throw new ValidationError("Se requiere motivo para bloquear");

    const { data: servicios } = await supabase
      .from("servicios")
      .select("servicio_id, servicio_estado, servicio_fecha_inicio, servicio_fecha_fin")
      .eq("servicio_id", parseInt(id))
      .limit(1);

    if (!servicios?.length) throw new NotFoundError("Servicio no encontrado");
    const servicioActual = servicios[0];

    const updateData: TablesUpdate<"servicios"> = {
      servicio_estado: estado,
    };

    if (estado === "en_progreso" && !servicioActual.servicio_fecha_inicio) {
      const now = new Date();
      updateData.servicio_fecha_inicio = now.toISOString().split("T")[0];
      updateData.servicio_hora_inicio = now.toTimeString().split(" ")[0];
    }

    if (estado === "completado" && !servicioActual.servicio_fecha_fin) {
      const now = new Date();
      updateData.servicio_fecha_fin = now.toISOString().split("T")[0];
      updateData.servicio_hora_fin = now.toTimeString().split(" ")[0];
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

  // -- POST /api/servicios/:id/iniciar --
  app.post("/api/servicios/:id/iniciar", { preHandler: [requireRoles()] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user as { user_id: number; rol: string; area_id: number | null };
    const servicioId = parseInt(id);

    await verificarPermisoModificar(servicioId, user);

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

  // --------------------
  // TAREAS
  // --------------------

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
    const user = request.user as { user_id: number; rol: string; area_id: number | null };

    await verificarPermisoModificar(servicioId, user);

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
    const user = request.user as { user_id: number; rol: string; area_id: number | null };
    const tareaId = parseInt(id);
    const input = tareaSchema.parse(request.body);

    const { data: taskData } = await supabase
      .from("tareas")
      .select("servicio_id")
      .eq("tarea_id", tareaId)
      .limit(1);
    if (!taskData?.length) throw new NotFoundError("Tarea no encontrada");
    await verificarPermisoModificar(taskData[0].servicio_id, user);

    const updateData: TablesUpdate<"tareas"> = {};
    if (input.titulo !== undefined) updateData.tarea_titulo = input.titulo;

    const { data: updatedTareas } = await supabase
      .from("tareas")
      .update(updateData)
      .eq("tarea_id", tareaId)
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
    const user = request.user as { user_id: number; rol: string; area_id: number | null };
    const tareaId = parseInt(id);

    // Obtener datos para auditoría antes de borrar
    const { data: tareas } = await supabase
      .from("tareas")
      .select("tarea_id, tarea_titulo, servicio_id")
      .eq("tarea_id", tareaId)
      .limit(1);

    const tarea = tareas?.[0];
    if (tarea) {
      await verificarPermisoModificar(tarea.servicio_id, user);
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
    const user = request.user as { user_id: number; rol: string; area_id: number | null };
    const now = new Date();
    const tareaId = parseInt(id);

    const tarea = await verificarOrdenTarea(tareaId);
    await verificarPermisoModificar(tarea.servicio_id, user);

    // Finalizar tracking activo si existe
    await supabase
      .from("tiempo_tracking")
      .update({
        tracking_fin: now.toISOString(),
        tracking_pausa: null,
      })
      .eq("tarea_id", tareaId)
      .eq("usuario_id", user.user_id)
      .is("tracking_fin", null);

    const { data: updatedTareas } = await supabase
      .from("tareas")
      .update({
        tarea_estado: "completado",
        tarea_completado_por: user.user_id,
        tarea_fecha_completado: now.toISOString().split("T")[0],
        tarea_hora_completado: now.toTimeString().split(" ")[0],
      })
      .eq("tarea_id", tareaId)
      .select();

    if (!updatedTareas?.length) throw new NotFoundError("Tarea no encontrada");

    const t = updatedTareas[0];
    await auditLog(null, user.user_id, "COMPLETE", "tarea", tareaId, {
      titulo: t.tarea_titulo,
      servicio_id: t.servicio_id,
    });

    // Si todas las tareas del servicio están completadas, cerrar el servicio
    const { data: pendingTasks } = await supabase
      .from("tareas")
      .select("tarea_id")
      .eq("servicio_id", t.servicio_id)
      .neq("tarea_estado", "completado")
      .limit(1);

    if (!pendingTasks?.length) {
      await supabase
        .from("servicios")
        .update({
          servicio_estado: "completado",
          servicio_fecha_fin: now.toISOString().split("T")[0],
          servicio_hora_fin: now.toTimeString().split(" ")[0],
        })
        .eq("servicio_id", t.servicio_id);
    }

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
    const user = request.user as { user_id: number; rol: string; area_id: number | null };
    const tareaId = parseInt(id);

    const { data: taskData } = await supabase
      .from("tareas")
      .select("servicio_id")
      .eq("tarea_id", tareaId)
      .limit(1);
    if (!taskData?.length) throw new NotFoundError("Tarea no encontrada");
    await verificarPermisoModificar(taskData[0].servicio_id, user);

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
    const user = request.user as { user_id: number; rol: string; area_id: number | null };

    // Verificar permiso sobre la primera tarea (todas pertenecen al mismo servicio)
    if (items.length > 0) {
      const { data: firstTask } = await supabase
        .from("tareas")
        .select("servicio_id")
        .eq("tarea_id", items[0].id)
        .limit(1);
      if (firstTask?.length) await verificarPermisoModificar(firstTask[0].servicio_id, user);
    }

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
  // ----------------------------------
  // CRONÓMETRO POR TAREA (tiempo_tracking)
  // ----------------------------------

  // GET /api/servicios/:id/tiempos -- resumen de tracking para todo el servicio
  app.get("/api/servicios/:id/tiempos", { preHandler: [requireRoles()] }, async (request) => {
    const { id } = request.params as { id: string };
    const servicioId = parseInt(id);

    const { data: tareas } = await supabase
      .from("tareas")
      .select("tarea_id, tarea_titulo, tarea_estado, tarea_tiempo_real, tarea_orden")
      .eq("servicio_id", servicioId)
      .order("tarea_orden", { ascending: true });

    const tareaIds = (tareas || []).map((t: any) => t.tarea_id);

    // Obtener tracking activo (sin fin) para todas las tareas
    const { data: trackingsActivos } = tareaIds.length > 0 ? await supabase
      .from("tiempo_tracking")
      .select("*")
      .in("tarea_id", tareaIds)
      .is("tracking_fin", null) : { data: [] };

    const activosMap: Record<number, any> = {};
    for (const ta of trackingsActivos || []) {
      if (!activosMap[ta.tarea_id]) activosMap[ta.tarea_id] = ta;
    }

    const resumen = (tareas || []).map((t: any) => {
      const activo = activosMap[t.tarea_id];
      return {
        tarea_id: t.tarea_id,
        titulo: t.tarea_titulo,
        completada: t.tarea_estado === "completado",
        tiempo_estimado: null,
        tiempo_real_minutos: t.tarea_tiempo_real || 0,
        tracking_activo: !!activo,
        tracking_id: activo?.tracking_id || null,
        tracking_inicio: activo?.tracking_inicio || null,
        tracking_pausa: activo?.tracking_pausa || null,
      };
    });

    return { data: resumen };
  });

  // POST /api/tareas/:id/tiempo/iniciar
  app.post("/api/tareas/:id/tiempo/iniciar", { preHandler: [requireRoles()] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user as { user_id: number };
    const tareaId = parseInt(id);

    // Verificar que la tarea existe
    const { data: tareas } = await supabase
      .from("tareas")
      .select("tarea_id, tarea_estado")
      .eq("tarea_id", tareaId)
      .limit(1);
    if (!tareas?.length) throw new NotFoundError("Tarea no encontrada");

    // Finalizar cualquier tracking activo del usuario en esta tarea
    await supabase
      .from("tiempo_tracking")
      .update({ tracking_fin: new Date().toISOString() })
      .eq("tarea_id", tareaId)
      .eq("usuario_id", user.user_id)
      .is("tracking_fin", null);

    const now = new Date();
    const { data: newTrack } = await supabase
      .from("tiempo_tracking")
      .insert({
        tarea_id: tareaId,
        usuario_id: user.user_id,
        tracking_inicio: now.toISOString(),
      })
      .select()
      .limit(1);

    return reply.status(201).send({ data: newTrack?.[0] || null });
  });

  // GET /api/tareas/:id/tiempo
  app.get("/api/tareas/:id/tiempo", { preHandler: [requireRoles()] }, async (request) => {
    const { id } = request.params as { id: string };
    const { data: entries } = await supabase
      .from("tiempo_tracking")
      .select("*, usuarios!tiempo_tracking_usuario_id_fkey(usuario_nombres)")
      .eq("tarea_id", parseInt(id))
      .order("tracking_inicio", { ascending: false });

    return {
      data: (entries || []).map((e) => ({
        id: e.tracking_id,
        tarea_id: e.tarea_id,
        usuario_id: e.usuario_id,
        usuario_nombre: e.usuarios?.usuario_nombres || null,
        inicio: e.tracking_inicio,
        pausa_at: e.tracking_pausa,
        fin: e.tracking_fin,
        created_at: e.created_at,
      })),
    };
  });

  // PATCH /api/tiempo/:id/pausar
  app.patch("/api/tiempo/:id/pausar", { preHandler: [requireRoles()] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { data: updated } = await supabase
      .from("tiempo_tracking")
      .update({ tracking_pausa: new Date().toISOString() })
      .eq("tracking_id", parseInt(id))
      .is("tracking_pausa", null)
      .is("tracking_fin", null)
      .select()
      .limit(1);

    if (!updated?.length) throw new NotFoundError("Tracking no encontrado o ya pausado");
    return reply.send({ data: updated[0] });
  });

  // PATCH /api/tiempo/:id/reanudar
  app.patch("/api/tiempo/:id/reanudar", { preHandler: [requireRoles()] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { data: updated } = await supabase
      .from("tiempo_tracking")
      .update({ tracking_pausa: null })
      .eq("tracking_id", parseInt(id))
      .is("tracking_fin", null)
      .select()
      .limit(1);

    if (!updated?.length) throw new NotFoundError("Tracking no encontrado o ya finalizado");
    return reply.send({ data: updated[0] });
  });

  // PATCH /api/tiempo/:id/finalizar
  app.patch("/api/tiempo/:id/finalizar", { preHandler: [requireRoles()] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const now = new Date();
    const { data: updated } = await supabase
      .from("tiempo_tracking")
      .update({
        tracking_fin: now.toISOString(),
        tracking_pausa: null, // si estaba pausado, se reanuda y finaliza
      })
      .eq("tracking_id", parseInt(id))
      .is("tracking_fin", null)
      .select()
      .limit(1);

    if (!updated?.length) throw new NotFoundError("Tracking no encontrado o ya finalizado");

    // Calcular y actualizar tarea_tiempo_real en la tarea
    const track = updated[0];
    const inicio = new Date(track.tracking_inicio).getTime();
    const fin = now.getTime();
    const minutos = Math.round((fin - inicio) / 60000);

    if (minutos > 0) {
      // Sumar al tiempo real existente
      const { data: tareaActual } = await supabase
        .from("tareas")
        .select("tarea_tiempo_real")
        .eq("tarea_id", track.tarea_id)
        .limit(1);

      const tiempoExistente = tareaActual?.[0]?.tarea_tiempo_real || 0;
      await supabase
        .from("tareas")
        .update({ tarea_tiempo_real: tiempoExistente + minutos })
        .eq("tarea_id", track.tarea_id);
    }

    return reply.send({ data: updated[0] });
  });

  // -- GET /api/servicios/:id/reporte-tecnico --
  app.get(
    "/api/servicios/:id/reporte-tecnico",
    async (request, reply) => {
      try {
        const user = request.user as { user_id: number; rol: string } | undefined;
        if (!user) {
          // Fallback: permitir token vía query param para window.open()
          const token = (request.query as { token?: string }).token;
          if (!token) throw new ValidationError("No autenticado");
          try {
            const decoded = await app.jwt.verify(token);
            (request as any).user = decoded;
          } catch {
            throw new ValidationError("Token inválido o expirado");
          }
        }
        await reporteTecnicoPDF(request, reply);
      } catch (err: any) {
        console.error("[reporte-tecnico]", err);
        throw err;
      }
    }
  );
}

// -- Helper: genera PDF de reporte técnico --
async function reporteTecnicoPDF(request: any, reply: any) {
  const { id } = request.params as { id: string };
  const servicioId = parseInt(id, 10);

  // 1. Obtener servicio
  const { data: servicios, error: errSvc } = await supabase
    .from("servicios")
    .select("*, areas!servicios_area_id_fkey(area_nombre), usuario_colaborador:usuarios!tecnico_principal_id(usuario_nombres, usuario_apellido_paterno)")
    .eq("servicio_id", servicioId)
    .limit(1);

  if (errSvc || !servicios?.length) {
    throw new NotFoundError("Servicio no encontrado");
  }
  const s = servicios[0];

  // 2. Obtener tareas
  const { data: tareas } = await supabase
    .from("tareas")
    .select("*, usuario_completador:usuarios!tarea_completado_por(usuario_nombres, usuario_apellido_paterno)")
    .eq("servicio_id", servicioId)
    .order("tarea_orden");

  // 3. Obtener evidencias
  const { data: evidencias } = await supabase
    .from("evidencias")
    .select("*")
    .eq("servicio_id", servicioId)
    .neq("estado", "rechazado");

  // 4. Obtener comentarios
  const { data: comentarios } = await supabase
    .from("serviciocomentarios")
    .select("*, usuarios!serviciocomentarios_usuario_id_fkey(usuario_nombres, usuario_apellido_paterno)")
    .eq("servicio_id", servicioId)
    .order("serviciocomentario_fecha", { ascending: false })
    .order("serviciocomentario_hora", { ascending: false });

  // Agrupar evidencias por tarea
  const eviPorTarea: Record<number, any[]> = {};
  for (const ev of evidencias || []) {
    const tid = ev.tarea_id;
    if (!eviPorTarea[tid]) eviPorTarea[tid] = [];
    eviPorTarea[tid].push(ev);
  }

  // 5. Generar PDF con pdfkit — envuelto en Promise para que Fastify espere
  return new Promise<void>(async (resolve, reject) => {
    try {
      const PDFDocument = (await import("pdfkit")).default;
      const doc = new PDFDocument({ margin: 40, size: "A4" });

      const buffers: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(buffers);
        reply.header("Content-Type", "application/pdf");
        const q = request.query as { download?: string };
        const disposition = q.download === "true" ? "attachment" : "inline";
        const codigo = s.servicio_codigo || `SRV${s.servicio_id}`;
        reply.header("Content-Disposition", `${disposition}; filename="reporte-tecnico-${codigo}.pdf"`);
        reply.send(pdfBuffer);
        resolve();
      });

      const colab = s.usuario_colaborador;
      const tecnicoNombre = colab
        ? `${colab.usuario_nombres || ""} ${colab.usuario_apellido_paterno || ""}`.trim()
        : "—";

      // ─── HEADER ───
      doc.fontSize(16).font("Helvetica-Bold").text("Hoja de Reporte Técnico", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(8).font("Helvetica").fillColor("#666")
        .text(`Generado: ${new Date().toLocaleDateString("es-PE")} ${new Date().toLocaleTimeString("es-PE")}`, { align: "right" });
      doc.moveDown(0.8);

      // ─── DATOS DEL SERVICIO ───
      doc.fillColor("#000").fontSize(10).font("Helvetica-Bold").text("Datos del Servicio");
      doc.moveDown(0.3);
      doc.fontSize(9).font("Helvetica");

      const svcInfo = [
        [`Código:`, s.servicio_codigo || `SRV${s.servicio_id}`],
        [`Nombre:`, s.servicio_nombre || "—"],
        [`Cliente:`, [s.cliente_nombres, s.cliente_apellido_paterno, s.cliente_apellido_materno].filter(Boolean).join(" ") || "—"],
        [`DNI:`, s.cliente_dni || "—"],
        [`Teléfono:`, s.cliente_telefono || "—"],
        [`Área:`, s.areas?.area_nombre || "—"],
        [`Técnico:`, tecnicoNombre],
        [`Estado:`, s.servicio_estado || "—"],
        [`Creado:`, [s.servicio_fecha_creacion, s.servicio_hora_creacion].filter(Boolean).join(" ")],
      ];

      let yPos = doc.y;
      for (const [label, value] of svcInfo) {
        doc.text(label, 40, yPos, { width: 70, continued: true });
        doc.text(` ${value}`, { width: 200 });
        yPos = doc.y + 2;
      }

      doc.moveDown(1);

      // ─── TAREAS ───
      const tareasList = tareas || [];
      doc.fillColor("#000").fontSize(10).font("Helvetica-Bold").text("Tareas", { underline: true });
      doc.moveDown(0.5);

      if (tareasList.length === 0) {
        doc.fontSize(9).font("Helvetica").fillColor("#999").text("Sin tareas registradas.");
        doc.moveDown(0.5);
      } else {
        // Tabla
        const tableTop = doc.y;
        const colX = [40, 220, 300, 380, 470];
        const colW = [180, 80, 80, 90, 100];

        doc.fontSize(8).font("Helvetica-Bold").fillColor("#fff");
        doc.roundedRect(40, tableTop - 4, 510, 16, 3).fill("#1e3a5f");
        doc.fillColor("#fff");
        doc.text("Nombre", colX[0] + 4, tableTop, { width: colW[0] });
        doc.text("Estado", colX[1] + 4, tableTop, { width: colW[1] });
        doc.text("Completado por", colX[2] + 4, tableTop, { width: colW[2] });
        doc.text("Fecha", colX[3] + 4, tableTop, { width: colW[3] });
        doc.text("Hora", colX[4] + 4, tableTop, { width: colW[4] });

        doc.moveDown(1.8);
        let rowY = doc.y;

        for (let i = 0; i < tareasList.length; i++) {
          const t = tareasList[i];
          const completador = t.usuario_completador
            ? `${t.usuario_completador.usuario_nombres || ""} ${t.usuario_completador.usuario_apellido_paterno || ""}`.trim()
            : "—";

          // Alternar color de fila
          if (i % 2 === 0) {
            doc.rect(40, rowY - 2, 510, 16).fill("#f8f9fa");
          }

          doc.fillColor("#000").fontSize(8).font("Helvetica");
          doc.text(t.tarea_titulo || "—", colX[0] + 4, rowY, { width: colW[0] });
          doc.text(t.tarea_estado || "—", colX[1] + 4, rowY, { width: colW[1] });
          doc.text(completador, colX[2] + 4, rowY, { width: colW[2] });
          doc.text(t.tarea_fecha_completado || "—", colX[3] + 4, rowY, { width: colW[3] });
          doc.text(t.tarea_hora_completado || "—", colX[4] + 4, rowY, { width: colW[4] });

          rowY += 16;
        }
        doc.y = rowY + 8;
      }

      // ─── EVIDENCIAS ───
      const eviList = evidencias || [];
      if (eviList.length > 0) {
        doc.addPage();
        doc.fontSize(10).font("Helvetica-Bold").fillColor("#000").text("Evidencias", { underline: true });
        doc.moveDown(0.5);

        for (const t of tareasList) {
          const evis = eviPorTarea[t.tarea_id] || [];
          if (evis.length === 0) continue;

          doc.fontSize(9).font("Helvetica-Bold").text(`Tarea: ${t.tarea_titulo}`);
          doc.moveDown(0.3);

          for (const ev of evis) {
            const imgUrl = ev.archivo_url;
            if (imgUrl) {
              try {
                doc.image(imgUrl, { fit: [200, 150], align: "center", valign: "center" });
                doc.moveDown(0.3);
              } catch {
                doc.fontSize(8).font("Helvetica").fillColor("#999")
                  .text(`[Imagen no disponible]`, { align: "center" });
                doc.moveDown(0.3);
              }
            }

            const desc = ev.comentario_cliente || ev.comentario_colaborador;
            if (desc) {
              doc.fontSize(8).font("Helvetica").fillColor("#555")
                .text(desc, { indent: 20 });
              doc.moveDown(0.2);
            }
          }
          doc.moveDown(0.5);
        }
      }

      // ─── COMENTARIOS ───
      const cmtList = comentarios || [];
      if (cmtList.length > 0) {
        doc.moveDown(0.5);
        doc.fontSize(10).font("Helvetica-Bold").fillColor("#000").text("Comentarios", { underline: true });
        doc.moveDown(0.3);

        for (const c of cmtList) {
          const autor = c.usuarios
            ? `${c.usuarios.usuario_nombres || ""} ${c.usuarios.usuario_apellido_paterno || ""}`.trim()
            : "—";
          doc.fontSize(9).font("Helvetica-Bold").fillColor("#333").text(`${autor}:`);
          doc.fontSize(8).font("Helvetica").fillColor("#555")
            .text(c.serviciocomentario_contenido || "—", { indent: 15 });
          if (c.serviciocomentario_fecha) {
            doc.fontSize(7).font("Helvetica").fillColor("#999")
              .text(`${c.serviciocomentario_fecha} ${c.serviciocomentario_hora || ""}`.trim(), { indent: 15 });
          }
          doc.moveDown(0.3);
        }
      }

      // ─── FOOTER ───
      doc.moveDown(1);
      doc.fontSize(7).font("Helvetica").fillColor("#aaa")
        .text(`— Este documento fue generado automáticamente por ServicioLocalSTS —`, { align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// -- Helper: mapea servicio de Supabase al formato ServicioLocalSTS --
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
    servicio_audio_cliente: s.servicio_audio_cliente || null,
    servicio_audio_diagnostico: s.servicio_audio_diagnostico || null,
    id_plantilla_inicial: s.id_plantilla_inicial || null,
    datos_completos: false, // no disponible en Supabase
    consultado_cliente: false, // no disponible en Supabase
    tiempo_estimado: s.servicio_tiempo_estimado,
    fecha_inicio: s.servicio_fecha_inicio,
    hora_inicio: s.servicio_hora_inicio,
    fecha_fin: s.servicio_fecha_fin,
    hora_fin: s.servicio_hora_fin,
    hora_creacion: s.servicio_hora_creacion,
    bloqueado_motivo: null, // no disponible en Supabase
    created_at: s.servicio_fecha_creacion,
    updated_at: null,
  };
}

