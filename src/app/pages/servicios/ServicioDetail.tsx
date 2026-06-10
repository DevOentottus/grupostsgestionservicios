import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useServicio, useTareas,
  useCrearTarea, useCompletarTarea, useReabrirTarea, useEliminarTarea,
  useCambiarEstado,
} from "@/api/queries/useServicios.js";
import {
  useIniciarTiempo, usePausarTiempo, useFinalizarTiempo, useListarTiempo,
} from "@/api/queries/useSeguimiento.js";

export function ServicioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const servicioId = parseInt(id!);
  const { data: servicio, isLoading } = useServicio(servicioId);
  const { data: tareas, isLoading: tareasLoading } = useTareas(servicioId);
  const { data: tiempos } = useListarTiempo(servicioId);
  const crearTarea = useCrearTarea();
  const completarTarea = useCompletarTarea();
  const reabrirTarea = useReabrirTarea();
  const eliminarTarea = useEliminarTarea();
  const cambiarEstado = useCambiarEstado();
  const iniciarTiempo = useIniciarTiempo();
  const pausarTiempo = usePausarTiempo();
  const finalizarTiempo = useFinalizarTiempo();
  const [nuevaTarea, setNuevaTarea] = useState("");

  if (isLoading) return <p className="text-slate-500">Cargando...</p>;
  if (!servicio) return <p className="text-red-500">Servicio no encontrado</p>;

  const handleAddTarea = async () => {
    if (!nuevaTarea.trim()) return;
    await crearTarea.mutateAsync({ servicioId, data: { titulo: nuevaTarea } });
    setNuevaTarea("");
  };

  const onChangeEstado = (estado: string) => {
    cambiarEstado.mutate({ id: servicioId, estado });
  };

  // Calcular tiempo total
  const tiempoTotalMin = tiempos?.reduce((acc: number, t: any) => {
    if (t.fin) {
      return acc + (new Date(t.fin).getTime() - new Date(t.inicio).getTime()) / 60000;
    }
    return acc;
  }, 0) || 0;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <button onClick={() => navigate("/servicios")} className="text-sm text-blue-600 hover:underline mb-2">← Servicios</button>
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs font-mono text-slate-400">{servicio.codigo}</span>
            <h2 className="text-2xl font-bold text-slate-800">{servicio.titulo}</h2>
            <p className="text-sm text-slate-500">{servicio.cliente_nombre}</p>
          </div>
          <div className="flex gap-2">
            {["pendiente", "en_progreso", "completado", "cancelado"].map((e) => (
              <button
                key={e}
                onClick={() => onChangeEstado(e)}
                disabled={servicio.estado === e}
                className={`text-xs px-2 py-1 rounded-full ${
                  servicio.estado === e
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                } disabled:opacity-50`}
              >
                {e.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
        {servicio.descripcion && (
          <p className="text-sm text-slate-600 mt-2">{servicio.descripcion}</p>
        )}
      </div>

      {/* Tareas */}
      <div className="bg-white rounded-xl border p-4 space-y-3">
        <h3 className="font-semibold text-slate-800">
          Tareas
          {tareas && <span className="text-slate-400 font-normal ml-1">({tareas.filter((t: any) => t.completada).length}/{tareas.length})</span>}
        </h3>

        {/* Agregar tarea */}
        <div className="flex gap-2">
          <input
            value={nuevaTarea}
            onChange={e => setNuevaTarea(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAddTarea()}
            placeholder="Nueva tarea..."
            className="flex-1 px-3 py-2 border rounded-lg text-sm"
          />
          <button onClick={handleAddTarea} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700">
            + Agregar
          </button>
        </div>

        {/* Lista */}
        <div className="space-y-1">
          {tareas
            ?.sort((a: any, b: any) => a.orden - b.orden)
            .map((tarea: any) => (
              <div key={tarea.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 group">
                <input
                  type="checkbox"
                  checked={tarea.completada}
                  onChange={() => tarea.completada ? reabrirTarea.mutate(tarea.id) : completarTarea.mutate(tarea.id)}
                  className="w-4 h-4"
                />
                <span className={`flex-1 text-sm ${tarea.completada ? "line-through text-slate-400" : "text-slate-700"}`}>
                  {tarea.titulo}
                </span>

                {/* Time tracking buttons */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => iniciarTiempo.mutate(tarea.id)}
                    className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
                    title="Iniciar"
                  >
                    ▶
                  </button>
                  <button
                    onClick={() => {
                      const tracking = tiempos?.find((t: any) => t.tarea_id === tarea.id && !t.fin);
                      if (tracking) {
                        if (tracking.pausa_at) {
                          // reanudar no implementado en la UI simplificada, finalizamos
                        }
                        finalizarTiempo.mutate(tracking.id);
                      }
                    }}
                    className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                    title="Finalizar"
                  >
                    ⏹
                  </button>
                  <button
                    onClick={() => eliminarTarea.mutate(tarea.id)}
                    className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-500 hover:bg-slate-200"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Tiempo total */}
      {tiempoTotalMin > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold text-slate-800 mb-1">Tiempo Total</h3>
          <p className="text-2xl font-bold text-slate-800">
            {Math.floor(tiempoTotalMin)} min
            {tiempoTotalMin >= 60 && <span className="text-sm font-normal text-slate-500 ml-1">({(tiempoTotalMin / 60).toFixed(1)} h)</span>}
          </p>
        </div>
      )}
    </div>
  );
}
