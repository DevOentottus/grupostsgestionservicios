import { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth.js";
import { cn } from "@/app/lib/utils";
import { HelpDrawer } from "@/app/help/HelpDrawer";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import {
  LayoutDashboard,
  Wrench,
  FileText,
  Building2,
  Users,
  BarChart3,
  ScrollText,
  TrendingUp,
  MessageSquare,
  LogOut,
  Tv,
  Menu,
  X,
  HelpCircle,
  ChevronRight,
  Home,
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles?: ("sistema" | "admin" | "encargado" | "colaborador")[];
}

const nav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, roles: ["admin"] },
  { to: "/miarea", label: "Mi Área", icon: <Home className="w-4 h-4" />, roles: ["colaborador", "encargado"] },
  { to: "/servicios", label: "Servicios", icon: <Wrench className="w-4 h-4" /> },
  { to: "/plantillas", label: "Plantillas", icon: <FileText className="w-4 h-4" /> },
  { to: "/areas", label: "Áreas", icon: <Building2 className="w-4 h-4" />, roles: ["admin", "sistema"] },
  { to: "/usuarios", label: "Usuarios", icon: <Users className="w-4 h-4" />, roles: ["sistema"] },
  { to: "/reportes", label: "Reportes", icon: <BarChart3 className="w-4 h-4" />, roles: ["admin", "encargado"] },
  { to: "/auditoria", label: "Auditoría", icon: <ScrollText className="w-4 h-4" />, roles: ["admin"] },
  { to: "/admin/rendimiento", label: "Rendimiento", icon: <TrendingUp className="w-4 h-4" />, roles: ["admin", "sistema"] },
  { to: "/comunicaciones", label: "Comunicaciones", icon: <MessageSquare className="w-4 h-4" /> },
];

const managerNav: NavItem[] = [
  { to: "/manager/clientes", label: "Clientes", icon: <Users className="w-4 h-4" />, roles: ["admin", "sistema"] },
  { to: "/manager/desempeno", label: "Desempeño", icon: <TrendingUp className="w-4 h-4" />, roles: ["admin", "encargado", "sistema"] },
];

const displayLinks: NavItem[] = [
  { to: "/display/tv", label: "TV General", icon: <Tv className="w-3.5 h-3.5" />, roles: ["admin"] },
  { to: "/seguimiento-cliente", label: "Seguimiento Cliente", icon: <FileText className="w-3.5 h-3.5" /> },
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
    miarea: "Mi Área",
    misservicios: "Mis Servicios",
    servicios: "Servicios",
    plantillas: "Plantillas",
    areas: "Áreas",
    usuarios: "Usuarios",
    reportes: "Reportes",
    auditoria: "Auditoría",
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
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

  const getNavLabel = (item: NavItem): string => {
    if (item.to === "/servicios" && (user?.rol === "encargado" || user?.rol === "colaborador")) {
      return "Mis servicios";
    }
    return item.label;
  };

  const pageTitle = getPageTitle(location.pathname);

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
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
          "fixed lg:static inset-y-0 left-0 z-50 bg-blue-900 text-white flex flex-col shrink-0 transition-all duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          sidebarCollapsed ? "w-16" : "w-60",
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
                <h1 className="text-base font-bold leading-tight">ServicioLocal</h1>
                <p className="text-xs text-blue-200">STS</p>
              </div>
            )}
          </div>
          {/* User info — only when expanded */}
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
            .filter((item) => !(user?.rol === "sistema" && item.to === "/miarea"))
            .map((item) => {
              const { to, icon } = item;
              const label = getNavLabel(item);
              const isActive = location.pathname === to || location.pathname.startsWith(to + "/");
              return (
                <NavLink
                  key={to}
                  to={to}
                  onClick={closeSidebar}
                  className={cn(
                    "flex items-center justify-center lg:justify-start gap-3 px-2 py-2 rounded-lg text-sm transition-colors",
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
          {canSee(["admin", "encargado"]) && !sidebarCollapsed && (
            <>
              <p className="text-[10px] text-blue-300 uppercase tracking-wider px-3 pt-4 pb-1 font-semibold">
                Gestión
              </p>
              {managerNav.filter((item) => canSee(item.roles)).map(({ to, label, icon }) => {
                const isActive = location.pathname === to || location.pathname.startsWith(to + "/");
                return (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={closeSidebar}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-yellow-400 text-blue-900 font-medium"
                        : "text-blue-100 hover:bg-blue-800 hover:text-white",
                    )}
                  >
                    {icon}
                    {label}
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
          {/* Collapse toggle — desktop only */}
          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="hidden lg:flex w-full items-center justify-center lg:justify-start gap-3 px-2 py-2 rounded-lg text-sm text-blue-200 hover:text-white hover:bg-blue-800 transition-colors"
            title={sidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
          >
            <Menu className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Colapsar</span>}
          </button>
          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center lg:justify-start gap-3 px-2 py-2 rounded-lg text-sm text-blue-200 hover:text-white hover:bg-blue-800 transition-colors"
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
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Help Drawer */}
      <HelpDrawer open={isHelpOpen} onOpenChange={setIsHelpOpen} />
    </div>
  );
}
