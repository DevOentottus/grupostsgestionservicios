import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { serviciosApi, seguimientoApi } from "@/api/client.js";
import { toast } from "sonner";
import { cn } from "@/app/lib/utils";
import {
  Clock, CheckCircle2, AlertTriangle, Star, Send, ArrowLeft,
} from "lucide-react";
import type { PublicServicioResponse, Encuesta } from "@shared/index.js";

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
  const [rating, setRating] = useState(0);
  const [comentario, setComentario] = useState("");
  const [observacion, setObservacion] = useState("");
  const [sugerencia, setSugerencia] = useState("");
  const [showSurvey, setShowSurvey] = useState(false);

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

  useEffect(() => {
    if (data?.encuesta) {
      setRating(data.encuesta.calificacion);
      setComentario(data.encuesta.comentario || "");
      setSugerencia(data.encuesta.sugerencia || "");
      setShowSurvey(true);
    } else if (data?.servicio) {
      setShowSurvey(data.servicio.estado === "completado");
    }
  }, [data]);

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
          <span className="text-sm text-gray-500">ServicioLocal — Seguimiento</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Service Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          {/* Codigo + Estado */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                {servicio.codigo}
              </span>
              <h2 className="text-xl text-gray-900 mt-1.5" style={{ fontWeight: 700 }}>{servicio.titulo}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{servicio.cliente_nombre}</p>
            </div>
            <span className={cn(
              "px-3 py-1 rounded-full text-sm text-white flex-shrink-0",
              estadoColor(servicio.estado),
            )} style={{ fontWeight: 600 }}>
              {estadoLabel(servicio.estado)}
            </span>
          </div>

          {servicio.descripcion && (
            <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 leading-relaxed">{servicio.descripcion}</p>
          )}

          {/* Area + Prioridad tags */}
          <div className="flex flex-wrap gap-2 text-xs">
            {servicio.area_nombre && (
              <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full" style={{ fontWeight: 500 }}>
                {servicio.area_nombre}
              </span>
            )}
            <span className={cn(
              "px-2.5 py-1 rounded-full",
              servicio.prioridad === "urgente" ? "bg-red-50 text-red-700" :
              servicio.prioridad === "alta" ? "bg-orange-50 text-orange-700" :
              servicio.prioridad === "media" ? "bg-blue-50 text-blue-700" :
              "bg-gray-100 text-gray-600",
            )} style={{ fontWeight: 500 }}>
              {servicio.prioridad}
            </span>
          </div>

          {/* Animated Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-500">Progreso</span>
              <span className="text-gray-900" style={{ fontWeight: 700 }}>{progreso.porcentaje}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${progreso.porcentaje}%`,
                  background: `linear-gradient(90deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)`,
                }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5 text-center">
              {progreso.completadas} de {progreso.total} tareas completadas
              {progreso.porcentaje === 100 && (
                <span className="text-green-600 ml-1" style={{ fontWeight: 600 }}>— ¡Completado!</span>
              )}
            </p>
          </div>

          {/* Time Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Tiempo transcurrido</p>
              <p className="text-lg text-gray-900 mt-0.5" style={{ fontWeight: 700 }}>
                {formatETA(tiempo_transcurrido_minutos)}
              </p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Clock className="w-4 h-4 text-blue-700" />
              </div>
              <p className="text-xs text-blue-600 uppercase tracking-wider">Tiempo estimado restante</p>
              <p className="text-lg text-blue-700 mt-0.5" style={{ fontWeight: 700 }}>
                {formatETA(etaMinutos)}
              </p>
            </div>
          </div>

          {/* Task List */}
          <div>
            <h3 className="text-gray-900 mb-3" style={{ fontWeight: 600 }}>
              Tareas
              <span className="text-gray-400 font-normal ml-1">
                ({progreso.completadas}/{progreso.total})
              </span>
            </h3>
            <div className="space-y-1.5">
              {tareas
                .sort((a: any, b: any) => a.orden - b.orden)
                .map((tarea: any) => (
                  <div
                    key={tarea.id}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-xl transition",
                      tarea.completada ? "bg-green-50" : "bg-gray-50",
                    )}
                  >
                    {tarea.completada ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-full flex-shrink-0" />
                    )}
                    <span className={cn(
                      "text-sm flex-1 leading-snug",
                      tarea.completada ? "line-through text-gray-400" : "text-gray-700",
                    )}>
                      {tarea.titulo}
                    </span>
                    {tarea.tiempo_estimado && (
                      <span className="text-xs text-gray-400 flex-shrink-0">{tarea.tiempo_estimado} min</span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Timeline Card */}
        {timelineItems.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-gray-900 mb-4" style={{ fontWeight: 600 }}>Línea de tiempo</h3>
            <div className="relative pl-6 space-y-4">
              {/* Vertical line */}
              <div className="absolute left-[11px] top-1 bottom-0 w-0.5 bg-gray-100" />
              {timelineItems.map((item: any) => (
                <div key={item.id} className="relative">
                  <div className="absolute -left-[25px] top-1 w-[22px] h-[22px] rounded-full bg-blue-100 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-700 leading-snug">{item.titulo}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Completada {new Date(item.completada_at).toLocaleString("es-PE", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Survey / Rating */}
        {showSurvey && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Star className="w-4 h-4 text-yellow-600" />
              </div>
              <h3 className="text-gray-900" style={{ fontWeight: 600 }}>
                {encuesta ? "Tu evaluación" : "¿Cómo fue tu experiencia?"}
              </h3>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">Calificación</p>
              <StarRating
                value={rating}
                onChange={!encuesta ? setRating : undefined}
                readonly={!!encuesta}
              />
            </div>

            {/* Comentario */}
            <div>
              <p className="text-sm text-gray-500 mb-2">Comentario</p>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Cuéntanos cómo fue tu experiencia..."
                rows={3}
                disabled={!!encuesta}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none transition disabled:bg-gray-50 disabled:text-gray-400 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                maxLength={2000}
              />
            </div>

            {/* Observación */}
            <div>
              <p className="text-sm text-gray-500 mb-2">Observación adicional</p>
              <textarea
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                placeholder="Detalles adicionales que quieras compartir..."
                rows={2}
                disabled={!!encuesta}
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
                disabled={!!encuesta}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none transition disabled:bg-gray-50 disabled:text-gray-400 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                maxLength={2000}
              />
            </div>

            {!encuesta && (
              <button
                onClick={() => enviarEncuesta.mutate()}
                disabled={rating === 0 || enviarEncuesta.isPending}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm transition disabled:opacity-50"
                style={{ fontWeight: 600 }}
              >
                <Send className="w-4 h-4" />
                {enviarEncuesta.isPending ? "Enviando..." : "Enviar evaluación"}
              </button>
            )}

            {encuesta && (
              <p className="text-xs text-gray-400 text-center">
                Gracias por tu evaluación. La calificación ya fue registrada.
              </p>
            )}
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
