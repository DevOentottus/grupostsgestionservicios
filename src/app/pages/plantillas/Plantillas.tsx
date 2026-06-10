import { useState } from "react";
import {
  usePlantillas,
  usePlantilla,
  useCrearPlantilla,
  useEditarPlantilla,
  useEliminarPlantilla,
  useAplicarPlantilla,
} from "@/api/queries/usePlantillas.js";
import { useServicios } from "@/api/queries/useServicios.js";
import type { PlantillaTarea } from "@shared/index.js";

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

// ── Service Selector Modal ──
function ServiceSelectorModal({
  open,
  plantillaId,
  plantillaNombre,
  onClose,
}: {
  open: boolean;
  plantillaId: number;
  plantillaNombre: string;
  onClose: () => void;
}) {
  const { data: servicios } = useServicios();
  const aplicarPlantilla = useAplicarPlantilla();
  const [filter, setFilter] = useState("todos");

  if (!open) return null;

  const estados = ["todos", "pendiente", "en_progreso", "completado", "cancelado", "bloqueado"];
  const filtered = servicios?.filter((s: any) =>
    filter === "todos" ? true : s.estado === filter
  ) ?? [];

  const handleAplicar = async (servicioId: number) => {
    await aplicarPlantilla.mutateAsync({ plantillaId, servicioId });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col shadow-xl">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-slate-800">
            Aplicar Plantilla
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Seleccioná un servicio para aplicar "{plantillaNombre}"
          </p>
        </div>

        {/* Filtro rápido */}
        <div className="p-4 border-b flex gap-2 overflow-x-auto">
          {estados.map((e) => (
            <button
              key={e}
              onClick={() => setFilter(e)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                filter === e
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {e === "todos" ? "Todos" : e.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Lista de servicios */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">
              No hay servicios en esta categoría
            </p>
          )}
          {filtered.map((s: any) => (
            <button
              key={s.id}
              onClick={() => handleAplicar(s.id)}
              disabled={aplicarPlantilla.isPending}
              className="w-full text-left p-3 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors disabled:opacity-50"
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-mono text-slate-400">{s.codigo}</span>
                  <span className="ml-2 text-sm font-medium text-slate-800">{s.titulo}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  s.estado === "completado" ? "bg-green-100 text-green-700" :
                  s.estado === "en_progreso" ? "bg-blue-100 text-blue-700" :
                  s.estado === "bloqueado" ? "bg-red-100 text-red-700" :
                  s.estado === "cancelado" ? "bg-slate-100 text-slate-500" :
                  "bg-yellow-100 text-yellow-700"
                }`}>
                  {s.estado.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{s.cliente_nombre}</p>
            </button>
          ))}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm rounded-lg border text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Plantilla Form Modal ──
function PlantillaFormModal({
  open,
  editId,
  onClose,
}: {
  open: boolean;
  editId: number | null;
  onClose: () => void;
}) {
  const { data: editData } = usePlantilla(editId ?? 0);
  const crearPlantilla = useCrearPlantilla();
  const editarPlantilla = useEditarPlantilla();
  const isEditing = !!editId;

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tareas, setTareas] = useState<TareaFormItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Cargar datos de edición
  const [loaded, setLoaded] = useState(false);
  if (open && isEditing && editData && !loaded) {
    setNombre(editData.nombre);
    setDescripcion(editData.descripcion ?? "");
    setTareas(
      editData.tareas.map((t: PlantillaTarea) => ({
        key: `edit-${t.id}`,
        titulo: t.titulo,
      }))
    );
    setLoaded(true);
  }

  // Reset al abrir/cerrar
  const resetForm = () => {
    setNombre("");
    setDescripcion("");
    setTareas([]);
    setLoaded(false);
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

      if (isEditing) {
        await editarPlantilla.mutateAsync({
          id: editId,
          data: {
            nombre: nombre.trim(),
            descripcion: descripcion.trim() || null,
            tareas: tareasPayload,
          },
        });
      } else {
        await crearPlantilla.mutateAsync({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          tareas: tareasPayload,
        });
      }
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
            {isEditing ? "Editar Plantilla" : "Nueva Plantilla"}
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
                  {/* Reorder buttons */}
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
              {saving ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──
export function PlantillasPage() {
  const { data: plantillas, isLoading } = usePlantillas();
  const eliminarPlantilla = useEliminarPlantilla();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [applyTo, setApplyTo] = useState<{
    id: number;
    nombre: string;
  } | null>(null);

  const openCreate = () => {
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (id: number) => {
    setEditId(id);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    await eliminarPlantilla.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const getDeleteName = () => {
    if (!plantillas || deleteId === null) return "";
    const p = plantillas.find((x: any) => x.id === deleteId);
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
          onClick={openCreate}
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
          {plantillas.map((p: any) => (
            <div
              key={p.id}
              className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow"
            >
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
                  <p className="text-xs text-slate-400 mt-2">
                    {Number(p.tareas_count) || 0} tarea
                    {Number(p.tareas_count) !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="flex gap-1 ml-4 shrink-0">
                  <button
                    onClick={() =>
                      setApplyTo({ id: p.id, nombre: p.nombre })
                    }
                    className="text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
                    title="Aplicar a servicio"
                  >
                    Aplicar
                  </button>
                  <button
                    onClick={() => openEdit(p.id)}
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
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <PlantillaFormModal
        open={showForm}
        editId={editId}
        onClose={() => {
          setShowForm(false);
          setEditId(null);
        }}
      />

      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar Plantilla"
        message={`¿Eliminar "${getDeleteName()}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {applyTo && (
        <ServiceSelectorModal
          open={true}
          plantillaId={applyTo.id}
          plantillaNombre={applyTo.nombre}
          onClose={() => setApplyTo(null)}
        />
      )}
    </div>
  );
}
