import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { areasApi } from "@/api/client.js";
import type { AreaServiciosResponse, Servicio } from "@shared/index.js";

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
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{area.nombre}</h2>
        <p className="text-sm text-slate-500">
          {data.servicios.length} servicios · Tiempo promedio:{" "}
          {tiempo_promedio > 0 ? `${Math.round(tiempo_promedio)} min` : "--"}
        </p>
      </div>

      {/* Estado Count Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-2xl font-bold text-blue-600">{estado_counts.en_progreso}</p>
          <p className="text-xs text-slate-500">En Progreso</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-2xl font-bold text-green-600">{estado_counts.completado}</p>
          <p className="text-xs text-slate-500">Completados</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-2xl font-bold text-amber-600">{estado_counts.pendiente}</p>
          <p className="text-xs text-slate-500">Pendientes</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-2xl font-bold text-red-600">{estado_counts.bloqueado}</p>
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

      {/* Servicios Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-3 font-medium">Código</th>
                <th className="text-left p-3 font-medium">Título</th>
                <th className="text-left p-3 font-medium">Cliente</th>
                <th className="text-center p-3 font-medium">Prioridad</th>
                <th className="text-center p-3 font-medium">Estado</th>
                <th className="text-center p-3 font-medium">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredServicios.map((s: Servicio) => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/servicios/${s.id}`)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="p-3 font-mono text-xs text-slate-400">{s.codigo}</td>
                  <td className="p-3 font-medium text-slate-800">{s.titulo}</td>
                  <td className="p-3 text-slate-600">{s.cliente_nombre}</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPrioridadClass(s.prioridad)}`}>
                      {s.prioridad}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getEstadoClass(s.estado)}`}>
                      {s.estado.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-3 text-center text-xs text-slate-400">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filteredServicios.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    No hay servicios para mostrar
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
