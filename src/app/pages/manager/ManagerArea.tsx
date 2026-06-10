import { useNavigate } from "react-router-dom";
import { useMiArea } from "@/api/queries/useManager.js";
import { useAuth } from "@/lib/auth.js";
import type { Servicio, ManagerMiAreaResponse } from "@shared/index.js";

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
    case "urgente": return "text-red-600 bg-red-50 border-red-200";
    case "alta": return "text-orange-600 bg-orange-50 border-orange-200";
    case "media": return "text-blue-600 bg-blue-50 border-blue-200";
    default: return "text-slate-600 bg-slate-50 border-slate-200";
  }
}

export function ManagerAreaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useMiArea(
    user?.rol === "admin" ? undefined : undefined
  );

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 font-medium">Error al cargar información del área</p>
      </div>
    );
  }

  const { area, servicios, estado_counts, colaboradores } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{area.nombre}</h2>
        <p className="text-sm text-slate-500">
          {servicios.length} servicios · {colaboradores.length} colaboradores
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

      {/* Servicios Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Servicios del Área</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-3 font-medium">Código</th>
                <th className="text-left p-3 font-medium">Título</th>
                <th className="text-center p-3 font-medium">Prioridad</th>
                <th className="text-center p-3 font-medium">Estado</th>
                <th className="text-center p-3 font-medium">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {servicios.map((s: Servicio) => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/servicios/${s.id}`)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="p-3 font-mono text-xs text-slate-400">{s.codigo}</td>
                  <td className="p-3 font-medium text-slate-800">{s.titulo}</td>
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
              {servicios.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    No hay servicios en esta área
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Colaboradores */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">
            Colaboradores ({colaboradores.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-3 font-medium">Nombre</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-center p-3 font-medium">Tareas Activas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {colaboradores.map((col) => (
                <tr key={col.usuario_id} className="hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-800">{col.nombres}</td>
                  <td className="p-3 text-slate-500">{col.email}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        col.tareas_activas > 5
                          ? "bg-red-100 text-red-700"
                          : col.tareas_activas > 2
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {col.tareas_activas}
                    </span>
                  </td>
                </tr>
              ))}
              {colaboradores.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-slate-400">
                    No hay colaboradores en esta área
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
