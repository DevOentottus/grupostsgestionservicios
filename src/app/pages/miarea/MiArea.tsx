import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth.js";
import { useMiArea } from "@/api/queries/useManager.js";
import type { ManagerMiAreaResponse } from "@shared/index.js";
import {
  Building2, Users, Wrench, Clock, CheckCircle2,
  AlertTriangle, AlertCircle, X, Trophy, Star,
  ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

const statusConfig: Record<string, { bg: string; text: string; dot: string; bar: string }> = {
  pendiente:   { bg: "bg-yellow-100", text: "text-yellow-800", dot: "bg-yellow-500", bar: "bg-yellow-400" },
  en_progreso: { bg: "bg-blue-100",   text: "text-blue-800",   dot: "bg-blue-500",   bar: "bg-blue-600" },
  completado:  { bg: "bg-green-100",  text: "text-green-800",  dot: "bg-green-500",  bar: "bg-green-500" },
  cancelado:   { bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400",   bar: "bg-gray-400" },
  bloqueado:   { bg: "bg-red-100",    text: "text-red-800",    dot: "bg-red-500",    bar: "bg-red-500" },
};

const statusDisplay: Record<string, string> = {
  pendiente: "Pendiente",
  en_progreso: "En Progreso",
  completado: "Completado",
  cancelado: "Cancelado",
  bloqueado: "Bloqueado",
};

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5" title={`${rating.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "w-3 h-3",
            i <= full
              ? "fill-yellow-400 text-yellow-400"
              : i === full + 1 && half
                ? "fill-yellow-400/50 text-yellow-400"
                : "fill-slate-200 text-slate-200"
          )}
        />
      ))}
    </span>
  );
}

