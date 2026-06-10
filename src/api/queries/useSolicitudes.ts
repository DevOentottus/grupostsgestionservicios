import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { solicitudesApi } from "@/api/client.js";
import { toast } from "sonner";
import type { Solicitud } from "@shared/index.js";

export function useSolicitudes() {
  return useQuery({
    queryKey: ["solicitudes"],
    queryFn: async () => {
      const r = await solicitudesApi.listar();
      return r.data.data as Solicitud[];
    },
  });
}

export function useMisSolicitudes() {
  return useQuery({
    queryKey: ["solicitudes", "mis"],
    queryFn: async () => {
      const r = await solicitudesApi.misSolicitudes();
      return r.data.data as Solicitud[];
    },
  });
}

export function useCrearSolicitud() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { tipo: string; descripcion: string; prioridad?: string }) =>
      solicitudesApi.crear(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitudes"] });
      toast.success("Solicitud creada");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Error al crear solicitud"),
  });
}

export function useAtenderSolicitud() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { estado: string; respuesta?: string } }) =>
      solicitudesApi.atender(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitudes"] });
      toast.success("Solicitud actualizada");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Error al atender solicitud"),
  });
}
