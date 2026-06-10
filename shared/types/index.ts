// ── Roles ──
export type Rol = "admin" | "encargado" | "colaborador";

// ── Estado de servicio ──
export type EstadoServicio = "pendiente" | "en_progreso" | "completado" | "cancelado";

// ── Usuario ──
export interface Usuario {
  id: number;
  username: string;
  nombres: string;
  email: string;
  rol: Rol;
  activo: boolean;
  created_at: string;
}

// ── Servicio ──
export interface Servicio {
  id: number;
  codigo: string;
  titulo: string;
  descripcion: string | null;
  estado: EstadoServicio;
  cliente_nombre: string;
  cliente_email: string | null;
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
  created_at: string;
}

// ── Time Tracking ──
export interface TiempoTracking {
  id: number;
  tarea_id: number;
  usuario_id: number;
  inicio: string;
  pausa_at: string | null;
  fin: string | null;
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
