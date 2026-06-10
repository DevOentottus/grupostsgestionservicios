import { useState, useMemo } from "react";
import { useAuditoria } from "@/api/queries/useAuditoria.js";
import { cn } from "@/app/lib/utils";
import {
  Shield, Search, Clock, User, Filter,
  ChevronDown, Download, Users, Calendar,
  ShieldCheck, ShieldAlert, ShieldX, LogIn,
} from "lucide-react";
import type { AuditoriaDisplay } from "@shared/index.js";

// ── Action type config ──
const ACCION_CONFIG: Record<string, { label: string; class: string; icon: typeof Shield }> = {
  CREATE: { label: "Creación", class: "bg-green-100 text-green-700", icon: ShieldCheck },
  DELETE: { label: "Eliminación", class: "bg-red-100 text-red-700", icon: ShieldX },
  UPDATE: { label: "Actualización", class: "bg-blue-100 text-blue-700", icon: Shield },
  STATUS_CHANGE: { label: "Cambio Estado", class: "bg-blue-100 text-blue-700", icon: Shield },
  COMPLETE: { label: "Completado", class: "bg-green-100 text-green-700", icon: ShieldCheck },
  REOPEN: { label: "Reapertura", class: "bg-amber-100 text-amber-700", icon: ShieldAlert },
  LOGIN: { label: "Inicio Sesión", class: "bg-purple-100 text-purple-700", icon: LogIn },
};

