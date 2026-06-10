import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serviciosApi } from "@/api/client.js";
import { toast } from "sonner";
import type { Servicio, Tarea } from "@shared/index.js";

export function useServicios(estado?: string) {
  return useQuery({
    queryKey: ["servicios", estado],
    queryFn: async () => {
      const r = await serviciosApi.listar(estado ? { estado } : undefined);
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
    onError: (err: any) => toast.error(err.response?.data?.detail || "Error al crear"),
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
    mutationFn: ({ id, estado }: { id: number; estado: string }) =>
      serviciosApi.cambiarEstado(id, estado),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servicios"] });
      toast.success("Estado actualizado");
    },
  });
}

// ── Tareas ──

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
      toast.success("Tarea agregada");
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
