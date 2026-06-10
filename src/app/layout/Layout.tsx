import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth.js";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/servicios", label: "Servicios", icon: "📋" },
  { to: "/plantillas", label: "Plantillas", icon: "📝" },
  { to: "/areas", label: "Áreas", icon: "🏢" },
  { to: "/usuarios", label: "Usuarios", icon: "👥" },
  { to: "/reportes", label: "Reportes", icon: "📈" },
  { to: "/auditoria", label: "Auditoría", icon: "📜", adminOnly: true },
  { to: "/manager/mi-area", label: "Mi Área", icon: "🎯", encargadoOnly: true },
  { to: "/manager/distribucion", label: "Distribución", icon: "📋", encargadoOnly: true },
  { to: "/manager/desempeno", label: "Desempeño", icon: "📊", encargadoOnly: true },
];

const displayLinks = [
  { to: "/display/tv", label: "📺 TV" },
  { to: "/display/waiting-room", label: "⏳ Sala Espera" },
  { to: "/display/work-room", label: "🛠️ Sala Trabajo" },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-lg font-bold">ServicioLocalSTS</h1>
          <p className="text-xs text-slate-400 mt-1">{user?.nombres}</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {nav
            .filter((item) => {
              if (item.adminOnly) return user?.rol === "admin";
              if (item.encargadoOnly) return user?.rol === "admin" || user?.rol === "encargado";
              return true;
            })
            .map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800"
                }`
              }
            >
              <span>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        {/* Display Links */}
        <div className="px-3 py-2 border-t border-slate-800">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 px-3">
            Pantallas
          </p>
          {displayLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              target="_blank"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {label}
            </NavLink>
          ))}
        </div>

        <div className="p-3 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-slate-400 hover:text-white transition-colors px-3 py-2"
          >
            ⏻ Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
