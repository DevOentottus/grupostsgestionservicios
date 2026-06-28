import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { serviciosApi, seguimientoApi, evidenciasPublicApi, ofertasApi } from "@/api/client.js";
import { toast } from "sonner";
import { cn } from "@/app/lib/utils";
import { subscribeToPush } from "@/lib/push.js";
import {
  Clock, CheckCircle2, AlertTriangle, Star, Send, ArrowLeft, Camera, X, Loader2,
  ChevronLeft, ChevronRight, MessageCircle, Eye,
} from "lucide-react";
import type { PublicServicioResponse, Encuesta, Evidencia, EvidenciaComentario } from "@shared/index.js";
import { ProcessFlow } from "@/app/components/flow/ProcessFlow.js";

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

const HEADER_BAR_COLOR: Record<string, string> = {
  pendiente: "bg-yellow-500",
  en_progreso: "bg-blue-600",
  completado: "bg-green-600",
  bloqueado: "bg-red-600",
  cancelado: "bg-gray-400",
};

const ESTADO_BAR_STYLE: Record<string, string> = {
  pendiente: "bg-yellow-400/25 text-yellow-100",
  en_progreso: "bg-white/20 text-white",
  completado: "bg-green-400/25 text-green-100",
  bloqueado: "bg-red-400/25 text-red-100",
  cancelado: "bg-white/10 text-gray-200",
};

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

