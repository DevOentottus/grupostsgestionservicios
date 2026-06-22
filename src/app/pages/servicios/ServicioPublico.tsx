import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { serviciosApi, seguimientoApi, evidenciasPublicApi } from "@/api/client.js";
import { toast } from "sonner";
import { cn } from "@/app/lib/utils";
import {
  Clock, CheckCircle2, AlertTriangle, Star, Send, ArrowLeft, Camera, X, Loader2,
} from "lucide-react";
import type { PublicServicioResponse, Encuesta, Evidencia, EvidenciaComentario } from "@shared/index.js";
import { EvidenceViewer } from "@/app/components/evidencias/EvidenceViewer.js";

function formatETA(minutes: number): string {
  if (minutes < 1) return "Menos de 1 min";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function estadoLabel(estado: string): string {
  const map: Record<string, string> = {
    pendiente: "Pendiente",
    en_progreso: "En Progreso",
    completado: "Completado",
    cancelado: "Cancelado",
    bloqueado: "Bloqueado",
  };
  return map[estado] || estado;
}

function estadoColor(estado: string): string {
  switch (estado) {
    case "en_progreso": return "bg-blue-500";
    case "completado": return "bg-green-500";
    case "pendiente": return "bg-yellow-500";
    case "bloqueado": return "bg-red-500";
    case "cancelado": return "bg-slate-500";
    default: return "bg-slate-400";
  }
}

function StarRating({ value, onChange, readonly }: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={cn(
            "w-9 h-9 flex items-center justify-center rounded-lg transition-all",
            readonly ? "cursor-default" : "cursor-pointer hover:scale-125",
            star <= value ? "text-yellow-400" : "text-gray-200",
          )}
        >
          <Star className={cn("w-6 h-6", star <= value ? "fill-yellow-400" : "fill-none")} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-xl mx-auto space-y-4 animate-pulse">
      <div className="h-8 bg-slate-200 rounded-lg w-1/3 mx-auto" />
      <div className="h-4 bg-slate-200 rounded w-2/3 mx-auto" />
      <div className="h-32 bg-slate-200 rounded-2xl" />
      <div className="h-20 bg-slate-200 rounded-2xl" />
    </div>
  );
}

