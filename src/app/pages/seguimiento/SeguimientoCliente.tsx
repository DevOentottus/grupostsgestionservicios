import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function SeguimientoClientePage() {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState("");
  const [dni, setDni] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = codigo.trim();
    if (!trimmed) return;
    const params = dni.trim() ? `?dni=${encodeURIComponent(dni.trim())}` : "";
    navigate(`/public/servicio/${trimmed}${params}`);
  };

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
              DNI <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              id="dni"
              type="text"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              placeholder="Ej: 12345678"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg text-center font-mono
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         placeholder:text-gray-400"
              autoComplete="off"
              maxLength={8}
            />
            <p className="text-xs text-gray-400 mt-1">
              Opcional: si lo ingresás, podrás ver las evidencias del servicio y comentarlas.
            </p>
          </div>

          <button
            type="submit"
            disabled={!codigo.trim()}
            className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            Consultar
          </button>
        </form>

        <p className="text-xs text-center text-gray-400 mt-6">
          El código fue proporcionado al solicitar tu servicio.
        </p>
      </div>
    </div>
  );
}
