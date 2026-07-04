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

// Schema para actualización parcial — todos los campos son opcionales
const servicioUpdateSchema = z.object({
  titulo: z.string().min(1).optional(),
  descripcion: z.string().nullable().optional(),
  colaborador_edita_visibilidad: z.boolean().optional(),
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
    .select("tarea_id, tarea_orden, servicio_id, tarea_estado, tarea_requiere_evidencia")
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
    const query = request.query as { estado?: string; archivados?: string; incluir_archivados?: string };
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

    // Filtro de archivados:
    //   ?archivados=true      → solo archivados
    //   ?incluir_archivados=true → todos (archivados + activos)
    //   (ninguno)             → solo activos (default)
    if (query.archivados === "true") {
      dbQuery = dbQuery.not("archived_at", "is", null);
    } else if (query.incluir_archivados === "true") {
      // sin filtro — trae todo
    } else {
      dbQuery = dbQuery.is("archived_at", null);
    }

    if (query.estado) {
      dbQuery = dbQuery.eq("servicio_estado", query.estado);
    }

    const { data: rows } = await dbQuery
      .order("servicio_fecha_creacion", { ascending: true });

    // Batch: qué servicios tienen visitas de clientes
    const svcIds = (rows || []).map((s: any) => s.servicio_id).filter(Boolean);
    let visitados = new Set<number>();
    if (svcIds.length > 0) {
      const { data: visitas } = await supabase
        .from("serviciovisitas")
        .select("servicio_id")
        .in("servicio_id", svcIds);
      visitados = new Set((visitas || []).map((v: any) => v.servicio_id));
    }

    return {
      data: (rows || []).map((s: any) => ({
        ...mapServicio(s),
        consultado_cliente: visitados.has(s.servicio_id),
      })),
    };
  });

  // -- GET /api/servicios/archived (admin/sistema) — todos los archivados --
  app.get("/api/servicios/archived", { preHandler: [requireRoles("admin", "sistema")] }, async () => {
    const { data: rows } = await supabase
      .from("servicios")
      .select("*, usuario_colaborador:usuarios!tecnico_principal_id(usuario_nombres, usuario_apellido_paterno)")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false });

    const svcIds = (rows || []).map((s: any) => s.servicio_id).filter(Boolean);
    let visitados = new Set<number>();
    if (svcIds.length > 0) {
      const { data: visitas } = await supabase
        .from("serviciovisitas")
        .select("servicio_id")
        .in("servicio_id", svcIds);
      visitados = new Set((visitas || []).map((v: any) => v.servicio_id));
    }

    return {
      data: (rows || []).map((s: any) => ({
        ...mapServicio(s),
        consultado_cliente: visitados.has(s.servicio_id),
      })),
    };
  });

  // -- POST /api/servicios/:id/archive --
  app.post("/api/servicios/:id/archive", { preHandler: [requireRoles()] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const numId = parseInt(id, 10);
    const user = request.user as { user_id: number; rol: string; area_id: number | null };

    await verificarPermisoModificar(numId, user);

    const { error } = await supabase
      .from("servicios")
      .update({ archived_at: new Date().toISOString() })
      .eq("servicio_id", numId);

    if (error) throw new Error(`Error al archivar: ${error.message}`);

    await auditLog(null, user.user_id, "archivar", "servicio", numId, { action: "archive" });
    return reply.send({ data: { success: true } });
  });

  // -- POST /api/servicios/:id/unarchive (admin/sistema) --
  app.post("/api/servicios/:id/unarchive", { preHandler: [requireRoles("admin", "sistema")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const numId = parseInt(id, 10);

    const { error } = await supabase
      .from("servicios")
      .update({ archived_at: null })
      .eq("servicio_id", numId);

    if (error) throw new Error(`Error al desarchivar: ${error.message}`);

    await auditLog(null, (request.user as any).user_id, "desarchivar", "servicio", numId, { action: "unarchive" });
    return reply.send({ data: { success: true } });
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
    const input = servicioUpdateSchema.parse(request.body);

    await verificarPermisoModificar(parseInt(id), user);

    const updateData: Partial<Record<string, unknown>> = {};
    if (input.titulo !== undefined) updateData.servicio_nombre = input.titulo;
    if (input.descripcion !== undefined) updateData.servicio_descripcion = input.descripcion;
    if (input.colaborador_edita_visibilidad !== undefined) updateData.servicio_colaborador_edita_visibilidad = input.colaborador_edita_visibilidad;

    const { data: updatedServicios, error } = await supabase
      .from("servicios")
      .update(updateData as any)
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
  app.patch("/api/servicios/:id/estado", { preHandler: [requireRoles()] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { estado, motivo } = request.body as { estado: string; motivo?: string };
    const user = request.user as { user_id: number; rol: string; area_id: number | null };
    const validos = ["pendiente", "en_progreso", "completado", "cancelado", "bloqueado"];
    if (!validos.includes(estado)) throw new ValidationError("Estado inválido");
    if (estado === "bloqueado" && !motivo) throw new ValidationError("Se requiere motivo para bloquear");

    await verificarPermisoModificar(parseInt(id), user);

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

    // Almacenar motivo de bloqueo
    if (estado === "bloqueado" && motivo) {
      (updateData as any).servicio_bloqueado_motivo = motivo;
    }

    // Almacenar motivo de desbloqueo (vuelve a en_progreso desde bloqueado)
    if (estado === "en_progreso" && servicioActual.servicio_estado === "bloqueado" && motivo) {
      (updateData as any).servicio_desbloqueo_motivo = motivo;
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

    // RF-05: si la tarea requiere evidencia, verificar que exista al menos una
    if (tarea.tarea_requiere_evidencia) {
      const { count } = await supabase
        .from("evidencias")
        .select("*", { count: "exact", head: true })
        .eq("tarea_id", tareaId);

      if (!count || count === 0) {
        throw new ValidationError("Esta tarea requiere al menos una evidencia antes de completarse");
      }
    }

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

    // Enviar notificación push al cliente si hay suscripción
    try {
      const { data: svcData } = await supabase
        .from("servicios")
        .select("cliente_dni, servicio_nombre, servicio_codigo")
        .eq("servicio_id", t.servicio_id)
        .limit(1);
      const clienteDni = svcData?.[0]?.cliente_dni;
      if (clienteDni) {
        const { sendPushToDNI } = await import("@/modules/push/push.controller.js");
        const codigo = svcData[0].servicio_codigo || t.servicio_id;
        await sendPushToDNI(clienteDni, {
          title: "Tarea completada",
          body: `${svcData[0].servicio_nombre || "Servicio"}: "${t.tarea_titulo}" fue completada`,
          url: `/public/servicio/${codigo}`,
        });
      }
    } catch { /* push no crítico */ }

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
      // Validar que no se reordene una tarea completada
      const { data: taskData } = await supabase
        .from("tareas")
        .select("tarea_estado")
        .eq("tarea_id", item.id)
        .limit(1);

      if (taskData?.length && taskData[0].tarea_estado === "completado") {
        throw new ValidationError(`No se puede reordenar la tarea ${item.id}: ya está completada`);
      }

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

// -- Helper: detecta formato de imagen por magic bytes --
function detectImageFormat(buf: Uint8Array): "jpg" | "png" | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  return null;
}

// -- Helper: trunca texto al ancho disponible --
function truncate(text: string, font: any, size: number, maxW: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxW) return text;
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (font.widthOfTextAtSize(text.slice(0, mid) + "…", size) <= maxW) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, Math.max(lo, 1)) + "…";
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

  // 5. Pre-fetchear imágenes (bytes raw, pdf-lib incrusta sin decodificar)
  interface ImagenCargada {
    buffer: Uint8Array;
    tipo: "jpg" | "png";
  }
  const imgCache = new Map<string, ImagenCargada>();
  const todasEvis = evidencias || [];
  if (todasEvis.length > 0) {
    await Promise.all(
      todasEvis.map(async (ev) => {
        const url = ev.archivo_url;
        if (!url || imgCache.has(url)) return;
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const raw = new Uint8Array(await res.arrayBuffer());
          const tipo = detectImageFormat(raw);
          if (tipo === "jpg" || tipo === "png") {
            imgCache.set(url, { buffer: raw, tipo });
          }
        } catch { /* ignorar */ }
      })
    );
  }

  // 6. Generar PDF con pdf-lib (incrusta JPEG/PNG sin decodificar)
  const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.create();
  const pageW = 595, pageH = 842, mg = 45;
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const gray = rgb(0.45, 0.45, 0.45);
  const darkGray = rgb(0.3, 0.3, 0.3);
  const lightGray = rgb(0.65, 0.65, 0.65);
  const white = rgb(1, 1, 1);
  const black = rgb(0, 0, 0);
  const blue = rgb(0.10, 0.22, 0.55);
  const blueLight = rgb(0.12, 0.26, 0.62);
  const blueBg = rgb(0.93, 0.95, 0.98);
  const green = rgb(0.13, 0.58, 0.22);
  const greenLight = rgb(0.90, 0.97, 0.91);
  const orange = rgb(0.85, 0.55, 0.08);
  const orangeLight = rgb(0.98, 0.94, 0.88);
  const red = rgb(0.75, 0.18, 0.12);
  const redLight = rgb(0.97, 0.91, 0.90);
  const goldAccent = rgb(0.85, 0.68, 0.22);

  const colab = s.usuario_colaborador;
  const tecnicoNombre = colab
    ? `${colab.usuario_nombres || ""} ${colab.usuario_apellido_paterno || ""}`.trim()
    : "—";

  let page = pdfDoc.addPage([pageW, pageH]);
  let y = pageH - mg;
  let pageNum = 1;

  function addPageIfNeeded(needed: number) {
    if (y - needed < mg + 40) {
      drawPageFooter();
      page = pdfDoc.addPage([pageW, pageH]);
      pageNum++;
      y = pageH - mg;
      drawCompactHeader();
    }
  }

  function drawPageFooter() {
    const fY = 28;
    page.drawRectangle({ x: mg, y: fY + 12, width: pageW - 2 * mg, height: 0.5, color: rgb(0.85, 0.85, 0.85) });
    const pText = `Página ${pageNum}`;
    page.drawText(pText, {
      x: (pageW - font.widthOfTextAtSize(pText, 7)) / 2,
      y: fY,
      size: 7,
      font,
      color: lightGray,
    });
    page.drawText("ServicioLocal STS — Reporte Técnico", {
      x: mg,
      y: fY,
      size: 7,
      font,
      color: lightGray,
    });
    const genFooter = `Generado: ${new Date().toLocaleDateString("es-PE")}`;
    page.drawText(genFooter, {
      x: pageW - mg - font.widthOfTextAtSize(genFooter, 7),
      y: fY,
      size: 7,
      font,
      color: lightGray,
    });
  }

  function drawCompactHeader() {
    page.drawRectangle({ x: 0, y: y - 28, width: pageW, height: 28, color: blue });
    page.drawText("ServicioLocal STS", { x: mg, y: y - 19, size: 11, font: boldFont, color: white });
    const codStr = s.servicio_codigo || `SRV${s.servicio_id}`;
    page.drawText(`Continuación — ${codStr}`, {
      x: pageW - mg - font.widthOfTextAtSize(`Continuación — ${codStr}`, 8),
      y: y - 12,
      size: 8,
      font,
      color: rgb(0.8, 0.85, 1),
    });
    y -= 36;
  }

  function drawSectionTitle(title: string) {
    addPageIfNeeded(40);
    page.drawRectangle({ x: mg, y: y - 8, width: 4, height: 16, color: goldAccent });
    page.drawText(title, { x: mg + 14, y: y - 6, size: 12, font: boldFont, color: blueLight });
    y -= 22;
    page.drawRectangle({ x: mg, y: y, width: pageW - 2 * mg, height: 0.5, color: rgb(0.88, 0.88, 0.9) });
    y -= 10;
  }

  function drawInfoRow(label: string, value: string) {
    addPageIfNeeded(22);
    page.drawText(label, { x: mg + 4, y: y - 7, size: 9, font: boldFont, color: gray });
    page.drawText(value || "—", { x: mg + 85, y: y - 7, size: 9.5, font, color: black });
    y -= 18;
  }

  const codigoStr = s.servicio_codigo || `SRV${s.servicio_id}`;

  // ─── HEADER PRINCIPAL ───
  addPageIfNeeded(100);

  // Barra superior azul
  page.drawRectangle({ x: 0, y: y - 48, width: pageW, height: 48, color: blue });

  // Nombre empresa + subtítulo
  page.drawText("ServicioLocal STS", { x: mg, y: y - 33, size: 16, font: boldFont, color: white });
  page.drawText("Reporte Técnico — Interno", { x: mg, y: y - 16, size: 9, font, color: rgb(0.75, 0.82, 1) });

  // Fecha + código a la derecha
  const fechaGen = new Date().toLocaleDateString("es-PE", {
    year: "numeric", month: "long", day: "numeric"
  });
  page.drawText(fechaGen, {
    x: pageW - mg - font.widthOfTextAtSize(fechaGen, 9),
    y: y - 22,
    size: 9,
    font,
    color: rgb(0.8, 0.85, 1),
  });
  page.drawText(`N° ${codigoStr}`, {
    x: pageW - mg - font.widthOfTextAtSize(`N° ${codigoStr}`, 9),
    y: y - 36,
    size: 9,
    font: boldFont,
    color: rgb(0.85, 0.9, 1),
  });
  y -= 56;

  // Línea decorativa gold debajo del header
  page.drawRectangle({ x: 0, y: y, width: pageW, height: 3, color: goldAccent });
  y -= 12;

  // ─── ESTADO BADGE ───
  addPageIfNeeded(40);
  const estadoStr = s.servicio_estado || "—";
  let estadoColor: any, estadoBg: any;
  switch (s.servicio_estado) {
    case "completado": estadoColor = green; estadoBg = greenLight; break;
    case "en_progreso": estadoColor = blue; estadoBg = blueBg; break;
    case "pendiente": estadoColor = orange; estadoBg = orangeLight; break;
    case "bloqueado": estadoColor = red; estadoBg = redLight; break;
    default: estadoColor = gray; estadoBg = rgb(0.95, 0.95, 0.95); break;
  }
  const badgeLabel = estadoStr === "en_progreso" ? "EN PROGRESO" : estadoStr.toUpperCase();
  const badgeW = boldFont.widthOfTextAtSize(badgeLabel, 11) + 28;
  const badgeH = 26;
  // Sombra
  page.drawRectangle({
    x: (pageW - badgeW) / 2 + 1, y: y - badgeH - 1, width: badgeW, height: badgeH,
    color: rgb(0.88, 0.88, 0.9),
  });
  // Fondo badge
  page.drawRectangle({
    x: (pageW - badgeW) / 2, y: y - badgeH, width: badgeW, height: badgeH,
    color: estadoBg,
  });
  // Borde izquierdo coloreado
  page.drawRectangle({
    x: (pageW - badgeW) / 2, y: y - badgeH, width: 4, height: badgeH,
    color: estadoColor,
  });
  // Texto
  page.drawText(badgeLabel, {
    x: (pageW - boldFont.widthOfTextAtSize(badgeLabel, 11)) / 2 + 4,
    y: y - badgeH + 7,
    size: 11,
    font: boldFont,
    color: estadoColor,
  });
  y -= badgeH + 14;

  // ─── DATOS DEL SERVICIO ───
  drawSectionTitle("Datos del Servicio");

  const cardH = 142;
  addPageIfNeeded(cardH);
  page.drawRectangle({ x: mg, y: y - cardH, width: pageW - 2 * mg, height: cardH, color: rgb(0.985, 0.985, 0.99) });
  const cardY = y;
  y -= 8;

  drawInfoRow("Código:", codigoStr);
  drawInfoRow("Servicio:", s.servicio_nombre || "—");
  drawInfoRow("Cliente:", [s.cliente_nombres, s.cliente_apellido_paterno, s.cliente_apellido_materno].filter(Boolean).join(" ") || "—");
  drawInfoRow("DNI:", s.cliente_dni || "—");
  drawInfoRow("Teléfono:", s.cliente_telefono || "—");
  drawInfoRow("Área:", s.areas?.area_nombre || "—");
  drawInfoRow("Técnico:", tecnicoNombre);
  drawInfoRow("Creado:", [s.servicio_fecha_creacion, s.servicio_hora_creacion].filter(Boolean).join(" ") || "—");

  y = cardY - cardH - 6;

  // ─── SITUACIÓN INICIAL DEL CLIENTE ───
  if (s.servicio_cliente_reporte) {
    drawSectionTitle("Situación Inicial del Cliente");
    const txt = s.servicio_cliente_reporte;
    addPageIfNeeded(40);
    page.drawRectangle({ x: mg, y: y - 26, width: pageW - 2 * mg, height: 26, color: rgb(0.985, 0.985, 0.99) });
    const lineH = 13;
    let remain = txt;
    let lineY = y - 10;
    while (remain.length > 0 && lineY > y - 26) {
      const chunk = remain.substring(0, Math.floor((pageW - 2 * mg - 12) / (font.widthOfTextAtSize("A", 9) * 1.05)));
      page.drawText(chunk, { x: mg + 6, y: lineY, size: 9, font, color: black });
      remain = remain.substring(chunk.length);
      lineY -= lineH;
    }
    y = (y - 26) - 8;
  }

  // ─── DIAGNÓSTICO TÉCNICO ───
  if (s.servicio_diagnostico_inicial) {
    drawSectionTitle("Diagnóstico Técnico");
    const txt = s.servicio_diagnostico_inicial;
    addPageIfNeeded(40);
    page.drawRectangle({ x: mg, y: y - 26, width: pageW - 2 * mg, height: 26, color: rgb(0.985, 0.985, 0.99) });
    const lineH = 13;
    let remain = txt;
    let lineY = y - 10;
    while (remain.length > 0 && lineY > y - 26) {
      const chunk = remain.substring(0, Math.floor((pageW - 2 * mg - 12) / (font.widthOfTextAtSize("A", 9) * 1.05)));
      page.drawText(chunk, { x: mg + 6, y: lineY, size: 9, font, color: black });
      remain = remain.substring(chunk.length);
      lineY -= lineH;
    }
    y = (y - 26) - 8;
  }

  // ─── TAREAS ───
  const tareasList = tareas || [];
  drawSectionTitle("Tareas");

  if (tareasList.length === 0) {
    addPageIfNeeded(30);
    page.drawRectangle({ x: mg, y: y - 50, width: pageW - 2 * mg, height: 50, color: rgb(0.98, 0.98, 0.98) });
    page.drawText("No hay tareas registradas para este servicio.", {
      x: (pageW - font.widthOfTextAtSize("No hay tareas registradas para este servicio.", 10)) / 2,
      y: y - 30,
      size: 10,
      font,
      color: lightGray,
    });
    y -= 58;
  } else {
    // Columnas: tarea, estado, completado por, fecha, hora, tiempo
    const tableMg = mg + 4;
    const tableW = pageW - 2 * tableMg;
    const colX = [
      tableMg,                     // tarea (0%)
      tableMg + tableW * 0.34,     // estado (34%)
      tableMg + tableW * 0.48,     // completado por (48%)
      tableMg + tableW * 0.63,     // fecha (63%)
      tableMg + tableW * 0.75,     // hora (75%)
      tableMg + tableW * 0.88,     // tiempo (88%)
    ];
    const rowH = 18;
    const headerH = 22;

    addPageIfNeeded(headerH + tareasList.length * rowH + 10);

    // Header de tabla
    page.drawRectangle({ x: tableMg, y: y - headerH, width: tableW, height: headerH, color: blue });
    page.drawText("Tarea", { x: colX[0] + 8, y: y - headerH + 6, size: 8, font: boldFont, color: white });
    page.drawText("Estado", { x: colX[1] + 6, y: y - headerH + 6, size: 8, font: boldFont, color: white });
    page.drawText("Completado por", { x: colX[2] + 6, y: y - headerH + 6, size: 8, font: boldFont, color: white });
    page.drawText("Fecha", { x: colX[3] + 6, y: y - headerH + 6, size: 8, font: boldFont, color: white });
    page.drawText("Hora", { x: colX[4] + 6, y: y - headerH + 6, size: 8, font: boldFont, color: white });
    page.drawText("Tiempo", { x: colX[5] + 6, y: y - headerH + 6, size: 8, font: boldFont, color: white });
    y -= headerH + 2;

    for (let i = 0; i < tareasList.length; i++) {
      const t = tareasList[i];
      addPageIfNeeded(rowH + 2);

      // Fila alternada
      if (i % 2 === 0) {
        page.drawRectangle({ x: tableMg, y: y - rowH, width: tableW, height: rowH, color: rgb(0.975, 0.975, 0.98) });
      }
      // Línea separadora inferior
      page.drawRectangle({ x: tableMg, y: y - rowH, width: tableW, height: 0.3, color: rgb(0.92, 0.92, 0.94) });

      // Nombre de tarea (truncado)
      const nombre = t.tarea_titulo || "—";
      const maxTW = colX[1] - colX[0] - 16;
      let nombreDisplay = nombre;
      if (font.widthOfTextAtSize(nombre, 8) > maxTW) {
        while (font.widthOfTextAtSize(nombreDisplay + "...", 8) > maxTW && nombreDisplay.length > 3) {
          nombreDisplay = nombreDisplay.slice(0, -1);
        }
        nombreDisplay += "...";
      }
      page.drawText(nombreDisplay, { x: colX[0] + 6, y: y - rowH + 5, size: 8, font, color: black });

      // Estado con badge pequeño
      const tEstado = t.tarea_estado || "pendiente";
      let tEstadoColor: any, tEstadoBg: any, estadoTxt: string;
      switch (tEstado) {
        case "completado":
          tEstadoColor = green; tEstadoBg = greenLight;
          estadoTxt = "Completado";
          break;
        case "en_progreso":
          tEstadoColor = blue; tEstadoBg = blueBg;
          estadoTxt = "En Progreso";
          break;
        default:
          tEstadoColor = gray; tEstadoBg = rgb(0.95, 0.95, 0.95);
          estadoTxt = "Pendiente";
          break;
      }
      const estW = boldFont.widthOfTextAtSize(estadoTxt, 7) + 12;
      const maxEstW = colX[2] - colX[1] - 8;
      const finalEstW = Math.min(estW, maxEstW);
      page.drawRectangle({ x: colX[1] + 4, y: y - rowH + 3, width: finalEstW, height: 13, color: tEstadoBg });
      page.drawText(estadoTxt, {
        x: colX[1] + 4 + (finalEstW - boldFont.widthOfTextAtSize(estadoTxt, 7)) / 2,
        y: y - rowH + 5,
        size: 7,
        font: boldFont,
        color: tEstadoColor,
      });

      // Completado por
      const c = t.usuario_completador
        ? `${t.usuario_completador.usuario_nombres || ""} ${t.usuario_completador.usuario_apellido_paterno || ""}`.trim()
        : "—";
      page.drawText(truncate(c, font, 7, colX[3] - colX[2] - 14), { x: colX[2] + 6, y: y - rowH + 5, size: 7, font, color: darkGray });

      // Fecha
      const fechaTxt = t.tarea_fecha_completado || "—";
      page.drawText(fechaTxt, { x: colX[3] + 6, y: y - rowH + 5, size: 7, font, color: darkGray });

      // Hora
      const horaTxt = t.tarea_hora_completado || "—";
      page.drawText(horaTxt, { x: colX[4] + 6, y: y - rowH + 5, size: 7, font, color: darkGray });

      // Tiempo (diferencia con la tarea anterior o con inicio del servicio)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function parseFechaHora(fecha: any, hora: any): Date | null {
        if (!fecha || !hora) return null;
        const d = new Date(`${fecha}T${hora}`);
        return isNaN(d.getTime()) ? null : d;
      }
      function formatDiff(minutos: number): string {
        if (minutos < 1) return "< 1m";
        if (minutos < 60) return `${minutos}m`;
        const h = Math.floor(minutos / 60);
        const m = minutos % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
      }

      let tiempoTxt = "—";
      const currFecha = parseFechaHora(t.tarea_fecha_completado, t.tarea_hora_completado);
      if (currFecha) {
        if (i === 0) {
          // Primera tarea: comparar con inicio del servicio
          const inicioFecha = parseFechaHora(s.servicio_fecha_inicio, s.servicio_hora_inicio);
          if (inicioFecha && currFecha.getTime() > inicioFecha.getTime()) {
            tiempoTxt = formatDiff(Math.floor((currFecha.getTime() - inicioFecha.getTime()) / 60000));
          }
        } else {
          // Siguientes tareas: comparar con la anterior
          const prev = tareasList[i - 1];
          const prevFecha = parseFechaHora(prev.tarea_fecha_completado, prev.tarea_hora_completado);
          if (prevFecha && currFecha.getTime() > prevFecha.getTime()) {
            tiempoTxt = formatDiff(Math.floor((currFecha.getTime() - prevFecha.getTime()) / 60000));
          }
        }
      }
      page.drawText(tiempoTxt, { x: colX[5] + 6, y: y - rowH + 5, size: 7, font, color: darkGray });

      y -= rowH;
    }
    y -= 8;
  }

  // ─── EVIDENCIAS ───
  const eviList = evidencias || [];
  if (eviList.length > 0) {
    drawSectionTitle("Evidencias");

    for (const t of tareasList) {
      const evis = eviPorTarea[t.tarea_id] || [];
      if (evis.length === 0) continue;

      addPageIfNeeded(20);
      page.drawText(`Tarea: ${t.tarea_titulo}`, { x: mg + 4, y: y - 8, size: 9, font: boldFont, color: blueLight });
      y -= 14;

      for (let ei = 0; ei < evis.length; ei++) {
        const ev = evis[ei];
        const desc = ev.comentario_cliente || ev.comentario_colaborador;
        const hasImg = imgCache.has(ev.archivo_url);

        // Calcular espacio necesario para esta evidencia
        const infoH = desc ? 20 : 2;
        const imgH = hasImg ? 270 : 0;
        const totalEvH = 28 + imgH + infoH;

        // Reserve space — page break if needed
        addPageIfNeeded(totalEvH);

        // Fondo alternado (todo el bloque)
        if (ei % 2 === 0) {
          page.drawRectangle({ x: mg, y: y - totalEvH, width: pageW - 2 * mg, height: totalEvH, color: rgb(0.975, 0.975, 0.98) });
        }
        page.drawRectangle({ x: mg, y: y - totalEvH, width: pageW - 2 * mg, height: 0.3, color: rgb(0.92, 0.92, 0.94) });

        // Estado badge + fecha (top)
        let evEstadoLabel: string, evEstadoColor: any, evEstadoBg: any;
        switch (ev.estado) {
          case "aprobado":
            evEstadoLabel = "Aprobado"; evEstadoColor = green; evEstadoBg = greenLight; break;
          case "pendiente":
            evEstadoLabel = "Pendiente"; evEstadoColor = orange; evEstadoBg = orangeLight; break;
          case "reemplazado":
            evEstadoLabel = "Reemplazado"; evEstadoColor = gray; evEstadoBg = rgb(0.92, 0.92, 0.94); break;
          default:
            evEstadoLabel = ev.estado || "—"; evEstadoColor = gray; evEstadoBg = rgb(0.95, 0.95, 0.95); break;
        }
        const evEstW = boldFont.widthOfTextAtSize(evEstadoLabel, 7.5) + 10;
        page.drawRectangle({ x: mg + 6, y: y - totalEvH + 3, width: evEstW, height: 14, color: evEstadoBg });
        page.drawText(evEstadoLabel, {
          x: mg + 6 + (evEstW - boldFont.widthOfTextAtSize(evEstadoLabel, 7.5)) / 2,
          y: y - totalEvH + 5,
          size: 7.5,
          font: boldFont,
          color: evEstadoColor,
        });

        // Fecha a la derecha del badge
        const evFecha = ev.submitted_at || ev.created_at;
        if (evFecha) {
          const f = new Date(evFecha);
          const fStr = `${f.toLocaleDateString("es-PE")} ${f.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
          page.drawText(fStr, { x: mg + evEstW + 16, y: y - totalEvH + 6, size: 7, font, color: gray });
        }

        // Imagen (centro)
        if (hasImg) {
          const img = imgCache.get(ev.archivo_url)!;
          try {
            let pdfImg;
            if (img.tipo === "jpg") {
              pdfImg = await pdfDoc.embedJpg(img.buffer);
            } else {
              pdfImg = await pdfDoc.embedPng(img.buffer);
            }
            const maxW = pageW - 2 * mg - 16;
            const maxH = 260;
            const scale = Math.min(maxW / pdfImg.width, maxH / pdfImg.height, 1);
            const dw = pdfImg.width * scale;
            const dh = pdfImg.height * scale;
            const imgY = y - totalEvH + 20;
            page.drawImage(pdfImg, {
              x: (pageW - dw) / 2,
              y: imgY,
              width: dw,
              height: dh,
            });
          } catch {
            page.drawText("[Imagen no disponible]", { x: mg + 6, y: y - totalEvH + 80, size: 8, font, color: lightGray });
          }
        }

        // Descripción (abajo)
        if (desc) {
          const descY = y - totalEvH + 24 + imgH + 2;
          page.drawText(truncate(desc, font, 8, pageW - 2 * mg - 14), { x: mg + 6, y: descY, size: 8, font, color: darkGray });
        }

        y -= totalEvH + 2;
      }
    }
  }

  // ─── COMENTARIOS ───
  const cmtList = comentarios || [];
  if (cmtList.length > 0) {
    drawSectionTitle("Comentarios");

    for (const c of cmtList) {
      const autor = c.usuarios
        ? `${c.usuarios.usuario_nombres || ""} ${c.usuarios.usuario_apellido_paterno || ""}`.trim()
        : "—";
      addPageIfNeeded(30);
      // Fondo ligero
      page.drawRectangle({ x: mg, y: y - 26, width: pageW - 2 * mg, height: 26, color: rgb(0.985, 0.985, 0.99) });
      page.drawText(`${autor}:`, { x: mg + 6, y: y - 10, size: 9, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
      const txt = c.serviciocomentario_contenido || "—";
      page.drawText(truncate(txt, font, 8, pageW - 2 * mg - 18), { x: mg + 6, y: y - 22, size: 8, font, color: darkGray });
      if (c.serviciocomentario_fecha) {
        page.drawText(`${c.serviciocomentario_fecha} ${c.serviciocomentario_hora || ""}`.trim(), { x: pageW - mg - 6 - font.widthOfTextAtSize(`${c.serviciocomentario_fecha} ${c.serviciocomentario_hora || ""}`.trim(), 7), y: y - 10, size: 7, font, color: lightGray });
      }
      y -= 30;
    }
  }

  // ─── FOOTER FINAL ───
  drawPageFooter();
  y -= 4;

  // Espacio después del footer
  const finalFooterY = 16;
  page.drawRectangle({ x: 0, y: 0, width: pageW, height: finalFooterY + 8, color: blue });
  page.drawText("ServicioLocal STS — Tecnología al servicio de tu hogar", {
    x: (pageW - font.widthOfTextAtSize("ServicioLocal STS — Tecnología al servicio de tu hogar", 7)) / 2,
    y: finalFooterY + 2,
    size: 7,
    font,
    color: rgb(0.75, 0.82, 1),
  });

  // ─── FINALIZAR ───
  const pdfBytes = await pdfDoc.save();
  const q = request.query as { download?: string };
  const disposition = q.download === "true" ? "attachment" : "inline";
  reply.header("Content-Type", "application/pdf");
  reply.header("Content-Disposition", `${disposition}; filename="reporte-tecnico-${codigoStr}.pdf"`);
  reply.send(Buffer.from(pdfBytes));
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
    cliente_nombre: [s.cliente_nombres, s.cliente_apellido_paterno, s.cliente_apellido_materno].filter(Boolean).join(" ") || null,
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
    datos_completos: !!(s.servicio_nombre && (s.cliente_nombres || s.cliente_dni) && (s.servicio_descripcion || s.servicio_cliente_reporte || s.servicio_diagnostico_inicial)),
    consultado_cliente: false, // se calcula en listServicios batch
    colaborador_edita_visibilidad: s.servicio_colaborador_edita_visibilidad ?? false,
    tiempo_estimado: s.servicio_tiempo_estimado,
    fecha_inicio: s.servicio_fecha_inicio,
    hora_inicio: s.servicio_hora_inicio,
    fecha_fin: s.servicio_fecha_fin,
    hora_fin: s.servicio_hora_fin,
    hora_creacion: s.servicio_hora_creacion,
    bloqueado_motivo: s.servicio_bloqueado_motivo || null,
    desbloqueo_motivo: s.servicio_desbloqueo_motivo || null,
    archived_at: s.archived_at || null,
    created_at: s.servicio_fecha_creacion,
    updated_at: null,
  };
}