export function MiAreaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rankingSort, setRankingSort] = useState<"desc" | "asc">("desc");
  const [showInactivos, setShowInactivos] = useState(false);
  const { data, isLoading, isError } = useMiArea(user?.area_id ?? undefined);

  const serviciosPorEstado = useMemo(() => {
    if (!data?.servicios) return {};
    const map: Record<string, typeof data.servicios> = {};
    for (const s of data.servicios) {
      const e = s.estado || "pendiente";
      if (!map[e]) map[e] = [];
      map[e].push(s);
    }
    return map;
  }, [data]);

  // Always call this useMemo unconditionally -- guard against data being null
  const colaboradoresOrdenados = useMemo(() => {
    const cols = showInactivos ? (data?.colaboradores || []) : (data?.colaboradores || []).filter((c) => c.activo !== false);
    return [...cols].sort((a, b) =>
      rankingSort === "desc"
        ? (b.servicios_completados || 0) - (a.servicios_completados || 0)
        : (a.servicios_completados || 0) - (b.servicios_completados || 0)
    );
  }, [data?.colaboradores, rankingSort, showInactivos]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="h-8 bg-slate-200 rounded-lg w-48" />
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center py-16">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">No se pudo cargar tu área</p>
        <p className="text-sm text-slate-400 mt-1">
          {user?.area_id ? "Error al conectar con el servidor" : "No tenés un área asignada"}
        </p>
      </div>
    );
  }

  const { area, servicios, estado_counts, colaboradores } = data;
  const total = estado_counts.total || 1;
  const activos = colaboradores.filter((c) => c.activo !== false).length;
  const encargadoNombre = area.encargado_nombre || null;

  // Área → tono de gris para la barra superior + contraste de texto
  const AREA_THEME: Record<number, { bar: string; text: string }> = {
    90: { bar: "bg-gray-300", text: "text-gray-900" },
    92: { bar: "bg-gray-500", text: "text-white"     },
    93: { bar: "bg-gray-700", text: "text-white"     },
  };
  const DEFAULT_THEME = { bar: "bg-gray-200", text: "text-gray-900" };
  const theme = AREA_THEME[area.id] || DEFAULT_THEME;

  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  const estadoCards = [
    { key: "total",       label: "Total",               count: estado_counts.total,                              color: "text-slate-700",  bg: "bg-slate-100" },
    { key: "pendiente",   label: "Pendientes",           count: estado_counts.pendiente,                          color: "text-yellow-600", bg: "bg-yellow-100" },
    { key: "en_progreso", label: "En Progreso",          count: estado_counts.en_progreso,                        color: "text-blue-600",   bg: "bg-blue-100" },
    { key: "completado",  label: "Completados",          count: estado_counts.completado,                         color: "text-green-600",  bg: "bg-green-100" },
    { key: "bloqueados",  label: "Bloqueados/Cancelados", count: estado_counts.bloqueado + estado_counts.cancelado, color: "text-red-600",    bg: "bg-red-100" },
  ];

  return (
    <div className="space-y-6">
      {/* Header — barra con nombre, stats y encargado */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className={`${theme.bar} ${theme.text} px-4 py-2.5 flex items-center gap-2 text-sm flex-wrap`}>
          <span className="font-bold">{area.nombre}</span>
          <span className="opacity-40">·</span>
          <span>{servicios.length} servicios</span>
          <span className="opacity-40">·</span>
          <span>{activos} colaboradores</span>
          {encargadoNombre && (
            <>
              <span className="opacity-40">·</span>
              <span>Encargado: {encargadoNombre}</span>
            </>
          )}
        </div>
      </div>

      {/* Estado Count Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {estadoCards.map((card) => (
          <div key={card.key} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className={cn("text-2xl font-bold", card.color)}>
              {card.count}
              {card.key !== "total" && (
                <span className="text-base font-normal text-slate-400 ml-1">
                  | {pct(card.count)}%
                </span>
              )}
            </p>
            <p className="text-xs text-slate-500">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Servicios + Ranking side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Servicios — 3 columnas */}
        <div className="lg:col-span-3">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-slate-400" />
            Servicios del área
          </h3>

          {servicios.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <Wrench className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No hay servicios en esta área</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {servicios.map((s) => {
                const cfg = statusConfig[s.estado] || statusConfig.pendiente;
                return (
                  <div
                    key={s.id}
                    onClick={user?.rol !== "colaborador" ? () => navigate(`/servicios/${s.id}`) : undefined}
                    className={cn(
                      "bg-white rounded-xl border border-slate-200 overflow-hidden transition-all",
                      user?.rol !== "colaborador"
                        ? "hover:border-blue-300 hover:shadow-sm cursor-pointer"
                        : "opacity-80"
                    )}
                  >
                    <div className={cn("h-1.5", cfg.bar)} />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-slate-400">{s.codigo}</span>
                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}>
                              {statusDisplay[s.estado] || s.estado}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-800 truncate">{s.titulo}</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                          <span>Progreso</span>
                          <span>{s.progreso}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", cfg.bar)}
                            style={{ width: `${s.progreso}%` }}
                          />
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                        <Users className="w-3 h-3" />
                        {s.tecnico?.nombres || <span className="italic">Sin técnico</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Ranking */}
        {colaboradores.length > 0 && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 p-4 sticky top-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Ranking
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowInactivos((v) => !v)}
                    className={cn(
                      "text-xs px-2 py-1 rounded-lg transition-colors",
                      showInactivos
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                    )}
                    title={showInactivos ? "Ocultar inactivos" : "Mostrar inactivos"}
                  >
                    {showInactivos ? "Inactivos" : "Activos"}
                  </button>
                  <button
                    onClick={() => setRankingSort((s) => (s === "desc" ? "asc" : "desc"))}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors"
                    title={rankingSort === "desc" ? "Ascendente" : "Descendente"}
                  >
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {colaboradoresOrdenados.map((col, idx) => {
                  const pos = idx + 1;
                  const medal = pos === 1 ? "text-yellow-500" : pos === 2 ? "text-gray-400" : pos === 3 ? "text-amber-700" : "text-slate-300";
                  return (
                    <div
                      key={col.usuario_id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <span className={`w-5 text-center text-sm font-bold ${medal}`}>
                        {pos <= 3 ? ["1°","2°","3°"][pos-1] : `#${pos}`}
                      </span>
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <span className="text-[9px] font-semibold text-slate-600">
                          {`${col.nombres || ""} ${col.apellidos || ""}`.split(" ").filter(Boolean).map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">
                          {[col.nombres, col.apellidos].filter(Boolean).join(" ")}
                          {col.activo === false && (
                            <span className="ml-1 text-[9px] text-red-500 bg-red-50 px-1 rounded-full">inactivo</span>
                          )}
                        </p>
                      </div>
                      {col.calificacion_promedio != null && (
                        <StarRating rating={col.calificacion_promedio} />
                      )}
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-green-600">{col.servicios_completados || 0}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
