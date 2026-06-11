import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { anunciosApi } from "@/api/client.js";
import { toast } from "sonner";
import type { Anuncio } from "@shared/index.js";

export function useAnuncios() {
  return useQuery({
    queryKey: ["anuncios", "activos"],
    queryFn: async () => {
      const r = await anunciosApi.listar();
      return r.data.data as Anuncio[];
    },
  });
}

export function useTodosAnuncios() {
  return useQuery({
    queryKey: ["anuncios", "todos"],
    queryFn: async () => {
      const r = await anunciosApi.listarTodos();
      return r.data.data as Anuncio[];
    },
  });
}

export function useCrearAnuncio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { titulo: string; contenido: string; prioridad?: string; area_id?: number | null; fecha_expiracion?: string }) =>
      anunciosApi.crear(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["anuncios"] });
      toast.success("Anuncio creado");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Error al crear anuncio"),
  });
}

export function useEditarAnuncio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => anunciosApi.editar(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["anuncios"] });
      toast.success("Anuncio actualizado");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Error al actualizar anuncio"),
  });
}

export function useEliminarAnuncio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => anunciosApi.eliminar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["anuncios"] });
      toast.success("Anuncio eliminado");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Error al eliminar anuncio"),
  });
}
