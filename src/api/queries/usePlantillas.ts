import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { plantillasApi } from "@/api/client.js";
import { toast } from "sonner";
import type { PlantillaProceso, PlantillaTarea } from "@shared/index.js";

export interface PlantillaWithTareas extends PlantillaProceso {
  tareas: PlantillaTarea[];
}

export interface PlantillaListItem extends PlantillaProceso {
  tareas_count: number;
  es_favorito?: boolean;
}

export function usePlantillas() {
  return useQuery({
    queryKey: ["plantillas"],
    queryFn: async () => {
      const r = await plantillasApi.listar();
      return r.data.data as PlantillaListItem[];
    },
  });
}

export function usePlantilla(id: number) {
  return useQuery({
    queryKey: ["plantillas", id],
    queryFn: async () => {
      const r = await plantillasApi.obtener(id);
      return r.data.data as PlantillaWithTareas;
    },
    enabled: !!id,
  });
}

export function useCrearPlantilla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      nombre: string;
      descripcion?: string | null;
      area_id?: number | null;
      tareas?: { titulo: string; sort_order?: number }[];
    }) => plantillasApi.crear(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plantillas"] });
      toast.success("Plantilla creada");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || "Error al crear plantilla"),
  });
}

export function useEditarPlantilla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        nombre?: string;
        descripcion?: string | null;
        area_id?: number | null;
        tareas?: {
          id?: number;
          titulo: string;
          sort_order?: number;
        }[];
      };
    }) => plantillasApi.editar(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["plantillas"] });
      qc.invalidateQueries({ queryKey: ["plantillas", id] });
      toast.success("Plantilla actualizada");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || "Error al actualizar plantilla"),
  });
}

export function useEliminarPlantilla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => plantillasApi.eliminar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plantillas"] });
      toast.success("Plantilla eliminada");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || "Error al eliminar plantilla"),
  });
}

export function useAplicarPlantilla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      plantillaId,
      servicioId,
    }: {
      plantillaId: number;
      servicioId: number;
    }) => plantillasApi.aplicar(plantillaId, servicioId),
    onSuccess: (_, { servicioId }) => {
      qc.invalidateQueries({ queryKey: ["tareas", servicioId] });
      qc.invalidateQueries({ queryKey: ["servicios", servicioId] });
      toast.success("Plantilla aplicada al servicio");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || "Error al aplicar plantilla"),
  });
}

export function useToggleFavorito() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plantillaId: number) => plantillasApi.toggleFavorito(plantillaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plantillas"] });
    },
  });
}
