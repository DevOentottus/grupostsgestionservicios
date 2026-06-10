import { useState, useEffect } from "react";
import {
  useAreas,
  useCrearArea,
  useEditarArea,
  useEliminarArea,
  useAsignarColaborador,
  useRemoverColaborador,
} from "@/api/queries/useAreas.js";
import { useUsuarios } from "@/api/queries/useUsuarios.js";
import type { Area, AreaWithEncargado } from "@shared/index.js";

export function AreasPage() {
  const { data: areas, isLoading } = useAreas();
  const { data: usuarios } = useUsuarios();
  const crearArea = useCrearArea();
  const editarArea = useEditarArea();
  const eliminarArea = useEliminarArea();
  const asignarColaborador = useAsignarColaborador();
  const removerColaborador = useRemoverColaborador();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Area | null>(null);
  const [form, setForm] = useState({ nombre: "", encargado_id: "" });
  const [expandedArea, setExpandedArea] = useState<number | null>(null);
  const [colaboradorAsignar, setColaboradorAsignar] = useState<{
    areaId: number;
  } | null>(null);

  // Reset form when closing
  const resetForm = () => {
    setForm({ nombre: "", encargado_id: "" });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      nombre: form.nombre,
      encargado_id: form.encargado_id
        ? parseInt(form.encargado_id)
        : null,
    };

    if (editing) {
      await editarArea.mutateAsync({ id: editing.id, data });
    } else {
      await crearArea.mutateAsync(data);
    }
    resetForm();
  };

  const handleEdit = (area: Area) => {
    setEditing(area);
    setForm({
      nombre: area.nombre,
      encargado_id: area.encargado_id?.toString() || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (area: Area) => {
    if (!window.confirm(`¿Eliminar el área "${area.nombre}"?`)) return;
    await eliminarArea.mutateAsync(area.id);
  };

  const handleAsignarColaborador = async (areaId: number) => {
    if (!colaboradorAsignar) return;
    await asignarColaborador.mutateAsync({
      areaId,
      usuarioId: parseInt(
        (document.getElementById("colaborador-select") as HTMLSelectElement)
          ?.value || "0"
      ),
    });
    setColaboradorAsignar(null);
  };

  if (isLoading) {
    return <p className="text-slate-500">Cargando áreas...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Áreas</h2>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          + Nueva Área
        </button>
      </div>

      {/* Formulario crear/editar área */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 rounded-xl border space-y-3"
        >
          <h3 className="font-semibold text-slate-700">
            {editing ? "Editar Área" : "Nueva Área"}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Nombre del área"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
              required
            />
            <select
              value={form.encargado_id}
              onChange={(e) =>
                setForm({ ...form, encargado_id: e.target.value })
              }
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Sin encargado</option>
              {usuarios
                ?.filter(
                  (u: any) =>
                    u.rol === "admin" || u.rol === "encargado"
                )
                .map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.nombres} ({u.rol})
                  </option>
                ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
            >
              {editing ? "Actualizar" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Tabla de áreas */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3 font-medium">Nombre</th>
              <th className="text-left p-3 font-medium">Encargado</th>
              <th className="text-left p-3 font-medium">Colaboradores</th>
              <th className="text-left p-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {areas?.map((area: any) => {
              return (
                <tr key={area.id} className="hover:bg-slate-50">
                  <td className="p-3 font-medium">{area.nombre}</td>
                  <td className="p-3">
                    {area.encargado_nombres ? (
                      <div className="flex flex-col">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full inline-block w-fit">
                          {area.encargado_nombres}
                        </span>
                        {area.encargado_email && (
                          <span className="text-xs text-slate-400 mt-0.5">{area.encargado_email}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="p-3 text-xs text-slate-600">
                    <span className="font-medium">{area.colaborador_count ?? 0}</span> colaboradores
                    <button
                      onClick={() =>
                        setExpandedArea(
                          expandedArea === area.id ? null : area.id
                        )
                      }
                      className="ml-2 text-blue-600 hover:underline"
                    >
                      {expandedArea === area.id
                        ? "Ocultar"
                        : "Gestionar"}
                    </button>
                  </td>
                  <td className="p-3 flex gap-2">
                    <button
                      onClick={() => handleEdit(area)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(area)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              );
            })}
            {(!areas || areas.length === 0) && (
              <tr>
                <td
                  colSpan={4}
                  className="p-6 text-center text-slate-400"
                >
                  No hay áreas registradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Panel de colaboradores expandido */}
      {expandedArea && <ColaboradoresPanel areaId={expandedArea} />}
    </div>
  );
}

function ColaboradoresPanel({ areaId }: { areaId: number }) {
  const { data: usuarios } = useUsuarios();
  const asignarColaborador = useAsignarColaborador();
  const removerColaborador = useRemoverColaborador();
  const { data: areas, isLoading } = useAreas();
  const [selectedUserId, setSelectedUserId] = useState("");

  // Find the expanded area with its collaborators
  const area = areas?.find((a: any) => a.id === areaId);
  const [colaboradores, setColaboradores] = useState<any[]>([]);

  useEffect(() => {
    if (area && (area as any).colaboradores) {
      setColaboradores((area as any).colaboradores);
    } else {
      // Fetch area detail with collaborators
      import("@/api/client.js").then(({ areasApi }) => {
        areasApi.obtener(areaId).then((r) => {
          setColaboradores(r.data.data.colaboradores || []);
        });
      });
    }
  }, [area, areaId]);

  const handleAsignar = async () => {
    if (!selectedUserId) return;
    await asignarColaborador.mutateAsync({
      areaId,
      usuarioId: parseInt(selectedUserId),
    });
    // Refresh
    const { areasApi } = await import("@/api/client.js");
    const r = await areasApi.obtener(areaId);
    setColaboradores(r.data.data.colaboradores || []);
    setSelectedUserId("");
  };

  const handleRemover = async (usuarioId: number) => {
    await removerColaborador.mutateAsync({ areaId, usuarioId });
    // Refresh
    const { areasApi } = await import("@/api/client.js");
    const r = await areasApi.obtener(areaId);
    setColaboradores(r.data.data.colaboradores || []);
  };

  if (isLoading) return null;

  // Filter users that can be collaborators (colaborador role, not already assigned)
  const disponibles =
    usuarios?.filter(
      (u: any) =>
        u.rol === "colaborador" &&
        !colaboradores?.some((c: any) => c.usuario_id === u.id)
    ) || [];

  return (
    <div className="bg-white p-4 rounded-xl border space-y-3">
      <h3 className="font-semibold text-slate-700">
        Colaboradores del Área
      </h3>

      {/* Lista de colaboradores actuales */}
      <div className="space-y-1">
        {colaboradores?.length === 0 && (
          <p className="text-sm text-slate-400">
            No hay colaboradores asignados
          </p>
        )}
        {colaboradores?.map((col: any) => (
          <div
            key={col.usuario_id}
            className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg"
          >
            <span className="text-sm">
              {col.nombres}{" "}
              <span className="text-xs text-slate-400">
                (@{col.username})
              </span>
            </span>
            <button
              onClick={() => handleRemover(col.usuario_id)}
              className="text-xs text-red-600 hover:underline"
            >
              Remover
            </button>
          </div>
        ))}
      </div>

      {/* Asignar nuevo colaborador */}
      {disponibles.length > 0 && (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-slate-500 block mb-1">
              Agregar colaborador
            </label>
            <select
              id="colaborador-select"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
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
            onClick={handleAsignar}
            disabled={!selectedUserId}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            Asignar
          </button>
        </div>
      )}
    </div>
  );
}
