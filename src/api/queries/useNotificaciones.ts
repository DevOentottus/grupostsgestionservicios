import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificacionesApi } from "@/api/client.js";

export interface Notificacion {
  id: number;
  usuario_id: number;
  titulo: string;
  mensaje: string;
  tipo: string | null;
  referencia_id: number | null;
  leida: boolean;
  created_at: string;
}

export function useNotificaciones(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["notificaciones", page, limit],
    queryFn: async () => {
      const r = await notificacionesApi.listar({ page, limit });
      return r.data.data as Notificacion[];
    },
    refetchInterval: 30_000,
  });
}

export function useNotificacionesNoLeidas() {
  return useQuery({
    queryKey: ["notificaciones", "no-leidas"],
    queryFn: async () => {
      try {
        const r = await notificacionesApi.noLeidas();
        return (r.data.data ?? 0) as number;
      } catch {
        return 0;
      }
    },
    refetchInterval: 15_000,
    retry: false,
  });
}

export function useMarcarLeida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificacionesApi.marcarLeida(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notificaciones"] });
    },
  });
}

export function useMarcarTodasLeidas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificacionesApi.marcarTodasLeidas(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notificaciones"] });
    },
  });
}
