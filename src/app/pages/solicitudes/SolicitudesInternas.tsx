import { useState } from "react";
import { useAuth } from "@/lib/auth.js";
import {
  useMisSolicitudes,
  useSolicitudes,
  useCrearSolicitud,
  useAtenderSolicitud,
} from "@/api/queries/useSolicitudes.js";
import type { Solicitud } from "@shared/index.js";

const TIPO_ICON: Record<string, string> = {
  apoyo: "🤝",
  herramienta: "🔧",
  equipo: "🖥️",
  otro: "📋",
};

const TIPO_LABEL: Record<string, string> = {
  apoyo: "Apoyo",
  herramienta: "Herramienta",
  equipo: "Equipo",
  otro: "Otro",
};

const PRIORIDAD_STYLES: Record<string, string> = {
  urgente: "bg-red-100 text-red-700",
  alta: "bg-orange-100 text-orange-700",
  media: "bg-blue-100 text-blue-700",
  baja: "bg-slate-100 text-slate-600",
};

const ESTADO_STYLES: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-700",
  en_proceso: "bg-blue-100 text-blue-700",
  resuelto: "bg-green-100 text-green-700",
  rechazado: "bg-red-100 text-red-700",
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  en_proceso: "En Proceso",
  resuelto: "Resuelto",
  rechazado: "Rechazado",
};

const PRIORIDAD_LABEL: Record<string, string> = {
  urgente: "Urgente",
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SolicitudCard({
  solicitud,
  onAtender,
  canAtender,
}: {
  solicitud: Solicitud;
  onAtender: (s: Solicitud) => void;
  canAtender: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{TIPO_ICON[solicitud.tipo] || "📋"}</span>
          <div>
            <span className="text-xs text-slate-400">{TIPO_LABEL[solicitud.tipo] || solicitud.tipo}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              PRIORIDAD_STYLES[solicitud.prioridad] || "bg-slate-100 text-slate-600"
            }`}
          >
            {PRIORIDAD_LABEL[solicitud.prioridad] || solicitud.prioridad}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              ESTADO_STYLES[solicitud.estado] || "bg-slate-100 text-slate-600"
            }`}
          >
            {ESTADO_LABEL[solicitud.estado] || solicitud.estado}
          </span>
        </div>
      </div>

      <p className="text-sm text-slate-700">{solicitud.descripcion}</p>

      {solicitud.respuesta && (
        <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 border-l-4 border-blue-400">
          <p className="text-xs text-slate-400 font-medium mb-1">Respuesta:</p>
          {solicitud.respuesta}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t">
        <div className="flex items-center gap-3">
          <span>
            {solicitud.usuario?.nombres || `Usuario #${solicitud.usuario_id}`}
          </span>
          <span>{formatDate(solicitud.created_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          {solicitud.atendido_por_usuario && (
            <span className="text-slate-400">
              Atendido por: {solicitud.atendido_por_usuario.nombres}
            </span>
          )}
          {canAtender && solicitud.estado !== "resuelto" && solicitud.estado !== "rechazado" && (
            <button
              onClick={() => onAtender(solicitud)}
              className="text-blue-600 hover:underline font-medium"
            >
              Atender
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function SolicitudesInternasPage() {
  const { user } = useAuth();
  const isAdminOrEncargado = user?.rol === "admin" || user?.rol === "encargado";

  const [tab, setTab] = useState<"mis" | "todas">("mis");
  const [showCreate, setShowCreate] = useState(false);
  const [atenderTarget, setAtenderTarget] = useState<Solicitud | null>(null);

  const [createForm, setCreateForm] = useState({
    tipo: "otro",
    descripcion: "",
    prioridad: "media",
  });
  const [atenderForm, setAtenderForm] = useState({
    estado: "en_proceso",
    respuesta: "",
  });

  const misQuery = useMisSolicitudes();
  const todasQuery = useSolicitudes();
  const crear = useCrearSolicitud();
  const atender = useAtenderSolicitud();

  const query = tab === "mis" ? misQuery : todasQuery;
  const solicitudes = query.data;
  const isLoading = query.isLoading;
  const isError = query.isError;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await crear.mutateAsync(createForm as any);
    setShowCreate(false);
    setCreateForm({ tipo: "otro", descripcion: "", prioridad: "media" });
  };

  const handleAtender = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!atenderTarget) return;
    await atender.mutateAsync({
      id: atenderTarget.id,
      data: atenderForm,
    });
    setAtenderTarget(null);
    setAtenderForm({ estado: "en_proceso", respuesta: "" });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Solicitudes Internas</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          + Nueva Solicitud
        </button>
      </div>

      {/* Tabs */}
      {isAdminOrEncargado && (
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab("mis")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === "mis"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Mis Solicitudes
          </button>
          <button
            onClick={() => setTab("todas")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === "todas"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Todas
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">Nueva Solicitud</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Tipo</label>
                <select
                  value={createForm.tipo}
                  onChange={(e) => setCreateForm({ ...createForm, tipo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                >
                  <option value="apoyo">Apoyo</option>
                  <option value="herramienta">Herramienta</option>
                  <option value="equipo">Equipo</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Descripción</label>
                <textarea
                  value={createForm.descripcion}
                  onChange={(e) => setCreateForm({ ...createForm, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Prioridad (opcional)</label>
                <select
                  value={createForm.prioridad}
                  onChange={(e) => setCreateForm({ ...createForm, prioridad: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={crear.isPending}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  {crear.isPending ? "Creando..." : "Crear Solicitud"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Atender Modal */}
      {atenderTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">
              Atender Solicitud #{atenderTarget.id}
            </h3>
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
              <p className="font-medium text-slate-700 mb-1">Solicitud:</p>
              <p>{atenderTarget.descripcion}</p>
            </div>
            <form onSubmit={handleAtender} className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Estado</label>
                <select
                  value={atenderForm.estado}
                  onChange={(e) => setAtenderForm({ ...atenderForm, estado: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                >
                  <option value="en_proceso">En Proceso</option>
                  <option value="resuelto">Resuelto</option>
                  <option value="rechazado">Rechazado</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Respuesta (opcional)</label>
                <textarea
                  value={atenderForm.respuesta}
                  onChange={(e) => setAtenderForm({ ...atenderForm, respuesta: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  rows={3}
                  placeholder="Escribí una respuesta para el solicitante..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={atender.isPending}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {atender.isPending ? "Guardando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAtenderTarget(null);
                    setAtenderForm({ estado: "en_proceso", respuesta: "" });
                  }}
                  className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border p-4 space-y-3 animate-pulse">
              <div className="flex justify-between">
                <div className="h-4 bg-slate-200 rounded w-24" />
                <div className="h-5 bg-slate-200 rounded w-16" />
              </div>
              <div className="h-4 bg-slate-200 rounded w-full" />
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-48" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">Error al cargar solicitudes</p>
          <p className="text-red-500 text-sm mt-1">Intentalo de nuevo más tarde.</p>
        </div>
      ) : solicitudes && solicitudes.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <p className="text-slate-400 text-lg font-medium">No hay solicitudes</p>
          <p className="text-slate-400 text-sm mt-1">
            {tab === "mis"
              ? "Todavía no creaste ninguna solicitud."
              : "No hay solicitudes registradas."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {solicitudes?.map((s) => (
            <SolicitudCard
              key={s.id}
              solicitud={s}
              onAtender={setAtenderTarget}
              canAtender={isAdminOrEncargado}
            />
          ))}
        </div>
      )}
    </div>
  );
}
