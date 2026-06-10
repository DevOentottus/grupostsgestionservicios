import { useState } from "react";
import { useUsuarios, useCrearUsuario, useToggleUsuario } from "@/api/queries/useUsuarios.js";

export function UsuariosPage() {
  const { data: usuarios, isLoading } = useUsuarios();
  const crearUsuario = useCrearUsuario();
  const toggleUsuario = useToggleUsuario();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", nombres: "", email: "", rol: "colaborador" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await crearUsuario.mutateAsync(form);
    setShowForm(false);
    setForm({ username: "", password: "", nombres: "", email: "", rol: "colaborador" });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Usuarios</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          + Nuevo
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-4 rounded-xl border space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
            <input placeholder="Contraseña" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
            <input placeholder="Nombres" value={form.nombres} onChange={e => setForm({ ...form, nombres: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
            <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
            <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })} className="px-3 py-2 border rounded-lg text-sm">
              <option value="admin">Admin</option>
              <option value="encargado">Encargado</option>
              <option value="colaborador">Colaborador</option>
            </select>
          </div>
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
            Guardar
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="text-slate-500">Cargando...</p>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-3 font-medium">Usuario</th>
                <th className="text-left p-3 font-medium">Nombres</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Rol</th>
                <th className="text-left p-3 font-medium">Estado</th>
                <th className="text-left p-3 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {usuarios?.map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="p-3 font-medium">{u.username}</td>
                  <td className="p-3">{u.nombres}</td>
                  <td className="p-3 text-slate-500">{u.email}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      u.rol === "admin" ? "bg-purple-100 text-purple-700" :
                      u.rol === "encargado" ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {u.rol}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${u.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => toggleUsuario.mutate(u.id)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {u.activo ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
