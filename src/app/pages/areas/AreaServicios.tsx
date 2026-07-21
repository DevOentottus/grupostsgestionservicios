import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { areasApi } from "@/api/client.js";
import type { AreaServiciosResponse, Servicio } from "@shared/index.js";
import { InfoPopover } from "@/app/components/ui/info-popover.js";

const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "pendiente", label: "Pendiente" },
  { value: "en_progreso", label: "En Progreso" },
  { value: "completado", label: "Completado" },
  { value: "bloqueado", label: "Bloqueado" },
  { value: "cancelado", label: "Cancelado" },
];

function getEstadoClass(e: string): string {
  switch (e) {
    case "completado": return "bg-green-100 text-green-700";
    case "en_progreso": return "bg-blue-100 text-blue-700";
    case "bloqueado": return "bg-red-100 text-red-700";
    case "pendiente": return "bg-slate-100 text-slate-600";
    case "cancelado": return "bg-slate-100 text-slate-400";
    default: return "bg-slate-100 text-slate-600";
  }
}

function getPrioridadClass(p: string): string {
  switch (p) {
    case "urgente": return "text-red-600 bg-red-50";
    case "alta": return "text-orange-600 bg-orange-50";
    case "media": return "text-blue-600 bg-blue-50";
    default: return "text-slate-600 bg-slate-50";
  }
}

export function AreaServiciosPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const areaId = parseInt(id!);
  const [estadoFilter, setEstadoFilter] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["area-servicios", areaId],
    queryFn: async () => {
      const r = await areasApi.listarServicios(areaId);
      return r.data.data as AreaServiciosResponse;
    },
    enabled: !!areaId,
  });

  const filteredServicios = useMemo(() => {
    if (!data?.servicios) return [];
    if (!estadoFilter) return data.servicios;
    return data.servicios.filter((s) => s.estado === estadoFilter);
  }, [data, estadoFilter]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="h-8 bg-slate-200 rounded-lg w-48" />
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 font-medium">Error al cargar servicios del área</p>
        <button onClick={() => navigate("/areas")} className="text-sm text-blue-600 hover:underline mt-2">
          ← Volver a Áreas
        </button>
      </div>
    );
  }

  const { area, estado_counts, tiempo_promedio } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <button onClick={() => navigate("/areas")} className="text-sm text-blue-600 hover:underline mb-1">
        ← Áreas
      </button>
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-bold text-slate-800">{area.nombre}</h2>
        <InfoPopover
          variant="info"
          formula="Servicios filtrados por área específica, con opciones de gestión y seguimiento."
          descripcion="Cada área tiene sus propios servicios. Podés filtrar, buscar y gestionar desde esta vista."
          tip="Usá los filtros para encontrar servicios rápidamente. El estado del servicio determina las acciones disponibles."
        />
        <p className="text-sm text-slate-500 flex items-center gap-1.5">
          {data.servicios.length} servicios · Tiempo promedio:{" "}
          {tiempo_promedio > 0 ? `${Math.round(tiempo_promedio)} min` : "--"}
          <InfoPopover
            variant="info"
            formula="Sumatoria de tiempo real de tracking ÷ N° de tareas con tracking en el área."
            descripcion="Tiempo promedio por tarea en esta área. Incluye solo tareas que tienen registro de tiempo."
            tip="Un tiempo promedio alto puede indicar tareas complejas o necesidad de optimización de procesos."
          />
        </p>
      </div>

      {/* Estado Count Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-blue-600">{estado_counts.en_progreso}</p>
            <InfoPopover variant="info" formula="Servicios actualmente en ejecución en esta área." descripcion="Servicios iniciados pero aún no finalizados." tip="Los servicios en progreso deberían tener tracking de tiempo activo." />
          </div>
          <p className="text-xs text-slate-500">En Progreso</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-green-600">{estado_counts.completado}</p>
            <InfoPopover variant="info" formula="Servicios finalizados exitosamente en esta área." descripcion="Servicios marcados como completados por el equipo técnico." tip="Compará completados vs total para calcular la tasa de finalización del área." />
          </div>
          <p className="text-xs text-slate-500">Completados</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-amber-600">{estado_counts.pendiente}</p>
            <InfoPopover variant="info" formula="Servicios registrados pero aún no iniciados." descripcion="Servicios que están en cola de espera para ser asignados o iniciados." tip="Una acumulación alta de pendientes puede indicar falta de recursos o mala planificación." />
          </div>
          <p className="text-xs text-slate-500">Pendientes</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-red-600">{estado_counts.bloqueado}</p>
            <InfoPopover variant="warning" formula="Servicios que no pueden avanzar por algún impedimento." descripcion="Servicios detenidos que requieren intervención para continuar. Pueden necesitar repuestos, información o decisión." tip="Los servicios bloqueados deberían revisarse periódicamente para destrabarlos o cancelarlos." />
          </div>
          <p className="text-xs text-slate-500">Bloqueados</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-600 font-medium">Estado:</label>
        <select
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          {ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </div>

      {/* Servicios Grid */}
      {filteredServicios.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          No hay servicios para mostrar
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServicios.map((s: Servicio) => (
            <div
              key={s.id}
              onClick={() => navigate(`/servicios/${s.id}`)}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-400">{s.codigo}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPrioridadClass(s.prioridad)}`}>
                  {s.prioridad}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-800 line-clamp-2">{s.titulo}</p>
              <p className="text-xs text-slate-500 truncate">{s.cliente_nombre || "Sin cliente"}</p>
              <div className="flex items-center justify-between pt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getEstadoClass(s.estado)}`}>
                  {s.estado.replace("_", " ")}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(s.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
