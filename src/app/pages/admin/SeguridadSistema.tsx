import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  AlertTriangle,
  Activity,
  ScrollText,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Globe,
  Server,
  Key,
  LogIn,
  UserX,
  ExternalLink,
  Eye,
  FileText,
  Search,
  Filter,
  ChevronDown,
  Users,
  Calendar,
  Lock,
  Wifi,
  Sliders,
  UserCheck,
  Fingerprint,
} from "lucide-react";
import { useAuth } from "@/lib/auth.js";
import {
  useResumenSeguridad,
  useIntentosFallidos,
  useSesionesActivas,
  useRevocarSesion,
  useActividadSospechosa,
  useExportarLogs,
  useCleanupSeguridad,
} from "@/api/queries/useSeguridad.js";
import { auditoriaApi } from "@/api/client.js";
import { cn } from "@/app/lib/utils";
import { InfoPopover } from "@/app/components/ui/info-popover.js";
import { ConfirmDialog } from "@/app/components/ConfirmDialog.js";
import type {
  SeguridadResumen,
  LoginAttempt,
  SesionActiva,
  ActividadSospechosa,
  PaginationMeta,
  AuditoriaDisplay,
} from "@shared/index.js";

// -- Helpers --

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
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

function getStatusIcon(status: string) {
  switch (status) {
    case "ok":
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case "warning":
      return <AlertCircle className="w-5 h-5 text-amber-500" />;
    case "error":
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <AlertCircle className="w-5 h-5 text-gray-400" />;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "ok":
      return "Configurado";
    case "warning":
      return "Advertencia";
    case "error":
      return "No configurado";
    default:
      return "Desconocido";
  }
}

function ahora(): string {
  return new Date().toLocaleDateString("es-PE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// -- Sensitive auditoria actions --
const SENSITIVE_ACCIONES = [
  "cambio_rol",
  "usuario_activar",
  "usuario_desactivar",
  "usuario_eliminar",
  "cambio_password",
];

const ACCION_SENSIBLE_CONFIG: Record<string, { label: string; class: string }> = {
  cambio_rol: { label: "Cambio Rol", class: "bg-purple-100 text-purple-700" },
  usuario_activar: { label: "Usuario Activar", class: "bg-green-100 text-green-700" },
  usuario_desactivar: { label: "Usuario Desactivar", class: "bg-red-100 text-red-700" },
  usuario_eliminar: { label: "Usuario Eliminar", class: "bg-red-100 text-red-700" },
  cambio_password: { label: "Cambio Password", class: "bg-amber-100 text-amber-700" },
};

function getAccionSensibleConfig(accion: string) {
  return (
    ACCION_SENSIBLE_CONFIG[accion] || {
      label: accion,
      class: "bg-gray-100 text-gray-600",
    }
  );
}

const SEVERIDAD_CONFIG: Record<string, { label: string; class: string; icon: typeof AlertTriangle }> = {
  critica: { label: "Crítica", class: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle },
  media: { label: "Media", class: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertCircle },
  informativa: { label: "Informativa", class: "bg-blue-100 text-blue-700 border-blue-200", icon: AlertCircle },
};

function getSeveridadConfig(severidad: string) {
  return (
    SEVERIDAD_CONFIG[severidad] || {
      label: severidad,
      class: "bg-gray-100 text-gray-600 border-gray-200",
      icon: AlertCircle,
    }
  );
}

const TIPO_ALERTA_ICON: Record<string, React.ReactNode> = {
  brute_force: <Shield className="w-5 h-5 text-red-600" />,
  fuera_horario: <Clock className="w-5 h-5 text-amber-600" />,
  escalada_privilegios: <Key className="w-5 h-5 text-blue-600" />,
  multi_ip: <Globe className="w-5 h-5 text-purple-600" />,
};

const TIPO_ALERTA_BG: Record<string, string> = {
  brute_force: "bg-red-50",
  fuera_horario: "bg-amber-50",
  escalada_privilegios: "bg-blue-50",
  multi_ip: "bg-purple-50",
};

// -- Tabs --

type TabId =
  | "resumen"
  | "intentos"
  | "sesiones"
  | "auditoria"
  | "sospechoso"
  | "exportar";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "resumen", label: "Resumen", icon: <Shield className="w-4 h-4" /> },
  { id: "intentos", label: "Intentos Fallidos", icon: <UserX className="w-4 h-4" /> },
  { id: "sesiones", label: "Sesiones", icon: <Globe className="w-4 h-4" /> },
  { id: "auditoria", label: "Auditoría Sensible", icon: <ScrollText className="w-4 h-4" /> },
  { id: "sospechoso", label: "Actividad Sospechosa", icon: <AlertTriangle className="w-4 h-4" /> },
  { id: "exportar", label: "Exportar", icon: <Download className="w-4 h-4" /> },
];

