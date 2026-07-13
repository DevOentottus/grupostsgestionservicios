import { useMemo } from "react";
import { useAuth } from "@/lib/auth.js";
import { useMiArea } from "@/api/queries/useManager.js";
import { useDashboard } from "@/api/queries/useDashboard.js";
import { InfoPopover } from "@/app/components/ui/info-popover.js";
import {
  TrendingUp, CheckCircle2, Star,
  Clock, Target, Zap, BarChart3, Eye, MessageCircle, FileText,
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
  titulo, valor, unidad, descripcion, color, icon: Icon, formula,
}: {
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
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center shrink-0`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <p className="text-[11px] text-slate-500 leading-tight">{titulo}</p>
        {formula && <InfoPopover formula={formula} />}
      </div>
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className="text-2xl font-bold text-slate-800">{typeof valor === "number" ? valor.toLocaleString() : valor}</span>
        <span className="text-xs text-slate-400">{unidad}</span>
        {descripcion && (
          <>
            <span className="text-xs text-slate-300">|</span>
            <span className="text-[10px] text-slate-400">{descripcion}</span>
          </>
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

  // Dashboard KPIs (puede fallar si el backend no da acceso)
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const firstDay = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  }, []);
  const { data: dashboard, isLoading: dashLoading, isError: dashError } = useDashboard({
    fecha_inicio: firstDay,
    fecha_fin: today,
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

  // Productividad personal (servicios completados en el período)
  const productividadPersonal = useMemo(() => {
    if (misDatos?.servicios_completados == null) return null;
    return misDatos.servicios_completados;
  }, [misDatos]);

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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tareas completadas</p>
              </div>
              <p className="text-3xl font-bold text-slate-800">{misDatos.tareas_completadas ?? 0}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Servicios completados</p>
              </div>
              <p className="text-3xl font-bold text-indigo-600">{misDatos.servicios_completados ?? 0}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tareas activas</p>
              </div>
              <p className="text-3xl font-bold text-amber-600">{misDatos.tareas_activas ?? 0}</p>
            </div>
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
            </div>
          </div>

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
                  icon={FileText}
                  formula="Tiempo de ejecución: Tracking_final − Tracking_inicial"
                />
                <IndicadorCard
                  titulo="Tareas documentadas (fecha/hora/responsable)"
                  valor={kpi!.tareas_documentadas_conteo ?? 0}
                  unidad="tareas"
                  descripcion="Tareas con fecha, hora completada y responsable"
                  color="bg-cyan-600"
                  icon={CheckCircle2}
                  formula="Conteo de tareas que tienen tarea_fecha_completado, tarea_hora_completado y tarea_completado_por en la tabla tareas"
                />
                <IndicadorCard

                  titulo="Servicios con trazabilidad completa"
                  valor={kpi!.registros_completos_pct ?? 0}
                  unidad="%"
                  descripcion="Servicios con historial de cambios completo"
                  color="bg-teal-600"
                  icon={BarChart3}
                  formula="(Servicios que tienen registros en la tabla auditoría ÷ Total de servicios) × 100"
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
                valor={dashboard?.indicadores?.eficiencia?.tiempo_promedio_min ?? "—"}
                unidad="min"
                descripcion="Promedio del área en el período actual"
                color="bg-orange-600"
                icon={Clock}
                formula="Σ(tracking_fin − tracking_inicio) ÷ N° de servicios completados en el período"
              />
              <IndicadorCard

                titulo="Servicios dentro del tiempo estimado"
                valor={kpi?.completados_dentro_tiempo_pct ?? 0}
                unidad="%"
                descripcion="N° servicios cumplieron el tiempo estimado"
                color="bg-green-600"
                icon={Target}
                formula="(Servicios cuyo tiempo real total ≤ tiempo_estimado del servicio ÷ Total de servicios completados) × 100"
              />
              <IndicadorCard

                titulo="Productividad personal"
                valor={productividadPersonal ?? 0}
                unidad="servicios"
                descripcion="Servicios completados en el período"
                color="bg-purple-600"
                icon={Zap}
                formula="N° de servicios completados por el colaborador en el período seleccionado"
              />
            </div>
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

                  titulo="Servicios consultados por clientes"
                  valor={kpi!.servicios_consultados_pct ?? 0}
                  unidad="%"
                  descripcion="Servicios con al menos 1 consulta en el portal"
                  color="bg-sky-600"
                  icon={Eye}
                  formula="(Servicios que tienen al menos 1 visita en la tabla visitas_portal ÷ Total de servicios) × 100"
                />
                <IndicadorCard

                  titulo="Tiempo actualización → portal"
                  valor={kpi!.tiempo_actualizacion_portal_promedio_min ?? 0}
                  unidad="min"
                  descripcion="Promedio: última tarea completada → primera visita al portal"
                  color="bg-indigo-600"
                  icon={Clock}
                  formula="Σ(primera visita al portal − última tarea completada) ÷ N° de servicios con visita después de completar"
                />
                <IndicadorCard

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

                titulo="Calificación promedio personal"
                valor={misDatos.calificacion_promedio?.toFixed(1) ?? "—"}
                unidad={misDatos.calificacion_promedio != null ? "/5" : ""}
                descripcion="Promedio de estrellas recibidas en servicios completados"
                color="bg-yellow-600"
                icon={Star}
                formula="Σ(calificación de cada servicio completado por el colaborador) ÷ N° de servicios con calificación"
              />
              <IndicadorCard

                titulo="Servicios evaluados por clientes"
                valor={kpi?.servicios_evaluados_pct ?? 0}
                unidad="%"
                descripcion="% de servicios completados que recibieron calificación"
                color="bg-emerald-600"
                icon={CheckCircle2}
                formula="(Servicios completados que tienen al menos 1 calificación ÷ Total de servicios completados) × 100"
              />
              <IndicadorCard

                titulo="Servicios con comentarios/sugerencias"
                valor={kpi?.servicios_con_comentarios_pct ?? 0}
                unidad="%"
                descripcion="% de servicios con feedback del cliente"
                color="bg-rose-600"
                icon={MessageCircle}
                formula="(Servicios completados que tienen comentarios internos registrados ÷ Total de servicios completados) × 100"
              />
            </div>

            {/* Satisfacción del área si existe */}
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
                <div className="flex gap-3 text-xs">
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
          </PropuestaSection>

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
