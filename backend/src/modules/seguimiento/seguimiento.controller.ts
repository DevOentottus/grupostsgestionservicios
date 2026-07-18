import { FastifyInstance } from "fastify";
import { supabase } from "@/lib/supabase.js";
import { NotFoundError, ValidationError, ForbiddenError } from "@/core/errors/index.js";
import { requireRoles } from "@/core/middleware/auth.js";
import { auditLog } from "@/core/utils/index.js";
import { z } from "zod";

export async function seguimientoController(app: FastifyInstance) {
  // NOTA: No usar app.addHook + route-level preHandler combinados en serverless/emit (causa timeout).
  // autenticación por ruta.

  // ----------------------------------
  // ENCUESTAS (usando calificaciones en Supabase)
  // ----------------------------------

  const encuestaSchema = z.object({
    calificacion: z.number().int().min(1).max(5).optional(),
    comentario: z.string().optional(),
    sugerencia: z.string().optional(),
    satisfaccion_visibilidad: z.number().int().min(1).max(5).optional(),
    nps_score: z.number().int().min(1).max(10).optional(),
    nps_razon: z.string().optional(),
  });

  // POST /api/servicios/:id/encuesta
  app.post("/api/servicios/:id/encuesta", { preHandler: [requireRoles()] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = encuestaSchema.parse(request.body);

    const now = new Date();

    // Obtener cliente del servicio (cliente_id es NOT NULL en calificaciones)
    const { data: svcCliente } = await supabase
      .from("servicios")
      .select("cliente_id")
      .eq("servicio_id", parseInt(id))
      .single();
    if (!svcCliente?.cliente_id) throw new NotFoundError("Servicio no encontrado");

    // Verificar si ya existe una calificación para este servicio
    const { data: existing } = await supabase
      .from("calificaciones")
      .select("calificacion_id")
      .eq("servicio_id", parseInt(id))
      .limit(1);

    let califs;
    if (existing?.length) {
      // UPDATE: solo modificar los campos enviados
      const updates: any = {};
      if (input.calificacion != null) updates.calificacion_puntaje = input.calificacion;
      if (input.comentario != null) updates.calificacion_comentario = input.comentario || null;
      if (input.sugerencia != null) updates.calificacion_sugerencia = input.sugerencia || null;
      if (input.satisfaccion_visibilidad != null) updates.calificacion_observacion = String(input.satisfaccion_visibilidad);
      if (input.nps_score != null) updates.nps_score = input.nps_score;
      if (input.nps_razon != null) updates.nps_razon = input.nps_razon || null;
      if (Object.keys(updates).length === 0) throw new ValidationError("No hay campos para actualizar");

      const { data: updated } = await supabase
        .from("calificaciones")
        .update(updates as any)
        .eq("calificacion_id", existing[0].calificacion_id)
        .select();
      califs = updated;
    } else {
      // INSERT
      const { data: inserted } = await supabase
        .from("calificaciones")
        .insert({
          servicio_id: parseInt(id),
          cliente_id: svcCliente.cliente_id,
          calificacion_puntaje: input.calificacion ?? 1,
          calificacion_comentario: input.comentario || null,
          calificacion_sugerencia: input.sugerencia || null,
          calificacion_observacion: input.satisfaccion_visibilidad ? String(input.satisfaccion_visibilidad) : null,
          nps_score: input.nps_score ?? null,
          nps_razon: input.nps_razon || null,
          calificacion_fecha: now.toISOString().split("T")[0],
          calificacion_hora: now.toTimeString().split(" ")[0],
        })
        .select();
      califs = inserted;
    }

    const encuesta = califs?.[0];
    return reply.status(201).send({
      data: encuesta
        ? {
            id: encuesta.calificacion_id,
            servicio_id: encuesta.servicio_id,
            calificacion: encuesta.calificacion_puntaje,
            comentario: encuesta.calificacion_comentario,
            sugerencia: encuesta.calificacion_sugerencia,
            satisfaccion_visibilidad: encuesta.calificacion_observacion ? parseInt(encuesta.calificacion_observacion) : null,
            nps_score: encuesta.nps_score,
            nps_razon: encuesta.nps_razon,
            created_at: encuesta.calificacion_fecha,
          }
        : null,
    });
  });

  // GET /api/servicios/:id/encuesta
  app.get("/api/servicios/:id/encuesta", { preHandler: [requireRoles()] }, async (request) => {
    const { id } = request.params as { id: string };
    const { data: califs } = await supabase
      .from("calificaciones")
      .select("*")
      .eq("servicio_id", parseInt(id))
      .limit(1);

    const e = califs?.[0];
    return {
      data: e
        ? {
            id: e.calificacion_id,
            servicio_id: e.servicio_id,
            calificacion: e.calificacion_puntaje,
            comentario: e.calificacion_comentario,
            sugerencia: e.calificacion_sugerencia,
            satisfaccion_visibilidad: e.calificacion_observacion ? parseInt(e.calificacion_observacion) : null,
            nps_score: e.nps_score,
            nps_razon: e.nps_razon,
            created_at: e.calificacion_fecha,
          }
        : null,
    };
  });

  // ----------------------------------
  // PORTAL CLIENTE
  // ----------------------------------

  // GET /api/public/servicios/:codigo
  app.get("/api/public/servicios/:codigo", async (request, reply) => {
    const { codigo } = request.params as { codigo: string };

    // Registrar visita de cliente
    try {
      const { data: svc } = await supabase
        .from("servicios")
        .select("servicio_id")
        .eq("servicio_codigo", codigo)
        .limit(1);
      if (svc?.[0]) {
        await supabase.from("serviciovisitas").insert({
          servicio_id: svc[0].servicio_id,
          serviciovisita_fecha: new Date().toISOString().split("T")[0],
          serviciovisita_hora: new Date().toTimeString().split(" ")[0],
          serviciovisita_ip: (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || request.ip,
          serviciovisita_user_agent: (request.headers["user-agent"] as string) || null,
        });
      }
    } catch {
      // No bloquear la respuesta si falla el tracking
    }

    const { data: servicios } = await supabase
      .from("servicios")
      .select("*, clientes!servicios_cliente_id_fkey(cliente_nombres, cliente_correo)")
      .eq("servicio_codigo", codigo)
      .limit(1);

    type ServicioConCliente = NonNullable<typeof servicios>[number] & { cliente_correo?: string | null };
    const servicio = servicios?.[0] as ServicioConCliente | undefined;
    if (!servicio) throw new NotFoundError("Servicio no encontrado");

    const { data: tareasList } = await supabase
      .from("tareas")
      .select("*")
      .eq("servicio_id", servicio.servicio_id)
      .order("tarea_orden", { ascending: true });

    const totalTareas = tareasList?.length || 0;
    const completadasCount = tareasList?.filter((t: any) => t.tarea_estado === "completado").length || 0;
    const progresoPorcentaje = totalTareas > 0 ? Math.round((completadasCount / totalTareas) * 100) : 0;

    let tiempoTranscurrido = 0;
    if (servicio.servicio_fecha_inicio) {
      tiempoTranscurrido = Math.floor(
        (Date.now() - new Date(servicio.servicio_fecha_inicio).getTime()) / 60000
      );
    }

    // Encuesta
    const { data: califs } = await supabase
      .from("calificaciones")
      .select("*")
      .eq("servicio_id", servicio.servicio_id)
      .limit(1);

    // Área
    let areaNombre = null;
    if (servicio.area_id) {
      const { data: areas } = await supabase
        .from("areas")
        .select("area_nombre")
        .eq("area_id", servicio.area_id)
        .limit(1);
      areaNombre = areas?.[0]?.area_nombre || null;
    }

    // Colaborador (técnico asignado)
    let colaboradorNombre = null;
    if (servicio.tecnico_principal_id) {
      const { data: colab } = await supabase
        .from("usuarios")
        .select("usuario_nombres, usuario_apellido_paterno")
        .eq("usuario_id", servicio.tecnico_principal_id)
        .limit(1);
      if (colab?.[0]) {
        colaboradorNombre = `${colab[0].usuario_nombres || ""} ${colab[0].usuario_apellido_paterno || ""}`.trim();
      }
    }

    // Cliente — usar campos denormalizados de servicios, fallback a tabla clientes
    const clienteNombre = [servicio.cliente_nombres, servicio.cliente_apellido_paterno, servicio.cliente_apellido_materno].filter(Boolean).join(" ")
      || servicio.clientes?.cliente_nombres
      || null;
    const clienteEmail = servicio.cliente_correo || servicio.clientes?.cliente_correo || null;

    const tareas = (tareasList || []).map((t) => {
      let completadaAt: string | null = null;
      if (t.tarea_fecha_completado) {
        const datePart = t.tarea_fecha_completado;
        const timePart = t.tarea_hora_completado || "00:00:00";
        completadaAt = `${datePart}T${timePart}`;
      }
      return {
        id: t.tarea_id,
        titulo: t.tarea_titulo,
        orden: t.tarea_orden,
        estado: t.tarea_estado,
        completada: t.tarea_estado === "completado",
        completada_at: completadaAt,
        tiempo_estimado: t.tarea_tiempo_real || null,
      };
    });

    return {
      data: {
        servicio: {
          id: servicio.servicio_id,
          codigo: servicio.servicio_codigo,
          titulo: servicio.servicio_nombre,
          descripcion: servicio.servicio_descripcion,
          estado: servicio.servicio_estado,
          prioridad: "media",
          cliente_nombre: clienteNombre,
          cliente_email: clienteEmail,
          area_id: servicio.area_id,
          area_nombre: areaNombre,
          colaborador_id: servicio.tecnico_principal_id,
          colaborador_nombre: colaboradorNombre,
          tiempo_estimado: servicio.servicio_tiempo_estimado,
          fecha_inicio: servicio.servicio_fecha_inicio,
          created_at: servicio.servicio_fecha_creacion,
        },
        tareas,
        progreso: {
          total: totalTareas,
          completadas: completadasCount,
          porcentaje: progresoPorcentaje,
        },
        tiempo_transcurrido_minutos: tiempoTranscurrido,
        encuesta: califs?.[0]
          ? {
              id: califs[0].calificacion_id,
              calificacion: califs[0].calificacion_puntaje,
              comentario: califs[0].calificacion_comentario,
              sugerencia: califs[0].calificacion_sugerencia,
              satisfaccion_visibilidad: califs[0].calificacion_observacion ? parseInt(califs[0].calificacion_observacion) : null,
              nps_score: califs[0].nps_score,
              nps_razon: califs[0].nps_razon,
            }
          : null,
      },
    };
  });

  // POST /api/public/servicios/:codigo/encuesta — sin JWT, público con validación de DNI
  app.post("/api/public/servicios/:codigo/encuesta", async (request, reply) => {
    const { codigo } = request.params as { codigo: string };
    const input: any = request.body || {};
    const dni = input.dni;

    if (!dni) {
      return reply.status(400).send({ detail: "DNI es obligatorio" });
    }

    // Buscar servicio por código
    const { data: servicios } = await supabase
      .from("servicios")
      .select("servicio_id, cliente_id, cliente_dni")
      .eq("servicio_codigo", codigo)
      .limit(1);
    if (!servicios?.length) throw new NotFoundError("Servicio no encontrado");

    const s = servicios[0];
    const servicioId = s.servicio_id;

    // Validar DNI: puede venir de clientes (FK) o del campo desnormalizado en servicios
    let clienteIdParaInsert = s.cliente_id;
    let dniValido = false;

    if (s.cliente_id) {
      const { data: clientes } = await supabase
        .from("clientes")
        .select("cliente_dni")
        .eq("cliente_id", s.cliente_id)
        .limit(1);
      const clienteDniActual = clientes?.[0]?.cliente_dni;

      if (!clienteDniActual) {
        // El cliente existe pero no tiene DNI registrado → aceptar cualquier DNI
        // y actualizar el registro con el DNI que el cliente declara
        dniValido = true;
        clienteIdParaInsert = s.cliente_id;
        await supabase
          .from("clientes")
          .update({ cliente_dni: dni })
          .eq("cliente_id", s.cliente_id);
      } else if (clienteDniActual === dni) {
        dniValido = true;
      }
    }

    // Fallback: validar contra el campo desnormalizado servicios.cliente_dni
    if (!dniValido && s.cliente_dni && s.cliente_dni === dni) {
      dniValido = true;
      // Buscar si existe un cliente con ese DNI en la tabla clientes
      const { data: found } = await supabase
        .from("clientes")
        .select("cliente_id")
        .eq("cliente_dni", dni)
        .limit(1);
      if (found?.[0]) {
        clienteIdParaInsert = found[0].cliente_id;
      } else {
        // Crear cliente mínimo con el DNI
        const { data: created } = await supabase
          .from("clientes")
          .insert({ cliente_dni: dni, cliente_nombres: dni })
          .select("cliente_id")
          .limit(1);
        if (created?.[0]) clienteIdParaInsert = created[0].cliente_id;
      }
    }

    if (!dniValido) {
      throw new ForbiddenError("DNI incorrecto");
    }
    const now = new Date();

    // Validar body con Zod schema
    const payload = encuestaSchema.parse(input);

    // Verificar si ya existe una calificación
    const { data: existing } = await supabase
      .from("calificaciones")
      .select("calificacion_id")
      .eq("servicio_id", servicioId)
      .limit(1);

    let califs;
    if (existing?.length) {
      // UPDATE: solo modificar los campos enviados
      const updates: Record<string, unknown> = {};
      if (payload.calificacion != null) updates.calificacion_puntaje = payload.calificacion;
      if (payload.comentario != null) updates.calificacion_comentario = payload.comentario || null;
      if (payload.sugerencia != null) updates.calificacion_sugerencia = payload.sugerencia || null;
      if (payload.satisfaccion_visibilidad != null) updates.calificacion_observacion = String(payload.satisfaccion_visibilidad);
      if (payload.nps_score != null) updates.nps_score = payload.nps_score;
      if (payload.nps_razon != null) updates.nps_razon = payload.nps_razon || null;
      if (Object.keys(updates).length === 0) throw new ValidationError("No hay campos para actualizar");

      const { data: updated } = await supabase
        .from("calificaciones")
        .update(updates as any)
        .eq("calificacion_id", existing[0].calificacion_id)
        .select();
      califs = updated;
    } else {
      // INSERT
      const { data: inserted } = await supabase
        .from("calificaciones")
        .insert({
          servicio_id: servicioId,
          cliente_id: clienteIdParaInsert!,
          calificacion_puntaje: payload.calificacion ?? 1,
          calificacion_comentario: payload.comentario || null,
          calificacion_sugerencia: payload.sugerencia || null,
          calificacion_observacion: payload.satisfaccion_visibilidad ? String(payload.satisfaccion_visibilidad) : null,
          nps_score: payload.nps_score ?? null,
          nps_razon: payload.nps_razon || null,
          calificacion_fecha: now.toISOString().split("T")[0],
          calificacion_hora: now.toTimeString().split(" ")[0],
        })
        .select();
      califs = inserted;
    }

    const encuesta = califs?.[0];
    return reply.status(201).send({
      data: encuesta
        ? {
            id: encuesta.calificacion_id,
            servicio_id: encuesta.servicio_id,
            calificacion: encuesta.calificacion_puntaje,
            comentario: encuesta.calificacion_comentario,
            sugerencia: encuesta.calificacion_sugerencia,
            satisfaccion_visibilidad: encuesta.calificacion_observacion ? parseInt(encuesta.calificacion_observacion) : null,
            nps_score: encuesta.nps_score,
            nps_razon: encuesta.nps_razon,
            created_at: encuesta.calificacion_fecha,
          }
        : null,
    });
  });

  // ----------------------------------
  // DASHBOARD / KPI
  // ----------------------------------

  app.get("/api/dashboard", { preHandler: [requireRoles()] }, async (request) => {
    const query = request.query as {
      desde?: string;
      hasta?: string;
      fecha_inicio?: string;
      fecha_fin?: string;
      area_id?: string;
      usuario_id?: string;
      comparar_periodo?: string;
      comparar_fecha_inicio?: string;
      comparar_fecha_fin?: string;
    };

    const desde = query.fecha_inicio || query.desde || null;
    const hasta = query.fecha_fin || query.hasta || null;
    const areaId = query.area_id ? parseInt(query.area_id) : null;
    const usuarioId = query.usuario_id ? parseInt(query.usuario_id) : null;
    const compararPeriodo = query.comparar_periodo === "true";

    const fechaInicio = desde ? new Date(desde) : null;
    const fechaFin = hasta ? new Date(hasta) : null;

    // Construir filtros
    const applyDateFilter = (q: any, field: string) => {
      if (fechaInicio) q = q.gte(field, fechaInicio.toISOString().split("T")[0]);
      if (fechaFin) q = q.lte(field, fechaFin.toISOString().split("T")[0]);
      return q;
    };

    const applyAreaFilter = (q: any, areaField: string) => {
      if (areaId) q = q.eq(areaField, areaId);
      return q;
    };

    // -- Servicios del período: incluir servicios con tareas completadas en el período --
    // Primero obtenemos tareas completadas en el período, luego sus servicios
    let allServicios: any[] = [];

    // Buscar servicios por fecha de creación (enfoque original)
    let svcQuery = supabase.from("servicios").select("servicio_id, servicio_estado, servicio_tiempo_estimado, servicio_fecha_inicio, servicio_fecha_creacion, area_id, servicio_cliente_reporte, servicio_diagnostico_inicial");
    svcQuery = applyDateFilter(svcQuery, "servicio_fecha_creacion");
    svcQuery = applyAreaFilter(svcQuery, "area_id");
    const { data: serviciosCreados } = await svcQuery;
    allServicios = serviciosCreados || [];

    // También incluir servicios que tienen tareas completadas en el período
    // (aunque el servicio se haya creado antes)
    {
      const { data: tareasEnPeriodo } = await supabase
        .from("tareas")
        .select("servicio_id")
        .eq("tarea_estado", "completado")
        .gte("tarea_fecha_completado", fechaInicio ? fechaInicio.toISOString().split("T")[0] : "1970-01-01")
        .lte("tarea_fecha_completado", fechaFin ? fechaFin.toISOString().split("T")[0] : "2100-01-01");

      const idsAdicionales = [...new Set((tareasEnPeriodo || []).map((t: any) => t.servicio_id).filter(Boolean))];
      const idsExistentes = new Set(allServicios.map((s: any) => s.servicio_id));
      const idsNuevos = idsAdicionales.filter((id) => !idsExistentes.has(id));

      if (idsNuevos.length > 0) {
        const { data: serviciosAdicionales } = await supabase
          .from("servicios")
          .select("servicio_id, servicio_estado, servicio_tiempo_estimado, servicio_fecha_inicio, servicio_fecha_creacion, area_id, servicio_cliente_reporte, servicio_diagnostico_inicial")
          .in("servicio_id", idsNuevos);
        allServicios = [...allServicios, ...(serviciosAdicionales || [])];
      }
    }

    const totalServicios = allServicios?.length || 0;
    const completados = allServicios?.filter((s: any) => s.servicio_estado === "completado").length || 0;
    const en_progreso = allServicios?.filter((s: any) => s.servicio_estado === "en_progreso").length || 0;
    const pendientes = allServicios?.filter((s: any) => s.servicio_estado === "pendiente").length || 0;
    const bloqueados = allServicios?.filter((s: any) => s.servicio_estado === "bloqueado").length || 0;

    // -- Encuestas (calificaciones) del período --
    let califQuery = supabase
      .from("calificaciones")
      .select("calificacion_puntaje, calificacion_comentario, calificacion_sugerencia, servicio_id");

    if (areaId) {
      // Filtrar calificaciones por área a través de servicios
      const { data: svcIds } = await supabase
        .from("servicios")
        .select("servicio_id")
        .eq("area_id", areaId);
      const ids = (svcIds || []).map((s) => s.servicio_id);
      if (ids.length > 0) {
        califQuery = califQuery.in("servicio_id", ids);
      }
    }
    califQuery = applyDateFilter(califQuery, "calificacion_fecha");

    const { data: calificaciones } = await califQuery;
    const totalCalificaciones = calificaciones?.length || 0;
    const promedioCalificacion = totalCalificaciones > 0
      ? calificaciones!.reduce((sum: number, c) => sum + c.calificacion_puntaje, 0) / totalCalificaciones
      : 0;
    const conFeedback = calificaciones?.filter(
      (c) => c.calificacion_comentario || c.calificacion_sugerencia
    ).length || 0;
    const positivas = calificaciones?.filter((c) => c.calificacion_puntaje >= 3).length || 0;
    const negativas = calificaciones?.filter((c) => c.calificacion_puntaje < 3).length || 0;

    // -- Mapa servicio_id → area_id --
    const svcAreaMap: Record<number, number> = {};
    for (const s of allServicios || []) {
      const sId = s.servicio_id;
      const aId = s.area_id;
      if (sId && aId) svcAreaMap[sId] = aId;
    }

    // -- Servicios por área --
    const porAreaMap: Record<number, { total: number; completados: number }> = {};
    for (const s of allServicios || []) {
      const aid = s.area_id;
      if (!aid) continue;
      if (!porAreaMap[aid]) porAreaMap[aid] = { total: 0, completados: 0 };
      porAreaMap[aid].total++;
      if (s.servicio_estado === "completado") porAreaMap[aid].completados++;
    }

    const serviciosPorArea = await Promise.all(
      Object.entries(porAreaMap).map(async ([aid, datos]) => {
        const { data: areas } = await supabase
          .from("areas")
          .select("area_nombre")
          .eq("area_id", parseInt(aid))
          .limit(1);
        return {
          area_nombre: areas?.[0]?.area_nombre || `Área #${aid}`,
          total: datos.total,
          completados: datos.completados,
          tiempo_promedio_min: 0,
        };
      })
    );

    // -- Tareas completadas del período --
    let tareasQuery = supabase
      .from("tareas")
      .select("tarea_id, tarea_estado, servicio_id, tarea_completado_por, tarea_tiempo_real")
      .eq("tarea_estado", "completado");

    // Filtrar tareas por servicios en el período
    const svcIdsPeriodo = (allServicios || []).map((s) => s.servicio_id);
    if (svcIdsPeriodo.length > 0) {
      tareasQuery = tareasQuery.in("servicio_id", svcIdsPeriodo);
    }
    const { data: tareasCompletadasPeriodo } = await tareasQuery;
    const tareasCompletadasCount = tareasCompletadasPeriodo?.length || 0;

    // -- Auditoría: servicios con trazabilidad completa --
    let svcIdsConAuditoria = 0;
    if (svcIdsPeriodo.length > 0) {
      const { data: auditoriaRecords } = await supabase
        .from("auditoria")
        .select("auditoria_registro_id")
        .eq("auditoria_tabla", "servicios")
        .in("auditoria_registro_id", svcIdsPeriodo);
      const idsUnicos = new Set((auditoriaRecords || []).map((a: any) => a.auditoria_registro_id));
      svcIdsConAuditoria = idsUnicos.size;
    }

    // -- Tiempo real desde tarea_tiempo_real (más confiable que tracking_fin - tracking_inicio) --
    const svcConTiempo = new Set<number>();
    let sumaTiempoReal = 0;
    let tareasConTiempo = 0;
    for (const t of tareasCompletadasPeriodo || []) {
      if (t.tarea_tiempo_real != null && t.tarea_tiempo_real > 0) {
        sumaTiempoReal += t.tarea_tiempo_real;
        svcConTiempo.add(t.servicio_id);
        tareasConTiempo++;
      }
    }
    const totalSvcConTiempo = svcConTiempo.size;
    const tiempoPromedioMin = totalSvcConTiempo > 0 ? Math.round(sumaTiempoReal / totalSvcConTiempo) : 0;
    const tiempoPromedioPorTarea = tareasConTiempo > 0 ? Math.round(sumaTiempoReal / tareasConTiempo) : 0;

    // Si se especificó un usuario, recalcular solo con sus tareas
    let userTiempoPromedioMin: number | null = null;
    if (usuarioId) {
      const userSvcConTiempo = new Set<number>();
      let userSuma = 0;
      for (const t of tareasCompletadasPeriodo || []) {
        if (t.tarea_completado_por === usuarioId && t.tarea_tiempo_real != null && t.tarea_tiempo_real > 0) {
          userSuma += t.tarea_tiempo_real;
          userSvcConTiempo.add(t.servicio_id);
        }
      }
      const userTotalSvc = userSvcConTiempo.size;
      if (userTotalSvc > 0) {
        userTiempoPromedioMin = Math.round(userSuma / userTotalSvc);
      }
    }

    // -- Retrasos (servicio completado con tiempo real vs estimado) --
    // Usamos tarea_tiempo_real (acumulado de tracking) igual que getPeriodMetrics,
    // en vez de calcular por sesión de tracking individual que da resultados inconsistentes.
    let retrasos = 0;
    let dentroTiempo = 0;
    const svcTiempoMap: Record<number, number> = {};
    for (const s of allServicios || []) {
      if (s.servicio_id && s.servicio_tiempo_estimado) {
        svcTiempoMap[s.servicio_id] = s.servicio_tiempo_estimado;
      }
    }
    // Agrupar tareas completadas por servicio y sumar tarea_tiempo_real
    const realPorServicio: Record<number, number> = {};
    for (const tarea of tareasCompletadasPeriodo || []) {
      const svcId = tarea.servicio_id;
      if (!svcId) continue;
      if (tarea.tarea_tiempo_real != null && tarea.tarea_tiempo_real > 0) {
        realPorServicio[svcId] = (realPorServicio[svcId] || 0) + tarea.tarea_tiempo_real;
      }
    }
    for (const [svcIdStr, sumaReal] of Object.entries(realPorServicio)) {
      const svcId = parseInt(svcIdStr);
      const estimado = svcTiempoMap[svcId] || 0;
      if (estimado > 0) {
        if (sumaReal <= estimado) {
          dentroTiempo++;
        } else {
          retrasos++;
        }
      }
    }
    const porcentajeATiempo = (dentroTiempo + retrasos) > 0
      ? Math.round((dentroTiempo / (dentroTiempo + retrasos)) * 100)
      : 0;

    // -- Colaboradores destacados --
    const { data: tareasCompletadasRaw } = await supabase
      .from("tareas")
      .select(`
        tarea_id,
        tarea_completado_por,
        servicio_id,
        usuarios!tareas_tarea_completado_por_fkey (usuario_id, usuario_nombres)
      `)
      .eq("tarea_estado", "completado");

    // Mapear colaborador → datos
    const colabMap: Record<number, {
      nombres: string;
      tareas: number;
      servicios: Set<number>;
      tareaIds: number[];
    }> = {};

    for (const t of tareasCompletadasRaw || []) {
      const id = t.tarea_completado_por;
      if (!id) continue;
      const u = (t.usuarios || {}) as { usuario_nombres?: string } | null;
      if (!colabMap[id]) {
        colabMap[id] = {
          nombres: u?.usuario_nombres || `Usuario #${id}`,
          tareas: 0,
          servicios: new Set(),
          tareaIds: [],
        };
      }
      colabMap[id].tareas++;
      if (t.servicio_id) colabMap[id].servicios.add(t.servicio_id);
      if (t.tarea_id) colabMap[id].tareaIds.push(t.tarea_id);
    }

    // Obtener tracking y servicio_tiempo_estimado para eficiencia
    const todasTareaIds = Object.values(colabMap).flatMap((c) => c.tareaIds);
    let trackingPorTarea: Record<number, number> = {};
    let servicioEstimados: Record<number, number> = {};
    let tareaServicio: Record<number, number> = {};

    if (todasTareaIds.length > 0) {
      const [trackingRes, serviciosRes] = await Promise.all([
        supabase
          .from("tiempo_tracking")
          .select("tarea_id, tracking_inicio, tracking_fin")
          .in("tarea_id", todasTareaIds),
        supabase
          .from("tareas")
          .select("tarea_id, servicio_id")
          .in("tarea_id", todasTareaIds),
      ]);

      for (const tr of trackingRes.data || []) {
        if (tr.tracking_inicio && tr.tracking_fin) {
          const diffMin = Math.floor(
            (new Date(tr.tracking_fin).getTime() - new Date(tr.tracking_inicio).getTime()) / 60000
          );
          if (diffMin > 0) trackingPorTarea[tr.tarea_id] = diffMin;
        }
      }

      for (const t of serviciosRes.data || []) {
        if (t.tarea_id && t.servicio_id) tareaServicio[t.tarea_id] = t.servicio_id;
      }

      // Cargar servicio_tiempo_estimado de los servicios involucrados
      const svcIds = [...new Set(Object.values(tareaServicio))];
      if (svcIds.length > 0) {
        const { data: svcs } = await supabase
          .from("servicios")
          .select("servicio_id, servicio_tiempo_estimado")
          .in("servicio_id", svcIds);
        for (const s of svcs || []) {
          if (s.servicio_tiempo_estimado) servicioEstimados[s.servicio_id] = s.servicio_tiempo_estimado;
        }
      }
    }

    const colaboradoresDestacados = Object.entries(colabMap)
      .map(([id, data]) => {
        // Contar tareas dentro del tiempo estimado de su servicio
        let tareasDentroTiempo = 0;
        let tareasConEstimadoYTracking = 0;

        // Agrupar tareas por servicio para distribuir el estimado
        const svcTareas: Record<number, number[]> = {};
        for (const tId of data.tareaIds) {
          const svcId = tareaServicio[tId];
          if (!svcId) continue;
          if (!svcTareas[svcId]) svcTareas[svcId] = [];
          svcTareas[svcId].push(tId);
        }

        for (const [svcId, tIds] of Object.entries(svcTareas)) {
          const estimadoTotal = servicioEstimados[parseInt(svcId)];
          if (!estimadoTotal) continue;
          const tareasConTracking = tIds.filter((tId) => trackingPorTarea[tId] != null);
          if (tareasConTracking.length === 0) continue;

          const sumaReal = tareasConTracking.reduce((acc, tId) => acc + trackingPorTarea[tId], 0);
          tareasConEstimadoYTracking += tareasConTracking.length;
          if (sumaReal <= estimadoTotal) {
            tareasDentroTiempo += tareasConTracking.length;
          }
        }

        const eficiencia = tareasConEstimadoYTracking > 0
          ? Math.round((tareasDentroTiempo / tareasConEstimadoYTracking) * 100)
          : 0;

        return {
          usuario_id: parseInt(id),
          nombres: data.nombres,
          servicios_completados: data.servicios.size,
          tareas_completadas: data.tareas,
          eficiencia,
        };
      })
      .sort((a, b) => b.tareas_completadas - a.tareas_completadas)
      .slice(0, 5);

    // -- Servicios activos (en_progreso) --
    const { data: activos } = await supabase
      .from("servicios")
      .select("*")
      .eq("servicio_estado", "en_progreso");

    const serviciosActivosMapped = (activos || []).map((s: any) => {
      const tiempoEnCurso = s.servicio_fecha_inicio
        ? Math.floor((Date.now() - new Date(s.servicio_fecha_inicio).getTime()) / 60000)
        : 0;
      return {
        id: s.servicio_id,
        codigo: s.servicio_codigo,
        estado: s.servicio_estado,
        descripcion: s.servicio_nombre,
        cliente: s.cliente_id ? `Cliente #${s.cliente_id}` : null,
        prioridad: "media",
        tiempo_en_curso: tiempoEnCurso,
        progreso_porcentaje: 0,
      };
    });

    // -- Period comparison --
    let periodComparison = undefined;
    if (compararPeriodo && fechaInicio && fechaFin) {
      // Usar fechas explícitas de comparación si se pasaron, o calcular automáticamente
      const compararDesde = query.comparar_fecha_inicio
        ? new Date(query.comparar_fecha_inicio)
        : null;
      const compararHasta = query.comparar_fecha_fin
        ? new Date(query.comparar_fecha_fin)
        : null;

      const anteriorInicio = compararDesde ?? new Date(fechaInicio.getTime() - (fechaFin.getTime() - fechaInicio.getTime()));
      const anteriorFin = compararHasta ?? new Date(fechaFin.getTime() - (fechaFin.getTime() - fechaInicio.getTime()));

      const getPeriodMetrics = async (inicio: Date, fin: Date) => {
        // -- Servicios del período: igual que el dashboard principal --
        // 1) Servicios creados en el período
        let svcQuery = supabase
          .from("servicios")
          .select("servicio_id, servicio_estado, servicio_tiempo_estimado")
          .gte("servicio_fecha_creacion", inicio.toISOString().split("T")[0])
          .lte("servicio_fecha_creacion", fin.toISOString().split("T")[0]);

        if (areaId) svcQuery = svcQuery.eq("area_id", areaId);

        const { data: svcsCreados } = await svcQuery;
        const allSvcSet = new Set<number>((svcsCreados || []).map((s: any) => s.servicio_id));

        // 2) Servicios con tareas completadas en el período (aunque creados antes)
        {
          let tareasPeriodoQuery = supabase
            .from("tareas")
            .select("servicio_id")
            .eq("tarea_estado", "completado")
            .gte("tarea_fecha_completado", inicio.toISOString().split("T")[0])
            .lte("tarea_fecha_completado", fin.toISOString().split("T")[0]);
          if (usuarioId) tareasPeriodoQuery = tareasPeriodoQuery.eq("tarea_completado_por", usuarioId);
          const { data: tareasEnPeriodo } = await tareasPeriodoQuery;
          for (const t of tareasEnPeriodo || []) {
            if (t.servicio_id) allSvcSet.add(t.servicio_id);
          }
        }

        const allSvcIds = [...allSvcSet];
        const completados = [...(svcsCreados || []).filter((s: any) => s.servicio_estado === "completado")];
        // También buscar completados entre los adicionales
        if (allSvcIds.length > (svcsCreados || []).length) {
          const idsAdicionales = allSvcIds.filter((id) => !(svcsCreados || []).some((s: any) => s.servicio_id === id));
          if (idsAdicionales.length > 0) {
            const { data: svcsCompl } = await supabase
              .from("servicios")
              .select("servicio_id, servicio_estado, servicio_tiempo_estimado")
              .in("servicio_id", idsAdicionales);
            for (const s of svcsCompl || []) {
              if (s.servicio_estado === "completado") completados.push(s);
            }
          }
        }
        const svcIdsCompletados = completados.map((s: any) => s.servicio_id);
        const totalSvc = allSvcIds.length;

        // -- Tareas completadas de servicios completados --
        let tareasQuery = supabase
          .from("tareas")
          .select("tarea_id, tarea_tiempo_real, servicio_id, tarea_fecha_completado, tarea_hora_completado, tarea_completado_por, tarea_estado")
          .eq("tarea_estado", "completado");

        if (svcIdsCompletados.length > 0) {
          tareasQuery = tareasQuery.in("servicio_id", svcIdsCompletados);
        } else {
          tareasQuery = tareasQuery.in("servicio_id", [-1]); // fuerza resultado vacío
        }
        if (usuarioId) {
          tareasQuery = tareasQuery.eq("tarea_completado_por", usuarioId);
        }

        const { data: tareas } = await tareasQuery;
        const tareasCount = tareas?.length || 0;

        // -- Tiempo promedio (por servicio y por tarea) --
        const svcConTiempo = new Set<number>();
        let sumaTiempo = 0;
        let tareasConTiempoCount = 0;
        for (const t of tareas || []) {
          if (t.tarea_tiempo_real != null && t.tarea_tiempo_real > 0) {
            sumaTiempo += t.tarea_tiempo_real;
            svcConTiempo.add(t.servicio_id);
            tareasConTiempoCount++;
          }
        }
        const svcConTiempoCount = svcConTiempo.size;
        const tiempoPromedio = svcConTiempoCount > 0 ? Math.round(sumaTiempo / svcConTiempoCount) : 0;
        const tiempoPromedioPorTarea = tareasConTiempoCount > 0 ? Math.round(sumaTiempo / tareasConTiempoCount) : 0;

        // -- Tareas documentadas (fecha/hora/responsable) --
        const tareasDoc = (tareas || []).filter((t: any) =>
          t.tarea_fecha_completado && t.tarea_hora_completado && t.tarea_completado_por
        ).length;

        // -- Servicios con tiempo de ejecución en todas las tareas (tracking) --
        let serviciosConTracking = 0;
        if (allSvcIds.length > 0) {
          const { data: tareasParaTracking } = await supabase
            .from("tareas")
            .select("tarea_id, servicio_id")
            .in("servicio_id", allSvcIds);

          const svcTareasMap = new Map<number, number[]>();
          for (const t of tareasParaTracking || []) {
            const arr = svcTareasMap.get(t.servicio_id) || [];
            arr.push(t.tarea_id);
            svcTareasMap.set(t.servicio_id, arr);
          }

          const todasTareaIds = [...svcTareasMap.values()].flat();
          if (todasTareaIds.length > 0) {
            const { data: tracking } = await supabase
              .from("tiempo_tracking")
              .select("tarea_id")
              .in("tarea_id", todasTareaIds)
              .not("tracking_inicio", "is", null)
              .not("tracking_fin", "is", null);

            const tareasConTracking = new Set((tracking || []).map((tt: any) => tt.tarea_id));
            for (const [, tareaIds] of svcTareasMap) {
              if (tareaIds.length > 0 && tareaIds.every((tid) => tareasConTracking.has(tid))) {
                serviciosConTracking++;
              }
            }
          }
        }
        const trackingPct = totalSvc > 0 ? Math.round((serviciosConTracking / totalSvc) * 100) : 0;

        // -- Tareas pendientes / activas --
        let tareasActivas = 0;
        if (allSvcIds.length > 0) {
          const { data: pend } = await supabase
            .from("tareas")
            .select("tarea_id")
            .in("servicio_id", allSvcIds)
            .eq("tarea_estado", "pendiente");
          tareasActivas = pend?.length || 0;
        }

        // -- Pendientes y en_progreso del período --
        let pendientes = 0;
        let enProgreso = 0;
        if (allSvcIds.length > 0) {
          const { data: allEstados } = await supabase
            .from("servicios")
            .select("servicio_estado")
            .in("servicio_id", allSvcIds);
          for (const s of allEstados || []) {
            if (s.servicio_estado === "pendiente") pendientes++;
            else if (s.servicio_estado === "en_progreso") enProgreso++;
          }
        }

        // -- Auditoría (trazabilidad completa) --
        let svcConAuditoria = 0;
        if (allSvcIds.length > 0) {
          const { data: auditoria } = await supabase
            .from("auditoria")
            .select("auditoria_registro_id")
            .eq("auditoria_tabla", "servicios")
            .in("auditoria_registro_id", allSvcIds);
          svcConAuditoria = new Set((auditoria || []).map((a: any) => a.auditoria_registro_id)).size;
        }
        const auditoriaPct = totalSvc > 0 ? Math.round((svcConAuditoria / totalSvc) * 100) : 0;

        // -- Servicios completados dentro del tiempo estimado --
        let dentroTiempo = 0;
        let retrasos = 0;
        for (const s of completados) {
          if (s.servicio_tiempo_estimado) {
            const tareasSvc = (tareas || []).filter((t: any) => t.servicio_id === s.servicio_id);
            const sumaReal = tareasSvc.reduce((sum: number, t: any) => sum + (t.tarea_tiempo_real || 0), 0);
            if (sumaReal > 0 && sumaReal <= s.servicio_tiempo_estimado) dentroTiempo++;
            else if (sumaReal > 0 && sumaReal > s.servicio_tiempo_estimado) retrasos++;
          }
        }
        const aTiempoPct = completados.length > 0 ? Math.round((dentroTiempo / completados.length) * 100) : 0;

        // -- Calificaciones y NPS del período --
        let califPromedio = 0;
        let totalCalificaciones = 0;
        let nps = 0;
        let promotores = 0;
        let pasivos = 0;
        let detractores = 0;
        if (allSvcIds.length > 0) {
          const { data: califs } = await supabase
            .from("calificaciones")
            .select("calificacion_puntaje, nps_score")
            .in("servicio_id", allSvcIds)
            .gte("calificacion_fecha", inicio.toISOString().split("T")[0])
            .lte("calificacion_fecha", fin.toISOString().split("T")[0]);

          totalCalificaciones = califs?.length || 0;
          const toNpsCat = (c: { nps_score: number | null; calificacion_puntaje: number }) => {
            if (c.nps_score != null) return c.nps_score >= 9 ? "promoter" : c.nps_score >= 7 ? "passive" : "detractor";
            return c.calificacion_puntaje >= 4 ? "promoter" : c.calificacion_puntaje === 3 ? "passive" : "detractor";
          };
          if (totalCalificaciones > 0) {
            const suma = califs!.reduce((s: number, c: any) => s + c.calificacion_puntaje, 0);
            califPromedio = Math.round((suma / totalCalificaciones) * 10) / 10;
            promotores = califs!.filter((c: any) => toNpsCat(c) === "promoter").length;
            pasivos = califs!.filter((c: any) => toNpsCat(c) === "passive").length;
            detractores = califs!.filter((c: any) => toNpsCat(c) === "detractor").length;
            nps = Math.round(((promotores - detractores) / totalCalificaciones) * 100);
          }
        }

        return {
          servicios_completados: completados.length,
          tareas_completadas: tareasCount,
          tareas_activas: tareasActivas,
          pendientes,
          en_progreso,
          retrasos,
          tiempo_promedio: tiempoPromedio,
          tiempo_promedio_por_tarea: tiempoPromedioPorTarea,
          servicios_con_tiempo_tracking_pct: trackingPct,
          tareas_documentadas_conteo: tareasDoc,
          registros_completos_pct: auditoriaPct,
          completados_dentro_tiempo_pct: aTiempoPct,
          calificacion_promedio: califPromedio,
          total_calificaciones: totalCalificaciones,
          nps,
          promotores,
          pasivos,
          detractores,
        };
      };

      const [actualMetrics, anteriorMetrics] = await Promise.all([
        getPeriodMetrics(fechaInicio, fechaFin),
        getPeriodMetrics(anteriorInicio, anteriorFin),
      ]);

      const calcVariacion = (actual: number, anterior: number) =>
        anterior > 0 ? Math.round(((actual - anterior) / anterior) * 100) : 0;

      periodComparison = {
        actual: actualMetrics,
        anterior: anteriorMetrics,
        variacion: {
          servicios: calcVariacion(actualMetrics.servicios_completados, anteriorMetrics.servicios_completados),
          tareas: calcVariacion(actualMetrics.tareas_completadas, anteriorMetrics.tareas_completadas),
          tiempo: calcVariacion(actualMetrics.tiempo_promedio, anteriorMetrics.tiempo_promedio),
          tiempo_por_tarea: calcVariacion(actualMetrics.tiempo_promedio_por_tarea, anteriorMetrics.tiempo_promedio_por_tarea),
          tracking_pct: calcVariacion(actualMetrics.servicios_con_tiempo_tracking_pct, anteriorMetrics.servicios_con_tiempo_tracking_pct),
          tareas_documentadas: calcVariacion(actualMetrics.tareas_documentadas_conteo, anteriorMetrics.tareas_documentadas_conteo),
          auditoria_pct: calcVariacion(actualMetrics.registros_completos_pct, anteriorMetrics.registros_completos_pct),
          a_tiempo_pct: calcVariacion(actualMetrics.completados_dentro_tiempo_pct, anteriorMetrics.completados_dentro_tiempo_pct),
          calificacion: calcVariacion(actualMetrics.calificacion_promedio, anteriorMetrics.calificacion_promedio),
          nps: calcVariacion(actualMetrics.nps, anteriorMetrics.nps),
          pendientes: calcVariacion(actualMetrics.pendientes, anteriorMetrics.pendientes),
          en_progreso: calcVariacion(actualMetrics.en_progreso, anteriorMetrics.en_progreso),
          retrasos: actualMetrics.retrasos - anteriorMetrics.retrasos,
        },
      };
    }

    // -- Satisfacción por área --
    const satPorAreaMap: Record<number, { suma: number; cantidad: number }> = {};
    for (const c of calificaciones || []) {
      const sId = c.servicio_id;
      const aId = svcAreaMap[sId];
      if (!aId) continue;
      if (!satPorAreaMap[aId]) satPorAreaMap[aId] = { suma: 0, cantidad: 0 };
      satPorAreaMap[aId].suma += c.calificacion_puntaje;
      satPorAreaMap[aId].cantidad++;
    }

    const satisfaccionPorArea = await Promise.all(
      Object.entries(satPorAreaMap).map(async ([aid, datos]) => {
        const { data: areas } = await supabase
          .from("areas")
          .select("area_nombre")
          .eq("area_id", parseInt(aid))
          .limit(1);
        return {
          area_nombre: areas?.[0]?.area_nombre || `Área #${aid}`,
          promedio: Math.round((datos.suma / datos.cantidad) * 10) / 10,
          cantidad: datos.cantidad,
        };
      })
    );

    // -- Servicios con tareas (tiene al menos una tarea asociada) --
    let serviciosConTareas = 0;
    if (svcIdsPeriodo.length > 0) {
      const { data: svcConTareas } = await supabase
        .from("tareas")
        .select("servicio_id")
        .in("servicio_id", svcIdsPeriodo);
      const uniqueIds = new Set((svcConTareas || []).map((t: any) => t.servicio_id));
      serviciosConTareas = uniqueIds.size;
    }
    const serviciosConTareasPct = totalServicios > 0
      ? Math.round((serviciosConTareas / totalServicios) * 100)
      : 0;

    // -- Servicios con tiempo de ejecución en todas las tareas (tracking_fin - tracking_inicio) --
    let serviciosConTrackingCompleto = 0;
    if (svcIdsPeriodo.length > 0) {
      // Obtener tareas de todos los servicios del período
      const { data: tareasDelPeriodo } = await supabase
        .from("tareas")
        .select("tarea_id, servicio_id")
        .in("servicio_id", svcIdsPeriodo);

      const tareasPorServicio = new Map<number, number[]>();
      const todasTareaIds: number[] = [];
      for (const t of tareasDelPeriodo || []) {
        const arr = tareasPorServicio.get(t.servicio_id) || [];
        arr.push(t.tarea_id);
        tareasPorServicio.set(t.servicio_id, arr);
        todasTareaIds.push(t.tarea_id);
      }

      if (todasTareaIds.length > 0) {
        const { data: trackingEntries } = await supabase
          .from("tiempo_tracking")
          .select("tarea_id")
          .in("tarea_id", todasTareaIds)
          .not("tracking_inicio", "is", null)
          .not("tracking_fin", "is", null);

        const tareasConTracking = new Set((trackingEntries || []).map((tt: any) => tt.tarea_id));

        for (const [svcId, tareaIds] of tareasPorServicio) {
          const todasTienenTracking = tareaIds.length > 0 && tareaIds.every((tid) => tareasConTracking.has(tid));
          if (todasTienenTracking) serviciosConTrackingCompleto++;
        }
      }
    }
    const serviciosConTrackingCompletoPct = totalServicios > 0
      ? Math.round((serviciosConTrackingCompleto / totalServicios) * 100)
      : 0;

    // -- Servicios consultados (tiene al menos una serviciovisita) --
    let serviciosConsultados = 0;
    if (svcIdsPeriodo.length > 0) {
      const { data: svcConsultados } = await supabase
        .from("serviciovisitas")
        .select("servicio_id")
        .in("servicio_id", svcIdsPeriodo);
      const uniqueVisitIds = new Set((svcConsultados || []).map((v: any) => v.servicio_id));
      serviciosConsultados = uniqueVisitIds.size;
    }
    const serviciosConsultadosPct = totalServicios > 0
      ? Math.round((serviciosConsultados / totalServicios) * 100)
      : 0;

    // -- Colaboradores activos (distintos en serviciocolaboradores en el período) --
    let colaboradoresActivos = 0;
    if (svcIdsPeriodo.length > 0) {
      const { data: colabActivos } = await supabase
        .from("serviciocolaboradores")
        .select("colaborador_id")
        .in("servicio_id", svcIdsPeriodo);
      const uniqueColabs = new Set((colabActivos || []).map((c: any) => c.colaborador_id));
      colaboradoresActivos = uniqueColabs.size;
    }
    const promedioPorColaborador = colaboradoresActivos > 0
      ? Math.round((tareasCompletadasCount / colaboradoresActivos) * 10) / 10
      : 0;

    // -- KPIs del sistema -- completados_dentro_tiempo sobre servicios completados
    const completadosDentroTiempoPct = completados > 0
      ? Math.round((dentroTiempo / Math.max(dentroTiempo + retrasos, 1)) * 100)
      : 0;

    // -- Tareas documentadas (con fecha, hora completada y responsable) --
    let tareasDocumentadas = 0;
    if (svcIdsPeriodo.length > 0) {
      const { data: tareasDoc } = await supabase
        .from("tareas")
        .select("tarea_id")
        .in("servicio_id", svcIdsPeriodo)
        .not("tarea_fecha_completado", "is", null)
        .not("tarea_hora_completado", "is", null)
        .not("tarea_completado_por", "is", null);
      tareasDocumentadas = tareasDoc?.length ?? 0;
    }

    // -- Tiempo actualización → portal (promedio: última tarea completada → primera visita) --
    let sumaTiempoActualizacion = 0;
    let visitasConReferencia = 0;
    if (svcIdsPeriodo.length > 0) {
      // Última tarea completada por servicio (fecha+hora)
      const { data: tareasConFechas } = await supabase
        .from("tareas")
        .select("servicio_id, tarea_fecha_completado, tarea_hora_completado")
        .in("servicio_id", svcIdsPeriodo)
        .eq("tarea_estado", "completado")
        .not("tarea_fecha_completado", "is", null)
        .not("tarea_hora_completado", "is", null);

      const ultimoCompletadoPorSvc = new Map<number, Date>();
      for (const t of tareasConFechas || []) {
        const ts = new Date(`${t.tarea_fecha_completado}T${t.tarea_hora_completado}`);
        const existing = ultimoCompletadoPorSvc.get(t.servicio_id);
        if (!existing || ts > existing) ultimoCompletadoPorSvc.set(t.servicio_id, ts);
      }

      if (ultimoCompletadoPorSvc.size > 0) {
        const svcIdsConCompletado = [...ultimoCompletadoPorSvc.keys()];
        const { data: visitas } = await supabase
          .from("serviciovisitas")
          .select("servicio_id, serviciovisita_fecha, serviciovisita_hora")
          .in("servicio_id", svcIdsConCompletado);

        // Primera visita por servicio
        const primerVisitaPorSvc = new Map<number, Date>();
        for (const v of visitas || []) {
          const ts = new Date(`${v.serviciovisita_fecha}T${v.serviciovisita_hora}`);
          const existing = primerVisitaPorSvc.get(v.servicio_id);
          if (!existing || ts < existing) primerVisitaPorSvc.set(v.servicio_id, ts);
        }

        for (const [svcId, ultimoComp] of ultimoCompletadoPorSvc) {
          const primerVisita = primerVisitaPorSvc.get(svcId);
          if (primerVisita && primerVisita > ultimoComp) {
            const diffMin = Math.floor((primerVisita.getTime() - ultimoComp.getTime()) / 60000);
            sumaTiempoActualizacion += diffMin;
            visitasConReferencia++;
          }
        }
      }
    }
    const tiempoActualizacionPortalPromedioMin = visitasConReferencia > 0
      ? Math.round(sumaTiempoActualizacion / visitasConReferencia)
      : 0;

    return {
      data: {
        kpi: {
          registros_completos_pct: totalServicios > 0 && svcIdsPeriodo.length > 0
            ? (() => {
                const auditados = svcIdsConAuditoria ?? 0;
                return Math.round((auditados / totalServicios) * 100);
              })()
            : 0,
          servicios_con_tareas_pct: serviciosConTareasPct,
          servicios_con_tiempo_tracking_pct: serviciosConTrackingCompletoPct,
          tareas_documentadas_conteo: tareasDocumentadas,
          tiempo_actualizacion_portal_promedio_min: tiempoActualizacionPortalPromedioMin,
          tiempo_promedio_min: tiempoPromedioMin,
          completados_dentro_tiempo_pct: completadosDentroTiempoPct,
          servicios_consultados_pct: serviciosConsultadosPct,
          satisfaccion_visibilidad: Math.round(promedioCalificacion * 10) / 10,
          servicios_evaluados_pct: completados ? Math.round((totalCalificaciones / completados) * 100) : 0,
          servicios_con_comentarios_pct: completados ? Math.round((conFeedback / completados) * 100) : 0,
          calificaciones_positivas_pct: totalCalificaciones > 0 ? Math.round((positivas / totalCalificaciones) * 100) : 0,
          calificaciones_negativas_pct: totalCalificaciones > 0 ? Math.round((negativas / totalCalificaciones) * 100) : 0,
        },
        servicios_recientes: (allServicios || []).slice(0, 10).map((s: any) => ({
          ...s,
          id: s.servicio_id,
          codigo: s.servicio_codigo,
          titulo: s.servicio_nombre,
          estado: s.servicio_estado,
        })),
        total_servicios: totalServicios,
        completados,
        alertas: {
          blocked_count: bloqueados,
          delayed_services: [],
          stale_services: [],
        },
        indicadores: {
          productividad: {
            servicios_completados: completados,
            tareas_completadas: tareasCompletadasCount,
            promedio_por_colaborador: promedioPorColaborador,
            periodo: {
              desde: fechaInicio?.toISOString() ?? "",
              hasta: fechaFin?.toISOString() ?? "",
            },
          },
          eficiencia: {
            tiempo_promedio_min: userTiempoPromedioMin ?? tiempoPromedioMin,
            tiempo_promedio_por_tarea: tiempoPromedioPorTarea,
            porcentaje_a_tiempo: porcentajeATiempo,
            cantidad_retrasos: retrasos,
          },
          satisfaccion: {
            promedio_calificacion: Math.round(promedioCalificacion * 10) / 10,
            porcentaje_evaluados: totalServicios > 0
              ? Math.round((totalCalificaciones / totalServicios) * 100) : 0,
          },
        },
        graficos: {
          estado_servicios: {
            pendiente: pendientes,
            en_progreso,
            completado: completados,
            bloqueado: bloqueados,
          },
          servicios_por_area: serviciosPorArea,
          satisfaccion_por_area: satisfaccionPorArea,
        },
        rankings: {
          colaboradores_destacados: colaboradoresDestacados,
        },
        servicios_activos: serviciosActivosMapped,
        period_comparison: periodComparison,
      },
    };
  });

  // ----------------------------------
  // DASHBOARD PDF EXPORT
  // ----------------------------------

  // GET /api/seguimiento/dashboard/pdf
  app.get("/api/seguimiento/dashboard/pdf", { preHandler: [requireRoles()] }, async (request, reply) => {
    const query = request.query as {
      fecha_inicio?: string;
      fecha_fin?: string;
    };
    const user = request.user as { user_id: number; rol: string; area_id: number | null };

    // Reusar la lógica del dashboard V2 (sin response wrapper)
    const fechaInicio = query.fecha_inicio ? new Date(query.fecha_inicio) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fechaFin = query.fecha_fin ? new Date(query.fecha_fin) : new Date();

    const { data: allServicios } = await supabase
      .from("servicios")
      .select("servicio_id, servicio_estado, area_id, servicio_fecha_creacion, servicio_cliente_reporte, servicio_diagnostico_inicial, servicio_nombre, servicio_tiempo_estimado");

    const totalServicios = allServicios?.length || 0;
    const completados = allServicios?.filter((s) => s.servicio_estado === "completado").length || 0;
    const pendientes = allServicios?.filter((s) => s.servicio_estado === "pendiente").length || 0;
    const en_progreso = allServicios?.filter((s) => s.servicio_estado === "en_progreso").length || 0;
    const bloqueados = allServicios?.filter((s) => s.servicio_estado === "bloqueado").length || 0;

    const svcIds = (allServicios || []).map((s: any) => s.servicio_id).filter(Boolean);

    // KPIs simples para PDF
    let registrosCompletosPct = 0;
    if (totalServicios > 0 && svcIds.length > 0) {
      const { data: auditoriaRecords } = await supabase
        .from("auditoria")
        .select("auditoria_registro_id")
        .eq("auditoria_tabla", "servicios")
        .in("auditoria_registro_id", svcIds);
      const idsUnicos = new Set((auditoriaRecords || []).map((a: any) => a.auditoria_registro_id));
      registrosCompletosPct = Math.round((idsUnicos.size / totalServicios) * 100);
    }

    // Servicios con tareas
    let serviciosConTareas = 0;
    if (svcIds.length > 0) {
      const { data: svcConTareas } = await supabase
        .from("tareas")
        .select("servicio_id")
        .in("servicio_id", svcIds);
      serviciosConTareas = new Set((svcConTareas || []).map((t: any) => t.servicio_id)).size;
    }

    // Servicios consultados
    let serviciosConsultados = 0;
    if (svcIds.length > 0) {
      const { data: svcConsultados } = await supabase
        .from("serviciovisitas")
        .select("servicio_id")
        .in("servicio_id", svcIds);
      serviciosConsultados = new Set((svcConsultados || []).map((v: any) => v.servicio_id)).size;
    }

    // Calificaciones
    const { data: calificaciones } = await supabase
      .from("calificaciones")
      .select("servicio_id, calificacion_puntaje, calificacion_comentario, calificacion_sugerencia")
      .in("servicio_id", svcIds);

    const totalCalificaciones = calificaciones?.length || 0;
    const sumaCalificaciones = (calificaciones || []).reduce((s, c) => s + c.calificacion_puntaje, 0);
    const promedioCalificacion = totalCalificaciones > 0 ? sumaCalificaciones / totalCalificaciones : 0;
    const conFeedback = (calificaciones || []).filter((c) => c.calificacion_comentario || c.calificacion_sugerencia).length;

    // Tiempo tracking
    let sumaTiempoReal = 0;
    let tareasConTiempo = 0;
    if (svcIds.length > 0) {
      const { data: tareasData } = await supabase
        .from("tareas")
        .select("tarea_id")
        .in("servicio_id", svcIds);
      const tareaIds = (tareasData || []).map((t: any) => t.tarea_id);
      if (tareaIds.length > 0) {
        const { data: trackingData } = await supabase
          .from("tiempo_tracking")
          .select("tracking_inicio, tracking_fin")
          .in("tarea_id", tareaIds);
        for (const tr of trackingData || []) {
          if (tr.tracking_inicio && tr.tracking_fin) {
            const diff = Math.floor(
              (new Date(tr.tracking_fin).getTime() - new Date(tr.tracking_inicio).getTime()) / 60000
            );
            if (diff > 0) { sumaTiempoReal += diff; tareasConTiempo++; }
          }
        }
      }
    }
    const tiempoPromedioMin = completados > 0 ? Math.round(sumaTiempoReal / completados) : 0;

    // Generar PDF con pdfkit
    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ margin: 30, size: "A4" });

    const buffers: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => buffers.push(chunk));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(buffers);
      reply.header("Content-Type", "application/pdf");
      reply.header("Content-Disposition", `attachment; filename="dashboard_kpi_${fechaInicio.toISOString().split("T")[0]}_${fechaFin.toISOString().split("T")[0]}.pdf"`);
      reply.send(pdfBuffer);
    });

    // Title
    doc.fontSize(16).font("Helvetica-Bold").text("Dashboard - Indicadores de Gestión", { align: "center" });
    doc.fontSize(9).font("Helvetica").text(`Período: ${fechaInicio.toLocaleDateString("es-PE")} — ${fechaFin.toLocaleDateString("es-PE")}`, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(8).font("Helvetica").text(`Generado: ${new Date().toLocaleString("es-PE")}`, { align: "right" });
    doc.moveDown(1);

    // Table helper
    const colW = (doc.page.width - 60) / 3;
    const rh = 18;
    let y = doc.y;

    const drawRow = (cols: string[], bold: boolean, bgColor?: string) => {
      if (y > doc.page.height - 60) { doc.addPage(); y = 30; }
      const font = bold ? "Helvetica-Bold" : "Helvetica";
      const size = bold ? 8 : 7.5;
      if (bgColor) { doc.rect(30, y, doc.page.width - 60, rh).fill(bgColor); }
      doc.font(font).fontSize(size).fillColor("#000000");
      cols.forEach((val, i) => {
        doc.text(val, 30 + (i % 3) * colW + 3, y + 4, { width: colW - 6, align: "left" });
      });
      y += rh;
    };

    // -- Indicadores section --
    doc.fontSize(11).font("Helvetica-Bold").text("Indicadores del Sistema").fillColor("#1E3A5F");
    y = doc.y + 6;
    drawRow(["Indicador", "Valor", "Fórmula"], true, "#E2E8F0");
    drawRow(["IND-01 Datos completos", `${registrosCompletosPct}%`, "Serv. con datos / Total servicios"], false);
    drawRow(["IND-02 Con lista de tareas", `${totalServicios > 0 ? Math.round((serviciosConTareas / totalServicios) * 100) : 0}%`, "Serv. con tareas / Total servicios"], false);
    drawRow(["IND-03 Tiempo promedio de servicios completados", `${tiempoPromedioMin} min`, "Suma minutos / Servicios completados"], false);
    drawRow(["IND-04 Servicios dentro del tiempo promedio", `${completados > 0 ? Math.round((serviciosConTareas / Math.max(completados, 1)) * 100) : 0}%`, "Serv. dentro tiempo / Total completados"], false);
    drawRow(["IND-05 Servicios consultados por clientes", `${totalServicios > 0 ? Math.round((serviciosConsultados / totalServicios) * 100) : 0}%`, "Serv. con visitas / Total servicios"], false);
    drawRow(["IND-06 Satisfacción visibilidad", `${Math.round(promedioCalificacion * 10) / 10} / 5`, "Promedio calificaciones"], false);
    drawRow(["IND-07 Servicios evaluados", `${completados > 0 ? Math.round((totalCalificaciones / completados) * 100) : 0}%`, "Serv. calificados / Total completados"], false);
    drawRow(["IND-08 Servicios con comentarios", `${completados > 0 ? Math.round((conFeedback / completados) * 100) : 0}%`, "Serv. con feedback / Total completados"], false);

    y += 12;

    // -- Resumen section --
    doc.fontSize(11).font("Helvetica-Bold").text("Resumen de Servicios").fillColor("#1E3A5F");
    y = doc.y + 6;
    drawRow(["Estado", "Cantidad", "%"], true, "#E2E8F0");
    const total = totalServicios || 1;
    drawRow(["Pendientes", String(pendientes), `${Math.round((pendientes / total) * 100)}%`], false);
    drawRow(["En Progreso", String(en_progreso), `${Math.round((en_progreso / total) * 100)}%`], false);
    drawRow(["Completados", String(completados), `${Math.round((completados / total) * 100)}%`], false);
    drawRow(["Bloqueados", String(bloqueados), `${Math.round((bloqueados / total) * 100)}%`], false);
    drawRow(["Total", String(totalServicios), "100%"], true);

    doc.end();
  });

  // ----------------------------------
  // REPORTE CLIENTE PDF
  // ----------------------------------

  // GET /api/public/servicios/:codigo/reporte
  app.get("/api/public/servicios/:codigo/reporte", async (request, reply) => {
    const { codigo } = request.params as { codigo: string };

    const { data: servicios } = await supabase
      .from("servicios")
      .select("*, clientes!servicios_cliente_id_fkey(cliente_nombres, cliente_correo)")
      .eq("servicio_codigo", codigo)
      .limit(1);

    const servicio = servicios?.[0];
    if (!servicio) throw new NotFoundError("Servicio no encontrado");

    const { data: tareasList } = await supabase
      .from("tareas")
      .select("*")
      .eq("servicio_id", servicio.servicio_id)
      .order("tarea_orden", { ascending: true });

    const totalTareas = tareasList?.length || 0;
    const completadasCount = tareasList?.filter((t: any) => t.tarea_estado === "completado").length || 0;
    const progresoPorcentaje = totalTareas > 0 ? Math.round((completadasCount / totalTareas) * 100) : 0;

    // Evidencias
    const { data: evidencias } = await supabase
      .from("evidencias")
      .select("*, comentariosevidencias(*)")
      .eq("servicio_id", servicio.servicio_id)
      .neq("estado", "rechazado")
      .order("created_at", { ascending: true });

    // Colaborador
    let colaboradorNombre = "—";
    if (servicio.tecnico_principal_id) {
      const { data: colab } = await supabase
        .from("usuarios")
        .select("usuario_nombres, usuario_apellido_paterno")
        .eq("usuario_id", servicio.tecnico_principal_id)
        .limit(1);
      if (colab?.[0]) {
        colaboradorNombre = `${colab[0].usuario_nombres || ""} ${colab[0].usuario_apellido_paterno || ""}`.trim();
      }
    }

    // Cliente
    const clienteNombre = [servicio.cliente_nombres, servicio.cliente_apellido_paterno, servicio.cliente_apellido_materno].filter(Boolean).join(" ")
      || servicio.clientes?.cliente_nombres
      || "—";

    // Área
    let areaNombre = "—";
    if (servicio.area_id) {
      const { data: areas } = await supabase
        .from("areas")
        .select("area_nombre")
        .eq("area_id", servicio.area_id)
        .limit(1);
      areaNombre = areas?.[0]?.area_nombre || "—";
    }

    // Traducir estado
    const estadoLabel: Record<string, string> = {
      pendiente: "Pendiente",
      en_progreso: "En Progreso",
      completado: "Completado",
      bloqueado: "Bloqueado",
      cancelado: "Cancelado",
    };

    // ---- GENERAR PDF ----
    const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
    const pdfDoc = await PDFDocument.create();
    const pageW = 595, pageH = 842, mg = 45;
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const gray = rgb(0.45, 0.45, 0.45);
    const lightGray = rgb(0.65, 0.65, 0.65);
    const darkGray = rgb(0.3, 0.3, 0.3);
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
    const gold = rgb(0.82, 0.63, 0.12);
    const goldAccent = rgb(0.85, 0.68, 0.22);

    let page = pdfDoc.addPage([pageW, pageH]);
    let y = pageH - mg;
    let pageNum = 1;

    function addPageIfNeeded(needed: number) {
      if (y - needed < mg + 40) {
        // Dibujar footer de página antes de cambiar
        drawPageFooter();
        page = pdfDoc.addPage([pageW, pageH]);
        pageNum++;
        y = pageH - mg;
        // Repetir header en páginas siguientes (más compacto)
        drawCompactHeader();
      }
    }

    function drawPageFooter() {
      const fY = 28;
      // Línea separadora
      page.drawRectangle({ x: mg, y: fY + 12, width: pageW - 2 * mg, height: 0.5, color: rgb(0.85, 0.85, 0.85) });
      const pText = `Página ${pageNum}`;
      page.drawText(pText, {
        x: (pageW - font.widthOfTextAtSize(pText, 7)) / 2,
        y: fY,
        size: 7,
        font,
        color: lightGray,
      });
      page.drawText("ServicioLocal STS — Reporte de Seguimiento", {
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
      page.drawText(`Continuación — ${codigoStr}`, {
        x: pageW - mg - font.widthOfTextAtSize(`Continuación — ${codigoStr}`, 8),
        y: y - 12,
        size: 8,
        font,
        color: rgb(0.8, 0.85, 1),
      });
      y -= 36;
    }

    function drawSectionTitle(title: string) {
      addPageIfNeeded(40);
      // Barra lateral decorativa
      page.drawRectangle({ x: mg, y: y - 8, width: 4, height: 16, color: goldAccent });
      page.drawText(title, { x: mg + 14, y: y - 6, size: 12, font: boldFont, color: blueLight });
      y -= 22;
      // Línea separadora tenue
      page.drawRectangle({ x: mg, y: y, width: pageW - 2 * mg, height: 0.5, color: rgb(0.88, 0.88, 0.9) });
      y -= 10;
    }

    function drawInfoRow(label: string, value: string) {
      addPageIfNeeded(22);
      page.drawText(label, { x: mg + 4, y: y - 7, size: 9, font: boldFont, color: gray });
      page.drawText(value || "—", { x: mg + 85, y: y - 7, size: 9.5, font: font, color: black });
      y -= 18;
    }

    const codigoStr = servicio.servicio_codigo || `SRV${servicio.servicio_id}`;

    // ─── HEADER PRINCIPAL ───
    addPageIfNeeded(100);

    // Barra superior oscura
    page.drawRectangle({ x: 0, y: y - 48, width: pageW, height: 48, color: blue });

    // Nombre empresa + subtítulo
    page.drawText("ServicioLocal STS", { x: mg, y: y - 33, size: 16, font: boldFont, color: white });
    page.drawText("Reporte de Seguimiento — Cliente", { x: mg, y: y - 16, size: 9, font: font, color: rgb(0.75, 0.82, 1) });

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

    // ───ESTADO BADGE ───
    addPageIfNeeded(40);
    const estadoStr = estadoLabel[servicio.servicio_estado] || servicio.servicio_estado;
    let estadoColor, estadoBg;
    switch (servicio.servicio_estado) {
      case "completado": estadoColor = green; estadoBg = greenLight; break;
      case "en_progreso": estadoColor = blue; estadoBg = blueBg; break;
      case "pendiente": estadoColor = orange; estadoBg = orangeLight; break;
      case "bloqueado": estadoColor = red; estadoBg = redLight; break;
      default: estadoColor = gray; estadoBg = rgb(0.95, 0.95, 0.95); break;
    }
    const badgeW = boldFont.widthOfTextAtSize(estadoStr, 11) + 28;
    const badgeH = 26;
    // Sombra (rectángulo ligeramente desplazado)
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
    const badgeLabel = estadoStr === "en_progreso" ? "EN PROGRESO" : estadoStr.toUpperCase();
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

    // Card con fondo suave
    const cardH = 128;
    addPageIfNeeded(cardH);
    page.drawRectangle({ x: mg, y: y - cardH, width: pageW - 2 * mg, height: cardH, color: rgb(0.985, 0.985, 0.99) });
    const cardY = y;
    y -= 8;

    drawInfoRow("Código:", codigoStr);
    drawInfoRow("Servicio:", servicio.servicio_nombre || "—");
    drawInfoRow("Cliente:", clienteNombre);
    drawInfoRow("Área:", areaNombre);
    drawInfoRow("Técnico:", colaboradorNombre);

    y = cardY - cardH - 6;

    // Descripción
    if (servicio.servicio_descripcion) {
      addPageIfNeeded(36);
      page.drawText("Descripción", { x: mg + 4, y: y - 7, size: 9, font: boldFont, color: gray });
      // Ajustar texto a múltiples líneas
      const maxW = pageW - 2 * mg - 12;
      const descSize = 9;
      let descText = servicio.servicio_descripcion;
      // Calcular cuánto entra en 3 líneas
      const charsPerLine = Math.floor(maxW / (font.widthOfTextAtSize("A", descSize) * 1.05));
      let line = 0;
      let descY = y - 18;
      while (descText.length > 0 && line < 4) {
        const chunk = descText.substring(0, charsPerLine);
        page.drawText(chunk, { x: mg + 8, y: descY, size: descSize, font: font, color: darkGray });
        descText = descText.substring(charsPerLine);
        descY -= 14;
        line++;
      }
      if (descText.length > 0) {
        page.drawText("...", { x: mg + 8, y: descY, size: descSize, font: font, color: lightGray });
        line++;
      }
      y -= line * 14 + 12;
    }

    // ─── PROGRESO ───
    drawSectionTitle("Progreso");

    // Card de progreso
    const progCardH = 70;
    addPageIfNeeded(progCardH);
    page.drawRectangle({ x: mg, y: y - progCardH, width: pageW - 2 * mg, height: progCardH, color: rgb(0.985, 0.985, 0.99) });
    const progY = y;
    y -= 14;

    // Barra de progreso con bordes redondeados simulados
    const barW = pageW - 2 * mg - 24;
    const barH = 22;
    const barX = mg + 12;

    addPageIfNeeded(barH + 10);
    // Fondo
    page.drawRectangle({ x: barX, y: y - barH, width: barW, height: barH, color: rgb(0.92, 0.92, 0.94) });
    // Relleno
    const pctW = Math.max(barW * (progresoPorcentaje / 100), progresoPorcentaje > 0 ? 4 : 0);
    const barColor = progresoPorcentaje === 100 ? green : blue;
    page.drawRectangle({ x: barX, y: y - barH, width: pctW, height: barH, color: barColor });
    // Texto adentro
    const pctText = `${progresoPorcentaje}%`;
    page.drawText(pctText, {
      x: (pageW - boldFont.widthOfTextAtSize(pctText, 11)) / 2,
      y: y - barH + 5,
      size: 11,
      font: boldFont,
      color: progresoPorcentaje > 50 ? white : black,
    });
    y -= barH + 6;

    // Checkmark si está completo
    if (progresoPorcentaje === 100) {
      const doneText = `Completado — ${completadasCount} de ${totalTareas} tareas`;
      page.drawText(doneText, { x: mg + 12, y: y - 7, size: 9, font: boldFont, color: green });
    } else {
      const countText = `${completadasCount} de ${totalTareas} tareas completadas`;
      page.drawText(countText, { x: mg + 12, y: y - 7, size: 9, font: font, color: gray });
    }
    y -= 12;

    y = progY - progCardH - 4;

    // ─── TAREAS ───
    const tareas = tareasList || [];
    drawSectionTitle("Tareas");

    if (tareas.length === 0) {
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
      // Columnas: tarea (flexible), estado (fijo), tiempo (fijo)
      const tableMg = mg + 4;
      const tableW = pageW - 2 * tableMg;
      const colX = [
        tableMg,                     // tarea
        tableMg + tableW * 0.55,     // estado
        tableMg + tableW * 0.82,     // tiempo
      ];
      const rowH = 20;
      const headerH = 22;

      addPageIfNeeded(headerH + tareas.length * rowH + 10);

      // Header de tabla
      page.drawRectangle({ x: tableMg, y: y - headerH, width: tableW, height: headerH, color: blue });
      page.drawText("Tarea", { x: colX[0] + 8, y: y - headerH + 6, size: 9, font: boldFont, color: white });
      page.drawText("Estado", { x: colX[1] + 8, y: y - headerH + 6, size: 9, font: boldFont, color: white });
      page.drawText("Tiempo", { x: colX[2] + 8, y: y - headerH + 6, size: 9, font: boldFont, color: white });
      y -= headerH + 2;

      for (let i = 0; i < tareas.length; i++) {
        const t = tareas[i];
        addPageIfNeeded(rowH + 2);

        // Fila alternada
        if (i % 2 === 0) {
          page.drawRectangle({ x: tableMg, y: y - rowH, width: tableW, height: rowH, color: rgb(0.975, 0.975, 0.98) });
        }

        // Línea separadora inferior
        page.drawRectangle({ x: tableMg, y: y - rowH, width: tableW, height: 0.3, color: rgb(0.92, 0.92, 0.94) });

        // Nombre de tarea (truncado a ancho)
        const nombre = t.tarea_titulo || "—";
        const maxTW = colX[1] - colX[0] - 20;
        let nombreDisplay = nombre;
        if (font.widthOfTextAtSize(nombre, 9) > maxTW) {
          while (font.widthOfTextAtSize(nombreDisplay + "...", 9) > maxTW && nombreDisplay.length > 3) {
            nombreDisplay = nombreDisplay.slice(0, -1);
          }
          nombreDisplay += "...";
        }
        page.drawText(nombreDisplay, { x: colX[0] + 8, y: y - rowH + 5, size: 9, font: font, color: black });

        // Estado con badge pequeño
        const tEstado = t.tarea_estado || "pendiente";
        let tEstadoColor, tEstadoBg, estadoTxt;
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
        const estW = boldFont.widthOfTextAtSize(estadoTxt, 8) + 14;
        page.drawRectangle({ x: colX[1] + 6, y: y - rowH + 3, width: estW, height: 14, color: tEstadoBg });
        page.drawText(estadoTxt, {
          x: colX[1] + 6 + (estW - boldFont.widthOfTextAtSize(estadoTxt, 8)) / 2,
          y: y - rowH + 5,
          size: 8,
          font: boldFont,
          color: tEstadoColor,
        });

        // Tiempo
        const tiempo = t.tarea_tiempo_real
          ? `${Math.floor(t.tarea_tiempo_real / 60)}h ${t.tarea_tiempo_real % 60}m`
          : "—";
        page.drawText(tiempo, { x: colX[2] + 8, y: y - rowH + 5, size: 9, font: font, color: darkGray });

        y -= rowH;
      }
      y -= 8;
    }

    // ─── EVIDENCIAS ───
    const evs = evidencias || [];
    drawSectionTitle("Evidencias");

    if (evs.length === 0) {
      addPageIfNeeded(30);
      page.drawRectangle({ x: mg, y: y - 50, width: pageW - 2 * mg, height: 50, color: rgb(0.98, 0.98, 0.98) });
      page.drawText("No hay evidencias registradas para este servicio.", {
        x: (pageW - font.widthOfTextAtSize("No hay evidencias registradas para este servicio.", 10)) / 2,
        y: y - 30,
        size: 10,
        font,
        color: lightGray,
      });
      y -= 58;
    } else {
      for (let i = 0; i < evs.length; i++) {
        const e = evs[i];
        const evRowH = e.comentario_colaborador ? 52 : 38;

        addPageIfNeeded(evRowH + 6);

        // Fondo alternado
        if (i % 2 === 0) {
          page.drawRectangle({ x: mg, y: y - evRowH, width: pageW - 2 * mg, height: evRowH, color: rgb(0.975, 0.975, 0.98) });
        }
        // Línea separadora
        page.drawRectangle({ x: mg, y: y - evRowH, width: pageW - 2 * mg, height: 0.3, color: rgb(0.92, 0.92, 0.94) });

        // Tipo badge
        const tipoLabel = e.tipo === "photo" ? "Foto" : e.tipo === "video" ? "Video" : e.tipo || "Archivo";
        const tipoBg = e.tipo === "photo" ? blueBg : e.tipo === "video" ? orangeLight : rgb(0.95, 0.95, 0.95);
        const tipoColor = e.tipo === "photo" ? blue : e.tipo === "video" ? orange : gray;
        const tipoW = boldFont.widthOfTextAtSize(tipoLabel, 8) + 12;
        page.drawRectangle({ x: mg + 4, y: y - evRowH + 18, width: tipoW, height: 14, color: tipoBg });
        page.drawText(tipoLabel, {
          x: mg + 4 + (tipoW - boldFont.widthOfTextAtSize(tipoLabel, 8)) / 2,
          y: y - evRowH + 20,
          size: 8,
          font: boldFont,
          color: tipoColor,
        });

        // Estado badge pequeño
        let evEstadoLabel: string, evEstadoColor: any, evEstadoBg: any;
        switch (e.estado) {
          case "aprobado":
            evEstadoLabel = "Aprobado"; evEstadoColor = green; evEstadoBg = greenLight; break;
          case "pendiente":
            evEstadoLabel = "Pendiente"; evEstadoColor = orange; evEstadoBg = orangeLight; break;
          case "reemplazado":
            evEstadoLabel = "Reemplazado"; evEstadoColor = gray; evEstadoBg = rgb(0.92, 0.92, 0.94); break;
          default:
            evEstadoLabel = e.estado || "—"; evEstadoColor = gray; evEstadoBg = rgb(0.95, 0.95, 0.95); break;
        }
        const evEstW = boldFont.widthOfTextAtSize(evEstadoLabel, 7.5) + 10;
        page.drawRectangle({ x: mg + tipoW + 12, y: y - evRowH + 18, width: evEstW, height: 14, color: evEstadoBg });
        page.drawText(evEstadoLabel, {
          x: mg + tipoW + 12 + (evEstW - boldFont.widthOfTextAtSize(evEstadoLabel, 7.5)) / 2,
          y: y - evRowH + 20,
          size: 7.5,
          font: boldFont,
          color: evEstadoColor,
        });

        // Nombre de archivo (extraído de la URL)
        const urlParts = (e.archivo_url || "").split("/");
        const fileName = urlParts[urlParts.length - 1] || "—";
        // Truncar si es muy largo (UUID largo)
        const displayName = fileName.length > 30 ? fileName.substring(0, 14) + "..." + fileName.substring(fileName.length - 10) : fileName;
        page.drawText(displayName, {
          x: mg + 4,
          y: y - evRowH + 5,
          size: 7.5,
          font: font,
          color: darkGray,
        });

        // Comentario del colaborador
        if (e.comentario_colaborador) {
          page.drawText(e.comentario_colaborador, {
            x: mg + 120,
            y: y - evRowH + 20,
            size: 8,
            font: font,
            color: gray,
          });
        }

        y -= evRowH + 2;
      }
      y -= 6;
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
    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `attachment; filename="seguimiento-${codigoStr}.pdf"`);
    reply.send(Buffer.from(pdfBytes));
  });
}

