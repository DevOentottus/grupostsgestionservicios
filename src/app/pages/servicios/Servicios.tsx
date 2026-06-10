import { useState } from "react";
import { Link } from "react-router-dom";
import { useServicios, useCrearServicio } from "@/api/queries/useServicios.js";
import { useAreas } from "@/api/queries/useAreas.js";
import {
  usePlantillas,
  usePlantilla,
  useAplicarPlantilla,
} from "@/api/queries/usePlantillas.js";
import type { PlantillaTarea } from "@shared/index.js";

const estados = [
  "todos",
  "pendiente",
  "en_progreso",
  "completado",
  "cancelado",
];

const PAGE_SIZE = 20;

export function ServiciosPage() {
  const [filtro, setFiltro] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    cliente_nombre: "",
    cliente_email: "",
    area_id: "" as string | number,
    plantilla_id: "" as string | number,
  });
  const { data: servicios, isLoading } = useServicios(
    filtro === "todos" ? undefined : filtro
  );
  const crearServicio = useCrearServicio();
  const aplicarPlantilla = useAplicarPlantilla();
  const { data: areas } = useAreas();
  const { data: plantillas } = usePlantillas();

  // Preview de tareas de la plantilla seleccionada
  const plantillaId = form.plantilla_id
    ? Number(form.plantilla_id)
    : undefined;
  const { data: plantillaDetail } = usePlantilla(plantillaId ?? 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      titulo: form.titulo,
      descripcion: form.descripcion || undefined,
      cliente_nombre: form.cliente_nombre,
      cliente_email: form.cliente_email || undefined,
    };
    if (form.area_id) {
      payload.area_id = Number(form.area_id);
    }

    const result = await crearServicio.mutateAsync(payload);
    const newServicio = result.data?.data;

    // Si hay plantilla seleccionada, aplicar después de crear
    if (plantillaId && newServicio?.id) {
      await aplicarPlantilla.mutateAsync({
        plantillaId,
        servicioId: newServicio.id,
      });
    }

    setShowForm(false);
    setForm({
      titulo: "",
      descripcion: "",
      cliente_nombre: "",
      cliente_email: "",
      area_id: "",
      plantilla_id: "",
    });
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
        <form
          onSubmit={handleCreate}
          className="bg-white p-4 rounded-xl border space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Título"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
              required
            />
            <input
              placeholder="Cliente"
              value={form.cliente_nombre}
              onChange={(e) =>
                setForm({ ...form, cliente_nombre: e.target.value })
              }
              className="px-3 py-2 border rounded-lg text-sm"
              required
            />
            <input
              placeholder="Email cliente"
              type="email"
              value={form.cliente_email}
              onChange={(e) =>
                setForm({ ...form, cliente_email: e.target.value })
              }
              className="px-3 py-2 border rounded-lg text-sm"
            />
            <input
              placeholder="Descripción"
              value={form.descripcion}
              onChange={(e) =>
                setForm({ ...form, descripcion: e.target.value })
              }
              className="px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          {/* Fila de selects: Área + Plantilla */}
          <div className="grid grid-cols-2 gap-3">
            {/* Selector de Área */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Área (opcional)
              </label>
              <select
                value={form.area_id}
                onChange={(e) =>
                  setForm({ ...form, area_id: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
              >
                <option value="">Sin área</option>
                {areas?.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Plantilla */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Plantilla de tareas (opcional)
              </label>
              <select
                value={form.plantilla_id}
                onChange={(e) =>
                  setForm({ ...form, plantilla_id: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
              >
                <option value="">Sin plantilla</option>
                {plantillas?.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.tareas_count} tareas)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview de tareas de la plantilla seleccionada */}
          {plantillaDetail?.tareas && plantillaDetail.tareas.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-700 mb-2">
                Tareas que se crearán desde la plantilla "{plantillaDetail.nombre}":
              </p>
              <ol className="list-decimal list-inside space-y-1">
                {plantillaDetail.tareas
                  .sort((a: PlantillaTarea, b: PlantillaTarea) => a.orden - b.orden)
                  .map((t: PlantillaTarea) => (
                    <li key={t.id} className="text-sm text-blue-800">
                      {t.titulo}
                    </li>
                  ))}
              </ol>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={crearServicio.isPending || aplicarPlantilla.isPending}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {crearServicio.isPending || aplicarPlantilla.isPending
                ? "Guardando..."
                : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm rounded-lg border text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Filtros */}
      <div className="flex gap-2">
        {estados.map((e) => (
          <button
            key={e}
            onClick={() => { setFiltro(e); setPagina(1); }}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              filtro === e
                ? "bg-blue-600 text-white"
                : "bg-white border text-slate-600 hover:bg-slate-50"
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
          {(() => {
            const totalPages = Math.max(1, Math.ceil((servicios?.length || 0) / PAGE_SIZE));
            const safePage = Math.min(pagina, totalPages);
            const paginated = (servicios || []).slice(
              (safePage - 1) * PAGE_SIZE,
              safePage * PAGE_SIZE
            );

            return (
              <>
                <p className="text-xs text-slate-400">
                  Mostrando {(safePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePage * PAGE_SIZE, servicios?.length || 0)} de{" "}
                  {servicios?.length || 0} servicios
                </p>
                {paginated.map((s: any) => (
                  <Link
                    key={s.id}
                    to={`/servicios/${s.id}`}
                    className="block bg-white p-4 rounded-xl border hover:shadow-sm transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-mono text-slate-400">
                          {s.codigo}
                        </span>
                        <h3 className="font-medium text-slate-800">{s.titulo}</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {s.cliente_nombre}
                        </p>
                        {s.area_id && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            Área ID: {s.area_id}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          s.estado === "completado"
                            ? "bg-green-100 text-green-700"
                            : s.estado === "en_progreso"
                            ? "bg-blue-100 text-blue-700"
                            : s.estado === "cancelado"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {s.estado.replace("_", " ")}
                      </span>
                    </div>
                  </Link>
                ))}
                {servicios?.length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-8">
                    No hay servicios
                  </p>
                )}
                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                      onClick={() => setPagina((p) => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                      className="px-3 py-1 text-sm rounded border disabled:opacity-30 hover:bg-slate-50"
                    >
                      Anterior
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => Math.abs(p - safePage) <= 2 || p === 1 || p === totalPages)
                      .map((p, idx, arr) => (
                        <span key={p} className="flex items-center gap-1">
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <span className="text-slate-300 px-1">...</span>
                          )}
                          <button
                            onClick={() => setPagina(p)}
                            className={`px-3 py-1 text-sm rounded ${
                              safePage === p
                                ? "bg-blue-600 text-white"
                                : "border hover:bg-slate-50"
                            }`}
                          >
                            {p}
                          </button>
                        </span>
                      ))}
                    <button
                      onClick={() => setPagina((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                      className="px-3 py-1 text-sm rounded border disabled:opacity-30 hover:bg-slate-50"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
