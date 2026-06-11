import { useState } from "react";
import {
  usePlantillas,
  useCrearPlantilla,
  useEditarPlantilla,
  useEliminarPlantilla,
} from "@/api/queries/usePlantillas.js";
import { useAreas } from "@/api/queries/useAreas.js";
import { plantillasApi } from "@/api/client.js";
import type { PlantillaWithTareas, PlantillaListItem } from "@/api/queries/usePlantillas.js";

interface TareaFormItem {
  key: string;
  titulo: string;
}

// ── Confirm Dialog (inline component) ──
function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-6">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Plantilla Create Modal (sólo creación, sin edición) ──
function PlantillaCreateModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const crearPlantilla = useCrearPlantilla();
  const { data: areas } = useAreas();

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [areaId, setAreaId] = useState<number | "">("");
  const [tareas, setTareas] = useState<TareaFormItem[]>([]);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setNombre("");
    setDescripcion("");
    setAreaId("");
    setTareas([]);
  };

  if (!open) return null;

  const addTarea = () => {
    setTareas([...tareas, { key: crypto.randomUUID(), titulo: "" }]);
  };

  const removeTarea = (key: string) => {
    setTareas(tareas.filter((t) => t.key !== key));
  };

  const updateTarea = (key: string, titulo: string) => {
    setTareas(tareas.map((t) => (t.key === key ? { ...t, titulo } : t)));
  };

  const moveTarea = (index: number, direction: "up" | "down") => {
    const newTareas = [...tareas];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= newTareas.length) return;
    [newTareas[index], newTareas[target]] = [newTareas[target], newTareas[index]];
    setTareas(newTareas);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);

    try {
      const tareasPayload = tareas
        .filter((t) => t.titulo.trim())
        .map((t, i) => ({ titulo: t.titulo.trim(), sort_order: i }));

      await crearPlantilla.mutateAsync({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        area_id: areaId || null,
        tareas: tareasPayload,
      });
      resetForm();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto shadow-xl">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">
            Nueva Plantilla
          </h3>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="Ej: Reparación estándar"
              required
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              rows={2}
              placeholder="Descripción opcional de la plantilla"
            />
          </div>

          {/* Área */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Área <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value ? Number(e.target.value) : "")}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Sin área (todas las áreas)</option>
              {areas?.map((a: any) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>

          {/* Tareas */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-700">
                Tareas
              </label>
              <button
                type="button"
                onClick={addTarea}
                className="text-xs px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
              >
                + Agregar tarea
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tareas.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">
                  Sin tareas. Agregá al menos una.
                </p>
              )}
              {tareas.map((tarea, index) => (
                <div key={tarea.key} className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveTarea(index, "up")}
                      disabled={index === 0}
                      className="text-[10px] leading-none px-1 py-0.5 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                      title="Subir"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveTarea(index, "down")}
                      disabled={index === tareas.length - 1}
                      className="text-[10px] leading-none px-1 py-0.5 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                      title="Bajar"
                    >
                      ▼
                    </button>
                  </div>
                  <input
                    value={tarea.titulo}
                    onChange={(e) => updateTarea(tarea.key, e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                    placeholder={`Tarea ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeTarea(tarea.key)}
                    className="text-xs px-2 py-2 rounded bg-red-50 text-red-500 hover:bg-red-100"
                    title="Eliminar tarea"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="px-4 py-2 text-sm rounded-lg border text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !nombre.trim()}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Task Edit Modal ──
function TaskEditModal({
  open,
  tareas,
  onSave,
  onClose,
}: {
  open: boolean;
  tareas: TareaFormItem[];
  onSave: (tareas: TareaFormItem[]) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<TareaFormItem[]>(tareas);

  if (!open) return null;

  const addTarea = () => {
    setItems([...items, { key: crypto.randomUUID(), titulo: "" }]);
  };

  const removeTarea = (key: string) => {
    setItems(items.filter((t) => t.key !== key));
  };

  const updateTarea = (key: string, titulo: string) => {
    setItems(items.map((t) => (t.key === key ? { ...t, titulo } : t)));
  };

  const moveTarea = (index: number, direction: "up" | "down") => {
    const newItems = [...items];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= newItems.length) return;
    [newItems[index], newItems[target]] = [newItems[target], newItems[index]];
    setItems(newItems);
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col shadow-xl">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-slate-800">Editar Tareas</h3>
          <p className="text-sm text-slate-500 mt-1">
            Agregá, eliminá o reordená las tareas de esta plantilla
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {items.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-8">
              Sin tareas. Agregá al menos una.
            </p>
          )}
          {items.map((tarea, index) => (
            <div key={tarea.key} className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => moveTarea(index, "up")}
                  disabled={index === 0}
                  className="text-[10px] leading-none px-1 py-0.5 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                  title="Subir"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveTarea(index, "down")}
                  disabled={index === items.length - 1}
                  className="text-[10px] leading-none px-1 py-0.5 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                  title="Bajar"
                >
                  ▼
                </button>
              </div>
              <input
                value={tarea.titulo}
                onChange={(e) => updateTarea(tarea.key, e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                placeholder={`Tarea ${index + 1}`}
              />
              <button
                type="button"
                onClick={() => removeTarea(tarea.key)}
                className="text-xs px-2 py-2 rounded bg-red-50 text-red-500 hover:bg-red-100"
                title="Eliminar tarea"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t flex justify-between items-center">
          <button
            type="button"
            onClick={addTarea}
            className="text-xs px-3 py-1.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
          >
            + Agregar tarea
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(items);
                onClose();
              }}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Guardar tareas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──
export function PlantillasPage() {
  const { data: plantillas, isLoading } = usePlantillas();
  const { data: areas } = useAreas();
  const editarPlantilla = useEditarPlantilla();
  const eliminarPlantilla = useEliminarPlantilla();

  // Create modal
  const [showCreate, setShowCreate] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Inline editing
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editAreaId, setEditAreaId] = useState<number | null>(null);
  const [editTareas, setEditTareas] = useState<TareaFormItem[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [showTaskEdit, setShowTaskEdit] = useState(false);

  const startInlineEdit = async (id: number) => {
    try {
      const res = await plantillasApi.obtener(id);
      const data = res.data.data as PlantillaWithTareas;
      setEditingId(id);
      setEditNombre(data.nombre);
      setEditDescripcion(data.descripcion ?? "");
      setEditAreaId(data.area_id);
      setEditTareas(
        data.tareas.map((t) => ({
          key: `t-${t.id}`,
          titulo: t.titulo,
        }))
      );
    } catch {
      // silently fail — keep card readonly
    }
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    setEditNombre("");
    setEditDescripcion("");
    setEditAreaId(null);
    setEditTareas([]);
  };

  const saveInlineEdit = async () => {
    if (!editingId) return;
    if (!editNombre.trim()) return;
    setEditSaving(true);
    try {
      const tareasPayload = editTareas
        .filter((t) => t.titulo.trim())
        .map((t, i) => ({ titulo: t.titulo.trim(), sort_order: i }));
      await editarPlantilla.mutateAsync({
        id: editingId,
        data: {
          nombre: editNombre.trim(),
          descripcion: editDescripcion.trim() || null,
          area_id: editAreaId,
          tareas: tareasPayload,
        },
      });
      cancelInlineEdit();
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    await eliminarPlantilla.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const getDeleteName = () => {
    if (!plantillas || deleteId === null) return "";
    const p = (plantillas as PlantillaListItem[]).find((x) => x.id === deleteId);
    return p?.nombre ?? "";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">
          Plantillas de Proceso
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          + Nueva Plantilla
        </button>
      </div>

      {/* Loading */}
      {isLoading && <p className="text-slate-500">Cargando...</p>}

      {/* Empty state */}
      {!isLoading && (!plantillas || plantillas.length === 0) && (
        <div className="bg-white rounded-xl border p-12 text-center">
          <p className="text-slate-400 text-sm">
            No hay plantillas. Creá una para agilizar la creación de servicios.
          </p>
        </div>
      )}

      {/* List */}
      {!isLoading && plantillas && plantillas.length > 0 && (
        <div className="grid gap-3">
          {(plantillas as PlantillaListItem[]).map((p) => (
            <div
              key={p.id}
              className={`bg-white rounded-xl border p-4 transition-shadow ${
                editingId === p.id
                  ? "ring-2 ring-blue-400 shadow-md"
                  : "hover:shadow-sm"
              }`}
            >
              {editingId === p.id ? (
                /* ── Inline Edit Mode ── */
                <div className="space-y-3">
                  <input
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-semibold"
                    placeholder="Nombre de la plantilla"
                    required
                  />
                  <textarea
                    value={editDescripcion}
                    onChange={(e) => setEditDescripcion(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    rows={2}
                    placeholder="Descripción opcional"
                  />
                  <select
                    value={editAreaId ?? ""}
                    onChange={(e) => setEditAreaId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">Sin área</option>
                    {areas?.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowTaskEdit(true)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200"
                    >
                      Editar tareas ({editTareas.filter((t) => t.titulo.trim()).length})
                    </button>
                    <span className="text-xs text-slate-400">
                      o creá nuevas desde el modal
                    </span>
                  </div>

                  {/* Acciones inline */}
                  <div className="flex gap-2 pt-2 border-t">
                    <button
                      type="button"
                      onClick={cancelInlineEdit}
                      disabled={editSaving}
                      className="px-4 py-2 text-sm rounded-lg border text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={saveInlineEdit}
                      disabled={editSaving || !editNombre.trim()}
                      className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {editSaving ? "Guardando..." : "Guardar"}
                    </button>
                    <div className="ml-auto flex gap-1">
                      <button
                        type="button"
                        onClick={() => setDeleteId(p.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Read-only View ── */
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">
                      {p.nombre}
                    </h3>
                    {p.descripcion && (
                      <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">
                        {p.descripcion}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {p.area_nombre && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                          {p.area_nombre}
                        </span>
                      )}
                      <p className="text-xs text-slate-400">
                        {Number(p.tareas_count) || 0} tarea
                        {Number(p.tareas_count) !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1 ml-4 shrink-0">
                    <button
                      onClick={() => startInlineEdit(p.id)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                      title="Editar"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setDeleteId(p.id)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                      title="Eliminar"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <PlantillaCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />

      <TaskEditModal
        open={showTaskEdit}
        tareas={editTareas}
        onSave={(tareas) => setEditTareas(tareas)}
        onClose={() => setShowTaskEdit(false)}
      />

      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar Plantilla"
        message={`¿Eliminar "${getDeleteName()}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />


    </div>
  );
}
