import { useState, useMemo } from "react";
import { useDesempeno, useMiArea } from "@/api/queries/useManager.js";
import { useDashboard } from "@/api/queries/useDashboard.js";
import { useUsuarios } from "@/api/queries/useUsuarios.js";
import { useAuth } from "@/lib/auth.js";
import { InfoPopover } from "@/app/components/ui/info-popover.js";
import { formatMinutos } from "@/app/lib/utils";
import {
  TrendingUp, Clock, Target, CheckCircle2, Search, Calendar,
  User, Star, BarChart3, Eye, MessageCircle, FileText, Zap,
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

function IndicadorCard({
  numero, titulo, valor, unidad, descripcion, color, icon: Icon, formula,
}: {
  numero: string;
  titulo: string;
  valor: string | number;
  unidad: string;
  descripcion: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  formula?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center`}>
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-400">{numero}</span>
          {formula && <InfoPopover formula={formula} />}
        </div>
      </div>
      <p className="text-[11px] text-slate-500 mb-1 leading-tight">{titulo}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-slate-800">{typeof valor === "number" ? valor.toLocaleString() : valor}</span>
        <span className="text-xs text-slate-400">{unidad}</span>
      </div>
      <p className="text-[10px] text-slate-400 mt-1">{descripcion}</p>
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
      return (todosUsuarios || [])
        .filter((u) => u.rol === "colaborador" || u.rol === "encargado")
        .map((u) => ({
          usuario_id: u.id,
          nombres: [u.nombres, u.apellidos].filter(Boolean).join(" "),
        }));
    }
    return (miArea?.colaboradores || []).map((c) => ({
      usuario_id: c.usuario_id,
      nombres: [c.nombres, c.apellidos].filter(Boolean).join(" "),
    }));
  }, [esSupervisor, todosUsuarios, miArea]);

  const { data, isLoading, isError } = useDesempeno(
    parseInt(colaboradorId),
    colaboradorId ? { fecha_inicio: fechaInicio, fecha_fin: fechaFin } : undefined
  );

  // Dashboard KPIs del área para el mismo período
  const areaId = useMemo(() => miArea?.area?.id ?? undefined, [miArea]);
  const { data: dashboard } = useDashboard(
    colaboradorId && areaId
      ? { fecha_inicio: fechaInicio, fecha_fin: fechaFin, area_id: areaId }
      : undefined
  );
  const kpi = dashboard?.kpi;
  const tieneDashboard = !!kpi;

  // Calificación del colaborador desde miArea (general, no por período)
  const calificacionColaborador = useMemo(() => {
    if (!miArea?.colaboradores || !colaboradorId) return null;
    const c = miArea.colaboradores.find(
      (col) => col.usuario_id === parseInt(colaboradorId)
    );
    return c?.calificacion_promedio ?? null;
  }, [miArea, colaboradorId]);

  // Productividad = servicios completados en el período
  const serviciosPeriodo = data?.servicios_completados ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Desempeño de Colaborador
          </h2>
          <p className="text-sm text-slate-500">
            Evaluá el rendimiento de los colaboradores de tu área
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[220px]">
            <label className="text-xs font-medium text-slate-500 block mb-1.5 flex items-center gap-1">
              <Search className="w-3 h-3" />
              Colaborador
            </label>
            <select
              value={colaboradorId}
              onChange={(e) => setColaboradorId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
            <label className="text-xs font-medium text-slate-500 block mb-1.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Desde
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Hasta
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          {colaboradorId && (
            <button
              onClick={() => {
                const base = import.meta.env.VITE_API_URL || "";
                const params = new URLSearchParams();
                if (fechaInicio) params.set("fecha_inicio", fechaInicio);
                if (fechaFin) params.set("fecha_fin", fechaFin);
                params.set("usuario_id", colaboradorId);
                window.open(`${base}/api/reportes/exportar/colaborador/pdf?${params.toString()}`, "_blank");
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Exportar PDF
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {!colaboradorId && (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
          <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Seleccioná un colaborador para ver su desempeño</p>
          <p className="text-sm text-slate-400 mt-1">Usá el filtro de arriba para empezar</p>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 mt-3 text-sm">Cargando datos de desempeño...</p>
        </div>
      )}

      {isError && (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
          <p className="text-red-500 font-medium">Error al cargar datos de desempeño</p>
          <p className="text-sm text-slate-400 mt-1">Intentalo de nuevo más tarde</p>
        </div>
      )}

      {data && (
        <>
          {/* ============================================ */}
          {/* RESUMEN — Summary Cards */}
          {/* ============================================ */}
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

          {/* ============================================ */}
          {/* PROP. 1: TRAZABILIDAD Y CONTROL OPERATIVO */}
          {/* ============================================ */}
          <PropuestaSection
            titulo="Trazabilidad y Control Operativo"
            descripcion="Indicadores de registro, documentación y trazabilidad de tareas y servicios"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <IndicadorCard
                numero="1.1"
                titulo="Tareas completadas en el período"
                valor={data.total_tareas}
                unidad="tareas"
                descripcion="Total de tareas finalizadas por el colaborador"
                color="bg-blue-600"
                icon={CheckCircle2}
                formula="N° de tareas con estado 'completado' asignadas al colaborador en el período seleccionado"
              />
              <IndicadorCard
                numero="1.2"
                titulo="Servicios completados en el período"
                valor={data.servicios_completados}
                unidad="servicios"
                descripcion="Servicios donde el colaborador participó"
                color="bg-cyan-600"
                icon={FileText}
                formula="N° de servicios donde el colaborador es técnico principal y tienen estado 'completado' en el período"
              />
              <IndicadorCard
                numero="1.3"
                titulo="Promedio tareas por servicio"
                valor={data.servicios_completados > 0 ? (data.total_tareas / data.servicios_completados).toFixed(1) : "—"}
                unidad={data.servicios_completados > 0 ? "tareas/serv" : ""}
                descripcion="Cantidad promedio de tareas por servicio completado"
                color="bg-teal-600"
                icon={BarChart3}
                formula="Total de tareas completadas ÷ Total de servicios completados en el período"
              />
            </div>
          </PropuestaSection>

          {/* ============================================ */}
          {/* PROP. 2: EFICIENCIA OPERATIVA */}
          {/* ============================================ */}
          <PropuestaSection
            titulo="Eficiencia Operativa"
            descripcion="Métricas de tiempo, cumplimiento y productividad del colaborador"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <IndicadorCard
                numero="2.1"
                titulo="Tiempo promedio por tarea"
                valor={formatMinutos(data.tiempo_promedio_por_tarea)}
                unidad=""
                descripcion="Promedio de minutos invertidos por tarea completada"
                color="bg-orange-600"
                icon={Clock}
                formula="Σ(tracking_fin − tracking_inicio de cada tarea del colaborador) ÷ N° de tareas con tiempo registrado"
              />
              <IndicadorCard
                numero="2.2"
                titulo="Eficiencia general"
                valor={data.eficiencia}
                unidad="%"
                descripcion="Porcentaje de tareas dentro del tiempo estimado"
                color="bg-green-600"
                icon={Target}
                formula="(Tareas cuyo tiempo real ≤ tiempo_estimado de la tarea ÷ Total de tareas completadas) × 100"
              />
              <IndicadorCard
                numero="2.3"
                titulo="Tiempo total invertido"
                valor={formatMinutos(data.tiempo_total_minutos)}
                unidad=""
                descripcion="Suma total de tiempo en tareas del período"
                color="bg-purple-600"
                icon={Zap}
                formula="Σ(tiempo real de cada tarea completada por el colaborador en el período)"
              />
            </div>

            {/* Team KPIs: servicios dentro del tiempo estimado */}
            {tieneDashboard && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-[11px] font-medium text-slate-500 mb-3">Comparativa del área</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <IndicadorCard
                    numero="2.4"
                    titulo="Servicios dentro del tiempo estimado (área)"
                    valor={kpi!.completados_dentro_tiempo_pct ?? 0}
                    unidad="%"
                    descripcion="Porcentaje del área en el mismo período"
                    color="bg-emerald-600"
                    icon={Target}
                    formula="(Servicios del área cuyo tiempo real total ≤ tiempo_estimado ÷ Total servicios completados del área) × 100"
                  />
                  <IndicadorCard
                    numero="2.5"
                    titulo="Tiempo promedio del área"
                    valor={formatMinutos(kpi!.tiempo_promedio_min)}
                    unidad=""
                    descripcion="Promedio del área en el mismo período"
                    color="bg-amber-600"
                    icon={Clock}
                    formula="Σ(tracking_fin − tracking_inicio de tareas del área en el período) ÷ N° de tareas con tiempo registrado"
                  />
                </div>
              </div>
            )}
          </PropuestaSection>

          {/* ============================================ */}
          {/* PROP. 3: TRANSPARENCIA PARA EL CLIENTE */}
          {/* ============================================ */}
          <PropuestaSection
            titulo="Transparencia para el Cliente"
            descripcion="Indicadores de consulta, visibilidad y satisfacción con el portal"
          >
            {tieneDashboard ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <IndicadorCard
                  numero="3.1"
                  titulo="Servicios consultados por clientes"
                  valor={kpi!.servicios_consultados_pct ?? 0}
                  unidad="%"
                  descripcion="Servicios del área con al menos 1 consulta en el portal"
                  color="bg-sky-600"
                  icon={Eye}
                  formula="(Servicios con al menos 1 visita en visitas_portal ÷ Total de servicios del área) × 100"
                />
                <IndicadorCard
                  numero="3.2"
                  titulo="Tiempo actualización → portal"
                  valor="< 1"
                  unidad="min"
                  descripcion="Tiempo promedio en reflejar cambios al cliente"
                  color="bg-indigo-600"
                  icon={Clock}
                  formula="Valor fijo: < 1 minuto (actualización en tiempo real vía Supabase Realtime)"
                />
                <IndicadorCard
                  numero="3.3"
                  titulo="Satisfacción con visibilidad"
                  valor={kpi!.satisfaccion_visibilidad ?? 0}
                  unidad="/5"
                  descripcion="Evaluación de clientes sobre visibilidad del progreso"
                  color="bg-violet-600"
                  icon={Star}
                  formula="Promedio de calificaciones (1–5) dadas por clientes en la categoría 'visibilidad del progreso'"
                />
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">
                Los indicadores de transparencia se actualizarán cuando los clientes usen el portal de seguimiento
              </p>
            )}
          </PropuestaSection>

          {/* ============================================ */}
          {/* PROP. 4: SATISFACCIÓN Y MEJORA CONTINUA */}
          {/* ============================================ */}
          <PropuestaSection
            titulo="Satisfacción y Mejora Continua"
            descripcion="Métricas de calificación, evaluación y feedback de clientes"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <IndicadorCard
                numero="4.1"
                titulo="Calificación promedio"
                valor={calificacionColaborador != null ? calificacionColaborador.toFixed(1) : "—"}
                unidad={calificacionColaborador != null ? "/5" : ""}
                descripcion="Promedio de estrellas recibidas (histórico general)"
                color="bg-yellow-600"
                icon={Star}
                formula="Σ(calificación de cada servicio del colaborador) ÷ N° de servicios con calificación"
              />
              <IndicadorCard
                numero="4.2"
                titulo="Servicios evaluados por clientes"
                valor={kpi?.servicios_evaluados_pct ?? 0}
                unidad="%"
                descripcion="% de servicios completados que recibieron calificación"
                color="bg-emerald-600"
                icon={CheckCircle2}
                formula="(Servicios completados con al menos 1 calificación ÷ Total servicios completados del área) × 100"
              />
              <IndicadorCard
                numero="4.3"
                titulo="Servicios con comentarios/sugerencias"
                valor={kpi?.servicios_con_comentarios_pct ?? 0}
                unidad="%"
                descripcion="% de servicios con feedback del cliente"
                color="bg-rose-600"
                icon={MessageCircle}
                formula="(Servicios completados con comentarios internos ÷ Total servicios completados del área) × 100"
              />
            </div>

            {/* Satisfacción del área */}
            {miArea?.satisfaccion && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">Satisfacción del área</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-yellow-600">
                      {miArea.satisfaccion.promedio.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-400">/ 5</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="text-green-600">Promotores: {miArea.satisfaccion.promotores}</span>
                  <span className="text-amber-600">Pasivos: {miArea.satisfaccion.pasivos}</span>
                  <span className="text-red-600">Detractores: {miArea.satisfaccion.detractores}</span>
                </div>
                <div className="mt-2 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-green-500 h-full rounded-full"
                    style={{ width: `${miArea.satisfaccion.calificaciones_positivas_pct ?? 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>{miArea.satisfaccion.calificaciones_positivas_pct?.toFixed(0) ?? 0}% positivas</span>
                  <span>{miArea.satisfaccion.calificaciones_negativas_pct?.toFixed(0) ?? 0}% negativas</span>
                </div>
              </div>
            )}

            {/* Estrellas del colaborador si tiene calificación */}
            {calificacionColaborador != null && (
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                <StarRating rating={calificacionColaborador} />
                <span>({calificacionColaborador.toFixed(1)} / 5)</span>
              </div>
            )}
          </PropuestaSection>

          {/* ============================================ */}
          {/* Time Detail + Collaborator Info */}
          {/* ============================================ */}
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
                  <p className="text-xs text-slate-500 mb-1">Periodo evaluado</p>
                  <p className="text-sm font-medium text-slate-700">
                    {new Date(data.periodo.desde).toLocaleDateString()} — {new Date(data.periodo.hasta).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                Colaborador
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
                  <p className="text-xs text-slate-500">Rol</p>
                  <span className="inline-block text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 mt-0.5">
                    {data.colaborador.rol}
                  </span>
                </div>
                {calificacionColaborador != null && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Calificación general</p>
                    <StarRating rating={calificacionColaborador} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tareas completadas list */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Tareas Completadas
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
                    <tr key={t.id} className="hover:bg-blue-50/40 transition-colors">
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
                        {t.tiempo_estimado
                          ? `${t.tiempo_estimado} min`
                          : "—"}
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
