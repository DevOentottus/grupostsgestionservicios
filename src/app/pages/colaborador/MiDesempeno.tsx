import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth.js";
import { useMiArea } from "@/api/queries/useManager.js";
import { useDashboardWithComparison } from "@/api/queries/useDashboard.js";
import { InfoPopover } from "@/app/components/ui/info-popover.js";
import { cn, formatMinutos } from "@/app/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Star,
  Target,
  ClipboardCheck,
  Timer,
  BarChart3,
  ShieldCheck,
  Layers,
  User,
} from "lucide-react";
import { DateFilterCard } from "@/app/components/filters/DateFilterCard.js";

/* ─────────────────────────────────────────────
 * COMPONENTES INTERNOS
 * ───────────────────────────────────────────── */

/** Badge de tendencia con fondo tintado */
function TrendBadge({ variacion, size = "sm" }: { variacion: number; size?: "sm" | "xs" }) {
  if (variacion === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full font-semibold bg-slate-100 text-slate-500",
          size === "sm" ? "text-xs px-2.5 py-1" : "text-xs px-2 py-0.5",
        )}
      >
        <Minus className={size === "sm" ? "w-3 h-3" : "w-2.5 h-2.5"} /> 0%
      </span>
    );
  }
  const up = variacion > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold",
        up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
        size === "sm" ? "text-xs px-2.5 py-1" : "text-xs px-2 py-0.5",
      )}
      aria-label={up ? "Subio " + Math.abs(variacion) + "% respecto al periodo anterior" : "Bajo " + Math.abs(variacion) + "% respecto al periodo anterior"}
    >
      {up ? <TrendingUp className={size === "sm" ? "w-3 h-3" : "w-2.5 h-2.5"} /> : <TrendingDown className={size === "sm" ? "w-3 h-3" : "w-2.5 h-2.5"} />}
      {Math.abs(variacion)}%
    </span>
  );
}

/** Barra de progreso contra meta */
function GoalBar({ actual, meta, showMeta = true }: { actual: number; meta: number; showMeta?: boolean }) {
  if (meta <= 0) return null;
  const pct = Math.min(Math.round((actual / meta) * 100), 100);
  const cumplida = actual >= meta;
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
          <Target className="w-3 h-3 text-slate-500" />
          Progreso vs meta
        </span>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-bold", cumplida ? "text-emerald-600" : "text-amber-600")}>
            {pct}%
          </span>
          {showMeta && (
            <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
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

/** Estrellas de calificacion */
function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "xs" }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const starSize = size === "sm" ? "w-4 h-4" : "w-3 h-3";
  return (
    <span className="inline-flex items-center gap-0.5" title={rating.toFixed(1) + " / 5"}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            starSize,
            i <= full
              ? "fill-amber-400 text-amber-400"
              : i === full + 1 && half
                ? "fill-amber-400/50 text-amber-400"
                : "fill-slate-200 text-slate-200",
          )}
        />
      ))}
    </span>
  );
}

