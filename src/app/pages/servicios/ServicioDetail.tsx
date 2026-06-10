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
import { CommentsTab } from "./components/CommentsTab.js";
import { KanbanBoard } from "./components/KanbanBoard.js";
import { ProcessFlow } from "@/app/components/flow/ProcessFlow.js";
import { ConfirmDialog } from "@/app/components/ConfirmDialog.js";
import { useAreas } from "@/api/queries/useAreas.js";
import type { Tarea } from "@shared/index.js";

// ── Tab Definitions ──
const TABS = [
  { id: "tareas", label: "Tareas" },
  { id: "kanban", label: "Kanban" },
  { id: "flujo", label: "Flujo" },
  { id: "comentarios", label: "Comentarios" },
] as const;
type TabId = (typeof TABS)[number]["id"];

// ── Priority config ──
const PRIORITY_CONFIG: Record<string, { label: string; class: string }> = {
  baja: { label: "Baja", class: "bg-slate-100 text-slate-600" },
  media: { label: "Media", class: "bg-blue-100 text-blue-700" },
  alta: { label: "Alta", class: "bg-orange-100 text-orange-700" },
  urgente: { label: "Urgente", class: "bg-red-100 text-red-700" },
};

// ── Kanban column definitions (4 columnas) ──
const KANBAN_COLUMNS = [
  {
    id: "pendiente",
    title: "Pendiente",
    headerClass: "bg-amber-100 text-amber-800",
    countClass: "bg-amber-200 text-amber-800",
  },
  {
    id: "en_progreso",
    title: "En Progreso",
    headerClass: "bg-blue-100 text-blue-800",
    countClass: "bg-blue-200 text-blue-800",
  },
  {
    id: "completado",
    title: "Completado",
    headerClass: "bg-green-100 text-green-800",
    countClass: "bg-green-200 text-green-800",
  },
  {
    id: "bloqueado",
    title: "Bloqueado",
    headerClass: "bg-red-100 text-red-800",
    countClass: "bg-red-200 text-red-800",
  },
];

