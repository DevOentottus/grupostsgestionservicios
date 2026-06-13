// ── Roles ──
export type Rol = "sistema" | "admin" | "encargado" | "colaborador";

// ── Estado de servicio ──
export type EstadoServicio =
  | "pendiente"
  | "en_progreso"
  | "completado"
  | "cancelado"
  | "bloqueado";

// ── Prioridad ──
export type Prioridad = "baja" | "media" | "alta" | "urgente";

// ── Usuario ──
export interface Usuario {
  id: number;
  username: string;
  nombres: string;
  apellidos: string | null;
  dni: string | null;
  telefono: string | null;
  email: string;
  rol: Rol;
  activo: boolean;
  area_ids: number[];
  created_at: string;
}

// ── Servicio ──
export interface Servicio {
  id: number;
  codigo: string;
  titulo: string;
  descripcion: string | null;
  estado: EstadoServicio;
  prioridad: Prioridad;
  area_id: number | null;
  colaborador_id: number | null;
  colaborador_nombre: string | null;
  cliente_nombre: string;
  cliente_email: string | null;
  cliente_dni: string | null;
  cliente_apellido_paterno: string | null;
  cliente_apellido_materno: string | null;
  cliente_nombres: string | null;
  cliente_telefono: string | null;
  descripcion_equipo: string | null;
  serie_equipo: string | null;
  detalles_equipo: string | null;
  descripcion_accesorio: string | null;
  detalles_accesorio: string | null;
  cliente_reporte: string | null;
  diagnostico_inicial: string | null;
  id_plantilla_inicial: number | null;
  datos_completos: boolean;
  consultado_cliente: boolean;
  tiempo_estimado: number | null;
  fecha_inicio: string | null;
  hora_inicio: string | null;
  fecha_fin: string | null;
  hora_fin: string | null;
  hora_creacion: string | null;
  bloqueado_motivo: string | null;
  created_at: string;
  updated_at: string;
}

// ── Tarea ──
export interface Tarea {
  id: number;
  servicio_id: number;
  titulo: string;
  descripcion: string | null;
  orden: number;
  completada: boolean;
  completada_por: number | null;
  completada_at: string | null;
  area_id: number | null;
  tiempo_estimado: number | null;
  asignado_a: number | null;
  has_active_tracking?: boolean;
  created_at: string;
}

// ── Time Tracking ──
export interface TiempoTracking {
  id: number;
  tarea_id: number;
  usuario_id: number;
  usuario_nombre?: string | null;
  inicio: string;
  pausa_at: string | null;
  fin: string | null;
  created_at?: string;
}

export interface TiempoTrackingResumen {
  tarea_id: number;
  titulo: string;
  completada: boolean;
  tiempo_estimado: number | null;
  tiempo_real_minutos: number;
  tracking_activo: boolean;
  tracking_id: number | null;
  tracking_inicio: string | null;
  tracking_pausa: string | null;
}

// ── Encuesta ──
export interface Encuesta {
  id: number;
  servicio_id: number;
  calificacion: number;
  comentario: string | null;
  sugerencia: string | null;
  created_at: string;
}

// ── JWT ──
export interface JwtPayload {
  user_id: number;
  rol: Rol;
  area_id: number | null;
}

// ── KPIs ──
export interface DashboardKPI {
  registros_completos_pct: number;
  servicios_con_tareas_pct: number;
  tiempo_promedio_min: number;
  completados_dentro_tiempo_pct: number;
  servicios_consultados_pct: number;
  satisfaccion_visibilidad: number;
  servicios_evaluados_pct: number;
  servicios_con_comentarios_pct: number;
}

