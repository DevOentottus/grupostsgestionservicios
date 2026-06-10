import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth.js";
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
  Clock,
  HardHat,
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
];

function RolBadge({ rol }: { rol: string }) {
  const styles: Record<string, string> = {
    admin: "bg-purple-500/20 text-purple-300",
    encargado: "bg-blue-500/20 text-blue-300",
    colaborador: "bg-slate-500/20 text-slate-300",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider ${styles[rol] || styles.colaborador}`}>
      {rol}
    </span>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const canSee = (roles?: string[]) => {
    if (!roles) return true;
    return roles.includes(user?.rol ?? "");
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        {/* Brand */}
        <div className="px-4 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">ServicioLocal</h1>
              <h1 className="text-sm font-bold leading-tight">STS</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2.5">
            <span className="text-xs text-slate-300 truncate">{user?.nombres}</span>
            <RolBadge rol={user?.rol ?? ""} />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {/* Main section */}
          <p className="text-[10px] text-slate-500 uppercase tracking-wider px-3 pt-3 pb-1 font-semibold">
            Principal
          </p>
          {nav.filter((item) => canSee(item.roles)).map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}

          {/* Management section */}
          {canSee(["admin", "encargado"]) && (
            <>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider px-3 pt-4 pb-1 font-semibold">
                Gestión
              </p>
              {managerNav.filter((item) => canSee(item.roles)).map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`
                  }
                >
                  {icon}
                  {label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Display Links */}
        <div className="px-3 py-3 border-t border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 px-3 font-semibold">
            Pantallas
          </p>
          {displayLinks.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              target="_blank"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </div>

        {/* User area */}
        <div className="p-3 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-slate-800"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
