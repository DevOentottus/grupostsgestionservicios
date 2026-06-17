import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  useServicio, useTareas,
  useCrearTarea, useCompletarTarea, useReabrirTarea, useEliminarTarea,
  useCambiarEstado, useEditarTareaInline, useReordenarTareas,
} from "@/api/queries/useServicios.js";

import { useCrearPlantilla } from "@/api/queries/usePlantillas.js";
import { CommentsTab } from "./components/CommentsTab.js";
import { ProcessFlow } from "@/app/components/flow/ProcessFlow.js";
import { useEvidencias } from "@/api/queries/useEvidencias.js";
import { EvidenceUploader } from "@/app/components/evidencias/EvidenceUploader.js";
import { EvidenceViewer } from "@/app/components/evidencias/EvidenceViewer.js";
import { ConfirmDialog } from "@/app/components/ConfirmDialog.js";
import { AudioRecorder } from "@/app/components/AudioRecorder.js";
import { useAuth } from "@/lib/auth.js";
import { toast } from "sonner";
import { cn } from "@/app/lib/utils";
import QRCode from "qrcode";
import {
  ArrowLeft, CheckCircle2, Clock, MessageSquare,
  Send, AlertTriangle, Plus, X, ChevronRight,
  Pencil, MessageCircle, Mic,
  Save, Camera, Share2, Play, Lock, RotateCcw, ChevronUp, ChevronDown, FileText,
} from "lucide-react";
import type { Tarea } from "@shared/index.js";

// -- Public URL (configurable via env) --
const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || "https://serviciolocalsts.vercel.app";

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
  { id: "flujo", label: "Flujo", icon: ChevronRight },
  { id: "comentarios", label: "Comentarios", icon: MessageSquare },
  { id: "evidencias", label: "Evidencias", icon: Camera },
] as const;
type TabId = (typeof TABS)[number]["id"];

// -- Efficiency config (replaces old priority config) --
const EFICIENCIA_CONFIG: Record<string, { label: string; class: string; icon: string }> = {
  baja: { label: "Baja", class: "bg-gray-50 text-gray-700 border-gray-200", icon: "chevron" },
  media: { label: "Media", class: "bg-blue-50 text-blue-700 border-blue-200", icon: "clock" },
  alta: { label: "Alta", class: "bg-orange-50 text-orange-700 border-orange-200", icon: "chevron" },
  urgente: { label: "Urgente", class: "bg-red-50 text-red-700 border-red-200", icon: "alert" },
};

