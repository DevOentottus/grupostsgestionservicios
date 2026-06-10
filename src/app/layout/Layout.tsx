import { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth.js";
import { cn } from "@/app/lib/utils";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import {
  LayoutDashboard,
  Wrench,
  FileText,
  Building2,
  Users,
  BarChart3,
  ScrollText,
  Target,
  KanbanSquare,
  TrendingUp,
  MessageSquare,
  Megaphone,
  LogOut,
  Tv,
  Monitor,
  Clock,
  HardHat,
  Menu,
  X,
  Bell,
  Settings,
  ChevronRight,
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles?: ("admin" | "encargado" | "colaborador")[];
}

const nav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  { to: "/servicios", label: "Servicios", icon: <Wrench className="w-4 h-4" /> },
  { to: "/solicitudes", label: "Solicitudes", icon: <MessageSquare className="w-4 h-4" /> },
  { to: "/plantillas", label: "Plantillas", icon: <FileText className="w-4 h-4" /> },
  { to: "/areas", label: "Áreas", icon: <Building2 className="w-4 h-4" /> },
  { to: "/usuarios", label: "Usuarios", icon: <Users className="w-4 h-4" />, roles: ["admin"] },
  { to: "/reportes", label: "Reportes", icon: <BarChart3 className="w-4 h-4" /> },
  { to: "/auditoria", label: "Auditoría", icon: <ScrollText className="w-4 h-4" />, roles: ["admin"] },
  { to: "/anuncios", label: "Anuncios", icon: <Megaphone className="w-4 h-4" />, roles: ["admin"] },
  { to: "/comunicaciones", label: "Comunicaciones", icon: <MessageSquare className="w-4 h-4" /> },
];

const managerNav: NavItem[] = [
  { to: "/manager/mi-area", label: "Mi Área", icon: <Target className="w-4 h-4" />, roles: ["admin", "encargado"] },
  { to: "/manager/distribucion", label: "Distribución", icon: <KanbanSquare className="w-4 h-4" />, roles: ["admin", "encargado"] },
  { to: "/manager/desempeno", label: "Desempeño", icon: <TrendingUp className="w-4 h-4" />, roles: ["admin", "encargado"] },
];

const displayLinks: { to: string; label: string; icon: React.ReactNode }[] = [
  { to: "/display/tv", label: "TV General", icon: <Tv className="w-3.5 h-3.5" /> },
  { to: "/display/waiting-room", label: "Sala Espera", icon: <Clock className="w-3.5 h-3.5" /> },
  { to: "/display/work-room", label: "Sala Trabajo", icon: <HardHat className="w-3.5 h-3.5" /> },
  { to: "/monitor", label: "Monitor", icon: <Monitor className="w-3.5 h-3.5" /> },
];

const mockNotifications = [
  { id: 1, type: "info", message: "Nuevo servicio creado: SVC-042", time: "Hace 5 min" },
  { id: 2, type: "warning", message: "Servicio SVC-038 próximo a vencer", time: "Hace 15 min" },
  { id: 3, type: "success", message: "Servicio SVC-041 completado", time: "Hace 1 hora" },
  { id: 4, type: "info", message: "Nuevo colaborador asignado al Área 3", time: "Hace 2 horas" },
  { id: 5, type: "warning", message: "Servicio SVC-035 bloqueado", time: "Hace 3 horas" },
];

function RolBadge({ rol }: { rol: string }) {
  const styles: Record<string, string> = {
    sistema: "bg-red-500/20 text-red-300",
    admin: "bg-purple-500/20 text-purple-300",
    encargado: "bg-blue-500/20 text-blue-300",
    colaborador: "bg-slate-500/20 text-slate-300",
  };
  return (
    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider", styles[rol] || styles.colaborador)}>
      {rol}
    </span>
  );
}

function getPageTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const mainSegment = segments[0] || "dashboard";
  const titles: Record<string, string> = {
    dashboard: "Dashboard",
    servicios: "Servicios",
    solicitudes: "Solicitudes",
    plantillas: "Plantillas",
    areas: "Áreas",
    usuarios: "Usuarios",
    reportes: "Reportes",
    auditoria: "Auditoría",
    anuncios: "Anuncios",
    comunicaciones: "Comunicaciones",
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
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  const pageTitle = getPageTitle(location.pathname);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
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
          "fixed lg:static inset-y-0 left-0 z-50 w-[280px] bg-blue-900 text-white flex flex-col shrink-0 transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Brand header */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-400 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5 text-blue-900" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold leading-tight">ServicioLocal</h1>
               <p className="text-xs text-blue-200">STS</p>
            </div>
          </div>
          {/* User info */}
          <div className="flex items-center gap-2 mt-3">
            <Avatar className="w-7 h-7 shrink-0">
              <AvatarFallback className="text-[10px] bg-blue-700 text-white">
                {getInitials(user?.nombres || "")}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-blue-100 truncate">{user?.nombres}</span>
            <RolBadge rol={user?.rol ?? ""} />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {/* Principal section */}
          <p className="text-[10px] text-blue-300 uppercase tracking-wider px-3 pb-1 font-semibold">
            Principal
          </p>
          {nav.filter((item) => canSee(item.roles)).map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeSidebar}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-yellow-400 text-blue-900 font-medium"
                    : "text-blue-100 hover:bg-blue-800 hover:text-white",
                )
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}

          {/* Gestión section */}
          {canSee(["admin", "encargado"]) && (
            <>
              <p className="text-[10px] text-blue-300 uppercase tracking-wider px-3 pt-4 pb-1 font-semibold">
                Gestión
              </p>
              {managerNav.filter((item) => canSee(item.roles)).map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-yellow-400 text-blue-900 font-medium"
                        : "text-blue-100 hover:bg-blue-800 hover:text-white",
                    )
                  }
                >
                  {icon}
                  {label}
                </NavLink>
              ))}
            </>
          )}

          {/* Pantallas section */}
          <p className="text-[10px] text-blue-300 uppercase tracking-wider px-3 pt-4 pb-1 font-semibold">
            Pantallas
          </p>
          {displayLinks.map(({ to, label, icon }) => (
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
        </nav>

        {/* Logout */}
        <div className="px-3 py-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-blue-200 hover:text-white hover:bg-blue-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
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

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-muted-foreground hidden sm:inline">Pages</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground hidden sm:block shrink-0" />
            <span className="font-medium text-gray-900 truncate">{pageTitle}</span>
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1">
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className={cn(
                  "relative p-2 rounded-lg transition-colors",
                  notifOpen ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100",
                )}
                aria-label="Notificaciones"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {mockNotifications.length}
                </span>
              </button>

              {/* Notifications dropdown */}
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">Notificaciones</p>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {mockNotifications.map((n) => (
                      <div
                        key={n.id}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0"
                      >
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full mt-1.5 shrink-0",
                            n.type === "warning" && "bg-yellow-400",
                            n.type === "success" && "bg-green-500",
                            n.type === "info" && "bg-blue-500",
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-700">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t border-gray-100 text-center">
                    <button className="text-xs text-blue-600 hover:text-blue-800 font-medium py-1">
                      Ver todas
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <button
              className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Configuración"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* User avatar */}
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
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-500">{user?.email}</p>
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
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
