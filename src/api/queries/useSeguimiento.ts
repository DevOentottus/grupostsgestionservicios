import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { seguimientoApi } from "@/api/client.js";
import { toast } from "sonner";
import type { DashboardKPI } from "@shared/index.js";

// ── Time Tracking ──
export function useIniciarTiempo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tareaId: number) => seguimientoApi.iniciarTiempo(tareaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tiempo"] });
      toast.success("Cronómetro iniciado");
    },
  });
}

export function usePausarTiempo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => seguimientoApi.pausarTiempo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tiempo"] });
      toast.success("Cronómetro pausado");
    },
  });
}

export function useFinalizarTiempo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => seguimientoApi.finalizarTiempo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tiempo"] });
      toast.success("Tiempo registrado");
    },
  });
}

export function useListarTiempo(tareaId: number) {
  return useQuery({
    queryKey: ["tiempo", tareaId],
    queryFn: async () => {
      const r = await seguimientoApi.listarTiempo(tareaId);
      return r.data.data;
    },
    enabled: !!tareaId,
  });
}

// ── Encuestas ──
export function useCrearEncuesta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ servicioId, data }: { servicioId: number; data: any }) =>
      seguimientoApi.crearEncuesta(servicioId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["encuesta"] });
      toast.success("Encuesta enviada");
    },
  });
}

// ── Dashboard ──
export function useDashboard(desde?: string, hasta?: string) {
  return useQuery({
    queryKey: ["dashboard", desde, hasta],
    queryFn: async () => {
      const r = await seguimientoApi.dashboard({ desde, hasta });
      return r.data.data as {
        kpi: DashboardKPI;
        servicios_recientes: any[];
        total_servicios: number;
        completados: number;
      };
    },
  });
}
