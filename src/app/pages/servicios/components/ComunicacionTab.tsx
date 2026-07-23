import { useState, useMemo } from "react";
import {
  useComunicaciones,
  useCrearComunicacion,
} from "@/api/queries/useComunicaciones.js";
import { useAuth } from "@/lib/auth.js";
import { cn } from "@/app/lib/utils";
import { InfoPopover } from "@/app/components/ui/info-popover.js";
import {
  Send, MessageSquare, ChevronDown, ChevronUp,
  CheckCircle2, Clock, AlertTriangle,
} from "lucide-react";
import type { Tarea } from "@shared/index.js";

interface ComunicacionTabProps {
  servicioId: number;
  tareas: Tarea[];
  progresoPct: number;
  completadasCount: number;
  totalTareas: number;
  servicioEstado: string;
}

const TIPO_CONFIG: Record<string, { label: string; icon: typeof MessageSquare; color: string }> = {
  avance: { label: "Avance", icon: Clock, color: "text-blue-600 bg-blue-50" },
  consulta: { label: "Consulta", icon: MessageSquare, color: "text-amber-600 bg-amber-50" },
  notificacion: { label: "Notificación", icon: AlertTriangle, color: "text-purple-600 bg-purple-50" },
  finalizacion: { label: "Finalización", icon: CheckCircle2, color: "text-green-600 bg-green-50" },
};

export function ComunicacionTab({
  servicioId,
  tareas,
  progresoPct,
  completadasCount,
  totalTareas,
  servicioEstado,
}: ComunicacionTabProps) {
  const { data: comunicaciones, isLoading } = useComunicaciones(servicioId);
  const crearComunicacion = useCrearComunicacion();
  const { user } = useAuth();
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState<string>("avance");
  const [showEvidencias, setShowEvidencias] = useState(false);

  const tareasRecientes = useMemo(() => {
    // Solo mostrar como completadas las que están en secuencia
    const sorted = [...tareas].sort((a, b) => a.orden - b.orden);
    const primerHueco = sorted.findIndex((t) => !t.completada);
    const display = primerHueco >= 0
      ? sorted.map((t, i) => (i >= primerHueco ? { ...t, completada: false } : t))
      : sorted;
    return display
      .filter((t) => t.completada)
      .sort((a, b) => {
        if (!a.completada_at || !b.completada_at) return 0;
        return new Date(b.completada_at).getTime() - new Date(a.completada_at).getTime();
      })
      .slice(0, 3);
  }, [tareas]);

  const handleSubmit = async () => {
    if (!mensaje.trim()) return;
    await crearComunicacion.mutateAsync({
      servicioId,
      mensaje: mensaje.trim(),
      tipo,
    });
    setMensaje("");
  };

  const TipoIcon = TIPO_CONFIG[tipo]?.icon || MessageSquare;

  return (
    <div className="space-y-4">
      {/* Resumen de progreso */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-500" />
            Progreso del Servicio
          </h4>
          <span className="text-lg font-bold text-slate-800">{progresoPct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-2.5 rounded-full bg-blue-600 transition-all duration-500"
            style={{ width: `${progresoPct}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1.5">
          {completadasCount} de {totalTareas} tareas completadas
          {servicioEstado === "completado" && " — Servicio finalizado"}
        </p>

        {tareasRecientes.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-1.5">Últimas tareas completadas:</p>
            <div className="space-y-1">
              {tareasRecientes.map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  <span className="truncate">{t.titulo}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Formulario de comunicación */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
          <Send className="w-4 h-4 text-blue-500" />
          Enviar comunicación al cliente
          <InfoPopover
            variant="info"
            formula="Los mensajes se registran en el historial del servicio y pueden ser vistos por el cliente desde el portal público."
            descripcion="Usá este espacio para mantener al cliente informado del avance de su servicio."
          />
        </h4>

        <div className="mb-3">
          <label className="block text-xs text-slate-500 mb-1">Tipo de comunicación</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TIPO_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const isActive = tipo === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTipo(key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                    isActive
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        <textarea
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Escribí un mensaje de avance para el cliente..."
          rows={3}
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors"
          maxLength={2000}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-400">{mensaje.length}/2000</span>
          <button
            onClick={handleSubmit}
            disabled={!mensaje.trim() || crearComunicacion.isPending}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all",
              mensaje.trim()
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            <Send className="w-4 h-4" />
            {crearComunicacion.isPending ? "Enviando..." : "Enviar comunicación"}
          </button>
        </div>
      </div>

      {/* Timeline de comunicaciones */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-slate-400" />
          Historial de comunicaciones
          {comunicaciones && (
            <span className="text-xs font-normal text-slate-400">({comunicaciones.length})</span>
          )}
        </h4>

        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl" />
            ))}
          </div>
        ) : comunicaciones?.length === 0 ? (
          <div className="text-center py-6">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No hay comunicaciones aún.</p>
            <p className="text-xs text-slate-300 mt-0.5">
              Enviá un mensaje para mantener al cliente informado.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {comunicaciones?.map((com, idx) => {
              const cfg = TIPO_CONFIG[com.tipo] || TIPO_CONFIG.avance;
              const Icon = cfg.icon;
              return (
                <div
                  key={com.id}
                  className={cn(
                    "relative flex gap-3 pb-3",
                    idx < (comunicaciones?.length ?? 0) - 1 && "border-l-2 border-slate-100 ml-3 pl-4"
                  )}
                >
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      "absolute -left-[9px] w-4 h-4 rounded-full border-2 border-white flex items-center justify-center",
                      cfg.color.split(" ")[0] === "text-blue-600"
                        ? "bg-blue-100"
                        : cfg.color.split(" ")[0] === "text-amber-600"
                          ? "bg-amber-100"
                          : cfg.color.split(" ")[0] === "text-green-600"
                            ? "bg-green-100"
                            : "bg-purple-100"
                    )}
                  >
                    <Icon className={cn("w-2 h-2", cfg.color.split(" ")[0])} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 ml-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded",
                        cfg.color
                      )}>
                        {cfg.label}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(com.created_at).toLocaleString("es-PE", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {com.mensaje}
                    </p>
                    {com.usuario && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        — {com.usuario.nombres}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
