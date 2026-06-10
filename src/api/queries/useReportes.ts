import { useQuery, useQueryClient } from "@tanstack/react-query";
import { reportesApi } from "@/api/client.js";
import { toast } from "sonner";

export interface ReporteColaboradorParams {
  fecha_inicio?: string;
  fecha_fin?: string;
  usuario_id?: number;
}

export interface ReporteAreaParams {
  fecha_inicio?: string;
  fecha_fin?: string;
  area_id?: number;
}

export interface ExportarParams {
  fecha_inicio?: string;
  fecha_fin?: string;
  area_id?: number;
  usuario_id?: number;
}

export function useReporteColaborador(params: ReporteColaboradorParams) {
  return useQuery({
    queryKey: ["reportes", "colaborador", params],
    queryFn: async () => {
      const r = await reportesApi.colaborador(params);
      return r.data.data;
    },
    enabled:
      !!params.fecha_inicio ||
      !!params.fecha_fin ||
      !!params.usuario_id,
  });
}

export function useReporteArea(params: ReporteAreaParams) {
  return useQuery({
    queryKey: ["reportes", "area", params],
    queryFn: async () => {
      const r = await reportesApi.area(params);
      return r.data.data;
    },
    enabled: !!params.fecha_inicio || !!params.fecha_fin || !!params.area_id,
  });
}

export function useExportarReporte() {
  const queryClient = useQueryClient();

  const downloadFile = async (
    tipo: "colaborador" | "area",
    formato: "xlsx" | "pdf",
    params: ExportarParams
  ) => {
    try {
      const response = await reportesApi.exportar(tipo, formato, params);

      const blob = new Blob([response.data], {
        type:
          formato === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/pdf",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${tipo}-reporte.${formato}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Reporte descargado como ${formato.toUpperCase()}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Error al descargar el reporte");
    }
  };

  return downloadFile;
}
