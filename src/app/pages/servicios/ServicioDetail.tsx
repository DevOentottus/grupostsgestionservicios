import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  useServicio, useTareas,
  useCrearTarea, useCompletarTarea, useReabrirTarea, useEliminarTarea,
  useCambiarEstado, useEditarTareaInline, useReordenarTareas,
  useEditarServicio, useArchivarServicio,
} from "@/api/queries/useServicios.js";

import { useCrearPlantilla } from "@/api/queries/usePlantillas.js";
import {
  useTiemposServicio, useIniciarTiempo, useFinalizarTiempo,
} from "@/api/queries/useSeguimiento.js";
import { CommentsTab } from "./components/CommentsTab.js";
import { ProcessFlow } from "@/app/components/flow/ProcessFlow.js";
import { useEvidencias } from "@/api/queries/useEvidencias.js";
import { EvidenceUploader } from "@/app/components/evidencias/EvidenceUploader.js";
import { EvidenceViewer } from "@/app/components/evidencias/EvidenceViewer.js";
import { ConfirmDialog } from "@/app/components/ConfirmDialog.js";
import { AudioRecorder } from "@/app/components/AudioRecorder.js";
import { useAuth } from "@/lib/auth.js";
import { toast } from "sonner";
import { cn, formatMinutos } from "@/app/lib/utils";
import QRCode from "qrcode";
import {
  Archive, ArrowLeft, BarChart3, CheckCircle2, Clock, MessageSquare,
  Send, AlertTriangle, Plus, X,
  Pencil, MessageCircle, Mic, Info,
  Save, Camera, Share2, Play, Lock, LockOpen, RotateCcw, ChevronUp, ChevronDown, FileText,
} from "lucide-react";
import type { Tarea } from "@shared/index.js";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/app/components/ui/dialog.js";
import { InfoPopover } from "@/app/components/ui/info-popover.js";

// -- Public URL (configurable via env) --
const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || "https://grupostsgestionservicios.vercel.app";

function descargarReportePDF(servicioId: number) {
  const token = sessionStorage.getItem("auth_token");
  if (!token) return;
  window.open(`/api/servicios/${servicioId}/reporte-tecnico?token=${encodeURIComponent(token)}`, "_blank");
}

function compartirWhatsApp(codigo: string, titulo: string) {
  const serviceUrl = `${PUBLIC_URL}/public/servicio/${codigo}`;
  const mensaje = [
    `Hola! Podés ver el estado de tu servicio *${codigo}* - *${titulo}* acá:`,
    "",
    serviceUrl,
    "",
    "Solo necesitás ingresar tu DNI para validar tu identidad.",
  ].join("\n");
  const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// -- Tab Definitions --
const TABS = [
  { id: "tareas", label: "Tareas", icon: CheckCircle2 },
  { id: "metricas", label: "Métricas", icon: BarChart3 },
  { id: "comentarios", label: "Comentarios", icon: MessageSquare },
  { id: "evidencias", label: "Evidencias", icon: Camera },
] as const;
type TabId = (typeof TABS)[number]["id"];


/** Combinar fecha + hora del backend a locale legible */
function formatDateTime(fecha: string, hora?: string | null): string {
  try {
    const d = new Date(`${fecha}T${hora || "00:00:00"}`);
    return d.toLocaleString("es-PE", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
    });
  } catch {
    return fecha;
  }
}

// -- Task type badges --
const TIPO_TAREA_CONFIG: Record<string, { label: string; class: string }> = {
  tecnico: { label: "Técnico", class: "bg-blue-100 text-blue-700" },
  administrativo: { label: "Administrativo", class: "bg-purple-100 text-purple-700" },
  cliente: { label: "Cliente", class: "bg-green-100 text-green-700" },
};

function formatDuration(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${Math.floor(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Convierte clave de estado a label legible */
const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  en_progreso: "En Progreso",
  completado: "Completado",
  bloqueado: "Bloqueado",
  cancelado: "Cancelado",
};

const ESTADO_ESTILO: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  en_progreso: "bg-blue-100 text-blue-800",
  completado: "bg-green-100 text-green-800",
  bloqueado: "bg-red-100 text-red-800",
  cancelado: "bg-gray-100 text-gray-600",
};

const HEADER_BG: Record<string, string> = {
  pendiente: "bg-amber-50/40",
  en_progreso: "bg-blue-50/40",
  completado: "bg-green-50/40",
  bloqueado: "bg-red-50/40",
  cancelado: "bg-gray-50/40",
};

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

// -- Evidencias Tab Component --
function EvidenciasTabContent({ servicioId, tareas, userRol, userId, tecnicoId, colaboradorPuedeEditar, onToggleVisibilidad }: { servicioId: number; tareas: Tarea[]; userRol?: string; userId?: number; tecnicoId?: number; colaboradorPuedeEditar?: boolean; onToggleVisibilidad?: () => void }) {
  const { data: evidencias, isLoading } = useEvidencias(servicioId);
  const [tareaSeleccionada, setTareaSeleccionada] = useState<number | null>(null);
  const toggleVisibilidad = useEditarServicio();

  const tareaNombres = useMemo(() => {
    const map: Record<number, string> = {};
    for (const t of tareas) {
      map[t.id] = t.titulo;
    }
    return map;
  }, [tareas]);

  return (
    <div className="space-y-4">
      {/* Subir evidencia */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Subir evidencia</h4>
        <div className="mb-3">
          <label className="block text-xs text-slate-500 mb-1">Seleccionar tarea</label>
          <select
            value={tareaSeleccionada ?? ""}
            onChange={(e) => setTareaSeleccionada(e.target.value ? Number(e.target.value) : null)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-slate-50"
          >
            <option value="">Seleccioná una tarea...</option>
            {tareas
              .sort((a, b) => a.orden - b.orden)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.titulo} {t.completada ? "✅" : "⬜"}
                </option>
              ))}
          </select>
        </div>
        {tareaSeleccionada && (
          <EvidenceUploader
            servicioId={servicioId}
            tareaId={tareaSeleccionada}
          />
        )}
      </div>

      {/* Lista de evidencias */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        {/* Encargado: toggle para permitir que colaborador edite visibilidad */}
        {userRol === "encargado" && (
          <label className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 cursor-pointer select-none hover:bg-slate-50 -mx-4 px-4 transition">
            <input
              type="checkbox"
              checked={colaboradorPuedeEditar ?? false}
              onChange={() => {
                toggleVisibilidad.mutate(
                  { id: servicioId, data: { colaborador_edita_visibilidad: !colaboradorPuedeEditar } },
                  { onSuccess: () => onToggleVisibilidad?.() }
                );
              }}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-600 font-medium">
              Permitir a los técnicos modificar visualización de evidencias del cliente
            </span>
          </label>
        )}
        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Camera className="w-4 h-4 text-slate-400" />
          Evidencias subidas
          <InfoPopover
            variant="info"
            formula="Cada tarea puede tener una o más evidencias adjuntas (fotos, archivos, grabaciones de audio)."
            descripcion="Las evidencias documentan el trabajo realizado y son necesarias para completar tareas que lo requieran."
            tip="Las evidencias se organizan por tarea. Subí fotos del antes/después para mejor documentación."
          />
          {evidencias && (
            <span className="text-xs font-normal text-slate-400">({evidencias.length})</span>
          )}
        </h4>
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl" />
            ))}
          </div>
        ) : (
          <EvidenceViewer
            evidencias={evidencias || []}
            showStatus
            tareaNombres={tareaNombres}
            userRol={userRol}
            userId={userId}
            tecnicoId={tecnicoId}
            colaboradorPuedeEditar={colaboradorPuedeEditar}
          />
        )}
      </div>
    </div>
  );
}

