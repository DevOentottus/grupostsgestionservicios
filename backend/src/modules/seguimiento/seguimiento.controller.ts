import { FastifyInstance } from "fastify";
import { supabase } from "@/lib/supabase.js";
import { NotFoundError, ValidationError } from "@/core/errors/index.js";
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
    calificacion: z.number().int().min(1).max(5),
    comentario: z.string().optional(),
    sugerencia: z.string().optional(),
  });

  // POST /api/servicios/:id/encuesta
  app.post("/api/servicios/:id/encuesta", { preHandler: [requireRoles()] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = encuestaSchema.parse(request.body);

    const now = new Date();
    const { data: califs } = await supabase
      .from("calificaciones")
      .insert({
        servicio_id: parseInt(id),
        calificacion_puntaje: input.calificacion,
        calificacion_comentario: input.comentario || null,
        calificacion_sugerencia: input.sugerencia || null,
        calificacion_fecha: now.toISOString().split("T")[0],
        calificacion_hora: now.toTimeString().split(" ")[0],
      })
      .select();

    const encuesta = califs?.[0];
    return reply.status(201).send({
      data: encuesta
        ? {
            id: encuesta.calificacion_id,
            servicio_id: encuesta.servicio_id,
            calificacion: encuesta.calificacion_puntaje,
            comentario: encuesta.calificacion_comentario,
            sugerencia: encuesta.calificacion_sugerencia,
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
            }
          : null,
      },
    };
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
      comparar_periodo?: string;
      comparar_fecha_inicio?: string;
      comparar_fecha_fin?: string;
    };

    const desde = query.fecha_inicio || query.desde || null;
    const hasta = query.fecha_fin || query.hasta || null;
    const areaId = query.area_id ? parseInt(query.area_id) : null;
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

    // -- Servicios del período --
    let svcQuery = supabase.from("servicios").select("servicio_id, servicio_estado, servicio_tiempo_estimado, servicio_fecha_inicio, servicio_fecha_creacion, area_id, servicio_cliente_reporte, servicio_diagnostico_inicial");
    svcQuery = applyDateFilter(svcQuery, "servicio_fecha_creacion");
    svcQuery = applyAreaFilter(svcQuery, "area_id");
    const { data: allServicios } = await svcQuery;

    const totalServicios = allServicios?.length || 0;
    const completados = allServicios?.filter((s) => s.servicio_estado === "completado").length || 0;
    const en_progreso = allServicios?.filter((s) => s.servicio_estado === "en_progreso").length || 0;
    const pendientes = allServicios?.filter((s) => s.servicio_estado === "pendiente").length || 0;
    const bloqueados = allServicios?.filter((s) => s.servicio_estado === "bloqueado").length || 0;

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

    // -- Tiempo real desde tiempo_tracking --
    let trackingQuery = supabase
      .from("tiempo_tracking")
      .select("tarea_id, tracking_inicio, tracking_fin, usuarios!tiempo_tracking_usuario_id_fkey (usuario_id)");

    const tareaIdsInPeriodo = (tareasCompletadasPeriodo || []).map((t) => t.tarea_id);
    if (tareaIdsInPeriodo.length > 0) {
      trackingQuery = trackingQuery.in("tarea_id", tareaIdsInPeriodo);
    }
    const { data: trackingData } = await trackingQuery;

    let sumaTiempoReal = 0;
    let tareasConTiempo = 0;
    for (const tr of trackingData || []) {
      if (tr.tracking_inicio && tr.tracking_fin) {
        const diffMin = Math.floor(
          (new Date(tr.tracking_fin).getTime() - new Date(tr.tracking_inicio).getTime()) / 60000
        );
        if (diffMin > 0) {
          sumaTiempoReal += diffMin;
          tareasConTiempo++;
        }
      }
    }
    const tiempoPromedioMin = tareasConTiempo > 0 ? Math.round(sumaTiempoReal / tareasConTiempo) : 0;

    // -- Retrasos (tarea con tiempo estimado vs real) --
    // Usamos servicio_tiempo_estimado como referencia vs diff tracking
    let retrasos = 0;
    let dentroTiempo = 0;
    const svcTiempoMap: Record<number, number> = {};
    for (const s of allServicios || []) {
      if (s.servicio_id && s.servicio_tiempo_estimado) {
        svcTiempoMap[s.servicio_id] = s.servicio_tiempo_estimado;
      }
    }
    for (const tr of trackingData || []) {
      const tarea = (tareasCompletadasPeriodo || []).find((t) => t.tarea_id === tr.tarea_id);
      if (!tarea || !tr.tracking_fin || !tr.tracking_inicio) continue;
      const realMin = Math.floor(
        (new Date(tr.tracking_fin).getTime() - new Date(tr.tracking_inicio).getTime()) / 60000
      );
      const estimado = svcTiempoMap[tarea.servicio_id] || 0;
      if (realMin > 0 && estimado > 0) {
        if (realMin <= estimado) {
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
        tarea_completado_por,
        usuarios!tareas_tarea_completado_por_fkey (usuario_id, usuario_nombres)
      `)
      .eq("tarea_estado", "completado");

    const colabMap: Record<number, { nombres: string; tareas: number }> = {};
    for (const t of tareasCompletadasRaw || []) {
      const id = t.tarea_completado_por;
      if (!id) continue;
      const u = t.usuarios || {};
      if (!colabMap[id]) {
        colabMap[id] = { nombres: u.usuario_nombres || `Usuario #${id}`, tareas: 0 };
      }
      colabMap[id].tareas++;
    }

    const colaboradoresDestacados = Object.entries(colabMap)
      .map(([id, data]) => ({
        usuario_id: parseInt(id),
        nombres: data.nombres,
        servicios_completados: 0,
        tareas_completadas: data.tareas,
        eficiencia: 0,
      }))
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
        const { data: svcs } = await supabase
          .from("servicios")
          .select("servicio_estado")
          .gte("servicio_fecha_creacion", inicio.toISOString().split("T")[0])
          .lte("servicio_fecha_creacion", fin.toISOString().split("T")[0])
          .eq("servicio_estado", "completado");

        return {
          servicios_completados: svcs?.length || 0,
          tareas_completadas: 0,
          tiempo_promedio: 0,
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
          tareas: 0,
          tiempo: 0,
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

    return {
      data: {
        kpi: {
          registros_completos_pct: totalServicios > 0
            ? Math.round((allServicios!.filter((s: any) => s.servicio_cliente_reporte && s.servicio_diagnostico_inicial).length / totalServicios) * 100)
            : 0,
          servicios_con_tareas_pct: serviciosConTareasPct,
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
            tiempo_promedio_min: tiempoPromedioMin,
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
    const blue = rgb(0.12, 0.24, 0.6);
    const green = rgb(0.15, 0.6, 0.25);
    const orange = rgb(0.9, 0.6, 0.1);
    const red = rgb(0.8, 0.2, 0.15);

    let page = pdfDoc.addPage([pageW, pageH]);
    let y = pageH - mg;

    function addPageIfNeeded(needed: number) {
      if (y - needed < mg + 30) {
        page = pdfDoc.addPage([pageW, pageH]);
        y = pageH - mg;
      }
    }

    function drawText(text: string, opts: { x?: number; size?: number; color?: any; bold?: boolean } = {}) {
      const f = opts.bold ? boldFont : font;
      const s = opts.size || 10;
      page.drawText(text, { x: opts.x ?? mg, y: y - s, size: s, font: f, color: opts.color ?? black });
      y -= s * 1.5;
    }

    // ─── HEADER ───
    addPageIfNeeded(80);

    // Logo / Title bar
    page.drawRectangle({ x: 0, y: y - 40, width: pageW, height: 40, color: blue });
    page.drawText("ServicioLocal STS", { x: mg, y: y - 28, size: 14, font: boldFont, color: white });
    page.drawText("Reporte de Seguimiento", { x: mg, y: y - 28, size: 10, font: font, color: rgb(0.8, 0.85, 1) });
    const fechaGen = new Date().toLocaleDateString("es-PE") + " " + new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false });
    page.drawText(fechaGen, {
      x: pageW - mg - font.widthOfTextAtSize(fechaGen, 8),
      y: y - 16,
      size: 8,
      font,
      color: rgb(0.8, 0.85, 1),
    });
    y -= 50;

    // ─── ESTADO BADGE ───
    addPageIfNeeded(40);
    const estadoStr = estadoLabel[servicio.servicio_estado] || servicio.servicio_estado;
    const estadoColor = servicio.servicio_estado === "completado" ? green
      : servicio.servicio_estado === "en_progreso" ? blue
      : servicio.servicio_estado === "pendiente" ? orange
      : servicio.servicio_estado === "bloqueado" ? red
      : gray;
    const badgeW = boldFont.widthOfTextAtSize(estadoStr.toUpperCase(), 10) + 20;
    page.drawRectangle({ x: (pageW - badgeW) / 2, y: y - 22, width: badgeW, height: 22, color: estadoColor });
    page.drawText(estadoStr.toUpperCase(), {
      x: (pageW - boldFont.widthOfTextAtSize(estadoStr.toUpperCase(), 10)) / 2,
      y: y - 17,
      size: 10,
      font: boldFont,
      color: white,
    });
    y -= 36;

    // ─── DATOS DEL SERVICIO ───
    addPageIfNeeded(140);
    page.drawText("Datos del Servicio", { x: mg, y: y - 11, size: 11, font: boldFont, color: blue });
    y -= 18;

    // Código
    page.drawText("Código:", { x: mg, y: y - 10, size: 10, font: boldFont, color: black });
    const codigoStr = servicio.servicio_codigo || `SRV${servicio.servicio_id}`;
    page.drawText(codigoStr, { x: mg + 58, y: y - 10, size: 10, font: font, color: darkGray });
    y -= 16;

    // Título
    page.drawText("Servicio:", { x: mg, y: y - 10, size: 10, font: boldFont, color: black });
    page.drawText(servicio.servicio_nombre || "—", { x: mg + 58, y: y - 10, size: 10, font: font, color: darkGray });
    y -= 16;

    // Cliente
    page.drawText("Cliente:", { x: mg, y: y - 10, size: 10, font: boldFont, color: black });
    page.drawText(clienteNombre, { x: mg + 58, y: y - 10, size: 10, font: font, color: darkGray });
    y -= 16;

    // Área
    page.drawText("Área:", { x: mg, y: y - 10, size: 10, font: boldFont, color: black });
    page.drawText(areaNombre, { x: mg + 58, y: y - 10, size: 10, font: font, color: darkGray });
    y -= 16;

    // Técnico
    page.drawText("Técnico:", { x: mg, y: y - 10, size: 10, font: boldFont, color: black });
    page.drawText(colaboradorNombre, { x: mg + 58, y: y - 10, size: 10, font: font, color: darkGray });
    y -= 16;

    // Descripción
    if (servicio.servicio_descripcion) {
      addPageIfNeeded(30);
      page.drawText("Descripción:", { x: mg, y: y - 10, size: 10, font: boldFont, color: black });
      y -= 14;
      // Truncar si es muy larga
      const maxW = pageW - 2 * mg;
      const descLines = Math.min(3, Math.ceil(servicio.servicio_descripcion.length / 80));
      const descH = descLines * 14;
      addPageIfNeeded(descH);
      page.drawText(servicio.servicio_descripcion.substring(0, 240), {
        x: mg + 5, y: y - 8, size: 9, font: font, color: darkGray,
      });
      y -= descH + 6;
    }

    y -= 6;

    // ─── PROGRESO ───
    addPageIfNeeded(60);
    page.drawText("Progreso", { x: mg, y: y - 11, size: 11, font: boldFont, color: blue });
    y -= 18;

    // Barra de progreso visual
    const barW = pageW - 2 * mg;
    const barH = 18;
    addPageIfNeeded(barH + 10);
    // Fondo
    page.drawRectangle({ x: mg, y: y - barH, width: barW, height: barH, color: rgb(0.92, 0.92, 0.94) });
    // Relleno
    const pctW = Math.max(barW * (progresoPorcentaje / 100), progresoPorcentaje > 0 ? 3 : 0);
    const barColor = progresoPorcentaje === 100 ? green : blue;
    page.drawRectangle({ x: mg, y: y - barH, width: pctW, height: barH, color: barColor });
    // Texto
    const pctText = `${progresoPorcentaje}%`;
    page.drawText(pctText, {
      x: (pageW - boldFont.widthOfTextAtSize(pctText, 10)) / 2,
      y: y - barH + 4,
      size: 10,
      font: boldFont,
      color: progresoPorcentaje > 50 ? white : black,
    });
    y -= barH + 4;

    // Contador
    const countText = `${completadasCount} de ${totalTareas} tareas completadas`;
    page.drawText(countText, { x: mg, y: y - 7, size: 8, font: font, color: gray });
    y -= 14;

    // ─── TAREAS ───
    const tareas = tareasList || [];
    addPageIfNeeded(30);
    page.drawText("Tareas", { x: mg, y: y - 11, size: 11, font: boldFont, color: blue });
    y -= 18;

    if (tareas.length === 0) {
      drawText("Sin tareas registradas.", { size: 9, color: lightGray });
    } else {
      const colX = [mg, 360, 500];
      const rowH = 18;
      const headerH = 20;

      addPageIfNeeded(headerH + tareas.length * rowH + 20);

      // Header
      page.drawRectangle({ x: mg, y: y - headerH, width: pageW - 2 * mg, height: headerH, color: blue });
      page.drawText("Tarea", { x: colX[0] + 6, y: y - headerH + 5, size: 9, font: boldFont, color: white });
      page.drawText("Estado", { x: colX[1] + 6, y: y - headerH + 5, size: 9, font: boldFont, color: white });
      page.drawText("Tiempo", { x: colX[2] + 6, y: y - headerH + 5, size: 9, font: boldFont, color: white });
      y -= headerH + 4;

      for (let i = 0; i < tareas.length; i++) {
        const t = tareas[i];
        addPageIfNeeded(rowH + 4);
        if (i % 2 === 0) {
          page.drawRectangle({ x: mg, y: y - rowH, width: pageW - 2 * mg, height: rowH, color: rgb(0.97, 0.97, 0.98) });
        }

        // Nombre de tarea (truncado)
        const nombre = t.tarea_titulo || "—";
        const maxNombreW = colX[1] - colX[0] - 16;
        const truncated = font.widthOfTextAtSize(nombre, 9) > maxNombreW
          ? nombre.substring(0, 35) + "..."
          : nombre;
        page.drawText(truncated, { x: colX[0] + 6, y: y - rowH + 4, size: 9, font: font, color: black });

        // Estado
        const tEstado = t.tarea_estado || "pendiente";
        const tEstadoColor = tEstado === "completado" ? green
          : tEstado === "en_progreso" ? blue
          : rgb(0.7, 0.7, 0.7);
        const estadoTxt = tEstado === "completado" ? "✓ Completado"
          : tEstado === "en_progreso" ? "En Progreso"
          : "Pendiente";
        page.drawText(estadoTxt, { x: colX[1] + 6, y: y - rowH + 4, size: 9, font: boldFont, color: tEstadoColor });

        // Tiempo
        const tiempo = t.tarea_tiempo_real
          ? `${Math.floor(t.tarea_tiempo_real / 60)}h ${t.tarea_tiempo_real % 60}m`
          : "—";
        page.drawText(tiempo, { x: colX[2] + 6, y: y - rowH + 4, size: 9, font: font, color: darkGray });

        y -= rowH;
      }
      y -= 10;
    }

    // ─── FOOTER ───
    addPageIfNeeded(40);
    page.drawRectangle({ x: 0, y: y - 30, width: pageW, height: 30, color: rgb(0.95, 0.95, 0.97) });
    const footer = "ServicioLocal STS — Reporte generado para el cliente";
    page.drawText(footer, {
      x: (pageW - font.widthOfTextAtSize(footer, 7)) / 2,
      y: y - 12,
      size: 7,
      font,
      color: lightGray,
    });
    const footer2 = "Si tenés dudas, contactanos a través de nuestro portal de servicio.";
    page.drawText(footer2, {
      x: (pageW - font.widthOfTextAtSize(footer2, 7)) / 2,
      y: y - 21,
      size: 7,
      font,
      color: lightGray,
    });

    // ─── FINALIZAR ───
    const pdfBytes = await pdfDoc.save();
    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `attachment; filename="seguimiento-${codigoStr}.pdf"`);
    reply.send(Buffer.from(pdfBytes));
  });
}

