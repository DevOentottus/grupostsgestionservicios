import { useState } from "react";
import { useAuth } from "@/lib/auth.js";
import { useUsuarios, useCrearUsuario, useEditarUsuario, useToggleUsuario } from "@/api/queries/useUsuarios.js";

import { cn } from "@/app/lib/utils";
import type { Usuario } from "@shared/index.js";
import {
  UserPlus, Search, Edit2, ToggleRight, ToggleLeft, X, Check, ChevronDown,
  AlertCircle,
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
  apellido_paterno: string;
  apellido_materno: string;
  dni: string;
  telefono: string;
  email: string;
  rol: string;
}

function generarUsernamePreview(nombres: string, apellidoPaterno: string): string {
  const normalize = (s: string) =>
    s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ñ/g, "n").replace(/Ñ/g, "N");
  const clean = (s: string) =>
    normalize(s).toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const pNombre = clean(nombres).split(/\s+/)[0] || "";
  const pApellido = clean(apellidoPaterno).split(/\s+/)[0] || "";
  if (!pNombre || !pApellido) return "";
  return `${pNombre}.${pApellido}`;
}

const emptyForm: UsuarioForm = {
  username: "",
  password: "",
  nombres: "",
  apellido_paterno: "",
  apellido_materno: "",
  dni: "",
  telefono: "",
  email: "",
  rol: "colaborador",
};

