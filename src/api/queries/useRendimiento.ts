import { useQuery } from "@tanstack/react-query";
import { rendimientoApi } from "@/api/client.js";
import type { RendimientoResponse } from "@shared/index.js";

export function useRendimiento() {
  return useQuery({
    queryKey: ["rendimiento"],
    queryFn: async () => {
      const r = await rendimientoApi.getRendimiento();
      return r.data.data as RendimientoResponse;
    },
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}
