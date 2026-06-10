import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { serviciosApi, seguimientoApi } from "@/api/client.js";
import { toast } from "sonner";
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
    case "pendiente": return "bg-amber-500";
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
          className={`w-8 h-8 transition-colors ${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"}`}
        >
          <svg
            viewBox="0 0 24 24"
            fill={star <= value ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={2}
            className={`${star <= value ? "text-yellow-400" : "text-slate-300"}`}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
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
      <div className="h-32 bg-slate-200 rounded-xl" />
      <div className="h-20 bg-slate-200 rounded-xl" />
    </div>
  );
}

export function ServicioPublicoPage() {
  const { codigo } = useParams<{ codigo: string }>();
  const [rating, setRating] = useState(0);
  const [comentario, setComentario] = useState("");
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Servicio no encontrado</h2>
          <p className="text-slate-500 mb-6">
            El código "{codigo}" no corresponde a ningún servicio.
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-800">ServicioLocalSTS</h1>
          <p className="text-sm text-slate-500 mt-1">Seguimiento de Servicios</p>
        </div>

        {/* Service Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
          {/* Codigo + Estado */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-slate-400">{servicio.codigo}</span>
              <h2 className="text-xl font-bold text-slate-800">{servicio.titulo}</h2>
              <p className="text-sm text-slate-500">{servicio.cliente_nombre}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${estadoColor(servicio.estado)}`}>
              {estadoLabel(servicio.estado)}
            </span>
          </div>

          {servicio.descripcion && (
            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{servicio.descripcion}</p>
          )}

          {/* Area + Prioridad */}
          <div className="flex gap-3 text-xs">
            {servicio.area_nombre && (
              <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                {servicio.area_nombre}
              </span>
            )}
            <span className={`px-2 py-1 rounded-full font-medium ${
              servicio.prioridad === "urgente" ? "bg-red-50 text-red-700" :
              servicio.prioridad === "alta" ? "bg-orange-50 text-orange-700" :
              servicio.prioridad === "media" ? "bg-blue-50 text-blue-700" :
              "bg-slate-100 text-slate-600"
            }`}>
              {servicio.prioridad}
            </span>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-slate-600">Progreso</span>
              <span className="font-semibold text-slate-800">{progreso.porcentaje}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-1000"
                style={{ width: `${progreso.porcentaje}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1 text-center">
              {progreso.completadas} de {progreso.total} tareas completadas
            </p>
          </div>

          {/* Tiempo Info */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Tiempo transcurrido</p>
              <p className="text-lg font-bold text-slate-800 mt-1">
                {formatETA(tiempo_transcurrido_minutos)}
              </p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-blue-500 uppercase tracking-wider">Tiempo estimado restante</p>
              <p className="text-lg font-bold text-blue-700 mt-1">
                {formatETA(etaMinutos)}
              </p>
            </div>
          </div>

          {/* Task List */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">
              Tareas
              <span className="text-slate-400 font-normal ml-1">
                ({progreso.completadas}/{progreso.total})
              </span>
            </h3>
            <div className="space-y-1.5">
              {tareas
                .sort((a: any, b: any) => a.orden - b.orden)
                .map((tarea: any) => (
                  <div
                    key={tarea.id}
                    className={`flex items-center gap-2 p-2.5 rounded-lg ${
                      tarea.completada ? "bg-green-50" : "bg-slate-50"
                    }`}
                  >
                    {tarea.completada ? (
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <div className="w-5 h-5 border-2 border-slate-300 rounded flex-shrink-0" />
                    )}
                    <span className={`text-sm flex-1 ${tarea.completada ? "line-through text-slate-400" : "text-slate-700"}`}>
                      {tarea.titulo}
                    </span>
                    {tarea.tiempo_estimado && (
                      <span className="text-xs text-slate-400">{tarea.tiempo_estimado} min</span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Survey / Rating */}
        {showSurvey && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h3 className="font-semibold text-slate-800">
              {encuesta ? "Tu evaluación" : "¿Cómo fue tu experiencia?"}
            </h3>

            <div>
              <p className="text-sm text-slate-600 mb-2">Calificación</p>
              <StarRating
                value={rating}
                onChange={!encuesta ? setRating : undefined}
                readonly={!!encuesta}
              />
            </div>

            <div>
              <p className="text-sm text-slate-600 mb-2">Comentario</p>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Cuéntanos cómo fue tu experiencia..."
                rows={3}
                disabled={!!encuesta}
                className="w-full px-3 py-2 border rounded-lg text-sm resize-none disabled:bg-slate-50 disabled:text-slate-400"
                maxLength={2000}
              />
            </div>

            <div>
              <p className="text-sm text-slate-600 mb-2">Sugerencia</p>
              <textarea
                value={sugerencia}
                onChange={(e) => setSugerencia(e.target.value)}
                placeholder="¿Alguna sugerencia para mejorar?"
                rows={2}
                disabled={!!encuesta}
                className="w-full px-3 py-2 border rounded-lg text-sm resize-none disabled:bg-slate-50 disabled:text-slate-400"
                maxLength={2000}
              />
            </div>

            {!encuesta && (
              <button
                onClick={() => enviarEncuesta.mutate()}
                disabled={rating === 0 || enviarEncuesta.isPending}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {enviarEncuesta.isPending ? "Enviando..." : "Enviar evaluación"}
              </button>
            )}

            {encuesta && (
              <p className="text-xs text-slate-400 text-center">
                Gracias por tu evaluación. La calificación ya fue registrada.
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-400">
          ServicioLocalSTS © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
