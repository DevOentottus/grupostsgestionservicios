import { useQuery } from "@tanstack/react-query";
import { displayApi } from "@/api/client.js";

interface Tecnico {
  id: number;
  nombres: string;
  username: string;
}

interface WorkService {
  id: number;
  codigo: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  prioridad: string;
  cliente_nombre: string;
  area_id: number | null;
  bloqueado_motivo: string | null;
  fecha_inicio: string | null;
  tiempo_estimado: number | null;
  progreso: number;
  tareas_total: number;
  tareas_completadas: number;
  demorado: boolean;
  tecnicos: Tecnico[];
  created_at: string;
}

interface WorkRoomData {
  servicios: WorkService[];
  alertas: {
    bloqueados: number;
    demorados: number;
    total_activos: number;
  };
}

function prioridadBadge(pri: string): string {
  switch (pri) {
    case "urgente": return "bg-red-600";
    case "alta": return "bg-orange-500";
    case "media": return "bg-blue-500";
    default: return "bg-slate-400";
  }
}

export function DisplayWorkRoomPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["display", "trabajo"],
    queryFn: async () => {
      const r = await displayApi.trabajo();
      return r.data.data as WorkRoomData;
    },
    refetchInterval: 8000,
    refetchIntervalInBackground: true,
  });

  // Auto fullscreen on first interaction
  const handleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white text-2xl"
        onClick={handleFullScreen}
      >
        Cargando panel de trabajo...
      </div>
    );
  }

  const servicios = data?.servicios || [];
  const alertas = data?.alertas || { bloqueados: 0, demorados: 0, total_activos: 0 };

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-slate-900 text-white p-4 flex flex-col"
      onClick={handleFullScreen}
      style={{ cursor: "none" }}
    >
      {/* Header with alerts */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Panel de Trabajo</h1>
        <div className="flex gap-3 text-sm">
          {alertas.bloqueados > 0 && (
            <span className="px-3 py-1 rounded-full bg-red-600/20 text-red-400 border border-red-600/40">
              🔴 {alertas.bloqueados} bloqueados
            </span>
          )}
          {alertas.demorados > 0 && (
            <span className="px-3 py-1 rounded-full bg-orange-600/20 text-orange-400 border border-orange-600/40">
              🟠 {alertas.demorados} demorados
            </span>
          )}
          <span className="px-3 py-1 rounded-full bg-blue-600/20 text-blue-300">
            {alertas.total_activos} activos
          </span>
          <span className="text-slate-500 text-xs self-center">
            {new Date().toLocaleTimeString("es-PE")}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <table className="w-full text-sm">
          <thead className="text-slate-400 text-xs uppercase tracking-wider sticky top-0 bg-slate-900">
            <tr>
              <th className="text-left py-2 px-2">Código</th>
              <th className="text-left py-2 px-2">Cliente</th>
              <th className="text-left py-2 px-2">Título</th>
              <th className="text-center py-2 px-2">Prioridad</th>
              <th className="text-center py-2 px-2">Progreso</th>
              <th className="text-center py-2 px-2">Técnicos</th>
              <th className="text-center py-2 px-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {servicios.map((svc) => (
              <tr
                key={svc.id}
                className={`
                  border-t border-slate-800 transition-colors
                  ${svc.estado === "bloqueado" ? "bg-red-900/20" : ""}
                  ${svc.demorado && svc.estado !== "bloqueado" ? "bg-orange-900/20" : ""}
                  hover:bg-slate-800/50
                `}
              >
                <td className="py-3 px-2 font-mono font-bold">
                  {svc.codigo}
                </td>
                <td className="py-3 px-2 text-slate-300">{svc.cliente_nombre}</td>
                <td className="py-3 px-2 text-slate-300 max-w-[200px] truncate">
                  {svc.titulo}
                </td>
                <td className="py-3 px-2 text-center">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold text-white ${prioridadBadge(svc.prioridad)}`}
                  >
                    {svc.prioridad.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          svc.progreso === 100 ? "bg-green-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${svc.progreso}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-10 text-right">
                      {svc.progreso}%
                    </span>
                  </div>
                </td>
                <td className="py-3 px-2 text-center">
                  <div className="flex justify-center gap-1 flex-wrap">
                    {svc.tecnicos.map((t) => (
                      <span
                        key={t.id}
                        className="px-1.5 py-0.5 rounded bg-slate-700 text-xs text-slate-300"
                      >
                        {t.nombres.split(" ")[0]}
                      </span>
                    ))}
                    {svc.tecnicos.length === 0 && (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-2 text-center">
                  {svc.estado === "bloqueado" ? (
                    <span
                      className="text-red-400 text-xs cursor-help"
                      title={svc.bloqueado_motivo || ""}
                    >
                      🔴 Bloqueado
                    </span>
                  ) : svc.demorado ? (
                    <span className="text-orange-400 text-xs">🟠 Demorado</span>
                  ) : (
                    <span className="text-green-400 text-xs">🟢 Activo</span>
                  )}
                </td>
              </tr>
            ))}
            {servicios.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500 text-lg">
                  No hay servicios activos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
