import { useState, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth.js";
import { useMiArea } from "@/api/queries/useManager.js";

import { useDashboardWithComparison } from "@/api/queries/useDashboard.js";
import { InfoPopover } from "@/app/components/ui/info-popover.js";
import { cn, formatMinutos } from "@/app/lib/utils";
import { jsPDF } from "jspdf";
import {
  CheckCircle2,
  Star,
  ClipboardCheck,
  Timer,
  BarChart3,
  ShieldCheck,
  Layers,
  User,
  Clock,
  AlertTriangle,
  Activity,
  ArrowLeft,
  FileText,
} from "lucide-react";

/* ─────────────────────────────────────────────
 * COMPONENTES INTERNOS
 * ───────────────────────────────────────────── */

/** Calcula variación porcentual entre dos valores */
function calcVariacion(actual: number | null | undefined, anterior: number | null | undefined): number | null {
  if (actual == null || anterior == null) return null;
  if (anterior === 0) return actual > 0 ? 999 : actual < 0 ? -999 : null;
  return Math.round(((actual - anterior) / Math.abs(anterior)) * 100);
}

/** Badge de tendencia con fondo tintado.
 *  Si se pasan actual+anterior se calcula la variación internamente (sobreescribe `variacion`). */
function TrendBadge({ variacion: overrideVariacion, actual, anterior, size = "sm" }: {
  variacion?: number;
  actual?: number | null;
  anterior?: number | null;
  size?: "sm" | "xs";
}) {
  let variacion: number | null;
  if (actual != null && anterior != null) {
    variacion = calcVariacion(actual, anterior);
  } else if (overrideVariacion != null) {
    variacion = overrideVariacion;
  } else {
    variacion = null;
  }
  if (variacion == null) return null;

  if (variacion === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full font-semibold bg-slate-100 text-slate-600",
          size === "sm" ? "text-xs px-2.5 py-1" : "text-xs px-2 py-0.5",
        )}
      >
        — 0%
      </span>
    );
  }
  const over100 = Math.abs(variacion) > 100;
  const up = variacion > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold",
        over100 ? "bg-blue-50 text-blue-700" : up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
        size === "sm" ? "text-xs px-2.5 py-1" : "text-xs px-2 py-0.5",
      )}
      aria-label={up ? "Subio " + Math.abs(variacion) + "% respecto al periodo anterior" : "Bajo " + Math.abs(variacion) + "% respecto al periodo anterior"}
    >
      {up ? "↑" : "↓"}
      {Math.abs(variacion)}%
    </span>
  );
}

