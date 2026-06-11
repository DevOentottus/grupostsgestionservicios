import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  useServicio, useTareas,
  useCrearTarea, useCompletarTarea, useReabrirTarea, useEliminarTarea,
  useCambiarEstado, useEditarTareaInline,
} from "@/api/queries/useServicios.js";
import {
  useIniciarTiempo, useFinalizarTiempo,
} from "@/api/queries/useSeguimiento.js";
import { useCrearPlantilla } from "@/api/queries/usePlantillas.js";
import { CommentsTab } from "./components/CommentsTab.js";
import { ProcessFlow } from "@/app/components/flow/ProcessFlow.js";
import { ConfirmDialog } from "@/app/components/ConfirmDialog.js";
import { useAuth } from "@/lib/auth.js";
import { cn } from "@/app/lib/utils";
import {
  ArrowLeft, CheckCircle2, Clock, User, MessageSquare,
  Send, AlertTriangle, Plus, X, ChevronRight,
  Pencil, UserPlus, MessageCircle, BookOpen, Eye, Wrench,
  FileText, Star, Save,
} from "lucide-react";
import type { Tarea } from "@shared/index.js";

// ── Tab Definitions ──
const TABS = [
  { id: "tareas", label: "Tareas", icon: CheckCircle2 },
  { id: "flujo", label: "Flujo", icon: ChevronRight },
  { id: "comentarios", label: "Comentarios", icon: MessageSquare },
] as const;
type TabId = (typeof TABS)[number]["id"];

// ── Priority config ──
const PRIORITY_CONFIG: Record<string, { label: string; class: string }> = {
  baja: { label: "Baja", class: "bg-gray-100 text-gray-600" },
  media: { label: "Media", class: "bg-blue-100 text-blue-700" },
  alta: { label: "Alta", class: "bg-orange-100 text-orange-700" },
  urgente: { label: "Urgente", class: "bg-red-100 text-red-700" },
};

// ── Task type badges ──
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

