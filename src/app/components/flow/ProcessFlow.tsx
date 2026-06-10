import { useMemo } from "react";

interface FlowStep {
  id: number;
  titulo: string;
  completada: boolean;
  orden: number;
  completada_at: string | null;
  tiempo_estimado: number | null;
  asignado_a_nombre?: string | null;
}

interface ProcessFlowProps {
  steps: FlowStep[];
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function calcularTiempoTranscurrido(completada_at: string | null, created_at?: string): number {
  if (completada_at) {
    return Math.floor(
      (new Date(completada_at).getTime() - new Date(created_at || completada_at).getTime()) / 60000
    );
  }
  return 0;
}

// ── Loading Skeleton ──
function FlowSkeleton() {
  return (
    <div className="flex gap-1 overflow-x-auto pb-2 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-slate-200" />
            <div className="w-20 h-3 bg-slate-200 rounded" />
            <div className="w-14 h-2 bg-slate-200 rounded" />
          </div>
          {i < 4 && <div className="w-8 h-0.5 bg-slate-200 mx-1" />}
        </div>
      ))}
    </div>
  );
}

// ── Empty State ──
function FlowEmpty() {
  return (
    <div className="text-center py-8">
      <p className="text-sm text-slate-400">No hay tareas para mostrar en el flujo</p>
    </div>
  );
}

// ── Error State ──
function FlowError({ message }: { message: string }) {
  return (
    <div className="text-center py-8">
      <p className="text-sm text-red-500">{message}</p>
    </div>
  );
}

export function ProcessFlow({ steps }: ProcessFlowProps) {
  const sortedSteps = useMemo(
    () => [...steps].sort((a, b) => a.orden - b.orden),
    [steps]
  );

  if (!steps) return <FlowError message="Error al cargar el flujo de proceso" />;
  if (steps.length === 0) return <FlowEmpty />;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-800 mb-6">Flujo de Proceso</h3>

      {/* Timeline Steps */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-start gap-0 min-w-max">
          {sortedSteps.map((step, index) => {
            const isCompleted = step.completada;
            const isLast = index === sortedSteps.length - 1;
            const elapsedTime = step.completada_at
              ? calcularTiempoTranscurrido(step.completada_at)
              : 0;

            return (
              <div key={step.id} className="flex items-start">
                <div className="flex flex-col items-center" style={{ minWidth: 120, maxWidth: 140 }}>
                  {/* Step Circle */}
                  <div
                    className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 flex-shrink-0 ${
                      isCompleted
                        ? "bg-green-500 border-green-500 text-white"
                        : "bg-white border-slate-300 text-slate-400"
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>

                  {/* Connector Line */}
                  {!isLast && (
                    <div
                      className={`h-1 w-full mt-5 ${
                        isCompleted && sortedSteps[index + 1]?.completada
                          ? "bg-green-400"
                          : isCompleted
                          ? "bg-gradient-to-r from-green-400 to-slate-200"
                          : "bg-slate-200"
                      }`}
                      style={{ marginTop: -20, marginLeft: 40, width: "calc(100% - 40px)" }}
                    />
                  )}

                  {/* Step Info */}
                  <div className="text-center mt-3 px-2">
                    <p
                      className={`text-xs font-medium leading-tight ${
                        isCompleted ? "text-green-700" : "text-slate-600"
                      }`}
                    >
                      {step.titulo}
                    </p>
                    {isCompleted && elapsedTime > 0 && (
                      <p className="text-xs text-slate-400 mt-1">
                        {formatDuration(elapsedTime)}
                      </p>
                    )}
                    {!isCompleted && step.tiempo_estimado && (
                      <p className="text-xs text-amber-500 mt-1">
                        Est: {formatDuration(step.tiempo_estimado)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Completado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-white border-2 border-slate-300" />
          <span>Pendiente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400">•</span>
          <span>Circulo # = Orden</span>
        </div>
      </div>
    </div>
  );
}

export { FlowSkeleton, FlowEmpty, FlowError };
