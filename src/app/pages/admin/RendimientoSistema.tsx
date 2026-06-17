import { useState, useCallback } from "react";
import {
  Eye,
  BarChart3,
  Users,
  Star,
  Activity,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth.js";
import { useRendimiento } from "@/api/queries/useRendimiento.js";
import { cn } from "@/app/lib/utils";
import type { RendimientoResponse } from "@shared/index.js";

// -- Helpers --

function formatMinutos(m: number): string {
  if (m < 60) return `${Math.round(m)} min`;
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return `${h}h ${min}m`;
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

type TabId = "visitas" | "kpi" | "calificaciones" | "colaboradores" | "sistema";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "visitas", label: "Visitas de Clientes", icon: <Eye className="w-4 h-4" /> },
  { id: "kpi", label: "KPIs de Rendimiento", icon: <Activity className="w-4 h-4" /> },
  { id: "calificaciones", label: "Calificaciones", icon: <Star className="w-4 h-4" /> },
  { id: "colaboradores", label: "Colaboradores", icon: <Users className="w-4 h-4" /> },
  { id: "sistema", label: "Sistema", icon: <BarChart3 className="w-4 h-4" /> },
];

// -- Page --

export function RendimientoSistemaPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("visitas");
  const { data, isLoading, isError, error, refetch, isFetching } = useRendimiento();

  if (isError) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-medium">Error al cargar rendimiento del sistema</p>
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
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl mb-1" style={{ fontWeight: 700 }}>Rendimiento del Sistema</h1>
            <p className="text-blue-200 text-sm">
              Panel de monitoreo -- {new Date().toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-yellow-400/20 text-yellow-300 text-sm px-3 py-1.5 rounded-full" style={{ fontWeight: 600 }}>
              Administrador
            </span>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-xl transition-colors disabled:opacity-50 text-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>
        </div>
        <p className="text-blue-200 text-xs mt-2">
          {data?.sistema.total_servicios ?? 0} servicios · {data?.performance.servicios_completados ?? 0} completados · {data?.visit_tracking.total_visitas ?? 0} visitas de clientes
        </p>
      </div>

      {/* Summary cards row */}
      {data && <SummaryCards data={data} />}

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm transition-colors rounded-t-lg whitespace-nowrap",
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

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 mt-3 text-sm">Cargando rendimiento...</p>
        </div>
      ) : data ? (
        <>
          {activeTab === "visitas" && <VisitasTab data={data} />}
          {activeTab === "kpi" && <KPITab data={data} />}
          {activeTab === "calificaciones" && <CalificacionesTab data={data} />}
          {activeTab === "colaboradores" && <ColaboradoresTab data={data} />}
          {activeTab === "sistema" && <SistemaTab data={data} />}
        </>
      ) : null}
    </div>
  );
}

// -- Summary Cards --

