import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Interceptor: adjuntar JWT
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor: manejar 401
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export interface ApiResponse<T> {
  data: T;
}

// ── Auth API ──
export const authApi = {
  login: (username: string, password: string) =>
    api.post<ApiResponse<{ token: string; user: any }>>("/auth/login", { username, password }),
  me: () => api.get("/auth/me"),
};

// ── Usuarios API ──
export const usuariosApi = {
  listar: () => api.get("/usuarios"),
  crear: (data: any) => api.post("/usuarios", data),
  editar: (id: number, data: any) => api.put(`/usuarios/${id}`, data),
  toggleEstado: (id: number) => api.patch(`/usuarios/${id}/estado`),
};

// ── Servicios API ──
export const serviciosApi = {
  listar: (params?: any) => api.get("/servicios", { params }),
  obtener: (id: number) => api.get(`/servicios/${id}`),
  crear: (data: any) => api.post("/servicios", data),
  editar: (id: number, data: any) => api.put(`/servicios/${id}`, data),
  cambiarEstado: (id: number, estado: string) =>
    api.patch(`/servicios/${id}/estado`, { estado }),
  // Tareas
  listarTareas: (servicioId: number) => api.get(`/servicios/${servicioId}/tareas`),
  crearTarea: (servicioId: number, data: any) =>
    api.post(`/servicios/${servicioId}/tareas`, data),
  editarTarea: (id: number, data: any) => api.put(`/tareas/${id}`, data),
  eliminarTarea: (id: number) => api.delete(`/tareas/${id}`),
  completarTarea: (id: number) => api.patch(`/tareas/${id}/completar`),
  reabrirTarea: (id: number) => api.patch(`/tareas/${id}/reabrir`),
  reordenarTareas: (tareas: { id: number; orden: number }[]) =>
    api.put("/tareas/reordenar", { tareas }),
};

// ── Seguimiento API ──
export const seguimientoApi = {
  // Time tracking
  iniciarTiempo: (tareaId: number) => api.post(`/tareas/${tareaId}/tiempo/iniciar`),
  pausarTiempo: (id: number) => api.patch(`/tiempo/${id}/pausar`),
  reanudarTiempo: (id: number) => api.patch(`/tiempo/${id}/reanudar`),
  finalizarTiempo: (id: number) => api.patch(`/tiempo/${id}/finalizar`),
  listarTiempo: (tareaId: number) => api.get(`/tareas/${tareaId}/tiempo`),
  // Encuestas
  crearEncuesta: (servicioId: number, data: any) =>
    api.post(`/servicios/${servicioId}/encuesta`, data),
  obtenerEncuesta: (servicioId: number) => api.get(`/servicios/${servicioId}/encuesta`),
  // Dashboard
  dashboard: (params?: any) => api.get("/dashboard", { params }),
};
