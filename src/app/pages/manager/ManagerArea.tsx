import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMiArea } from "@/api/queries/useManager.js";
import { useAuth } from "@/lib/auth.js";
import type { ManagerMiAreaResponse } from "@shared/index.js";

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

type Tab = "servicios" | "colaboradores";

export function ManagerAreaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useMiArea();

  const [tab, setTab] = useState<Tab>("servicios");

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

  const { area, servicios, estado_counts, colaboradores } = data as ManagerMiAreaResponse;

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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-2xl font-bold text-slate-600">{colaboradores.length}</p>
          <p className="text-xs text-slate-500">Colaboradores</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab("servicios")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === "servicios"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Servicios ({servicios.length})
        </button>
        <button
          onClick={() => setTab("colaboradores")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === "colaboradores"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Colaboradores ({colaboradores.length})
        </button>
      </div>

      {/* ── TAB: SERVICIOS ── */}
      {tab === "servicios" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-3 font-medium">Código</th>
                  <th className="text-left p-3 font-medium">Título</th>
                  <th className="text-center p-3 font-medium">Prioridad</th>
                  <th className="text-center p-3 font-medium">Estado</th>
                  <th className="text-left p-3 font-medium">Técnicos</th>
                  <th className="text-center p-3 font-medium">Progreso</th>
                  <th className="text-center p-3 font-medium">Tareas</th>
                  <th className="text-center p-3 font-medium">Creado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {servicios.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/servicios/${s.id}`)}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-mono text-xs text-slate-400">{s.codigo}</td>
                    <td className="p-3">
                      <p className="font-medium text-slate-800">{s.titulo}</p>
                      {s.descripcion && (
                        <p className="text-xs text-slate-400 truncate max-w-[200px]">{s.descripcion}</p>
                      )}
                    </td>
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
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {s.tecnicos.length > 0 ? (
                          s.tecnicos.map((t) => (
                            <span key={t.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              {t.nombres}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              s.progreso === 100 ? "bg-green-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${s.progreso}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{s.progreso}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-center text-xs text-slate-500">
                      {s.tareas_completadas}/{s.total_tareas}
                    </td>
                    <td className="p-3 text-center text-xs text-slate-400">
                      {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
                {servicios.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400">
                      No hay servicios en esta área
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: COLABORADORES ── */}
      {tab === "colaboradores" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {colaboradores.map((col) => (
            <div
              key={col.usuario_id}
              className="bg-white rounded-xl border border-slate-200 p-4 space-y-3"
            >
              {/* Info del colaborador */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-slate-800">{col.nombres}</h4>
                  <p className="text-xs text-slate-400">{col.email}</p>
                </div>
                <div className="flex gap-2">
                  <div className="text-center px-3 py-1 bg-blue-50 rounded-lg">
                    <p className="text-sm font-bold text-blue-700">{col.tareas_activas}</p>
                    <p className="text-xs text-blue-500">Pendientes</p>
                  </div>
                  <div className="text-center px-3 py-1 bg-green-50 rounded-lg">
                    <p className="text-sm font-bold text-green-700">{col.tareas_completadas}</p>
                    <p className="text-xs text-green-500">Completadas</p>
                  </div>
                </div>
              </div>

              {/* Servicios asignados */}
              {col.servicios_asignados.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                    Servicios asignados ({col.servicios_asignados.length})
                  </p>
                  <div className="space-y-1">
                    {col.servicios_asignados.map((svc) => (
                      <button
                        key={svc.id}
                        onClick={() => navigate(`/servicios/${svc.id}`)}
                        className="w-full flex items-center justify-between text-left px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors text-sm"
                      >
                        <span className="text-slate-700 truncate">{svc.titulo}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-2 shrink-0 ${getEstadoClass(svc.estado || "")}`}>
                          {svc.estado?.replace("_", " ") || "—"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Sin servicios asignados</p>
              )}
            </div>
          ))}
          {colaboradores.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400">
              No hay colaboradores en esta área
            </div>
          )}
        </div>
      )}
    </div>
  );
}
