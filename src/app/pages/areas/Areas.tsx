import { useState } from "react";
import {
  useAreas,
  useArea,
  useCrearArea,
  useEditarArea,
  useEliminarArea,
  useAsignarColaborador,
  useRemoverColaborador,
} from "@/api/queries/useAreas.js";
import { useUsuarios } from "@/api/queries/useUsuarios.js";
import { useServicios } from "@/api/queries/useServicios.js";
import { useAuth } from "@/lib/auth.js";
import { cn } from "@/app/lib/utils";
import type { AreaWithEncargado, AreaWithColaboradores } from "@shared/index.js";
import {
  MapPin, Users, ClipboardList, CheckCircle2, Clock, AlertTriangle,
  Plus, Edit2, Trash2, X, ChevronRight, ArrowLeft,
} from "lucide-react";

export function AreasPage() {
  const { user } = useAuth();
  const { data: areas, isLoading: areasLoading } = useAreas();
  const { data: usuarios } = useUsuarios();
  const { data: servicios } = useServicios();
  const crearArea = useCrearArea();
  const editarArea = useEditarArea();
  const eliminarArea = useEliminarArea();
  const asignarColaborador = useAsignarColaborador();
  const removerColaborador = useRemoverColaborador();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: selectedDetail, isLoading: detailLoading } = useArea(selectedId ?? 0);
  const [showModal, setShowModal] = useState(false);
  const [editingArea, setEditingArea] = useState<AreaWithEncargado | null>(null);
  const [form, setForm] = useState({ nombre: "", encargado_id: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<AreaWithEncargado | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [newColabUserId, setNewColabUserId] = useState("");

  const resetForm = () => {
    setForm({ nombre: "", encargado_id: "" });
    setEditingArea(null);
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      nombre: form.nombre,
      encargado_id: form.encargado_id ? parseInt(form.encargado_id) : null,
    };
    if (editingArea) {
      await editarArea.mutateAsync({ id: editingArea.id, data });
    } else {
      await crearArea.mutateAsync(data);
    }
    resetForm();
  };

  const handleEdit = (area: AreaWithEncargado) => {
    setEditingArea(area);
    setForm({
      nombre: area.nombre,
      encargado_id: area.encargado_id?.toString() || "",
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await eliminarArea.mutateAsync(deleteConfirm.id);
    if (selectedId === deleteConfirm.id) {
      setSelectedId(null);
    }
    setDeleteConfirm(null);
  };

  const handleAsignarColaborador = async () => {
    if (!selectedId || !newColabUserId) return;
    await asignarColaborador.mutateAsync({
      areaId: selectedId,
      usuarioId: parseInt(newColabUserId),
    });
    setNewColabUserId("");
  };

  const handleRemoverColaborador = async (usuarioId: number) => {
    if (!selectedId) return;
    await removerColaborador.mutateAsync({ areaId: selectedId, usuarioId });
  };

  const selectArea = (id: number) => {
    setSelectedId(id);
    setMobileView("detail");
  };

  // Encargado: solo ve su propia área
  const visibleAreas = user?.rol === "encargado"
    ? (areas || []).filter((a) => a.id === user.area_id)
    : (areas || []);

  const getAreaServiceStats = (areaId: number) => {
    if (!servicios) return { total: 0, pendientes: 0, en_progreso: 0, completados: 0, bloqueados: 0 };
    const areaServicios = servicios.filter((s: any) => s.area_id === areaId);
    return {
      total: areaServicios.length,
      pendientes: areaServicios.filter((s: any) => s.estado === "pendiente").length,
      en_progreso: areaServicios.filter((s: any) => s.estado === "en_progreso").length,
      completados: areaServicios.filter((s: any) => s.estado === "completado").length,
      bloqueados: areaServicios.filter((s: any) => s.estado === "bloqueado").length,
    };
  };

  const disponibles = usuarios?.filter(
    (u: any) =>
      u.rol === "colaborador" &&
      !selectedDetail?.colaboradores?.some((c: any) => c.usuario_id === u.id)
  ) || [];

  if (areasLoading) {
    return <p className="text-gray-500">Cargando áreas...</p>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {mobileView === "detail" && selectedId ? (
            <button
              onClick={() => { setMobileView("list"); setSelectedId(null); }}
              className="lg:hidden flex items-center gap-2 text-sm text-blue-700 font-semibold mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a áreas
            </button>
          ) : null}
          <h1 className="text-gray-900 font-bold">Áreas de Servicio</h1>
          <p className="text-gray-500 text-sm">{visibleAreas.length} áreas registradas</p>
        </div>

        {user?.rol !== "encargado" && (
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            Nueva Área
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ===== LEFT PANEL: Area list (40%) ===== */}
        <div className={cn("lg:col-span-2 space-y-3", mobileView === "detail" && "hidden lg:block")}>
          {visibleAreas.map((area: AreaWithEncargado) => {
            const stats = getAreaServiceStats(area.id);
            const isSelected = selectedId === area.id;
  // Área → tono de gris para la barra superior
  const AREA_THEME: Record<number, string> = {
    90: "bg-gray-300",
    92: "bg-gray-500",
    93: "bg-gray-700",
  };
  const DEFAULT_BAR = "bg-gray-200";
  const areaBarClass = (areaId: number) => AREA_THEME[areaId] || DEFAULT_BAR;

  return (
              <button
                key={area.id}
                onClick={() => selectArea(area.id)}
                className={cn(
                  "w-full text-left rounded-2xl shadow-sm border transition overflow-hidden",
                  isSelected
                    ? "bg-blue-900 border-blue-800 text-white"
                    : "bg-white border-gray-100 hover:border-blue-200",
                )}
              >
                <div className={`h-1.5 ${areaBarClass(area.id)}`} />
                <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      isSelected ? "bg-yellow-400" : "bg-blue-900",
                    )}>
                      <MapPin className={cn("w-5 h-5", isSelected ? "text-blue-900" : "text-yellow-400")} />
                    </div>
                    <div>
                      <p className={cn("text-sm font-bold", isSelected ? "text-white" : "text-gray-900")}>
                        {area.nombre}
                      </p>
                      <p className={cn("text-xs", isSelected ? "text-blue-200" : "text-gray-500")}>
                        {area.colaborador_count || 0} colaboradores
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={cn("w-4 h-4", isSelected ? "text-yellow-400 rotate-90" : "text-gray-400")} />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Total", value: stats.total, color: isSelected ? "bg-blue-800" : "bg-gray-100" },
                    { label: "Activos", value: stats.en_progreso, color: isSelected ? "bg-blue-700" : "bg-blue-50" },
                    { label: "Listos", value: stats.completados, color: isSelected ? "bg-green-800" : "bg-green-50" },
                  ].map((s) => (
                    <div key={s.label} className={cn(s.color, "rounded-xl p-2 text-center")}>
                      <p className={cn("text-base font-bold", isSelected ? "text-white" : "text-gray-900")}>
                        {s.value}
                      </p>
                      <p className={cn("text-xs", isSelected ? "text-blue-200" : "text-gray-500")}>
                        {s.label}
                      </p>
                    </div>
                  ))}
                  </div>
                </div>
              </button>
            );
          })}
          {visibleAreas.length === 0 && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
              <MapPin className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No hay áreas registradas</p>
            </div>
          )}
        </div>

        {/* ===== RIGHT PANEL: Detail view (60%) ===== */}
        <div className={cn("lg:col-span-3", mobileView === "list" && "hidden lg:block")}>
          {selectedId ? (
            detailLoading ? (
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-48" />
                <div className="h-4 bg-gray-200 rounded w-32" />
                <div className="h-20 bg-gray-200 rounded" />
              </div>
            ) : selectedDetail ? (
              <div className="space-y-4">
                {/* Header card */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-900 rounded-2xl flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-yellow-400" />
                      </div>
                      <div>
                        <h2 className="text-gray-900 font-bold">{selectedDetail.nombre}</h2>
                      </div>
                    </div>
                    {user?.rol !== "encargado" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(visibleAreas.find((a: any) => a.id === selectedId) as AreaWithEncargado)}
                        className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(visibleAreas.find((a: any) => a.id === selectedId) as AreaWithEncargado)}
                        className="p-2 rounded-xl hover:bg-red-50 text-red-500 transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    )}
                  </div>

                  {/* Stats cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: "Servicios", value: getAreaServiceStats(selectedId).total, icon: ClipboardList, color: "bg-blue-100 text-blue-700" },
                      { label: "En Progreso", value: getAreaServiceStats(selectedId).en_progreso, icon: Clock, color: "bg-blue-100 text-blue-700" },
                      { label: "Completados", value: getAreaServiceStats(selectedId).completados, icon: CheckCircle2, color: "bg-green-100 text-green-700" },
                      { label: "Colaboradores", value: selectedDetail.colaboradores?.length || 0, icon: Users, color: "bg-purple-100 text-purple-700" },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-gray-50 rounded-xl p-3">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-1", stat.color)}>
                          <stat.icon className="w-4 h-4" />
                        </div>
                        <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                        <p className="text-xs text-gray-500">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Colaboradores section */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-blue-800" />
                    <h3 className="text-gray-800 font-semibold">Colaboradores del Área</h3>
                  </div>

                  {/* Add collaborator -- arriba de la lista */}
                  {disponibles.length > 0 && (
                    <div className="mb-4 flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 block mb-1 font-semibold">Agregar colaborador</label>
                        <select
                          value={newColabUserId}
                          onChange={(e) => setNewColabUserId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 bg-gray-50"
                        >
                          <option value="">Seleccionar...</option>
                          {disponibles.map((u: any) => (
                            <option key={u.id} value={u.id}>
                              {u.nombres} — {u.email}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={handleAsignarColaborador}
                        disabled={!newColabUserId || asignarColaborador.isPending}
                        className="bg-blue-900 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-800 transition disabled:opacity-50 font-semibold"
                      >
                        Asignar
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedDetail.colaboradores?.map((col: any) => (
                      <div key={col.usuario_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">
                              {col.nombres?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-gray-900 text-sm font-semibold truncate">{col.nombres}</p>
                            <p className="text-gray-500 text-xs">@{col.username}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoverColaborador(col.usuario_id)}
                          className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition"
                          title="Remover del área"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {(!selectedDetail.colaboradores || selectedDetail.colaboradores.length === 0) && (
                      <p className="text-gray-400 text-sm col-span-2">No hay colaboradores asignados a esta área</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
                <p className="text-gray-400">Error al cargar el detalle del área</p>
              </div>
            )
          ) : (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center h-full min-h-64">
              <MapPin className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">Seleccioná un área para ver su detalle</p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-gray-900 font-bold">
                {editingArea ? "Editar Área" : "Nueva Área"}
              </h3>
              <button onClick={resetForm} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-xs text-gray-600 font-semibold mb-1">Nombre del Área *</label>
                  <input
                    type="text"
                    placeholder="Ej: Mantenimiento Industrial"
                    value={form.nombre}
                    onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 font-semibold mb-1">
                    Encargado <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <select
                    value={form.encargado_id}
                    onChange={(e) => setForm((p) => ({ ...p, encargado_id: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50"
                  >
                    <option value="">Sin encargado</option>
                    {usuarios
                      ?.filter((u: any) => {
                        if (editingArea && selectedDetail) {
                          // Solo colaboradores del área + el encargado actual (por si ya no es colaborador)
                          return selectedDetail.colaboradores.some((c) => c.usuario_id === u.id)
                            || u.id === editingArea.encargado_id;
                        }
                        return u.rol !== "sistema";
                      })
                      .map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.nombres} ({u.rol})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={crearArea.isPending || editarArea.isPending}
                  className="flex-1 bg-blue-900 text-white rounded-xl py-2.5 text-sm hover:bg-blue-800 transition disabled:opacity-50 font-semibold"
                >
                  {editarArea.isPending || crearArea.isPending ? "Guardando..." : editingArea ? "Actualizar" : "Crear Área"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-gray-900 font-bold">Eliminar Área</h3>
            <p className="text-sm text-gray-600">
              ¿Estás seguro de eliminar el área <strong>"{deleteConfirm.nombre}"</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={eliminarArea.isPending}
                className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm hover:bg-red-700 transition disabled:opacity-50 font-semibold"
              >
                {eliminarArea.isPending ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
