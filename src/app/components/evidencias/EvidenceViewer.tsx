import { useState, useMemo, useRef } from "react";
import { cn } from "@/app/lib/utils";
import {
  Image, FileVideo, MessageCircle, Send, CheckCircle2,
  XCircle, Clock, ThumbsUp, ThumbsDown, ChevronRight, Eye,
  Loader2, Upload,
} from "lucide-react";
import type { Evidencia, EvidenciaComentario } from "@shared/index.js";
import { useAgregarComentarioEvidencia, useCambiarEstadoEvidencia, useCambiarMostrarCliente, useUploadEvidencia } from "@/api/queries/useEvidencias.js";
import { evidenciasPublicApi } from "@/api/client.js";

interface EvidenceViewerProps {
  evidencias: (Evidencia & { comentarios?: EvidenciaComentario[] })[];
  readOnly?: boolean;  // true for client view
  showStatus?: boolean;
  className?: string;
  codigo?: string;  // for client comments
  dni?: string;     // for client validation
  onComentarioAdded?: () => void;
  /** Map tarea_id -> titulo, para agrupar evidencias por tarea */
  tareaNombres?: Record<number, string>;
  /** Rol del usuario autenticado (admin/encargado/colaborador). Solo admin/encargado ven botones aprobar/rechazar */
  userRol?: string;
}