/** Combinar fecha + hora del backend a locale legible */
function formatDateTime(fecha: string, hora?: string | null): string {
  try {
    const d = new Date(`${fecha}T${hora || "00:00:00"}`);
    return d.toLocaleDateString("es-PE", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
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

// -- Evidencias Tab Component --
function EvidenciasTabContent({ servicioId, tareas }: { servicioId: number; tareas: Tarea[] }) {
  const { data: evidencias, isLoading } = useEvidencias(servicioId);
  const [tareaSeleccionada, setTareaSeleccionada] = useState<number | null>(null);

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
        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Camera className="w-4 h-4 text-slate-400" />
          Evidencias subidas
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
          />
        )}
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

  const esAdmin = user?.rol === "admin";
  const esEncargado = user?.rol === "encargado";
  const esGestion = esAdmin || esEncargado; // admin/encargado pueden gestionar

  const { data: servicio, isLoading: svcLoading } = useServicio(servicioId);
  const { data: tareas, isLoading: tareasLoading } = useTareas(servicioId);

  const activeTab = (searchParams.get("tab") as TabId) || "tareas";
  const setActiveTab = (tab: TabId) => {
    setSearchParams(tab === "tareas" ? {} : { tab });
  };

  const crearTarea = useCrearTarea();
  const completarTarea = useCompletarTarea();
  const reabrirTarea = useReabrirTarea();
  const eliminarTarea = useEliminarTarea();
  const cambiarEstado = useCambiarEstado();
  const editarTareaInline = useEditarTareaInline();
  const crearPlantilla = useCrearPlantilla();
  const reordenarTareas = useReordenarTareas();

  const [nuevaTarea, setNuevaTarea] = useState("");
  const [editTareaId, setEditTareaId] = useState<number | null>(null);
  const [editTareaTitle, setEditTareaTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Tarea | null>(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showCompartir, setShowCompartir] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

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
  const isPendiente = servicio?.estado === "pendiente";
  const isBloqueado = servicio?.estado === "bloqueado";
  const isEnProgreso = servicio?.estado === "en_progreso";
  const eficienciaConf = EFICIENCIA_CONFIG[servicio?.prioridad || "media"];

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

  const flowSteps = tareasSorted.map((tarea) => ({
    id: tarea.id,
    titulo: tarea.titulo,
    completada: tarea.completada,
    orden: tarea.orden,
    completada_at: tarea.completada_at,
    tiempo_estimado: tarea.tiempo_estimado,
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
    <div className="max-w-4xl space-y-6">
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
            onClick={irAEnProgreso}
            className="text-sm px-3 py-1.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors flex-shrink-0"
          >
            Reabrir
          </button>
        </div>
      )}

      {/* Header Card */}
      <div className={cn("rounded-2xl shadow-sm border border-gray-100 p-6 transition-colors", HEADER_BG[servicio.estado] || "bg-white")}>
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded-lg font-medium shadow-sm">{servicio.codigo}</span>
              {/* Botón Compartir */}
              <div className="relative">
                <button
                  onClick={() => setShowCompartir(!showCompartir)}
                  className="text-xs font-medium text-gray-600 hover:text-blue-700 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-gray-200 shadow-sm transition flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Compartir
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
                className="text-xs font-medium text-gray-600 hover:text-blue-700 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-gray-200 shadow-sm transition flex items-center gap-1.5"
                title="Descargar reporte técnico en PDF"
              >
                <FileText className="w-3.5 h-3.5" />
                PDF
              </button>
              {/* Gestion action icons: bloqueado→desbloquear, cancelado→reactivar, otherwise→bloquear/cancelar */}
              {esGestion && (servicio.estado === "bloqueado" ? (
                <button onClick={irAEnProgreso} className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition" title="Desbloquear">
                  <Lock className="w-3.5 h-3.5" />
                </button>
              ) : servicio.estado === "cancelado" ? (
                <button onClick={() => cambiarEstado.mutate({ id: servicioId, estado: "pendiente" })} className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition" title="Reactivar">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              ) : (
                <>
                  <button onClick={() => cambiarEstado.mutate({ id: servicioId, estado: "bloqueado" })} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition" title="Bloquear">
                    <Lock className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => cambiarEstado.mutate({ id: servicioId, estado: "cancelado" })} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition" title="Cancelar">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ))}
              {servicio.prioridad && (
                <span className={cn("text-xs font-semibold px-3 py-1 rounded-lg border shadow-sm flex items-center gap-1.5 select-none", eficienciaConf.class)}>
                  {eficienciaConf.icon === "alert" ? <AlertTriangle className="w-3 h-3" /> :
                   eficienciaConf.icon === "clock" ? <Clock className="w-3 h-3" /> :
                   <ChevronRight className="w-3 h-3" />}
                  {eficienciaConf.label}
                </span>
              )}
              {/* Hora de registro */}
              {servicio.created_at && (
                <span className="text-xs text-gray-500 flex items-center gap-1 ml-1">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(servicio.created_at, servicio.hora_creacion)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl text-gray-900" style={{ fontWeight: 700 }}>{servicio.titulo}</h2>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{servicio.cliente_nombre}</p>
          </div>

          {/* Estado badge */}
          <span className={cn("text-xs px-3 py-1.5 rounded-full font-medium", ESTADO_ESTILO[servicio.estado] || "bg-gray-100 text-gray-600")}>
            {ESTADO_LABEL[servicio.estado] || servicio.estado}
          </span>
        </div>

        {servicio.descripcion && (
          <p className="text-sm text-gray-600 mt-3 bg-gray-50 rounded-xl p-3 border border-gray-100">{servicio.descripcion}</p>
        )}

        {/* Reporte del Cliente y Diagnóstico */}
        {(servicio.cliente_reporte || servicio.diagnostico_inicial || servicio.servicio_audio_cliente || servicio.servicio_audio_diagnostico) && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(servicio.cliente_reporte || servicio.servicio_audio_cliente) && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5" />
                  Reporte del Cliente
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

        {/* Progress Bar - Figma gradient style */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-gray-600 font-medium">Progreso</span>
            <span className="font-semibold text-gray-800">{progresoPct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className={cn(
                "h-3 rounded-full transition-all duration-700",
                progresoPct === 100 ? "bg-gradient-to-r from-green-400 to-green-600" : "bg-gradient-to-r from-blue-500 to-blue-700",
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
          {isPendiente && (
            <button
              onClick={irAEnProgreso}
              disabled={cambiarEstado.isPending}
              className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
               <Play className="w-4 h-4" /> Iniciar Servicio
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

      {/* Tabs - shadcn/ui style */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 -mb-px">
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

            {/* Add task input */}
            <div className="px-5 pb-4">
              <div className="flex gap-2">
                <input
                  value={nuevaTarea}
                  onChange={(e) => setNuevaTarea(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTarea()}
                  placeholder="Nueva tarea..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:border-blue-500 outline-none"
                />
                <button
                  onClick={handleAddTarea}
                  disabled={crearTarea.isPending || !nuevaTarea.trim()}
                  className="bg-blue-600 text-white px-3 py-2 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              </div>
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
                        "flex items-center gap-1 px-5 py-3.5 transition group",
                        tarea.completada ? "bg-green-50/30" : "hover:bg-gray-50",
                      )}
                    >
                      {/* Reorder arrows */}
                      <div className="flex flex-col items-center gap-0.5 mr-1 flex-shrink-0">
                        {idx > 0 && (
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
                        {idx < tareasSorted.length - 1 && (
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

                      {/* Checkbox */}
                      <button
                        onClick={async () => {
                          if (tarea.completada) return; // no permitir desmarcar
                          if (!prevIncompleta) {
                            const isFirst = completadasCount === 0;
                            await completarTarea.mutateAsync(tarea.id);
                            // Auto-advance: si era la primera tarea, pasar a en_progreso
                            if (isFirst && servicio?.estado === "pendiente") {
                              cambiarEstado.mutate({ id: servicioId, estado: "en_progreso" });
                            }
                          }
                        }}
                        disabled={tarea.completada || prevIncompleta}
                        title={
                          tarea.completada ? "Tarea completada" :
                          prevIncompleta ? "Completá la tarea anterior primero" : undefined
                        }
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition",
                          tarea.completada
                            ? "bg-green-500 border-green-500"
                            : prevIncompleta
                            ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                            : "border-gray-300 hover:border-blue-500",
                        )}
                      >
                        {tarea.completada && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
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
                                "text-sm cursor-pointer",
                                tarea.completada ? "line-through text-gray-500" : "text-gray-800",
                              )}
                              onClick={() => handleStartTitleEdit(tarea)}
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
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                            {tarea.tiempo_estimado && <span>{tarea.tiempo_estimado} min</span>}
                            {tarea.completada && tarea.responsable && <span>· {tarea.responsable}</span>}
                          </div>
                        </div>
                      )}

                      {/* Edit + Delete */}
                      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* FLUJO TAB */}
        {activeTab === "flujo" && <ProcessFlow steps={flowSteps} />}

        {/* COMENTARIOS TAB */}
        {activeTab === "comentarios" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <CommentsTab servicioId={servicioId} />
          </div>
        )}

        {/* EVIDENCIAS TAB */}
        {activeTab === "evidencias" && (
          <EvidenciasTabContent servicioId={servicioId} tareas={tareas || []} />
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
    </div>
  );
}


