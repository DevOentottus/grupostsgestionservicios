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
      const doneText = `✓ Completado — ${completadasCount} de ${totalTareas} tareas`;
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
            estadoTxt = "✓ Completado";
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

