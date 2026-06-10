import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Clock,
  Activity,
  BarChart3,
  Users,
  ListChecks,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { useDashboard } from "@/api/queries/useDashboard.js";
import { DateRangeFilter } from "@/app/components/filters/DateRangeFilter.js";
import { AreaFilter } from "@/app/components/filters/AreaFilter.js";
import { PeriodComparisonToggle } from "@/app/components/filters/PeriodComparisonToggle.js";
import { PieChartCard } from "@/app/components/charts/PieChart.js";
import { BarChartCard } from "@/app/components/charts/BarChart.js";
import { SatisfactionByAreaChart } from "@/app/components/charts/SatisfactionByAreaChart.js";
import { TrendLineChart } from "@/app/components/charts/TrendLineChart.js";
import type { DashboardFilters, DashboardV2Response } from "@shared/index.js";

// ── Helpers ──

function getSeverityColor(horas: number): string {
  if (horas >= 72) return "text-red-600 bg-red-50 border-red-200";
  if (horas >= 48) return "text-orange-600 bg-orange-50 border-orange-200";
  return "text-amber-600 bg-amber-50 border-amber-200";
}

function getPrioridadClass(p: string): string {
  switch (p) {
    case "urgente": return "text-red-600 bg-red-50";
    case "alta": return "text-orange-600 bg-orange-50";
    case "media": return "text-blue-600 bg-blue-50";
    default: return "text-slate-600 bg-slate-50";
  }
}

function getEstadoClass(e: string): string {
  switch (e) {
    case "completado": return "bg-green-100 text-green-700";
    case "en_progreso": return "bg-blue-100 text-blue-700";
    case "bloqueado": return "bg-red-100 text-red-700";
    case "pendiente": return "bg-slate-100 text-slate-600";
    default: return "bg-slate-100 text-slate-600";
  }
}

function formatMinutos(m: number): string {
  if (m < 60) return `${Math.round(m)} min`;
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return `${h}h ${min}m`;
}

// ── Tabs ──

type TabId = "alertas" | "indicadores" | "graficos" | "ranking" | "comparativo";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "alertas", label: "Alertas", icon: <AlertTriangle className="w-4 h-4" /> },
  { id: "indicadores", label: "Indicadores", icon: <Activity className="w-4 h-4" /> },
  { id: "graficos", label: "Gráficos", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "ranking", label: "Ranking", icon: <Users className="w-4 h-4" /> },
  { id: "comparativo", label: "Comparativo", icon: <TrendingUp className="w-4 h-4" /> },
];

// ── Dashboard Page ──

export function DashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("alertas");
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [compararPeriodo, setCompararPeriodo] = useState(false);

  const queryFilters = useMemo<DashboardFilters>(() => ({
    ...filters,
    comparar_periodo: compararPeriodo || undefined,
  }), [filters, compararPeriodo]);

  const { data, isLoading, isError, error, refetch, isFetching } = useDashboard(queryFilters);

  const handleDateChange = useCallback((inicio: string, fin: string) => {
    setFilters((prev) => ({
      ...prev,
      fecha_inicio: inicio || undefined,
      fecha_fin: fin || undefined,
    }));
  }, []);

  const handleAreaChange = useCallback((areaId: number | undefined) => {
    setFilters((prev) => ({ ...prev, area_id: areaId }));
  }, []);

  if (isError) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-medium">Error al cargar dashboard</p>
        <p className="text-sm text-slate-500 mt-1">{(error as Error)?.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
          <p className="text-sm text-slate-500">
            {data?.total_servicios ?? 0} servicios registrados ·{" "}
            {data?.completados ?? 0} completados
            {isFetching && (
              <RefreshCw className="inline-block w-3 h-3 ml-2 animate-spin text-blue-500" />
            )}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <DateRangeFilter
            fechaInicio={filters.fecha_inicio ?? ""}
            fechaFin={filters.fecha_fin ?? ""}
            onChange={handleDateChange}
          />
          <AreaFilter value={filters.area_id} onChange={handleAreaChange} />
          <PeriodComparisonToggle
            enabled={compararPeriodo}
            onChange={setCompararPeriodo}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === id
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 mt-3 text-sm">Cargando dashboard...</p>
        </div>
      ) : (
        <>
          {activeTab === "alertas" && <AlertasTab data={data} />}
          {activeTab === "indicadores" && <IndicadoresTab data={data} />}
          {activeTab === "graficos" && <GraficosTab data={data} />}
          {activeTab === "ranking" && <RankingTab data={data} navigate={navigate} />}
          {activeTab === "comparativo" && <ComparativoTab data={data} />}
        </>
      )}
    </div>
  );
}

// ── Alertas Tab ──

