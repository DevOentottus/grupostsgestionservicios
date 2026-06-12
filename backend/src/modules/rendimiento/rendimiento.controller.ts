import { FastifyInstance } from "fastify";
import { supabase } from "@/lib/supabase.js";
import { requireRoles } from "@/core/middleware/auth.js";

export async function rendimientoController(app: FastifyInstance) {
  app.get(
    "/api/admin/rendimiento",
    { preHandler: [requireRoles("admin", "sistema")] },
    async () => {
      const [visitStats, kpiStats, califStats, collabStats, healthStats] =
        await Promise.all([
          getVisitStats(),
          getKPIStats(),
          getCalificacionesStats(),
          getCollaboratorStats(),
          getSystemHealthStats(),
        ]);

      return {
        data: {
          ...visitStats,
          ...kpiStats,
          ...califStats,
          ...collabStats,
          ...healthStats,
        },
      };
    }
  );
}

// ──────────────────── 1. Visit Tracking Stats ────────────────────

interface VisitCount {
  count: number;
  ultima: string;
}

async function getVisitStats() {
  const { count: totalVisitas } = await supabase
    .from("serviciovisitas")
    .select("*", { count: "exact", head: true });

  // Aggregate visits per servicio in JS
  const { data: visitasRaw } = await supabase
    .from("serviciovisitas")
    .select("servicio_id, serviciovisita_fecha");

  const visitCountByServicio = new Map<number, VisitCount>();
  for (const v of visitasRaw || []) {
    const current = visitCountByServicio.get(v.servicio_id) ?? {
      count: 0,
      ultima: "",
    };
    current.count++;
    if (!current.ultima || v.serviciovisita_fecha > current.ultima) {
      current.ultima = v.serviciovisita_fecha;
    }
    visitCountByServicio.set(v.servicio_id, current);
  }

  // Top 10 by visit count
  const sortedEntries = [...visitCountByServicio.entries()].sort(
    (a, b) => b[1].count - a[1].count
  );
  const topIds = sortedEntries.slice(0, 10).map(([id]) => id);

  const { data: serviciosTop } = await supabase
    .from("servicios")
    .select("servicio_id, servicio_codigo, servicio_nombre")
    .in("servicio_id", topIds.length > 0 ? topIds : [0]);

  const serviciosMap = new Map(
    (serviciosTop || []).map((s: any) => [s.servicio_id, s])
  );

  const serviciosMasConsultados: {
    codigo: string;
    nombre: string;
    visitas: number;
    ultima_visita: string | null;
  }[] = sortedEntries.slice(0, 10).map(([id, stats]) => {
    const s = serviciosMap.get(id);
    return {
      codigo: s?.servicio_codigo ?? "N/A",
      nombre: s?.servicio_nombre ?? "Eliminado",
      visitas: stats.count,
      ultima_visita: stats.ultima || null,
    };
  });

  // visitas_por_dia — last 30 days, fill missing with 0
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 29);
  const fechaInicio = start.toISOString().split("T")[0];
  const fechaFin = today.toISOString().split("T")[0];

  const { data: visitasPorDiaRaw } = await supabase
    .from("serviciovisitas")
    .select("serviciovisita_fecha")
    .gte("serviciovisita_fecha", fechaInicio)
    .lte("serviciovisita_fecha", fechaFin);

  const countByDate = new Map<string, number>();
  for (const v of visitasPorDiaRaw || []) {
    const d = v.serviciovisita_fecha;
    countByDate.set(d, (countByDate.get(d) ?? 0) + 1);
  }

  const visitasPorDia: { fecha: string; cantidad: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const fecha = d.toISOString().split("T")[0];
    visitasPorDia.push({ fecha, cantidad: countByDate.get(fecha) ?? 0 });
  }

  // promedio_visitas_por_servicio
  const distinctCount = visitCountByServicio.size;
  const promedioVisitas =
    distinctCount > 0
      ? Math.round(((totalVisitas ?? 0) / distinctCount) * 100) / 100
      : 0;

  return {
    total_visitas: totalVisitas ?? 0,
    servicios_mas_consultados: serviciosMasConsultados,
    visitas_por_dia: visitasPorDia,
    promedio_visitas_por_servicio: promedioVisitas,
  };
}

// ──────────────────── 2. Performance KPIs ────────────────────