export function EvidenceViewer({
  evidencias,
  readOnly = false,
  showStatus = true,
  className,
  codigo,
  dni,
  onComentarioAdded,
  tareaNombres,
  userRol,
}: EvidenceViewerProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [comentarios, setComentarios] = useState<Record<number, string>>({});
  const [rechazandoId, setRechazandoId] = useState<number | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [aprobandoId, setAprobandoId] = useState<number | null>(null);
  const [motivoAprobacion, setMotivoAprobacion] = useState("");
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [replacingId, setReplacingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addComentario = useAgregarComentarioEvidencia();
  const cambiarEstado = useCambiarEstadoEvidencia();
  const cambiarMostrarCliente = useCambiarMostrarCliente();
  const uploadMutation = useUploadEvidencia();

  // Agrupar evidencias por tarea_id
  const grouped = useMemo(() => {
    const map = new Map<number, (Evidencia & { comentarios?: EvidenciaComentario[] })[]>();
    for (const ev of evidencias) {
      const list = map.get(ev.tarea_id) || [];
      list.push(ev);
      map.set(ev.tarea_id, list);
    }
    // Sort by tarea_id para orden consistente
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [evidencias]);

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

    if (readOnly) {
      await evidenciasPublicApi.agregarComentario(evidenciaId, {
        contenido,
        codigo: codigo || "",
        dni: dni || "",
      });
    } else {
      await addComentario.mutateAsync({ evidenciaId, contenido });
    }

    setComentarios((prev) => ({ ...prev, [evidenciaId]: "" }));
    onComentarioAdded?.();
  };

  const handleRejectedUpload = async (file: File, ev: Evidencia) => {
    if (!file) return;
    setUploadingId(ev.id);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        await uploadMutation.mutateAsync({
          servicio_id: ev.servicio_id,
          tarea_id: ev.tarea_id,
          tipo: "photo",
          archivo_base64: base64,
          content_type: file.type,
        });
        // Marcar la evidencia anterior como reemplazada
        await cambiarEstado.mutateAsync({ evidenciaId: ev.id, estado: "reemplazado" });
      } catch {
        // Error manejado por la mutación
      } finally {
        setUploadingId(null);
      }
    };
    reader.onerror = () => setUploadingId(null);
    reader.readAsDataURL(file);
  };

  const statusIcon = (estado: string) => {
    switch (estado) {
      case "aprobado": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "rechazado": return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  function renderEvidenceCard(ev: Evidencia & { comentarios?: EvidenciaComentario[] }) {
    const isExpanded = expandedId === ev.id;
    const rejectionComment = ev.comentarios?.find(
      (c) => c.contenido.startsWith("Motivo de rechazo:")
    );
    const rejectionReason = rejectionComment?.contenido.replace("Motivo de rechazo: ", "");
    const approvalComment = ev.comentarios?.find(
      (c) => c.contenido.startsWith("Motivo de aprobación:")
    );
    const approvalReason = approvalComment?.contenido.replace("Motivo de aprobación: ", "");
    return (
      <div key={ev.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Media */}
        <div
          className="relative w-full aspect-[4/3] cursor-pointer bg-slate-50"
          onClick={() => setExpandedId(isExpanded ? null : ev.id)}
        >
          {ev.tipo === "photo" ? (
            <img
              src={ev.archivo_url}
              alt="Evidencia"
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <video
              src={ev.archivo_url}
              className="absolute inset-0 w-full h-full object-contain"
              controls
            />
          )}
          <div className="absolute top-2 right-2 flex gap-1">
            {ev.mostrar_cliente && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 bg-sky-100 text-sky-700">
                <Eye className="w-3 h-3" />
                Cliente
              </span>
            )}
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

        {/* Status actions (solo encargado/admin) */}
        {!readOnly && showStatus && ev.estado === "pendiente" && (userRol === "admin" || userRol === "encargado") && (
          rechazandoId === ev.id ? (
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 space-y-2">
              <textarea
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Motivo de rechazo (obligatorio)"
                rows={2}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setRechazandoId(null);
                    setMotivoRechazo("");
                  }}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    cambiarEstado.mutate({ evidenciaId: ev.id, estado: "rechazado", motivo: motivoRechazo.trim() });
                    setRechazandoId(null);
                    setMotivoRechazo("");
                  }}
                  disabled={!motivoRechazo.trim()}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ThumbsDown className="w-3 h-3" />
                  Confirmar rechazo
                </button>
              </div>
              {!motivoRechazo.trim() && (
                <p className="text-[11px] text-red-500">Debe ingresar un motivo de rechazo</p>
              )}
            </div>
          ) : aprobandoId === ev.id ? (
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 space-y-2">
              <textarea
                value={motivoAprobacion}
                onChange={(e) => setMotivoAprobacion(e.target.value)}
                placeholder="Argumento de aprobación (obligatorio)"
                rows={2}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setAprobandoId(null);
                    setMotivoAprobacion("");
                  }}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    cambiarEstado.mutate({ evidenciaId: ev.id, estado: "aprobado", motivo: motivoAprobacion.trim() });
                    setAprobandoId(null);
                    setMotivoAprobacion("");
                  }}
                  disabled={!motivoAprobacion.trim()}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ThumbsUp className="w-3 h-3" />
                  Confirmar aprobación
                </button>
              </div>
              {!motivoAprobacion.trim() && (
                <p className="text-[11px] text-red-500">Debe ingresar un argumento de aprobación</p>
              )}
            </div>
          ) : (
            <div className="flex gap-2 px-4 py-2 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => { setAprobandoId(ev.id); setMotivoAprobacion(""); }}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition"
              >
                <ThumbsUp className="w-3 h-3" />
                Aprobar
              </button>
              <button
                onClick={() => {
                  setRechazandoId(ev.id);
                  setMotivoRechazo("");
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition"
              >
                <ThumbsDown className="w-3 h-3" />
                Rechazar
              </button>
            </div>
          )
        )}

        {/* Evidencia rechazada — mostrar motivo y botón de re-subida */}
        {!readOnly && ev.estado === "rechazado" && (
          <div className="px-4 py-3 bg-red-50 border-t border-red-100 space-y-3">
            {rejectionReason && (
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">
                  <span className="font-medium">Esta evidencia fue rechazada:</span> {rejectionReason}
                </p>
              </div>
            )}

            {uploadingId === ev.id ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Subiendo nueva evidencia...
              </div>
            ) : (
              <button
                onClick={() => {
                  setReplacingId(ev.id);
                  fileInputRef.current?.click();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition"
              >
                <Upload className="w-4 h-4" />
                Subir nueva evidencia
              </button>
            )}
          </div>
        )}

        {/* Evidencia aprobada — mostrar argumento */}
        {ev.estado === "aprobado" && approvalReason && (
          <div className="px-4 py-3 bg-green-50 border-t border-green-100">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <p className="text-sm text-green-700">
                <span className="font-medium">Argumento de aprobación:</span> {approvalReason}
              </p>
            </div>
          </div>
        )}

        {/* Mostrar al cliente (solo admin/sistema) */}
        {!readOnly && (userRol === "admin" || userRol === "sistema") && (
          <label className="flex items-center gap-2 px-4 py-2 border-t border-slate-100 cursor-pointer select-none hover:bg-slate-50 transition">
            <input
              type="checkbox"
              checked={ev.mostrar_cliente}
              onChange={() =>
                cambiarMostrarCliente.mutate({ evidenciaId: ev.id, mostrar_cliente: !ev.mostrar_cliente })
              }
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-600 font-medium">Mostrar al cliente</span>
          </label>
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
                      c.es_cliente ? "bg-yellow-50 ml-4" : "bg-blue-50 mr-4"
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
          className="w-full flex items-center justify-center gap-1 px-4 py-1.5 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition border-t border-slate-100 shrink-0"
        >
          <MessageCircle className="w-3 h-3" />
          {isExpanded ? "Ocultar comentarios" : `${ev.comentarios?.length || 0} comentarios`}
        </button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {grouped.map(([tareaId, evs]) => {
        const nombreTarea = tareaNombres?.[tareaId];
        return (
          <div key={tareaId} className="space-y-3">
            {/* Task header */}
            <div className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">
                {nombreTarea || `Tarea #${tareaId}`}
              </span>
              <span className="text-xs text-slate-400">({evs.length})</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pl-2 border-l-2 border-slate-100">
              {evs.map(renderEvidenceCard)}
            </div>
          </div>
        );
      })}
      {/* Hidden file input for re-uploading rejected evidence */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && replacingId) {
            const ev = evidencias.find((x) => x.id === replacingId);
            if (ev) handleRejectedUpload(file, ev);
          }
          if (e.target) e.target.value = "";
        }}
      />
    </div>
  );
}
