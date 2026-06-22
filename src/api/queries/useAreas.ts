import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { areasApi } from "@/api/client.js";
import { toast } from "sonner";
import type { Area, AreaWithColaboradores, AreaWithEncargado } from "@shared/index.js";

export function useAreas() {
  return useQuery({
    queryKey: ["areas"],
    queryFn: async () => {
      const r = await areasApi.listar();
      return r.data.data as AreaWithEncargado[];
    },
  });
}

export function useAreasTodas() {
  return useQuery({
    queryKey: ["areas", "todas"],
    queryFn: async () => {
      const r = await areasApi.listarTodas();
      return r.data.data as AreaWithEncargado[];
    },
  });
}

export function useArea(id: number) {
  return useQuery({
    queryKey: ["areas", id],
    queryFn: async () => {
      const r = await areasApi.obtener(id);
      return r.data.data as AreaWithColaboradores;
    },
    enabled: !!id,
  });
}

export function useCrearArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { nombre: string; encargado_id?: number | null }) =>
      areasApi.crear(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["areas"] });
      toast.success("Área creada");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || "Error al crear área"),
  });
}

export function useEditarArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { nombre?: string; encargado_id?: number | null };
    }) => areasApi.editar(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["areas"] });
      toast.success("Área actualizada");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || "Error al actualizar área"),
  });
}

export function useEliminarArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => areasApi.eliminar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["areas"] });
      toast.success("Área eliminada");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || "Error al eliminar área"),
  });
}

export function useAsignarColaborador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      areaId,
      usuarioId,
    }: {
      areaId: number;
      usuarioId: number;
    }) => areasApi.asignarColaborador(areaId, usuarioId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["areas"] });
      qc.invalidateQueries({ queryKey: ["areas", variables.areaId] });
      toast.success("Colaborador asignado");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || "Error al asignar colaborador"),
  });
}

export function useRemoverColaborador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      areaId,
      usuarioId,
    }: {
      areaId: number;
      usuarioId: number;
    }) => areasApi.removerColaborador(areaId, usuarioId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["areas"] });
      qc.invalidateQueries({ queryKey: ["areas", variables.areaId] });
      toast.success("Colaborador removido");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || "Error al remover colaborador"),
  });
}