async function getKPIStats() {
  // Single query to count all estados at once
  const { data: estadosData } = await supabase
    .from("servicios")
    .select("servicio_estado");

  const estados = (estadosData || []).map((s: any) => s.servicio_estado);
  const completados = estados.filter((e: string) => e === "completado").length;
  const enProgreso = estados.filter((e: string) => e === "en_progreso").length;
  const pendientes = estados.filter((e: string) => e === "pendiente").length;
  const bloqueados = estados.filter((e: string) => e === "bloqueado").length;
  const totalServicios = estados.length;

  // tiempo_promedio_completado_min
  const { data: completadosData } = await supabase
    .from("servicios")
    .select(
      "servicio_fecha_inicio, servicio_hora_inicio, servicio_fecha_fin, servicio_hora_fin"
    )
    .eq("servicio_estado", "completado")
    .not("servicio_fecha_inicio", "is", null)
    .not("servicio_fecha_fin", "is", null);

  let tiempoPromedioMin = 0;
  if (completadosData && completadosData.length > 0) {
    const totalMin = completadosData.reduce((acc: number, s: any) => {
      const inicio = new Date(
        `${s.servicio_fecha_inicio}T${s.servicio_hora_inicio || "00:00:00"}`
      );
      const fin = new Date(
        `${s.servicio_fecha_fin}T${s.servicio_hora_fin || "00:00:00"}`
      );
      return acc + (fin.getTime() - inicio.getTime()) / 60000;
    }, 0);
    tiempoPromedioMin =
      Math.round((totalMin / completadosData.length) * 100) / 100;
  }

  const tasaCompletacion =
    totalServicios > 0
      ? Math.round((completados / totalServicios) * 10000) / 100
      : 0;

  // Tareas — single query
  const { data: tareasData } = await supabase
    .from("tareas")
    .select("tarea_estado");

  const tareasEstados = (tareasData || []).map((t: any) => t.tarea_estado);
  const tareasCompletadas = tareasEstados.filter(
    (e: string) => e === "completado"
  ).length;
  const tareasPendientes = tareasEstados.filter(
    (e: string) => e === "pendiente"
  ).length;
  const totalTareasKPI = tareasCompletadas + tareasPendientes;

  const tasaCompletacionTareas =
    totalTareasKPI > 0
      ? Math.round((tareasCompletadas / totalTareasKPI) * 10000) / 100
      : 0;

  return {
    servicios_completados: completados,
    servicios_en_progreso: enProgreso,
    servicios_pendientes: pendientes,
    servicios_bloqueados: bloqueados,
    tiempo_promedio_completado_min: tiempoPromedioMin,
    tasa_completacion: tasaCompletacion,
    tareas_completadas: tareasCompletadas,
    tareas_pendientes: tareasPendientes,
    tasa_completacion_tareas: tasaCompletacionTareas,
  };
}

// ──────────────────── 3. Calificaciones Stats ────────────────────

async function getCalificacionesStats() {
  const { count: totalCalificaciones } = await supabase
    .from("calificaciones")
    .select("*", { count: "exact", head: true });

  const { data: puntajesRaw } = await supabase
    .from("calificaciones")
    .select("calificacion_puntaje");

  const puntajes = (puntajesRaw || []).map(
    (c: any) => c.calificacion_puntaje
  );
  const promedio =
    puntajes.length > 0
      ? Math.round(
          (puntajes.reduce((a: number, b: number) => a + b, 0) /
            puntajes.length) *
            100
        ) / 100
      : 0;

  // calificaciones_por_puntaje — separate query per score
  const calificacionesPorPuntaje: { puntaje: number; cantidad: number }[] = [];
  for (let p = 1; p <= 5; p++) {
    const { count } = await supabase
      .from("calificaciones")
      .select("*", { count: "exact", head: true })
      .eq("calificacion_puntaje", p);
    calificacionesPorPuntaje.push({ puntaje: p, cantidad: count ?? 0 });
  }

  // últimas 10 calificaciones con datos del servicio
  const { data: ultimasRaw } = await supabase
    .from("calificaciones")
    .select(
      "calificacion_puntaje, calificacion_comentario, calificacion_fecha, servicio_id"
    )
    .order("calificacion_id", { ascending: false })
    .limit(10);

  let ultimasCalificaciones: {
    servicio_codigo: string;
    servicio_nombre: string;
    puntaje: number;
    comentario: string | null;
    fecha: string;
  }[] = [];

  if (ultimasRaw && ultimasRaw.length > 0) {
    const servicioIds = [
      ...new Set(ultimasRaw.map((c: any) => c.servicio_id)),
    ];
    const { data: serviciosCalif } = await supabase
      .from("servicios")
      .select("servicio_id, servicio_codigo, servicio_nombre")
      .in("servicio_id", servicioIds);

    const servMap = new Map(
      (serviciosCalif || []).map((s: any) => [s.servicio_id, s])
    );

    ultimasCalificaciones = ultimasRaw.map((c: any) => {
      const s = servMap.get(c.servicio_id);
      return {
        servicio_codigo: s?.servicio_codigo ?? "N/A",
        servicio_nombre: s?.servicio_nombre ?? "Eliminado",
        puntaje: c.calificacion_puntaje,
        comentario: c.calificacion_comentario,
        fecha: c.calificacion_fecha,
      };
    });
  }

  return {
    promedio_calificacion: promedio,
    total_calificaciones: totalCalificaciones ?? 0,
    calificaciones_por_puntaje: calificacionesPorPuntaje,
    ultimas_calificaciones: ultimasCalificaciones,
  };
}

