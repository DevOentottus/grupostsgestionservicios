import { useQuery } from "@tanstack/react-query";
import { managerApi } from "@/api/client.js";
import type {
  ManagerMiAreaResponse,
  ManagerDistribucionItem,
  ManagerDesempenoResponse,
} from "@shared/index.js";

export function useMiArea(areaId?: number, params?: { fecha_inicio?: string; fecha_fin?: string }) {
  return useQuery({
    queryKey: ["manager", "mi-area", areaId, params],
    queryFn: async () => {
      const r = await managerApi.miArea(areaId, params);
      return r.data.data as ManagerMiAreaResponse;
    },
  });
}

export function useDistribucion(params?: {
  area_id?: number;
  colaborador_id?: number;
}) {
  return useQuery({
    queryKey: ["manager", "distribucion", params],
    queryFn: async () => {
      const r = await managerApi.distribucion(params);
      return r.data.data as ManagerDistribucionItem[];
    },
  });
}

export function useClientes() {
  return useQuery({
    queryKey: ["manager", "clientes"],
    queryFn: async () => {
      const r = await managerApi.clientes();
      return r.data.data;
    },
  });
}

export function useDesempeno(
  usuarioId: number,
  params?: { fecha_inicio?: string; fecha_fin?: string }
) {
  return useQuery({
    queryKey: ["manager", "desempeno", usuarioId, params],
    queryFn: async () => {
      const r = await managerApi.desempeno(usuarioId, params);
      return r.data.data as ManagerDesempenoResponse;
    },
    enabled: !!usuarioId,
  });
}
