import { useState, useEffect } from "react";
import { useServicios } from "@/api/queries/useServicios.js";
import {
  Monitor, Clock, AlertTriangle, Activity,
  Maximize2, Minimize2, Users, Wifi,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

type MonitorMode = "general" | "sala-espera" | "sala-trabajo";

const statusConfig: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  en_progreso: { bg: "bg-blue-600", text: "text-white", label: "EN PROGRESO", dot: "bg-blue-300" },
  completado: { bg: "bg-green-600", text: "text-white", label: "COMPLETADO", dot: "bg-green-300" },
  pendiente: { bg: "bg-yellow-500", text: "text-blue-900", label: "PENDIENTE", dot: "bg-yellow-300" },
  bloqueado: { bg: "bg-red-600", text: "text-white", label: "BLOQUEADO", dot: "bg-red-300" },
};

const statusLabel: Record<string, string> = {
  pendiente: "Pendiente",
  en_progreso: "En Progreso",
  completado: "Completado",
  bloqueado: "Bloqueado",
  cancelado: "Cancelado",
};

export function MonitorPage() {
  const [mode, setMode] = useState<MonitorMode>("general");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data: servicios } = useServicios();

  useEffect(() => {
    const timer = setInterval(() => { setCurrentTime(new Date()); }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeServices = (servicios || []).filter(
    (s: any) => s.estado === "en_progreso" || s.estado === "pendiente" || s.estado === "bloqueado"
  );

  if (isFullscreen) {
    return (
      <FullscreenMonitor
        mode={mode}
        currentTime={currentTime}
        services={activeServices}
        onExit={() => setIsFullscreen(false)}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700 }}>Monitor / Sala</h1>
          <p className="text-gray-500 text-sm">Visualización en tiempo real para pantallas y sala de espera</p>
        </div>
        <button
          onClick={() => setIsFullscreen(true)}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm transition"
          style={{ fontWeight: 600 }}
        >
          <Maximize2 className="w-4 h-4" />
          Modo Pantalla Completa
        </button>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {([
          { id: "general" as const, label: "Vista General", desc: "Todos los servicios en curso", icon: Monitor },
          { id: "sala-espera" as const, label: "Sala de Espera", desc: "Vista para clientes", icon: Clock },
          { id: "sala-trabajo" as const, label: "Sala de Trabajo", desc: "Vista interna para técnicos", icon: Users },
        ]).map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              "p-4 rounded-2xl border-2 text-left transition",
              mode === m.id ? "border-blue-600 bg-blue-50" : "border-gray-100 bg-white hover:border-gray-200",
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
              mode === m.id ? "bg-blue-900" : "bg-gray-100",
            )}>
              <m.icon className={cn("w-5 h-5", mode === m.id ? "text-yellow-400" : "text-gray-500")} />
            </div>
            <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{m.label}</p>
            <p className="text-gray-500 text-xs">{m.desc}</p>
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-xl border-4 border-gray-800">
        {/* Screen header bar */}
        <div className="bg-gray-800 px-4 py-2 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-2 text-gray-400 text-xs">
            Monitor Preview — {mode === "general" ? "Vista General" : mode === "sala-espera" ? "Sala de Espera" : "Sala de Trabajo"}
          </span>
          <div className="ml-auto flex items-center gap-1.5 text-green-400 text-xs">
            <Wifi className="w-3 h-3" />
            <span>En vivo</span>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          </div>
        </div>

        {/* Screen content */}
        <div style={{ minHeight: "500px" }} className="p-1">
          {mode === "general" && <GeneralView currentTime={currentTime} services={activeServices} />}
          {mode === "sala-espera" && <WaitingRoomView currentTime={currentTime} services={activeServices} />}
          {mode === "sala-trabajo" && <WorkRoomView currentTime={currentTime} services={activeServices} />}
        </div>
      </div>
    </div>
  );
}

// ── Sub-views ──

