import { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth.js";
import { cn } from "@/app/lib/utils";
import { HelpDrawer } from "@/app/help/HelpDrawer";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { useNotificaciones, useNotificacionesNoLeidas, useMarcarTodasLeidas, useMarcarLeida } from "@/api/queries/useNotificaciones.js";
import type { Notificacion } from "@/api/queries/useNotificaciones.js";
import {
  LayoutDashboard,
  Wrench,
  FileText,
  Building2,
  Users,
  BarChart3,
  ScrollText,
  TrendingUp,
  LogOut,
  Tv,
  Menu,
  X,
  HelpCircle,
  ChevronRight,
  Home,
  Bell,
  Shield,
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles?: ("sistema" | "admin" | "encargado" | "colaborador")[];
}

const nav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, roles: ["admin"] },
  { to: "/midesempeno", label: "Mi Desempeño", icon: <TrendingUp className="w-4 h-4" />, roles: ["colaborador", "encargado"] },
  { to: "/miarea", label: "Mi Área", icon: <Home className="w-4 h-4" />, roles: ["colaborador", "encargado"] },
  { to: "/servicios", label: "Servicios", icon: <Wrench className="w-4 h-4" /> },
  { to: "/plantillas", label: "Plantillas", icon: <FileText className="w-4 h-4" /> },

  { to: "/reportes", label: "Reportes", icon: <BarChart3 className="w-4 h-4" />, roles: ["admin", "encargado"] },
  { to: "/auditoria", label: "Auditoría", icon: <ScrollText className="w-4 h-4" />, roles: ["admin"] },
  { to: "/admin/rendimiento", label: "Rendimiento", icon: <TrendingUp className="w-4 h-4" />, roles: ["admin", "sistema"] },
  { to: "/admin/seguridad", label: "Seguridad", icon: <Shield className="w-4 h-4" />, roles: ["sistema"] },
];

const managerNav: NavItem[] = [
  { to: "/usuarios", label: "Usuarios", icon: <Users className="w-4 h-4" />, roles: ["sistema"] },
  { to: "/areas", label: "Áreas", icon: <Building2 className="w-4 h-4" />, roles: ["admin", "sistema"] },
  { to: "/manager/clientes", label: "Clientes", icon: <Users className="w-4 h-4" />, roles: ["admin", "sistema"] },
  { to: "/manager/desempeno", label: "Desempeño", icon: <TrendingUp className="w-4 h-4" />, roles: ["admin", "encargado", "sistema"] },
];

const displayLinks: NavItem[] = [
  { to: "/display/tv", label: "TV General", icon: <Tv className="w-3.5 h-3.5" />, roles: ["admin"] },
  { to: "/seguimiento-cliente", label: "Seguimiento Cliente", icon: <FileText className="w-3.5 h-3.5" /> },
];

function RolBadge({ rol }: { rol: string }) {
  const styles: Record<string, string> = {
    sistema: "bg-red-100 text-red-800",
    admin: "bg-purple-100 text-purple-800",
    encargado: "bg-blue-100 text-blue-800",
    colaborador: "bg-yellow-100 text-yellow-800",
  };
  const labels: Record<string, string> = {
    sistema: "Sistema",
    admin: "Administrador",
    encargado: "Encargado",
    colaborador: "Colaborador",
  };
  return (
    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider inline-flex items-center justify-center text-center leading-none", styles[rol] || styles.colaborador)}>
      {labels[rol] || rol}
    </span>
  );
}

function getPageTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const mainSegment = segments[0] || "dashboard";

  // Sub-rutas específicas
  if (segments[0] === "servicios" && segments[1] === "nuevo") return "Nuevo Servicio";
  if (segments[0] === "servicios" && segments[1]) return "Servicio";
  if (segments[0] === "areas" && segments[1]) return "Área — Servicios";
  if (segments[0] === "admin" && segments[1] === "rendimiento") return "Rendimiento del Sistema";
  if (segments[0] === "admin" && segments[1] === "seguridad") return "Seguridad del Sistema";
  if (segments[0] === "manager" && segments[1] === "clientes") return "Gestión de Clientes";
  if (segments[0] === "manager" && segments[1] === "desempeno") return "Desempeño";
  if (segments[0] === "manager" && segments[1] === "distribucion") return "Distribución";
  if (segments[0] === "display" && segments[1] === "tv") return "TV General";
  if (segments[0] === "display" && segments[1]) return "Pantalla";
  if (segments[0] === "public") return "Consulta Pública";
  if (segments[0] === "seguimiento-cliente") return "Seguimiento Cliente";
  if (segments[0] === "login") return "Iniciar Sesión";

  const titles: Record<string, string> = {
    dashboard: "Dashboard",
    miarea: "Mi Área",
    midesempeno: "Mi Desempeño",
    misservicios: "Mis Servicios",
    servicios: "Servicios",
    plantillas: "Plantillas",
    areas: "Áreas",
    usuarios: "Usuarios",
    reportes: "Reportes",
    auditoria: "Auditoría",
    manager: "Gestión",
    display: "Pantallas",
  };
  return titles[mainSegment] || "Dashboard";
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: notificaciones } = useNotificaciones();
  const { data: noLeidas } = useNotificacionesNoLeidas();
  const marcarTodas = useMarcarTodasLeidas();
  const marcarLeida = useMarcarLeida();

  const irANotificacion = (n: Notificacion) => {
    setNotifOpen(false);
    if (!n.leida) marcarLeida.mutate(n.id);
    if (n.tipo === "evidencia" && n.referencia_id) {
      navigate(`/servicios/${n.referencia_id}`);
    }
  };

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate("/login");
  };

  const canSee = (roles?: string[]) => {
    if (!roles) return true;
    if (user?.rol === "sistema") return true;
    return roles.includes(user?.rol ?? "");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const closeSidebar = () => setSidebarOpen(false);

  const getNavLabel = (item: NavItem): string => {
    if (item.to === "/servicios" && (user?.rol === "encargado" || user?.rol === "colaborador")) {
      return "Mis servicios";
    }
    return item.label;
  };

  const pageTitle = getPageTitle(location.pathname);

  // Actualizar título de la pestaña del navegador
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} | ServicioLocalSTS` : "ServicioLocalSTS";
  }, [pageTitle]);

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* ===== SIDEBAR ===== */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 bg-blue-900 text-white flex flex-col shrink-0 transition-all duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          sidebarCollapsed ? "w-16" : "w-auto",
        )}
      >
        {/* Brand header */}
        <div className={cn("border-b border-white/10", sidebarCollapsed ? "px-3 py-4" : "px-5 py-5")}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-yellow-400 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5 text-blue-900" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <h1 className="text-base font-bold leading-tight">ServicioSTS</h1>
              </div>
            )}
          </div>
          {/* User info -- only when expanded */}
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 mt-3">
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarFallback className="text-[10px] bg-blue-700 text-white">
                  {getInitials(user?.nombres || "")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <span className="text-sm text-blue-100 truncate block">{user?.nombres}</span>
                <div className="flex flex-col gap-0.5 mt-0.5">
                  <RolBadge rol={user?.rol ?? ""} />
                  {user?.area_nombre && (
                    <span className="text-[10px] text-blue-300 truncate">{user.area_nombre}</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {nav
            .filter((item) => canSee(item.roles))
            .filter((item) => !(user?.rol === "sistema" && (item.to === "/miarea" || item.to === "/midesempeno")))
            .map((item) => {
              const { to, icon } = item;
              const label = getNavLabel(item);
              const [basePath] = to.split("?");
              const isActive = location.pathname === basePath || location.pathname.startsWith(basePath + "/");
              return (
                <NavLink
                  key={to}
                  to={to}
                  onClick={closeSidebar}
                  className={cn(
                    "flex items-center justify-start gap-3 px-2 py-2 rounded-lg text-sm transition-colors",
                    isActive
                      ? "bg-yellow-400 text-blue-900 font-medium"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white",
                  )}
                  title={sidebarCollapsed ? label : undefined}
                >
                  <span className="shrink-0">{icon}</span>
                  {!sidebarCollapsed && <span className="truncate">{label}</span>}
                </NavLink>
              );
            })}

          {/* Gestión section */}
          {managerNav.filter((item) => canSee(item.roles)).length > 0 && (
            <>
              {!sidebarCollapsed && (
                <p className="text-[10px] text-blue-300 uppercase tracking-wider px-3 pt-4 pb-1 font-semibold">
                  Gestión
                </p>
              )}
              {managerNav.filter((item) => canSee(item.roles)).map(({ to, label, icon }) => {
                const isActive = location.pathname === to || location.pathname.startsWith(to + "/");
                return (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={closeSidebar}
                    className={cn(
                      "flex items-center justify-start gap-3 px-2 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-yellow-400 text-blue-900 font-medium"
                        : "text-blue-100 hover:bg-blue-800 hover:text-white",
                    )}
                    title={sidebarCollapsed ? label : undefined}
                  >
                    <span className="shrink-0">{icon}</span>
                    {!sidebarCollapsed && <span className="truncate">{label}</span>}
                  </NavLink>
                );
              })}
            </>
          )}

          {/* Pantallas section */}
          {!sidebarCollapsed && displayLinks.filter((item) => canSee(item.roles)).length > 0 && (
            <>
              <p className="text-[10px] text-blue-300 uppercase tracking-wider px-3 pt-4 pb-1 font-semibold">
                Pantallas
              </p>
              {displayLinks.filter((item) => canSee(item.roles)).map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  target="_blank"
                  onClick={closeSidebar}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs text-blue-200 hover:text-white hover:bg-blue-800 transition-colors"
                >
                  {icon}
                  {label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Bottom actions */}
        <div className={cn("border-t border-white/10 space-y-1", sidebarCollapsed ? "px-2 py-3" : "px-3 py-3")}>
          {/* Collapse toggle -- desktop only */}
          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="hidden lg:flex w-full items-center justify-start gap-3 px-2 py-2 rounded-lg text-sm text-blue-200 hover:text-white hover:bg-blue-800 transition-colors"
            title={sidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
          >
            <Menu className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Colapsar</span>}
          </button>
          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-start gap-3 px-2 py-2 rounded-lg text-sm text-blue-200 hover:text-white hover:bg-blue-800 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* ===== MAIN CONTENT AREA ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ===== TOPBAR ===== */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center gap-2 px-4 lg:px-6 shrink-0">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          {/* Breadcrumb + Help */}
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-muted-foreground hidden sm:inline">Pages</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground hidden sm:block shrink-0" />
            <span className="font-medium text-gray-900 truncate">{pageTitle}</span>

            <button
              onClick={() => setIsHelpOpen(true)}
              className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Abrir ayuda contextual"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Ayuda
            </button>
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1">
            {/* Notificaciones bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Notificaciones"
              >
                <Bell className="w-5 h-5 text-gray-500" />
                {(noLeidas ?? 0) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {noLeidas! > 9 ? "9+" : noLeidas}
                  </span>
                )}
              </button>

              {/* Notificaciones dropdown */}
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 flex flex-col">
                  <div className="p-3 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <p className="text-sm font-semibold text-gray-900">Notificaciones</p>
                    {(noLeidas ?? 0) > 0 && (
                      <button
                        onClick={() => marcarTodas.mutate()}
                        className="text-xs text-blue-600 hover:text-blue-800 transition"
                      >
                        Marcar todas leídas
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {!notificaciones || notificaciones.length === 0 ? (
                      <div className="py-8 text-center text-xs text-gray-400">
                        Sin notificaciones
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {notificaciones.slice(0, 20).map((n) => (
                          <div
                            key={n.id}
                            onClick={() => irANotificacion(n)}
                            className={`px-3 py-2.5 hover:bg-gray-50 transition cursor-pointer ${!n.leida ? "bg-blue-50/40" : ""}`}
                          >
                            <p className="text-xs font-medium text-gray-800">{n.titulo}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{n.mensaje}</p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {new Date(n.created_at).toLocaleString("es-AR")}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User avatar with dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="ml-1 p-0.5 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Menú de usuario"
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs bg-blue-900 text-white">
                    {getInitials(user?.nombres || "")}
                  </AvatarFallback>
                </Avatar>
              </button>

              {/* User dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">{user?.nombres}</p>
                    <p className="text-xs text-gray-500 mt-1">{user?.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">@{user?.username}</p>
                    <div className="mt-1">
                      <RolBadge rol={user?.rol ?? ""} />
                    </div>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ===== PAGE CONTENT ===== */}
        <main className="flex-1 overflow-y-auto bg-section">
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Help Drawer */}
      <HelpDrawer open={isHelpOpen} onOpenChange={setIsHelpOpen} />
    </div>
  );
}
