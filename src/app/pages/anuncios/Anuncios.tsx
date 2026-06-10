import { useState } from "react";
import { useAuth } from "@/lib/auth.js";
import {
  useAnuncios,
  useTodosAnuncios,
  useCrearAnuncio,
  useEditarAnuncio,
  useEliminarAnuncio,
} from "@/api/queries/useAnuncios.js";
import type { Anuncio } from "@shared/index.js";

const PRIORIDAD_CONFIG: Record<string, { icon: string; label: string; style: string }> = {
  urgente: {
    icon: "🔴",
    label: "Urgente",
    style: "bg-red-100 text-red-700",
  },
  importante: {
    icon: "🟡",
    label: "Importante",
    style: "bg-yellow-100 text-yellow-700",
  },
  informativo: {
    icon: "🔵",
    label: "Informativo",
    style: "bg-blue-100 text-blue-700",
  },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface AnuncioFormData {
  titulo: string;
  contenido: string;
  prioridad: string;
  fecha_expiracion: string;
}

const emptyForm: AnuncioFormData = {
  titulo: "",
  contenido: "",
  prioridad: "informativo",
  fecha_expiracion: "",
};

function AnuncioFormModal({
  editing,
  onClose,
  onSave,
  isPending,
}: {
  editing: Anuncio | null;
  onClose: () => void;
  onSave: (data: AnuncioFormData) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<AnuncioFormData>(() => {
    if (editing) {
      return {
        titulo: editing.titulo,
        contenido: editing.contenido,
        prioridad: editing.prioridad,
        fecha_expiracion: editing.fecha_expiracion
          ? editing.fecha_expiracion.slice(0, 10)
          : "",
      };
    }
    return { ...emptyForm };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">
          {editing ? "Editar Anuncio" : "Nuevo Anuncio"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Título</label>
            <input
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Contenido</label>
            <textarea
              value={form.contenido}
              onChange={(e) => setForm({ ...form, contenido: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              rows={4}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Prioridad</label>
              <select
                value={form.prioridad}
                onChange={(e) => setForm({ ...form, prioridad: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="informativo">Informativo</option>
                <option value="importante">Importante</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Fecha de expiración (opcional)</label>
              <input
                type="date"
                value={form.fecha_expiracion}
                onChange={(e) => setForm({ ...form, fecha_expiracion: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {isPending ? "Guardando..." : editing ? "Actualizar" : "Crear Anuncio"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AnunciosPage() {
  const { user } = useAuth();
  const isAdmin = user?.rol === "admin";

  const [showInactivos, setShowInactivos] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Anuncio | null>(null);

  const activosQuery = useAnuncios();
  const todosQuery = useTodosAnuncios();
  const crear = useCrearAnuncio();
  const editar = useEditarAnuncio();
  const eliminar = useEliminarAnuncio();

  const query = isAdmin && showInactivos ? todosQuery : activosQuery;
  const anuncios = query.data;
  const isLoading = query.isLoading;
  const isError = query.isError;

  const handleSave = async (data: AnuncioFormData) => {
    const payload: any = {
      titulo: data.titulo,
      contenido: data.contenido,
      prioridad: data.prioridad,
    };
    if (data.fecha_expiracion) {
      payload.fecha_expiracion = data.fecha_expiracion;
    }

    if (editing) {
      await editar.mutateAsync({ id: editing.id, data: payload });
    } else {
      await crear.mutateAsync(payload);
    }
    setShowForm(false);
    setEditing(null);
  };

  const handleDesactivar = async (anuncio: Anuncio) => {
    if (!window.confirm(`¿Desactivar el anuncio "${anuncio.titulo}"?`)) return;
    await editar.mutateAsync({ id: anuncio.id, data: { activo: false } });
  };

  const handleEliminar = async (anuncio: Anuncio) => {
    if (!window.confirm(`¿Eliminar permanentemente el anuncio "${anuncio.titulo}"?`)) return;
    await eliminar.mutateAsync(anuncio.id);
  };

  const handleEdit = (anuncio: Anuncio) => {
    setEditing(anuncio);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Anuncios</h2>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactivos}
                  onChange={(e) => setShowInactivos(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Mostrar inactivos
              </label>
              <button
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
              >
                + Nuevo Anuncio
              </button>
            </>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <AnuncioFormModal
          editing={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={handleSave}
          isPending={crear.isPending || editar.isPending}
        />
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border p-4 space-y-3 animate-pulse">
              <div className="flex justify-between">
                <div className="h-5 bg-slate-200 rounded w-48" />
                <div className="h-5 bg-slate-200 rounded w-16" />
              </div>
              <div className="h-4 bg-slate-200 rounded w-full" />
              <div className="h-4 bg-slate-200 rounded w-2/3" />
              <div className="h-3 bg-slate-200 rounded w-36" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">Error al cargar anuncios</p>
          <p className="text-red-500 text-sm mt-1">Intentalo de nuevo más tarde.</p>
        </div>
      ) : anuncios && anuncios.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <p className="text-slate-400 text-lg font-medium">No hay anuncios</p>
          <p className="text-slate-400 text-sm mt-1">
            {showInactivos
              ? "No hay anuncios registrados."
              : "No hay anuncios activos en este momento."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {anuncios?.map((anuncio) => {
            const prioridadConfig = PRIORIDAD_CONFIG[anuncio.prioridad] || PRIORIDAD_CONFIG.informativo;
            const vencido =
              anuncio.fecha_expiracion && new Date(anuncio.fecha_expiracion) < new Date();

            return (
              <div
                key={anuncio.id}
                className={`bg-white rounded-xl border p-5 space-y-3 ${
                  !anuncio.activo ? "opacity-60" : ""
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">{prioridadConfig.icon}</span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">
                        {anuncio.titulo}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${prioridadConfig.style}`}
                        >
                          {prioridadConfig.label}
                        </span>
                        {!anuncio.activo && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-medium">
                            Inactivo
                          </span>
                        )}
                        {vencido && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                            Vencido
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Admin actions */}
                  {isAdmin && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleEdit(anuncio)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Editar
                      </button>
                      {anuncio.activo && (
                        <button
                          onClick={() => handleDesactivar(anuncio)}
                          className="text-xs text-orange-600 hover:underline"
                        >
                          Desactivar
                        </button>
                      )}
                      <button
                        onClick={() => handleEliminar(anuncio)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>

                {/* Content */}
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {anuncio.contenido}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t">
                  <div className="flex items-center gap-3">
                    <span>
                      {anuncio.usuario?.nombres || `Usuario #${anuncio.usuario_id}`}
                    </span>
                    <span>{formatDate(anuncio.fecha_publicacion)}</span>
                  </div>
                  {anuncio.fecha_expiracion && (
                    <span className={vencido ? "text-red-500" : ""}>
                      Válido hasta: {formatDateShort(anuncio.fecha_expiracion)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