const ESTADOS = [
  { id: "pendiente", label: "Pendiente", color: "bg-amber-100 text-amber-700 hover:bg-amber-200" },
  { id: "en_progreso", label: "En Progreso", color: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
  { id: "completado", label: "Completado", color: "bg-green-100 text-green-700 hover:bg-green-200" },
  { id: "cancelado", label: "Cancelado", color: "bg-gray-100 text-gray-600 hover:bg-gray-200" },
  { id: "bloqueado", label: "Bloqueado", color: "bg-red-100 text-red-700 hover:bg-red-200" },
];

const ESTADO_ESTILO: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  en_progreso: "bg-blue-100 text-blue-800",
  completado: "bg-green-100 text-green-800",
  bloqueado: "bg-red-100 text-red-800",
  cancelado: "bg-gray-100 text-gray-600",
};

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
  const iniciarTiempo = useIniciarTiempo();
  const finalizarTiempo = useFinalizarTiempo();
  const crearPlantilla = useCrearPlantilla();
  const [nuevaTarea, setNuevaTarea] = useState("");
  const [nuevaTareaTipo, setNuevaTareaTipo] = useState<string>("tecnico");
  const [editTareaId, setEditTareaId] = useState<number | null>(null);
  const [editTareaTitle, setEditTareaTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Tarea | null>(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [activeTracking, setActiveTracking] = useState<Record<number, number | null>>({});

  const tareasSorted = [...(tareas || [])].sort((a: Tarea, b: Tarea) => a.orden - b.orden);
  const completadasCount = tareasSorted.filter((t) => t.completada).length;
  const totalTareas = tareasSorted.length;
  const progresoPct = totalTareas > 0 ? Math.round((completadasCount / totalTareas) * 100) : 0;
  const isPendiente = servicio?.estado === "pendiente";
  const isBloqueado = servicio?.estado === "bloqueado";
  const isEnProgreso = servicio?.estado === "en_progreso";
  const prioridadConf = PRIORITY_CONFIG[servicio?.prioridad || "media"];

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

  const handleIniciar = () => {
    cambiarEstado.mutate({ id: servicioId, estado: "en_progreso", motivo: undefined });
  };

  const handleReabrir = () => {
    cambiarEstado.mutate({ id: servicioId, estado: "en_progreso", motivo: undefined });
  };

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

  const handleStartTimer = (tareaId: number) => iniciarTiempo.mutate(tareaId);

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
            onClick={handleReabrir}
            className="text-sm px-3 py-1.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors flex-shrink-0"
          >
            Reabrir
          </button>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">{servicio.codigo}</span>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", ESTADO_ESTILO[servicio.estado] || "bg-gray-100 text-gray-600")}>
                {servicio.estado === "en_progreso" ? "En Progreso" :
                 servicio.estado === "pendiente" ? "Pendiente" :
                 servicio.estado === "completado" ? "Completado" :
                 servicio.estado === "bloqueado" ? "Bloqueado" : servicio.estado}
              </span>
              {servicio.prioridad && (
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", prioridadConf.class)}>
                  {prioridadConf.label}
                </span>
              )}
            </div>
            <h2 className="text-xl text-gray-900" style={{ fontWeight: 700 }}>{servicio.titulo}</h2>
            <p className="text-sm text-gray-500">{servicio.cliente_nombre}</p>
          </div>

          {/* Estado buttons — solo admin/encargado */}
          {esGestion ? (
            <div className="flex gap-1.5 flex-wrap justify-end">
              {ESTADOS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => cambiarEstado.mutate({ id: servicioId, estado: e.id })}
                  disabled={servicio.estado === e.id}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full font-medium transition-colors",
                    servicio.estado === e.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : e.color,
                  )}
                >
                  {e.label}
                </button>
              ))}
            </div>
          ) : (
            <span className={cn("text-xs px-3 py-1.5 rounded-full font-medium", ESTADO_ESTILO[servicio.estado] || "bg-gray-100 text-gray-600")}>
              {servicio.estado === "en_progreso" ? "En Progreso" :
               servicio.estado === "pendiente" ? "Pendiente" :
               servicio.estado === "completado" ? "Completado" :
               servicio.estado === "bloqueado" ? "Bloqueado" : servicio.estado}
            </span>
          )}
        </div>

        {servicio.descripcion && (
          <p className="text-sm text-gray-600 mt-3 bg-gray-50 rounded-xl p-3 border border-gray-100">{servicio.descripcion}</p>
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
          <p className="text-xs text-gray-400 mt-1">
            {completadasCount} de {totalTareas} tareas completadas
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          {isPendiente && (
            <button
              onClick={handleIniciar}
              disabled={cambiarEstado.isPending}
              className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <PlayIcon /> Iniciar Servicio
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
            {/* Add task + Save as template */}
            <div className="p-4 border-b border-gray-100 space-y-3">
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
              {esGestion && totalTareas > 0 && (
                <button
                  onClick={() => setShowSaveTemplate(true)}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors font-medium"
                >
                  <Save className="w-3.5 h-3.5" />
                  Guardar tareas como plantilla
                </button>
              )}
            </div>

            {/* Task list */}
            {tareasLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : tareasSorted.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No hay tareas. Agrega la primera.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {tareasSorted.map((tarea, idx) => {
                  const isEditing = editTareaId === tarea.id;
                  const prevIncompleta = idx > 0 && !tareasSorted[idx - 1].completada;
                  return (
                    <div
                      key={tarea.id}
                      className={cn(
                        "flex items-center gap-3 px-5 py-3.5 transition group",
                        tarea.completada ? "bg-green-50/30" : "hover:bg-gray-50",
                      )}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => {
                          if (tarea.completada) return; // no permitir desmarcar
                          if (!prevIncompleta) completarTarea.mutate(tarea.id);
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
                                tarea.completada ? "line-through text-gray-400" : "text-gray-800",
                              )}
                              onClick={() => handleStartTitleEdit(tarea)}
                              style={{ fontWeight: tarea.completada ? 400 : 500 }}
                            >
                              {tarea.titulo}
                            </span>
                            {/* Type badge - Figma style (runtime field) */}
                            {(tarea as any).tipo && TIPO_TAREA_CONFIG[(tarea as any).tipo] && (
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", TIPO_TAREA_CONFIG[(tarea as any).tipo].class)}>
                                {TIPO_TAREA_CONFIG[(tarea as any).tipo].label}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                            {tarea.tiempo_estimado && <span>{tarea.tiempo_estimado} min</span>}
                            {tarea.completada && (tarea as any).responsable && <span>· {(tarea as any).responsable}</span>}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => handleStartTimer(tarea.id)}
                          className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition"
                          title="Iniciar cronómetro"
                        >
                          ▶
                        </button>
                        {!isEditing && (
                          <button
                            onClick={() => handleStartTitleEdit(tarea)}
                            className="p-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                            title="Editar título"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteClick(tarea)}
                          className="p-1.5 rounded-lg bg-red-100 text-red-500 hover:bg-red-200 transition"
                          title="Eliminar tarea"
                        >
                          <X className="w-3 h-3" />
                        </button>
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
      </div>

      {/* Save as Template Modal */}
      {showSaveTemplate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-gray-900 font-bold">Guardar como plantilla</h3>
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

function PlayIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
