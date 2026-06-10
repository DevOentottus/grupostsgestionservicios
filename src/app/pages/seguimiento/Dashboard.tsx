import { useDashboard } from "@/api/queries/useSeguimiento.js";

const kpiCards = [
  { key: "registros_completos_pct", label: "Datos Completos", unit: "%", color: "bg-blue-500" },
  { key: "servicios_con_tareas_pct", label: "Con Tareas", unit: "%", color: "bg-green-500" },
  { key: "tiempo_promedio_min", label: "Tiempo Promedio", unit: "min", color: "bg-amber-500" },
  { key: "completados_dentro_tiempo_pct", label: "Dentro del Tiempo", unit: "%", color: "bg-purple-500" },
  { key: "servicios_consultados_pct", label: "Consultados x Cliente", unit: "%", color: "bg-teal-500" },
  { key: "satisfaccion_visibilidad", label: "Satisfacción", unit: "/5", color: "bg-pink-500" },
  { key: "servicios_evaluados_pct", label: "Evaluados", unit: "%", color: "bg-indigo-500" },
  { key: "servicios_con_comentarios_pct", label: "Con Feedback", unit: "%", color: "bg-rose-500" },
];

export function DashboardPage() {
  const { data, isLoading } = useDashboard();

  if (isLoading) return <p className="text-slate-500">Cargando dashboard...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Dashboard de Eficiencia</h2>
        <p className="text-slate-500 text-sm">
          {data?.total_servicios} servicios registrados · {data?.completados} completados
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(({ key, label, unit, color }) => {
          const valor = data?.kpi?.[key as keyof typeof data.kpi] ?? 0;
          const display = typeof valor === "number" ? valor : 0;
          return (
            <div key={key} className="bg-white rounded-xl shadow-sm border p-4">
              <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-white text-sm font-bold mb-3`}>
                {unit}
              </div>
              <p className="text-2xl font-bold text-slate-800">
                {key === "tiempo_promedio_min" ? display : `${display}${unit}`}
              </p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          );
        })}
      </div>

      {/* Servicios recientes */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <h3 className="font-semibold text-slate-800 mb-3">Servicios Recientes</h3>
        <div className="space-y-2">
          {data?.servicios_recientes?.map((s: any) => (
            <div key={s.id} className="flex justify-between items-center py-2 border-b last:border-0">
              <div>
                <span className="text-xs font-mono text-slate-400">{s.codigo}</span>
                <p className="text-sm font-medium">{s.titulo}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                s.estado === "completado" ? "bg-green-100 text-green-700" :
                s.estado === "en_progreso" ? "bg-blue-100 text-blue-700" :
                s.estado === "cancelado" ? "bg-red-100 text-red-700" :
                "bg-slate-100 text-slate-600"
              }`}>
                {s.estado}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