function GeneralView({ currentTime, services }: { currentTime: Date; services: any[] }) {
  return (
    <div className="bg-blue-950 min-h-96 p-6 rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
            <Monitor className="w-6 h-6 text-blue-900" />
          </div>
          <div>
            <p className="text-white text-lg" style={{ fontWeight: 700 }}>ServicioLocal STS — Panel General</p>
            <p className="text-blue-300 text-sm">
              {currentTime.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-yellow-400 text-3xl" style={{ fontWeight: 700, fontFamily: "monospace" }}>
            {currentTime.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-blue-300 text-xs">{services.length} servicios activos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {services.map((srv: any) => {
          const cfg = statusConfig[srv.estado] || statusConfig.pendiente;
          const prog = srv.progreso_porcentaje ?? srv.progreso ?? 0;
          return (
            <div key={srv.id} className="bg-blue-900/50 rounded-xl p-4 border border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-yellow-400 text-sm" style={{ fontWeight: 700 }}>{srv.codigo}</span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full", cfg.bg, cfg.text)} style={{ fontWeight: 700 }}>
                  {statusLabel[srv.estado] || srv.estado}
                </span>
              </div>
              <p className="text-white text-xs mb-1 truncate">{srv.cliente_nombre}</p>
              <p className="text-blue-300 text-xs mb-3 truncate">{srv.area_nombre || ""}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-blue-300">{srv.tareas_completadas || 0}/{srv.tareas_total || 0} tareas</span>
                  <span className="text-white" style={{ fontWeight: 700 }}>{prog}%</span>
                </div>
                <div className="h-2 bg-blue-900 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", cfg.bg)} style={{ width: `${prog}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WaitingRoomView({ currentTime, services }: { currentTime: Date; services: any[] }) {
  const highlightedService = services[Math.floor(Date.now() / 10000) % services.length] || null;
  if (!highlightedService) {
    return (
      <div className="bg-gradient-to-b from-blue-900 to-blue-950 min-h-96 p-8 rounded-xl flex flex-col items-center justify-center text-center">
        <p className="text-blue-300 text-sm mb-2">ServicioLocal STS — Sala de Espera</p>
        <p className="text-yellow-400 text-5xl mb-6" style={{ fontWeight: 800, fontFamily: "monospace" }}>
          {currentTime.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="text-blue-300 text-lg">No hay servicios en este momento</p>
      </div>
    );
  }

  const cfg = statusConfig[highlightedService.estado] || statusConfig.pendiente;
  const prog = highlightedService.progreso_porcentaje ?? highlightedService.progreso ?? 0;

  return (
    <div className="bg-gradient-to-b from-blue-900 to-blue-950 min-h-96 p-8 rounded-xl flex flex-col items-center justify-center text-center">
      <p className="text-blue-300 text-sm mb-2">ServicioLocal STS — Sala de Espera</p>
      <p className="text-yellow-400 text-5xl mb-6" style={{ fontWeight: 800, fontFamily: "monospace" }}>
        {currentTime.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
      </p>

      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 w-full max-w-md border border-white/20">
        <p className="text-blue-200 text-sm mb-1">Servicio en atención</p>
        <p className="text-yellow-400 text-2xl mb-3" style={{ fontWeight: 800 }}>{highlightedService.codigo}</p>
        <p className="text-white text-sm mb-4">{highlightedService.cliente_nombre}</p>

        <div className={cn("inline-block px-4 py-2 rounded-full text-sm mb-4", cfg.bg, cfg.text)} style={{ fontWeight: 700 }}>
          {cfg.label}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-blue-300">Progreso</span>
            <span className="text-white" style={{ fontWeight: 700 }}>{prog}%</span>
          </div>
          <div className="h-3 bg-blue-950 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${prog}%` }} />
          </div>
          <p className="text-blue-300 text-xs">
            {highlightedService.tareas_completadas || 0} de {highlightedService.tareas_total || 0} tareas completadas
          </p>
        </div>
      </div>

      <p className="text-blue-400 text-xs mt-6">Los técnicos están trabajando en su servicio. Gracias por su espera.</p>
    </div>
  );
}

function WorkRoomView({ currentTime, services }: { currentTime: Date; services: any[] }) {
  const activeServices = services.filter((s: any) => s.estado === "en_progreso" || s.estado === "bloqueado");

  return (
    <div className="bg-gray-950 min-h-96 p-6 rounded-xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-white text-lg" style={{ fontWeight: 700 }}>Panel Técnico Interno</p>
          <p className="text-gray-400 text-sm">
            {currentTime.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <p className="text-green-400 text-2xl" style={{ fontWeight: 700, fontFamily: "monospace" }}>
          {currentTime.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      </div>

      <div className="space-y-3">
        {activeServices.map((srv: any) => {
          const isBlocked = srv.estado === "bloqueado";
          const prog = srv.progreso_porcentaje ?? srv.progreso ?? 0;
          return (
            <div
              key={srv.id}
              className={cn(
                "rounded-xl p-4 border",
                isBlocked ? "bg-red-950/50 border-red-800" : "bg-gray-900 border-gray-800",
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                  isBlocked ? "bg-red-600" : "bg-blue-600",
                )}>
                  {isBlocked
                    ? <AlertTriangle className="w-6 h-6 text-white" />
                    : <Activity className="w-6 h-6 text-white" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-yellow-400 text-sm" style={{ fontWeight: 700 }}>{srv.codigo}</span>
                    {isBlocked && (
                      <span className="text-red-400 text-xs bg-red-900 px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>
                        ⚠ BLOQUEADO
                      </span>
                    )}
                  </div>
                  <p className="text-white text-sm truncate">{srv.titulo || srv.descripcion}</p>
                  <p className="text-gray-400 text-xs">
                    {srv.area_nombre || "Sin área"}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-white text-xl" style={{ fontWeight: 700 }}>{prog}%</p>
                  <p className="text-gray-400 text-xs">{srv.tareas_completadas || 0}/{srv.tareas_total || 0}</p>
                </div>
              </div>
              {!isBlocked && (
                <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${prog}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FullscreenMonitor({
  mode, currentTime, services, onExit,
}: {
  mode: MonitorMode;
  currentTime: Date;
  services: any[];
  onExit: () => void;
}) {
  const [time, setTime] = useState(currentTime);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-blue-950 overflow-auto">
      <button
        onClick={onExit}
        className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-sm transition"
      >
        <Minimize2 className="w-4 h-4" />
        Salir de pantalla completa
      </button>
      {mode === "general" && <GeneralView currentTime={time} services={services} />}
      {mode === "sala-espera" && <WaitingRoomView currentTime={time} services={services} />}
      {mode === "sala-trabajo" && <WorkRoomView currentTime={time} services={services} />}
    </div>
  );
}