function SummaryCards({ data }: { data: RendimientoResponse }) {
  const cards = [
    { label: "Visitas de clientes", value: data.visit_tracking.total_visitas, icon: Eye, color: "bg-purple-500" },
    { label: "Tasa completación", value: `${Math.round(data.performance.tasa_completacion)}%`, icon: CheckCircle2, color: "bg-green-500" },
    { label: "Calificación prom.", value: data.calificaciones.promedio_calificacion.toFixed(1), icon: Star, color: "bg-yellow-500", suffix: "/5" },
    { label: "Tareas completadas", value: data.performance.tareas_completadas, icon: Zap, color: "bg-blue-500" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${c.color} flex items-center justify-center`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl text-gray-900" style={{ fontWeight: 700 }}>
                  {c.value}{c.suffix || ""}
                </p>
                <p className="text-gray-500 text-sm">{c.label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -- Visitas Tab --

function VisitasTab({ data }: { data: RendimientoResponse }) {
  const { visit_tracking: v } = data;

  return (
    <div className="space-y-6">
      {/* Top Consultados */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Eye className="w-4 h-4 text-purple-500" />
          <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Servicios más consultados por clientes</h3>
        </div>
        {v.servicios_mas_consultados.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Aún no hay visitas registradas</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-3 px-4 text-gray-500 text-xs font-medium">#</th>
                  <th className="text-left py-3 px-4 text-gray-500 text-xs font-medium">Código</th>
                  <th className="text-left py-3 px-4 text-gray-500 text-xs font-medium">Servicio</th>
                  <th className="text-center py-3 px-4 text-gray-500 text-xs font-medium">Visitas</th>
                  <th className="text-right py-3 px-4 text-gray-500 text-xs font-medium">Última visita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {v.servicios_mas_consultados.map((s, i) => (
                  <tr key={s.servicio_id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4">
                      <span className={cn(
                        "w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold",
                        i === 0 ? "bg-yellow-400 text-blue-900" :
                        i === 1 ? "bg-gray-300 text-gray-700" :
                        i === 2 ? "bg-amber-600 text-white" :
                        "bg-gray-100 text-gray-500",
                      )}>{i + 1}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-400">{s.codigo}</td>
                    <td className="py-3 px-4 font-medium text-gray-800">{s.nombre}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-lg font-bold text-purple-600">{s.visitas}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-gray-500">
                      {s.ultima_visita ? new Date(s.ultima_visita).toLocaleDateString("es-PE") : "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Visitas timeline */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Visitas por día (últimos 30 días)</h3>
        </div>
        <div className="p-5">
          <div className="flex items-end gap-1 h-40">
            {v.visitas_por_dia.map((d, i) => {
              const max = Math.max(...v.visitas_por_dia.map((x) => x.cantidad), 1);
              const height = (d.cantidad / max) * 100;
              const isToday = i === v.visitas_por_dia.length - 1;
              return (
                <div key={d.fecha} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div
                    className={cn(
                      "w-full rounded-t transition-all hover:opacity-80",
                      isToday ? "bg-yellow-400" : "bg-blue-500",
                    )}
                    style={{ height: `${Math.max(height, 2)}%`, minHeight: d.cantidad > 0 ? undefined : "2px" }}
                  />
                  {/* Tooltip on hover */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none z-10">
                    {d.cantidad} visitas -- {new Date(d.fecha).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
                  </div>
                  {i % 5 === 0 && (
                    <span className="text-[9px] text-gray-400 -rotate-45 origin-left whitespace-nowrap mt-1">
                      {new Date(d.fecha).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="px-5 pb-4 text-xs text-gray-400">
          Promedio: {v.promedio_visitas_por_servicio.toFixed(1)} visitas por servicio · Total: {v.total_visitas} visitas
        </div>
      </div>
    </div>
  );
}

// -- KPI Tab --

function KPITab({ data }: { data: RendimientoResponse }) {
  const { performance: p } = data;

  const grupos = [
    {
      title: "Servicios",
      icon: Activity,
      iconBg: "bg-blue-900",
      iconColor: "text-yellow-400",
      cards: [
        { label: "Completados", value: p.servicios_completados, unit: "", color: "text-green-600" },
        { label: "En progreso", value: p.servicios_en_progreso, unit: "", color: "text-blue-600" },
        { label: "Pendientes", value: p.servicios_pendientes, unit: "", color: "text-amber-600" },
        { label: "Bloqueados", value: p.servicios_bloqueados, unit: "", color: "text-red-600" },
      ],
    },
    {
      title: "Tareas",
      icon: CheckCircle2,
      iconBg: "bg-green-600",
      iconColor: "text-white",
      cards: [
        { label: "Completadas", value: p.tareas_completadas, unit: "", color: "text-green-600" },
        { label: "Pendientes", value: p.tareas_pendientes, unit: "", color: "text-amber-600" },
        { label: "Tasa completación", value: `${Math.round(p.tasa_completacion_tareas)}%`, unit: "", color: "text-blue-600" },
      ],
    },
    {
      title: "Tiempos",
      icon: Clock,
      iconBg: "bg-purple-600",
      iconColor: "text-white",
      cards: [
        { label: "Tiempo promedio", value: formatMinutos(p.tiempo_promedio_completado_min), unit: "", color: "text-purple-600" },
        { label: "Tasa completación gral", value: `${Math.round(p.tasa_completacion)}%`, unit: "", color: "text-green-600" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Estado cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Completados", value: p.servicios_completados, icon: CheckCircle2, bg: "bg-green-100", text: "text-green-700" },
          { label: "En Progreso", value: p.servicios_en_progreso, icon: Activity, bg: "bg-blue-100", text: "text-blue-700" },
          { label: "Pendientes", value: p.servicios_pendientes, icon: Clock, bg: "bg-amber-100", text: "text-amber-700" },
          { label: "Bloqueados", value: p.servicios_bloqueados, icon: AlertTriangle, bg: "bg-red-100", text: "text-red-700" },
        ].map((s) => {
          const SIcon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <SIcon className={`w-5 h-5 ${s.text}`} />
                </div>
                <div>
                  <p className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* KPI groups */}
      {grupos.map((g) => {
        const GIcon = g.icon;
        return (
          <div key={g.title} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-8 h-8 rounded-lg ${g.iconBg} flex items-center justify-center`}>
                <GIcon className={`w-4 h-4 ${g.iconColor}`} />
              </div>
              <div>
                <p className="text-gray-800 text-sm" style={{ fontWeight: 700 }}>{g.title}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {g.cards.map((c) => (
                <div key={c.label} className="bg-gray-50 rounded-xl p-4">
                  <p className={`text-2xl ${c.color}`} style={{ fontWeight: 700 }}>
                    {typeof c.value === "number" ? c.value.toLocaleString() : c.value}
                    <span className="text-sm font-normal text-gray-400 ml-1">{c.unit}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{c.label}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -- Calificaciones Tab --

function CalificacionesTab({ data }: { data: RendimientoResponse }) {
  const { calificaciones: c } = data;

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500 flex items-center justify-center">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-3xl text-gray-900" style={{ fontWeight: 700 }}>
                {c.promedio_calificacion.toFixed(1)}
                <span className="text-base text-gray-400 ml-1">/5</span>
              </p>
              <p className="text-gray-500 text-sm">Calificación promedio</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-3xl text-gray-900" style={{ fontWeight: 700 }}>{c.total_calificaciones}</p>
              <p className="text-gray-500 text-sm">Total calificaciones</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-3xl text-gray-900" style={{ fontWeight: 700 }}>{Math.round(data.sistema.tasa_servicios_con_calificacion)}%</p>
              <p className="text-gray-500 text-sm">Servicios con calificación</p>
            </div>
          </div>
        </div>
      </div>

      {/* Distribución de puntajes */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="text-gray-800 mb-4" style={{ fontWeight: 600 }}>Distribución de puntajes</h3>
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map((puntaje) => {
            const item = c.calificaciones_por_puntaje.find((x) => x.puntaje === puntaje);
            const cantidad = item?.cantidad ?? 0;
            const max = Math.max(...c.calificaciones_por_puntaje.map((x) => x.cantidad), 1);
            const pct = (cantidad / max) * 100;
            return (
              <div key={puntaje} className="flex items-center gap-3">
                <span className="w-6 text-sm font-medium text-gray-600 text-right">{puntaje}★</span>
                <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      puntaje >= 4 ? "bg-green-500" :
                      puntaje >= 3 ? "bg-yellow-500" :
                      "bg-red-500",
                    )}
                    style={{ width: `${Math.max(pct, cantidad > 0 ? 5 : 0)}%` }}
                  />
                </div>
                <span className="w-8 text-sm text-gray-600 text-right">{cantidad}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Últimas calificaciones */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-500" />
          <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Últimas calificaciones</h3>
        </div>
        {c.ultimas_calificaciones.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sin calificaciones aún</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {c.ultimas_calificaciones.map((cal, i) => (
              <div key={i} className="px-5 py-3.5 hover:bg-gray-50 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono text-gray-400">{cal.servicio_codigo}</span>
                    <span className="text-sm font-medium text-gray-800 ml-2">{cal.servicio_nombre}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-full",
                      cal.puntaje >= 4 ? "bg-green-100 text-green-700" :
                      cal.puntaje >= 3 ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700",
                    )}>{cal.puntaje}/5</span>
                    <span className="text-xs text-gray-400">{cal.fecha ? new Date(cal.fecha).toLocaleDateString("es-PE") : "--"}</span>
                  </div>
                </div>
                {cal.comentario && (
                  <p className="text-xs text-gray-500 mt-1 italic">"{cal.comentario}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// -- Colaboradores Tab --

function ColaboradoresTab({ data }: { data: RendimientoResponse }) {
  const { colaboradores: c } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-3xl text-gray-900" style={{ fontWeight: 700 }}>{c.colaboradores_con_tareas}</p>
              <p className="text-gray-500 text-sm">Colaboradores con tareas completadas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Top colaboradores</h3>
        </div>
        {c.top_colaboradores.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sin datos de colaboradores</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-3 px-4 text-gray-500 text-xs font-medium">#</th>
                  <th className="text-left py-3 px-4 text-gray-500 text-xs font-medium">Colaborador</th>
                  <th className="text-center py-3 px-4 text-gray-500 text-xs font-medium">Tareas completadas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {c.top_colaboradores.map((col, i) => (
                  <tr key={col.usuario_id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4">
                      <span className={cn(
                        "w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold",
                        i === 0 ? "bg-yellow-400 text-blue-900" :
                        i === 1 ? "bg-gray-300 text-gray-700" :
                        i === 2 ? "bg-amber-600 text-white" :
                        "bg-gray-100 text-gray-500",
                      )}>{i + 1}</span>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-800">{col.nombres}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-lg font-bold text-blue-600">{col.total_tareas}</span>
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

// -- Sistema Tab --

function SistemaTab({ data }: { data: RendimientoResponse }) {
  const { sistema: s } = data;

  const stats = [
    { label: "Total usuarios", value: s.total_usuarios, icon: Users, color: "bg-blue-500" },
    { label: "Total áreas", value: s.total_areas, icon: BarChart3, color: "bg-green-500" },
    { label: "Total clientes", value: s.total_clientes, icon: Users, color: "bg-purple-500" },
    { label: "Total servicios", value: s.total_servicios, icon: Activity, color: "bg-orange-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((st) => {
          const StIcon = st.icon;
          return (
            <div key={st.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${st.color} flex items-center justify-center`}>
                  <StIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl text-gray-900" style={{ fontWeight: 700 }}>{st.value}</p>
                  <p className="text-gray-500 text-sm">{st.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="text-gray-800 mb-4" style={{ fontWeight: 600 }}>Métricas del sistema</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>{Math.round(s.tasa_servicios_con_calificacion)}%</p>
            <p className="text-xs text-gray-500 mt-1">Servicios con calificación</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>{s.dias_datos}</p>
            <p className="text-xs text-gray-500 mt-1">Días de datos históricos</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>
              {s.total_servicios > 0 ? (s.total_servicios / Math.max(s.total_usuarios, 1)).toFixed(1) : 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Servicios por usuario</p>
          </div>
        </div>
      </div>
    </div>
  );
}
