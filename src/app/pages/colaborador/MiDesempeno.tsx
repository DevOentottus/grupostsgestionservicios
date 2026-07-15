import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth.js";
import { useMiArea } from "@/api/queries/useManager.js";
import { useDashboardWithComparison } from "@/api/queries/useDashboard.js";
import { InfoPopover } from "@/app/components/ui/info-popover.js";
import { cn, formatMinutos } from "@/app/lib/utils";
import {
  TrendingUp, CheckCircle2, Star,
} from "lucide-react";
import { DateFilterCard } from "@/app/components/filters/DateFilterCard.js";

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

function TrendBadge({ variacion }: { variacion: number }) {
  if (variacion === 0) return <span className="text-xs text-slate-400">→ 0%</span>;
  const up = variacion > 0;
  return (
    <span className={`text-xs font-medium inline-flex items-center gap-0.5 ${up ? "text-green-600" : "text-red-500"}`}>
      {up ? "↑" : "↓"} {Math.abs(variacion)}%
    </span>
  );
}

function GoalBar({ actual, meta }: { actual: number; meta: number }) {
  if (meta <= 0) return null;
  const pct = Math.min(Math.round((actual / meta) * 100), 100);
  const cumplida = actual >= meta;
  return (
    <div className="mt-2 pt-2 border-t border-slate-100">
      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
        <span>Progreso</span>
        <span className={cumplida ? "text-green-600 font-medium" : ""}>{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${cumplida ? "bg-green-500" : "bg-amber-400"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-slate-400 mt-0.5">Meta: {meta}</p>
    </div>
  );
}

function IndicadorCard({
  titulo, valor, unidad, descripcion, color, formula, comparacion,
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className={`h-1.5 ${color}`} />
      <div className="p-5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold text-gray-900">
            {typeof valor === "number" ? valor.toLocaleString() : valor}
          </span>
          {unidad && <span className="text-sm text-gray-400">{unidad}</span>}
        </div>
        <div className="flex items-center gap-1 mt-1">
          <p className="text-gray-500 text-sm">{titulo}</p>
          {formula && <InfoPopover formula={formula} descripcion={descripcion} />}
        </div>
        {comparacion && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            {comparacion}
          </div>
        )}
      </div>
    </div>
  );
}

function PropuestaSection({
  titulo, descripcion, children,
}: {
  titulo: string;
  descripcion: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
        <h3 className="font-semibold text-slate-800 text-sm">{titulo}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{descripcion}</p>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

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

  const isLoading = areaLoading;
  const isError = areaError;

  // Datos del colaborador logueado
  const misDatos = useMemo(() => {
    if (!miArea?.colaboradores) return null;
    return miArea.colaboradores.find(
      (c: any) => c.usuario_id === user?.id
    ) || null;
  }, [miArea, user?.id]);

  // Indicadores desde dashboard
  const kpi = dashboard?.kpi;
  const tieneDashboard = !!kpi;
  const periodComparison = dashboard?.period_comparison;

  // Productividad personal (servicios completados en el período)
  const productividadPersonal = useMemo(() => {
    if (misDatos?.servicios_completados == null) return null;
    return misDatos.servicios_completados;
  }, [misDatos]);

  // Benchmarking contra el área
  const areaBenchmark = useMemo(() => {
    if (!miArea?.colaboradores) return null;
    const otros = miArea.colaboradores.filter(
      (c: any) => c.usuario_id !== user?.id
    );
    if (otros.length === 0) return null;
    const sumVal = (key: string) =>
      otros.reduce((s: number, c: any) => s + (c[key] ?? 0), 0);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Mi Desempeño</h2>
          <p className="text-sm text-slate-500">{user?.nombres || "Colaborador"}</p>
        </div>
      </div>

      {/* Filtro de fechas */}
      <DateFilterCard
        presets={presets}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        periodoLabel={periodoLabel}
        onFechaInicio={(v) => setFechaInicio(v)}
        onFechaFin={(v) => setFechaFin(v)}
        onLabelChange={(l) => setPeriodoLabel(l)}
      />

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

      {!isLoading && !isError && !misDatos && (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
          <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No se encontraron datos de desempeño</p>
          <p className="text-sm text-slate-400 mt-1">Puede que no tengas un área asignada</p>
        </div>
      )}

      {!isLoading && !isError && misDatos && (
        <>
          {/* ============================================ */}
          {/* RESUMEN PERSONAL */}
          {/* ============================================ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* TAREAS COMPLETADAS */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tareas completadas</p>
              </div>
              <p className="text-3xl font-bold text-slate-800">
                {misDatos.tareas_completadas ?? 0}
                <span className="text-lg text-slate-400 font-normal"> / {(misDatos.tareas_completadas ?? 0) + (misDatos.tareas_activas ?? 0)}</span>
              </p>
              {periodComparison && (
                <div className="flex items-center gap-1.5 text-[10px] mt-2 pt-2 border-t border-slate-100">
                  <span className="text-slate-400">Anterior: {periodComparison.anterior.tareas_completadas}</span>
                  <TrendBadge variacion={periodComparison.variacion.tareas} />
                </div>
              )}
              {areaBenchmark && (
                <div className="flex items-baseline gap-1.5 mt-2 pt-2 border-t border-slate-100">
                  <span className="text-sm font-semibold text-slate-500">{areaBenchmark.avgTareas.toFixed(1)}</span>
                  <span className="text-[10px] text-slate-400">prom. área</span>
                </div>
              )}
              {periodComparison && (
                <GoalBar actual={periodComparison.actual.tareas_completadas} meta={Math.round(periodComparison.anterior.tareas_completadas * 1.1)} />
              )}
            </div>

            {/* SERVICIOS COMPLETADOS */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Servicios completados</p>
              </div>
              <p className="text-3xl font-bold text-indigo-600">{misDatos.servicios_completados ?? 0}</p>
              {periodComparison && (
                <div className="flex items-center gap-1.5 text-[10px] mt-2 pt-2 border-t border-slate-100">
                  <span className="text-slate-400">Anterior: {periodComparison.anterior.servicios_completados}</span>
                  <TrendBadge variacion={periodComparison.variacion.servicios} />
                </div>
              )}
              {areaBenchmark && (
                <div className="flex items-baseline gap-1.5 mt-2 pt-2 border-t border-slate-100">
                  <span className="text-sm font-semibold text-slate-500">{areaBenchmark.avgServicios.toFixed(1)}</span>
                  <span className="text-[10px] text-slate-400">prom. área ({areaBenchmark.totalColaboradores} colab.)</span>
                </div>
              )}
              {periodComparison && (
                <GoalBar actual={periodComparison.actual.servicios_completados} meta={Math.round(periodComparison.anterior.servicios_completados * 1.1)} />
              )}
            </div>

            {/* CALIFICACIÓN */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Star className="w-4 h-4 text-yellow-600" />
                </div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Calificación</p>
              </div>
              {misDatos.calificacion_promedio != null ? (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-yellow-600">
                      {misDatos.calificacion_promedio.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-400">/ 5</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <StarRating rating={misDatos.calificacion_promedio} />
                    <span className="text-xs text-slate-400 ml-1">
                      {misDatos.total_calificaciones} calificación{misDatos.total_calificaciones !== 1 ? "es" : ""}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 mt-2">Sin evaluaciones</p>
              )}
              {periodComparison && periodComparison.anterior.calificacion_promedio > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] mt-2 pt-2 border-t border-slate-100">
                  <span className="text-slate-400">Anterior: {periodComparison.anterior.calificacion_promedio.toFixed(1)}</span>
                  <TrendBadge variacion={periodComparison.variacion.calificacion} />
                </div>
              )}
              {areaBenchmark?.avgCalificacion != null && (
                <div className="flex items-baseline gap-1.5 mt-2 pt-2 border-t border-slate-100">
                  <span className="text-sm font-semibold text-slate-500">{areaBenchmark.avgCalificacion.toFixed(1)}</span>
                  <span className="text-[10px] text-slate-400">prom. área</span>
                </div>
              )}
            </div>

            {/* NPS */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Star className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">NPS · Recomendación</p>
              </div>
              {miArea?.satisfaccion && miArea.satisfaccion.cantidad > 0 ? (
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-3xl font-bold ${
                      miArea.satisfaccion.nps > 0 ? "text-green-600" : miArea.satisfaccion.nps < 0 ? "text-red-600" : "text-slate-500"
                    }`}>
                      {miArea.satisfaccion.nps > 0 ? "+" : ""}{miArea.satisfaccion.nps}
                    </span>
                    <span className="text-sm text-slate-400">/ 100</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden flex mt-2">
                    <div className="h-full bg-green-500" style={{ width: `${(miArea.satisfaccion.promotores / miArea.satisfaccion.cantidad) * 100}%` }} />
                    <div className="h-full bg-yellow-400" style={{ width: `${(miArea.satisfaccion.pasivos / miArea.satisfaccion.cantidad) * 100}%` }} />
                    <div className="h-full bg-red-500" style={{ width: `${(miArea.satisfaccion.detractores / miArea.satisfaccion.cantidad) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span className="text-green-600">{miArea.satisfaccion.promotores} prom.</span>
                    <span className="text-yellow-600">{miArea.satisfaccion.pasivos} pas.</span>
                    <span className="text-red-600">{miArea.satisfaccion.detractores} det.</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 italic">
                    Basado en {miArea.satisfaccion.cantidad} evaluación{miArea.satisfaccion.cantidad !== 1 ? "es" : ""} del área
                  </p>
                  <InfoPopover
                    formula="NPS = % promotores − % detractores (escala 0–10)"
                    descripcion="¿Qué tan probable es que recomiendes este servicio técnico?"
                  />
                </div>
              ) : (
                <p className="text-sm text-slate-400 mt-2">Sin datos suficientes</p>
              )}
              {periodComparison && periodComparison.anterior.calificacion_promedio > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] mt-2 pt-2 border-t border-slate-100">
                  <span className="text-slate-400">Anterior: {periodComparison.anterior.nps > 0 ? "+" : ""}{periodComparison.anterior.nps}</span>
                  <TrendBadge variacion={periodComparison.variacion.nps} />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ============================================ */}
            {/* PROP. 1: TRAZABILIDAD Y CONTROL OPERATIVO */}
            {/* ============================================ */}
            <PropuestaSection
              titulo="Trazabilidad y Control Operativo"
              descripcion="Indicadores de registro, documentación y trazabilidad de tareas y servicios"
            >
              {tieneDashboard ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <IndicadorCard
                    titulo="Servicios con tiempo de ejecución en todas las tareas"
                    valor={kpi!.servicios_con_tiempo_tracking_pct ?? 0}
                    unidad="%"
                    descripcion="N° servicios donde todas las tareas tienen hora inicio/fin"
                    color="bg-blue-600"
                    formula="Tiempo de ejecución: Tracking_final − Tracking_inicial"
                    comparacion={periodComparison ? (
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-slate-400">Anterior: {periodComparison.anterior.servicios_con_tiempo_tracking_pct}%</span>
                        <TrendBadge variacion={periodComparison.variacion.tracking_pct} />
                      </div>
                    ) : undefined}
                  />
                  <IndicadorCard
                    titulo="Tareas documentadas (fecha/hora/responsable)"
                    valor={kpi!.tareas_documentadas_conteo ?? 0}
                    unidad="tareas"
                    descripcion="Tareas con fecha, hora completada y responsable"
                    color="bg-cyan-600"
                    formula="Conteo de tareas que tienen tarea_fecha_completado, tarea_hora_completado y tarea_completado_por en la tabla tareas"
                    comparacion={periodComparison ? (
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-slate-400">Anterior: {periodComparison.anterior.tareas_documentadas_conteo}</span>
                        <TrendBadge variacion={periodComparison.variacion.tareas_documentadas} />
                      </div>
                    ) : undefined}
                  />
                  <IndicadorCard
                    titulo="Servicios con trazabilidad completa"
                    valor={kpi!.registros_completos_pct ?? 0}
                    unidad="%"
                    descripcion="Servicios con historial de cambios completo"
                    color="bg-teal-600"
                    formula="(Servicios que tienen registros en la tabla auditoría ÷ Total de servicios) × 100"
                    comparacion={periodComparison ? (
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-slate-400">Anterior: {periodComparison.anterior.registros_completos_pct}%</span>
                        <TrendBadge variacion={periodComparison.variacion.auditoria_pct} />
                      </div>
                    ) : undefined}
                  />
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">
                  Los indicadores de trazabilidad estarán disponibles cuando el administrador configure el módulo
                </p>
              )}
            </PropuestaSection>

            {/* ============================================ */}
            {/* PROP. 2: EFICIENCIA OPERATIVA */}
            {/* ============================================ */}
            <PropuestaSection
              titulo="Eficiencia Operativa"
              descripcion="Métricas de tiempo, cumplimiento y productividad del equipo"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <IndicadorCard
                  titulo="Tiempo promedio de servicios completados"
                  valor={dashboard?.indicadores?.eficiencia?.tiempo_promedio_min != null ? formatMinutos(dashboard.indicadores.eficiencia.tiempo_promedio_min) : "—"}
                  unidad=""
                  descripcion="Promedio de tus servicios completados en el período actual"
                  color="bg-orange-600"
                  formula="Σ(tracking_fin − tracking_inicio) ÷ N° de servicios completados en el período"
                  comparacion={periodComparison ? (
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-slate-400">Anterior: {formatMinutos(periodComparison.anterior.tiempo_promedio)}</span>
                      <TrendBadge variacion={periodComparison.variacion.tiempo} />
                    </div>
                  ) : undefined}
                />
                <IndicadorCard
                  titulo="Servicios dentro del tiempo estimado"
                  valor={kpi?.completados_dentro_tiempo_pct ?? 0}
                  unidad="%"
                  descripcion="N° servicios cumplieron el tiempo estimado"
                  color="bg-green-600"
                  formula="(Servicios cuyo tiempo real total ≤ tiempo_estimado del servicio ÷ Total de servicios completados) × 100"
                  comparacion={periodComparison ? (
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-slate-400">Anterior: {periodComparison.anterior.completados_dentro_tiempo_pct}%</span>
                      <TrendBadge variacion={periodComparison.variacion.a_tiempo_pct} />
                    </div>
                  ) : undefined}
                />
                <IndicadorCard
                  titulo="Tiempo promedio por tarea"
                  valor={dashboard?.indicadores?.eficiencia?.tiempo_promedio_por_tarea != null ? formatMinutos(dashboard.indicadores.eficiencia.tiempo_promedio_por_tarea) : "—"}
                  unidad=""
                  descripcion="Promedio de tiempo real por tarea completada en el período"
                  color="bg-purple-600"
                  formula="Σ(tarea_tiempo_real) ÷ N° de tareas completadas con tiempo en el período"
                  comparacion={periodComparison ? (
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-slate-400">Anterior: {formatMinutos(periodComparison.anterior.tiempo_promedio_por_tarea)}</span>
                      <TrendBadge variacion={periodComparison.variacion.tiempo_por_tarea} />
                    </div>
                  ) : undefined}
                />
              </div>
            </PropuestaSection>
          </div>



          {/* ============================================ */}
          {/* SERVICIOS ASIGNADOS */}
          {/* ============================================ */}
          {misDatos.servicios_asignados && misDatos.servicios_asignados.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-slate-400" />
                  Servicios
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


        </>
      )}
    </div>
  );
}
