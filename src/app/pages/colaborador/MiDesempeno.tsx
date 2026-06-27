import { useMemo } from "react";
import { useDesempeno } from "@/api/queries/useManager.js";
import { useAuth } from "@/lib/auth.js";
import {
  TrendingUp, Clock, Target, CheckCircle2, Calendar, User,
} from "lucide-react";

function formatMinutos(m: number): string {
  if (m < 1) return "< 1 min";
  if (m < 60) return `${Math.round(m)} min`;
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return min > 0 ? `${h}h ${min}m` : `${h}h`;
}

function EficienciaGauge({ valor }: { valor: number }) {
  const color =
    valor >= 80 ? "text-green-600" :
    valor >= 50 ? "text-amber-600" :
    "text-red-600";
  const barColor =
    valor >= 80 ? "bg-green-500" :
    valor >= 50 ? "bg-amber-500" :
    "bg-red-500";
  return (
    <div>
      <p className={`text-3xl font-bold ${color}`}>{valor}%</p>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(valor, 100)}%` }} />
      </div>
    </div>
  );
}

export function MiDesempenoPage() {
  const { user } = useAuth();

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  const fechaInicio = firstDay.toISOString().split("T")[0];
  const fechaFin = today.toISOString().split("T")[0];

  const { data, isLoading, isError } = useDesempeno(
    user?.id ?? 0,
    user?.id ? { fecha_inicio: fechaInicio, fecha_fin: fechaFin } : undefined
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Mi Desempeño
          </h2>
          <p className="text-sm text-slate-500">
            Tu rendimiento en {today.toLocaleString("es-AR", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Periodo indicator */}
      <div className="flex items-center gap-2 text-xs text-slate-400 bg-white rounded-xl border border-gray-100 px-4 py-2 shadow-sm">
        <Calendar className="w-3.5 h-3.5" />
        Periodo evaluado: {fechaInicio} — {fechaFin}
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 mt-3 text-sm">Cargando tu desempeño...</p>
        </div>
      )}

      {isError && (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
          <p className="text-red-500 font-medium">Error al cargar tu desempeño</p>
          <p className="text-sm text-slate-400 mt-1">Intentalo de nuevo más tarde</p>
        </div>
      )}

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tareas completadas</p>
              </div>
              <p className="text-3xl font-bold text-slate-800">{data.total_tareas}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tiempo promedio</p>
              </div>
              <p className="text-3xl font-bold text-amber-600">
                {formatMinutos(data.tiempo_promedio_por_tarea)}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Target className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Eficiencia</p>
              </div>
              <EficienciaGauge valor={data.eficiencia} />
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Servicios completados</p>
              </div>
              <p className="text-3xl font-bold text-indigo-600">{data.servicios_completados}</p>
            </div>
          </div>

          {/* Time Detail + Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:col-span-2">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Resumen de Tiempo
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">Tiempo total invertido</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {formatMinutos(data.tiempo_total_minutos)}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">Periodo</p>
                  <p className="text-sm font-medium text-slate-700">
                    {new Date(data.periodo.desde).toLocaleDateString()} — {new Date(data.periodo.hasta).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                Mi Perfil
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500">Nombre</p>
                  <p className="text-sm font-medium text-slate-800">{data.colaborador.nombres}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="text-sm text-slate-600 truncate">{data.colaborador.email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Usuario</p>
                  <p className="text-sm text-slate-600">@{data.colaborador.username}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Rol</p>
                  <span className="inline-block text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-100 text-green-700 mt-0.5">
                    {data.colaborador.rol}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tareas completadas list */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Mis Tareas Completadas
              </h3>
              <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {data.total_tareas} tareas
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Tarea</th>
                    <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Servicio</th>
                    <th className="text-center px-5 py-3 font-medium text-xs uppercase tracking-wider">Tiempo Est.</th>
                    <th className="text-center px-5 py-3 font-medium text-xs uppercase tracking-wider">Completada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.tareas_completadas.map((t) => (
                    <tr key={t.id} className="hover:bg-green-50/40 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-800">{t.titulo}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-mono text-slate-400">
                          {t.servicio_codigo}
                        </span>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {t.servicio_titulo}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-center text-xs text-slate-500">
                        {t.tiempo_estimado ? `${t.tiempo_estimado} min` : "—"}
                      </td>
                      <td className="px-5 py-3 text-center text-xs text-slate-400">
                        {t.completada_at
                          ? new Date(t.completada_at).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                  {data.tareas_completadas.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center text-slate-400">
                        No completaste tareas en este período
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
