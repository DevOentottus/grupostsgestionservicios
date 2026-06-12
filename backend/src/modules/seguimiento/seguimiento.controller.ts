import { FastifyInstance } from "fastify";
import { supabase } from "@/lib/supabase.js";
import { NotFoundError, ValidationError } from "@/core/errors/index.js";
import { requireRoles } from "@/core/middleware/auth.js";
import { auditLog } from "@/core/utils/index.js";
import { z } from "zod";

export async function seguimientoController(app: FastifyInstance) {
  // NOTA: No usar app.addHook + route-level preHandler combinados en serverless/emit (causa timeout).
  // autenticación por ruta.

  // ──────────────────────────────────
  // ENCUESTAS (usando calificaciones en Supabase)
  // ──────────────────────────────────

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

  // ──────────────────────────────────
  // PORTAL CLIENTE
  // ──────────────────────────────────

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
      .select(`*, clientes!servicios_cliente_id_fkey(cliente_nombres, cliente_correo)`)
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

    // Cliente
    const clienteData = (servicio as any).clientes || {};
    const clienteNombre = clienteData.cliente_nombres || null;
    const clienteEmail = clienteData.cliente_correo || null;

    const tareas = (tareasList || []).map((t: any) => {
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

  // ──────────────────────────────────
  // DASHBOARD / KPI
  // ──────────────────────────────────

  app.get("/api/dashboard", { preHandler: [requireRoles()] }, async (request) => {
    const query = request.query as {
      desde?: string;
      hasta?: string;
      fecha_inicio?: string;
      fecha_fin?: string;
      area_id?: string;
      comparar_periodo?: string;
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

    // ── Servicios del período ──
    let svcQuery = supabase.from("servicios").select("servicio_estado, servicio_tiempo_estimado, servicio_fecha_inicio, servicio_fecha_creacion, area_id");
    svcQuery = applyDateFilter(svcQuery, "servicio_fecha_creacion");
    svcQuery = applyAreaFilter(svcQuery, "area_id");
    const { data: allServicios } = await svcQuery;

    const totalServicios = allServicios?.length || 0;
    const completados = allServicios?.filter((s: any) => s.servicio_estado === "completado").length || 0;
    const en_progreso = allServicios?.filter((s: any) => s.servicio_estado === "en_progreso").length || 0;
    const pendientes = allServicios?.filter((s: any) => s.servicio_estado === "pendiente").length || 0;
    const bloqueados = allServicios?.filter((s: any) => s.servicio_estado === "bloqueado").length || 0;

    // ── Encuestas (calificaciones) del período ──
    let califQuery = supabase
      .from("calificaciones")
      .select("calificacion_puntaje, calificacion_comentario, calificacion_sugerencia, servicio_id");

    if (areaId) {
      // Filtrar calificaciones por área a través de servicios
      const { data: svcIds } = await supabase
        .from("servicios")
        .select("servicio_id")
        .eq("area_id", areaId);
      const ids = (svcIds || []).map((s: any) => s.servicio_id);
      if (ids.length > 0) {
        califQuery = califQuery.in("servicio_id", ids);
      }
    }
    califQuery = applyDateFilter(califQuery, "calificacion_fecha");

    const { data: calificaciones } = await califQuery;
    const totalCalificaciones = calificaciones?.length || 0;
    const promedioCalificacion = totalCalificaciones > 0
      ? calificaciones!.reduce((sum: number, c: any) => sum + c.calificacion_puntaje, 0) / totalCalificaciones
      : 0;
    const conFeedback = calificaciones?.filter(
      (c: any) => c.calificacion_comentario || c.calificacion_sugerencia
    ).length || 0;

    // ── Servicios por área ──
    const porAreaMap: Record<number, { total: number; completados: number }> = {};
    for (const s of allServicios || []) {
      const aid = (s as any).area_id;
      if (!aid) continue;
      if (!porAreaMap[aid]) porAreaMap[aid] = { total: 0, completados: 0 };
      porAreaMap[aid].total++;
      if ((s as any).servicio_estado === "completado") porAreaMap[aid].completados++;
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

    // ── Colaboradores destacados ──
    const { data: tareasCompletadas } = await supabase
      .from("tareas")
      .select(`
        tarea_completado_por,
        usuarios!tareas_tarea_completado_por_fkey (usuario_id, usuario_nombres)
      `)
      .eq("tarea_estado", "completado");

    const colabMap: Record<number, { nombres: string; tareas: number }> = {};
    for (const t of tareasCompletadas || []) {
      const id = t.tarea_completado_por;
      if (!id) continue;
      const u = (t as any).usuarios || {};
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

    // ── Servicios activos (en_progreso) ──
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

    // ── Period comparison ──
    let periodComparison = undefined;
    if (compararPeriodo && fechaInicio && fechaFin) {
      const periodDuration = fechaFin.getTime() - fechaInicio.getTime();
      const anteriorInicio = new Date(fechaInicio.getTime() - periodDuration);
      const anteriorFin = new Date(fechaFin.getTime() - periodDuration);

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

    return {
      data: {
        kpi: {
          registros_completos_pct: totalServicios ? 0 : 0,
          servicios_con_tareas_pct: 0,
          tiempo_promedio_min: 0,
          completados_dentro_tiempo_pct: 0,
          servicios_consultados_pct: 0,
          satisfaccion_visibilidad: Math.round(promedioCalificacion * 10) / 10,
          servicios_evaluados_pct: completados ? Math.round((totalCalificaciones / completados) * 100) : 0,
          servicios_con_comentarios_pct: completados ? Math.round((conFeedback / completados) * 100) : 0,
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
            tareas_completadas: 0,
            promedio_por_colaborador: 0,
            periodo: {
              desde: fechaInicio?.toISOString() ?? "",
              hasta: fechaFin?.toISOString() ?? "",
            },
          },
          eficiencia: {
            tiempo_promedio_min: 0,
            porcentaje_a_tiempo: 0,
            cantidad_retrasos: 0,
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
          satisfaccion_por_area: [],
        },
        rankings: {
          colaboradores_destacados: colaboradoresDestacados,
        },
        servicios_activos: serviciosActivosMapped,
        period_comparison: periodComparison,
      },
    };
  });
}