export function UsuariosPage() {
  const { user: currentUser } = useAuth();
  const { data: usuarios, isLoading, isError, error } = useUsuarios();
  const crearUsuario = useCrearUsuario();
  const editarUsuario = useEditarUsuario();
  const toggleUsuario = useToggleUsuario();

  const [search, setSearch] = useState("");
  const [filterRol, setFilterRol] = useState("Todos");
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [form, setForm] = useState<UsuarioForm>(emptyForm);
  const [confirmToggle, setConfirmToggle] = useState<Usuario | null>(null);

  const filtered = (usuarios || []).filter((u: Usuario) => {
    const matchSearch = `${u.nombres} ${u.apellidos || ""} ${u.username} ${u.email}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchRol = filterRol === "Todos" || u.rol === filterRol;
    const matchEstado = filterEstado === "Todos"
      || (filterEstado === "Activo" && u.activo)
      || (filterEstado === "Inactivo" && !u.activo);
    return matchSearch && matchRol && matchEstado;
  });

  const openAdd = () => {
    setEditingUser(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (u: Usuario) => {
    setEditingUser(u);
    const apellidos = (u.apellidos || "").split(" ");
    setForm({
      username: u.username,
      password: "",
      nombres: u.nombres,
      apellido_paterno: apellidos[0] || "",
      apellido_materno: apellidos.slice(1).join(" ") || "",
      dni: u.dni || "",
      telefono: u.telefono || "",
      email: u.email,
      rol: u.rol,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nombres || !form.email) return;
    const generatedUsername = generarUsernamePreview(form.nombres, form.apellido_paterno);
    const payload: Record<string, unknown> = {
      nombres: form.nombres,
      apellido_paterno: form.apellido_paterno || undefined,
      apellido_materno: form.apellido_materno || undefined,
      dni: form.dni || undefined,
      telefono: form.telefono || undefined,
      email: form.email,
      rol: form.rol,
    };
    if (editingUser && generatedUsername !== editingUser.username) {
      payload.username = generatedUsername;
    }
    if (form.password) payload.password = form.password;

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

  const canManage = currentUser?.rol === "sistema";
  const rolBloqueado = editingUser
    ? editingUser.rol === "sistema" || editingUser.rol === "encargado" || (editingUser.rol === "colaborador" && (editingUser.area_ids?.length ?? 0) > 0)
    : false;

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
          <div className="relative">
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 cursor-pointer"
            >
              <option value="Todos">Todos los estados</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
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
              {(error as { response?: { data?: { detail?: string } }; message?: string })?.response?.data?.detail || (error as Error)?.message || "Error de conexión"}
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
                {["Usuario", "Nombres", "Email", "Rol", "Fecha Reg.", "Estado", "Acciones"].map((h) => (
                  <th key={h} className="text-left text-xs text-gray-500 px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
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
                            {`${u.nombres} ${u.apellidos || ""}`.trim().split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-gray-900 text-sm font-semibold">{`${u.nombres} ${u.apellidos || ""}`.trim()}</p>
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
                      <span className="text-xs text-gray-500">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-"}
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

            <form id="user-form" className="flex-1 overflow-y-auto px-6 py-4 space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 font-semibold mb-1">Username</label>
                  <input
                    type="text"
                    placeholder="Se genera automáticamente"
                    value={generarUsernamePreview(form.nombres, form.apellido_paterno) || form.username}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-gray-100 text-gray-500"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 font-semibold mb-1">
                    Contraseña {!editingUser ? "*" : "(dejar vacío para mantener)"}
                  </label>
                  <input
                    type="password"
                    placeholder={editingUser ? "Nueva contraseña (opcional)" : "••••••••"}
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
                    required={!editingUser}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 font-semibold mb-1">Nombres *</label>
                  <input
                    type="text"
                    placeholder="Nombres"
                    value={form.nombres}
                    onChange={(e) => setForm((p) => ({ ...p, nombres: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 font-semibold mb-1">Apellido Paterno *</label>
                  <input
                    type="text"
                    placeholder="Apellido paterno"
                    value={form.apellido_paterno}
                    onChange={(e) => setForm((p) => ({ ...p, apellido_paterno: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 font-semibold mb-1">Apellido Materno</label>
                  <input
                    type="text"
                    placeholder="Apellido materno"
                    value={form.apellido_materno}
                    onChange={(e) => setForm((p) => ({ ...p, apellido_materno: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
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
                <div>
                  <label className="block text-xs text-gray-600 font-semibold mb-1">DNI</label>
                  <input
                    type="text"
                    placeholder="Nro. de documento"
                    value={form.dni}
                    onChange={(e) => setForm((p) => ({ ...p, dni: e.target.value.replace(/\D/g, "") }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 font-semibold mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="Nro. de teléfono"
                    value={form.telefono}
                    onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value.replace(/\D/g, "") }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
                  />
                </div>
              </div>

              {/* Rol selector */}
              <div>
                <label className="block text-xs text-gray-600 font-semibold mb-1">Rol</label>
                <select
                  value={form.rol}
                  onChange={(e) => setForm((p) => ({ ...p, rol: e.target.value }))}
                  disabled={rolBloqueado}
                  className={cn(
                    "w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500",
                    rolBloqueado ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gray-50",
                  )}
                >
                  <option value="colaborador">Colaborador</option>
                  {/* Encargado visible pero bloqueado en edición — se asigna desde el área */}
                  {editingUser?.rol === "colaborador" && (
                    <option value="encargado" disabled className="text-gray-400">
                      Encargado (asignar desde el área)
                    </option>
                  )}
                  <option value="admin">Administrador</option>
                  <option value="sistema">Sistema</option>
                </select>
                {rolBloqueado && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {editingUser?.rol === "sistema"
                      ? "No podés cambiar el rol de un usuario Sistema"
                      : editingUser?.rol === "encargado"
                        ? "No podés cambiar el rol de un Encargado. Desasignalo del área primero."
                        : `Este colaborador está asignado a ${editingUser?.area_ids?.length ?? 0} área${(editingUser?.area_ids?.length ?? 0) !== 1 ? "s" : ""}. Desasignalo del área primero para cambiarle el rol`}
                  </p>
                )}
              </div>

            </form>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="user-form"
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
                ? `¿Estás seguro de desactivar a "${`${confirmToggle.nombres} ${confirmToggle.apellidos || ""}`.trim()}"? El usuario no podrá iniciar sesión.`
                : `¿Estás seguro de activar a "${`${confirmToggle.nombres} ${confirmToggle.apellidos || ""}`.trim()}"?`}
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
