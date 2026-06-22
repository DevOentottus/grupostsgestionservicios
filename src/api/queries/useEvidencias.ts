import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { evidenciasApi } from "@/api/client.js";
import type { Evidencia, EvidenciaComentario } from "@shared/index.js";

export function useEvidencias(servicioId: number) {
  return useQuery({
    queryKey: ["evidencias", servicioId],
    queryFn: async () => {
      const r = await evidenciasApi.listarPorServicio(servicioId);
      return r.data.data as (Evidencia & { comentarios: EvidenciaComentario[] })[];
    },
    enabled: !!servicioId,
  });
}

export function useUploadEvidencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof evidenciasApi.upload>[0]) =>
      evidenciasApi.upload(data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["evidencias", variables.servicio_id] });
    },
  });
}

export function useAgregarComentarioEvidencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ evidenciaId, contenido }: { evidenciaId: number; contenido: string }) =>
      evidenciasApi.agregarComentario(evidenciaId, { contenido }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evidencias"] });
    },
  });
}

export function useCambiarEstadoEvidencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ evidenciaId, estado, motivo }: { evidenciaId: number; estado: string; motivo?: string }) =>
      evidenciasApi.cambiarEstado(evidenciaId, estado, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evidencias"] });
    },
  });
}

export function useCambiarMostrarCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ evidenciaId, mostrar_cliente }: { evidenciaId: number; mostrar_cliente: boolean }) =>
      evidenciasApi.cambiarMostrarCliente(evidenciaId, mostrar_cliente),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evidencias"] });
    },
  });
}

export function useConfigurarEvidenciaTarea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tareaId, data }: { tareaId: number; data: Parameters<typeof evidenciasApi.configurarTarea>[1] }) =>
      evidenciasApi.configurarTarea(tareaId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servicios"] });
    },
  });
}
