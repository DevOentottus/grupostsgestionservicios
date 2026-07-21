import { useState, useEffect } from "react";
import { Star, ClipboardList, Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth.js";
import {
  usePlantillas,
  useCrearPlantilla,
  useEditarPlantilla,
  useEliminarPlantilla,
  useToggleFavorito,
} from "@/api/queries/usePlantillas.js";
import { useAreasTodas } from "@/api/queries/useAreas.js";
import { plantillasApi, serviciosApi } from "@/api/client.js";
import type { PlantillaWithTareas, PlantillaListItem } from "@/api/queries/usePlantillas.js";

interface TareaFormItem {
  key: string;
  titulo: string;
  obligatoria?: boolean;
}

// -- Confirm Dialog (inline component) --
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

// -- Plantilla Create Modal (sólo creación, sin edición) --
function PlantillaCreateModal({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: { rol: string; area_id: number | null } | null;
}) {
  const crearPlantilla = useCrearPlantilla();
  const { data: areas } = useAreasTodas();

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [areaId, setAreaId] = useState<number | "">("");
  const [tareas, setTareas] = useState<TareaFormItem[]>([]);
  const [saving, setSaving] = useState(false);

  const esEncargadoColaborador = user?.rol === "encargado" || user?.rol === "colaborador";
  const puedeGestionarObligatoria = user?.rol === "encargado" || user?.rol === "admin" || user?.rol === "sistema";

  useEffect(() => {
    if (!open) return;
    // Auto-asignar área para encargado/colaborador
    if (esEncargadoColaborador && user?.area_id) {
      setAreaId(user.area_id);
    } else {
      setAreaId("");
    }
  }, [open]);

  // Importar tareas desde un servicio existente
  const [servicios, setServicios] = useState<any[]>([]);
  const [loadingServicios, setLoadingServicios] = useState(false);
  const [selectedServicioId, setSelectedServicioId] = useState<number | "">("");
  const [importingTareas, setImportingTareas] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingServicios(true);
    serviciosApi.listar({ limit: 100 }).then((res) => {
      setServicios(res.data?.data || []);
    }).catch(() => {
      setServicios([]);
    }).finally(() => setLoadingServicios(false));
  }, [open]);

  const handleImportarTareas = async () => {
    if (!selectedServicioId) return;
    setImportingTareas(true);
    try {
      const res = await serviciosApi.listarTareas(Number(selectedServicioId));
      const tareasData = res.data?.data || [];
      const nuevasTareas: TareaFormItem[] = tareasData.map((t: any) => ({
        key: crypto.randomUUID(),
        titulo: t.titulo,
      }));
      setTareas((prev) => [...prev, ...nuevasTareas]);
      setSelectedServicioId("");
    } catch {
      // silencio
    } finally {
      setImportingTareas(false);
    }
  };

  const resetForm = () => {
    setNombre("");
    setDescripcion("");
    setAreaId("");
    setTareas([]);
  };

  if (!open) return null;

  const addTarea = () => {
    setTareas([...tareas, { key: crypto.randomUUID(), titulo: "", obligatoria: false }]);
  };

  const removeTarea = (key: string) => {
    setTareas(tareas.filter((t) => t.key !== key));
  };

  const updateTarea = (key: string, value: string | Partial<TareaFormItem>) => {
    if (typeof value === 'string') {
      setTareas(tareas.map((t) => (t.key === key ? { ...t, titulo: value } : t)));
    } else {
      setTareas(tareas.map((t) => (t.key === key ? { ...t, ...value } : t)));
    }
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
        .map((t, i) => ({ titulo: t.titulo.trim(), sort_order: i, obligatoria: t.obligatoria ?? false }));

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

          {/* Área — solo admin/sistema pueden elegir */}
          {!esEncargadoColaborador && (
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
          )}

          {/* Importar tareas desde servicio */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <ClipboardList className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
              Importar tareas desde servicio
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedServicioId}
                onChange={(e) => setSelectedServicioId(e.target.value ? Number(e.target.value) : "")}
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                disabled={loadingServicios}
              >
                <option value="">{loadingServicios ? "Cargando servicios..." : "Seleccionar servicio..."}</option>
                {servicios.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.codigo} — {s.titulo}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleImportarTareas}
                disabled={!selectedServicioId || importingTareas}
                className="text-xs px-3 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 whitespace-nowrap"
              >
                {importingTareas ? "Importando..." : "Importar"}
              </button>
            </div>
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
                  <button
                    type="button"
                    onClick={() => updateTarea(tarea.key, { obligatoria: !tarea.obligatoria })}
                    disabled={!puedeGestionarObligatoria}
                    className={`p-1.5 rounded shrink-0 transition-colors ${
                      !puedeGestionarObligatoria
                        ? "bg-slate-50 text-slate-200 cursor-not-allowed"
                        : tarea.obligatoria
                          ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                          : "bg-slate-50 text-slate-300 hover:text-slate-400"
                    }`}
                    title={
                      !puedeGestionarObligatoria
                        ? "Solo el encargado puede marcar tareas como obligatorias"
                        : tarea.obligatoria
                          ? "Obligatoria (técnico no puede eliminarla)"
                          : "Voluntaria"
                    }
                  >
                    <svg className="w-3.5 h-3.5" fill={tarea.obligatoria ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  </button>
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

// -- Main Page --
export function PlantillasPage() {
  const { user } = useAuth();
  const { data: plantillas, isLoading } = usePlantillas();
  const { data: areas } = useAreasTodas();
  const editarPlantilla = useEditarPlantilla();
  const eliminarPlantilla = useEliminarPlantilla();
  const toggleFavorito = useToggleFavorito();
  const [filterArea, setFilterArea] = useState<number | "">("");

  const esAdminSistema = user?.rol === "admin" || user?.rol === "sistema";
  const esEncargadoColaborador = user?.rol === "encargado" || user?.rol === "colaborador";
  const puedeGestionarObligatoria = user?.rol === "encargado" || user?.rol === "admin" || user?.rol === "sistema";
  const puedeEliminarPlantilla = user?.rol !== "colaborador";

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

  // Expandable task list
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedTareas, setExpandedTareas] = useState<Record<number, { titulo: string; orden: number; obligatoria?: boolean }[]>>({});
  const [loadingTareas, setLoadingTareas] = useState<number | null>(null);

  const toggleExpand = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!expandedTareas[id]) {
      setLoadingTareas(id);
      try {
        const res = await plantillasApi.obtener(id);
        const data = res.data.data as PlantillaWithTareas;
        setExpandedTareas((prev) => ({ ...prev, [id]: data.tareas }));
      } catch {
        setExpandedTareas((prev) => ({ ...prev, [id]: [] }));
      } finally {
        setLoadingTareas(null);
      }
    }
  };

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
          obligatoria: t.obligatoria,
        }))
      );
    } catch {
      // silently fail -- keep card readonly
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
        .map((t, i) => ({ titulo: t.titulo.trim(), sort_order: i, obligatoria: t.obligatoria ?? false }));
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

  // -- Task editing helpers (inline) --
  const addEditTarea = () => {
    setEditTareas([...editTareas, { key: crypto.randomUUID(), titulo: "" }]);
  };

  const removeEditTarea = (key: string) => {
    setEditTareas(editTareas.filter((t) => t.key !== key));
  };

  const updateEditTarea = (key: string, titulo: string) => {
    setEditTareas(editTareas.map((t) => (t.key === key ? { ...t, titulo } : t)));
  };

  const toggleEditTareaObligatoria = (key: string) => {
    setEditTareas(tareas => tareas.map(t => t.key === key ? { ...t, obligatoria: !t.obligatoria } : t));
  };

  const moveEditTarea = (index: number, direction: "up" | "down") => {
    const newTareas = [...editTareas];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= newTareas.length) return;
    [newTareas[index], newTareas[target]] = [newTareas[target], newTareas[index]];
    setEditTareas(newTareas);
  };

  // Área → tono de gris para la barra superior + contraste de texto
  const AREA_THEME: Record<number, { bar: string; text: string }> = {
    90:  { bar: "bg-gray-300", text: "text-gray-900" },
    92:  { bar: "bg-gray-500", text: "text-white"     },
    93:  { bar: "bg-gray-700", text: "text-white"     },
  };
  const DEFAULT_THEME = { bar: "bg-gray-200", text: "text-gray-900" };

  const areaTheme = (areaId: number | null) =>
    areaId ? AREA_THEME[areaId] || DEFAULT_THEME : DEFAULT_THEME;

  const plantillasFiltradas = (plantillas as PlantillaListItem[] || [])
    .filter((p) => {
      if (esAdminSistema) {
        return !filterArea || p.area_id === filterArea;
      }
      if (esEncargadoColaborador) {
        return p.area_id === user?.area_id;
      }
      return true;
    })
    .sort((a, b) => {
      // Favoritos primero
      if (a.es_favorito && !b.es_favorito) return -1;
      if (!a.es_favorito && b.es_favorito) return 1;
      return a.nombre.localeCompare(b.nombre);
    });

  return (
    <div className="space-y-4">
      {/* Header gradiente */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-5 text-white shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-bold text-white">
            {esAdminSistema ? "Plantillas de proceso" : "Plantillas de área"}
          </h1>
          <div className="flex items-center gap-2">
            {esAdminSistema && (
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value ? Number(e.target.value) : "")}
                className="rounded-xl border border-white/20 bg-white/15 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/20 [&>option]:bg-slate-800 [&>option]:text-white"
              >
                <option value="">Todas las áreas</option>
                {(areas || []).map((a: any) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-blue-900 transition hover:bg-yellow-500"
            >
              + Nueva Plantilla
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && <p className="text-slate-500">Cargando...</p>}

      {/* Empty state — filtrado sin resultados */}
      {!isLoading && plantillas && plantillas.length > 0 && plantillasFiltradas.length === 0 && (
        <div className="bg-white rounded-xl border p-12 text-center">
          <p className="text-slate-400 text-sm">
            No hay plantillas para mostrar con los filtros actuales.
          </p>
        </div>
      )}

      {/* Empty state — sin plantillas en el sistema */}
      {!isLoading && (!plantillas || plantillas.length === 0) && (
        <div className="bg-white rounded-xl border p-12 text-center">
          <p className="text-slate-400 text-sm">
            No hay plantillas. Creá una para agilizar la creación de servicios.
          </p>
        </div>
      )}

      {/* List */}
      {!isLoading && plantillasFiltradas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plantillasFiltradas.map((p) => {
            const theme = areaTheme(p.area_id);
            return (
            <div
              key={p.id}
              className={`rounded-xl border transition-shadow overflow-hidden bg-white ${
                editingId === p.id
                  ? "ring-2 ring-blue-400 shadow-md"
                  : expandedId === p.id
                  ? "shadow-md"
                  : "hover:shadow-sm"
              }`}
            >
              {/* Área top bar — escala de grises */}
              <div className={`h-1.5 ${theme.bar}`} />
              <div className="p-4">
              {editingId === p.id ? (
                /* -- Inline Edit Mode -- */
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
                  {/* Área — solo admin/sistema pueden editar */}
                  {esAdminSistema && (
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
                  )}
                  {/* Tareas inline */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-slate-700">
                        Tareas
                      </label>
                      <button
                        type="button"
                        onClick={addEditTarea}
                        className="text-xs px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                      >
                        + Agregar tarea
                      </button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {editTareas.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-3">
                          Sin tareas. Agregá al menos una.
                        </p>
                      )}
                      {editTareas.map((tarea, index) => {
                        const esObligatoriaBloqueada = tarea.obligatoria && !puedeGestionarObligatoria;
                        return (
                        <div key={tarea.key} className="flex items-center gap-2">
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => moveEditTarea(index, "up")}
                              disabled={index === 0 || esObligatoriaBloqueada}
                              className="text-[10px] leading-none px-1 py-0.5 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                              title="Subir"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => moveEditTarea(index, "down")}
                              disabled={index === editTareas.length - 1 || esObligatoriaBloqueada}
                              className="text-[10px] leading-none px-1 py-0.5 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                              title="Bajar"
                            >
                              ▼
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleEditTareaObligatoria(tarea.key)}
                            disabled={!puedeGestionarObligatoria}
                            className={`p-1.5 rounded shrink-0 transition-colors ${
                              !puedeGestionarObligatoria
                                ? "bg-slate-50 text-slate-200 cursor-not-allowed"
                                : tarea.obligatoria
                                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                  : "bg-slate-50 text-slate-300 hover:text-slate-400"
                            }`}
                            title={
                              !puedeGestionarObligatoria
                                ? "Solo el encargado puede marcar tareas como obligatorias"
                                : tarea.obligatoria
                                  ? "Obligatoria (técnico no puede eliminarla)"
                                  : "Voluntaria"
                            }
                          >
                            <svg className="w-3.5 h-3.5" fill={tarea.obligatoria ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                          </button>
                          <input
                            value={tarea.titulo}
                            onChange={(e) => updateEditTarea(tarea.key, e.target.value)}
                            disabled={esObligatoriaBloqueada}
                            className={`flex-1 px-3 py-2 border rounded-lg text-sm ${esObligatoriaBloqueada ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}`}
                            placeholder={`Tarea ${index + 1}`}
                          />
                          {!esObligatoriaBloqueada && (
                            <button
                              type="button"
                              onClick={() => removeEditTarea(tarea.key)}
                              className="text-xs px-2 py-2 rounded bg-red-50 text-red-500 hover:bg-red-100"
                              title="Eliminar tarea"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );})}
                    </div>
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
                    {puedeEliminarPlantilla && (
                      <div className="ml-auto flex gap-1">
                        <button
                          type="button"
                          onClick={() => setDeleteId(p.id)}
                          className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                          title="Eliminar permanentemente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* -- Read-only View -- */
                <div>
                  {/* Top row: title + actions */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-800 truncate">
                        {p.nombre}
                      </h3>
                    </div>
                    <div className="flex gap-1 shrink-0 items-center ml-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorito.mutate(p.id); }}
                        className="shrink-0 p-1 rounded hover:bg-slate-100 transition-colors"
                        title={p.es_favorito ? "Quitar de favoritos" : "Agregar a favoritos"}
                      >
                        <Star
                          className={`w-4 h-4 ${p.es_favorito ? "fill-yellow-400 text-yellow-400" : "text-gray-900 hover:text-yellow-400"}`}
                        />
                      </button>
                      <button
                        onClick={() => startInlineEdit(p.id)}
                        className="p-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {puedeEliminarPlantilla && (
                        <button
                          onClick={() => setDeleteId(p.id)}
                          className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                          title="Eliminar permanentemente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Description — full width */}
                  {p.descripcion && (
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                      {p.descripcion}
                    </p>
                  )}

                  {/* Area + tareas count + expand — same row */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {p.area_nombre && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                        {p.area_nombre}
                      </span>
                    )}
                    <p className="text-xs text-slate-400 ml-auto">
                      {Number(p.tareas_count) || 0} tarea
                      {Number(p.tareas_count) !== 1 ? "s" : ""}
                    </p>
                    {Number(p.tareas_count) > 0 && (
                      <button
                        onClick={() => toggleExpand(p.id)}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        <span className="font-medium">
                          {expandedId === p.id ? "Ocultar tareas" : "Ver tareas"}
                        </span>
                        <svg
                          className={`w-3.5 h-3.5 transition-transform ${expandedId === p.id ? "rotate-180" : ""}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Expanded tareas list */}
                  {expandedId === p.id && (
                    <div className="mt-2 border-t border-slate-100 pt-2 space-y-1">
                      {loadingTareas === p.id ? (
                        <p className="text-xs text-slate-400 text-center py-2">Cargando tareas...</p>
                      ) : expandedTareas[p.id]?.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-2">Sin tareas</p>
                      ) : (
                        expandedTareas[p.id]?.map((t, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-slate-700 py-1">
                            <span className="text-xs text-slate-400 font-mono mt-0.5 w-5 shrink-0 text-right">
                              {i + 1}.
                            </span>
                            {t.obligatoria && (
                              <svg className="w-3 h-3 shrink-0 text-amber-500 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0110 0v4" />
                              </svg>
                            )}
                            <span>{t.titulo}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <PlantillaCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        user={user}
      />

      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminación permanente"
        message={`¿Eliminar permanentemente "${getDeleteName()}"? Esta acción no se puede deshacer y no hay forma de recuperarla.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />


    </div>
  );
}
