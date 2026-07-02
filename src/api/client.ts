import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// -- Refresh token queue --
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(newToken: string | null, error: unknown) {
  for (const { resolve, reject } of pendingQueue) {
    if (error) reject(error);
    else resolve(newToken!);
  }
  pendingQueue = [];
}

// Interceptor: adjuntar JWT
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor: manejar 401 con refresh automático
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const originalRequest = error.config;

    // No es 401, o ya se reintentó, o es la misma request de refresh
    const is401 = error.response?.status === 401;
    if (
      !is401 ||
      originalRequest._retry ||
      originalRequest.url === "/auth/refresh"
    ) {
      return Promise.reject(error);
    }

    // Sesión revocada → no intentar refresh, ir directo a login
    if (error.response?.data?.title === "SESSION_REVOKED") {
      sessionStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_user");
      window.location.href = "/login?revoked=true";
      return Promise.reject(error);
    }

    // Si ya estamos refrescando, encolar
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const oldToken = sessionStorage.getItem("auth_token");
      if (!oldToken) throw new Error("No hay token");

      const { data } = await api.post("/auth/refresh", null, {
        headers: { Authorization: `Bearer ${oldToken}` },
      });

      const newToken = data.data.token;
      sessionStorage.setItem("auth_token", newToken);

      processQueue(newToken, null);

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(null, refreshError);
      sessionStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_user");
      // Si el refresh falló por sesión revocada, pasar el mensaje
      const err = refreshError as { response?: { data?: { title?: string } } };
      const isRevoked = err?.response?.data?.title === "SESSION_REVOKED";
      window.location.href = isRevoked ? "/login?revoked=true" : "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export interface ApiResponse<T> {
  data: T;
}