function getAccionConfig(accion: string) {
  return ACCION_CONFIG[accion] || { label: accion, class: "bg-gray-100 text-gray-600", icon: Shield };
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-PE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AuditoriaPage() {
  const [page, setPage] = useState(1);
  const [entidad, setEntidad] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [searchText, setSearchText] = useState("");

  const { data, isLoading } = useAuditoria({
    page,
    limit: 20,
    entidad: entidad || undefined,
    fecha_desde: fechaDesde || undefined,
    fecha_hasta: fechaHasta || undefined,
  });

  const rows = data?.data || [];
  const meta = data?.meta;

  // Stats derived from current page (or could be from API)
  const stats = useMemo(() => {
    if (!rows.length) return { total: 0, hoy: 0, usuarios: 0 };
    const today = new Date().toISOString().split("T")[0];
    const hoy = rows.filter((r: AuditoriaDisplay) => r.created_at?.startsWith(today)).length;
    const usuarios = new Set(rows.map((r: AuditoriaDisplay) => r.usuario?.id)).size;
    return { total: meta?.total || rows.length, hoy, usuarios };
  }, [rows, meta]);

  const filteredRows = useMemo(() => {
    if (!searchText) return rows;
    const q = searchText.toLowerCase();
    return rows.filter((r: AuditoriaDisplay) =>
      r.accion.toLowerCase().includes(q) ||
      r.entidad.toLowerCase().includes(q) ||
      r.usuario?.nombres?.toLowerCase().includes(q) ||
      r.usuario?.username?.toLowerCase().includes(q)
    );
  }, [rows, searchText]);

  const hasFilters = entidad || fechaDesde || fechaHasta || searchText;

  const clearFilters = () => {
    setEntidad("");
    setFechaDesde("");
    setFechaHasta("");
    setSearchText("");
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700 }}>Auditoría del Sistema</h1>
          <p className="text-gray-500 text-sm">Historial completo de acciones y cambios en el sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-xl text-sm" style={{ fontWeight: 600 }}>
            <Shield className="w-4 h-4" />
            {meta?.total ?? 0} registros totales
          </div>
          <button
            className="flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-xl text-sm transition"
            style={{ fontWeight: 600 }}
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>{stats.total}</p>
              <p className="text-gray-500 text-xs">Total acciones</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>{stats.hoy}</p>
              <p className="text-gray-500 text-xs">Acciones hoy</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>{stats.usuarios}</p>
              <p className="text-gray-500 text-xs">Usuarios activos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar acciones, entidades, usuarios..."
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <select
              value={entidad}
              onChange={(e) => { setEntidad(e.target.value); setPage(1); }}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 cursor-pointer"
            >
              <option value="">Todas las entidades</option>
              <option value="servicio">Servicio</option>
              <option value="usuario">Usuario</option>
              <option value="tarea">Tarea</option>
              <option value="area">Área</option>
              <option value="area-colaborador">Área-Colaborador</option>
              <option value="plantilla">Plantilla</option>
              <option value="comentario">Comentario</option>
              <option value="auth">Auth</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => { setFechaDesde(e.target.value); setPage(1); }}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50"
              placeholder="Desde"
            />
          </div>
          <div>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => { setFechaHasta(e.target.value); setPage(1); }}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50"
              placeholder="Hasta"
            />
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 px-3 py-2.5 hover:text-gray-700 rounded-xl hover:bg-gray-50 transition"
              style={{ fontWeight: 500 }}
            >
              Limpiar filtros
            </button>
          )}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 px-3 py-2 bg-gray-50 rounded-xl">
            <Filter className="w-3.5 h-3.5" />
            {filteredRows.length} resultados
          </div>
        </div>
      </div>

      {/* Timeline / Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header row */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-4 bg-gray-50 border-b border-gray-100 text-xs text-gray-500" style={{ fontWeight: 600 }}>
          <span className="col-span-1">#</span>
          <span className="col-span-2">Fecha/Hora</span>
          <span className="col-span-2">Usuario</span>
          <span className="col-span-1">Entidad</span>
          <span className="col-span-2">Acción</span>
          <span className="col-span-4">Detalle</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-50">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-400 mt-3 text-sm">Cargando registros...</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              No se encontraron registros de auditoría
            </div>
          ) : (
            filteredRows.map((log: AuditoriaDisplay, idx: number) => {
              const accionCfg = getAccionConfig(log.accion);
              const AccionIcon = accionCfg.icon;
              return (
                <div key={log.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 hover:bg-gray-50 transition">
                  {/* Mobile-friendly layout */}
                  <div className="md:hidden flex items-center gap-3 mb-2">
                    <span className="text-xs text-gray-400" style={{ fontWeight: 600 }}>#{idx + 1 + (page - 1) * 20}</span>
                    <span className={cn("text-xs px-1.5 py-0.5 rounded-full", accionCfg.class)} style={{ fontWeight: 600 }}>
                      {log.accion}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">{formatFecha(log.created_at)}</span>
                  </div>

                  {/* # — desktop only */}
                  <span className="hidden md:block col-span-1 text-xs text-gray-400 pt-1" style={{ fontWeight: 600 }}>
                    #{idx + 1 + (page - 1) * 20}
                  </span>

                  {/* Fecha/Hora */}
                  <div className="col-span-2 flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3 hidden md:block" />
                    <span className="md:block hidden">{formatFecha(log.created_at)}</span>
                  </div>

                  {/* Usuario */}
                  <div className="col-span-2 flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs" style={{ fontWeight: 700 }}>
                        {log.usuario ? getInitials(log.usuario.nombres) : "??"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-700 truncate" style={{ fontWeight: 500 }}>
                        {log.usuario?.nombres || "—"}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">{log.usuario?.username || ""}</p>
                    </div>
                  </div>

                  {/* Entidad */}
                  <div className="col-span-1">
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700" style={{ fontWeight: 600 }}>
                      {log.entidad}
                    </span>
                  </div>

                  {/* Acción */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-1.5">
                      <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", accionCfg.class)}>
                        <AccionIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", accionCfg.class)} style={{ fontWeight: 600 }}>
                        {log.accion}
                      </span>
                    </div>
                  </div>

                  {/* Detalle */}
                  <div className="col-span-4">
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {log.detalle ? JSON.stringify(log.detalle).slice(0, 120) : "—"}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Total: {meta.total} registros — Página {meta.page} de {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50 transition"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= meta.totalPages}
              className="px-3 py-1.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50 transition"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