// -- Main Page --

export function SeguridadSistemaPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("resumen");

  const {
    data: resumen,
    isLoading: loadingResumen,
    isError: errorResumen,
    refetch: refetchResumen,
  } = useResumenSeguridad();

  const { data: intentosData } = useIntentosFallidos({ limit: 1 });
  const { data: sesionesData } = useSesionesActivas({ limit: 1 });
  const { data: sospechosoData } = useActividadSospechosa({ limit: 1 });

  const statsCounts = useMemo(
    () => ({
      intentos: intentosData?.meta?.total ?? 0,
      sesiones: sesionesData?.meta?.total ?? 0,
      alertas: sospechosoData?.meta?.total ?? 0,
    }),
    [intentosData, sesionesData, sospechosoData]
  );

  const invalidateAll = useCallback(() => {
    refetchResumen();
  }, [refetchResumen]);

  if (errorResumen) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-medium">
          Error al cargar seguridad del sistema
        </p>
        <button
          onClick={() => refetchResumen()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-white text-xl mb-1"
              style={{ fontWeight: 700 }}
            >
              Seguridad del Sistema
            </h1>
            <p className="text-blue-200 text-sm">{ahora()}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-red-400/20 text-red-300 text-sm px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Sistema
            </span>
            <button
              onClick={invalidateAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <UserX className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-3xl text-gray-900" style={{ fontWeight: 700 }}>
                {statsCounts.intentos}
              </p>
              <p className="text-gray-500 text-sm flex items-center gap-1">
                Intentos fallidos (24h)
                <InfoPopover
                  variant="warning"
                  formula="Cantidad de inicios de sesión fallidos en las últimas 24 horas."
                  descripcion="Múltiples intentos fallidos desde una misma IP pueden indicar un ataque de fuerza bruta."
                  tip="Si ves más de 10 intentos de un mismo usuario o IP, considerá bloquear temporalmente la cuenta."
                />
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Globe className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-3xl text-gray-900" style={{ fontWeight: 700 }}>
                {statsCounts.sesiones}
              </p>
              <p className="text-gray-500 text-sm flex items-center gap-1">
                Sesiones activas
                <InfoPopover
                  variant="info"
                  formula="Usuarios con sesión JWT válida actualmente en el sistema."
                  descripcion="Cada sesión representa un usuario autenticado. Sesiones múltiples desde distintas ubicaciones pueden ser sospechosas."
                  tip="Podés revocar sesiones individuales desde la pestaña 'Sesiones'. Es recomendable después de un cambio de contraseña."
                />
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-3xl text-gray-900" style={{ fontWeight: 700 }}>
                {statsCounts.alertas}
              </p>
              <p className="text-gray-500 text-sm flex items-center gap-1">
                Alertas sospechosas
                <InfoPopover
                  variant="mejora"
                  formula="Actividades marcadas como sospechosas por el motor de seguridad del sistema."
                  descripcion="Incluye accesos desde ubicaciones no habituales, horarios anómalos, y múltiples intentos fallidos consecutivos."
                  tip="Revisá estas alertas periódicamente. Una alerta aislada suele ser un falso positivo; varias alertas del mismo usuario requieren acción."
                />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm transition-colors rounded-t-lg whitespace-nowrap",
              activeTab === id
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 font-medium"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            )}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loadingResumen ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 mt-3 text-sm">
            Cargando seguridad...
          </p>
        </div>
      ) : (
        <>
          {activeTab === "resumen" && resumen && <ResumenTab data={resumen} />}
          {activeTab === "intentos" && <IntentosFallidosTab />}
          {activeTab === "sesiones" && <SesionesTab />}
          {activeTab === "auditoria" && <AuditoriaSensibleTab />}
          {activeTab === "sospechoso" && <ActividadSospechosaTab />}
          {activeTab === "exportar" && <ExportarTab />}
        </>
      )}
    </div>
  );
}

