import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth.js";
import { useMiArea } from "@/api/queries/useManager.js";
import {
  Building2, Users, Wrench, Trophy, Star,
  ArrowUpDown, ArrowRight, Search, Eye, EyeOff,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { PieChartCard } from "@/app/components/charts/PieChart.js";
import { DateFilterCard } from "@/app/components/filters/DateFilterCard.js";

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
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [filtroColaborador, setFiltroColaborador] = useState<number | "todos">("todos");
  const [busqueda, setBusqueda] = useState("");

  // Filtro de fechas
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [periodoLabel, setPeriodoLabel] = useState("Todas");
  const setPeriodo = (label: string, inicio: Date | null, fin: Date | null) => {
    setFechaInicio(inicio ? inicio.toISOString().split("T")[0] : "");
    setFechaFin(fin ? fin.toISOString().split("T")[0] : "");
    setPeriodoLabel(label);
  };
  const presetsFecha = [
    { label: "Sin filtro", active: periodoLabel === "Sin filtro" || periodoLabel === "Todas", action: () => setPeriodo("Sin filtro", null, null) },
    { label: "Hoy", active: periodoLabel === "Hoy", action: () => { const h = new Date(); setPeriodo("Hoy", h, h); } },
    { label: "Esta semana", active: periodoLabel === "Esta semana", action: () => { const hoy = new Date(); const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - (hoy.getDay() === 0 ? 6 : hoy.getDay() - 1)); setPeriodo("Esta semana", lunes, hoy); } },
    { label: "Este mes", active: periodoLabel === "Este mes", action: () => { const hoy = new Date(); const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1); setPeriodo("Este mes", inicio, hoy); } },
  ];
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

  // MUST be unconditional (before early returns) to avoid React #310
  const serviciosFiltrados = useMemo(() => {
    if (!data?.servicios) return [];
    return data.servicios.filter((s) => {
      if (filtroEstado !== "todos" && s.estado !== filtroEstado) return false;
      if (filtroColaborador !== "todos" && s.colaborador_id !== filtroColaborador) return false;
      if (busqueda.trim()) {
        const q = busqueda.trim().toLowerCase();
        return (
          s.codigo?.toLowerCase().includes(q) ||
          s.titulo?.toLowerCase().includes(q)
        );
      }
      if (fechaInicio && fechaFin) {
        const d = (s.created_at ?? "").split("T")[0];
        if (d < fechaInicio || d > fechaFin) return false;
      }
      return true;
    });
  }, [data?.servicios, filtroEstado, filtroColaborador, busqueda, fechaInicio, fechaFin]);

  // Tiempo promedio de servicios completados en el período del filtro
  const tiempoPromedio = useMemo(() => {
    if (!data?.servicios) return null;
    const completados = data.servicios.filter((s) => {
      if (s.estado !== "completado") return false;
      if (!s.tiempo_total_minutos || s.tiempo_total_minutos <= 0) return false;
      if (fechaInicio && fechaFin) {
        // Usar fecha_fin (fecha de completado) para filtrar
        const d = (s.fecha_fin ?? "").split("T")[0];
        if (!d) return false;
        if (d < fechaInicio || d > fechaFin) return false;
      }
      return true;
    });
    if (completados.length === 0) return null;
    const totalMin = completados.reduce((sum, s) => sum + s.tiempo_total_minutos, 0);
    const avgMin = totalMin / completados.length;
    const h = Math.floor(avgMin / 60);
    const m = Math.round(avgMin % 60);
    return { texto: `${h}h ${m}min`, count: completados.length };
  }, [data?.servicios, fechaInicio, fechaFin]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 h-64 bg-slate-200 rounded-xl" />
          <div className="lg:col-span-1 h-64 bg-slate-200 rounded-xl" />
          <div className="lg:col-span-2 h-64 bg-slate-200 rounded-xl" />
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
  const activos = colaboradores.filter((c) => c.activo !== false).length;
  const encargadoNombre = area.encargado_nombre || null;

  const estadoPieData = [
    { name: "Pendiente",    value: estado_counts.pendiente,   color: "#f59e0b" },
    { name: "En Progreso",  value: estado_counts.en_progreso, color: "#3b82f6" },
    { name: "Completado",   value: estado_counts.completado,  color: "#22c55e" },
    { name: "Bloqueado",    value: estado_counts.bloqueado,   color: "#ef4444" },
    { name: "Cancelado",    value: estado_counts.cancelado,   color: "#8b5cf6" },
  ];

  return (
    <div className="space-y-6">
      {/* Header — nombre, stats y encargado */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-5 text-white shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-bold text-white">{area.nombre}</h1>
            <span className="text-blue-200 text-sm">·</span>
            <span className="text-blue-200 text-sm">{servicios.length} servicios</span>
            <span className="text-blue-200 text-sm">·</span>
            <span className="text-blue-200 text-sm">{activos} colaboradores</span>
          </div>
          {encargadoNombre && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-blue-200">Encargado: <strong className="text-white">{encargadoNombre}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Filtro de fechas */}
      <DateFilterCard
        presets={presetsFecha}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        periodoLabel={periodoLabel}
        onFechaInicio={(v) => setFechaInicio(v)}
        onFechaFin={(v) => setFechaFin(v)}
        onLabelChange={(l) => setPeriodoLabel(l)}
      />

      {/* Indicadores del área: pie chart, satisfacción, ranking */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          Indicadores del área
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Pie chart (2 cols) */}
          <div className="lg:col-span-2">
            <PieChartCard title="Servicios por Estado" data={estadoPieData} />
          </div>

          {/* Center: Satisfacción + NPS (1 col) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 p-4 h-full flex flex-col gap-3">
              {/* Satisfacción */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Satisfacción</h4>
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-2xl font-bold text-slate-900">
                    {data.satisfaccion.promedio.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-400">/ 5</span>
                  <StarRating rating={data.satisfaccion.promedio} />
                </div>
                <div className="mt-2">
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500"
                      style={{ width: `${(data.satisfaccion.promedio / 5) * 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 text-center">{data.satisfaccion.cantidad} evaluaciones</p>
                </div>

                {/* Métricas de calificación */}
                <div className="space-y-2 mt-3">
                  <div>
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span className="text-slate-600">Clientes que califican</span>
                      <span className="font-semibold text-slate-800">{data.satisfaccion.servicios_evaluados_pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${Math.min(data.satisfaccion.servicios_evaluados_pct, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span className="text-slate-600">Calificaciones positivas (≥3)</span>
                      <span className="font-semibold text-green-600">{data.satisfaccion.calificaciones_positivas_pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{ width: `${Math.min(data.satisfaccion.calificaciones_positivas_pct, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span className="text-slate-600">Calificaciones negativas (&lt;3)</span>
                      <span className="font-semibold text-red-500">{data.satisfaccion.calificaciones_negativas_pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-red-400"
                        style={{ width: `${Math.min(data.satisfaccion.calificaciones_negativas_pct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100" />

              {/* NPS */}
              <div>
                <div className="flex items-center gap-1.5 mb-2 justify-center">
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">NPS</h4>
                </div>
                {data.satisfaccion.cantidad > 0 ? (
                  <>
                    <div className="flex items-center justify-center gap-1">
                      <span className={cn(
                        "text-2xl font-bold",
                        data.satisfaccion.nps > 0 ? "text-green-600" : data.satisfaccion.nps < 0 ? "text-red-600" : "text-slate-500"
                      )}>
                        {data.satisfaccion.nps > 0 ? "+" : ""}{data.satisfaccion.nps}
                      </span>
                      <span className="text-[11px] text-slate-400">/ 100</span>
                    </div>
                    {/* Barra de distribución apilada */}
                    <div className="w-full h-2 rounded-full overflow-hidden flex mt-2">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${(data.satisfaccion.promotores / data.satisfaccion.cantidad) * 100}%` }}
                      />
                      <div
                        className="h-full bg-yellow-400 transition-all"
                        style={{ width: `${(data.satisfaccion.pasivos / data.satisfaccion.cantidad) * 100}%` }}
                      />
                      <div
                        className="h-full bg-red-500 transition-all"
                        style={{ width: `${(data.satisfaccion.detractores / data.satisfaccion.cantidad) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-center gap-4 text-[10px] text-slate-400 mt-1">
                      <span>{data.satisfaccion.promotores} prom.</span>
                      <span>{data.satisfaccion.pasivos} neu.</span>
                      <span>{data.satisfaccion.detractores} det.</span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400">Sin datos</p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Ranking (2 cols) */}
          {colaboradores.length > 0 && (
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-slate-200 p-4 sticky top-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Ranking
                  </h4>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowInactivos((v) => !v)}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        showInactivos
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                      )}
                      title="Mostrar usuarios inactivos"
                    >
                      {showInactivos ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-semibold text-slate-600">
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
                          <p className="text-xs font-bold text-slate-500">({col.servicios_completados || 0})</p>
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

      {/* Servicios del área */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-slate-400" />
          Servicios del área
        </h3>

        {/* Filtros — solo para encargado */}
        {user?.rol === "encargado" && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* Botones de estado */}
            <div className="flex gap-2 min-w-max">
              {[
                { key: "todos", label: "Todos", dot: "bg-blue-600" },
                { key: "pendiente", label: "Pendiente", dot: "bg-yellow-500" },
                { key: "en_progreso", label: "En Progreso", dot: "bg-blue-500" },
                { key: "completado", label: "Completado", dot: "bg-green-500" },
                { key: "bloqueado", label: "Bloqueado", dot: "bg-red-500" },
              ].map((btn) => {
                const count = btn.key === "todos"
                  ? servicios.length
                  : (estado_counts as any)[btn.key] ?? 0;
                const activo = filtroEstado === btn.key;
                return (
                  <button
                    key={btn.key}
                    onClick={() => setFiltroEstado(btn.key)}
                    className={cn(
                      "px-3 md:px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 whitespace-nowrap",
                      activo
                        ? "bg-yellow-400 text-blue-900"
                        : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full", btn.dot)} />
                    <span>{btn.label}</span>
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full",
                      activo ? "bg-blue-900/20 text-blue-900" : "bg-gray-100 text-gray-500"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Filtro por colaborador */}
            <select
              value={filtroColaborador}
              onChange={(e) => setFiltroColaborador(e.target.value === "todos" ? "todos" : Number(e.target.value))}
              className="px-3 py-2 rounded-xl text-sm border border-gray-200 bg-white outline-none focus:border-blue-500 transition min-w-[160px]"
            >
              <option value="todos">Todos los técnicos</option>
              {colaboradoresOrdenados.map((col) => (
                <option key={col.usuario_id} value={col.usuario_id}>
                  {col.nombres} {col.apellidos}
                </option>
              ))}
            </select>

            {/* Buscador */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por código o nombre..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-sm border border-gray-200 bg-white outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

        )}

        {serviciosFiltrados.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <Wrench className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">
              {busqueda || filtroEstado !== "todos"
                ? "No hay servicios que coincidan con los filtros"
                : "No hay servicios en esta área"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {serviciosFiltrados.map((s) => {
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
                    {user?.rol !== "colaborador" && (
                      <div className="mt-3 flex justify-end">
                        <span className="flex items-center gap-1 text-xs text-blue-700 font-semibold">
                          Ver detalle <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
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
