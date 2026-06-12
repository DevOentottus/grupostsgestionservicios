import { useState } from "react";
import { cn } from "@/app/lib/utils";
import {
  Image, FileVideo, MessageCircle, Send, CheckCircle2,
  XCircle, Clock, ThumbsUp, ThumbsDown,
} from "lucide-react";
import type { Evidencia, EvidenciaComentario } from "@shared/index.js";
import { useAgregarComentarioEvidencia, useCambiarEstadoEvidencia } from "@/api/queries/useEvidencias.js";

interface EvidenceViewerProps {
  evidencias: (Evidencia & { comentarios?: EvidenciaComentario[] })[];
  readOnly?: boolean;  // true for client view
  showStatus?: boolean;
  className?: string;
  codigo?: string;  // for client comments
  dni?: string;     // for client validation
  onComentarioAdded?: () => void;
}

export function EvidenceViewer({
  evidencias,
  readOnly = false,
  showStatus = true,
  className,
  codigo,
  dni,
  onComentarioAdded,
}: EvidenceViewerProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [comentarios, setComentarios] = useState<Record<number, string>>({});
  const addComentario = useAgregarComentarioEvidencia();
  const cambiarEstado = useCambiarEstadoEvidencia();

  if (!evidencias.length) {
    return (
      <div className={cn("text-center py-8", className)}>
        <Image className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-400">Sin evidencias aún</p>
      </div>
    );
  }

  const handleSendComentario = async (evidenciaId: number) => {
    const contenido = comentarios[evidenciaId]?.trim();
    if (!contenido) return;
    await addComentario.mutateAsync({ evidenciaId, contenido });
    setComentarios((prev) => ({ ...prev, [evidenciaId]: "" }));
    onComentarioAdded?.();
  };

  const statusIcon = (estado: string) => {
    switch (estado) {
      case "aprobado": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "rechazado": return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {evidencias.map((ev) => {
        const isExpanded = expandedId === ev.id;
        return (
          <div
            key={ev.id}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden"
          >
            {/* Media */}
            <div
              className="relative cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : ev.id)}
            >
              {ev.tipo === "photo" ? (
                <img
                  src={ev.archivo_url}
                  alt="Evidencia"
                  className="w-full max-h-80 object-contain bg-slate-50"
                />
              ) : (
                <video
                  src={ev.archivo_url}
                  className="w-full max-h-80 bg-slate-50"
                  controls
                />
              )}
              <div className="absolute top-2 right-2 flex gap-1">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1",
                  ev.tipo === "photo" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                )}>
                  {ev.tipo === "photo" ? <Image className="w-3 h-3" /> : <FileVideo className="w-3 h-3" />}
                  {ev.tipo === "photo" ? "Foto" : "Video"}
                </span>
                {showStatus && (
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1",
                    ev.estado === "aprobado" ? "bg-green-100 text-green-700" :
                    ev.estado === "rechazado" ? "bg-red-100 text-red-700" :
                    "bg-yellow-100 text-yellow-700"
                  )}>
                    {statusIcon(ev.estado)}
                    {ev.estado}
                  </span>
                )}
              </div>
            </div>

            {/* Status actions (admin/encargado only) */}
            {!readOnly && showStatus && ev.estado === "pendiente" && (
              <div className="flex gap-2 px-4 py-2 bg-slate-50 border-t border-slate-100">
                <button
                  onClick={() => cambiarEstado.mutate({ evidenciaId: ev.id, estado: "aprobado" })}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition"
                >
                  <ThumbsUp className="w-3 h-3" />
                  Aprobar
                </button>
                <button
                  onClick={() => cambiarEstado.mutate({ evidenciaId: ev.id, estado: "rechazado" })}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition"
                >
                  <ThumbsDown className="w-3 h-3" />
                  Rechazar
                </button>
              </div>
            )}

            {/* Colaborador comment */}
            {ev.comentario_colaborador && (
              <div className="px-4 py-2 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-0.5">Comentario del técnico:</p>
                <p className="text-sm text-slate-700">{ev.comentario_colaborador}</p>
              </div>
            )}

            {/* Comentarios thread */}
            {isExpanded && (
              <div className="border-t border-slate-100 px-4 py-3 space-y-2">
                {(ev.comentarios || []).length > 0 && (
                  <div className="space-y-2 mb-3">
                    {(ev.comentarios || []).map((c) => (
                      <div
                        key={c.id}
                        className={cn(
                          "p-2 rounded-lg text-sm",
                          c.es_cliente
                            ? "bg-yellow-50 ml-4"
                            : "bg-blue-50 mr-4"
                        )}
                      >
                        <p className="text-[10px] text-slate-400 mb-0.5">
                          {c.es_cliente ? "Cliente" : "Técnico"}
                          {c.created_at && ` · ${new Date(c.created_at).toLocaleString("es-AR")}`}
                        </p>
                        <p className="text-sm text-slate-700">{c.contenido}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add comment */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={comentarios[ev.id] || ""}
                    onChange={(e) =>
                      setComentarios((prev) => ({ ...prev, [ev.id]: e.target.value }))
                    }
                    placeholder={readOnly ? "Escribí un comentario..." : "Agregar comentario..."}
                    className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendComentario(ev.id);
                    }}
                  />
                  <button
                    onClick={() => handleSendComentario(ev.id)}
                    disabled={!comentarios[ev.id]?.trim()}
                    className="p-1.5 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Toggle comments footer */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : ev.id)}
              className="w-full flex items-center justify-center gap-1 px-4 py-1.5 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition border-t border-slate-100"
            >
              <MessageCircle className="w-3 h-3" />
              {isExpanded ? "Ocultar comentarios" : `${ev.comentarios?.length || 0} comentarios`}
            </button>
          </div>
        );
      })}
    </div>
  );
}