// -- Resumen Tab --

const INDICADORES: {
  key: keyof SeguridadResumen;
  label: string;
  icon: React.ReactNode;
  descripcion: string;
}[] = [
  {
    key: "https",
    label: "HTTPS",
    icon: <Lock className="w-5 h-5" />,
    descripcion: "Conexión segura TLS/SSL",
  },
  {
    key: "jwt",
    label: "JWT",
    icon: <Key className="w-5 h-5" />,
    descripcion: "Configuración de tokens JWT",
  },
  {
    key: "cors",
    label: "CORS",
    icon: <Globe className="w-5 h-5" />,
    descripcion: "Orígenes cruzados permitidos",
  },
  {
    key: "rls",
    label: "RLS",
    icon: <Shield className="w-5 h-5" />,
    descripcion: "Seguridad a nivel de filas (Row Level Security)",
  },
  {
    key: "rate_limit",
    label: "Rate Limiting",
    icon: <Sliders className="w-5 h-5" />,
    descripcion: "Límite de peticiones por minuto",
  },
  {
    key: "login_tracking",
    label: "Login Tracking",
    icon: <Fingerprint className="w-5 h-5" />,
    descripcion: "Registro de intentos de inicio de sesión",
  },
];

function ResumenTab({ data }: { data: SeguridadResumen }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {INDICADORES.map((ind) => {
        const item = data[ind.key];
        const status = item?.status ?? "error";
        return (
          <div
            key={ind.key}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    status === "ok"
                      ? "bg-green-100"
                      : status === "warning"
                      ? "bg-amber-100"
                      : "bg-red-100"
                  )}
                >
                  {ind.icon}
                </div>
                <div>
                  <p
                    className="text-gray-800 text-sm"
                    style={{ fontWeight: 700 }}
                  >
                    {ind.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {ind.descripcion}
                  </p>
                </div>
              </div>
              <div className="shrink-0">{getStatusIcon(status)}</div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  status === "ok"
                    ? "bg-green-100 text-green-700"
                    : status === "warning"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
                )}
              >
                {getStatusLabel(status)}
              </span>
              <span className="text-[10px] text-gray-400">
                {item?.detalle ?? "Sin datos"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -- Intentos Fallidos Tab --

function IntentosFallidosTab() {
  const [page, setPage] = useState(1);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [usernameFilter, setUsernameFilter] = useState("");

  const { data, isLoading } = useIntentosFallidos({
    page,
    limit: 20,
    desde: fechaDesde || undefined,
    hasta: fechaHasta || undefined,
    username: usernameFilter || undefined,
  });

  const rows = data?.data || [];
  const meta = data?.meta;

  const hasFilters = fechaDesde || fechaHasta || usernameFilter;

  const clearFilters = () => {
    setFechaDesde("");
    setFechaHasta("");
    setUsernameFilter("");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filtrar por username..."
            value={usernameFilter}
            onChange={(e) => {
              setUsernameFilter(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <div>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                setFechaDesde(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50"
              placeholder="Desde"
            />
          </div>
          <div>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                setFechaHasta(e.target.value);
                setPage(1);
              }}
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
            {rows.length} resultados
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-4 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-semibold">
          <span className="col-span-1">#</span>
          <span className="col-span-2">Fecha/Hora</span>
          <span className="col-span-2">Username</span>
          <span className="col-span-2">IP</span>
          <span className="col-span-3">User-Agent</span>
          <span className="col-span-1 text-center">¿Existe?</span>
          <span className="col-span-1 text-center">Acción</span>
        </div>

        <div className="divide-y divide-gray-50">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-400 mt-3 text-sm">
                Cargando intentos...
              </p>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              No se encontraron intentos fallidos
            </div>
          ) : (
            rows.map((row: LoginAttempt, idx: number) => (
              <div
                key={row.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 hover:bg-gray-50 transition"
              >
                {/* Mobile */}
                <div className="md:hidden flex items-center gap-3 mb-2">
                  <span className="text-xs text-gray-400 font-semibold">
                    #{idx + 1 + (page - 1) * 20}
                  </span>
                  <span
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full",
                      row.exito
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    )}
                    style={{ fontWeight: 600 }}
                  >
                    {row.exito ? "Éxito" : "Fallido"}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {formatFecha(row.created_at)}
                  </span>
                </div>

                {/* # */}
                <span className="hidden md:block col-span-1 text-xs text-gray-400 pt-1 font-semibold">
                  #{idx + 1 + (page - 1) * 20}
                </span>

                {/* Fecha/Hora */}
                <div className="col-span-2 flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3 hidden md:block" />
                  <span>{formatFecha(row.created_at)}</span>
                </div>

                {/* Username */}
                <div className="col-span-2 flex items-center gap-2">
                  <div className="w-7 h-7 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">
                      {row.username_intentado
                        ? getInitials(row.username_intentado)
                        : "?"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-700 truncate font-medium">
                      {row.username_intentado || "--"}
                    </p>
                  </div>
                </div>

                {/* IP */}
                <div className="col-span-2">
                  <span className="text-xs font-mono text-gray-500">
                    {row.ip_address || "--"}
                  </span>
                </div>

                {/* User-Agent */}
                <div className="col-span-3">
                  <p className="text-xs text-gray-400 truncate" title={row.user_agent ?? ""}>
                    {row.user_agent || "--"}
                  </p>
                </div>

                {/* ¿Existe? */}
                <div className="col-span-1 text-center">
                  {row.usuario ? (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                      Sí
                    </span>
                  ) : (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                      No
                    </span>
                  )}
                </div>

                {/* Acción */}
                <div className="col-span-1 text-center">
                  <span
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full font-medium",
                      row.exito
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    )}
                  >
                    {row.exito ? "Éxito" : "Fallido"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Total: {meta.total} registros -- Página {meta.page} de{" "}
            {meta.totalPages}
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

// -- Sesiones Tab --

function SesionesTab() {
  const [page, setPage] = useState(1);
  const [revocarId, setRevocarId] = useState<number | null>(null);
  const [revocarInfo, setRevocarInfo] = useState<string>("");

  const { data, isLoading } = useSesionesActivas({ page, limit: 20 });
  const revocarMutation = useRevocarSesion();

  const rows = data?.data || [];
  const meta = data?.meta;

  const handleRevocar = useCallback(async () => {
    if (revocarId === null) return;
    try {
      await revocarMutation.mutateAsync(revocarId);
      setRevocarId(null);
      setRevocarInfo("");
    } catch {
      // error handling
    }
  }, [revocarId, revocarMutation]);

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-4 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-semibold">
          <span className="col-span-2">Usuario</span>
          <span className="col-span-2">IP</span>
          <span className="col-span-2">User-Agent</span>
          <span className="col-span-2">Creada</span>
          <span className="col-span-1">Última Act.</span>
          <span className="col-span-1">Expira</span>
          <span className="col-span-2 text-center">Acción</span>
        </div>

        <div className="divide-y divide-gray-50">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-400 mt-3 text-sm">
                Cargando sesiones...
              </p>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              <Globe className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              No hay sesiones activas
            </div>
          ) : (
            rows.map((row: SesionActiva, idx: number) => (
              <div
                key={row.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 hover:bg-gray-50 transition"
              >
                {/* Mobile */}
                <div className="md:hidden flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-400">
                    #{idx + 1 + (page - 1) * 20}
                  </span>
                  <span className="text-xs text-gray-500 ml-auto">
                    {formatFecha(row.created_at)}
                  </span>
                </div>

                {/* Usuario */}
                <div className="col-span-2 flex items-center gap-2">
                  <div className="w-7 h-7 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">
                      {row.usuario
                        ? getInitials(row.usuario.nombres)
                        : "?"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-700 truncate font-medium">
                      {row.usuario?.nombres || `ID ${row.user_id}`}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {row.usuario?.username || ""}
                    </p>
                  </div>
                </div>

                {/* IP */}
                <div className="col-span-2">
                  <span className="text-xs font-mono text-gray-500">
                    {row.ip_address || "--"}
                  </span>
                </div>

                {/* User-Agent */}
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 truncate" title={row.user_agent ?? ""}>
                    {row.user_agent || "--"}
                  </p>
                </div>

                {/* Creada */}
                <div className="col-span-2">
                  <span className="text-xs text-gray-500">
                    {formatFecha(row.created_at)}
                  </span>
                </div>

                {/* Última Actividad */}
                <div className="col-span-1">
                  <span className="text-xs text-gray-500">
                    {formatFechaCorta(row.last_activity)}
                  </span>
                </div>

                {/* Expira */}
                <div className="col-span-1">
                  <span className="text-xs text-gray-500">
                    {formatFechaCorta(row.expires_at)}
                  </span>
                </div>

                {/* Acción */}
                <div className="col-span-2 text-center">
                  <button
                    onClick={() => {
                      setRevocarId(row.id);
                      setRevocarInfo(
                        row.usuario?.nombres || `Usuario #${row.user_id}`
                      );
                    }}
                    className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium"
                  >
                    Revocar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Total: {meta.total} sesiones -- Página {meta.page} de{" "}
            {meta.totalPages}
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

      {/* Revoke Confirm Dialog */}
      <ConfirmDialog
        open={revocarId !== null}
        title="Revocar Sesión"
        message={`¿Está seguro que desea revocar la sesión de "${revocarInfo}"? El usuario será desconectado.`}
        confirmLabel="Revocar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleRevocar}
        onCancel={() => {
          setRevocarId(null);
          setRevocarInfo("");
        }}
        isLoading={revocarMutation.isPending}
      />
    </div>
  );
}

// -- Auditoría Sensible Tab --

function AuditoriaSensibleTab() {
  const [page, setPage] = useState(1);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [accionFilter, setAccionFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["seguridad", "auditoria-sensible", { page, fechaDesde, fechaHasta, accionFilter }],
    queryFn: async () => {
      const r = await auditoriaApi.listar({
        page,
        limit: 20,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
      });
      return r.data as { data: AuditoriaDisplay[]; meta: PaginationMeta };
    },
  });

  const rows = useMemo(() => {
    if (!data?.data) return [];
    let filtered = data.data;
    // Client-side filter for sensitive actions + action type filter
    filtered = filtered.filter((r: AuditoriaDisplay) =>
      SENSITIVE_ACCIONES.includes(r.accion)
    );
    if (accionFilter) {
      filtered = filtered.filter((r: AuditoriaDisplay) => r.accion === accionFilter);
    }
    return filtered;
  }, [data, accionFilter]);

  const meta = data?.meta;

  const hasFilters = fechaDesde || fechaHasta || accionFilter;

  const clearFilters = () => {
    setFechaDesde("");
    setFechaHasta("");
    setAccionFilter("");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <select
              value={accionFilter}
              onChange={(e) => {
                setAccionFilter(e.target.value);
                setPage(1);
              }}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 cursor-pointer"
            >
              <option value="">Todas las acciones</option>
              <option value="cambio_rol">Cambio Rol</option>
              <option value="usuario_activar">Usuario Activar</option>
              <option value="usuario_desactivar">Usuario Desactivar</option>
              <option value="usuario_eliminar">Usuario Eliminar</option>
              <option value="cambio_password">Cambio Password</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                setFechaDesde(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50"
              placeholder="Desde"
            />
          </div>
          <div>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                setFechaHasta(e.target.value);
                setPage(1);
              }}
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
            {rows.length} resultados
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-4 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-semibold">
          <span className="col-span-1">#</span>
          <span className="col-span-2">Fecha/Hora</span>
          <span className="col-span-2">Usuario</span>
          <span className="col-span-2">Acción</span>
          <span className="col-span-4">Detalle</span>
          <span className="col-span-1">IP</span>
        </div>

        <div className="divide-y divide-gray-50">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-400 mt-3 text-sm">
                Cargando auditoría...
              </p>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              <ScrollText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              No se encontraron acciones sensibles
            </div>
          ) : (
            rows.map((log: AuditoriaDisplay, idx: number) => {
              const accionCfg = getAccionSensibleConfig(log.accion);
              return (
                <div
                  key={log.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 hover:bg-gray-50 transition"
                >
                  {/* Mobile */}
                  <div className="md:hidden flex items-center gap-3 mb-2">
                    <span className="text-xs text-gray-400 font-semibold">
                      #{idx + 1 + (page - 1) * 20}
                    </span>
                    <span
                      className={cn("text-xs px-1.5 py-0.5 rounded-full", accionCfg.class)}
                      style={{ fontWeight: 600 }}
                    >
                      {log.accion}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {formatFecha(log.created_at)}
                    </span>
                  </div>

                  {/* # */}
                  <span className="hidden md:block col-span-1 text-xs text-gray-400 pt-1 font-semibold">
                    #{idx + 1 + (page - 1) * 20}
                  </span>

                  {/* Fecha/Hora */}
                  <div className="col-span-2 flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3 hidden md:block" />
                    <span>{formatFecha(log.created_at)}</span>
                  </div>

                  {/* Usuario */}
                  <div className="col-span-2 flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">
                        {log.usuario ? getInitials(log.usuario.nombres) : "??"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-700 truncate font-medium">
                        {log.usuario?.nombres || "--"}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {log.usuario?.username || ""}
                      </p>
                    </div>
                  </div>

                  {/* Acción */}
                  <div className="col-span-2">
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        accionCfg.class
                      )}
                      style={{ fontWeight: 600 }}
                    >
                      {log.accion}
                    </span>
                  </div>

                  {/* Detalle */}
                  <div className="col-span-4">
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {log.detalle
                        ? JSON.stringify(log.detalle).slice(0, 120)
                        : "--"}
                    </p>
                  </div>

                  {/* IP */}
                  <div className="col-span-1">
                    <span className="text-xs font-mono text-gray-400">
                      {(log as any).ip_address || "--"}
                    </span>
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
            Total: {meta.total} registros -- Página {meta.page} de{" "}
            {meta.totalPages}
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

// -- Actividad Sospechosa Tab --

function ActividadSospechosaTab() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useActividadSospechosa({ page, limit: 20 });

  const rows = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 mt-3 text-sm">
            Cargando alertas...
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Shield className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-sm">No se detectó actividad sospechosa</p>
          <p className="text-xs text-gray-300 mt-1">
            Las alertas aparecerán aquí cuando se superen los umbrales de
            seguridad
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((alerta: ActividadSospechosa) => {
            const sevConfig = getSeveridadConfig(alerta.severidad);
            const SevIcon = sevConfig.icon;
            return (
              <div
                key={alerta.id}
                className={cn(
                  "rounded-2xl border-2 p-5 shadow-sm transition hover:shadow-md",
                  TIPO_ALERTA_BG[alerta.tipo] || "bg-white",
                  alerta.severidad === "critica"
                    ? "border-red-200"
                    : alerta.severidad === "media"
                    ? "border-amber-200"
                    : "border-blue-200"
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center shrink-0">
                    {TIPO_ALERTA_ICON[alerta.tipo] || (
                      <AlertTriangle className="w-5 h-5 text-gray-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className="text-sm text-gray-800"
                        style={{ fontWeight: 700 }}
                      >
                        {alerta.tipo === "brute_force"
                          ? "Ataque de Fuerza Bruta"
                          : alerta.tipo === "fuera_horario"
                          ? "Acceso Fuera de Horario"
                          : alerta.tipo === "escalada_privilegios"
                          ? "Escalada de Privilegios"
                          : alerta.tipo === "multi_ip"
                          ? "Múltiples IPs Detectadas"
                          : alerta.tipo}
                      </h3>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-1",
                          sevConfig.class
                        )}
                      >
                        <SevIcon className="w-3 h-3" />
                        {sevConfig.label}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 mb-2">
                      {alerta.descripcion}
                    </p>

                    {/* Datos relevantes */}
                    {alerta.datos && Object.keys(alerta.datos).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(alerta.datos).map(([k, v]) => (
                          <div
                            key={k}
                            className="bg-white/70 rounded-lg px-2.5 py-1.5 text-xs border border-gray-100"
                          >
                            <span className="text-gray-400 font-medium capitalize mr-1">
                              {k.replace(/_/g, " ")}:
                            </span>
                            <span className="text-gray-700 font-mono">
                              {String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-[10px] text-gray-400 mt-2">
                      {formatFecha(alerta.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Total: {meta.total} alertas -- Página {meta.page} de{" "}
            {meta.totalPages}
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

// -- Exportar Tab --

const TIPOS_EXPORTACION = [
  { value: "todos", label: "Todos los logs" },
  { value: "login_attempts", label: "Intentos de Login" },
  { value: "sesiones", label: "Sesiones" },
  { value: "auditoria_sensible", label: "Auditoría Sensible" },
];

function ExportarTab() {
  const [tipo, setTipo] = useState("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const exportMutation = useExportarLogs();

  const handleExport = useCallback(
    async (formato: "csv" | "pdf") => {
      try {
        const result = await exportMutation.mutateAsync({
          tipo,
          params: {
            ...(desde ? { desde } : undefined),
            ...(hasta ? { hasta } : undefined),
          },
        });

        // Determine content type and file extension
        const ext = formato === "csv" ? "csv" : "pdf";
        const contentType =
          formato === "csv"
            ? "text/csv"
            : "application/pdf";

        // Create blob and trigger download
        const blob = result instanceof Blob
          ? result
          : new Blob([result as any], { type: contentType });

        const filename = `seguridad_${tipo}_${new Date().toISOString().split("T")[0]}.${ext}`;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Error al exportar:", err);
      }
    },
    [tipo, desde, hasta, exportMutation]
  );

  return (
    <div className="max-w-xl">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-gray-800 mb-4" style={{ fontWeight: 600 }}>
          Exportar Logs de Seguridad
        </h3>

        <div className="space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">
              Tipo de logs
            </label>
            <div className="relative">
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="appearance-none w-full pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 cursor-pointer"
              >
                {TIPOS_EXPORTACION.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">
                Desde
              </label>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">
                Hasta
              </label>
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => handleExport("csv")}
              disabled={exportMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {exportMutation.isPending ? "Exportando..." : "Exportar CSV"}
            </button>
            <button
              onClick={() => handleExport("pdf")}
              disabled={exportMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              {exportMutation.isPending ? "Exportando..." : "Exportar PDF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
