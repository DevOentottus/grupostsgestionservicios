import { useState, useCallback, useMemo, useEffect } from "react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, subDays, subMonths, subQuarters } from "date-fns";
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
  CheckCircle2,
  Zap,
  Star,
  FileText,
} from "lucide-react";
import { useAuth } from "@/lib/auth.js";
import { useDashboard } from "@/api/queries/useDashboard.js";
import { DateRangeFilter } from "@/app/components/filters/DateRangeFilter.js";
import { AreaFilter } from "@/app/components/filters/AreaFilter.js";
import { PieChartCard } from "@/app/components/charts/PieChart.js";
import { BarChartCard } from "@/app/components/charts/BarChart.js";
import { TrendLineChart } from "@/app/components/charts/TrendLineChart.js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { cn, formatMinutos } from "@/app/lib/utils";
import { InfoPopover } from "@/app/components/ui/info-popover.js";
import type { DashboardFilters, DashboardV2Response } from "@shared/index.js";

// -- Helpers --

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

// -- Tabs --

type TabId = "alertas" | "indicadores" | "graficos" | "ranking" | "comparativo";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "alertas", label: "Alertas", icon: <AlertTriangle className="w-4 h-4" /> },
  { id: "indicadores", label: "Indicadores", icon: <Activity className="w-4 h-4" /> },
  { id: "graficos", label: "Gráficos", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "ranking", label: "Ranking", icon: <Users className="w-4 h-4" /> },
  { id: "comparativo", label: "Comparativo", icon: <TrendingUp className="w-4 h-4" /> },
];

