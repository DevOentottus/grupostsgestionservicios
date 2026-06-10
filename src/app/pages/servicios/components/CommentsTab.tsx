import { useState } from "react";
import {
  useComentarios,
  useCrearComentario,
  useEliminarComentario,
} from "@/api/queries/useComentarios.js";
import { useAuth } from "@/lib/auth.js";
import type { ComentarioDisplay } from "@shared/index.js";

interface CommentsTabProps {
  servicioId: number;
}

export function CommentsTab({ servicioId }: CommentsTabProps) {
  const { data: comentarios, isLoading } = useComentarios(servicioId);
  const crearComentario = useCrearComentario();
  const eliminarComentario = useEliminarComentario();
  const { user } = useAuth();
  const [nuevoComentario, setNuevoComentario] = useState("");

  const handleSubmit = async () => {
    if (!nuevoComentario.trim()) return;
    await crearComentario.mutateAsync({
      servicioId,
      contenido: nuevoComentario.trim(),
    });
    setNuevoComentario("");
  };

  if (isLoading) return <p className="text-slate-500">Cargando comentarios...</p>;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-slate-800">Comentarios</h3>

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          value={nuevoComentario}
          onChange={(e) => setNuevoComentario(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Escribe un comentario..."
          rows={2}
          className="flex-1 px-3 py-2 border rounded-lg text-sm resize-none"
          maxLength={2000}
        />
        <button
          onClick={handleSubmit}
          disabled={!nuevoComentario.trim() || crearComentario.isPending}
          className="self-end bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {crearComentario.isPending ? "Enviando..." : "Enviar"}
        </button>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {comentarios?.length === 0 && (
          <p className="text-sm text-slate-400 italic">
            No hay comentarios aún. Sé el primero en comentar.
          </p>
        )}
        {comentarios?.map((comentario: ComentarioDisplay) => (
          <div
            key={comentario.id}
            className="bg-white rounded-lg border p-3 flex gap-3"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
              {comentario.usuario?.nombres?.charAt(0).toUpperCase() || "?"}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-slate-800">
                  {comentario.usuario?.nombres || "Usuario"}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(comentario.created_at).toLocaleString("es-PE", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {comentario.tarea && (
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    Tarea: {comentario.tarea.titulo}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">
                {comentario.contenido}
              </p>
            </div>

            {/* Delete */}
            {(comentario.usuario_id === user?.id || user?.rol === "admin") && (
              <button
                onClick={() =>
                  eliminarComentario.mutate({
                    id: comentario.id,
                    servicioId,
                  })
                }
                className="text-slate-400 hover:text-red-500 text-sm flex-shrink-0 self-start"
                title="Eliminar comentario"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