// ──────────────────── 4. Collaborator Stats ────────────────────

async function getCollaboratorStats() {
  const { data: tareasColab } = await supabase
    .from("tareas")
    .select("tarea_completado_por")
    .eq("tarea_estado", "completado")
    .not("tarea_completado_por", "is", null);

  const colabCounts = new Map<number, number>();
  for (const t of tareasColab || []) {
    const uid: number = t.tarea_completado_por;
    colabCounts.set(uid, (colabCounts.get(uid) ?? 0) + 1);
  }

  const colaboradoresConTareas = colabCounts.size;

  // Top 5 by completed tareas
  const sortedColabs = [...colabCounts.entries()].sort(
    (a, b) => b[1] - a[1]
  );
  const topIds = sortedColabs.slice(0, 5).map(([id]) => id);

  const { data: usuariosColab } = await supabase
    .from("usuarios")
    .select(
      "usuario_id, usuario_nombres, usuario_apellido_paterno, usuario_apellido_materno"
    )
    .in("usuario_id", topIds.length > 0 ? topIds : [0]);

  const userMap = new Map(
    (usuariosColab || []).map((u: any) => [u.usuario_id, u])
  );

  const topColaboradores: {
    usuario_id: number;
    nombres: string;
    total_tareas: number;
  }[] = topIds.map((id) => {
    const u = userMap.get(id);
    const apMat = u?.usuario_apellido_materno
      ? ` ${u.usuario_apellido_materno}`
      : "";
    return {
      usuario_id: id,
      nombres: u
        ? `${u.usuario_nombres} ${u.usuario_apellido_paterno}${apMat}`.trim()
        : "Eliminado",
      total_tareas: colabCounts.get(id) ?? 0,
    };
  });

  return {
    colaboradores_con_tareas: colaboradoresConTareas,
    top_colaboradores: topColaboradores,
  };
}

// ──────────────────── 5. System Health ────────────────────

async function getSystemHealthStats() {
  const { count: totalUsuarios } = await supabase
    .from("usuarios")
    .select("*", { count: "exact", head: true });

  const { count: totalAreas } = await supabase
    .from("areas")
    .select("*", { count: "exact", head: true });

  const { count: totalClientes } = await supabase
    .from("clientes")
    .select("*", { count: "exact", head: true });

  const { count: totalServicios } = await supabase
    .from("servicios")
    .select("*", { count: "exact", head: true });

  // Distinct servicios with at least one calificacion
  const { data: califServicios } = await supabase
    .from("calificaciones")
    .select("servicio_id");

  const distinctServiciosCalif = new Set(
    (califServicios || []).map((c: any) => c.servicio_id)
  );
  const serviciosConCalif = distinctServiciosCalif.size;

  const tasaServiciosConCalificacion =
    (totalServicios ?? 0) > 0
      ? Math.round(
          ((serviciosConCalif ?? 0) / (totalServicios ?? 0)) * 10000
        ) / 100
      : 0;

  // días entre primera y última creación de servicio
  const { data: fechasServicios } = await supabase
    .from("servicios")
    .select("servicio_fecha_creacion")
    .order("servicio_fecha_creacion", { ascending: true })
    .limit(1);

  const { data: ultimaFecha } = await supabase
    .from("servicios")
    .select("servicio_fecha_creacion")
    .order("servicio_fecha_creacion", { ascending: false })
    .limit(1);

  let diasDatos = 0;
  const primera = fechasServicios?.[0]?.servicio_fecha_creacion;
  const ultima = ultimaFecha?.[0]?.servicio_fecha_creacion;

  if (primera && ultima) {
    if (primera === ultima) {
      diasDatos = 1;
    } else {
      const diffMs =
        new Date(ultima).getTime() - new Date(primera).getTime();
      diasDatos = Math.round(diffMs / 86400000);
    }
  }

  return {
    total_usuarios: totalUsuarios ?? 0,
    total_areas: totalAreas ?? 0,
    total_clientes: totalClientes ?? 0,
    total_servicios: totalServicios ?? 0,
    tasa_servicios_con_calificacion: tasaServiciosConCalificacion,
    dias_datos: diasDatos,
  };
}
