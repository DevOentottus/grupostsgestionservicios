import { useState, type FormEvent, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth.js";
import { Wrench, Eye, EyeOff, AlertCircle, ShieldAlert, User, Lock, LogIn, FileText } from "lucide-react";

export function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const revoked = searchParams.get("revoked") === "true";

  const destinoPorRol = (rol: string) =>
    rol === "colaborador" || rol === "encargado" ? "/midesempeno" : "/dashboard";

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(destinoPorRol(user.rol), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const userData = await login(username, password);
      navigate(destinoPorRol(userData.rol), { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.detail || "Usuario o contraseña incorrectos. Verifique sus credenciales.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #2563eb 100%)" }}>
      {/* Left panel -- hidden on mobile */}
      <div className="hidden lg:flex flex-col justify-center items-center w-1/2 p-12 text-white">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg">
                <Wrench className="w-9 h-9 text-blue-900" />
              </div>
              <div className="w-fit">
                <h1 className="text-4xl text-white font-bold">ServicioSTS</h1>
                <p className="text-blue-200 text-sm">Gestión de servicios Técnicos</p>
              </div>
            </div>
          <p className="text-blue-100 text-lg leading-relaxed max-w-md">
            Plataforma integral para gestión de servicios técnicos, seguimiento de tareas
            y monitoreo en tiempo real.
          </p>
        </div>

      </div>

      {/* Right panel -- form */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-md">
          {/* Mobile brand -- visible only on small screens */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-12 h-12 bg-blue-800 rounded-xl flex items-center justify-center">
              <Wrench className="w-7 h-7 text-yellow-400" />
            </div>
            <div className="w-fit">
              <h2 className="text-blue-900 font-bold">ServicioSTS</h2>
              <p className="text-gray-500 text-xs">Gestión de servicios Técnicos</p>
            </div>
          </div>

          <h2 className="text-gray-900 font-bold mb-1">Iniciar sesión</h2>
          <p className="text-gray-500 text-sm mb-6">Ingresa tus credenciales para continuar</p>

          {revoked && (
            <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl p-4 mb-4 text-sm">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-600" />
              <div>
                <p className="font-semibold">Sesión cerrada</p>
                <p className="text-orange-700 mt-1">
                  Tu sesión anterior ya no es válida. Iniciá sesión de nuevo para continuar.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-600 font-semibold mb-1">Usuario</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej: admin"
                  autoComplete="username"
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-gray-50"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 font-semibold mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-12 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-gray-50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 rounded-xl py-3 text-sm font-bold transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                "Verificando..."
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Ingresar al sistema
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <span className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">o</span>
            <span className="flex-1 h-px bg-gray-200" />
          </div>

          <button
            type="button"
            onClick={() => navigate("/seguimiento-cliente")}
            className="w-full border border-gray-200 hover:border-blue-300 text-gray-600 hover:text-blue-700 rounded-xl py-3 text-sm font-semibold transition flex items-center justify-center gap-2 hover:bg-blue-50"
          >
            <FileText className="w-4 h-4" />
            Seguimiento de servicio
          </button>

        </div>
      </div>
    </div>
  );
}
