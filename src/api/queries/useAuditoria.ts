import { useQuery } from "@tanstack/react-query";
import { auditoriaApi } from "@/api/client.js";
import type { AuditoriaDisplay, PaginatedResponse } from "@shared/index.js";

export interface AuditoriaFilters {
  page?: number;
  limit?: number;
  entidad?: string;
  usuario_id?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export function useAuditoria(filters: AuditoriaFilters = {}) {
  const { page = 1, limit = 20, ...rest } = filters;
  return useQuery({
    queryKey: ["auditoria", filters],
    queryFn: async () => {
      const r = await auditoriaApi.listar({ page, limit, ...rest });
      return r.data as {
        data: AuditoriaDisplay[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      };
    },
  });
}