/** Card principal para KPI primario */
function KpiPrimarioCard({
  icon: Icon,
  iconBg,
  iconColor,
  titulo,
  valor,
  unidad,
  children,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  titulo: string;
  valor: React.ReactNode;
  unidad?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconBg)}>
            <Icon className={cn("w-5 h-5", iconColor)} />
          </div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right leading-tight">
            {titulo}
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold text-slate-900 tracking-tight">{valor}</span>
          {unidad && <span className="text-sm font-medium text-slate-500">{unidad}</span>}
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
}: {
  titulo: string;
  valor: string | number;
  unidad: string;
  descripcion: string;
  color: string;
  formula?: string;
  comparacion?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm hover:shadow transition-shadow overflow-hidden">
      <div className={cn("h-1", color)} />
      <div className="p-4">
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="text-2xl font-bold text-slate-900 tracking-tight">
            {typeof valor === "number" ? valor.toLocaleString() : valor}
          </span>
          {unidad && <span className="text-xs font-medium text-slate-500">{unidad}</span>}
        </div>
        <div className="flex items-center gap-1">
          <p className="text-xs text-slate-500 leading-tight">{titulo}</p>
          {formula && <InfoPopover formula={formula} descripcion={descripcion} />}
        </div>
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
    <div className={cn("bg-white rounded-2xl border border-slate-200/80 shadow-sm", className)}>
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-slate-500" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">{titulo}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{descripcion}</p>
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
  const { data: miArea, isLoading: areaLoading, isError: areaError } = useMiArea();

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
    usuario_id: user?.id,
  });

  const isLoading = areaLoading && dashLoading;
  const isError = areaError || dashError;

  // Datos del colaborador logueado
  const misDatos = useMemo(() => {
    if (!miArea?.colaboradores) return null;
    return miArea.colaboradores.find((c: any) => c.usuario_id === user?.id) || null;
  }, [miArea, user?.id]);

  // Indicadores desde dashboard
  const kpi = dashboard?.kpi;
  const tieneDashboard = !!kpi;
  const periodComparison = dashboard?.period_comparison;

  // Benchmarking contra el area
  const areaBenchmark = useMemo(() => {
    if (!miArea?.colaboradores) return null;
    const otros = miArea.colaboradores.filter((c: any) => c.usuario_id !== user?.id);
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
  }, [miArea, user?.id]);

  /* ──────────────────────────────────────────
   * RENDER
   * ────────────────────────────────────────── */

  return (
    <>
      {/* ═══════════════════════════════ */}
      {/* HERO HEADER - FULL WIDTH       */}
      {/* ═══════════════════════════════ */}
      <div className="bg-white shadow-sm">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700">
          <div className="max-w-7xl mx-auto px-6 py-5">
            <div className="flex items-center gap-4">
            <div className="min-w-0">
                <h1 className="text-xl font-bold text-white">Mi Desempeño</h1>
                <p className="text-emerald-100 text-sm truncate">
                  {user?.nombres || "Colaborador"}
                  {miArea?.area?.nombre && <span className="hidden sm:inline"> · {miArea.area.nombre}</span>}
                </p>
              </div>
              <div className="ml-auto hidden sm:flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 text-emerald-50 text-xs">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-200" />
                <span>{periodoLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filtro de fechas dentro del hero */}
        {misDatos && (
          <div className="max-w-7xl mx-auto px-6 pb-5">
            <DateFilterCard
              presets={presets}
              fechaInicio={fechaInicio}
              fechaFin={fechaFin}
              periodoLabel={periodoLabel}
              onFechaInicio={(v) => setFechaInicio(v)}
              onFechaFin={(v) => setFechaFin(v)}
              onLabelChange={(l) => setPeriodoLabel(l)}
            />
          </div>
        )}
      </div>

      {/* ═══════════════════════════════ */}
      {/* CONTENIDO PRINCIPAL            */}
      {/* ═══════════════════════════════ */}
      <div className="space-y-6 px-6">

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
            <p className="text-slate-500 mt-4 text-sm font-medium">Preparando tu desempeño...</p>
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
              <TrendingDown className="w-7 h-7 text-red-500" />
            </div>
            <p className="text-red-600 font-semibold text-lg">Error al cargar tu desempeño</p>
            <p className="text-sm text-slate-500 mt-1 mb-4">No pudimos obtener tus indicadores. Intentá de nuevo más tarde.</p>
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
              <User className="w-7 h-7 text-slate-500" />
            </div>
            <p className="text-slate-600 font-semibold text-lg">Sin datos de desempeño</p>
            <p className="text-sm text-slate-500 mt-1 max-w-md text-center">
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
          {/* --- SECCION 1: KPIS PRINCIPALES --- */}
          <section aria-label="Indicadores principales">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-5 h-5 text-slate-500" />
              <h2 className="text-lg font-bold text-slate-800">Tus indicadores</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* TAREAS COMPLETADAS */}
              <KpiPrimarioCard
                icon={CheckCircle2}
                iconBg="bg-blue-100"
                iconColor="text-blue-600"
                titulo="Tareas completadas"
                valor={periodComparison ? periodComparison.actual.tareas_completadas : (misDatos.tareas_completadas ?? 0)}
              >
                {periodComparison && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-500">Período anterior: {periodComparison.anterior.tareas_completadas}</span>
                    <TrendBadge variacion={periodComparison.variacion.tareas} size="xs" />
                  </div>
                )}
                {areaBenchmark && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-xs font-semibold text-slate-500">{areaBenchmark.avgTareas.toFixed(1)}</span>
                    <span className="text-xs text-slate-500">Promedio área:</span>
                  </div>
                )}
                {periodComparison && (
                  <GoalBar actual={periodComparison.actual.tareas_completadas} meta={Math.round(periodComparison.anterior.tareas_completadas * 1.1)} />
                )}
              </KpiPrimarioCard>

              {/* SERVICIOS COMPLETADOS */}
              <KpiPrimarioCard
                icon={Layers}
                iconBg="bg-indigo-100"
                iconColor="text-indigo-600"
                titulo="Servicios completados"
                valor={periodComparison ? periodComparison.actual.servicios_completados : (misDatos.servicios_completados ?? 0)}
              >
                {periodComparison && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-500">Período anterior: {periodComparison.anterior.servicios_completados}</span>
                    <TrendBadge variacion={periodComparison.variacion.servicios} size="xs" />
                  </div>
                )}
                {areaBenchmark && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-xs font-semibold text-slate-500">{areaBenchmark.avgServicios.toFixed(1)}</span>
                    <span className="text-xs text-slate-500">Promedio área: ({areaBenchmark.totalColaboradores} colab.)</span>
                  </div>
                )}
                {periodComparison && (
                  <GoalBar actual={periodComparison.actual.servicios_completados} meta={Math.round(periodComparison.anterior.servicios_completados * 1.1)} />
                )}
              </KpiPrimarioCard>

              {/* CALIFICACION */}
              <KpiPrimarioCard
                icon={Star}
                iconBg="bg-amber-100"
                iconColor="text-amber-600"
                titulo="Calificación"
                valor={
                  (() => {
                    const califVal = periodComparison
                      ? (periodComparison.actual.calificacion_promedio > 0 ? periodComparison.actual.calificacion_promedio : null)
                      : misDatos.calificacion_promedio;
                    return califVal != null ? califVal.toFixed(1) : "—";
                  })()
                }
                unidad={(() => {
                  const califVal = periodComparison
                    ? (periodComparison.actual.calificacion_promedio > 0 ? periodComparison.actual.calificacion_promedio : null)
                    : misDatos.calificacion_promedio;
                  return califVal != null ? "/ 5" : "";
                })()}
              >
                {(() => {
                  const califVal = periodComparison
                    ? (periodComparison.actual.calificacion_promedio > 0 ? periodComparison.actual.calificacion_promedio : null)
                    : misDatos.calificacion_promedio;
                  const califCount = periodComparison
                    ? periodComparison.actual.total_calificaciones
                    : misDatos.total_calificaciones;
                  return califVal != null ? (
                    <div className="flex items-center gap-2 mt-1">
                      <StarRating rating={califVal} />
                      <span className="text-xs text-slate-500">{califCount} calificación{califCount !== 1 ? "es" : ""}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1">Sin evaluaciones</p>
                  );
                })()}
                {periodComparison && periodComparison.anterior.calificacion_promedio > 0 && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-500">Período anterior: {periodComparison.anterior.calificacion_promedio.toFixed(1)}</span>
                    <TrendBadge variacion={periodComparison.variacion.calificacion} size="xs" />
                  </div>
                )}
                {areaBenchmark?.avgCalificacion != null && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-xs font-semibold text-slate-500">{areaBenchmark.avgCalificacion.toFixed(1)}</span>
                    <span className="text-xs text-slate-500">Promedio área:</span>
                  </div>
                )}
              </KpiPrimarioCard>

              {/* NPS */}
              <KpiPrimarioCard
                icon={ShieldCheck}
                iconBg="bg-emerald-100"
                iconColor="text-emerald-600"
                titulo="NPS · Recomendación"
                valor={
                  (() => {
                    const esPeriodo = periodComparison && periodComparison.actual.total_calificaciones > 0;
                    const areaSat = miArea?.satisfaccion;
                    const npsData = esPeriodo ? periodComparison!.actual : (areaSat && areaSat.cantidad > 0 ? areaSat : null);
                    if (npsData) {
                      const npsVal = npsData.nps;
                      return npsVal > 0 ? "+" + npsVal : "" + npsVal;
                    }
                    return "—";
                  })()
                }
                unidad="/ 100"
              >
                {(() => {
                  const esPeriodo = periodComparison && periodComparison.actual.total_calificaciones > 0;
                  const areaSat = miArea?.satisfaccion;
                  const npsData = esPeriodo ? periodComparison!.actual : (areaSat && areaSat.cantidad > 0 ? areaSat : null);
                  if (npsData) {
                    const total = esPeriodo ? periodComparison!.actual.total_calificaciones : areaSat!.cantidad;
                    const prom = npsData.promotores;
                    const pas = npsData.pasivos;
                    const det = npsData.detractores;
                    return (
                      <>
                        <div className="w-full h-2 rounded-full overflow-hidden flex mt-3">
                          <div className="h-full bg-emerald-500" style={{ width: (prom / total) * 100 + "%" }} />
                          <div className="h-full bg-amber-400" style={{ width: (pas / total) * 100 + "%" }} />
                          <div className="h-full bg-red-500" style={{ width: (det / total) * 100 + "%" }} />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                          <span className="text-emerald-600">{prom} prom.</span>
                          <span className="text-amber-600">{pas} pas.</span>
                          <span className="text-red-600">{det} det.</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 italic">
                          Basado en {total} evaluación{total !== 1 ? "es" : ""} del {esPeriodo ? "período" : "área"}
                        </p>
                        <InfoPopover
                          formula="NPS = % promotores − % detractores (escala 0–10)"
                          descripcion="¿Qué tan probable es que recomiendes este servicio técnico?"
                        />
                      </>
                    );
                  }
                  return <p className="text-xs text-slate-500 mt-1">Sin datos suficientes</p>;
                })()}
                {periodComparison && periodComparison.anterior.calificacion_promedio > 0 && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-500">Período anterior: {periodComparison.anterior.nps > 0 ? "+" : ""}{periodComparison.anterior.nps}</span>
                    <TrendBadge variacion={periodComparison.variacion.nps} size="xs" />
                  </div>
                )}
              </KpiPrimarioCard>
            </div>
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
                    comparacion={periodComparison ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-500">Período anterior: {periodComparison.anterior.servicios_con_tiempo_tracking_pct}%</span>
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
                        <span className="text-slate-500">Período anterior: {periodComparison.anterior.tareas_documentadas_conteo}</span>
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
                    comparacion={periodComparison ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-500">Período anterior: {periodComparison.anterior.registros_completos_pct}%</span>
                        <TrendBadge variacion={periodComparison.variacion.auditoria_pct} size="xs" />
                      </div>
                    ) : undefined}
                  />
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">
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
                      <span className="text-slate-500">Período anterior: {formatMinutos(periodComparison.anterior.tiempo_promedio)}</span>
                      <TrendBadge variacion={periodComparison.variacion.tiempo} size="xs" />
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
                  comparacion={periodComparison ? (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-500">Período anterior: {periodComparison.anterior.completados_dentro_tiempo_pct}%</span>
                      <TrendBadge variacion={periodComparison.variacion.a_tiempo_pct} size="xs" />
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
                      <span className="text-slate-500">Período anterior: {formatMinutos(periodComparison.anterior.tiempo_promedio_por_tarea)}</span>
                      <TrendBadge variacion={periodComparison.variacion.tiempo_por_tarea} size="xs" />
                    </div>
                  ) : undefined}
                />
              </div>
            </Seccion>
          </div>

          {/* --- SECCION 3: SERVICIOS ASIGNADOS --- */}
          {misDatos.servicios_asignados && misDatos.servicios_asignados.length > 0 && (
            <Seccion
              icon={Layers}
              titulo="Servicios asignados"
              descripcion={misDatos.servicios_asignados.length + " servicio" + (misDatos.servicios_asignados.length !== 1 ? "s" : "") + " a tu nombre"}
            >
              <div className="space-y-1">
                {misDatos.servicios_asignados.map((s: any) => {
                  const estadoColor: Record<string, string> = {
                    completado: "bg-emerald-100 text-emerald-700",
                    en_progreso: "bg-blue-100 text-blue-700",
                    pendiente: "bg-amber-100 text-amber-700",
                  };
                  const estadoDot: Record<string, string> = {
                    completado: "bg-emerald-500",
                    en_progreso: "bg-blue-500",
                    pendiente: "bg-amber-500",
                  };
                  const label = estadoColor[s.estado] || "bg-slate-100 text-slate-600";
                  const dot = estadoDot[s.estado] || "bg-slate-400";
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group cursor-default"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={cn("w-2 h-2 rounded-full shrink-0", dot)} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{s.titulo || "Sin título"}</p>
                          <p className="text-xs font-mono text-slate-500">{s.codigo || "—"}</p>
                        </div>
                      </div>
                      <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0", label)}>
                        {s.estado || "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Seccion>
          )}
        </>
      )}
    </div>
    </>
  );
}
