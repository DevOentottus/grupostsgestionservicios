import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { serviciosApi } from "@/api/client.js";

interface WaitingRoomData {
  servicio: {
    id: number;
    codigo: string;
    titulo: string;
    estado: string;
    prioridad: string;
    cliente_nombre: string;
    fecha_inicio: string | null;
    tiempo_estimado: number | null;
  };
  tareas: {
    id: number;
    completada: boolean;
    tiempo_estimado: number | null;
  }[];
}

function formatETA(minutes: number): string {
  if (minutes < 1) return "Menos de 1 min";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function estadoLabel(estado: string): string {
  const map: Record<string, string> = {
    pendiente: "Pendiente",
    en_progreso: "En Progreso",
    completado: "Completado",
    cancelado: "Cancelado",
    bloqueado: "Bloqueado",
  };
  return map[estado] || estado;
}

function estadoColor(estado: string): string {
  switch (estado) {
    case "en_progreso": return "bg-blue-600";
    case "completado": return "bg-green-600";
    case "pendiente": return "bg-amber-500";
    case "bloqueado": return "bg-red-600";
    case "cancelado": return "bg-slate-500";
    default: return "bg-slate-400";
  }
}

export function DisplayWaitingRoomPage() {
  const [codigo, setCodigo] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["display", "sala-espera", busqueda],
    queryFn: async () => {
      const r = await serviciosApi.obtenerServicioPublico(busqueda);
      return r.data.data as WaitingRoomData;
    },
    enabled: busqueda.length > 0,
    refetchInterval: busqueda ? 5000 : false,
    refetchIntervalInBackground: true,
    retry: false,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (codigo.trim()) {
      setBusqueda(codigo.trim());
    }
  };

  const servicio = data?.servicio;
  const tareas = data?.tareas || [];

  const completadas = tareas.filter((t) => t.completada).length;
  const total = tareas.length;
  const progreso = total > 0 ? Math.round((completadas / total) * 100) : 0;

  // ETA: remaining tasks * avg estimated time / remaining tasks
  const tareasPendientes = tareas.filter((t) => !t.completada);
  const etaMinutos = tareasPendientes.reduce(
    (sum, t) => sum + (t.tiempo_estimado || 15),
    0
  );

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex flex-col items-center justify-center p-8">
      {/* Logo / Title */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold tracking-tight mb-2">ServicioLocalSTS</h1>
        <p className="text-xl text-blue-200">Seguimiento de Servicios</p>
      </div>

      {/* Search */}
      {!busqueda ? (
        <form onSubmit={handleSearch} className="w-full max-w-lg">
          <label className="block text-center text-2xl mb-4 text-slate-300">
            Ingrese el código de su servicio
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ej: SVC-001"
              className="flex-1 px-6 py-4 rounded-xl bg-white/10 border border-white/20 text-white text-2xl placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500/50 text-center uppercase"
              autoFocus
            />
            <button
              type="submit"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl text-xl font-bold transition-colors"
            >
              Consultar
            </button>
          </div>
        </form>
      ) : (
        /* Results */
        <div className="w-full max-w-2xl">
          {isLoading && (
            <div className="text-center text-2xl text-slate-400 animate-pulse">
              Consultando servicio...
            </div>
          )}

          {error && !isLoading && (
            <div className="text-center">
              <div className="text-6xl mb-6">🔍</div>
              <h2 className="text-3xl font-bold text-red-400 mb-2">
                Servicio no encontrado
              </h2>
              <p className="text-xl text-slate-400 mb-6">
                El código "{busqueda}" no corresponde a ningún servicio activo.
              </p>
              <button
                onClick={() => { setBusqueda(""); setCodigo(""); }}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-lg font-bold transition-colors"
              >
                Intentar de nuevo
              </button>
            </div>
          )}

          {servicio && !isLoading && (
            <div className="space-y-8">
              {/* Service Number - Large */}
              <div className="text-center">
                <p className="text-sm text-slate-400 uppercase tracking-widest mb-1">
                  Su servicio
                </p>
                <p className="text-8xl font-black tracking-tighter mb-2">
                  {servicio.codigo}
                </p>
                <span
                  className={`inline-block px-6 py-2 rounded-full text-xl font-bold ${estadoColor(servicio.estado)}`}
                >
                  {estadoLabel(servicio.estado)}
                </span>
              </div>

              {/* Progress */}
              <div className="bg-white/10 backdrop-blur rounded-2xl p-8 space-y-6">
                <div>
                  <div className="flex justify-between text-xl mb-2">
                    <span>Progreso</span>
                    <span className="font-bold">{progreso}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-5 overflow-hidden">
                    <div
                      className="bg-green-500 h-5 rounded-full transition-all duration-1000"
                      style={{ width: `${progreso}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-400 mt-1 text-center">
                    {completadas} de {total} tareas completadas
                  </p>
                </div>

                {/* ETA */}
                <div className="text-center">
                  <p className="text-sm text-slate-400 uppercase tracking-widest">
                    Tiempo estimado restante
                  </p>
                  <p className="text-5xl font-bold text-blue-300 mt-1">
                    {formatETA(etaMinutos)}
                  </p>
                </div>
              </div>

              {/* Service Info */}
              <div className="text-center text-lg text-slate-300">
                <p className="font-semibold text-white text-xl">{servicio.titulo}</p>
                <p>Cliente: {servicio.cliente_nombre}</p>
              </div>

              {/* Back button */}
              <div className="text-center">
                <button
                  onClick={() => { setBusqueda(""); setCodigo(""); }}
                  className="px-6 py-2 text-slate-400 hover:text-white transition-colors text-sm"
                >
                  ← Consultar otro servicio
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
