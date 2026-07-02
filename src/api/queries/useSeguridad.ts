import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { seguridadApi } from "@/api/client.js";
import type {
  SeguridadResumen,
  LoginAttempt,
  SesionActiva,
  ActividadSospechosa,
  PaginationMeta,
} from "@shared/index.js";

// --- Resumen ---
export function useResumenSeguridad() {
  return useQuery<SeguridadResumen>({
    queryKey: ["seguridad", "resumen"],
    queryFn: async () => {
      const r = await seguridadApi.resumen();
      return r.data.data as SeguridadResumen;
    },
    refetchInterval: 60_000,
  });
}

// --- Intentos Fallidos ---
export function useIntentosFallidos(
  params?: {
    page?: number;
    limit?: number;
    desde?: string;
    hasta?: string;
    username?: string;
  }
) {
  return useQuery<{ data: LoginAttempt[]; meta: PaginationMeta }>({
    queryKey: ["seguridad", "intentos-fallidos", params],
    queryFn: async () => {
      const r = await seguridadApi.intentosFallidos(params);
      return r.data as { data: LoginAttempt[]; meta: PaginationMeta };
    },
    refetchInterval: 30_000,
  });
}

// --- Sesiones Activas ---
export function useSesionesActivas(params?: { page?: number; limit?: number }) {
  return useQuery<{ data: SesionActiva[]; meta: PaginationMeta }>({
    queryKey: ["seguridad", "sesiones", params],
    queryFn: async () => {
      const r = await seguridadApi.sesiones(params);
      return r.data as { data: SesionActiva[]; meta: PaginationMeta };
    },
    refetchInterval: 60_000,
  });
}

// --- Revocar Sesión ---
export function useRevocarSesion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const r = await seguridadApi.revocarSesion(id);
      return r.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seguridad", "sesiones"] });
    },
  });
}

// --- Actividad Sospechosa ---
export function useActividadSospechosa(params?: { page?: number; limit?: number }) {
  return useQuery<{ data: ActividadSospechosa[]; meta: PaginationMeta }>({
    queryKey: ["seguridad", "sospechoso", params],
    queryFn: async () => {
      const r = await seguridadApi.actividadSospechosa(params);
      return r.data as { data: ActividadSospechosa[]; meta: PaginationMeta };
    },
    refetchInterval: 30_000,
  });
}

// --- Exportar Logs ---
export function useExportarLogs() {
  return useMutation({
    mutationFn: async ({
      tipo,
      params,
    }: {
      tipo: string;
      params?: { desde?: string; hasta?: string };
    }) => {
      const r = await seguridadApi.exportar(tipo, params);
      return r.data;
    },
  });
}

// --- Cleanup ---
export function useCleanupSeguridad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const r = await seguridadApi.cleanup();
      return r.data.data as { deleted_login_attempts: number; deleted_sessions: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seguridad"] });
    },
  });
}
