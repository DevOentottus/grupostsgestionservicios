import { useQuery } from "@tanstack/react-query";
import { tiposServicioApi } from "@/api/client.js";
import type { TipoServicio, FallaComun } from "@shared/index.js";

export function useTiposServicio() {
  return useQuery({
    queryKey: ["tipos-servicio"],
    queryFn: async () => {
      const r = await tiposServicioApi.listar();
      return r.data.data as TipoServicio[];
    },
  });
}

export function useFallasComunes() {
  return useQuery({
    queryKey: ["fallas-comunes"],
    queryFn: async () => {
      const r = await tiposServicioApi.listarTodasFallas();
      return r.data.data as (FallaComun & { tipo_servicio_nombre?: string })[];
    },
  });
}