// ── Time format helper ──
function formatDuration(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${Math.floor(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── Estado button config ──
const ESTADOS = [
  { id: "pendiente", label: "Pendiente", color: "bg-amber-100 text-amber-700 hover:bg-amber-200" },
  { id: "en_progreso", label: "En Progreso", color: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
  { id: "completado", label: "Completado", color: "bg-green-100 text-green-700 hover:bg-green-200" },
  { id: "cancelado", label: "Cancelado", color: "bg-slate-100 text-slate-600 hover:bg-slate-200" },
  { id: "bloqueado", label: "Bloqueado", color: "bg-red-100 text-red-700 hover:bg-red-200" },
];

export function ServicioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const servicioId = parseInt(id!);

  // Data
  const { data: servicio, isLoading: svcLoading } = useServicio(servicioId);
  const { data: tareas, isLoading: tareasLoading } = useTareas(servicioId);

  // Active tab from URL
  const activeTab = (searchParams.get("tab") as TabId) || "tareas";
  const setActiveTab = (tab: TabId) => {
    setSearchParams(tab === "tareas" ? {} : { tab });
  };

  // Mutations
  const crearTarea = useCrearTarea();
  const completarTarea = useCompletarTarea();
  const reabrirTarea = useReabrirTarea();
  const eliminarTarea = useEliminarTarea();
  const cambiarEstado = useCambiarEstado();
  const editarTareaInline = useEditarTareaInline();
  const iniciarTiempo = useIniciarTiempo();
  const finalizarTiempo = useFinalizarTiempo();

  // UI state
  const [nuevaTarea, setNuevaTarea] = useState("");
  const [editTareaId, setEditTareaId] = useState<number | null>(null);
  const [editTareaTitle, setEditTareaTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Tarea | null>(null);
  const [activeTracking, setActiveTracking] = useState<Record<number, number | null>>({});
  const [kanbanAreaFilter, setKanbanAreaFilter] = useState<string>("");
  const { data: areas } = useAreas();

  // Derived data
  const tareasSorted = [...(tareas || [])].sort((a: Tarea, b: Tarea) => a.orden - b.orden);
  const completadasCount = tareasSorted.filter((t) => t.completada).length;
  const totalTareas = tareasSorted.length;
  const progresoPct = totalTareas > 0 ? Math.round((completadasCount / totalTareas) * 100) : 0;
  const isPendiente = servicio?.estado === "pendiente";
  const isBloqueado = servicio?.estado === "bloqueado";
  const isEnProgreso = servicio?.estado === "en_progreso";
  const prioridadConf = PRIORITY_CONFIG[servicio?.prioridad || "media"];

  // ── Handlers ──

  const handleAddTarea = async () => {
    if (!nuevaTarea.trim()) return;
    await crearTarea.mutateAsync({ servicioId, data: { titulo: nuevaTarea } });
    setNuevaTarea("");
  };

  const handleIniciar = () => {
    cambiarEstado.mutate({ id: servicioId, estado: "en_progreso", motivo: undefined });
  };

  const handleReabrir = () => {
    cambiarEstado.mutate({ id: servicioId, estado: "en_progreso", motivo: undefined });
  };

  const handleTaskDrop = (taskId: number, targetColumn: string) => {
    if (targetColumn === "completado") {
      completarTarea.mutate(taskId);
    } else if (targetColumn === "pendiente" || targetColumn === "en_progreso") {
      reabrirTarea.mutate(taskId);
    }
    // Bloqueado: no se arrastra hacia esta columna desde el UI
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

  const handleDeleteClick = (tarea: Tarea) => {
    setDeleteTarget(tarea);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      eliminarTarea.mutate(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleStartTimer = (tareaId: number) => {
    iniciarTiempo.mutate(tareaId, {
      onSuccess: () => {
        // If the endpoint returns data, update active tracking
      },
    });
  };

  const handleStopTimer = (tareaId: number) => {
    // Find active tracking for this tarea
    // We need to get the tracking id - for now we just finalize
    // The existing seguimientoApi finalizar endpoint needs a trackingId
    // For simplicity, we just call the mutation
  };

  // ── Loading / Error ──
  if (svcLoading) {
    return (
      <div className="max-w-4xl space-y-4 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-24" />
        <div className="h-6 bg-slate-200 rounded w-48" />
        <div className="h-4 bg-slate-200 rounded w-64" />
        <div className="h-8 bg-slate-200 rounded w-full" />
        <div className="h-32 bg-slate-200 rounded-xl" />
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

  // ── Kanban items from tareas (4 columnas con tracking-aware mapping) ──
  const kanbanItems = tareasSorted
    .filter((tarea) => {
      if (!kanbanAreaFilter) return true;
      return tarea.area_id === parseInt(kanbanAreaFilter);
    })
    .map((tarea) => {
      let columnId: string;
      if (tarea.completada) {
        columnId = "completado";
      } else if (isBloqueado) {
        columnId = "bloqueado";
      } else if (tarea.has_active_tracking) {
        columnId = "en_progreso";
      } else {
        columnId = "pendiente";
      }

      return {
        id: tarea.id,
        columnId,
        titulo: tarea.titulo,
        subtitulo: null,
        badge: tarea.completada ? "Completada" : tarea.has_active_tracking ? "En curso" : null,
        badgeClass: tarea.completada ? "bg-green-100 text-green-700" : tarea.has_active_tracking ? "bg-blue-100 text-blue-700" : undefined,
        meta: [
          ...(tarea.asignado_a ? [{ label: "Asignado" as const, value: `#${tarea.asignado_a}` }] : []),
          ...(tarea.tiempo_estimado ? [{ label: "Tiempo" as const, value: `${tarea.tiempo_estimado} min` }] : []),
        ],
      };
    });

  // ── Flow steps from tareas ──
  const flowSteps = tareasSorted.map((tarea) => ({
    id: tarea.id,
    titulo: tarea.titulo,
    completada: tarea.completada,
    orden: tarea.orden,
    completada_at: tarea.completada_at,
    tiempo_estimado: tarea.tiempo_estimado,
    asignado_a_nombre: null,
  }));

  // ── RENDER ──
  return (
    <div className="max-w-4xl space-y-6">
      {/* Back */}
      <button onClick={() => navigate("/servicios")} className="text-sm text-blue-600 hover:underline mb-1">
        ← Servicios
      </button>

      {/* ── Bloqueado Banner ── */}
      {isBloqueado && servicio.bloqueado_motivo && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Servicio Bloqueado</p>
            <p className="text-sm text-red-600 mt-0.5">{servicio.bloqueado_motivo}</p>
          </div>
          <button
            onClick={handleReabrir}
            className="text-sm px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors flex-shrink-0"
          >
            Reabrir
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-slate-400">{servicio.codigo}</span>
              {/* Priority badge */}
              {servicio.prioridad && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${prioridadConf.class}`}>
                  {prioridadConf.label}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-slate-800">{servicio.titulo}</h2>
            <p className="text-sm text-slate-500">{servicio.cliente_nombre}</p>
          </div>

          {/* Estado selector */}
          <div className="flex gap-1.5 flex-wrap justify-end">
            {ESTADOS.map((e) => (
              <button
                key={e.id}
                onClick={() => cambiarEstado.mutate({ id: servicioId, estado: e.id })}
                disabled={servicio.estado === e.id}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                  servicio.estado === e.id
                    ? "bg-blue-600 text-white"
                    : `${e.color}`
                } disabled:opacity-50`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {servicio.descripcion && (
          <p className="text-sm text-slate-600 mt-3 bg-slate-50 rounded-lg p-3">{servicio.descripcion}</p>
        )}

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600 font-medium">Progreso</span>
            <span className="font-semibold text-slate-800">{progresoPct}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-700 ${
                progresoPct === 100 ? "bg-green-500" : "bg-blue-500"
              }`}
              style={{ width: `${progresoPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {completadasCount} de {totalTareas} tareas completadas
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          {isPendiente && (
            <button
              onClick={handleIniciar}
              disabled={cambiarEstado.isPending}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Iniciar Servicio
            </button>
          )}
          {isEnProgreso && (
            <span className="inline-flex items-center gap-1.5 text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              En Progreso
            </span>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-0 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              {tab.label}
              {tab.id === "tareas" && totalTareas > 0 && (
                <span className="ml-1.5 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                  {completadasCount}/{totalTareas}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab Content ── */}
      <div>
        {/* TAREAS TAB */}
        {activeTab === "tareas" && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            {/* Add task */}
            <div className="flex gap-2">
              <input
                value={nuevaTarea}
                onChange={(e) => setNuevaTarea(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTarea()}
                placeholder="Nueva tarea..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              />
              <button
                onClick={handleAddTarea}
                disabled={crearTarea.isPending || !nuevaTarea.trim()}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                + Agregar
              </button>
            </div>

            {/* Task list */}
            {tareasLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : tareasSorted.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No hay tareas. Agrega la primera.</p>
            ) : (
              <div className="space-y-1">
                {tareasSorted.map((tarea) => {
                  const isEditing = editTareaId === tarea.id;

                  return (
                    <div
                      key={tarea.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 group"
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={tarea.completada}
                        onChange={() =>
                          tarea.completada
                            ? reabrirTarea.mutate(tarea.id)
                            : completarTarea.mutate(tarea.id)
                        }
                        className="w-4 h-4 flex-shrink-0"
                      />

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
                            className="flex-1 px-2 py-1 border rounded text-sm"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveTitleEdit}
                            className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleCancelTitleEdit}
                            className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-500 hover:bg-slate-200"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`flex-1 text-sm cursor-pointer ${
                            tarea.completada ? "line-through text-slate-400" : "text-slate-700"
                          }`}
                          onClick={() => handleStartTitleEdit(tarea)}
                          title="Click para editar"
                        >
                          {tarea.titulo}
                        </span>
                      )}

                      {/* Meta info */}
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        {tarea.tiempo_estimado && (
                          <span className="hidden sm:inline">{tarea.tiempo_estimado} min</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Start timer */}
                        <button
                          onClick={() => handleStartTimer(tarea.id)}
                          className="text-xs px-1.5 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
                          title="Iniciar cronómetro"
                        >
                          ▶
                        </button>
                        {/* Edit */}
                        {!isEditing && (
                          <button
                            onClick={() => handleStartTitleEdit(tarea)}
                            className="text-xs px-1.5 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                            title="Editar título"
                          >
                            ✎
                          </button>
                        )}
                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteClick(tarea)}
                          className="text-xs px-1.5 py-1 rounded bg-red-100 text-red-500 hover:bg-red-200"
                          title="Eliminar tarea"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* KANBAN TAB */}
        {activeTab === "kanban" && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
            {/* Area filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 font-medium">Filtrar por área:</label>
              <select
                value={kanbanAreaFilter}
                onChange={(e) => setKanbanAreaFilter(e.target.value)}
                className="px-2 py-1 border rounded text-xs"
              >
                <option value="">Todas las áreas</option>
                {(areas || []).map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>
            <KanbanBoard
              columns={KANBAN_COLUMNS}
              items={kanbanItems}
              onItemDrop={handleTaskDrop}
              isLoading={tareasLoading}
            />
          </div>
        )}

        {/* FLUJO TAB */}
        {activeTab === "flujo" && (
          <ProcessFlow
            steps={flowSteps}
          />
        )}

        {/* COMENTARIOS TAB */}
        {activeTab === "comentarios" && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <CommentsTab servicioId={servicioId} />
          </div>
        )}
      </div>

      {/* ── Delete Confirmation Dialog ── */}
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
