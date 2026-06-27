import { useMemo } from "react";
import { useAuth } from "@/lib/auth.js";
import { useMiArea } from "@/api/queries/useManager.js";
import {
  TrendingUp, CheckCircle2, User, Star,
} from "lucide-react";

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5" title={`${rating.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${
            i <= full
              ? "fill-yellow-400 text-yellow-400"
              : i === full + 1 && half
                ? "fill-yellow-400/50 text-yellow-400"
                : "fill-slate-200 text-slate-200"
          }`}
        />
      ))}
    </span>
  );
}

export function MiDesempenoPage() {
  const { user } = useAuth();
  const { data: miArea, isLoading: areaLoading, isError: areaError } = useMiArea();

  // Datos del colaborador logueado desde MiArea
  const misDatos = useMemo(() => {
    if (!miArea?.colaboradores) return null;
    return miArea.colaboradores.find(
      (c: any) => c.usuario_id === user?.id
    ) || null;
  }, [miArea, user?.id]);

  const isLoading = areaLoading;
  const isError = areaError;

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
            {user?.nombres || "Colaborador"}
          </p>
        </div>
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

      {!isLoading && !isError && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tareas completadas</p>
              </div>
              <p className="text-3xl font-bold text-slate-800">{misDatos?.tareas_completadas ?? 0}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Servicios completados</p>
              </div>
              <p className="text-3xl font-bold text-indigo-600">{misDatos?.servicios_completados ?? 0}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Star className="w-4 h-4 text-yellow-600" />
                </div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Calificación</p>
              </div>
              {misDatos?.calificacion_promedio != null ? (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-yellow-600">
                      {misDatos.calificacion_promedio.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-400">/ 5</span>
                  </div>
                  <div className="mt-2">
                    <StarRating rating={misDatos.calificacion_promedio} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 mt-2">Sin evaluaciones</p>
              )}
            </div>
          </div>

          {/* Área info + Mi Perfil */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Área info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:col-span-2">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                Mi Área
              </h3>
              {miArea?.area ? (
                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">Área</p>
                    <p className="text-lg font-bold text-slate-800">{miArea.area.nombre}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-blue-600">{miArea.estado_counts?.total ?? 0}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Servicios totales</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-green-600">{miArea.estado_counts?.completado ?? 0}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Completados</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-amber-600">{miArea.estado_counts?.en_progreso ?? 0}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">En progreso</p>
                    </div>
                  </div>
                  {miArea.satisfaccion && (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Satisfacción del área</span>
                        <span className="text-sm font-bold text-slate-700">
                          {miArea.satisfaccion.promedio.toFixed(1)} / 5
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No hay datos del área</p>
              )}
            </div>

            {/* Mi Perfil */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                Mi Perfil
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500">Nombre</p>
                  <p className="text-sm font-medium text-slate-800">{user?.nombres || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="text-sm text-slate-600 truncate">{user?.email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Usuario</p>
                  <p className="text-sm text-slate-600">@{user?.username || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Rol</p>
                  <span className="inline-block text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-100 text-green-700 mt-0.5">
                    {user?.rol || "—"}
                  </span>
                </div>
                {misDatos?.tareas_activas != null && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Tareas activas</p>
                    <p className="text-lg font-bold text-slate-800">{misDatos.tareas_activas}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Servicios activos del colaborador */}
          {misDatos?.servicios_asignados && misDatos.servicios_asignados.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-slate-400" />
                  Mis servicios asignados
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {misDatos.servicios_asignados.map((s: any) => (
                  <div key={s.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition">
                    <div>
                      <span className="text-xs font-mono text-slate-400">{s.codigo}</span>
                      <p className="text-sm font-medium text-slate-800">{s.titulo}</p>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      s.estado === "completado" ? "bg-green-100 text-green-700" :
                      s.estado === "en_progreso" ? "bg-blue-100 text-blue-700" :
                      s.estado === "pendiente" ? "bg-yellow-100 text-yellow-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {s.estado || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state si no hay datos del colaborador */}
          {!misDatos && (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
              <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No se encontraron datos de desempeño</p>
              <p className="text-sm text-slate-400 mt-1">Puede que no tengas un área asignada</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
