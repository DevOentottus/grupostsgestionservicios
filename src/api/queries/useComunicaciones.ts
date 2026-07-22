import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { comunicacionesApi } from "@/api/client.js";
import { toast } from "sonner";

export interface Comunicacion {
  id: number;
  servicio_id: number;
  mensaje: string;
  tipo: "avance" | "consulta" | "notificacion" | "finalizacion";
  created_at: string;
  usuario: { nombres: string } | null;
}

export function useComunicaciones(servicioId: number) {
  return useQuery({
    queryKey: ["comunicaciones", servicioId],
    queryFn: async () => {
      const r = await comunicacionesApi.listar(servicioId);
      return r.data.data as Comunicacion[];
    },
    enabled: !!servicioId,
  });
}

export function useCrearComunicacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      servicioId,
      mensaje,
      tipo,
    }: {
      servicioId: number;
      mensaje: string;
      tipo?: string;
    }) => comunicacionesApi.crear(servicioId, { mensaje, tipo }),
    onSuccess: (_data, { servicioId }) => {
      qc.invalidateQueries({ queryKey: ["comunicaciones", servicioId] });
      toast.success("Comunicación enviada");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.detail || "Error al enviar comunicación"),
  });
}
