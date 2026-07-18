import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMiArea } from "@/api/queries/useManager.js";
import { useUsuarios } from "@/api/queries/useUsuarios.js";
import { useAuth } from "@/lib/auth.js";
import { cn } from "@/app/lib/utils";
import { InfoPopover } from "@/app/components/ui/info-popover.js";
import {
  TrendingUp, User, Star,
} from "lucide-react";

export function ManagerDesempenoPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const esSupervisor = user?.rol === "sistema" || user?.rol === "admin";
  const { data: miArea } = useMiArea();
  const { data: todosUsuarios } = useUsuarios();

  // Colaboradores del área (encargado) o todos los colaboradores (sistema/admin)
  const colaboradores = useMemo(() => {
    if (esSupervisor) {
      return (todosUsuarios || [])
        .filter((u) => u.rol === "colaborador" || u.rol === "encargado")
        .map((u) => ({
          usuario_id: u.id,
          nombres: [u.nombres, u.apellidos].filter(Boolean).join(" "),
        }));
    }
    return (miArea?.colaboradores || []).map((c) => ({
      usuario_id: c.usuario_id,
      nombres: [c.nombres, c.apellidos].filter(Boolean).join(" "),
    }));
  }, [esSupervisor, todosUsuarios, miArea]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Desempeño de Colaborador
          </h2>
          <p className="text-sm text-slate-500 flex items-center gap-1">
            Evaluá el rendimiento de los colaboradores de tu área
            <InfoPopover
              variant="info"
              formula="Lista de colaboradores con indicadores de servicios completados y tareas activas."
              descripcion="Cada tarjeta muestra el nombre del colaborador, cantidad de servicios completados y tareas activas."
              tip="Hacé clic en 'Ver desempeño →' para acceder al detalle completo de KPIs, tendencias y comparativas de cada colaborador."
            />
          </p>
        </div>
      </div>

      {/* Colaboradores del área */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500" />
            Colaboradores del área
            <InfoPopover
              variant="info"
              formula="Cada tarjeta muestra servicios completados, tareas activas y calificación promedio del colaborador."
              descripcion="Los datos reflejan el período actual de evaluación. Los valores se actualizan en tiempo real según el avance de servicios."
              tip="Usá 'Ver desempeño →' para acceder al dashboard completo con KPIs detallados, tendencias y comparativas contra el promedio del área."
            />
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{colaboradores.length} colaboradores</p>
        </div>
        <div className="p-4">
          {colaboradores.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No hay colaboradores en esta área</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {colaboradores.map((col) => {
                const c = miArea?.colaboradores?.find((x: any) => x.usuario_id === col.usuario_id);
                return (
                  <div
                    key={col.usuario_id}
                    className="bg-white rounded-xl border border-slate-200 hover:border-blue-200 p-4 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-blue-700">
                          {col.nombres.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{col.nombres}</p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>{c?.servicios_completados ?? 0} servicios</span>
                          <span>·</span>
                          <span>{c?.tareas_completadas ?? 0} tareas</span>
                        </div>
                      </div>
                    </div>
                    {c?.calificacion_promedio != null && (
                      <div className="flex items-center gap-1.5 mb-3 text-xs text-slate-600">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{c.calificacion_promedio.toFixed(1)}</span>
                        <span className="text-slate-400">/ 5</span>
                      </div>
                    )}
                    <button
                      onClick={() => navigate(`/midesempeno?usuario_id=${col.usuario_id}`)}
                      className="w-full text-xs font-semibold text-center py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      Ver desempeño →
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
