import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serviciosApi, seguimientoApi } from "@/api/client.js";
import { toast } from "sonner";
import type { Servicio, Tarea } from "@shared/index.js";

export function useServicios(params?: { estado?: string; archivados?: string; incluir_archivados?: string }) {
  return useQuery({
    queryKey: ["servicios", params],
    queryFn: async () => {
      const r = await serviciosApi.listar(params);
      return r.data.data as Servicio[];
    },
  });
}

export function useServicio(id: number) {
  return useQuery({
    queryKey: ["servicios", id],
    queryFn: async () => {
      const r = await serviciosApi.obtener(id);
      return r.data.data as Servicio;
    },
    enabled: !!id,
  });
}

export function useCrearServicio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => serviciosApi.crear(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servicios"] });
      toast.success("Servicio creado");
    },
    // El componente maneja los errores campo por campo en su catch
  });
}

export function useEditarServicio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => serviciosApi.editar(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servicios"] });
      toast.success("Servicio actualizado");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Error al actualizar"),
  });
}

export function useCambiarEstado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado, motivo }: { id: number; estado: string; motivo?: string }) =>
      serviciosApi.cambiarEstado(id, estado, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servicios"] });
      toast.success("Estado actualizado");
    },
  });
}

// -- Tareas --

export function useTareas(servicioId: number) {
  return useQuery({
    queryKey: ["tareas", servicioId],
    queryFn: async () => {
      const r = await serviciosApi.listarTareas(servicioId);
      return r.data.data as Tarea[];
    },
    enabled: !!servicioId,
  });
}

export function useCrearTarea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ servicioId, data }: { servicioId: number; data: any }) =>
      serviciosApi.crearTarea(servicioId, data),
    onSuccess: (_, { servicioId }) => {
      qc.invalidateQueries({ queryKey: ["tareas", servicioId] });
      qc.invalidateQueries({ queryKey: ["servicios"] });
    },
  });
}

export function useCompletarTarea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => serviciosApi.completarTarea(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tareas"] });
      toast.success("Tarea completada");
    },
  });
}

export function useReabrirTarea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => serviciosApi.reabrirTarea(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tareas"] });
      toast.success("Tarea reabierta");
    },
  });
}

export function useEliminarTarea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => serviciosApi.eliminarTarea(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tareas"] });
      toast.success("Tarea eliminada");
    },
  });
}

export function useEditarTareaInline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ servicioId, tareaId, data }: { servicioId: number; tareaId: number; data: { titulo?: string } }) =>
      serviciosApi.editarTareaInline(servicioId, tareaId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tareas"] });
      toast.success("Tarea actualizada");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Error al actualizar"),
  });
}

export function useArchivarServicio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => serviciosApi.archive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servicios"] });
      toast.success("Servicio archivado");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Error al archivar"),
  });
}

export function useDesarchivarServicio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => serviciosApi.unarchive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servicios"] });
      toast.success("Servicio restaurado");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Error al restaurar"),
  });
}

export function useIniciarServicio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => serviciosApi.iniciar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servicios"] });
      toast.success("Servicio iniciado");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Error al iniciar servicio"),
  });
}

export function useReordenarTareas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tareas: { id: number; orden: number }[]) =>
      serviciosApi.reordenarTareas(tareas),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tareas"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Error al reordenar"),
  });
}

export function useTodosTiempos(servicioId: number) {
  return useQuery({
    queryKey: ["tiempos-servicio", servicioId],
    queryFn: async () => {
      // Get all tareas first, then their time tracking
      const r = await serviciosApi.listarTareas(servicioId);
      const tareasList = r.data.data as Tarea[];
      const tiemposPromises = tareasList.map(async (tarea) => {
        try {
          const tr = await seguimientoApi.listarTiempo(tarea.id);
          return { tarea_id: tarea.id, registros: tr.data.data || [] };
        } catch {
          return { tarea_id: tarea.id, registros: [] };
        }
      });
      return Promise.all(tiemposPromises);
    },
    enabled: !!servicioId,
  });
}
