import { useState } from "react";
import { Link } from "react-router-dom";
import { useServicios, useCrearServicio } from "@/api/queries/useServicios.js";

const estados = ["todos", "pendiente", "en_progreso", "completado", "cancelado"];

export function ServiciosPage() {
  const [filtro, setFiltro] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titulo: "", descripcion: "", cliente_nombre: "", cliente_email: "" });
  const { data: servicios, isLoading } = useServicios(filtro === "todos" ? undefined : filtro);
  const crearServicio = useCrearServicio();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await crearServicio.mutateAsync(form);
    setShowForm(false);
    setForm({ titulo: "", descripcion: "", cliente_nombre: "", cliente_email: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Servicios</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          + Nuevo
        </button>
      </div>

      {/* Formulario nuevo servicio */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-4 rounded-xl border space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Título" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
            <input placeholder="Cliente" value={form.cliente_nombre} onChange={e => setForm({ ...form, cliente_nombre: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
            <input placeholder="Email cliente" type="email" value={form.cliente_email} onChange={e => setForm({ ...form, cliente_email: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
            <input placeholder="Descripción" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
          </div>
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
            Guardar
          </button>
        </form>
      )}

      {/* Filtros */}
      <div className="flex gap-2">
        {estados.map((e) => (
          <button
            key={e}
            onClick={() => setFiltro(e)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              filtro === e ? "bg-blue-600 text-white" : "bg-white border text-slate-600 hover:bg-slate-50"
            }`}
          >
            {e === "todos" ? "Todos" : e.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <p className="text-slate-500">Cargando...</p>
      ) : (
        <div className="space-y-2">
          {servicios?.map((s: any) => (
            <Link
              key={s.id}
              to={`/servicios/${s.id}`}
              className="block bg-white p-4 rounded-xl border hover:shadow-sm transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-mono text-slate-400">{s.codigo}</span>
                  <h3 className="font-medium text-slate-800">{s.titulo}</h3>
                  <p className="text-xs text-slate-500 mt-1">{s.cliente_nombre}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  s.estado === "completado" ? "bg-green-100 text-green-700" :
                  s.estado === "en_progreso" ? "bg-blue-100 text-blue-700" :
                  s.estado === "cancelado" ? "bg-red-100 text-red-700" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  {s.estado.replace("_", " ")}
                </span>
              </div>
            </Link>
          ))}
          {servicios?.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-8">No hay servicios</p>
          )}
        </div>
      )}
    </div>
  );
}
