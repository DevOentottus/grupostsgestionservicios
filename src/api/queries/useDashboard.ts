import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/api/client.js";
import type { DashboardV2Response, DashboardFilters } from "@shared/index.js";

export function useDashboard(filters?: DashboardFilters) {
  const {
    fecha_inicio,
    fecha_fin,
    area_id,
    comparar_periodo,
    comparar_fecha_inicio,
    comparar_fecha_fin,
  } = filters ?? {};

  return useQuery({
    queryKey: ["dashboard", "v2", fecha_inicio, fecha_fin, area_id, comparar_periodo, comparar_fecha_inicio, comparar_fecha_fin],
    queryFn: async () => {
      const r = await dashboardApi.getAll({
        fecha_inicio,
        fecha_fin,
        area_id,
        comparar_periodo,
        comparar_fecha_inicio,
        comparar_fecha_fin,
      });
      return r.data.data as DashboardV2Response;
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

export function useDashboardWithComparison(filters?: Omit<DashboardFilters, "comparar_periodo">) {
  return useQuery({
    queryKey: ["dashboard", "v2", "comparison", filters?.fecha_inicio, filters?.fecha_fin, filters?.area_id],
    queryFn: async () => {
      const r = await dashboardApi.getAll({
        ...filters,
        comparar_periodo: true,
      });
      return r.data.data as DashboardV2Response;
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

export function useDashboardAlerts(filters?: Omit<DashboardFilters, "comparar_periodo">) {
  const query = useDashboard(filters);
  return {
    ...query,
    data: query.data?.alertas ?? null,
  };
}

export function useDashboardCharts(filters?: Omit<DashboardFilters, "comparar_periodo">) {
  const query = useDashboard(filters);
  return {
    ...query,
    data: query.data?.graficos ?? null,
  };
}