/** Barra de progreso con degradado rojo→amarillo→verde */
/** Barra de progreso contra meta */
function GoalBar({ actual, meta, showMeta = true }: { actual: number; meta: number; showMeta?: boolean }) {
  if (meta <= 0) return null;
  const pct = Math.min(Math.round((actual / meta) * 100), 100);
  const cumplida = actual >= meta;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className={cn("text-xs font-bold", cumplida ? "text-emerald-600" : "text-amber-600")}>
          {pct}%
        </span>
        <div className="flex items-center gap-2">
          {showMeta && (
            <span className="text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
              Meta: {meta}
            </span>
          )}
        </div>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", cumplida ? "bg-emerald-500" : "bg-amber-400")}
          style={{ width: pct + "%" }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={pct + "% de la meta"}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * GENERADOR DE PDF (frontend con jsPDF)
 * ───────────────────────────────────────────── */
function generarPDFReporte({
  usuarioId, nombreUsuario, fechaInicio, fechaFin,
  dashboard, kpi, periodComparison, misDatos,
}: {
  usuarioId: number | undefined;
  nombreUsuario: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  dashboard: any;
  kpi: any;
  periodComparison: any;
  misDatos: any;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pgW = 210;
  const left = 15;
  let y = 15;
  const ln = 7;

  function text(t: string, sz = 10, bold = false) {
    doc.setFontSize(sz);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(t, left, y);
    y += sz * 0.35 + 1;
  }

  function kv(key: string, val: string | number) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(key + ": ", left, y);
    const kw = doc.getTextWidth(key + ": ");
    doc.setFont("helvetica", "normal");
    doc.text(String(val), left + kw, y);
    y += ln;
  }

  function section(title: string) {
    y += 2;
    doc.setFillColor(37, 99, 235);
    doc.rect(left, y, pgW - 2 * left, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(title, left + 2, y + 5);
    doc.setTextColor(0, 0, 0);
    y += 11;
  }

  // --- TÍTULO ---
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Reporte de Desempe\u00F1o Individual", left, y);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  y += 5;
  const periodo = [fechaInicio || "—", fechaFin || "—"].join(" — ");
  doc.text("Periodo: " + periodo, left, y);
  doc.text("Generado: " + new Date().toLocaleDateString("es-PE"), left + 90, y);
  doc.setTextColor(0);
  y += 8;

  // Datos generales del colaborador
  kv("Colaborador", nombreUsuario);

  // --- KPI PRINCIPALES ---
  section("Indicadores Principales");

  const curTareas = periodComparison?.actual?.tareas_completadas ?? misDatos?.tareas_completadas ?? 0;
  const curServicios = periodComparison?.actual?.servicios_completados ?? misDatos?.servicios_completados ?? 0;
  const curCalif = periodComparison?.actual?.calificacion_promedio ?? kpi?.calificacion_promedio ?? 0;
  const curEficiencia = periodComparison?.actual?.eficiencia_pct ?? dashboard?.indicadores?.eficiencia?.eficiencia_pct ?? 0;

  kv("Tareas completadas", String(curTareas));
  kv("Servicios completados", String(curServicios));
  kv("Calificaci\u00F3n promedio", curCalif > 0 ? curCalif.toFixed(1) + " / 5" : "—");
  kv("Eficiencia", curEficiencia > 0 ? String(Math.round(curEficiencia)) + "%" : "—");

  if (periodComparison) {
    section("Comparaci\u00F3n vs Periodo Anterior");
    kv("Tareas (anterior)", String(periodComparison.anterior?.tareas_completadas ?? 0));
    kv("Servicios (anterior)", String(periodComparison.anterior?.servicios_completados ?? 0));
    kv("Calificaci\u00F3n (anterior)", periodComparison.anterior?.calificacion_promedio > 0
      ? periodComparison.anterior.calificacion_promedio.toFixed(1) + " / 5" : "—");
  }

  // --- EFICIENCIA ---
  const tpServicio = dashboard?.indicadores?.eficiencia?.tiempo_promedio_min;
  const tpAnt = periodComparison?.anterior?.tiempo_promedio;
  const dentroTiempo = kpi?.completados_dentro_tiempo_pct;
  const dentroTiempoAnt = periodComparison?.anterior?.completados_dentro_tiempo_pct;
  const tpPorTarea = dashboard?.indicadores?.eficiencia?.tiempo_promedio_por_tarea;
  const tpPorTareaAnt = periodComparison?.anterior?.tiempo_promedio_por_tarea;

  section("Eficiencia Operativa");
  if (tpServicio != null) kv("Tiempo promedio por servicio", formatMinutos(tpServicio));
  if (tpAnt) kv("  → Periodo anterior", formatMinutos(tpAnt));
  if (dentroTiempo != null) kv("Dentro del tiempo estimado", String(Math.round(dentroTiempo)) + "%");
  if (dentroTiempoAnt != null) kv("  → Periodo anterior", String(Math.round(dentroTiempoAnt)) + "%");
  if (tpPorTarea != null) kv("Tiempo promedio por tarea", formatMinutos(tpPorTarea));
  if (tpPorTareaAnt) kv("  → Periodo anterior", formatMinutos(tpPorTareaAnt));

  // --- TRAZABILIDAD ---
  const trackPct = kpi?.servicios_con_tiempo_tracking_pct;
  const docs = kpi?.tareas_documentadas_conteo;
  const audit = kpi?.registros_completos_pct;

  if (trackPct != null || docs != null || audit != null) {
    section("Trazabilidad y Control");
    if (trackPct != null) kv("Servicios con tracking", String(Math.round(trackPct)) + "%");
    if (docs != null) kv("Tareas documentadas", String(docs));
    if (audit != null) kv("Trazabilidad completa", String(Math.round(audit)) + "%");
  }

  // --- SERVICIOS ATRAZADOS ---
  const retrasos = periodComparison?.actual?.retrasos ?? dashboard?.indicadores?.eficiencia?.cantidad_retrasos ?? 0;
  const completados = dashboard?.completados ?? 0;
  if (completados > 0) {
    section("Servicios");
    kv("Total servicios", String(dashboard?.total_servicios ?? 0));
    kv("Completados", String(completados));
    kv("Atrasados", String(retrasos));
    if (periodComparison?.anterior?.retrasos != null) {
      kv("  → Periodo anterior", String(periodComparison.anterior.retrasos));
    }
  }

  // --- PENDIENTES / EN PROGRESO ---
  if (periodComparison) {
    section("Estado de Servicios");
    kv("Pendientes (actual)", String(periodComparison.actual?.pendientes ?? 0));
    kv("Pendientes (anterior)", String(periodComparison.anterior?.pendientes ?? 0));
    kv("En progreso (actual)", String(periodComparison.actual?.en_progreso ?? 0));
    kv("En progreso (anterior)", String(periodComparison.anterior?.en_progreso ?? 0));
  }

  // --- FOOTER ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text("STS — Sistema de Gestión de Servicios", left, 292);
    doc.text("Pág. " + i + " de " + pageCount, pgW - left, 292, { align: "right" });
  }

  doc.save("reporte-desempeno-" + (usuarioId ?? "colaborador") + ".pdf");
}

/** Card principal para KPI primario — columnas de valores con tendencia */
function KpiPrimarioCard({
  icon: Icon,
  iconBg,
  iconColor,
  titulo,
  columnas,
  children,
  infoFormula,
  infoDescripcion,
  barActual,
  barMeta,
  barFmt,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  titulo: string;
  columnas: { valor: React.ReactNode; label: string; variacion?: { direction: "up" | "down" | "flat"; label?: string } }[];
  children?: React.ReactNode;
  infoFormula?: string;
  infoDescripcion?: string;
  barActual?: number;
  barMeta?: number;
  barFmt?: (v: number) => string;
}) {
  const f = barFmt ?? ((v: number) => Number.isInteger(v) ? String(v) : v.toFixed(1));
  const clamped = barMeta != null && barActual != null
    ? barMeta > 0
      ? Math.min(Math.max(Math.min(Math.round((barActual / barMeta) * 100), 100), 0), 100)
      : 100
    : 0;
  const barColor = barMeta === 0 && barActual != null && barActual > 0
    ? "#ef4444"
    : clamped <= 34 ? "#ef4444" : clamped <= 67 ? "#eab308" : "#22c55e";
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="p-5">
        {/* Icono + título */}
        <div className="flex items-center gap-3 mb-4">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
            <Icon className={cn("w-5 h-5", iconColor)} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 leading-tight">
            {titulo}
          </p>
          {infoFormula && <InfoPopover formula={infoFormula} descripcion={infoDescripcion ?? ""} />}
        </div>

        {/* Columnas de valores */}
        <div className="flex items-start gap-3">
          {columnas.map((col, i) => (
            <div key={i} className="flex items-start gap-2 flex-1 min-w-0">
              {i > 0 && <span className="text-2xl font-light text-slate-300 self-center mt-1 shrink-0">|</span>}
              <div className="min-w-0 flex-1">
                <p className="leading-tight flex items-center gap-1">
                  <span className="text-4xl font-bold text-slate-900 tracking-tight shrink-0">{col.valor}</span>
                  <span className="text-[12px] text-slate-600 whitespace-pre-line leading-normal">{col.label}</span>
                </p>
                {col.variacion && (() => {
                  const pctNum = col.variacion.label ? parseInt(col.variacion.label.replace(/[^0-9-]/g, "")) : 0;
                  const over100 = Math.abs(pctNum) > 100;
                  return (
                  <p className={cn(
                    "inline-flex items-center gap-0.5 text-[12px] font-semibold mt-0.5",
                    over100 ? "text-blue-600" : col.variacion.direction === "up" ? "text-emerald-600" : col.variacion.direction === "down" ? "text-red-600" : "text-slate-500",
                  )}>
                    <span className="text-slate-500 mr-0.5">Variación:</span>
                    {col.variacion.direction === "up" ? (
                      "↑"
                    ) : col.variacion.direction === "down" ? (
                      "↓"
                    ) : (
                      "—"
                    )}
                    {col.variacion.label ?? ""}
                  </p>
                  );
                })()}
                {i === 0 && barMeta != null && barMeta > 0 && (
                  <div className="mt-1">
                    <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div className="absolute inset-0 opacity-60" style={{ background: "linear-gradient(to right, #ef4444, #eab308, #22c55e)" }} />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-500 pointer-events-none">
                        Meta: {f(barMeta)}
                      </span>
                      <div className="h-full rounded-full transition-all duration-500 relative flex items-center justify-end pr-1" style={{ width: `${clamped}%`, backgroundColor: barColor }}>
                        <span className="text-[9px] font-bold text-white drop-shadow-sm pointer-events-none whitespace-nowrap">
                          {f(barActual!)} | {clamped}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {children}
      </div>
    </div>
  );
}

/** Card para indicadores secundarios */
function IndicadorCard({
  titulo,
  valor,
  unidad,
  descripcion,
  color,
  formula,
  comparacion,
  barActual,
  barMeta,
}: {
  titulo: string;
  valor: string | number;
  unidad: string;
  descripcion: string;
  color: string;
  formula?: string;
  comparacion?: React.ReactNode;
  barActual?: number;
  barMeta?: number;
}) {
  const clamped = barMeta && barMeta > 0 && barActual != null
    ? Math.min(Math.max(Math.min(Math.round((barActual / barMeta) * 100), 100), 0), 100)
    : 0;
  const barColor = clamped <= 34 ? "#ef4444" : clamped <= 67 ? "#eab308" : "#22c55e";
  return (
    <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm hover:shadow transition-shadow overflow-hidden">
      <div className={cn("h-1", color)} />
      <div className="p-4">
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="text-2xl font-bold text-slate-900 tracking-tight">
            {typeof valor === "number" ? valor.toLocaleString() : valor}
          </span>
          {unidad && <span className="text-xs font-medium text-slate-600">{unidad}</span>}
        </div>
        <div className="flex items-center gap-1">
          <p className="text-xs text-slate-600 leading-tight">{titulo}</p>
          {formula && <InfoPopover formula={formula} descripcion={descripcion} />}
        </div>
        {barMeta != null && barMeta > 0 && (
          <div className="mt-1">
            <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden">
              <div className="absolute inset-0 opacity-60" style={{ background: "linear-gradient(to right, #ef4444, #eab308, #22c55e)" }} />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-500 pointer-events-none">
                Meta: {barMeta}
              </span>
              <div className="h-full rounded-full transition-all duration-500 relative flex items-center justify-end pr-1" style={{ width: `${clamped}%`, backgroundColor: barColor }}>
                <span className="text-[9px] font-bold text-white drop-shadow-sm pointer-events-none whitespace-nowrap">
                  {barActual} | {clamped}%
                </span>
              </div>
            </div>
          </div>
        )}
        {comparacion && (
          <div className="mt-2 pt-2 border-t border-slate-100">{comparacion}</div>
        )}
      </div>
    </div>
  );
}

/** Seccion con cabecera */
function Seccion({
  icon: Icon,
  titulo,
  descripcion,
  className,
  children,
}: {
  icon?: React.ElementType;
  titulo: string;
  descripcion: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("bg-white rounded-xl border border-slate-200", className)}>
      <div className="p-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          {Icon && (
            <Icon className="w-4 h-4 text-slate-600 shrink-0" />
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800 text-sm leading-tight">{titulo}</h3>
            <p className="text-xs text-slate-600 mt-0.5 leading-tight">{descripcion}</p>
          </div>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/** Skeleton */
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200", className)} />;
}

/* ─────────────────────────────────────────────
 * PAGINA PRINCIPAL
 * ───────────────────────────────────────────── */

export function MiDesempenoPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: miArea, isLoading: areaLoading, isError: areaError } = useMiArea();

  // Soporte para ver desempeño de otro usuario (manager/admin viendo a un colaborador)
  const targetUserIdStr = searchParams.get("usuario_id");
  const targetUserId = targetUserIdStr ? parseInt(targetUserIdStr, 10) : undefined;
  const esAdminOREncargado = user?.rol === "admin" || user?.rol === "sistema" || user?.rol === "encargado";
  const usuarioId = targetUserId && esAdminOREncargado ? targetUserId : user?.id;

  // Buscar nombre del colaborador objetivo (si es distinto al logueado)
  const nombreColaborador = useMemo(() => {
    if (!targetUserId || !esAdminOREncargado || !miArea?.colaboradores) return null;
    const c = miArea.colaboradores.find((col: any) => col.usuario_id === targetUserId);
    return c?.nombres ?? `Usuario #${targetUserId}`;
  }, [targetUserId, esAdminOREncargado, miArea?.colaboradores]);

  // Filtro de fechas
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [fechaFin, setFechaFin] = useState(todayStr);
  const [periodoLabel, setPeriodoLabel] = useState("Este mes");
  const setPeriodo = (label: string, inicio: Date | null, fin: Date | null) => {
    setFechaInicio(inicio ? inicio.toISOString().split("T")[0] : "");
    setFechaFin(fin ? fin.toISOString().split("T")[0] : "");
    setPeriodoLabel(label);
  };

  const presets = [
    {
      label: "Sin filtro",
      active: periodoLabel === "Sin filtro",
      action: () => setPeriodo("Sin filtro", null, null),
    },
    {
      label: "Hoy",
      active: periodoLabel === "Hoy",
      action: () => {
        const h = new Date();
        setPeriodo("Hoy", h, h);
      },
    },
    {
      label: "Esta semana",
      active: periodoLabel === "Esta semana",
      action: () => {
        const hoy = new Date();
        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() - (hoy.getDay() === 0 ? 6 : hoy.getDay() - 1));
        setPeriodo("Esta semana", lunes, hoy);
      },
    },
    {
      label: "Este mes",
      active: periodoLabel === "Este mes",
      action: () => {
        const hoy = new Date();
        const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        setPeriodo("Este mes", inicio, hoy);
      },
    },
  ];

  const { data: dashboard, isLoading: dashLoading, isError: dashError } = useDashboardWithComparison({
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    usuario_id: usuarioId,
  });

  const isLoading = areaLoading && dashLoading;
  const isError = areaError || dashError;

  // Datos del colaborador a visualizar
  const misDatos = useMemo(() => {
    if (!miArea?.colaboradores) return null;
    return miArea.colaboradores.find((c: any) => c.usuario_id === usuarioId) || null;
  }, [miArea, usuarioId]);

  // Indicadores desde dashboard
  const kpi = dashboard?.kpi;
  const tieneDashboard = !!kpi;
  const periodComparison = dashboard?.period_comparison;

  // Benchmarking contra el area
  const areaBenchmark = useMemo(() => {
    if (!miArea?.colaboradores) return null;
    const otros = miArea.colaboradores.filter((c: any) => c.usuario_id !== usuarioId);
    if (otros.length === 0) return null;
    const sumVal = (key: string) => otros.reduce((s: number, c: any) => s + (c[key] ?? 0), 0);
    const avg = (key: string) => sumVal(key) / otros.length;
    return {
      avgServicios: avg("servicios_completados"),
      avgCalificacion: (() => {
        const conCalif = otros.filter((c: any) => c.calificacion_promedio != null);
        return conCalif.length > 0
          ? conCalif.reduce((s: number, c: any) => s + c.calificacion_promedio, 0) / conCalif.length
          : null;
      })(),
      avgTareas: avg("tareas_completadas"),
      totalColaboradores: otros.length,
    };
  }, [miArea, usuarioId]);

  /* ──────────────────────────────────────────
   * RENDER
   * ────────────────────────────────────────── */

  return (
    <>
      {/* ═══════════════════════════════ */}
      {/* HEADER GRADIENTE                 */}
      {/* ═══════════════════════════════ */}
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-5 text-white shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            {nombreColaborador && (
              <button onClick={() => navigate("/manager/desempeno")} className="text-blue-200 hover:text-white transition-colors" title="Volver a gestión de desempeño">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-lg font-bold text-white">
              {nombreColaborador ? `Desempeño de ${nombreColaborador}` : "Mi Desempeño"}
            </h1>
            <span className="text-blue-200 text-sm">·</span>
            <span className="text-blue-200 text-sm">{user?.nombres || "Colaborador"}</span>
            {miArea?.area?.nombre && (
              <>
                <span className="text-blue-200 text-sm">·</span>
                <span className="text-blue-200 text-sm">{miArea.area.nombre}</span>
              </>
            )}
            {periodoLabel && (
              <>
                <span className="text-blue-200 text-sm">·</span>
                <span className="text-blue-100 text-sm font-medium">
                  {periodoLabel}
                  {(periodoLabel === "Sin filtro" || periodoLabel === "Hoy") && (
                    <span className="text-blue-200 ml-1.5 font-normal">
                      {new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Header con filtros y export PDF */}
      {misDatos && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-x-2 gap-y-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-calendar-days w-4 h-4 text-slate-400 shrink-0" aria-hidden="true"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path><path d="M8 18h.01"></path><path d="M12 18h.01"></path><path d="M16 18h.01"></path></svg>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p.label}
                    onClick={p.action}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
                      p.active
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => { setFechaInicio(e.target.value); setPeriodoLabel("Personalizado"); }}
                  className="flex-1 sm:flex-none text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 min-w-0"
                />
                <span className="text-xs text-slate-400 shrink-0">→</span>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => { setFechaFin(e.target.value); setPeriodoLabel("Personalizado"); }}
                  className="flex-1 sm:flex-none text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 min-w-0"
                />
              </div>
            </div>
            <button
              onClick={() => generarPDFReporte({
                usuarioId,
                nombreUsuario: misDatos?.nombres ? `${misDatos.nombres} ${misDatos.apellidos || ""}`.trim() : `Usuario #${usuarioId}`,
                fechaInicio,
                fechaFin,
                dashboard,
                kpi,
                periodComparison,
                misDatos,
              })}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Exportar PDF
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════ */}
      {/* CONTENIDO PRINCIPAL            */}
      {/* ═══════════════════════════════ */}
      <div className="space-y-6">

      {/* ═══════════════════════════════ */}
      {/* LOADING STATE                   */}
      {/* ═══════════════════════════════ */}
      {isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8">
          <div className="flex flex-col items-center justify-center py-10">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
            </div>
            <p className="text-slate-600 mt-4 text-sm font-medium">Preparando tu desempeño...</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 w-full">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════ */}
      {/* ERROR STATE                     */}
      {/* ═══════════════════════════════ */}
      {isError && !isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8">
          <div className="flex flex-col items-center justify-center py-10">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <p className="text-red-600 font-semibold text-lg">Error al cargar tu desempeño</p>
            <p className="text-sm text-slate-600 mt-1 mb-4">No pudimos obtener tus indicadores. Intentá de nuevo más tarde.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-600 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════ */}
      {/* EMPTY STATE                     */}
      {/* ═══════════════════════════════ */}
      {!isLoading && !isError && !misDatos && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8">
          <div className="flex flex-col items-center justify-center py-10">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <User className="w-7 h-7 text-slate-600" />
            </div>
            <p className="text-slate-600 font-semibold text-lg">Sin datos de desempeño</p>
            <p className="text-sm text-slate-600 mt-1 max-w-md text-center">
              No encontramos información para tu usuario. Puede que no tengas un área asignada o que aún no haya registros.
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════ */}
      {/* CONTENIDO PRINCIPAL             */}
      {/* ═══════════════════════════════ */}
      {!isLoading && !isError && misDatos && (
        <>
          {/* --- SECCION 0: ESTADO DE SERVICIOS --- */}
          {dashboard && (
            <section aria-label="Estado de servicios" className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-slate-600" />
                <h2 className="text-lg font-bold text-slate-800">Estado de servicios</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiPrimarioCard
                  icon={Clock}
                  iconBg="bg-orange-100"
                  iconColor="text-orange-600"
                  titulo="Servicios pendientes"
                  infoFormula="Servicios que aún no han iniciado en el período"
                  infoDescripcion="Total de servicios en estado pendiente"
                  columnas={[
                    { valor: periodComparison ? periodComparison.actual.pendientes : (dashboard?.graficos?.estado_servicios?.pendiente ?? 0), label: "Este periodo" },
                    ...(periodComparison ? [{
                      valor: periodComparison.anterior.pendientes,
                      label: "Período\nanterior",
                      variacion: {
                        direction: (periodComparison.variacion.pendientes ?? 0) >= 0 ? "up" as const : "down" as const,
                        label: ((periodComparison.variacion.pendientes ?? 0) >= 0 ? "+" : "") + (periodComparison.variacion.pendientes ?? 0) + "%",
                      },
                    }] : []),
                  ]}
                  barActual={periodComparison ? periodComparison.actual.pendientes : undefined}
                  barMeta={0}
                >
                  {dashboard && periodComparison && (dashboard?.total_servicios ?? 0) > 0 && (
                    <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                      {periodComparison.actual.pendientes} de {dashboard.total_servicios ?? 0} servicios ({Math.round((periodComparison.actual.pendientes / (dashboard.total_servicios ?? 0)) * 100)}%)
                    </p>
                  )}
                </KpiPrimarioCard>
                <KpiPrimarioCard
                  icon={Timer}
                  iconBg="bg-blue-100"
                  iconColor="text-blue-600"
                  titulo="Servicios en progreso"
                  infoFormula="Servicios actualmente en ejecución en el período"
                  infoDescripcion="Total de servicios en estado en_progreso"
                  columnas={[
                    { valor: periodComparison ? periodComparison.actual.en_progreso : (dashboard?.graficos?.estado_servicios?.en_progreso ?? 0), label: "Este periodo" },
                    ...(periodComparison ? [{
                      valor: periodComparison.anterior.en_progreso,
                      label: "Período\nanterior",
                      variacion: {
                        direction: (periodComparison.variacion.en_progreso ?? 0) >= 0 ? "up" as const : "down" as const,
                        label: ((periodComparison.variacion.en_progreso ?? 0) >= 0 ? "+" : "") + (periodComparison.variacion.en_progreso ?? 0) + "%",
                      },
                    }] : []),
                  ]}
                  barActual={periodComparison ? periodComparison.actual.en_progreso : undefined}
                  barMeta={0}
                >
                  {dashboard && periodComparison && (dashboard?.total_servicios ?? 0) > 0 && (
                    <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                      {periodComparison.actual.en_progreso} de {dashboard.total_servicios ?? 0} servicios ({Math.round((periodComparison.actual.en_progreso / (dashboard.total_servicios ?? 0)) * 100)}%)
                    </p>
                  )}
                </KpiPrimarioCard>
                <KpiPrimarioCard
                  icon={AlertTriangle}
                  iconBg="bg-red-100"
                  iconColor="text-red-600"
                  titulo="Servicios atrasados"
                  infoFormula="Servicios completados fuera del tiempo estimado"
                  infoDescripcion="Servicios cuyo tiempo real superó el estimado"
                  columnas={[
                    { valor: periodComparison ? periodComparison.actual.retrasos : (dashboard?.indicadores?.eficiencia?.cantidad_retrasos ?? 0), label: "Este periodo" },
                    ...(periodComparison ? [{
                      valor: periodComparison.anterior.retrasos,
                      label: "Período\nanterior",
                      variacion: {
                        direction: (periodComparison.variacion.retrasos ?? 0) >= 0 ? "up" as const : "down" as const,
                        label: ((periodComparison.variacion.retrasos ?? 0) >= 0 ? "+" : "") + (periodComparison.variacion.retrasos ?? 0) + "%",
                      },
                    }] : []),
                  ]}
                  barActual={periodComparison ? periodComparison.actual.retrasos : undefined}
                  barMeta={0}
                >
                  {dashboard && periodComparison && (dashboard?.completados ?? 0) > 0 && (
                    <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                      {periodComparison.actual.retrasos} de {dashboard.completados ?? 0} servicios completados ({Math.round((periodComparison.actual.retrasos / (dashboard.completados ?? 0)) * 100)}%)
                    </p>
                  )}
                </KpiPrimarioCard>
              </div>
            </section>
          )}

          {/* --- SECCION 1: KPIS PRINCIPALES --- */}
          <section aria-label="Indicadores principales">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-bold text-slate-800">Tus indicadores</h2>
            </div>

            {(() => {
              const curTareas = periodComparison ? periodComparison.actual.tareas_completadas : (misDatos.tareas_completadas ?? 0);
              const curServicios = periodComparison ? periodComparison.actual.servicios_completados : (misDatos.servicios_completados ?? 0);
              const areaVariacion = (actual: number, ref: number) => {
                if (ref <= 0) return { direction: "flat" as const, label: "—" };
                const pct = Math.round(((actual - ref) / ref) * 100);
                return {
                  direction: (pct > 0 ? "up" : pct < 0 ? "down" : "flat") as "up" | "down" | "flat",
                  label: (pct > 0 ? "+" : "") + pct + "%",
                };
              };
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* TAREAS COMPLETADAS */}
                  <KpiPrimarioCard
                    icon={CheckCircle2}
                    iconBg="bg-blue-100"
                    iconColor="text-blue-600"
                    titulo="Tareas completadas"
                    infoFormula="Tareas finalizadas en servicios completados del período"
                    infoDescripcion="Cantidad de tareas marcadas como completadas en servicios finalizados"
                    columnas={[
                      { valor: curTareas, label: "Este periodo" },
                      ...(periodComparison ? [{
                        valor: periodComparison.anterior.tareas_completadas,
                        label: "Período\nanterior",
                        variacion: {
                          direction: (periodComparison.variacion.tareas ?? 0) >= 0 ? "up" as const : "down" as const,
                          label: ((periodComparison.variacion.tareas ?? 0) >= 0 ? "+" : "") + (periodComparison.variacion.tareas ?? 0) + "%",
                        },
                      }] : []),
                      ...(areaBenchmark?.avgTareas != null ? [{
                        valor: areaBenchmark.avgTareas.toFixed(1),
                        label: "Promedio\nárea",
                        variacion: areaVariacion(curTareas, areaBenchmark.avgTareas),
                      }] : []),
                    ]}
                    barActual={periodComparison ? curTareas : undefined}
                    barMeta={periodComparison ? Math.round(periodComparison.anterior.tareas_completadas * 1.1) : undefined}
                  >
                  </KpiPrimarioCard>

                  {/* SERVICIOS COMPLETADOS */}
                  <KpiPrimarioCard
                    icon={Layers}
                    iconBg="bg-indigo-100"
                    iconColor="text-indigo-600"
                    titulo="Servicios completados"
                    infoFormula="Servicios finalizados en el período"
                    infoDescripcion="Total de servicios cuyo estado es completado"
                    columnas={[
                      { valor: curServicios, label: "Este periodo" },
                      ...(periodComparison ? [{
                        valor: periodComparison.anterior.servicios_completados,
                        label: "Período\nanterior",
                        variacion: {
                          direction: (periodComparison.variacion.servicios ?? 0) >= 0 ? "up" as const : "down" as const,
                          label: ((periodComparison.variacion.servicios ?? 0) >= 0 ? "+" : "") + (periodComparison.variacion.servicios ?? 0) + "%",
                        },
                      }] : []),
                      ...(areaBenchmark?.avgServicios != null ? [{
                        valor: areaBenchmark.avgServicios.toFixed(1),
                        label: "Promedio\nárea",
                        variacion: areaVariacion(curServicios, areaBenchmark.avgServicios),
                      }] : []),
                    ]}
                    barActual={periodComparison ? curServicios : undefined}
                    barMeta={periodComparison ? Math.round(periodComparison.anterior.servicios_completados * 1.1) : undefined}
                  >
                  </KpiPrimarioCard>

                  {/* CALIFICACION */}
                  {(() => {
                    const califVal = periodComparison
                      ? (periodComparison.actual.calificacion_promedio > 0 ? periodComparison.actual.calificacion_promedio : null)
                      : misDatos.calificacion_promedio;
                    return (
                      <KpiPrimarioCard
                        icon={Star}
                        iconBg="bg-amber-100"
                        iconColor="text-amber-600"
                        titulo="Calificación"
                        infoFormula="Promedio de puntuación 1–5 de servicios evaluados"
                        infoDescripcion="Calificación promedio recibida de los clientes en los servicios completados"
                        columnas={[
                          { valor: califVal != null ? califVal.toFixed(1) : "—", label: "Este periodo" },
                          ...(periodComparison && periodComparison.anterior.calificacion_promedio > 0 ? [{
                            valor: periodComparison.anterior.calificacion_promedio.toFixed(1),
                            label: "Período\nanterior",
                            variacion: {
                              direction: (periodComparison.variacion.calificacion ?? 0) >= 0 ? "up" as const : "down" as const,
                              label: ((periodComparison.variacion.calificacion ?? 0) >= 0 ? "+" : "") + (periodComparison.variacion.calificacion ?? 0) + "%",
                            },
                          }] : []),
                          ...(areaBenchmark?.avgCalificacion != null ? [{
                            valor: areaBenchmark.avgCalificacion.toFixed(1),
                            label: "Promedio\nárea",
                            variacion: califVal != null ? areaVariacion(califVal, areaBenchmark.avgCalificacion) : { direction: "flat" as const, label: "—" },
                          }] : []),
                        ]}
                        barActual={califVal != null ? califVal : undefined}
                        barMeta={califVal != null ? 5 : undefined}
                        barFmt={(v: number) => v.toFixed(1)}
                      >
                        {dashboard && periodComparison && periodComparison.actual.total_calificaciones > 0 && (() => {
                          const evaluados = periodComparison.actual.total_calificaciones;
                          const completados = dashboard.completados ?? 0;
                          if (completados === 0) return null;
                          return (
                            <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                              {evaluados} de {completados} servicios evaluados ({Math.round((evaluados / completados) * 100)}%)
                            </p>
                          );
                        })()}
                      </KpiPrimarioCard>
                    );
                  })()}

                  {/* NPS */}
                  {(() => {
                    const esPeriodo = periodComparison && periodComparison.actual.total_calificaciones > 0;
                    const areaSat = miArea?.satisfaccion;
                    const npsData = esPeriodo ? periodComparison!.actual : (areaSat && areaSat.cantidad > 0 ? areaSat : null);
                    const npsVal = npsData ? npsData.nps : null;
                    const total = npsData
                      ? esPeriodo ? periodComparison!.actual.total_calificaciones : areaSat!.cantidad
                      : 0;
                    return (
                      <KpiPrimarioCard
                        icon={ShieldCheck}
                        iconBg="bg-emerald-100"
                        iconColor="text-emerald-600"
                        titulo="NPS · Recomendación"
                        infoFormula="NPS = % promotores − % detractores (escala −100 a +100)"
                        infoDescripcion="Promotores: calificación 9-10 · Pasivos: calificación 7-8 · Detractores: calificación 1-6"
                        columnas={[
                          { valor: npsVal != null ? String(npsVal) : "—", label: "Este periodo" },
                          ...(periodComparison && periodComparison.anterior.calificacion_promedio > 0 ? [{
                            valor: String(periodComparison.anterior.nps),
                            label: "Período\nanterior",
                            variacion: {
                              direction: (periodComparison.variacion.nps ?? 0) >= 0 ? "up" as const : "down" as const,
                              label: ((periodComparison.variacion.nps ?? 0) >= 0 ? "+" : "") + (periodComparison.variacion.nps ?? 0) + "%",
                            },
                          }] : []),
                          ...(miArea?.satisfaccion && miArea.satisfaccion.nps != null ? [{
                            valor: String(miArea.satisfaccion.nps),
                            label: "Promedio\nárea",
                            variacion: npsVal != null ? areaVariacion(npsVal, miArea.satisfaccion.nps) : { direction: "flat" as const, label: "—" },
                          }] : []),
                        ]}
                        barActual={npsVal != null && npsVal > 0 ? npsVal : undefined}
                        barMeta={npsVal != null && npsVal > 0 ? 100 : undefined}
                        barFmt={(v: number) => v > 0 ? "+" + v : String(v)}
                      >
                        {npsData ? (
                          esPeriodo && dashboard && (dashboard?.completados ?? 0) > 0 ? (
                            <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                              {periodComparison.actual.total_calificaciones} de {dashboard.completados ?? 0} servicios evaluados ({Math.round((periodComparison.actual.total_calificaciones / (dashboard.completados ?? 0)) * 100)}%)
                            </p>
                          ) : null
                        ) : (
                          <p className="text-xs text-slate-600 mt-2">Sin datos suficientes</p>
                        )}
                      </KpiPrimarioCard>
                    );
                  })()}
                </div>
              );
            })()}
          </section>

          {/* --- SECCION 2: TRAZABILIDAD Y EFICIENCIA --- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* TRAZABILIDAD */}
            <Seccion
              icon={ClipboardCheck}
              titulo="Trazabilidad y Control Operativo"
              descripcion="Indicadores de registro, documentación y trazabilidad de tareas y servicios"
            >
              {tieneDashboard ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <IndicadorCard
                    titulo="Servicios con tracking de tiempo"
                    valor={kpi!.servicios_con_tiempo_tracking_pct ?? 0}
                    unidad="%"
                    descripcion="Servicios donde todas las tareas tienen hora inicio/fin"
                    color="bg-blue-600"
                    formula="Tracking_final − Tracking_inicial"
                    barActual={kpi!.servicios_con_tiempo_tracking_pct ?? 0}
                    barMeta={100}
                    comparacion={periodComparison ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-600">Período anterior: {periodComparison.anterior.servicios_con_tiempo_tracking_pct}%</span>
                        <TrendBadge variacion={periodComparison.variacion.tracking_pct} size="xs" />
                      </div>
                    ) : undefined}
                  />
                  <IndicadorCard
                    titulo="Tareas documentadas"
                    valor={kpi!.tareas_documentadas_conteo ?? 0}
                    unidad="tareas"
                    descripcion="Tareas con fecha, hora completada y responsable"
                    color="bg-cyan-600"
                    formula="Conteo de tareas con fecha, hora y responsable"
                    comparacion={periodComparison ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-600">Período anterior: {periodComparison.anterior.tareas_documentadas_conteo}</span>
                        <TrendBadge variacion={periodComparison.variacion.tareas_documentadas} size="xs" />
                      </div>
                    ) : undefined}
                  />
                  <IndicadorCard
                    titulo="Trazabilidad completa"
                    valor={kpi!.registros_completos_pct ?? 0}
                    unidad="%"
                    descripcion="Servicios con historial de cambios completo"
                    color="bg-teal-600"
                    formula="(Servicios con auditoría ÷ Total) × 100"
                    barActual={kpi!.registros_completos_pct ?? 0}
                    barMeta={100}
                    comparacion={periodComparison ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-600">Período anterior: {periodComparison.anterior.registros_completos_pct}%</span>
                        <TrendBadge variacion={periodComparison.variacion.auditoria_pct} size="xs" />
                      </div>
                    ) : undefined}
                  />
                </div>
              ) : (
                <p className="text-sm text-slate-600 text-center py-4">
                  Los indicadores de trazabilidad estarán disponibles cuando el administrador configure el módulo.
                </p>
              )}
            </Seccion>

            {/* EFICIENCIA */}
            <Seccion
              icon={Timer}
              titulo="Eficiencia Operativa"
              descripcion="Métricas de tiempo, cumplimiento y productividad"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <IndicadorCard
                    titulo="Tiempo promedio por servicio"
                    valor={dashboard?.indicadores?.eficiencia?.tiempo_promedio_min != null ? formatMinutos(dashboard.indicadores.eficiencia.tiempo_promedio_min) : "—"}
                    unidad=""
                    descripcion="Promedio de tiempo por servicio completado"
                    color="bg-orange-600"
                    formula="Σ(tracking_fin − tracking_inicio) ÷ N° servicios completados"
                    comparacion={periodComparison ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-600">Período anterior: {formatMinutos(periodComparison.anterior.tiempo_promedio)}</span>
                        <TrendBadge actual={dashboard?.indicadores?.eficiencia?.tiempo_promedio_min} anterior={periodComparison.anterior.tiempo_promedio} size="xs" />
                      </div>
                    ) : undefined}
                  />
                  <IndicadorCard
                    titulo="Dentro del tiempo estimado"
                    valor={kpi?.completados_dentro_tiempo_pct ?? 0}
                    unidad="%"
                    descripcion="Servicios que cumplieron el tiempo estimado"
                    color="bg-green-600"
                    formula="(Servicios con tiempo real ≤ estimado ÷ Total completados) × 100"
                    barActual={kpi?.completados_dentro_tiempo_pct ?? 0}
                    barMeta={100}
                    comparacion={periodComparison ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-600">Período anterior: {periodComparison.anterior.completados_dentro_tiempo_pct}%</span>
                        <TrendBadge actual={kpi?.completados_dentro_tiempo_pct} anterior={periodComparison.anterior.completados_dentro_tiempo_pct} size="xs" />
                      </div>
                    ) : undefined}
                  />
                  <IndicadorCard
                    titulo="Tiempo promedio por tarea"
                    valor={dashboard?.indicadores?.eficiencia?.tiempo_promedio_por_tarea != null ? formatMinutos(dashboard.indicadores.eficiencia.tiempo_promedio_por_tarea) : "—"}
                    unidad=""
                    descripcion="Promedio de tiempo por tarea completada"
                    color="bg-purple-600"
                    formula="Σ(tarea_tiempo_real) ÷ N° tareas con tiempo"
                    comparacion={periodComparison ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-600">Período anterior: {formatMinutos(periodComparison.anterior.tiempo_promedio_por_tarea)}</span>
                        <TrendBadge actual={dashboard?.indicadores?.eficiencia?.tiempo_promedio_por_tarea} anterior={periodComparison.anterior.tiempo_promedio_por_tarea} size="xs" />
                      </div>
                    ) : undefined}
                  />
              </div>
            </Seccion>
          </div>

        </>
      )}
    </div>
    </>
  );
}