// -- MetricasTab: indicadores de desempeño del servicio --
function MetricasTabContent({ tareas, servicio }: { tareas: Tarea[]; servicio: any }) {
  const tareasSorted = [...tareas].sort((a, b) => a.orden - b.orden);
  const completadas = tareasSorted.filter((t) => t.completada);
  const conTracking = tareasSorted.filter((t) => t.tiempo_real_minutos != null);
  const conEstimado = completadas.filter((t) => t.tiempo_estimado != null && t.tiempo_real_minutos != null);
  const totalTiempo = conTracking.reduce((s, t) => s + (t.tiempo_real_minutos ?? 0), 0);
  const promTiempo = completadas.length > 0 ? Math.round(totalTiempo / completadas.length) : 0;
  const eficienciaPct = conEstimado.length > 0
    ? Math.round(conEstimado.reduce((s, t) => s + ((t.tiempo_estimado! - t.tiempo_real_minutos!) / t.tiempo_estimado!) * 100, 0) / conEstimado.length)
    : null;

  // Agrupar tiempo por completador
  const porColaborador: Record<number, { nombre: string; tiempo: number; tareas: number }> = {};
  for (const t of completadas) {
    if (t.completada_por && t.tiempo_real_minutos) {
      if (!porColaborador[t.completada_por]) {
        porColaborador[t.completada_por] = { nombre: `#${t.completada_por}`, tiempo: 0, tareas: 0 };
      }
      porColaborador[t.completada_por].tiempo += t.tiempo_real_minutos;
      porColaborador[t.completada_por].tareas++;
    }
  }

  // Tiempo de vida del servicio
  const vidaTexto = servicio?.created_at ? (() => {
    try {
      const inicio = new Date(`${servicio.created_at}T${servicio.hora_creacion || "00:00:00"}`);
      const fin = servicio.fecha_fin ? new Date(`${servicio.fecha_fin}T${servicio.hora_fin || "00:00:00"}`) : new Date();
      const diff = fin.getTime() - inicio.getTime();
      if (diff < 0) return "—";
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      const days = Math.floor(hrs / 24);
      const parts: string[] = [];
      if (days > 0) parts.push(`${days}d`);
      if (hrs % 24 > 0) parts.push(`${hrs % 24}h`);
      if (mins % 60 > 0) parts.push(`${mins % 60}m`);
      return parts.length > 0 ? parts.join(" ") : "< 1m";
    } catch { return "—"; }
  })() : "—";

  const metricas = [
    { label: "Tareas completadas", valor: `${completadas.length} / ${tareasSorted.length}`, unidad: "", color: "text-green-600" },
    { label: "Progreso", valor: `${tareasSorted.length > 0 ? Math.round((completadas.length / tareasSorted.length) * 100) : 0}%`, unidad: "", color: "text-blue-600" },
    { label: "Tiempo total (tracking)", valor: formatMinutos(totalTiempo), unidad: "", color: "text-purple-600" },
    { label: "Promedio por tarea", valor: completadas.length > 0 ? formatMinutos(promTiempo) : "—", unidad: "", color: "text-orange-600" },
    { label: "Eficiencia vs estimado", valor: eficienciaPct != null ? `${eficienciaPct >= 0 ? "+" : ""}${eficienciaPct}%` : "—", unidad: "", color: eficienciaPct != null && eficienciaPct >= 0 ? "text-emerald-600" : "text-red-600" },
    { label: "Cobertura tracking", valor: tareasSorted.length > 0 ? `${Math.round((conTracking.length / tareasSorted.length) * 100)}%` : "—", unidad: "", color: "text-cyan-600" },
    { label: "Ciclo de vida", valor: vidaTexto, unidad: "", color: "text-slate-600" },
  ];

  return (
    <div className="space-y-5">
      {/* Cuadrícula de métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {metricas.map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-slate-200/70 p-4">
            <p className={`text-lg font-bold ${m.color} tabular-nums`}>
              {m.valor}
              {m.unidad && <span className="text-xs font-normal text-slate-400 ml-1">{m.unidad}</span>}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Tiempo por colaborador */}
      {Object.keys(porColaborador).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/70 p-4">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Tiempo por colaborador</h4>
          <div className="space-y-2">
            {Object.entries(porColaborador).map(([userId, data]) => (
              <div key={userId} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{data.nombre}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{data.tareas} tareas</span>
                  <span className="font-medium text-slate-800 tabular-nums">{formatMinutos(data.tiempo)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* InfoPopovers de ayuda */}
      <div className="flex flex-wrap gap-2">
        <InfoPopover
          variant="formula"
          formula="Eficiencia = (tiempo_estimado − tiempo_real) / tiempo_estimado × 100. Positivo = completado antes del estimado."
          descripcion="Mide si las tareas se completaron dentro del tiempo estimado. Un valor positivo indica ahorro de tiempo."
          tip="Valores negativos consistentes sugieren que los tiempos estimados deben ajustarse a la realidad."
        />
        <InfoPopover
          variant="tip"
          formula="Cobertura de tracking = tareas con tiempo_real registrado / total tareas × 100."
          descripcion="Indica qué porcentaje de tareas tienen registro de tiempo. Idealmente debería ser 100%."
          tip="Sin tracking de tiempo, las métricas de eficiencia no son representativas. Activá el tracking en cada tarea."
        />
      </div>
    </div>
  );
}

export function ServicioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const servicioId = parseInt(id!);

  const { data: servicio, isLoading: svcLoading } = useServicio(servicioId);
  const { data: tareas, isLoading: tareasLoading } = useTareas(servicioId);

  const esAdmin = user?.rol === "admin" || user?.rol === "sistema";
  const esAsignado = user?.id === servicio?.colaborador_id;
  const esEncargado = user?.rol === "encargado";
  const puedeModificar = esAdmin || esAsignado || esEncargado;
  const soloAsignado = esAdmin || esAsignado;
  const puedeEjecutar = esAsignado; // solo el técnico asignado completa tareas y usa cronómetro

  const editarServicio = useEditarServicio();
  const [editando, setEditando] = useState<"titulo" | "descripcion" | null>(null);
  const [editValor, setEditValor] = useState("");

  const activeTab = (searchParams.get("tab") as TabId) || "tareas";
  const setActiveTab = (tab: TabId) => {
    setSearchParams(tab === "tareas" ? {} : { tab });
  };

  const crearTarea = useCrearTarea();
  const completarTarea = useCompletarTarea();
  const reabrirTarea = useReabrirTarea();
  const eliminarTarea = useEliminarTarea();
  const cambiarEstado = useCambiarEstado();
  const archivarServicio = useArchivarServicio();
  const editarTareaInline = useEditarTareaInline();
  const crearPlantilla = useCrearPlantilla();
  const reordenarTareas = useReordenarTareas();

  // -- Cronómetro por tarea (RF-31) --
  const { data: tiemposServicio } = useTiemposServicio(servicioId);
  const iniciarTiempo = useIniciarTiempo();
  const finalizarTiempo = useFinalizarTiempo();

  const [nuevaTarea, setNuevaTarea] = useState("");
  const [editTareaId, setEditTareaId] = useState<number | null>(null);
  const [editTareaTitle, setEditTareaTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Tarea | null>(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showCompartir, setShowCompartir] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [bloqueoDialogOpen, setBloqueoDialogOpen] = useState(false);
  const [bloqueoMotivo, setBloqueoMotivo] = useState("");
  const [desbloqueoDialogOpen, setDesbloqueoDialogOpen] = useState(false);
  const [desbloqueoMotivo, setDesbloqueoMotivo] = useState("");

  // Generar QR cuando se abre el modal
  useEffect(() => {
    if (qrModalOpen && servicio) {
      const url = `${PUBLIC_URL}/public/servicio/${servicio.codigo}`;
      QRCode.toDataURL(url, { width: 280, margin: 2 })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(""));
    }
  }, [qrModalOpen, servicio]);

  const tareasSorted = [...(tareas || [])].sort((a: Tarea, b: Tarea) => a.orden - b.orden);
  const completadasCount = tareasSorted.filter((t) => t.completada).length;
  const totalTareas = tareasSorted.length;
  const progresoPct = totalTareas > 0 ? Math.round((completadasCount / totalTareas) * 100) : 0;
  const totalTiempoRealMin = tareasSorted.reduce((sum, t) => sum + (t.tiempo_real_minutos ?? 0), 0);
  const isPendiente = servicio?.estado === "pendiente";
  const isBloqueado = servicio?.estado === "bloqueado";
  const isCancelado = servicio?.estado === "cancelado";
  const isEnProgreso = servicio?.estado === "en_progreso";
  const isCompletado = servicio?.estado === "completado";
  const puedeEditarMetadata = puedeModificar && !isCompletado;
  const handleAddTarea = async () => {
    if (!nuevaTarea.trim()) return;
    await crearTarea.mutateAsync({
      servicioId,
      data: {
        titulo: nuevaTarea,
        // tipo is not in the current API, but we keep the state for future use
      },
    });
    setNuevaTarea("");
  };

  const irAEnProgreso = () => cambiarEstado.mutate({ id: servicioId, estado: "en_progreso" });

  const handleStartTitleEdit = (tarea: Tarea) => {
    setEditTareaId(tarea.id);
    setEditTareaTitle(tarea.titulo);
  };

  const handleSaveTitleEdit = async () => {
    if (editTareaId === null || !editTareaTitle.trim()) return;
    await editarTareaInline.mutateAsync({
      servicioId,
      tareaId: editTareaId,
      data: { titulo: editTareaTitle.trim() },
    });
    setEditTareaId(null);
  };

  const handleCancelTitleEdit = () => {
    setEditTareaId(null);
  };

  const handleDeleteClick = (tarea: Tarea) => setDeleteTarget(tarea);

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim() || !tareas) return;
    await crearPlantilla.mutateAsync({
      nombre: templateName.trim(),
      area_id: servicio?.area_id ?? null,
      tareas: tareas.map((t: Tarea, i: number) => ({
        titulo: t.titulo,
        sort_order: t.orden ?? i,
      })),
    });
    setShowSaveTemplate(false);
    setTemplateName("");
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) { eliminarTarea.mutate(deleteTarget.id); setDeleteTarget(null); }
  };

  // Mapa tarea_id → tracking info desde /tiempos endpoint
  const trackingPorTarea = useMemo(() => {
    const map: Record<number, {
      tracking_activo: boolean;
      tracking_id: number | null;
      tracking_inicio: string | null;
      tracking_pausa: string | null;
    }> = {};
    if (tiemposServicio) {
      for (const t of tiemposServicio) {
        map[t.tarea_id] = t;
      }
    }
    return map;
  }, [tiemposServicio]);

  // Estado local para elapsed time en tiempo real
  const [elapsedMap, setElapsedMap] = useState<Record<number, number>>({});
  useEffect(() => {
    const interval = setInterval(() => {
      if (!tiemposServicio) return;
      const next: Record<number, number> = {};
      let changed = false;
      for (const t of tiemposServicio) {
        if (t.tracking_activo && t.tracking_inicio) {
          const diff = Math.floor((Date.now() - new Date(t.tracking_inicio).getTime()) / 1000);
          next[t.tarea_id] = diff;
          changed = true;
        }
      }
      if (changed) setElapsedMap(next);
    }, 1000);
    return () => clearInterval(interval);
  }, [tiemposServicio]);

  // Cronómetro en vivo del servicio (desde fecha_inicio)
  const [servicioElapsed, setServicioElapsed] = useState(0);
  useEffect(() => {
    if (!isEnProgreso || !servicio?.fecha_inicio) {
      setServicioElapsed(0);
      return;
    }
    const inicio = new Date(servicio.fecha_inicio).getTime();
    const interval = setInterval(() => {
      setServicioElapsed(Math.max(0, Math.floor((Date.now() - inicio) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [isEnProgreso, servicio?.fecha_inicio]);

  const flowSteps = tareasSorted.map((tarea) => ({
    id: tarea.id,
    titulo: tarea.titulo,
    completada: tarea.completada,
    orden: tarea.orden,
    completada_at: tarea.completada_at,
    tiempo_estimado: tarea.tiempo_estimado,
    tiempo_real_minutos: tarea.tiempo_real_minutos ?? null,
    asignado_a_nombre: null,
  }));

  // Loading state
  if (svcLoading) {
    return (
      <div className="max-w-4xl space-y-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24" />
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="h-4 bg-gray-200 rounded w-64" />
        <div className="h-8 bg-gray-200 rounded w-full" />
        <div className="h-32 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  if (!servicio) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 font-medium">Servicio no encontrado</p>
        <button onClick={() => navigate("/servicios")} className="text-sm text-blue-600 hover:underline mt-2">
          ← Volver a Servicios
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Back button */}
      <button onClick={() => navigate("/servicios")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition">
        <ArrowLeft className="w-4 h-4" />
        Volver a Servicios
      </button>

          {/* Bloqueado Banner */}
          {isBloqueado && servicio.bloqueado_motivo && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Servicio Bloqueado</p>
                <p className="text-sm text-red-600 mt-0.5">{servicio.bloqueado_motivo}</p>
              </div>
              <button
                onClick={() => { setDesbloqueoMotivo(""); setDesbloqueoDialogOpen(true); }}
                disabled={!puedeModificar}
                title={!puedeModificar ? "Solo el técnico asignado puede modificar" : "Reabrir servicio"}
                className={cn(
                  "text-sm px-3 py-1.5 rounded-xl transition-colors flex-shrink-0 flex items-center gap-1.5",
                  puedeModificar
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-gray-100 text-gray-300 cursor-not-allowed",
                )}
              >
                {!puedeModificar && <Lock className="w-3.5 h-3.5" />}
                Reabrir
          </button>
        </div>
      )}

      {/* Header Card */}
      <div className="rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Blue header bar — código, botones, tiempo */}
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
          {/* Botón Compartir */}
          <div className="relative">
            <button
              onClick={() => setShowCompartir(!showCompartir)}
              className="text-xs font-medium text-white/80 hover:text-white hover:bg-white/20 px-2.5 py-1 rounded-lg border border-white/30 shadow-sm transition flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Compartir</span>
            </button>
            {showCompartir && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCompartir(false)} />
                <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 min-w-[220px]">
                  <button
                    onClick={() => {
                      setShowCompartir(false);
                      setQrModalOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-800 hover:bg-blue-100 hover:text-blue-800 transition font-medium rounded-none"
                  >
                    <span className="w-7 h-7 flex items-center justify-center bg-blue-100 rounded-lg text-blue-700 flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </span>
                    <div className="flex items-baseline gap-1.5 min-w-0">
                      <span className="font-medium whitespace-nowrap">Código QR</span>
                      <span className="text-xs text-gray-400 truncate">· Escaneá para ver el estado</span>
                    </div>
                  </button>
                  <div className="border-t border-gray-100 mx-3" />
                  <button
                    onClick={() => {
                      setShowCompartir(false);
                      compartirWhatsApp(servicio.codigo, servicio.titulo);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-800 hover:bg-green-100 hover:text-green-800 transition font-medium rounded-none"
                  >
                    <span className="w-7 h-7 flex items-center justify-center bg-green-100 rounded-lg text-green-700 flex-shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </span>
                    <div className="flex items-baseline gap-1.5 min-w-0">
                      <span className="font-medium whitespace-nowrap">WhatsApp</span>
                      <span className="text-xs text-gray-400 truncate">· Link precargado para el cliente</span>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
          {/* Botón Reporte Técnico PDF */}
          <button
            onClick={() => servicio && descargarReportePDF(servicio.id)}
            className="text-xs font-medium text-white/80 hover:text-white hover:bg-white/20 px-2.5 py-1 rounded-lg border border-white/30 shadow-sm transition flex items-center gap-1.5"
            title="Descargar reporte técnico en PDF"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden md:inline">PDF</span>
          </button>
          {/* Botón Archivar */}
          <button
            onClick={() => archivarServicio.mutate(servicioId)}
            className="text-xs font-medium text-white/80 hover:text-white hover:bg-white/20 px-2.5 py-1 rounded-lg border border-white/30 shadow-sm transition flex items-center gap-1.5"
            title="Archivar servicio (ocultar de la lista principal)"
          >
            <Archive className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Archivar</span>
          </button>
          {/* Gestion action buttons: solo admin o asignado — siempre visibles, deshabilitados con candado */}
          {(({ bloqueado, cancelado }: { bloqueado: boolean; cancelado: boolean }) => {
            const btnBase = "text-xs font-medium px-2.5 py-1 rounded-lg border shadow-sm transition flex items-center gap-1.5";
            const btnEnabled = btnBase + " border-white/30 text-white/80 hover:text-white hover:bg-white/20";
            const btnDisabled = btnBase + " border-white/10 text-white/30 cursor-not-allowed";
            if (bloqueado) return (
              <button onClick={() => { setDesbloqueoMotivo(""); setDesbloqueoDialogOpen(true); }} disabled={!puedeModificar} title={!puedeModificar ? "Solo el técnico asignado puede modificar" : "Desbloquear"} className={cn(puedeModificar ? btnEnabled : btnDisabled)}>
                <LockOpen className={cn("w-3.5 h-3.5", !puedeModificar && "text-white/30")} />
              </button>
            );
            if (cancelado) return (
              <button onClick={() => cambiarEstado.mutate({ id: servicioId, estado: "pendiente" })} disabled={!puedeModificar} title={!puedeModificar ? "Solo el técnico asignado puede modificar" : "Reactivar"} className={cn(puedeModificar ? btnEnabled : btnDisabled)}>
                <RotateCcw className={cn("w-3.5 h-3.5", !puedeModificar && "text-white/30")} />
              </button>
            );
            return (
              <>
                <button onClick={() => { setBloqueoMotivo(""); setBloqueoDialogOpen(true); }} disabled={!soloAsignado} title={!soloAsignado ? "Solo el técnico asignado puede bloquear" : "Bloquear"} className={cn(soloAsignado ? btnEnabled : btnDisabled)}>
                  <Lock className={cn("w-3.5 h-3.5 shrink-0", !soloAsignado && "text-white/30")} />
                  <span className="hidden md:inline">Bloquear</span>
                </button>
                <button onClick={() => cambiarEstado.mutate({ id: servicioId, estado: "cancelado" })} disabled={!soloAsignado} title={!soloAsignado ? "Solo el técnico asignado puede cancelar" : "Cancelar"} className={cn(soloAsignado ? btnEnabled : btnDisabled)}>
                  <X className={cn("w-3.5 h-3.5 shrink-0", !soloAsignado && "text-white/30")} />
                  <span className="hidden md:inline">Cancelar</span>
                </button>
              </>
            );
          })({ bloqueado: servicio.estado === "bloqueado", cancelado: servicio.estado === "cancelado" })}
          {/* FR: fecha de registro · FC: fecha de completado · Tiempo transcurrido */}
          {servicio.created_at && (
            <span className="text-xs text-white/70 flex items-center gap-1" title={`Registrado: ${servicio.created_at} ${servicio.hora_creacion || ""}${servicio.fecha_fin ? ` · Completado: ${servicio.fecha_fin} ${servicio.hora_fin || ""}` : ""}`}>
              <Clock className="w-3 h-3 shrink-0" />
              <span className="hidden md:inline font-medium text-white/90">Fecha de registro:</span>
              <span className="text-white/80 truncate max-w-[85px] md:max-w-none">{formatDateTime(servicio.created_at, servicio.hora_creacion)}</span>
              {servicio.fecha_fin && (
                <>
                  <span className="text-white/40 mx-0.5">·</span>
                  <span className="hidden md:inline font-medium text-white/90">Fecha de completado:</span>
                  <span className="hidden md:inline text-white/80">{formatDateTime(servicio.fecha_fin, servicio.hora_fin)}</span>
                </>
              )}
              <span className="text-white/40 mx-0.5">·</span>
              <span className="hidden md:inline font-medium text-white/90">Tiempo:</span>
              <span className="font-mono text-white/80">
                {(() => {
                  const inicio = new Date(`${servicio.created_at}T${servicio.hora_creacion || "00:00:00"}`);
                  const fin = servicio.fecha_fin ? new Date(`${servicio.fecha_fin}T${servicio.hora_fin || "00:00:00"}`) : new Date();
                  const diff = fin.getTime() - inicio.getTime();
                  if (diff < 0) return "—";
                  const segs = Math.floor(diff / 1000);
                  const mins = Math.floor(segs / 60);
                  const hrs = Math.floor(mins / 60);
                  const days = Math.floor(hrs / 24);
                  const parts: string[] = [];
                  if (days > 0) parts.push(`${days}d`);
                  if (hrs % 24 > 0) parts.push(`${hrs % 24}h`);
                  if (mins % 60 > 0) parts.push(`${mins % 60}m`);
                  return parts.length > 0 ? parts.join(" ") : "< 1m";
                })()}
              </span>
            </span>
          )}
          {/* Right section: estado badge */}
          <span className="ml-auto flex items-center gap-2 flex-wrap">
            <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", ESTADO_BAR_STYLE[servicio.estado] || "bg-white/10 text-white")}>
              {ESTADO_LABEL[servicio.estado] || servicio.estado}
            </span>
            {isBloqueado && servicio.bloqueado_motivo && (
              <span className="group relative">
                <Info className="w-4 h-4 text-red-300 cursor-help" />
                <div className="absolute right-0 top-6 z-50 bg-gray-900 text-white text-xs rounded-xl px-3 py-2 shadow-lg w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
                  <p className="font-medium mb-1">Motivo de bloqueo:</p>
                  <p className="text-gray-300 mb-2">{servicio.bloqueado_motivo}</p>
                  {servicio.desbloqueo_motivo && (
                    <>
                      <p className="font-medium mb-1 border-t border-gray-700 pt-2">Último desbloqueo:</p>
                      <p className="text-gray-300">{servicio.desbloqueo_motivo}</p>
                    </>
                  )}
                </div>
              </span>
            )}
          </span>
        </div>

        {/* Card body */}
        <div className={cn("p-4 md:p-6 transition-colors", HEADER_BG[servicio.estado] || "bg-white")}>
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1">
            Información del Servicio
            <InfoPopover
              variant="info"
              formula="Datos principales del servicio: código, título, estado, prioridad y fechas."
              descripcion="El estado del servicio determina las acciones disponibles (editar, asignar, completar)."
              tip="Los servicios en estado 'bloqueado' necesitan revisión antes de continuar. Usá los comentarios para documentar el motivo."
            />
          </h3>
          <div className="flex justify-between gap-6">
            {/* Left: title + description */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                {editando === "titulo" ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      className="flex-1 text-xl border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ fontWeight: 700 }}
                      value={editValor}
                      onChange={(e) => setEditValor(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          editarServicio.mutateAsync({ id: servicioId, data: { titulo: editValor } });
                          setEditando(null);
                        }
                        if (e.key === "Escape") setEditando(null);
                      }}
                    />
                    <button
                      onClick={() => {
                        editarServicio.mutateAsync({ id: servicioId, data: { titulo: editValor } });
                        setEditando(null);
                      }}
                      className="text-green-600 hover:text-green-700 p-1"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditando(null)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl text-gray-900" style={{ fontWeight: 700 }}>{servicio.titulo}</h2>
                    {puedeModificar && (
                      <button
                        onClick={() => { setEditValor(servicio.titulo); setEditando("titulo"); }}
                        className="text-gray-300 hover:text-blue-500 transition-colors"
                        title="Editar título"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
                {(servicio.cliente_nombre || servicio.cliente_dni) && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {servicio.cliente_nombre || (servicio.cliente_dni ? `${servicio.cliente_dni.slice(0, 3)}*****` : "")}
                  </span>
                )}
              </div>

              {editando === "descripcion" ? (
                <div className="mt-2">
                  <textarea
                    className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[80px]"
                    value={editValor}
                    onChange={(e) => setEditValor(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditando(null);
                    }}
                  />
                  <div className="flex items-center gap-3 mt-1.5">
                    <button
                      onClick={() => {
                        editarServicio.mutateAsync({ id: servicioId, data: { descripcion: editValor } });
                        setEditando(null);
                      }}
                      className="text-xs font-medium text-green-600 hover:text-green-700 flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" /> Guardar
                    </button>
                    <button
                      onClick={() => setEditando(null)}
                      className="text-xs font-medium text-gray-400 hover:text-gray-600 flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Cancelar
                    </button>
                  </div>
                </div>
              ) : servicio.descripcion ? (
                <div className="flex items-start gap-2 mt-2">
                  <p className="text-sm text-gray-600 flex-1">{servicio.descripcion}</p>
                  {puedeEditarMetadata && (
                    <button
                      onClick={() => { setEditValor(servicio.descripcion || ""); setEditando("descripcion"); }}
                      className="text-gray-300 hover:text-blue-500 transition-colors shrink-0 mt-0.5"
                      title="Editar descripción"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : puedeEditarMetadata ? (
                <button
                  onClick={() => { setEditValor(""); setEditando("descripcion"); }}
                  className="mt-2 text-sm text-gray-400 hover:text-blue-500 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar descripción
                </button>
              ) : null}
            </div>

            {/* Right: time indicators */}
            <div className="shrink-0 text-right hidden sm:block">
              <div className="bg-white/60 backdrop-blur rounded-xl border border-gray-200/60 px-4 py-3 min-w-[130px]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Tiempo del servicio</p>
                <p className="text-lg font-bold text-gray-900 tabular-nums leading-tight mt-0.5">
                  {isEnProgreso && servicioElapsed > 0 ? (
                    <span className="text-blue-700">
                      {Math.floor(servicioElapsed / 3600)}:{String(Math.floor((servicioElapsed % 3600) / 60)).padStart(2, "0")}:{String(servicioElapsed % 60).padStart(2, "0")}
                    </span>
                  ) : totalTiempoRealMin > 0 ? (
                    formatMinutos(totalTiempoRealMin)
                  ) : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Situación Inicial del Cliente y Diagnóstico */}
          {(servicio.cliente_reporte || servicio.diagnostico_inicial || servicio.servicio_audio_cliente || servicio.servicio_audio_diagnostico) && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(servicio.cliente_reporte || servicio.servicio_audio_cliente) && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5" />
                    Situación Inicial del Cliente
                    <InfoPopover
                      variant="info"
                      formula="Datos del cliente asociado a este servicio."
                      descripcion="El cliente puede evaluar el servicio al finalizar. Su calificación impacta en los indicadores de satisfacción."
                      tip="Mantené los datos de contacto actualizados para facilitar la comunicación con el cliente."
                    />
                  </h4>
                  {servicio.cliente_reporte && (
                    <p className="text-sm text-gray-700 bg-slate-50 rounded-xl p-3 border border-slate-100">{servicio.cliente_reporte}</p>
                  )}
                  {servicio.servicio_audio_cliente && (
                    <audio src={servicio.servicio_audio_cliente} controls className="w-full h-10 mt-2" preload="metadata" />
                  )}
                </div>
              )}
              {(servicio.diagnostico_inicial || servicio.servicio_audio_diagnostico) && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5" />
                    Diagnóstico Inicial
                  </h4>
                  {servicio.diagnostico_inicial && (
                    <p className="text-sm text-gray-700 bg-slate-50 rounded-xl p-3 border border-slate-100">{servicio.diagnostico_inicial}</p>
                  )}
                  {servicio.servicio_audio_diagnostico && (
                    <audio src={servicio.servicio_audio_diagnostico} controls className="w-full h-10 mt-2" preload="metadata" />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Progress Bar - color from HEADER_BAR_COLOR (matches top border) */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-600 font-medium">Progreso</span>
              <span className="font-semibold text-gray-800">{progresoPct}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className={cn(
                  "h-3 rounded-full transition-all duration-700",
                  HEADER_BAR_COLOR[servicio.estado],
                )}
                style={{ width: `${progresoPct}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {completadasCount} de {totalTareas} tareas completadas
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-4">
            {isPendiente && completadasCount === 0 && (
              <button
                onClick={irAEnProgreso}
                disabled={cambiarEstado.isPending || !puedeModificar}
                title={!puedeModificar ? "Solo el técnico asignado puede modificar" : undefined}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5",
                  puedeModificar
                    ? "bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                    : "bg-gray-100 text-gray-300 cursor-not-allowed",
                )}
              >
                {!puedeModificar ? <Lock className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                Iniciar Servicio
              </button>
            )}
            {isEnProgreso && (
              <span className="inline-flex items-center gap-1.5 text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-xl">
                <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                En Progreso
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs - responsive scroll en mobile */}
      <div className="overflow-x-auto -mx-4 md:mx-0">
        <nav className="flex gap-0 border-b border-gray-200 px-4 md:px-0 min-w-max md:min-w-0 -mb-px">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.id === "tareas" && totalTareas > 0 && (
                  <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                    {completadasCount}/{totalTareas}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {/* TAREAS TAB */}
        {activeTab === "tareas" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header: título + botón guardar plantilla */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-gray-400" />
                Tareas
                <InfoPopover
                  variant="formula"
                  formula="Cada servicio tiene una o más tareas. Las tareas pueden tener tiempo estimado y evidencias adjuntas."
                  descripcion="Completar todas las tareas es necesario para finalizar el servicio."
                  tip="Las tareas obligatorias deben completarse sí o sí. Las opcionales pueden saltarse si no aplican."
                />
                {totalTareas > 0 && (
                  <span className="text-xs font-normal text-gray-400">
                    {completadasCount}/{totalTareas}
                  </span>
                )}
              </h3>
              {totalTareas > 0 && (
                <button
                  onClick={() => setShowSaveTemplate(true)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-700 hover:bg-blue-100 transition"
                  title="Guardar tareas como plantilla"
                >
                  <Save className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Add task input — siempre visible, deshabilitado con candado si no tiene permiso */}
            <div className="px-5 pb-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    value={nuevaTarea}
                    onChange={(e) => setNuevaTarea(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTarea()}
                    placeholder={puedeModificar ? "Nueva tarea..." : "Sin permiso para agregar tareas"}
                    disabled={!puedeModificar}
                    className={cn(
                      "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none transition",
                      puedeModificar
                        ? "bg-gray-50 focus:border-blue-500"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed",
                    )}
                  />
                  {!puedeModificar && (
                    <Lock className="w-3.5 h-3.5 text-gray-300 absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                <button
                  onClick={handleAddTarea}
                  disabled={crearTarea.isPending || !nuevaTarea.trim() || !puedeModificar}
                  title={!puedeModificar ? "Solo el técnico asignado puede modificar" : undefined}
                  className={cn(
                    "px-3 py-2 rounded-xl text-sm transition-colors flex items-center gap-1",
                    puedeModificar
                      ? "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      : "bg-gray-100 text-gray-300 cursor-not-allowed",
                  )}
                >
                  {!puedeModificar ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  Agregar
                </button>
              </div>
            </div>

            {/* Flujo de Proceso — arriba de la lista de tareas */}
            <div className="px-5 pb-4">
              <ProcessFlow steps={flowSteps} />
            </div>

            {/* Task list */}
            {tareasLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : tareasSorted.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No hay tareas. Agrega la primera.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {tareasSorted.map((tarea: Tarea & { tipo?: string; responsable?: string }, idx) => {
                  const isEditing = editTareaId === tarea.id;
                  const prevIncompleta = idx > 0 && !tareasSorted[idx - 1].completada;
                  return (
                    <div
                      key={tarea.id}
                      className={cn(
                        "flex items-start md:items-center gap-1.5 px-3 md:px-5 py-3 transition group",
                        tarea.completada ? "bg-green-50/30" : "hover:bg-gray-50",
                      )}
                    >
                      {/* Reorder arrows — solo entre incompletas y solo admin/asignado */}
                      {!tarea.completada && puedeModificar && (
                        <div className="flex flex-col items-center gap-0.5 mr-1 flex-shrink-0">
                          {idx > 0 && !tareasSorted[idx - 1].completada && (
                            <button
                              type="button"
                              onClick={() =>
                                reordenarTareas.mutate([
                                  { id: tareasSorted[idx].id, orden: tareasSorted[idx - 1].orden },
                                  { id: tareasSorted[idx - 1].id, orden: tareasSorted[idx].orden },
                                ])
                              }
                              className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 leading-none"
                              title="Subir"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                          )}
                          {idx < tareasSorted.length - 1 && !tareasSorted[idx + 1].completada && (
                            <button
                              type="button"
                              onClick={() =>
                                reordenarTareas.mutate([
                                  { id: tareasSorted[idx].id, orden: tareasSorted[idx + 1].orden },
                                  { id: tareasSorted[idx + 1].id, orden: tareasSorted[idx].orden },
                                ])
                              }
                              className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 leading-none"
                              title="Bajar"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Checkbox — solo admin o asignado */}
                      <button
                        onClick={async () => {
                          if (tarea.completada || !puedeModificar) return;
                          if (isBloqueado) {
                            toast.error("No se pueden completar tareas mientras el servicio esté bloqueado");
                            return;
                          }
                          if (isCancelado) {
                            toast.error("No se puede registrar progreso en un servicio cancelado");
                            return;
                          }
                          if (!prevIncompleta) {
                            const isFirst = completadasCount === 0;
                            try {
                              await completarTarea.mutateAsync(tarea.id);
                              // Auto-advance: si era la primera tarea, pasar a en_progreso
                              if (isFirst && servicio?.estado === "pendiente") {
                                cambiarEstado.mutate({ id: servicioId, estado: "en_progreso" });
                              }
                            } catch (err: any) {
                              const detail = err?.response?.data?.detail || err?.message || "";
                              if (detail.toLowerCase().includes("evidencia")) {
                                toast.error("Debe subir al menos una evidencia antes de completar esta tarea");
                              } else if (detail) {
                                toast.error(detail);
                              } else {
                                toast.error("Error al completar la tarea");
                              }
                            }
                          }
                        }}
                        disabled={tarea.completada || prevIncompleta || !puedeEjecutar || isBloqueado || isCancelado}
                        title={
                          tarea.completada ? "Tarea completada" :
                          prevIncompleta ? "Completá la tarea anterior primero" :
                          !puedeEjecutar ? "Solo el técnico asignado puede completar tareas" :
                          isBloqueado ? "Servicio bloqueado" :
                          isCancelado ? "Servicio cancelado" : undefined
                        }
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition",
                          tarea.completada
                            ? "bg-green-500 border-green-500 cursor-not-allowed"
                            : prevIncompleta || !puedeEjecutar || isBloqueado || isCancelado
                            ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                            : "border-gray-300 hover:border-blue-500",
                        )}
                      >
                        {tarea.completada && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        {!tarea.completada && !puedeEjecutar && <Lock className="w-2.5 h-2.5 text-gray-300" />}
                        {!tarea.completada && isBloqueado && <Lock className="w-2.5 h-2.5 text-red-300" />}
                        {!tarea.completada && isCancelado && <X className="w-2.5 h-2.5 text-gray-400" />}
                      </button>

                      {/* Title (editable) */}
                      {isEditing ? (
                        <div className="flex-1 flex gap-1">
                          <input
                            value={editTareaTitle}
                            onChange={(e) => setEditTareaTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveTitleEdit();
                              if (e.key === "Escape") handleCancelTitleEdit();
                            }}
                            className="flex-1 px-2 py-1 border border-blue-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100"
                            autoFocus
                          />
                          <button onClick={handleSaveTitleEdit} className="text-xs px-2 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition">✓</button>
                          <button onClick={() => setEditTareaId(null)} className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition">✕</button>
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-sm",
                                tarea.completada ? "line-through text-gray-500" : "text-gray-800",
                                tarea.completada || prevIncompleta ? "cursor-not-allowed" : "cursor-pointer",
                              )}
                              onClick={tarea.completada || prevIncompleta || !puedeModificar ? undefined : () => handleStartTitleEdit(tarea)}
                              style={{ fontWeight: tarea.completada ? 400 : 500 }}
                            >
                              {tarea.titulo}
                            </span>
                            {/* Type badge - Figma style (runtime field) */}
                            {tarea.tipo && TIPO_TAREA_CONFIG[tarea.tipo] && (
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", TIPO_TAREA_CONFIG[tarea.tipo].class)}>
                                {TIPO_TAREA_CONFIG[tarea.tipo].label}
                              </span>
                            )}
                            {tarea.requiere_evidencia && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 flex items-center gap-1"
                                title="Requiere evidencia fotográfica antes de completar"
                              >
                                <FileText className="w-2.5 h-2.5" />
                                Evidencia
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                            {tarea.tiempo_estimado && <span>{tarea.tiempo_estimado} min</span>}
                            {tarea.completada && tarea.responsable && <span>· {tarea.responsable}</span>}
                          </div>
                        </div>
                      )}

                      {/* Cronómetro por tarea (RF-31) */}
                      {!tarea.completada && puedeEjecutar && (() => {
                        const trackInfo = trackingPorTarea[tarea.id];
                        const isTracking = trackInfo?.tracking_activo;
                        const elapsed = elapsedMap[tarea.id];
                        if (isTracking) {
                          return (
                            <div className="flex items-center gap-1 flex-shrink-0 mr-1">
                              <span className="text-xs font-mono tabular-nums text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md min-w-[50px] text-center">
                                {elapsed != null
                                  ? `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`
                                  : "--:--"}
                              </span>
                              <button
                                onClick={() => {
                                  const info = trackingPorTarea[tarea.id];
                                  if (info?.tracking_id) {
                                    finalizarTiempo.mutateAsync(info.tracking_id);
                                  }
                                }}
                                disabled={finalizarTiempo.isPending}
                                className="p-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition text-xs"
                                title="Detener cronómetro"
                              >
                                ⏹
                              </button>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      {puedeEditarMetadata && (
                        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 max-md:opacity-100 transition-opacity">
                          {!isEditing && !tarea.completada && (
                            <button
                              onClick={() => handleStartTitleEdit(tarea)}
                              className="p-1.5 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-300 transition"
                              title="Editar título"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                          {!tarea.completada && (
                            <button
                              onClick={() => handleDeleteClick(tarea)}
                              className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-300 transition"
                              title="Eliminar tarea"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* MÉTRICAS TAB */}
        {activeTab === "metricas" && (
          <MetricasTabContent tareas={tareas || []} servicio={servicio} />
        )}

        {/* COMENTARIOS TAB */}
        {activeTab === "comentarios" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <CommentsTab servicioId={servicioId} />
          </div>
        )}

        {/* EVIDENCIAS TAB */}
        {activeTab === "evidencias" && (
          <EvidenciasTabContent servicioId={servicioId} tareas={tareas || []} userRol={user?.rol} userId={user?.id} tecnicoId={servicio?.colaborador_id ?? undefined} colaboradorPuedeEditar={servicio?.colaborador_edita_visibilidad} />
        )}
      </div>

      {/* Save as Template Modal */}
      {showSaveTemplate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Save className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-gray-900 font-bold text-sm">Guardar como plantilla</h3>
                <p className="text-xs text-gray-400">
                  Creado por <span className="font-medium text-gray-600">{user?.nombres || user?.username || "--"}</span>
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Se crearán {totalTareas} tarea{totalTareas !== 1 ? "s" : ""} en la nueva plantilla.
            </p>
            <div>
              <label className="block text-xs text-gray-600 font-semibold mb-1">Nombre de la plantilla</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveAsTemplate()}
                placeholder="Ej: Instalación de red estándar"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowSaveTemplate(false); setTemplateName(""); }}
                className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAsTemplate}
                disabled={crearPlantilla.isPending || !templateName.trim()}
                className="flex-1 bg-blue-900 text-white rounded-xl py-2.5 text-sm hover:bg-blue-800 transition disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
              >
                <Save className="w-4 h-4" />
                {crearPlantilla.isPending ? "Guardando..." : "Guardar plantilla"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setQrModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-gray-900 font-bold text-sm">Código QR del servicio</h3>
              <button onClick={() => setQrModalOpen(false)} className="text-gray-500 hover:text-gray-800 transition p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR del servicio" className="w-56 h-56 rounded-xl border border-gray-200 shadow-sm" />
              ) : (
                <div className="w-56 h-56 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
                  <span className="text-xs text-gray-500 font-medium">Generando QR...</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 text-center">
              Escaneá el código para ver el estado del servicio
            </p>
            <button
              onClick={() => {
                const url = `${PUBLIC_URL}/public/servicio/${servicio.codigo}`;
                navigator.clipboard.writeText(url);
                toast.success("Enlace copiado al portapapeles");
              }}
              className="w-full border border-gray-300 text-gray-700 rounded-xl py-2.5 text-xs hover:bg-gray-100 hover:text-gray-900 transition font-medium"
            >
              Copiar enlace
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar tarea"
        message={`¿Estás seguro de eliminar la tarea "${deleteTarget?.titulo}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        isLoading={eliminarTarea.isPending}
      />

      {/* Bloqueo Dialog */}
      <Dialog open={bloqueoDialogOpen} onOpenChange={setBloqueoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bloquear Servicio</DialogTitle>
            <DialogDescription>
              Ingresá el motivo por el cual estás bloqueando el servicio.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <textarea
              className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[80px]"
              placeholder="Ej: Falta repuesto, requiere aprobación del cliente, etc."
              value={bloqueoMotivo}
              onChange={(e) => setBloqueoMotivo(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") setBloqueoDialogOpen(false);
              }}
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => setBloqueoDialogOpen(false)}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-300 transition"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (!bloqueoMotivo.trim()) {
                  toast.error("Debés ingresar un motivo para bloquear el servicio");
                  return;
                }
                cambiarEstado.mutate({ id: servicioId, estado: "bloqueado", motivo: bloqueoMotivo.trim() });
                setBloqueoDialogOpen(false);
              }}
              disabled={cambiarEstado.isPending}
              className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              {cambiarEstado.isPending ? "Bloqueando..." : "Bloquear Servicio"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Desbloqueo Dialog */}
      <Dialog open={desbloqueoDialogOpen} onOpenChange={setDesbloqueoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Desbloquear Servicio</DialogTitle>
            <DialogDescription>
              Ingresá el motivo por el cual estás desbloqueando el servicio.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <textarea
              className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[80px]"
              placeholder="Ej: Se consiguió el repuesto, el cliente aprobó la cotización, etc."
              value={desbloqueoMotivo}
              onChange={(e) => setDesbloqueoMotivo(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") setDesbloqueoDialogOpen(false);
              }}
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => setDesbloqueoDialogOpen(false)}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-300 transition"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (!desbloqueoMotivo.trim()) {
                  toast.error("Debés ingresar un motivo para desbloquear el servicio");
                  return;
                }
                cambiarEstado.mutate({ id: servicioId, estado: "en_progreso", motivo: desbloqueoMotivo.trim() });
                setDesbloqueoDialogOpen(false);
              }}
              disabled={cambiarEstado.isPending}
              className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              {cambiarEstado.isPending ? "Desbloqueando..." : "Desbloquear Servicio"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