function AlertasTab({ data }: { data: DashboardV2Response | undefined }) {
  if (!data) return null;
  const { alertas } = data;

  return (
    <div className="space-y-6">
      {/* Blocked Count Card */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-600" />
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-800">{alertas.blocked_count}</p>
            <p className="text-sm text-slate-500">Servicios bloqueados</p>
          </div>
        </div>
      </div>

      {/* Delayed Services */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-500" />
          Servicios con demora ({alertas.delayed_services.length})
        </h3>
        {alertas.delayed_services.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Sin servicios con demora</p>
        ) : (
          <div className="space-y-2">
            {alertas.delayed_services.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between p-3 rounded-lg border border-orange-200 bg-orange-50"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-mono text-slate-400">{s.codigo}</span>
                  <p className="text-sm font-medium text-slate-800 truncate">{s.descripcion}</p>
                  <p className="text-xs text-slate-500">{s.cliente}</p>
                </div>
                <div className="flex items-center gap-3 mt-2 sm:mt-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPrioridadClass(s.prioridad)}`}>
                    {s.prioridad}
                  </span>
                  <span className="text-xs text-orange-700 font-medium whitespace-nowrap">
                    {formatMinutos(s.tiempo_transcurrido_minutos)} / {s.tiempo_estimado ? formatMinutos(s.tiempo_estimado) : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stale Services */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-500" />
          Servicios sin actividad ({alertas.stale_services.length})
        </h3>
        {alertas.stale_services.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Sin servicios estancados</p>
        ) : (
          <div className="space-y-2">
            {alertas.stale_services.map((s) => (
              <div
                key={s.id}
                className={`flex flex-wrap items-center justify-between p-3 rounded-lg border ${getSeverityColor(s.horas_sin_actividad)}`}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-mono text-slate-400">{s.codigo}</span>
                  <p className="text-sm font-medium truncate">{s.descripcion}</p>
                  <p className="text-xs opacity-75">{s.cliente}</p>
                </div>
                <div className="text-xs font-medium whitespace-nowrap mt-2 sm:mt-0">
                  {s.horas_sin_actividad >= 72
                    ? `${Math.round(s.horas_sin_actividad / 24)} días sin actividad`
                    : `${Math.round(s.horas_sin_actividad)} horas sin actividad`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Indicadores Tab ──

function IndicadoresTab({ data }: { data: DashboardV2Response | undefined }) {
  if (!data) return null;
  const { indicadores, kpi } = data;

  const kpiGroups = [
    {
      title: "Productividad",
      icon: <Users className="w-4 h-4 text-blue-600" />,
      color: "bg-blue-500",
      cards: [
        { label: "Servicios completados", value: indicadores.productividad.servicios_completados, unit: "" },
        { label: "Tareas completadas", value: indicadores.productividad.tareas_completadas, unit: "" },
        { label: "Promedio x colaborador", value: indicadores.productividad.promedio_por_colaborador, unit: "" },
      ],
    },
    {
      title: "Eficiencia",
      icon: <Clock className="w-4 h-4 text-amber-600" />,
      color: "bg-amber-500",
      cards: [
        { label: "Tiempo promedio", value: indicadores.eficiencia.tiempo_promedio_min, unit: "min" },
        { label: "% a tiempo", value: indicadores.eficiencia.porcentaje_a_tiempo, unit: "%" },
        { label: "Cant. retrasos", value: indicadores.eficiencia.cantidad_retrasos, unit: "" },
      ],
    },
    {
      title: "Satisfacción",
      icon: <TrendingUp className="w-4 h-4 text-green-600" />,
      color: "bg-green-500",
      cards: [
        { label: "Calificación promedio", value: indicadores.satisfaccion.promedio_calificacion, unit: "/5" },
        { label: "% Evaluados", value: indicadores.satisfaccion.porcentaje_evaluados, unit: "%" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Period comparison indicator */}
      {data.period_comparison && (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Comparación vs periodo anterior</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500">Servicios</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-lg font-bold ${data.period_comparison.variacion.servicios >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {data.period_comparison.variacion.servicios >= 0 ? "+" : ""}{data.period_comparison.variacion.servicios}%
                </span>
                <span className="text-xs text-slate-400">
                  ({data.period_comparison.actual.servicios_completados} vs {data.period_comparison.anterior.servicios_completados})
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500">Tareas</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-lg font-bold ${data.period_comparison.variacion.tareas >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {data.period_comparison.variacion.tareas >= 0 ? "+" : ""}{data.period_comparison.variacion.tareas}%
                </span>
                <span className="text-xs text-slate-400">
                  ({data.period_comparison.actual.tareas_completadas} vs {data.period_comparison.anterior.tareas_completadas})
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500">Tiempo promedio</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-lg font-bold ${(data.period_comparison.variacion.tiempo ?? 0) <= 0 ? "text-green-600" : "text-red-600"}`}>
                  {data.period_comparison.variacion.tiempo >= 0 ? "+" : ""}{data.period_comparison.variacion.tiempo}%
                </span>
                <span className="text-xs text-slate-400">
                  ({formatMinutos(data.period_comparison.actual.tiempo_promedio)} vs {formatMinutos(data.period_comparison.anterior.tiempo_promedio)})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI cards grouped */}
      {kpiGroups.map((group) => (
        <div key={group.title} className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            {group.icon}
            {group.title}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.cards.map((card) => (
              <div key={card.label} className="bg-slate-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-slate-800">
                  {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
                  <span className="text-sm font-normal text-slate-400 ml-1">{card.unit}</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">{card.label}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Legacy KPIs */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-slate-800 mb-4">KPIs del Sistema</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Datos completos", value: kpi.registros_completos_pct, unit: "%" },
            { label: "Con tareas", value: kpi.servicios_con_tareas_pct, unit: "%" },
            { label: "Dentro tiempo", value: kpi.completados_dentro_tiempo_pct, unit: "%" },
            { label: "Consultados", value: kpi.servicios_consultados_pct, unit: "%" },
            { label: "Visibilidad", value: kpi.satisfaccion_visibilidad, unit: "/5" },
            { label: "Evaluados", value: kpi.servicios_evaluados_pct, unit: "%" },
            { label: "Con feedback", value: kpi.servicios_con_comentarios_pct, unit: "%" },
            { label: "Tiempo prom.", value: kpi.tiempo_promedio_min, unit: "min" },
          ].map((k) => (
            <div key={k.label} className="bg-slate-50 rounded-lg p-3">
              <p className="text-lg font-bold text-slate-800">
                {k.value}{k.unit}
              </p>
              <p className="text-xs text-slate-500">{k.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Gráficos Tab ──

function GraficosTab({ data }: { data: DashboardV2Response | undefined }) {
  if (!data) return null;
  const { graficos } = data;

  const estadoPieData = [
    { name: "Pendiente", value: graficos.estado_servicios.pendiente, color: "#f59e0b" },
    { name: "En Progreso", value: graficos.estado_servicios.en_progreso, color: "#3b82f6" },
    { name: "Completado", value: graficos.estado_servicios.completado, color: "#22c55e" },
    { name: "Bloqueado", value: graficos.estado_servicios.bloqueado, color: "#ef4444" },
  ];

  const areaBarData = graficos.servicios_por_area.map((a) => ({
    name: a.area_nombre,
    value: a.total,
    completados: a.completados,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <PieChartCard title="Distribución de Servicios por Estado" data={estadoPieData} />
      <BarChartCard
        title="Servicios por Área"
        data={areaBarData}
        valueLabel="Total servicios"
        color="#3b82f6"
      />
      <div className="lg:col-span-2">
        <SatisfactionByAreaChart
          title="Satisfacción por Área"
          data={graficos.satisfaccion_por_area}
        />
      </div>
    </div>
  );
}

// ── Ranking Tab ──

function RankingTab({
  data,
  navigate,
}: {
  data: DashboardV2Response | undefined;
  navigate: (path: string) => void;
}) {
  if (!data) return null;
  const { servicios_activos, rankings } = data;

  return (
    <div className="space-y-6">
      {/* Ranking */}
      {rankings.colaboradores_destacados.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-500" />
            Colaboradores destacados
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-2 text-slate-500 font-medium">Colaborador</th>
                  <th className="text-center py-2 px-2 text-slate-500 font-medium">Servicios</th>
                  <th className="text-center py-2 px-2 text-slate-500 font-medium">Tareas</th>
                  <th className="text-center py-2 px-2 text-slate-500 font-medium">Eficiencia</th>
                </tr>
              </thead>
              <tbody>
                {rankings.colaboradores_destacados.map((c, i) => (
                  <tr key={c.usuario_id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-xs flex items-center justify-center font-medium text-slate-600">
                          {i + 1}
                        </span>
                        <span className="font-medium text-slate-800">{c.nombres}</span>
                      </div>
                    </td>
                    <td className="text-center py-2 px-2 text-slate-600">{c.servicios_completados}</td>
                    <td className="text-center py-2 px-2 text-slate-600">{c.tareas_completadas}</td>
                    <td className="text-center py-2 px-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        c.eficiencia >= 80 ? "bg-green-100 text-green-700" :
                        c.eficiencia >= 50 ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {c.eficiencia}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Active Services Table */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-blue-500" />
          Servicios en Progreso ({servicios_activos.length})
        </h3>
        {servicios_activos.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            No hay servicios activos en este momento
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Código</th>
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Servicio</th>
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Cliente</th>
                  <th className="text-center py-2 px-3 text-slate-500 font-medium">Prioridad</th>
                  <th className="text-center py-2 px-3 text-slate-500 font-medium">Progreso</th>
                  <th className="text-center py-2 px-3 text-slate-500 font-medium">Tiempo</th>
                </tr>
              </thead>
              <tbody>
                {servicios_activos.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/servicios/${s.id}`)}
                    className="border-b border-slate-100 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 font-mono text-xs text-slate-400">{s.codigo}</td>
                    <td className="py-3 px-3">
                      <p className="font-medium text-slate-800 truncate max-w-[200px]">{s.descripcion}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{s.cliente}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPrioridadClass(s.prioridad)}`}>
                        {s.prioridad}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              s.progreso_porcentaje >= 80 ? "bg-green-500" :
                              s.progreso_porcentaje >= 40 ? "bg-blue-500" :
                              "bg-amber-500"
                            }`}
                            style={{ width: `${s.progreso_porcentaje}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-8 text-right">{s.progreso_porcentaje}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center text-xs text-slate-500">
                      {formatMinutos(s.tiempo_en_curso)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Comparativo Tab ──

function ComparativoTab({ data }: { data: DashboardV2Response | undefined }) {
  if (!data) return null;
  const { indicadores, kpi, period_comparison } = data;

  return (
    <div className="space-y-6">
      {/* Period Comparison Detail */}
      {period_comparison && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Comparación Detallada de Periodos
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Métrica</th>
                  <th className="text-right py-2 px-3 text-slate-500 font-medium">Actual</th>
                  <th className="text-right py-2 px-3 text-slate-500 font-medium">Anterior</th>
                  <th className="text-right py-2 px-3 text-slate-500 font-medium">Variación</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    label: "Servicios completados",
                    actual: period_comparison.actual.servicios_completados,
                    anterior: period_comparison.anterior.servicios_completados,
                    variacion: period_comparison.variacion.servicios,
                  },
                  {
                    label: "Tareas completadas",
                    actual: period_comparison.actual.tareas_completadas,
                    anterior: period_comparison.anterior.tareas_completadas,
                    variacion: period_comparison.variacion.tareas,
                  },
                  {
                    label: "Tiempo promedio",
                    actual: period_comparison.actual.tiempo_promedio,
                    anterior: period_comparison.anterior.tiempo_promedio,
                    variacion: period_comparison.variacion.tiempo,
                    unit: "min",
                    invertColor: true,
                  },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-slate-100">
                    <td className="py-2.5 px-3 text-slate-800 font-medium">{row.label}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {row.unit ? `${row.actual} ${row.unit}` : row.actual}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {row.unit ? `${row.anterior} ${row.unit}` : row.anterior}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        row.variacion === 0 ? "bg-slate-100 text-slate-600" :
                        row.variacion > 0
                          ? row.invertColor ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                          : row.invertColor ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {row.variacion > 0 ? "+" : ""}{row.variacion}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Resumen General</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Tiempo promedio", value: kpi.tiempo_promedio_min, unit: "min", color: "bg-blue-500" },
            { label: "Productividad", value: indicadores.productividad.promedio_por_colaborador, unit: "/col", color: "bg-green-500" },
            { label: "Satisfacción", value: indicadores.satisfaccion.promedio_calificacion, unit: "/5", color: "bg-purple-500" },
            { label: "% a tiempo", value: indicadores.eficiencia.porcentaje_a_tiempo, unit: "%", color: "bg-amber-500" },
          ].map((card) => (
            <div key={card.label} className="rounded-lg p-4 border border-slate-200">
              <div className={`w-8 h-8 rounded-lg ${card.color} flex items-center justify-center text-white text-xs font-bold mb-2`}>
                {card.unit}
              </div>
              <p className="text-2xl font-bold text-slate-800">
                {typeof card.value === "number" ? card.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : card.value}
              </p>
              <p className="text-xs text-slate-500 mt-1">{card.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chart section in Reportes */}
      <TrendLineChart
        title="Indicadores de Eficiencia"
        data={[
          { label: "Completos", valor: kpi.registros_completos_pct },
          { label: "Tareas", valor: kpi.servicios_con_tareas_pct },
          { label: "Tiempo", valor: kpi.completados_dentro_tiempo_pct },
          { label: "Consultas", valor: kpi.servicios_consultados_pct },
          { label: "Evaluación", valor: kpi.servicios_evaluados_pct },
          { label: "Feedback", valor: kpi.servicios_con_comentarios_pct },
        ]}
        lineLabel="% KPI"
        lineColor="#8b5cf6"
      />
    </div>
  );
}