// ── Area ──
export interface Area {
  id: number;
  nombre: string;
  encargado_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface AreaWithColaboradores extends Area {
  colaboradores: {
    usuario_id: number;
    id: number;
    nombres: string;
    email: string;
    username: string;
  }[];
}

// ── Area Colaborador ──
export interface AreaColaborador {
  area_id: number;
  usuario_id: number;
}

// ── Plantilla Proceso ──
export interface PlantillaProceso {
  id: number;
  nombre: string;
  descripcion: string | null;
  area_id: number | null;
  area_nombre: string | null;
  created_at: string;
  updated_at: string;
}

// ── Plantilla Tarea ──
export interface PlantillaTarea {
  id: number;
  plantilla_id: number;
  titulo: string;
  descripcion: string | null;
  orden: number;
  asignado_a: number | null;
  created_at: string;
}

// ── Comentario ──
export interface Comentario {
  id: number;
  servicio_id: number;
  tarea_id: number | null;
  usuario_id: number;
  contenido: string;
  created_at: string;
}

export interface ComentarioDisplay extends Comentario {
  usuario: {
    id: number;
    nombres: string;
    username: string;
  };
  tarea?: {
    id: number;
    titulo: string;
  } | null;
}

// ── Evidencias ──
export interface Evidencia {
  id: number;
  servicio_id: number;
  tarea_id: number;
  tipo: "photo" | "video";
  archivo_url: string;
  thumbnail_url: string | null;
  comentario_colaborador: string | null;
  comentario_cliente: string | null;
  estado: "pendiente" | "aprobado" | "rechazado" | "reemplazado";
  submitted_by: number | null;
  submitted_at: string;
  created_at: string;
}

export interface EvidenciaComentario {
  id: number;
  evidencia_id: number;
  usuario_id: number | null;
  es_cliente: boolean;
  contenido: string;
  created_at: string;
}

export interface EvidenciaComentarioDisplay extends EvidenciaComentario {
  usuario_nombres?: string;
}

// ── Tarea with evidence config ──
export interface TareaEvidenciaConfig {
  requiere_evidencia: boolean;
  modo_evidencia: string | null;
  evidencia_desactivada: boolean;
}

// ── Auditoria ──
export interface Auditoria {
  id: number;
  usuario_id: number | null;
  accion: string;
  entidad: string;
  entidad_id: number | null;
  detalle: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditoriaDisplay extends Auditoria {
  usuario?: {
    id: number;
    nombres: string;
    username: string;
  } | null;
}

// ── Public Service Detail Response ──
export interface PublicServicioResponse {
  servicio: Servicio & { area_nombre: string | null };
  tareas: Tarea[];
  progreso: {
    total: number;
    completadas: number;
    porcentaje: number;
  };
  tiempo_transcurrido_minutos: number;
  encuesta: Encuesta | null;
}

// ── Display Data ──
export interface DisplayData {
  id: number;
  codigo: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  prioridad: string;
  cliente_nombre: string;
  area_id: number | null;
  fecha_inicio: string | null;
  tiempo_estimado: number | null;
  progreso: number;
  tareas_total: number;
  tareas_completadas: number;
  tiempo_transcurrido_min: number;
  tecnico: { id: number; nombres: string | null } | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ── Delayed Service ──
export interface DelayedService {
  id: number;
  codigo: string;
  cliente: string;
  descripcion: string;
  estado: string;
  tiempo_estimado: number | null;
  tiempo_transcurrido_minutos: number;
  prioridad: string;
}

// ── Stale Service ──
export interface StaleService {
  id: number;
  codigo: string;
  cliente: string;
  descripcion: string;
  ultima_actualizacion: string | null;
  horas_sin_actividad: number;
}

// ── Dashboard V2 Response ──
export interface DashboardV2Response {
  kpi: DashboardKPI;
  servicios_recientes?: any[];
  total_servicios?: number;
  completados?: number;
  alertas: {
    blocked_count: number;
    delayed_services: DelayedService[];
    stale_services: StaleService[];
  };
  indicadores: {
    productividad: {
      servicios_completados: number;
      tareas_completadas: number;
      promedio_por_colaborador: number;
      periodo: { desde: string; hasta: string };
    };
    eficiencia: {
      tiempo_promedio_min: number;
      porcentaje_a_tiempo: number;
      cantidad_retrasos: number;
    };
    satisfaccion: {
      promedio_calificacion: number;
      porcentaje_evaluados: number;
    };
  };
  graficos: {
    estado_servicios: {
      pendiente: number;
      en_progreso: number;
      completado: number;
      bloqueado: number;
    };
    servicios_por_area: {
      area_nombre: string;
      total: number;
      completados: number;
      tiempo_promedio_min: number;
    }[];
    satisfaccion_por_area: {
      area_nombre: string;
      promedio: number;
      cantidad: number;
    }[];
  };
  rankings: {
    colaboradores_destacados: {
      usuario_id: number;
      nombres: string;
      servicios_completados: number;
      tareas_completadas: number;
      eficiencia: number;
    }[];
  };
  servicios_activos: {
    id: number;
    codigo: string;
    estado: string;
    descripcion: string;
    cliente: string;
    tiempo_en_curso: number;
    ultima_actualizacion: string | null;
    progreso_porcentaje: number;
    prioridad: string;
  }[];
  period_comparison?: {
    actual: {
      servicios_completados: number;
      tareas_completadas: number;
      tiempo_promedio: number;
    };
    anterior: {
      servicios_completados: number;
      tareas_completadas: number;
      tiempo_promedio: number;
    };
    variacion: {
      servicios: number;
      tareas: number;
      tiempo: number;
    };
  };
}

// ── Rendimiento del Sistema (admin) ──
export interface RendimientoResponse {
  visit_tracking: {
    total_visitas: number;
    servicios_mas_consultados: {
      servicio_id: number;
      codigo: string;
      nombre: string;
      visitas: number;
      ultima_visita: string | null;
    }[];
    visitas_por_dia: {
      fecha: string;
      cantidad: number;
    }[];
    promedio_visitas_por_servicio: number;
  };
  performance: {
    servicios_completados: number;
    servicios_en_progreso: number;
    servicios_pendientes: number;
    servicios_bloqueados: number;
    tiempo_promedio_completado_min: number;
    tasa_completacion: number;
    tareas_completadas: number;
    tareas_pendientes: number;
    tasa_completacion_tareas: number;
  };
  calificaciones: {
    promedio_calificacion: number;
    total_calificaciones: number;
    calificaciones_por_puntaje: { puntaje: number; cantidad: number }[];
    ultimas_calificaciones: {
      servicio_codigo: string;
      servicio_nombre: string;
      puntaje: number;
      comentario: string | null;
      fecha: string;
    }[];
  };
  colaboradores: {
    colaboradores_con_tareas: number;
    top_colaboradores: {
      usuario_id: number;
      nombres: string;
      total_tareas: number;
    }[];
  };
  sistema: {
    total_usuarios: number;
    total_areas: number;
    total_clientes: number;
    total_servicios: number;
    tasa_servicios_con_calificacion: number;
    dias_datos: number;
  };
}

// ── Manager ──
export interface ManagerMiAreaResponse {
  area: Area;
  servicios: (Servicio & {
    descripcion: string | null;
    prioridad: string;
    tecnico: { id: number; nombres: string | null } | null;
    progreso: number;
    total_tareas: number;
    tareas_completadas: number;
  })[];
  estado_counts: {
    total: number;
    pendiente: number;
    en_progreso: number;
    completado: number;
    bloqueado: number;
    cancelado: number;
  };
  colaboradores: {
    usuario_id: number;
    id: number;
    nombres: string;
    email: string;
    username: string;
    rol: string;
    tareas_activas: number;
    tareas_completadas: number;
    servicios_completados: number;
    calificacion_promedio: number | null;
    servicios_asignados: {
      id: number;
      codigo: string | null;
      titulo: string | null;
      estado: string | null;
    }[];
  }[];
}

export interface ManagerDistribucionItem {
  id: number;
  titulo: string;
  servicio_id: number;
  servicio_titulo: string;
  servicio_codigo: string;
  asignado_a: number | null;
  asignado_nombre: string | null;
  tiempo_estimado: number | null;
  orden: number;
  created_at: string;
}

export interface ManagerDesempenoResponse {
  colaborador: {
    id: number;
    nombres: string;
    email: string;
    username: string;
    rol: string;
  };
  periodo: {
    desde: string;
    hasta: string;
  };
  tareas_completadas: {
    id: number;
    titulo: string;
    servicio_id: number;
    servicio_titulo: string;
    servicio_codigo: string;
    tiempo_estimado: number | null;
    completada_at: string;
  }[];
  total_tareas: number;
  tiempo_promedio_por_tarea: number;
  tiempo_total_minutos: number;
  eficiencia: number;
  servicios_completados: number;
}

export interface AreaServiciosResponse {
  area: Area;
  servicios: Servicio[];
  estado_counts: {
    total: number;
    pendiente: number;
    en_progreso: number;
    completado: number;
    bloqueado: number;
    cancelado: number;
  };
  tiempo_promedio: number;
}

// ── Waiting Room Response ──
export interface SalaEsperaResponse {
  codigo: string;
  estado: string;
  progreso_porcentaje: number;
  tiempo_transcurrido: number;
  tiempo_estimado: number | null;
  posicion_fila: number;
  eta_estimado: number | null;
}

// ── Area Listing (with encargado details) ──
export interface AreaWithEncargado extends Area {
  encargado_nombres: string | null;
  encargado_email: string | null;
  encargado_username: string | null;
  colaborador_count: number;
}

// ── Dashboard Filters ──
export interface DashboardFilters {
  fecha_inicio?: string;
  fecha_fin?: string;
  area_id?: number;
  comparar_periodo?: boolean;
}

// ── Solicitud Interna ──
export interface Solicitud {
  id: number;
  usuario_id: number;
  tipo: "apoyo" | "herramienta" | "equipo" | "otro";
  descripcion: string;
  estado: "pendiente" | "en_proceso" | "resuelto" | "rechazado";
  prioridad: "baja" | "media" | "alta" | "urgente";
  atendido_por: number | null;
  respuesta: string | null;
  created_at: string;
  atendido_por_usuario?: { nombres: string; username: string } | null;
  usuario?: { nombres: string; username: string } | null;
}

// ── Anuncio ──
export interface Anuncio {
  id: number;
  usuario_id: number;
  titulo: string;
  contenido: string;
  activo: boolean;
  prioridad: "informativo" | "importante" | "urgente";
  area_id: number | null;
  area_nombre?: string | null;
  fecha_publicacion: string;
  fecha_expiracion: string | null;
  created_at: string;
  usuario?: { nombres: string; username: string } | null;
}