// -- Auth API --
export const authApi = {
  login: (username: string, password: string) =>
    api.post<ApiResponse<{ token: string; user: any }>>("/auth/login", {
      username,
      password,
    }),
  me: () => api.get("/auth/me"),
  refresh: (token: string) =>
    api.post<ApiResponse<{ token: string }>>("/auth/refresh", null, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  cambiarPassword: (current_password: string, new_password: string) =>
    api.patch("/auth/password", { current_password, new_password }),
};

// -- Usuarios API --
export const usuariosApi = {
  listar: () => api.get("/usuarios"),
  crear: (data: any) => api.post("/usuarios", data),
  editar: (id: number, data: any) => api.put(`/usuarios/${id}`, data),
  toggleEstado: (id: number) => api.patch(`/usuarios/${id}/estado`, {}),
  cambiarPassword: (id: number, password: string) =>
    api.put(`/usuarios/${id}/password`, { password }),
};

// -- Áreas API --
export const areasApi = {
  listar: () => api.get("/areas"),
  listarTodas: () => api.get("/areas", { params: { todas: "true" } }),
  obtener: (id: number) => api.get(`/areas/${id}`),
  crear: (data: any) => api.post("/areas", data),
  editar: (id: number, data: any) => api.put(`/areas/${id}`, data),
  eliminar: (id: number) => api.delete(`/areas/${id}`),
  asignarColaborador: (areaId: number, usuarioId: number) =>
    api.post(`/areas/${areaId}/colaboradores`, { usuario_id: usuarioId }),
  removerColaborador: (areaId: number, usuarioId: number) =>
    api.delete(`/areas/${areaId}/colaboradores/${usuarioId}`),
  listarServicios: (areaId: number) => api.get(`/areas/${areaId}/servicios`),
};

// -- Servicios API --
export const serviciosApi = {
  listar: (params?: any) => api.get("/servicios", { params }),
  obtener: (id: number) => api.get(`/servicios/${id}`),
  obtenerServicioPublico: (codigo: string) =>
    api.get(`/public/servicios/${codigo}`),
  crear: (data: any) => api.post("/servicios", data),
  editar: (id: number, data: any) => api.put(`/servicios/${id}`, data),
  cambiarEstado: (id: number, estado: string, motivo?: string) =>
    api.patch(`/servicios/${id}/estado`, { estado, motivo }),
  cambiarEstadoMotivo: (id: number, estado: string, motivo: string) =>
    api.patch(`/servicios/${id}/estado`, { estado, motivo }),
  iniciar: (id: number) => api.post(`/servicios/${id}/iniciar`, {}),
  // Tareas
  listarTareas: (servicioId: number) => api.get(`/servicios/${servicioId}/tareas`),
  crearTarea: (servicioId: number, data: any) =>
    api.post(`/servicios/${servicioId}/tareas`, data),
  editarTarea: (id: number, data: any) => api.put(`/tareas/${id}`, data),
  eliminarTarea: (id: number) => api.delete(`/tareas/${id}`),
  editarTareaInline: (servicioId: number, tareaId: number, data: { titulo?: string }) =>
    api.patch(`/servicios/${servicioId}/tareas/${tareaId}`, data),
  completarTarea: (id: number) => api.patch(`/tareas/${id}/completar`, {}),
  reabrirTarea: (id: number) => api.patch(`/tareas/${id}/reabrir`, {}),
  reordenarTareas: (tareas: { id: number; orden: number }[]) =>
    api.put("/tareas/reordenar", { tareas }),
};

// -- Plantillas API --
export const plantillasApi = {
  listar: () => api.get("/plantillas"),
  obtener: (id: number) => api.get(`/plantillas/${id}`),
  crear: (data: any) => api.post("/plantillas", data),
  editar: (id: number, data: any) => api.put(`/plantillas/${id}`, data),
  eliminar: (id: number) => api.delete(`/plantillas/${id}`),
  aplicar: (plantillaId: number, servicioId: number) =>
    api.post(`/plantillas/${plantillaId}/aplicar/${servicioId}`),
  toggleFavorito: (id: number) => api.post(`/plantillas/favoritos/${id}`),
};

// -- Seguimiento API --
// -- Comentarios API --
export const comentariosApi = {
  listar: (servicioId: number) =>
    api.get(`/servicios/${servicioId}/comentarios`),
  crear: (servicioId: number, data: { contenido: string; tarea_id?: number }) =>
    api.post(`/servicios/${servicioId}/comentarios`, data),
  eliminar: (id: number) => api.delete(`/comentarios/${id}`),
};

// -- Auditoria API --
export const auditoriaApi = {
  listar: (params?: {
    page?: number;
    limit?: number;
    entidad?: string;
    usuario_id?: number;
    fecha_desde?: string;
    fecha_hasta?: string;
  }) => api.get("/auditoria", { params }),
};

export const seguimientoApi = {
  // Time tracking
  iniciarTiempo: (tareaId: number) => api.post(`/tareas/${tareaId}/tiempo/iniciar`),
  pausarTiempo: (id: number) => api.patch(`/tiempo/${id}/pausar`, {}),
  reanudarTiempo: (id: number) => api.patch(`/tiempo/${id}/reanudar`, {}),
  finalizarTiempo: (id: number) => api.patch(`/tiempo/${id}/finalizar`, {}),
  listarTiempo: (tareaId: number) => api.get(`/tareas/${tareaId}/tiempo`),
  tiemposServicio: (servicioId: number) => api.get(`/servicios/${servicioId}/tiempos`),
  // Encuestas
  crearEncuesta: (servicioId: number, data: any) =>
    api.post(`/servicios/${servicioId}/encuesta`, data),
  obtenerEncuesta: (servicioId: number) => api.get(`/servicios/${servicioId}/encuesta`),
  // Dashboard
  dashboard: (params?: any) => api.get("/dashboard", { params }),
};

// -- Display API --
export const displayApi = {
  tv: () => api.get("/public/display/tv"),
  trabajo: () => api.get("/display/trabajo"),
  salaEspera: (codigo: string) => api.get(`/public/display/sala-espera/${codigo}`),
};

// -- Reportes API --
export const reportesApi = {
  colaborador: (params?: {
    fecha_inicio?: string;
    fecha_fin?: string;
    usuario_id?: number;
  }) => api.get("/reportes/colaborador", { params }),
  area: (params?: {
    fecha_inicio?: string;
    fecha_fin?: string;
    area_id?: number;
  }) => api.get("/reportes/area", { params }),
  exportar: (
    tipo: "colaborador" | "area",
    formato: "xlsx" | "pdf",
    params?: { fecha_inicio?: string; fecha_fin?: string; area_id?: number; usuario_id?: number }
  ) =>
    api.get(`/reportes/exportar/${tipo}/${formato}`, {
      params,
      responseType: "blob",
    }),
};

// -- Solicitudes API --

// -- Rendimiento API --
export const rendimientoApi = {
  getRendimiento: () => api.get("/admin/rendimiento"),
};

// -- Dashboard v2 API --
export const dashboardApi = {
  getAll: (filters?: {
    fecha_inicio?: string;
    fecha_fin?: string;
    area_id?: number;
    comparar_periodo?: boolean;
    comparar_fecha_inicio?: string;
    comparar_fecha_fin?: string;
  }) => api.get("/dashboard", { params: filters }),
};

// -- Evidencias API --
export const evidenciasApi = {
  upload: (data: {
    servicio_id: number;
    tarea_id: number;
    tipo: "photo" | "video";
    archivo_base64: string;
    content_type?: string;
    comentario?: string;
  }) => api.post("/evidencias/upload", data),
  listarPorServicio: (servicioId: number) =>
    api.get(`/servicios/${servicioId}/evidencias`),
  agregarComentario: (evidenciaId: number, data: { contenido: string }) =>
    api.post(`/evidencias/${evidenciaId}/comentario`, data),
  cambiarEstado: (evidenciaId: number, estado: string, motivo?: string) =>
    api.patch(`/evidencias/${evidenciaId}/estado`, { estado, ...(motivo ? { motivo } : {}) }),
  cambiarMostrarCliente: (evidenciaId: number, mostrar_cliente: boolean) =>
    api.patch(`/evidencias/${evidenciaId}/mostrar-cliente`, { mostrar_cliente }),
  configurarTarea: (tareaId: number, data: {
    requiere_evidencia?: boolean;
    modo_evidencia?: string | null;
    evidencia_desactivada?: boolean;
  }) => api.patch(`/tareas/${tareaId}/evidencia-config`, data),
};

// -- Audio API --
export const audioApi = {
  upload: (data: {
    audio_base64: string;
    content_type: string;
  }) => api.post<ApiResponse<{ url: string }>>("/upload/audio", data),
};

// -- Evidencias Públicas API --
export const evidenciasPublicApi = {
  listarPorCodigo: (codigo: string, dni?: string) =>
    api.get(`/public/servicios/${codigo}/evidencias`, {
      params: dni ? { dni } : undefined,
    }),
  agregarComentario: (evidenciaId: number, data: {
    contenido: string;
    codigo: string;
    dni?: string;
  }) => api.post(`/public/evidencias/${evidenciaId}/comentario`, data),
};

// -- Manager API --
export const managerApi = {
  miArea: (areaId?: number) =>
    api.get("/manager/mi-area", {
      params: areaId ? { area_id: areaId } : undefined,
    }),
  distribucion: (params?: { area_id?: number; colaborador_id?: number }) =>
    api.get("/manager/distribucion", { params }),
  desempeno: (
    usuarioId: number,
    params?: { fecha_inicio?: string; fecha_fin?: string }
  ) => api.get(`/manager/desempeno/${usuarioId}`, { params }),
  clientes: () => api.get("/manager/clientes"),
};

// -- Notificaciones API --
export const notificacionesApi = {
  enviar: (data: { usuario_id: number; titulo: string; mensaje: string; tipo?: string; referencia_id?: number }) =>
    api.post("/notificaciones/enviar", data),
  listar: (params?: { page?: number; limit?: number }) =>
    api.get("/notificaciones", { params }),
  marcarLeida: (id: number) =>
    api.patch(`/notificaciones/${id}/leer`, {}),
  marcarTodasLeidas: () =>
    api.patch("/notificaciones/leer-todas", {}),
  noLeidas: () =>
    api.get("/notificaciones/no-leidas"),
};

// -- Ofertas API --
export const ofertasApi = {
  listar: () => api.get("/ofertas"),
  imagenUrl: (filename: string) => `${API_BASE_URL}/api/ofertas/imagen/${encodeURIComponent(filename)}`,
};

// -- Seguridad API --
export const seguridadApi = {
  resumen: () => api.get("/seguridad/resumen"),
  intentosFallidos: (params?: {
    page?: number;
    limit?: number;
    desde?: string;
    hasta?: string;
    username?: string;
  }) => api.get("/seguridad/intentos-fallidos", { params }),
  sesiones: (params?: { page?: number; limit?: number }) =>
    api.get("/seguridad/sesiones", { params }),
  revocarSesion: (id: number) => api.delete(`/seguridad/sesiones/${id}`),
  actividadSospechosa: (params?: { page?: number; limit?: number }) =>
    api.get("/seguridad/sospechoso", { params }),
  exportar: (tipo: string, params?: { desde?: string; hasta?: string }) =>
    api.get(`/seguridad/exportar/${tipo}`, { params, responseType: "blob" }),
  cleanup: () => api.post("/seguridad/cleanup"),
};
