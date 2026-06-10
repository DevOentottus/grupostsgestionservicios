import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDistribucion } from "@/api/queries/useManager.js";
import { useUsuarios } from "@/api/queries/useUsuarios.js";
import { useAuth } from "@/lib/auth.js";
import type { ManagerDistribucionItem } from "@shared/index.js";

export function ManagerDistribucionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: usuarios } = useUsuarios();
  const [colaboradorFilter, setColaboradorFilter] = useState<string>("");

  // Get colaboradores from the user list (filtered to colaborador role)
  const colaboradores =
    usuarios?.filter((u: any) => u.rol === "colaborador") || [];

  const { data, isLoading, isError } = useDistribucion(
    colaboradorFilter
      ? { colaborador_id: parseInt(colaboradorFilter) }
      : undefined
  );

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-48" />
        <div className="h-10 bg-slate-200 rounded-lg w-64" />
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 font-medium">
          Error al cargar distribución de tareas
        </p>
      </div>
    );
  }

  const tareas = data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
          Distribución de Tareas
        </h2>
        <p className="text-sm text-slate-500">
          {tareas.length} tareas pendientes en tu área
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Filtrar por colaborador
            </label>
            <select
              value={colaboradorFilter}
              onChange={(e) => setColaboradorFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Todos los colaboradores</option>
              {colaboradores.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.nombres}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-3 font-medium">Tarea</th>
                <th className="text-left p-3 font-medium">Servicio</th>
                <th className="text-center p-3 font-medium">Asignado a</th>
                <th className="text-center p-3 font-medium">Tiempo Est.</th>
                <th className="text-center p-3 font-medium">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tareas.map((t: ManagerDistribucionItem) => (
                <tr
                  key={t.id}
                  onClick={() => navigate(`/servicios/${t.servicio_id}`)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="p-3">
                    <p className="font-medium text-slate-800">{t.titulo}</p>
                  </td>
                  <td className="p-3">
                    <span className="text-xs font-mono text-slate-400">
                      {t.servicio_codigo}
                    </span>
                    <p className="text-xs text-slate-600 truncate max-w-[200px]">
                      {t.servicio_titulo}
                    </p>
                  </td>
                  <td className="p-3 text-center">
                    {t.asignado_nombre ? (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {t.asignado_nombre}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="p-3 text-center text-xs text-slate-500">
                    {t.tiempo_estimado ? `${t.tiempo_estimado} min` : "—"}
                  </td>
                  <td className="p-3 text-center text-xs text-slate-400">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {tareas.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    No hay tareas pendientes asignadas en tu área
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
