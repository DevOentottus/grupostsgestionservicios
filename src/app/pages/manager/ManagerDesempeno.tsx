import { useState, useMemo } from "react";
import { useDesempeno, useMiArea } from "@/api/queries/useManager.js";
import { useUsuarios } from "@/api/queries/useUsuarios.js";
import { useAuth } from "@/lib/auth.js";

function formatMinutos(m: number): string {
  if (m < 1) return "< 1 min";
  if (m < 60) return `${Math.round(m)} min`;
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return min > 0 ? `${h}h ${min}m` : `${h}h`;
}

export function ManagerDesempenoPage() {
  const { user } = useAuth();
  const esSupervisor = user?.rol === "sistema" || user?.rol === "admin";
  const { data: miArea } = useMiArea();
  const { data: todosUsuarios } = useUsuarios();

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  const [colaboradorId, setColaboradorId] = useState<string>("");
  const [fechaInicio, setFechaInicio] = useState(
    firstDay.toISOString().split("T")[0]
  );
  const [fechaFin, setFechaFin] = useState(
    today.toISOString().split("T")[0]
  );

  // Colaboradores del área (encargado) o todos los colaboradores (sistema/admin)
  const colaboradores = useMemo(() => {
    if (esSupervisor) {
      // Sistema/admin ven todos los usuarios con rol colaborador/encargado
      return (todosUsuarios || [])
        .filter((u) => u.rol === "colaborador" || u.rol === "encargado")
        .map((u) => ({
          usuario_id: u.id,
          nombres: [u.nombres, u.apellidos].filter(Boolean).join(" "),
        }));
    }
    // Encargado ve solo los de su área (vienen con nombres desde el backend)
    return miArea?.colaboradores || [];
  }, [esSupervisor, todosUsuarios, miArea]);

  const { data, isLoading, isError } = useDesempeno(
    parseInt(colaboradorId),
    colaboradorId ? { fecha_inicio: fechaInicio, fecha_fin: fechaFin } : undefined
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
          Desempeño de Colaborador
        </h2>
        <p className="text-sm text-slate-500">
          Evalúa el rendimiento de los colaboradores de tu área
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Colaborador
            </label>
            <select
              value={colaboradorId}
              onChange={(e) => setColaboradorId(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm min-w-[200px]"
            >
              <option value="">Seleccionar colaborador...</option>
              {colaboradores.map((u) => (
                <option key={u.usuario_id} value={u.usuario_id}>
                  {u.nombres}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Fecha inicio
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Fecha fin
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {!colaboradorId && (
        <div className="text-center py-12 text-slate-400">
          Selecciona un colaborador para ver su desempeño
        </div>
      )}

      {isLoading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 mt-3 text-sm">Cargando...</p>
        </div>
      )}

      {isError && (
        <div className="text-center py-12">
          <p className="text-red-500 font-medium">
            Error al cargar datos de desempeño
          </p>
        </div>
      )}

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">Tareas completadas</p>
              <p className="text-3xl font-bold text-blue-600">
                {data.total_tareas}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">
                Tiempo promedio / tarea
              </p>
              <p className="text-3xl font-bold text-amber-600">
                {formatMinutos(data.tiempo_promedio_por_tarea)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">Eficiencia</p>
              <p
                className={`text-3xl font-bold ${
                  data.eficiencia >= 80
                    ? "text-green-600"
                    : data.eficiencia >= 50
                    ? "text-amber-600"
                    : "text-red-600"
                }`}
              >
                {data.eficiencia}%
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">
                Servicios completados
              </p>
              <p className="text-3xl font-bold text-green-600">
                {data.servicios_completados}
              </p>
            </div>
          </div>

          {/* Time Detail */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800 mb-2">
              Resumen de Tiempo
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Tiempo total invertido</p>
                <p className="text-lg font-bold text-slate-800">
                  {formatMinutos(data.tiempo_total_minutos)}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Periodo evaluado</p>
                <p className="text-sm font-medium text-slate-700">
                  {new Date(data.periodo.desde).toLocaleDateString()} --{" "}
                  {new Date(data.periodo.hasta).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Tareas completadas list */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">
                Tareas Completadas ({data.total_tareas})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left p-3 font-medium">Tarea</th>
                    <th className="text-left p-3 font-medium">Servicio</th>
                    <th className="text-center p-3 font-medium">
                      Tiempo Est.
                    </th>
                    <th className="text-center p-3 font-medium">
                      Completada
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.tareas_completadas.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-800">
                        {t.titulo}
                      </td>
                      <td className="p-3">
                        <span className="text-xs font-mono text-slate-400">
                          {t.servicio_codigo}
                        </span>
                        <p className="text-xs text-slate-600">
                          {t.servicio_titulo}
                        </p>
                      </td>
                      <td className="p-3 text-center text-xs text-slate-500">
                        {t.tiempo_estimado
                          ? `${t.tiempo_estimado} min`
                          : "--"}
                      </td>
                      <td className="p-3 text-center text-xs text-slate-400">
                        {t.completada_at
                          ? new Date(t.completada_at).toLocaleDateString()
                          : "--"}
                      </td>
                    </tr>
                  ))}
                  {data.tareas_completadas.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-400">
                        No hay tareas completadas en este período
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
