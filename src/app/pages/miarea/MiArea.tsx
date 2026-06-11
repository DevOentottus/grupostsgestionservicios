import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth.js";
import { useMiArea } from "@/api/queries/useManager.js";
import type { ManagerMiAreaResponse } from "@shared/index.js";
import {
  Building2, Users, Wrench, Clock, CheckCircle2,
  AlertTriangle, AlertCircle, X,
} from "lucide-react";

export function MiAreaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useMiArea(user?.area_id ?? undefined);

  const serviciosPorEstado = useMemo(() => {
    if (!data?.servicios) return {};
    const map: Record<string, typeof data.servicios> = {};
    for (const s of data.servicios) {
      const e = s.estado || "pendiente";
      if (!map[e]) map[e] = [];
      map[e].push(s);
    }
    return map;
  }, [data]);

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
      <div className="text-center py-16">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">No se pudo cargar tu área</p>
        <p className="text-sm text-slate-400 mt-1">
          {user?.area_id ? "Error al conectar con el servidor" : "No tenés un área asignada"}
        </p>
      </div>
    );
  }

  const { area, servicios, estado_counts, colaboradores } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{area.nombre}</h2>
          <p className="text-sm text-slate-500">
            {servicios.length} servicios · {colaboradores.length} colaboradores
          </p>
        </div>
      </div>

      {/* Estado Count Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-2xl font-bold text-slate-700">{estado_counts.total}</p>
          <p className="text-xs text-slate-500">Total</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-2xl font-bold text-yellow-600">{estado_counts.pendiente}</p>
          <p className="text-xs text-slate-500">Pendientes</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-2xl font-bold text-blue-600">{estado_counts.en_progreso}</p>
          <p className="text-xs text-slate-500">En Progreso</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-2xl font-bold text-green-600">{estado_counts.completado}</p>
          <p className="text-xs text-slate-500">Completados</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-2xl font-bold text-red-600">{estado_counts.bloqueado + estado_counts.cancelado}</p>
          <p className="text-xs text-slate-500">Bloqueados/Cancelados</p>
        </div>
      </div>

      {/* Colaboradores section */}
      {colaboradores.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            Colaboradores del área
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {colaboradores.map((col) => (
              <div
                key={col.usuario_id}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-slate-600">
                    {col.nombres?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{col.nombres}</p>
                  <p className="text-xs text-slate-400">
                    {col.tareas_activas > 0
                      ? `${col.tareas_activas} tareas activas`
                      : "Sin tareas activas"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Servicios section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-slate-400" />
          Servicios del área
        </h3>

        {servicios.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <Wrench className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No hay servicios en esta área</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {servicios.map((s) => (
              <div
                key={s.id}
                onClick={() => navigate(`/servicios/${s.id}`)}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-slate-400">{s.codigo}</p>
                    <p className="text-sm font-medium text-slate-800 truncate">{s.titulo}</p>
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                    s.estado === "completado" ? "bg-green-100 text-green-700" :
                    s.estado === "en_progreso" ? "bg-blue-100 text-blue-700" :
                    s.estado === "bloqueado" ? "bg-red-100 text-red-700" :
                    s.estado === "cancelado" ? "bg-slate-100 text-slate-400" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>
                    {s.estado?.replace("_", " ")}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Progreso</span>
                    <span>{s.progreso}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        s.progreso === 100 ? "bg-green-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${s.progreso}%` }}
                    />
                  </div>
                </div>
                {/* Técnicos */}
                {s.tecnicos && s.tecnicos.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                    <Users className="w-3 h-3" />
                    {s.tecnicos.map((t) => t.nombres).filter(Boolean).join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
