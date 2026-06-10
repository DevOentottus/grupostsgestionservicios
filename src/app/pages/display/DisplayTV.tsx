import { useQuery } from "@tanstack/react-query";
import { displayApi } from "@/api/client.js";

interface Tecnico {
  id: number;
  nombres: string;
}

interface TVService {
  id: number;
  codigo: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  prioridad: string;
  cliente_nombre: string;
  area_id: number | null;
  fecha_inicio: string | null;
  tiempo_estimado: number | null;
  progreso: number;
  tareas_total: number;
  tareas_completadas: number;
  tiempo_transcurrido_min: number;
  tecnicos: Tecnico[];
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function prioridadColor(pri: string): string {
  switch (pri) {
    case "urgente": return "border-red-500 bg-red-50";
    case "alta": return "border-orange-400 bg-orange-50";
    case "media": return "border-blue-400 bg-blue-50";
    default: return "border-slate-300 bg-slate-50";
  }
}

function prioridadBadge(pri: string): string {
  switch (pri) {
    case "urgente": return "bg-red-600";
    case "alta": return "bg-orange-500";
    case "media": return "bg-blue-500";
    default: return "bg-slate-400";
  }
}

export function DisplayTVPage() {
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
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white text-2xl">
        Cargando servicios activos...
      </div>
    );
  }

  const servicios = data || [];

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-900 text-white p-6"
      style={{ cursor: "none" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">ServicioLocalSTS — TV</h1>
        <span className="text-lg text-slate-400">
          {new Date().toLocaleTimeString("es-PE")}
          <span className="ml-3 text-sm animate-pulse">● EN VIVO</span>
        </span>
      </div>

      {servicios.length === 0 ? (
        <div className="h-[80vh] flex items-center justify-center text-slate-500 text-3xl">
          No hay servicios activos en este momento
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 h-[calc(100vh-100px)] overflow-y-auto scrollbar-hide">
          {servicios.map((svc) => (
            <div
              key={svc.id}
              className={`rounded-2xl border-2 p-5 flex flex-col justify-between transition-all ${prioridadColor(svc.prioridad)} bg-opacity-10 backdrop-blur-sm`}
            >
              {/* Header: Código + Prioridad */}
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-4xl font-bold text-white">{svc.codigo}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold text-white ${prioridadBadge(svc.prioridad)}`}>
                      {svc.prioridad.toUpperCase()}
                    </span>
                  </div>
                  {svc.tiempo_estimado && (
                    <span className="text-sm text-slate-400">
                      Est: {formatDuration(svc.tiempo_estimado)}
                    </span>
                  )}
                </div>

                {/* Cliente */}
                <p className="text-xl text-slate-200 mb-1">{svc.cliente_nombre}</p>

                {/* Descripción */}
                {svc.descripcion && (
                  <p className="text-sm text-slate-400 line-clamp-2 mb-4">{svc.descripcion}</p>
                )}
              </div>

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between text-sm text-slate-300 mb-1">
                  <span>Progreso</span>
                  <span>
                    {svc.tareas_completadas}/{svc.tareas_total} ({svc.progreso}%)
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3 mb-3">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${svc.progreso}%` }}
                  />
                </div>

                {/* Tiempo transcurrido */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">
                    ⏱ {formatDuration(svc.tiempo_transcurrido_min)}
                  </span>
                  {/* Técnicos */}
                  {svc.tecnicos.length > 0 && (
                    <div className="flex gap-1">
                      {svc.tecnicos.map((t) => (
                        <span
                          key={t.id}
                          className="px-2 py-0.5 rounded-full bg-slate-700 text-xs text-slate-300"
                        >
                          {t.nombres.split(" ")[0]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