function OfertasCarousel({ imagenes }: { imagenes: string[] }) {
  const [current, setCurrent] = useState(0);
  const total = imagenes.length;

  useEffect(() => {
    if (current >= total) setCurrent(0);
  }, [current, total]);

  if (total === 0) return null;

  const ir = (idx: number) => setCurrent((idx + total) % total);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
      {/* Header bar — matching service card style */}
      <div className="px-4 md:px-6 py-3 flex items-center gap-2 flex-wrap bg-blue-600 shrink-0">
        <span className="flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
          <span className="text-sm font-semibold text-white">Ofertas y Promociones</span>
        </span>
      </div>
      <div className="relative overflow-hidden w-full flex-1 min-h-0">
        <img
          src={ofertasApi.imagenUrl(imagenes[current])}
          alt={`Oferta ${current + 1}`}
          className="w-full h-full object-contain bg-white"
        />
        {total > 1 && (
          <>
            <button
              onClick={() => ir(current - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => ir(current + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {imagenes.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === current ? "bg-white w-4" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function ServicioPublicoPage() {
  const navigate = useNavigate();
  const { codigo } = useParams<{ codigo: string }>();
  const [searchParams] = useSearchParams();
  const dni = searchParams.get("dni") || sessionStorage.getItem("public_dni") || undefined;

  // Si no hay DNI, redirigir al formulario de seguimiento con el código pre-cargado
  useEffect(() => {
    if (!dni) {
      navigate(`/seguimiento-cliente${codigo ? `?codigo=${encodeURIComponent(codigo)}` : ""}`, { replace: true });
    }
  }, []);
  const [rating, setRating] = useState(0);
  const [comentario, setComentario] = useState("");
  const [sugerencia, setSugerencia] = useState("");
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [evidencias, setEvidencias] = useState<(Evidencia & { comentarios?: EvidenciaComentario[] })[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    setIsDesktop(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, []);

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

  // Lookup tarea_id → titulo para mostrar en cada evidencia
  const tareasMap = useMemo(() => {
    const map = new Map<number, string>();
    if (data?.tareas) {
      data.tareas.forEach((t) => map.set(t.id, t.titulo));
    }
    return map;
  }, [data?.tareas]);

  // -- Ofertas query (compartido entre barra y carrusel) --
  const ofertasQuery = useQuery({
    queryKey: ["ofertas-imagenes"],
    queryFn: async () => {
      const r = await ofertasApi.listar();
      return r.data.data as string[];
    },
    refetchInterval: 60_000,
  });
  const ofertasImagenes = ofertasQuery.data || [];
  const hayOfertas = ofertasImagenes.length > 0;

  useEffect(() => {
    if (data?.encuesta) {
      setRating(data.encuesta.calificacion);
      setComentario(data.encuesta.comentario || "");
      setSugerencia(data.encuesta.sugerencia || "");
    }
  }, [data]);

  // Suscribir a notificaciones push si ya hay permiso concedido
  useEffect(() => {
    if (!dni) return;
    if (Notification.permission !== "granted") return;
    let cancelled = false;
    subscribeToPush(dni).then((ok) => {
      if (cancelled) return;
      if (ok) {
        sessionStorage.setItem("push_subscribed", "true");
      }
    });
    return () => { cancelled = true; };
  }, [dni]);

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
  const tareasCompletadas = tareas.filter((t: any) => t.completada).length;
  const totalTareas = tareas.length;
  const pctProgreso = totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0;
  const tareasPendientes = tareas.filter((t: any) => !t.completada);
  const etaMinutos = tareasPendientes.reduce(
    (sum: number, t: any) => sum + (t.tiempo_estimado || 15),
    0
  );

  // Satisfaction rating state
  const encuestaYaEnviada = !!data?.encuesta;

  // Convert tareas to flow steps
  const flowSteps = tareas.map((t: any) => ({
    id: t.id,
    titulo: t.titulo,
    completada: t.completada,
    orden: t.orden,
    completada_at: t.completada_at,
    tiempo_estimado: t.tiempo_estimado,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="w-full px-4 py-3 flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-gray-600 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center">
            <span className="text-yellow-400 text-xs" style={{ fontWeight: 800 }}>STS</span>
          </div>
          <span className="text-sm text-gray-500">ServicioLocal -- Seguimiento</span>
        </div>
      </div>

      <div className="w-full px-4 py-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Col 1: Servicio (2/3) */}
          <div className="md:col-span-2 space-y-5">

        {/* Service Card -- compacto */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header bar — mismo formato que detalle */}
          <div className={cn("px-4 md:px-6 py-2 flex items-center gap-2 flex-wrap", HEADER_BAR_COLOR[servicio.estado] || "bg-blue-600")}>
            <span className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white bg-black px-2 py-0.5 rounded-lg font-mono shadow-sm">{servicio.codigo}</span>
              {servicio.colaborador_nombre && (
                <span className="text-[10px] font-medium text-white/90 bg-black/50 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm max-w-[120px] md:max-w-none truncate">
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="truncate">{servicio.colaborador_nombre}</span>
                </span>
              )}
            </span>
            {/* Compartir */}
            <button
              onClick={() => {
                const url = `${window.location.origin}/public/servicio/${servicio.codigo}`;
                navigator.clipboard.writeText(url);
                toast.success("Link copiado al portapapeles");
              }}
              className="text-xs font-medium text-white/80 hover:text-white hover:bg-white/20 px-2.5 py-1 rounded-lg border border-white/30 shadow-sm transition flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span className="hidden md:inline">Compartir</span>
            </button>

            {/* Right section: estado */}
            <span className="ml-auto flex items-center gap-2 flex-wrap">
              <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", ESTADO_BAR_STYLE[servicio.estado] || "bg-white/10 text-white")}>
                {estadoLabel(servicio.estado)}
              </span>
            </span>
          </div>

          {/* Card body */}
          <div className="p-5">
            <div className="flex items-start gap-6">
              {/* Left: title + description */}
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-lg text-gray-900" style={{ fontWeight: 700 }}>{servicio.titulo}</h2>
                  {servicio.cliente_nombre && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {servicio.cliente_nombre}
                    </span>
                  )}
                </div>

                {servicio.descripcion && (
                  <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-2.5 leading-relaxed">{servicio.descripcion}</p>
                )}
              </div>

              {/* Right: time indicators section */}
              <div className="shrink-0">
                <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 min-w-[130px]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Transcurrido</p>
                  <p className="text-lg font-bold text-gray-900 tabular-nums leading-tight mt-0.5">
                    {formatETA(tiempo_transcurrido_minutos)}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mt-3">Restante estimado</p>
                  <p className="text-lg font-bold text-gray-900 tabular-nums leading-tight mt-0.5">
                    {progreso.porcentaje === 100 ? "--" : formatETA(etaMinutos)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

            {/* Seguimiento card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2">
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
                    <h3 className="text-base text-gray-900 font-semibold">
                      Seguimiento del servicio
                    </h3>
                    <p className="text-[10px] text-gray-400">
                      {servicio.estado === "completado" ? "Servicio finalizado" : "Estado actual del servicio"}
                    </p>
                  </div>
                </div>
                <CircularProgress value={pctProgreso} size={32} strokeWidth={3} />
              </div>

              {/* Process Flow */}
              <div className="px-5 pb-4">
                <ProcessFlow steps={flowSteps} />
              </div>


            </div>

            {/* Evidencias section — inline styles (Tailwind no compila) */}
            {evidencias.length > 0 && dni && (
              <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ width: '32px', height: '32px', background: '#dbeafe', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Camera size={16} color="#2563eb" />
                  </div>
                  <h3 style={{ color: '#111827', fontWeight: 600, fontSize: '15px' }}>
                    Evidencias del servicio
                  </h3>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {evidencias.map((ev) => {
                    const isExpanded = expandedId === ev.id;
                    const rejectionComment = ev.comentarios?.find((c) => c.contenido.startsWith("Motivo de rechazo:"));
                    const rejectionReason = rejectionComment?.contenido.replace("Motivo de rechazo: ", "");
                    const approvalComment = ev.comentarios?.find((c) => c.contenido.startsWith("Motivo de aprobación:"));
                    const approvalReason = approvalComment?.contenido.replace("Motivo de aprobación: ", "");

                    return (
                      <div key={ev.id} style={{ width: isDesktop ? 'calc(25% - 9px)' : 'calc(50% - 6px)', minWidth: 0, background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {/* Image */}
                        <div
                          style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#f8fafc', cursor: 'pointer' }}
                          onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                        >
                          {ev.tipo === "photo" ? (
                            <img src={ev.archivo_url} alt="Evidencia" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
                          ) : (
                            <video src={ev.archivo_url} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} controls />
                          )}
                          <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {ev.mostrar_cliente && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 500, background: '#e0f2fe', color: '#0369a1' }}>
                                <Eye size={10} /> Cliente
                              </span>
                            )}
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 500, background: ev.tipo === 'photo' ? '#dbeafe' : '#f3e8ff', color: ev.tipo === 'photo' ? '#1d4ed8' : '#7c3aed' }}>
                              {ev.tipo === 'photo' ? 'Foto' : 'Video'}
                            </span>
                          </div>
                        </div>

                        {/* Estado badge */}
                        <div style={{ display: 'flex', gap: '6px', padding: '8px 12px 0', flexWrap: 'wrap' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '3px',
                            padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 500,
                            background: ev.estado === 'aprobado' ? '#dcfce7' : ev.estado === 'rechazado' ? '#fee2e2' : '#fef9c3',
                            color: ev.estado === 'aprobado' ? '#15803d' : ev.estado === 'rechazado' ? '#b91c1c' : '#a16207',
                          }}>
                            {ev.estado === 'aprobado' ? <CheckCircle2 size={10} /> : ev.estado === 'rechazado' ? '✕' : '⏳'}
                            {ev.estado === 'aprobado' ? 'Aprobado' : ev.estado === 'rechazado' ? 'Rechazado' : 'Pendiente'}
                          </span>
                        </div>

                        {/* Tarea name */}
                        {tareasMap.get(ev.tarea_id) && (
                          <div style={{ padding: '6px 12px 0' }}>
                            <p style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                              <span style={{ fontWeight: 500 }}>Tarea:</span> {tareasMap.get(ev.tarea_id)}
                            </p>
                          </div>
                        )}

                        {/* Approval reason */}
                        {ev.estado === 'aprobado' && approvalReason && (
                          <div style={{ padding: '8px 12px 0' }}>
                            <p style={{ fontSize: '12px', color: '#166534', lineHeight: '1.4' }}>
                              <span style={{ fontWeight: 500 }}>✓ Aprobado por encargado:</span> {approvalReason}
                            </p>
                          </div>
                        )}

                        {/* Rejection reason */}
                        {ev.estado === 'rechazado' && rejectionReason && (
                          <div style={{ padding: '8px 12px 0' }}>
                            <p style={{ fontSize: '12px', color: '#991b1b', lineHeight: '1.4' }}>
                              <span style={{ fontWeight: 500 }}>✕</span> {rejectionReason}
                            </p>
                          </div>
                        )}

                        {/* Colaborador comment */}
                        {ev.comentario_colaborador && (
                          <div style={{ padding: '8px 12px 0' }}>
                            <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Comentario del técnico:</p>
                            <p style={{ fontSize: '12px', color: '#334155' }}>{ev.comentario_colaborador}</p>
                          </div>
                        )}

                        {/* Toggle comments button */}
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                            padding: '6px 12px', marginTop: '8px', fontSize: '11px', color: '#94a3b8',
                            border: 'none', borderTop: '1px solid #f1f5f9', background: 'none', cursor: 'pointer',
                          }}
                        >
                          <MessageCircle size={12} />
                          {isExpanded ? 'Ocultar comentarios' : `${ev.comentarios?.length || 0} comentarios`}
                        </button>

                        {/* Expanded: comment thread */}
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px' }}>
                            {(ev.comentarios || []).length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                                {(ev.comentarios || []).map((c: EvidenciaComentario) => (
                                  <div key={c.id} style={{
                                    padding: '8px 10px', borderRadius: '8px', fontSize: '12px',
                                    background: c.es_cliente ? '#fefce8' : '#eff6ff',
                                  }}>
                                    <p style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>
                                      {c.es_cliente ? 'Cliente' : 'Técnico'}
                                      {c.created_at && ` · ${new Date(c.created_at).toLocaleString('es-AR')}`}
                                    </p>
                                    <p style={{ color: '#334155' }}>{c.contenido}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Add comment */}
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <input
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Escribí un comentario..."
                                style={{
                                  flex: 1, padding: '6px 10px', fontSize: '12px', border: '1px solid #e2e8f0',
                                  borderRadius: '8px', outline: 'none', background: '#fff',
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && commentText.trim()) {
                                    evidenciasPublicApi.agregarComentario(ev.id, { contenido: commentText.trim(), codigo: codigo || "", dni: dni || "" })
                                      .then(() => { setCommentText(""); evidenciasQuery.refetch(); });
                                  }
                                }}
                              />
                              <button
                                onClick={() => {
                                  if (commentText.trim()) {
                                    evidenciasPublicApi.agregarComentario(ev.id, { contenido: commentText.trim(), codigo: codigo || "", dni: dni || "" })
                                      .then(() => { setCommentText(""); evidenciasQuery.refetch(); });
                                  }
                                }}
                                disabled={!commentText.trim()}
                                style={{
                                  padding: '6px 10px', background: '#1e3a5f', color: '#fff',
                                  border: 'none', borderRadius: '8px', cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                                  opacity: commentText.trim() ? 1 : 0.5,
                                }}
                              >
                                <Send size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

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

          {/* Col 2: Ofertas y Promociones (1/3) */}
          {ofertasQuery.isLoading ? (
            <div className="md:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse h-full">
                <div className="h-full bg-gray-100" />
              </div>
            </div>
          ) : hayOfertas ? (
            <div className="md:col-span-1">
              <div className="h-full">
                <div className="h-[80%] min-h-0">
                  <OfertasCarousel imagenes={ofertasImagenes} />
                </div>
              </div>
            </div>
          ) : null}
        </div>

      {/* Footer — full-width abajo de todo */}
      <div className="text-center text-xs text-gray-400 py-4">
        ServicioLocalSTS © {new Date().getFullYear()}
      </div>
      </div>

    </div>
  );
}

/** Círculo de progreso con borde que se completa. */
function CircularProgress({ value, size = 28, strokeWidth = 3 }: { value: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(value, 100) / 100);
  const center = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      aria-label={`${value}% completado`}
    >
      {/* anillo de fondo */}
      <circle cx={center} cy={center} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
      {/* anillo de progreso */}
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke={value === 100 ? "#22c55e" : value > 50 ? "#2563eb" : "#6b7280"}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        style={{ transform: "rotate(-90deg)", transformOrigin: `${center}px ${center}px` }}
        className="transition-all duration-500 ease-out"
      />
      {/* texto del porcentaje */}
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        fontSize={size * 0.3}
        className="font-semibold text-gray-600"
      >
        {value}%
      </text>
    </svg>
  );
}