// -- Dashboard Page --

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("alertas");

  // Fecha por defecto: 1er día del mes actual → hoy
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultInicio = firstDay.toISOString().split("T")[0];
  const defaultFin = today.toISOString().split("T")[0];

  const [filters, setFilters] = useState<DashboardFilters>({
    fecha_inicio: defaultInicio,
    fecha_fin: defaultFin,
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const [compararPeriodo, setCompararPeriodo] = useState(false);
  const [compararFechaInicio, setCompararFechaInicio] = useState("");
  const [compararFechaFin, setCompararFechaFin] = useState("");

  const queryFilters = useMemo<DashboardFilters>(() => ({
    ...filters,
    comparar_periodo: compararPeriodo || undefined,
    comparar_fecha_inicio: compararPeriodo ? (compararFechaInicio || undefined) : undefined,
    comparar_fecha_fin: compararPeriodo ? (compararFechaFin || undefined) : undefined,
  }), [filters, compararPeriodo, compararFechaInicio, compararFechaFin]);

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

  const handleCompararFechaChange = useCallback((inicio: string, fin: string) => {
    setCompararFechaInicio(inicio);
    setCompararFechaFin(fin);
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
      {/* Welcome Banner - Figma gradient style */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <h1 className="text-white text-xl font-bold">Bienvenido, {user?.nombres || "Usuario"}</h1>
            <span className="text-blue-200 text-sm">·</span>
            <span className="text-blue-200 text-sm">
              {currentTime.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" })} -- {currentTime.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-blue-200">Total: <strong className="text-white">{data?.total_servicios ?? 0}</strong></span>
              <span className="text-blue-200">·</span>
              <span className="text-blue-200">Completados: <strong className="text-green-300">{data?.completados ?? 0}</strong></span>
            </div>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-xl transition-colors disabled:opacity-50 text-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Actualizar
            </button>
            <button
              onClick={() => {
                const base = import.meta.env.VITE_API_URL || "";
                const params = new URLSearchParams();
                if (filters.fecha_inicio) params.set("fecha_inicio", filters.fecha_inicio);
                if (filters.fecha_fin) params.set("fecha_fin", filters.fecha_fin);
                window.open(`${base}/api/seguimiento/dashboard/pdf?${params.toString()}`, "_blank");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white"
            >
              <FileText className="w-3.5 h-3.5" />
              Exportar PDF
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <DateRangeFilter
            fechaInicio={filters.fecha_inicio ?? ""}
            fechaFin={filters.fecha_fin ?? ""}
            onChange={handleDateChange}
          />
          <AreaFilter value={filters.area_id} onChange={handleAreaChange} />
        </div>
      </div>

      {/* Tab Navigation - responsive scroll en mobile */}
      <div className="overflow-x-auto -mx-4 md:mx-0">
        <div className="flex gap-1 border-b border-gray-200 px-4 md:px-0 min-w-max md:min-w-0">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 md:px-4 py-2.5 text-sm whitespace-nowrap transition-colors rounded-t-lg",
                activeTab === id
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 font-medium"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50",
              )}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
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
          {activeTab === "comparativo" && (
            <ComparativoTab
              data={data}
              compararPeriodo={compararPeriodo}
              onToggleComparar={setCompararPeriodo}
              fechaPeriodo1={filters.fecha_inicio ?? ""}
              fechaFinPeriodo1={filters.fecha_fin ?? ""}
              onPeriodo1Change={handleDateChange}
              compararFechaInicio={compararFechaInicio}
              compararFechaFin={compararFechaFin}
              onCompararFechaChange={handleCompararFechaChange}
            />
          )}
        </>
      )}
    </div>
  );
}

// -- Alertas Tab --

function AlertasTab({ data }: { data: DashboardV2Response | undefined }) {
  if (!data) return null;
  const { alertas } = data;

  // KPI stat cards for alertas overview
  const statCards = [
    { label: "Servicios bloqueados", value: alertas.blocked_count, icon: AlertTriangle, color: "bg-red-500", textColor: "text-red-600" },
    { label: "Servicios con demora", value: alertas.delayed_services.length, icon: Clock, color: "bg-orange-500", textColor: "text-orange-600" },
    { label: "Servicios sin actividad", value: alertas.stale_services.length, icon: Activity, color: "bg-amber-500", textColor: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${s.color} flex items-center justify-center`}>
                <s.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl text-gray-900" style={{ fontWeight: 700 }}>{s.value}</p>
                <p className="text-gray-500 text-sm">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delayed Services */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-500" />
          <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Servicios con demora ({alertas.delayed_services.length})</h3>
        </div>
        {alertas.delayed_services.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Sin servicios con demora</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {alertas.delayed_services.map((s) => (
              <div
                key={s.id}
                className="px-5 py-3.5 hover:bg-gray-50 transition flex flex-wrap items-center justify-between gap-2 border-l-4 border-l-orange-400"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">{s.codigo}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPrioridadClass(s.prioridad)}`}>
                      {s.prioridad}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 truncate">{s.descripcion}</p>
                  <p className="text-xs text-gray-500">{s.cliente}</p>
                </div>
                <div className="text-xs text-orange-700 font-medium whitespace-nowrap">
                  {formatMinutos(s.tiempo_transcurrido_minutos)}
                  {s.tiempo_estimado ? ` / ${formatMinutos(s.tiempo_estimado)}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stale Services */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-500" />
          <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Servicios sin actividad ({alertas.stale_services.length})</h3>
        </div>
        {alertas.stale_services.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Sin servicios estancados</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {alertas.stale_services.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "px-5 py-3.5 hover:bg-gray-50 transition flex flex-wrap items-center justify-between gap-2 border-l-4",
                  s.horas_sin_actividad >= 72 ? "border-l-red-500" : s.horas_sin_actividad >= 48 ? "border-l-orange-400" : "border-l-amber-400",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.descripcion}</p>
                  <p className="text-xs text-gray-500">{s.cliente}</p>
                </div>
                <div className="text-xs font-medium whitespace-nowrap text-gray-600">
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

// -- Indicadores Tab --

function IndicadoresTab({ data }: { data: DashboardV2Response | undefined }) {
  if (!data) return null;
  const { indicadores, kpi } = data;

  const kpiGroups = [
    {
      title: "Productividad",
      icon: Zap,
      iconBg: "bg-blue-900",
      iconColor: "text-yellow-400",
      cards: [
        { label: "Servicios completados", value: indicadores.productividad.servicios_completados, unit: "" },
        { label: "Tareas completadas", value: indicadores.productividad.tareas_completadas, unit: "" },
        { label: "Promedio x colaborador", value: indicadores.productividad.promedio_por_colaborador, unit: "" },
      ],
    },
    {
      title: "Eficiencia",
      icon: TrendingUp,
      iconBg: "bg-green-600",
      iconColor: "text-white",
      cards: [
        { label: "Tiempo promedio", value: formatMinutos(indicadores.eficiencia.tiempo_promedio_min), unit: "" },
        { label: "% a tiempo", value: indicadores.eficiencia.porcentaje_a_tiempo, unit: "%" },
        { label: "Cant. retrasos", value: indicadores.eficiencia.cantidad_retrasos, unit: "" },
      ],
    },
    {
      title: "Satisfacción",
      icon: Star,
      iconBg: "bg-yellow-500",
      iconColor: "text-white",
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-gray-800 mb-3" style={{ fontWeight: 600 }}>Comparación vs periodo anterior</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Servicios</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn("text-lg font-bold", data.period_comparison.variacion.servicios >= 0 ? "text-green-600" : "text-red-600")}>
                  {data.period_comparison.variacion.servicios >= 0 ? "+" : ""}{data.period_comparison.variacion.servicios}%
                </span>
                <span className="text-xs text-gray-400">
                  ({data.period_comparison.anterior.servicios_completados} vs {data.period_comparison.actual.servicios_completados})
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500">Tareas</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn("text-lg font-bold", data.period_comparison.variacion.tareas >= 0 ? "text-green-600" : "text-red-600")}>
                  {data.period_comparison.variacion.tareas >= 0 ? "+" : ""}{data.period_comparison.variacion.tareas}%
                </span>
                <span className="text-xs text-gray-400">
                  ({data.period_comparison.anterior.tareas_completadas} vs {data.period_comparison.actual.tareas_completadas})
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500">Tiempo promedio</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn("text-lg font-bold", (data.period_comparison.variacion.tiempo ?? 0) <= 0 ? "text-green-600" : "text-red-600")}>
                  {data.period_comparison.variacion.tiempo >= 0 ? "+" : ""}{data.period_comparison.variacion.tiempo}%
                </span>
                <span className="text-xs text-gray-400">
                  ({formatMinutos(data.period_comparison.anterior.tiempo_promedio)} vs {formatMinutos(data.period_comparison.actual.tiempo_promedio)})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI cards grouped - Figma style with colored icon containers */}
      {kpiGroups.map((group) => {
        const GroupIcon = group.icon;
        return (
          <div key={group.title} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-8 h-8 rounded-lg ${group.iconBg} flex items-center justify-center`}>
                <GroupIcon className={`w-4 h-4 ${group.iconColor}`} />
              </div>
              <div className="flex items-center gap-1.5">
                <p className="text-gray-800 text-sm" style={{ fontWeight: 700 }}>{group.title}</p>
                {group.title === "Productividad" && (
                  <InfoPopover
                    variant="formula"
                    formula="Servicios/tareas completados en el período seleccionado, dividido entre colaboradores activos."
                    descripcion="Mide el volumen de trabajo completado. A mayor número, mayor productividad del equipo."
                    tip="Compará este valor contra períodos anteriores para detectar tendencias. Una caída sostenida puede indicar sobrecarga o problemas de proceso."
                  />
                )}
                {group.title === "Eficiencia" && (
                  <InfoPopover
                    variant="formula"
                    formula="Tiempo real de tareas (tracking) acumulado ÷ N° de tareas/servicios completados."
                    descripcion="Evalúa qué tan rápido se completan los servicios. Menor tiempo promedio indica mayor eficiencia operativa."
                    tip="El % a tiempo ideal debe estar sobre el 90%. Valores bajo 70% requieren revisión de procesos y asignación de recursos."
                  />
                )}
                {group.title === "Satisfacción" && (
                  <InfoPopover
                    variant="formula"
                    formula="Sumatoria de calificaciones (1–5) ÷ Total de servicios evaluados × 100"
                    descripcion="Mide la percepción del cliente sobre la calidad del servicio. Una calificación ≥ 4.0 se considera satisfactoria."
                    tip="Fomentá que los clientes evalúen después de cada servicio. Entre más evaluaciones, más representativa es la métrica."
                  />
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.cards.map((card) => (
                <div key={card.label} className="bg-gray-50 rounded-xl p-4">
                  <p className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>
                    {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
                    <span className="text-sm font-normal text-gray-400 ml-1">{card.unit}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{card.label}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* KPIs del Sistema */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="text-gray-800 mb-4" style={{ fontWeight: 600 }}>KPIs del Sistema</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Datos completos", value: kpi.registros_completos_pct, unit: "%" },
            { label: "Con tareas", value: kpi.servicios_con_tareas_pct, unit: "%" },
            { label: "Dentro tiempo", value: kpi.completados_dentro_tiempo_pct, unit: "%" },
            { label: "Consultados", value: kpi.servicios_consultados_pct, unit: "%" },
            { label: "Visibilidad", value: kpi.satisfaccion_visibilidad, unit: "/5" },
            { label: "Evaluados", value: kpi.servicios_evaluados_pct, unit: "%" },
            { label: "Con feedback", value: kpi.servicios_con_comentarios_pct, unit: "%" },
            { label: "Tiempo prom.", value: formatMinutos(kpi.tiempo_promedio_min), unit: "" },
          ].map((k) => (
            <div key={k.label} className="bg-gray-50 rounded-xl p-3">
              <p className="text-lg text-gray-900" style={{ fontWeight: 700 }}>
                {k.value}{k.unit}
              </p>
              <p className="text-xs text-gray-500">{k.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -- Gráficos Tab --

function GraficosTab({ data }: { data: DashboardV2Response | undefined }) {
  if (!data) return null;
  const { graficos, kpi } = data;

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

  const maxStars = 5;
  const avg = kpi.satisfaccion_visibilidad;
  const fullStars = Math.floor(avg);
  const hasHalf = avg - fullStars >= 0.25 && avg - fullStars < 0.75;
  const roundStars = Math.round(avg);

  const satBars = [
    {
      label: "Clientes que califican",
      pct: kpi.servicios_evaluados_pct,
      color: "bg-blue-500",
    },
    {
      label: "Calificaciones positivas (≥3)",
      pct: kpi.calificaciones_positivas_pct,
      color: "bg-green-500",
    },
    {
      label: "Calificaciones negativas (<3)",
      pct: kpi.calificaciones_negativas_pct,
      color: "bg-red-400",
    },
  ];

  const SAT_COLORS = [
    "#22c55e",
    "#3b82f6",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
  ];

  // Ordenar satisfacción por área de mayor a menor
  const satAreaSorted = [...graficos.satisfaccion_por_area].sort(
    (a, b) => b.promedio - a.promedio,
  );

  const satAreaChartData = satAreaSorted.map((d) => ({
    name: d.area_nombre,
    value: d.promedio,
    cantidad: d.cantidad,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="flex flex-col gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <PieChartCard title="Distribución de Servicios por Estado" data={estadoPieData} />
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <BarChartCard
          title="Servicios por Área"
          data={areaBarData}
          valueLabel="Total servicios"
          color="#3b82f6"
        />
      </div>
      <div className="lg:col-span-2">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Satisfacción general */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-yellow-500" />
              <h3 className="text-gray-800 font-semibold">Satisfacción general</h3>
            </div>

            {/* Número y estrellas */}
            <div className="flex items-center gap-3 mb-5">
              <span className="text-3xl font-bold text-gray-900">{avg.toFixed(1)}</span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: maxStars }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-5 h-5",
                      i < roundStars ? "fill-yellow-400 text-yellow-400" : "text-gray-200",
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Barras horizontales */}
            <div className="space-y-4">
              {satBars.map((bar) => (
                <div key={bar.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{bar.label}</span>
                    <span className="font-semibold text-gray-800">{bar.pct}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${bar.color}`}
                      style={{ width: `${Math.min(bar.pct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Satisfacción por Área -- horizontales, ordenado desc */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <h3 className="text-gray-800 font-semibold">Satisfacción por Área</h3>
            </div>
            {satAreaChartData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
                No hay datos de satisfacción disponibles
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={satAreaChartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} width={90} />
                  <Tooltip
                    formatter={(value, _name, entry) => {
                      const payload = entry?.payload as Record<string, unknown> | undefined;
                      return [
                        `${typeof value === "number" ? value.toFixed(1) : value} / 5`,
                        `Promedio (${payload?.cantidad ?? 0} eval.)`,
                      ];
                    }}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px" }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {satAreaChartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={SAT_COLORS[index % SAT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Ranking Tab --

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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-500" />
            <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Colaboradores destacados</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-3 px-4 text-gray-500 text-xs font-medium">Colaborador</th>
                  <th className="text-center py-3 px-4 text-gray-500 text-xs font-medium">Servicios</th>
                  <th className="text-center py-3 px-4 text-gray-500 text-xs font-medium">Tareas</th>
                  <th className="text-center py-3 px-4 text-gray-500 text-xs font-medium">Eficiencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rankings.colaboradores_destacados.map((c, i) => (
                  <tr key={c.usuario_id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold",
                          i === 0 ? "bg-yellow-400 text-blue-900" :
                          i === 1 ? "bg-gray-300 text-gray-700" :
                          i === 2 ? "bg-amber-600 text-white" :
                          "bg-gray-100 text-gray-500",
                        )}>
                          {i + 1}
                        </span>
                        <span className="font-medium text-gray-800">{c.nombres}</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4 text-gray-600">{c.servicios_completados}</td>
                    <td className="text-center py-3 px-4 text-gray-600">{c.tareas_completadas}</td>
                    <td className="text-center py-3 px-4">
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        c.eficiencia >= 80 ? "bg-green-100 text-green-700" :
                        c.eficiencia >= 50 ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700",
                      )}>
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-blue-500" />
          <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Servicios en Progreso ({servicios_activos.length})</h3>
        </div>
        {servicios_activos.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No hay servicios activos en este momento</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-3 px-4 text-gray-500 text-xs font-medium">Código</th>
                  <th className="text-left py-3 px-4 text-gray-500 text-xs font-medium">Servicio</th>
                  <th className="text-left py-3 px-4 text-gray-500 text-xs font-medium">Cliente</th>
                  <th className="text-center py-3 px-4 text-gray-500 text-xs font-medium">Prioridad</th>
                  <th className="text-center py-3 px-4 text-gray-500 text-xs font-medium">Progreso</th>
                  <th className="text-center py-3 px-4 text-gray-500 text-xs font-medium">Tiempo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {servicios_activos.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/servicios/${s.id}`)}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-xs text-gray-400">{s.codigo}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-800 truncate max-w-[200px]">{s.descripcion}</p>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{s.cliente}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", getPrioridadClass(s.prioridad))}>
                        {s.prioridad}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              s.progreso_porcentaje >= 80 ? "bg-green-500" :
                              s.progreso_porcentaje >= 40 ? "bg-blue-500" :
                              "bg-amber-500",
                            )}
                            style={{ width: `${s.progreso_porcentaje}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{s.progreso_porcentaje}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-xs text-gray-500">
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

// -- Comparativo Tab --

function ComparativoTab({
  data,
  compararPeriodo,
  onToggleComparar,
  fechaPeriodo1,
  fechaFinPeriodo1,
  onPeriodo1Change,
  compararFechaInicio,
  compararFechaFin,
  onCompararFechaChange,
}: {
  data: DashboardV2Response | undefined;
  compararPeriodo: boolean;
  onToggleComparar: (v: boolean) => void;
  fechaPeriodo1: string;
  fechaFinPeriodo1: string;
  onPeriodo1Change: (inicio: string, fin: string) => void;
  compararFechaInicio: string;
  compararFechaFin: string;
  onCompararFechaChange: (inicio: string, fin: string) => void;
}) {
  if (!data) return null;
  const { indicadores, kpi, period_comparison } = data;
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Comparison Toggle + Date Ranges */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-sm text-slate-700 font-medium">Comparar periodos</span>
          <button
            type="button"
            role="switch"
            aria-checked={compararPeriodo}
            onClick={() => {
              if (compararPeriodo) setActiveFilter(null);
              onToggleComparar(!compararPeriodo);
            }}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              compararPeriodo ? "bg-blue-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                compararPeriodo ? "translate-x-[18px]" : "translate-x-[2px]"
              }`}
            />
          </button>
        </label>

        {compararPeriodo && (
          <>
            {/* Filtros rápidos de pares equivalente */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                {
                  label: "Día anterior -- Día actual",
                  apply: () => {
                    const hoy = new Date();
                    const ayer = subDays(hoy, 1);
                    onPeriodo1Change(format(startOfDay(hoy), "yyyy-MM-dd"), format(endOfDay(hoy), "yyyy-MM-dd"));
                    onCompararFechaChange(format(startOfDay(ayer), "yyyy-MM-dd"), format(endOfDay(ayer), "yyyy-MM-dd"));
                  },
                },
                {
                  label: "Sem. anterior -- Sem. actual",
                  apply: () => {
                    const now = new Date();
                    const semanaActualInicio = startOfWeek(now, { weekStartsOn: 1 });
                    const semanaActualFin = endOfWeek(now, { weekStartsOn: 1 });
                    const semanaAnteriorInicio = subDays(semanaActualInicio, 7);
                    const semanaAnteriorFin = subDays(semanaActualFin, 7);
                    onPeriodo1Change(format(semanaActualInicio, "yyyy-MM-dd"), format(semanaActualFin, "yyyy-MM-dd"));
                    onCompararFechaChange(format(semanaAnteriorInicio, "yyyy-MM-dd"), format(semanaAnteriorFin, "yyyy-MM-dd"));
                  },
                },
                {
                  label: "Mes anterior -- Mes actual",
                  apply: () => {
                    const now = new Date();
                    const mesActualInicio = startOfMonth(now);
                    const mesActualFin = endOfMonth(now);
                    const mesAnteriorInicio = startOfMonth(subMonths(now, 1));
                    const mesAnteriorFin = endOfMonth(subMonths(now, 1));
                    onPeriodo1Change(format(mesActualInicio, "yyyy-MM-dd"), format(mesActualFin, "yyyy-MM-dd"));
                    onCompararFechaChange(format(mesAnteriorInicio, "yyyy-MM-dd"), format(mesAnteriorFin, "yyyy-MM-dd"));
                  },
                },
                {
                  label: "Trim. anterior -- Trim. actual",
                  apply: () => {
                    const now = new Date();
                    const trimActualInicio = startOfQuarter(now);
                    const trimActualFin = endOfQuarter(now);
                    const trimAnteriorInicio = startOfQuarter(subQuarters(now, 1));
                    const trimAnteriorFin = endOfQuarter(subQuarters(now, 1));
                    onPeriodo1Change(format(trimActualInicio, "yyyy-MM-dd"), format(trimActualFin, "yyyy-MM-dd"));
                    onCompararFechaChange(format(trimAnteriorInicio, "yyyy-MM-dd"), format(trimAnteriorFin, "yyyy-MM-dd"));
                  },
                },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    setActiveFilter(opt.label);
                    opt.apply();
                  }}
                  className={cn(
                    "text-xs font-medium px-2.5 py-1.5 border rounded-lg transition-colors",
                    activeFilter === opt.label
                      ? "bg-blue-900 text-white border-blue-900"
                      : "text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-800",
                  )}
                >
                  {activeFilter === opt.label ? "✓ " + opt.label.replace(" -- ", " vs ") : opt.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-2">Periodo anterior</p>
                <DateRangeFilter
                  fechaInicio={compararFechaInicio}
                  fechaFin={compararFechaFin}
                  onChange={onCompararFechaChange}
                />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-2">Periodo actual</p>
                <DateRangeFilter
                  fechaInicio={fechaPeriodo1}
                  fechaFin={fechaFinPeriodo1}
                  onChange={onPeriodo1Change}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Period Comparison Detail */}
      {period_comparison && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Comparación Detallada de Periodos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-3 px-4 text-gray-500 text-xs font-medium">Métrica</th>
                  <th className="text-right py-3 px-4 text-gray-500 text-xs font-medium">Anterior</th>
                  <th className="text-right py-3 px-4 text-gray-500 text-xs font-medium">Actual</th>
                  <th className="text-right py-3 px-4 text-gray-500 text-xs font-medium">Variación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
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
                  <tr key={row.label} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 text-gray-800 font-medium">{row.label}</td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {row.unit ? `${row.anterior} ${row.unit}` : row.anterior}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {row.unit ? `${row.actual} ${row.unit}` : row.actual}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                        row.variacion === 0 ? "bg-gray-100 text-gray-600" :
                        row.variacion > 0
                          ? row.invertColor ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                          : row.invertColor ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
                      )}>
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
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="text-gray-800 mb-4" style={{ fontWeight: 600 }}>Resumen General</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Tiempo promedio", value: formatMinutos(kpi.tiempo_promedio_min), unit: "", color: "bg-blue-500", icon: Clock },
            { label: "Productividad", value: indicadores.productividad.promedio_por_colaborador, unit: "/col", color: "bg-green-500", icon: Zap },
            { label: "Satisfacción", value: indicadores.satisfaccion.promedio_calificacion, unit: "/5", color: "bg-purple-500", icon: Star },
            { label: "% a tiempo", value: indicadores.eficiencia.porcentaje_a_tiempo, unit: "%", color: "bg-amber-500", icon: TrendingUp },
          ].map((card) => {
            const CardIcon = card.icon;
            return (
              <div key={card.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className={`w-9 h-9 rounded-xl ${card.color} flex items-center justify-center mb-3`}>
                  <CardIcon className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>
                  {typeof card.value === "number" ? card.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : card.value}
                </p>
                <p className="text-xs text-gray-500 mt-1">{card.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart section */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
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
    </div>
  );
}