export function ServicioPublicoPage() {
  const { codigo } = useParams<{ codigo: string }>();
  const [searchParams] = useSearchParams();
  const dni = searchParams.get("dni") || undefined;
  const [rating, setRating] = useState(0);
  const [comentario, setComentario] = useState("");
  const [sugerencia, setSugerencia] = useState("");
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [evidencias, setEvidencias] = useState<(Evidencia & { comentarios?: EvidenciaComentario[] })[]>([]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["servicio-publico", codigo],
    queryFn: async () => {
      const r = await serviciosApi.obtenerServicioPublico(codigo!);
      return r.data.data as PublicServicioResponse;
    },
    enabled: !!codigo,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  // Fetch evidencias when service loads
  const evidenciasQuery = useQuery({
    queryKey: ["evidencias-publicas", codigo, dni],
    queryFn: async () => {
      const r = await evidenciasPublicApi.listarPorCodigo(codigo!, dni!);
      return r.data.data as (Evidencia & { comentarios: EvidenciaComentario[] })[];
    },
    enabled: !!codigo && !!dni && !!data?.servicio,
  });

  useEffect(() => {
    if (evidenciasQuery.data) {
      setEvidencias(evidenciasQuery.data);
    }
  }, [evidenciasQuery.data]);

  useEffect(() => {
    if (data?.encuesta) {
      setRating(data.encuesta.calificacion);
      setComentario(data.encuesta.comentario || "");
      setSugerencia(data.encuesta.sugerencia || "");
    }
  }, [data]);

  const servicioCompletado = data?.servicio?.estado === "completado";

  const enviarEncuesta = useMutation({
    mutationFn: async () => {
      await seguimientoApi.crearEncuesta(data!.servicio.id, {
        calificacion: rating,
        comentario: comentario || undefined,
        sugerencia: sugerencia || undefined,
      });
    },
    onSuccess: () => {
      toast.success("¡Gracias por tu evaluación!");
      refetch();
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Error al enviar"),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="bg-gray-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-2xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>Servicio no encontrado</h2>
          <p className="text-gray-500 mb-6 text-sm">
            El código "{codigo}" no corresponde a ningún servicio activo.
          </p>
          <Link to="/" className="text-blue-600 hover:underline text-sm">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const { servicio, tareas, progreso, tiempo_transcurrido_minutos, encuesta } = data;
  const tareasPendientes = tareas.filter((t: any) => !t.completada);
  const etaMinutos = tareasPendientes.reduce(
    (sum: number, t: any) => sum + (t.tiempo_estimado || 15),
    0
  );

  // Satisfaction rating state
  const encuestaYaEnviada = !!data?.encuesta;

  // Build timeline from completed tasks
  const timelineItems = tareas
    .filter((t: any) => t.completada && t.completada_at)
    .sort((a: any, b: any) => new Date(a.completada_at).getTime() - new Date(b.completada_at).getTime());

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-gray-600 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center">
            <span className="text-yellow-400 text-xs" style={{ fontWeight: 800 }}>STS</span>
          </div>
          <span className="text-sm text-gray-500">ServicioLocal -- Seguimiento</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Service Card -- compacto */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-5 space-y-3">
          <div className="h-1.5 bg-blue-600 -mx-5 -mt-5 mb-3" />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md font-medium">
                  {servicio.codigo}
                </span>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs text-white",
                  estadoColor(servicio.estado),
                )} style={{ fontWeight: 600 }}>
                  {estadoLabel(servicio.estado)}
                </span>
              </div>
              <h2 className="text-lg text-gray-900" style={{ fontWeight: 700 }}>{servicio.titulo}</h2>
              <p className="text-sm text-gray-500">{servicio.cliente_nombre}</p>
            </div>
          </div>

          {servicio.descripcion && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5 leading-relaxed">{servicio.descripcion}</p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            {servicio.area_nombre && (
              <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                {servicio.area_nombre}
              </span>
            )}
            <span className={cn(
              "px-2 py-0.5 rounded-full font-medium",
              servicio.prioridad === "urgente" ? "bg-red-50 text-red-700" :
              servicio.prioridad === "alta" ? "bg-orange-50 text-orange-700" :
              servicio.prioridad === "media" ? "bg-blue-50 text-blue-700" :
              "bg-gray-100 text-gray-600",
            )}>
              {servicio.prioridad}
            </span>
          </div>
        </div>

        {/* -- Satisfacción / Seguimiento del servicio -- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-5 pt-5 pb-3">
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center",
              servicio.estado === "completado" ? "bg-green-100" : "bg-blue-100",
            )}>
              {servicio.estado === "completado" ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <Clock className="w-4 h-4 text-blue-600" />
              )}
            </div>
            <div>
              <h3 className="text-sm text-gray-900 font-semibold">Seguimiento del servicio</h3>
              <p className="text-[10px] text-gray-400">
                {servicio.estado === "completado" ? "Servicio finalizado" : "Estado actual del servicio"}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="px-5 pb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500 font-medium">Progreso</span>
              <span className="text-xs text-gray-900 font-bold">{progreso.porcentaje}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${progreso.porcentaje}%`,
                  background: progreso.porcentaje === 100
                    ? "linear-gradient(90deg, #22c55e 0%, #16a34a 100%)"
                    : "linear-gradient(90deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)",
                }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 text-center">
              {progreso.completadas} de {progreso.total} tareas completadas
            </p>
          </div>

          {/* Time metrics row */}
          <div className="grid grid-cols-2 gap-px bg-gray-100 mx-5 mb-4 rounded-xl overflow-hidden">
            <div className="bg-white p-3 text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Transcurrido</p>
              <p className="text-base text-gray-900 font-bold mt-0.5">
                {formatETA(tiempo_transcurrido_minutos)}
              </p>
            </div>
            <div className="bg-white p-3 text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Restante estimado</p>
              <p className="text-base text-blue-700 font-bold mt-0.5">
                {progreso.porcentaje === 100 ? "--" : formatETA(etaMinutos)}
              </p>
            </div>
          </div>

          {/* Task list */}
          <div className="px-5 pb-4">
            <h4 className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2.5">
              Tareas
              <span className="text-gray-300 font-normal ml-1">({progreso.completadas}/{progreso.total})</span>
            </h4>
            <div className="space-y-1">
              {tareas
                .sort((a: any, b: any) => a.orden - b.orden)
                .map((tarea: any) => (
                  <div
                    key={tarea.id}
                    className={cn(
                      "flex items-center gap-2.5 p-2 rounded-lg transition",
                      tarea.completada ? "bg-green-50" : "bg-gray-50",
                    )}
                  >
                    {tarea.completada ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-gray-300 rounded-full flex-shrink-0" />
                    )}
                    <span className={cn(
                      "text-xs flex-1 leading-snug",
                      tarea.completada ? "line-through text-gray-400" : "text-gray-700",
                    )}>
                      {tarea.titulo}
                    </span>
                    {tarea.tiempo_estimado && !tarea.completada && (
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{tarea.tiempo_estimado} min</span>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Timeline */}
          {timelineItems.length > 0 && (
            <div className="border-t border-gray-100 px-5 py-4">
              <h4 className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Línea de tiempo</h4>
              <div className="relative pl-5 space-y-3">
                <div className="absolute left-[7px] top-1 bottom-0 w-0.5 bg-gray-100" />
                {timelineItems.map((item: any) => (
                  <div key={item.id} className="relative">
                    <div className="absolute -left-[18px] top-0.5 w-3.5 h-3.5 rounded-full bg-green-100 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    </div>
                    <p className="text-xs text-gray-700 leading-snug">{item.titulo}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(item.completada_at).toLocaleString("es-PE", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Evidencias section */}
        {evidencias.length > 0 && dni && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Camera className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-gray-900" style={{ fontWeight: 600 }}>
                Evidencias del servicio
              </h3>
            </div>
            <EvidenceViewer
              evidencias={evidencias}
              readOnly
              showStatus={false}
              codigo={codigo}
              dni={dni}
              onComentarioAdded={() => evidenciasQuery.refetch()}
            />
          </div>
        )}

        {/* Botón flotante de calificación */}
        {servicioCompletado && (
          <button
            onClick={() => setRatingModalOpen(true)}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all font-semibold text-sm"
          >
            <Star className="w-5 h-5 fill-yellow-900" />
            {encuestaYaEnviada ? "Ver mi calificación" : "Calificar servicio"}
          </button>
        )}

        {/* Modal de calificación */}
        {ratingModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setRatingModalOpen(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <Star className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="text-gray-900 font-semibold" style={{ fontWeight: 600 }}>
                      {encuestaYaEnviada ? "Tu evaluación" : "¿Cómo fue tu experiencia?"}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Servicio {servicio.codigo}</p>
                  </div>
                </div>
                <button
                  onClick={() => setRatingModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Rating stars */}
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-3">Calificación</p>
                <div className="flex justify-center">
                  <StarRating
                    value={rating}
                    onChange={!encuestaYaEnviada ? setRating : undefined}
                    readonly={encuestaYaEnviada}
                  />
                </div>
                {rating > 0 && !encuestaYaEnviada && (
                  <p className="text-xs text-gray-400 mt-2">
                    {rating === 1 ? "Muy malo" :
                     rating === 2 ? "Malo" :
                     rating === 3 ? "Regular" :
                     rating === 4 ? "Bueno" :
                     "Excelente"}
                  </p>
                )}
              </div>

              {/* Comentario */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Comentario</p>
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Contanos cómo fue tu experiencia..."
                  rows={3}
                  disabled={encuestaYaEnviada}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none transition disabled:bg-gray-50 disabled:text-gray-400 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  maxLength={2000}
                />
              </div>

              {/* Sugerencia */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Sugerencia</p>
                <textarea
                  value={sugerencia}
                  onChange={(e) => setSugerencia(e.target.value)}
                  placeholder="¿Alguna sugerencia para mejorar?"
                  rows={2}
                  disabled={encuestaYaEnviada}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none transition disabled:bg-gray-50 disabled:text-gray-400 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  maxLength={2000}
                />
              </div>

              {/* Submit / Already submitted */}
              {!encuestaYaEnviada ? (
                <button
                  onClick={() => enviarEncuesta.mutate()}
                  disabled={rating === 0 || enviarEncuesta.isPending}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm transition disabled:opacity-50 font-semibold"
                >
                  {enviarEncuesta.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {enviarEncuesta.isPending ? "Enviando..." : "Enviar evaluación"}
                </button>
              ) : (
                <div className="text-center py-2">
                  <div className="flex items-center justify-center gap-1.5 text-green-600 text-sm font-medium mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Evaluación registrada
                  </div>
                  <p className="text-xs text-gray-400">Gracias por tu tiempo</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 py-4">
          ServicioLocalSTS © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
