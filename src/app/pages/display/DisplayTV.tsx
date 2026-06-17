import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { displayApi } from "@/api/client.js";

interface TVService {
  id: number;
  codigo: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  cliente_nombre: string;
  area_id: number | null;
  progreso: number;
  tareas_total: number;
  tareas_completadas: number;
  tiempo_transcurrido_min: number;
  tecnico: { id: number; nombres: string } | null;
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  en_progreso: { bg: "bg-blue-600", text: "text-white", label: "EN PROGRESO" },
  completado: { bg: "bg-green-600", text: "text-white", label: "COMPLETADO" },
  pendiente: { bg: "bg-yellow-500", text: "text-blue-900", label: "PENDIENTE" },
  bloqueado: { bg: "bg-red-600", text: "text-white", label: "BLOQUEADO" },
};

export function DisplayTVPage() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["display", "tv"],
    queryFn: async () => {
      const r = await displayApi.tv();
      return r.data.data as TVService[];
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-950 text-white text-2xl">
        Cargando servicios activos...
      </div>
    );
  }

  const servicios = data || [];
  const activos = servicios.filter(s => s.estado === "en_progreso");

  return (
    <div className="min-h-screen bg-blue-950 p-6 flex flex-col" style={{ cursor: "none" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
            <span className="text-blue-900 font-bold text-lg">STS</span>
          </div>
          <div>
            <p className="text-white text-lg font-bold">ServicioLocalSTS -- Panel General</p>
            <p className="text-blue-300 text-sm">
              {currentTime.toLocaleDateString("es-PE", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-yellow-400 text-3xl font-bold font-mono">
            {currentTime.toLocaleTimeString("es-PE", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="text-blue-300 text-xs">{activos.length} servicios activos</p>
        </div>
      </div>

      {/* Content */}
      {servicios.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-blue-500 text-3xl">
          No hay servicios activos en este momento
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {servicios.map((svc) => {
              const cfg = statusConfig[svc.estado] || statusConfig.en_progreso;
              return (
                <div
                  key={svc.id}
                  className="bg-blue-900/50 rounded-xl p-4 border border-blue-800 hover:border-blue-600 transition-colors"
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-yellow-400 text-sm font-bold">{svc.codigo}</span>
                    {svc.cliente_nombre && (
                      <span className="text-blue-300 text-xs truncate ml-2">{svc.cliente_nombre}</span>
                    )}
                  </div>

                  {/* Estado badge + técnico */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} font-bold`}>
                      {cfg.label}
                    </span>
                    {svc.tecnico && (
                      <span className="text-xs text-blue-300 bg-blue-800/50 px-1.5 py-0.5 rounded">
                        {svc.tecnico.nombres?.split(" ")[0] || "--"}
                      </span>
                    )}
                  </div>

                  {/* Descripción */}
                  {svc.titulo && (
                    <p className="text-white text-xs mb-3 line-clamp-2">{svc.titulo}</p>
                  )}

                  {/* Progreso */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-300">
                        {svc.tareas_completadas}/{svc.tareas_total} tareas
                      </span>
                      <span className="text-white font-bold">{svc.progreso}%</span>
                    </div>
                    <div className="h-2 bg-blue-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          svc.progreso === 100 ? "bg-green-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${svc.progreso}%` }}
                      />
                    </div>
                  </div>

                  {/* Tiempo transcurrido */}
                  {svc.tiempo_transcurrido_min > 0 && (
                    <p className="text-blue-400 text-xs mt-2">
                      ⏱ {svc.tiempo_transcurrido_min < 60
                        ? `${svc.tiempo_transcurrido_min} min`
                        : `${Math.floor(svc.tiempo_transcurrido_min / 60)}h ${svc.tiempo_transcurrido_min % 60}m`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
