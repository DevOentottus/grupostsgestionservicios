import { useState } from "react";
import { useAuth } from "@/lib/auth.js";
import { useUsuarios, useCrearUsuario, useEditarUsuario, useToggleUsuario } from "@/api/queries/useUsuarios.js";
import { useAreas } from "@/api/queries/useAreas.js";
import { cn } from "@/app/lib/utils";
import type { Usuario } from "@shared/index.js";
import {
  UserPlus, Search, Edit2, ToggleRight, ToggleLeft, X, Check, ChevronDown,
  Shield, MapPin, AlertCircle,
} from "lucide-react";

const rolDisplay: Record<string, string> = {
  admin: "Administrador",
  encargado: "Encargado",
  colaborador: "Colaborador",
  sistema: "Sistema",
};

const rolColors: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800",
  encargado: "bg-blue-100 text-blue-800",
  colaborador: "bg-yellow-100 text-yellow-800",
  sistema: "bg-red-100 text-red-800",
};

interface UsuarioForm {
  username: string;
  password: string;
  nombres: string;
  email: string;
  rol: string;
  area_ids: number[];
}

const emptyForm: UsuarioForm = {
  username: "",
  password: "",
  nombres: "",
  email: "",
  rol: "colaborador",
  area_ids: [],
};

export function UsuariosPage() {
  const { user: currentUser } = useAuth();
  const { data: usuarios, isLoading, isError, error } = useUsuarios();
  const { data: areas } = useAreas();
  const crearUsuario = useCrearUsuario();
  const editarUsuario = useEditarUsuario();
  const toggleUsuario = useToggleUsuario();

  const [search, setSearch] = useState("");
  const [filterRol, setFilterRol] = useState("Todos");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [form, setForm] = useState<UsuarioForm>(emptyForm);
  const [confirmToggle, setConfirmToggle] = useState<Usuario | null>(null);

  const filtered = (usuarios || []).filter((u: Usuario) => {
    const matchSearch = `${u.nombres} ${u.username} ${u.email}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchRol = filterRol === "Todos" || u.rol === filterRol;
    return matchSearch && matchRol;
  });

  const openAdd = () => {
    setEditingUser(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (u: Usuario) => {
    setEditingUser(u);
    setForm({
      username: u.username,
      password: "",
      nombres: u.nombres,
      email: u.email,
      rol: u.rol,
      area_ids: u.area_ids || [],
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nombres || !form.email) return;
    const payload: Record<string, unknown> = {
      nombres: form.nombres,
      email: form.email,
      rol: form.rol,
    };
    if (form.username) payload.username = form.username;
    if (form.password) payload.password = form.password;
    if ((form.rol === "encargado" || form.rol === "colaborador") && form.area_ids.length > 0) {
      payload.area_ids = form.area_ids;
    } else {
      payload.area_ids = [];
    }

    if (editingUser) {
      await editarUsuario.mutateAsync({ id: editingUser.id, data: payload });
    } else {
      await crearUsuario.mutateAsync(payload);
    }
    setShowModal(false);
    setForm({ ...emptyForm });
  };

  const handleToggle = async (u: Usuario) => {
    await toggleUsuario.mutateAsync(u.id);
    setConfirmToggle(null);
  };

  const toggleAreaId = (areaId: number) => {
    setForm((prev) => ({
      ...prev,
      area_ids: prev.area_ids.includes(areaId)
        ? prev.area_ids.filter((id) => id !== areaId)
        : [...prev.area_ids, areaId],
    }));
  };

  const canManage = currentUser?.rol === "sistema";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-gray-900 font-bold">Usuarios</h1>
          <p className="text-gray-500 text-sm">
            {usuarios?.filter((u: Usuario) => u.activo).length || 0} activos ·{" "}
            {usuarios?.filter((u: Usuario) => !u.activo).length || 0} inactivos
          </p>
        </div>
        {canManage && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo Usuario
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, usuario, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50"
            />
          </div>
          <div className="relative">
            <select
              value={filterRol}
              onChange={(e) => setFilterRol(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 cursor-pointer"
            >
              <option value="Todos">Todos los roles</option>
              <option value="admin">Administrador</option>
              <option value="encargado">Encargado</option>
              <option value="colaborador">Colaborador</option>
              <option value="sistema">Sistema</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Error */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 text-sm font-semibold">Error al cargar usuarios</p>
            <p className="text-red-600 text-xs mt-1">
              {(error as any)?.response?.data?.detail || (error as any)?.message || "Error de conexión"}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Usuario", "Nombres", "Email", "Rol", "Estado", "Acciones"].map((h) => (
                  <th key={h} className="text-left text-xs text-gray-500 px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                filtered.map((u: Usuario) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-lg font-semibold">
                        @{u.username}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                          u.rol === "encargado" ? "bg-blue-700" : u.rol === "admin" ? "bg-purple-700" : "bg-blue-900",
                        )}>
                          <span className="text-white text-xs font-bold">
                            {u.nombres?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-gray-900 text-sm font-semibold">{u.nombres}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-600">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-1 rounded-full font-medium", rolColors[u.rol] || "bg-gray-100 text-gray-600")}>
                        {rolDisplay[u.rol] || u.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium",
                        u.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500",
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", u.activo ? "bg-green-500" : "bg-gray-400")} />
                        {u.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {canManage && (
                          <>
                            <button
                              onClick={() => openEdit(u)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-700 transition"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmToggle(u)}
                              className={cn(
                                "p-1.5 rounded-lg transition",
                                u.activo ? "hover:bg-red-50 text-red-600" : "hover:bg-green-50 text-green-600",
                              )}
                              title={u.activo ? "Desactivar" : "Activar"}
                            >
                              {u.activo ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-gray-900 font-bold">
                {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 font-semibold mb-1">Username *</label>
                  <input
                    type="text"
                    placeholder="Ej: jgarcia01"
                    value={form.username}
                    onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
                    required
                  />
                </div>
                {!editingUser && (
                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-1">
                      Contraseña {!editingUser && "*"}
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
                      required={!editingUser}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-600 font-semibold mb-1">Nombres *</label>
                  <input
                    type="text"
                    placeholder="Nombres completos"
                    value={form.nombres}
                    onChange={(e) => setForm((p) => ({ ...p, nombres: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 font-semibold mb-1">Email *</label>
                  <input
                    type="email"
                    placeholder="correo@empresa.com"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
                    required
                  />
                </div>
              </div>

              {/* Rol selector */}
              <div>
                <label className="block text-xs text-gray-600 font-semibold mb-1">Rol</label>
                <select
                  value={form.rol}
                  onChange={(e) => setForm((p) => {
                    const newRol = e.target.value;
                    if (newRol !== "encargado" && newRol !== "colaborador") {
                      return { ...p, rol: newRol, area_ids: [] };
                    }
                    return { ...p, rol: newRol };
                  })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
                >
                  <option value="colaborador">Colaborador</option>
                  <option value="encargado">Encargado</option>
                  <option value="admin">Administrador</option>
                  <option value="sistema">Sistema</option>
                </select>
              </div>

              {/* Area assignment for encargado/colaborador */}
              {(form.rol === "encargado" || form.rol === "colaborador") && areas && areas.length > 0 && (
                <div className="border border-blue-100 rounded-xl p-4 bg-blue-50 space-y-3">
                  <p className="text-xs text-blue-800 font-bold flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    ASIGNACIÓN DE ÁREAS
                  </p>
                  <p className="text-xs text-blue-600">
                    {form.rol === "encargado"
                      ? "Seleccioná las áreas que va a supervisar:"
                      : "Seleccioná las áreas donde va a trabajar:"}
                  </p>
                  <div className="space-y-2">
                    {areas.map((a: any) => (
                      <label
                        key={a.id}
                        className="flex items-center gap-2 cursor-pointer select-none group"
                      >
                        <div
                          onClick={() => toggleAreaId(a.id)}
                          className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center transition",
                            form.area_ids.includes(a.id)
                              ? "bg-blue-600 border-blue-600"
                              : "bg-white border-gray-300 group-hover:border-blue-400",
                          )}
                        >
                          {form.area_ids.includes(a.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-sm text-gray-700">{a.nombre}</span>
                      </label>
                    ))}
                  </div>
                  {form.area_ids.length > 0 && (
                    <div className="bg-white rounded-lg px-3 py-2 border border-gray-200 text-xs text-gray-600">
                      <Shield className="w-3 h-3 inline mr-1 text-blue-600" />
                      Áreas asignadas: <span className="font-semibold">{form.area_ids.length}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Info for editing */}
              {editingUser && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Dejá la contraseña en blanco para mantener la actual.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={editarUsuario.isPending || crearUsuario.isPending}
                className="flex-1 bg-blue-900 text-white rounded-xl py-2.5 text-sm hover:bg-blue-800 transition disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
              >
                <Check className="w-4 h-4" />
                {editingUser ? "Guardar cambios" : "Registrar usuario"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm toggle dialog */}
      {confirmToggle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-gray-900 font-bold">
              {confirmToggle.activo ? "Desactivar Usuario" : "Activar Usuario"}
            </h3>
            <p className="text-sm text-gray-600">
              {confirmToggle.activo
                ? `¿Estás seguro de desactivar a "${confirmToggle.nombres}"? El usuario no podrá iniciar sesión.`
                : `¿Estás seguro de activar a "${confirmToggle.nombres}"?`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmToggle(null)}
                className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleToggle(confirmToggle)}
                className={cn(
                  "flex-1 rounded-xl py-2.5 text-sm font-semibold transition text-white",
                  confirmToggle.activo ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700",
                )}
              >
                {confirmToggle.activo ? "Desactivar" : "Activar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
