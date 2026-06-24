import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellOff } from "lucide-react";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/push.js";

export function SeguimientoClientePage() {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState("");
  const [dni, setDni] = useState("");
  const [pushOk, setPushOk] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // Restaurar estado de push al montar
  useEffect(() => {
    const saved = sessionStorage.getItem("push_subscribed");
    if (saved === "true") setPushOk(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = codigo.trim();
    const dniTrimmed = dni.trim();
    if (!trimmed || !dniTrimmed) return;
    sessionStorage.setItem("public_dni", dniTrimmed);
    navigate(`/public/servicio/${trimmed}`);
  };

  const handleTogglePush = async () => {
    const dniTrimmed = dni.trim();
    if (!dniTrimmed) return;

    setPushLoading(true);
    try {
      if (pushOk) {
        await unsubscribeFromPush();
        sessionStorage.setItem("push_subscribed", "false");
        setPushOk(false);
      } else {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          setPushLoading(false);
          return;
        }
        const ok = await subscribeToPush(dniTrimmed);
        if (ok) {
          sessionStorage.setItem("push_subscribed", "true");
          setPushOk(true);
        }
      }
    } catch {
      // Silencioso
    }
    setPushLoading(false);
  };

  const puedePush = "PushManager" in window && "Notification" in window;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        {/* Icono / Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
            <span className="text-white font-bold text-2xl">STS</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
          Seguimiento de Servicio
        </h1>
        <p className="text-sm text-center text-gray-500 mb-6">
          Ingresá el código de tu servicio para ver su estado en tiempo real.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="codigo"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Código de servicio
            </label>
            <input
              id="codigo"
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ej: STS-001"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg text-center font-mono
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         uppercase placeholder:normal-case placeholder:text-gray-400"
              autoFocus
              autoComplete="off"
            />
          </div>

          <div>
            <label
              htmlFor="dni"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              DNI
            </label>
            <input
              id="dni"
              type="text"
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
              placeholder="Ej: 12345678"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg text-center font-mono
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         placeholder:text-gray-400"
              autoComplete="off"
              maxLength={8}
              required
            />
          </div>

          <button
            type="submit"
            disabled={!codigo.trim() || !dni.trim()}
            className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            Consultar
          </button>
        </form>

        {/* Botón de notificaciones push */}
        {puedePush && dni.trim() && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleTogglePush}
              disabled={pushLoading}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                pushOk
                  ? "bg-green-50 text-green-700 hover:bg-green-100"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {pushLoading ? (
                <span className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              ) : pushOk ? (
                <>
                  <Bell className="w-4 h-4" />
                  Notificaciones activadas
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4" />
                  Activar notificaciones
                </>
              )}
            </button>
            {pushOk && (
              <p className="text-xs text-center text-green-600 mt-1.5">
                Te notificaremos cuando una tarea se complete
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-center text-gray-400 mt-6">
          El código fue proporcionado al solicitar tu servicio.
        </p>
      </div>
    </div>
  );
}
