import { useState } from "react";
import { useAuth } from "@/lib/auth.js";
import {
  useAnuncios,
  useTodosAnuncios,
  useCrearAnuncio,
  useEditarAnuncio,
  useEliminarAnuncio,
} from "@/api/queries/useAnuncios.js";
import {
  useMisSolicitudes,
  useSolicitudes,
  useCrearSolicitud,
  useAtenderSolicitud,
} from "@/api/queries/useSolicitudes.js";
import { useAreas } from "@/api/queries/useAreas.js";
import { cn } from "@/app/lib/utils";
import type { Anuncio, Solicitud } from "@shared/index.js";
import {
  Megaphone, MessageSquare, ArrowUpRight, Plus, Send, Clock,
  CheckCircle2, Bell, X, AlertCircle, MapPin,
} from "lucide-react";

// -- Anuncios config --
const PRIORIDAD_CONFIG: Record<string, { icon: string; label: string; style: string }> = {
  urgente:     { icon: "🔴", label: "Urgente",     style: "bg-red-100 text-red-700" },
  importante:  { icon: "🟡", label: "Importante",  style: "bg-yellow-100 text-yellow-700" },
  informativo: { icon: "🔵", label: "Informativo", style: "bg-blue-100 text-blue-700" },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

// -- Solicitudes config --
const TIPO_ICON: Record<string, string> = {
  apoyo: "🤝", herramienta: "🔧", equipo: "🖥️", otro: "📋",
};
const TIPO_LABEL: Record<string, string> = {
  apoyo: "Apoyo", herramienta: "Herramienta", equipo: "Equipo", otro: "Otro",
};
const ESTADO_STYLES: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-700",
  en_proceso: "bg-blue-100 text-blue-700",
  resuelto: "bg-green-100 text-green-700",
  rechazado: "bg-red-100 text-red-700",
};
const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente", en_proceso: "En Proceso", resuelto: "Resuelto", rechazado: "Rechazado",
};

// -- Anuncio create form state --
interface AnnFormData { titulo: string; contenido: string; prioridad: string; area_alcanze: "general" | number; fecha_expiracion: string; }
const emptyAnnForm: AnnFormData = { titulo: "", contenido: "", prioridad: "informativo", area_alcanze: "general", fecha_expiracion: "" };

// -- Solicitud create form state --
interface ReqFormData { tipo: string; descripcion: string; prioridad: string; }
const emptyReqForm: ReqFormData = { tipo: "otro", descripcion: "", prioridad: "media" };

export function ComunicacionesPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.rol === "admin" || currentUser?.rol === "sistema";
  const isAdminOrEncargado = isAdmin || currentUser?.rol === "encargado";

  const [tab, setTab] = useState<"anuncios" | "solicitudes" | "instrucciones">("anuncios");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"anuncio" | "solicitud">("anuncio");
  const [showInactivos, setShowInactivos] = useState(false);
  const [annForm, setAnnForm] = useState<AnnFormData>(emptyAnnForm);
  const [reqForm, setReqForm] = useState<ReqFormData>(emptyReqForm);
  const [atenderTarget, setAtenderTarget] = useState<Solicitud | null>(null);
  const [atenderForm, setAtenderForm] = useState({ estado: "en_proceso", respuesta: "" });

  // Anuncios hooks
  const activosQuery = useAnuncios();
  const todosQuery = useTodosAnuncios();
  const crearAnuncio = useCrearAnuncio();
  const editarAnuncio = useEditarAnuncio();
  const eliminarAnuncio = useEliminarAnuncio();
  const anunciosQuery = isAdmin && showInactivos ? todosQuery : activosQuery;
  const anuncios = anunciosQuery.data;
  const anunciosLoading = anunciosQuery.isLoading;
  const anunciosError = anunciosQuery.isError;

  const { data: areas } = useAreas();

  // Filtrar anuncios: admin ve todos, otros ven general + su área
  const anunciosFiltrados = isAdmin
    ? (anuncios || [])
    : (anuncios || []).filter((a: Anuncio) =>
        a.area_id === null || a.area_id === currentUser?.area_id
      );

  // Solicitudes hooks
  const misQuery = useMisSolicitudes();
  const todasQuery = useSolicitudes();
  const crearSolicitud = useCrearSolicitud();
  const atenderSolicitud = useAtenderSolicitud();
  const solicitudesQuery = isAdminOrEncargado ? todasQuery : misQuery;
  const solicitudes = solicitudesQuery.data;
  const solicitudesLoading = solicitudesQuery.isLoading;
  const solicitudesError = solicitudesQuery.isError;

  // -- Handlers --

  const handleSaveAnuncio = async () => {
    if (!annForm.titulo || !annForm.contenido) return;
    const payload: any = { titulo: annForm.titulo, contenido: annForm.contenido, prioridad: annForm.prioridad };
    payload.area_id = annForm.area_alcanze === "general" ? null : annForm.area_alcanze;
    if (annForm.fecha_expiracion) payload.fecha_expiracion = annForm.fecha_expiracion;
    await crearAnuncio.mutateAsync(payload);
    setShowModal(false);
    setAnnForm(emptyAnnForm);
  };

  const handleDesactivarAnuncio = async (anuncio: Anuncio) => {
    if (!window.confirm(`¿Desactivar el anuncio "${anuncio.titulo}"?`)) return;
    await editarAnuncio.mutateAsync({ id: anuncio.id, data: { activo: false } });
  };

  const handleEliminarAnuncio = async (anuncio: Anuncio) => {
    if (!window.confirm(`¿Eliminar permanentemente "${anuncio.titulo}"?`)) return;
    await eliminarAnuncio.mutateAsync(anuncio.id);
  };

  const handleSaveSolicitud = async () => {
    if (!reqForm.descripcion) return;
    await crearSolicitud.mutateAsync(reqForm);
    setShowModal(false);
    setReqForm(emptyReqForm);
  };

  const handleAtender = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!atenderTarget) return;
    await atenderSolicitud.mutateAsync({ id: atenderTarget.id, data: atenderForm });
    setAtenderTarget(null);
    setAtenderForm({ estado: "en_proceso", respuesta: "" });
  };

  const solicitudesTab = solicitudes?.filter((s: Solicitud) => (s.tipo as string) !== "instruccion") || [];
  const instruccionesTab: Solicitud[] = []; // Instrucciones no son un tipo en STS -- placeholder para futuro uso

  const statCards = [
    {
      label: "Anuncios activos",
      value: anunciosFiltrados?.length || 0,
      icon: Megaphone,
      color: "bg-blue-900",
    },
    {
      label: "Solicitudes pendientes",
      value: solicitudes?.filter((s: Solicitud) => s.estado === "pendiente").length || 0,
      icon: Bell,
      color: "bg-yellow-500",
    },
    {
      label: "Instrucciones",
      value: 0,
      icon: MessageSquare,
      color: "bg-purple-600",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-gray-900 font-bold">Comunicación Interna</h1>
          <p className="text-gray-500 text-sm">Anuncios, solicitudes e instrucciones del equipo</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={() => { setModalType("anuncio"); setShowModal(true); }}
              className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 px-4 py-2.5 rounded-xl text-sm font-bold transition"
            >
              <Megaphone className="w-4 h-4" />
              Publicar Anuncio
            </button>
          )}
          <button
            onClick={() => { setModalType("solicitud"); setShowModal(true); }}
            className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            Nuevo
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-2", stat.color)}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl text-gray-900 font-bold">{stat.value}</p>
            <p className="text-gray-500 text-xs">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
        {([
          { id: "anuncios" as const, label: "Anuncios", icon: Megaphone },
          { id: "solicitudes" as const, label: "Solicitudes", icon: ArrowUpRight },
          { id: "instrucciones" as const, label: "Instrucciones", icon: MessageSquare },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition",
              tab === t.id ? "bg-blue-900 text-white font-semibold" : "text-gray-600 hover:bg-gray-100",
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== ANUNCIOS TAB ===== */}
      {tab === "anuncios" && (
        <div className="space-y-3">
          {/* Admin: toggle inactive */}
          {isAdmin && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactivos}
                  onChange={(e) => setShowInactivos(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Mostrar inactivos
              </label>
            </div>
          )}

          {anunciosLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-48" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-36" />
                </div>
              ))}
            </div>
          ) : anunciosError ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <p className="text-red-600 font-medium">Error al cargar anuncios</p>
            </div>
          ) : anunciosFiltrados && anunciosFiltrados.length > 0 ? (
            anunciosFiltrados.map((ann: Anuncio) => {
              const prioridadCfg = PRIORIDAD_CONFIG[ann.prioridad] || PRIORIDAD_CONFIG.informativo;
              const vencido = ann.fecha_expiracion && new Date(ann.fecha_expiracion) < new Date();
              return (
                <div
                  key={ann.id}
                  className={cn(
                    "bg-white rounded-2xl shadow-sm border border-gray-100 p-5",
                    !ann.activo && "opacity-60",
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-900 flex items-center justify-center">
                        <Megaphone className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div>
                        <h3 className="text-gray-900 text-sm font-bold">{ann.titulo}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          <span>{ann.usuario?.nombres || `Usuario #${ann.usuario_id}`}</span>
                          <span>·</span>
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(ann.fecha_publicacion)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {ann.area_nombre && (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-900/10 text-blue-700 font-medium flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {ann.area_nombre}
                        </span>
                      )}
                      {!ann.area_id && !ann.area_nombre && (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                          General
                        </span>
                      )}
                      <span className={cn("text-xs px-2 py-1 rounded-full font-semibold", prioridadCfg.style)}>
                        {prioridadCfg.icon} {prioridadCfg.label}
                      </span>
                      {!ann.activo && (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-600 font-medium">Inactivo</span>
                      )}
                      {vencido && (
                        <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-600 font-medium">Vencido</span>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed ml-13 pl-13 whitespace-pre-wrap">{ann.contenido}</p>

                  {isAdmin && (
                    <div className="flex justify-end gap-3 mt-3 pt-3 border-t border-gray-100">
                      {ann.activo && (
                        <button
                          onClick={() => handleDesactivarAnuncio(ann)}
                          className="text-xs text-orange-600 hover:underline font-medium"
                        >
                          Desactivar
                        </button>
                      )}
                      <button
                        onClick={() => handleEliminarAnuncio(ann)}
                        className="text-xs text-red-600 hover:underline font-medium"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}

                  {ann.fecha_expiracion && (
                    <div className="mt-2 text-xs text-gray-400 text-right">
                      <span className={vencido ? "text-red-500" : ""}>
                        Válido hasta: {formatDateShort(ann.fecha_expiracion)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">
              <Megaphone className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              No hay anuncios {!isAdmin ? "para tu área" : ""}
            </div>
          )}
        </div>
      )}

      {/* ===== SOLICITUDES TAB ===== */}
      {tab === "solicitudes" && (
        <div className="space-y-3">
          {solicitudesLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-48" />
                </div>
              ))}
            </div>
          ) : solicitudesError ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <p className="text-red-600 font-medium">Error al cargar solicitudes</p>
            </div>
          ) : solicitudesTab.length > 0 ? (
            solicitudesTab.map((req: Solicitud) => (
              <div
                key={req.id}
                className={cn(
                  "bg-white rounded-2xl shadow-sm border p-5",
                  req.estado === "resuelto" ? "border-green-100 bg-green-50/30" : "border-gray-100",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      req.tipo === "apoyo" ? "bg-blue-100" : req.tipo === "herramienta" ? "bg-yellow-100" : "bg-gray-100",
                    )}>
                      <span className="text-lg">{TIPO_ICON[req.tipo] || "📋"}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-semibold",
                          TIPO_LABEL[req.tipo] ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600",
                        )}>
                          {TIPO_LABEL[req.tipo] || req.tipo}
                        </span>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-semibold",
                          ESTADO_STYLES[req.estado] || "bg-gray-100 text-gray-600",
                        )}>
                          {ESTADO_LABEL[req.estado] || req.estado}
                        </span>
                      </div>
                      <p className="text-gray-900 text-sm mt-1">{req.descripcion}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                        <span>De: <span className="text-gray-600 font-medium">{req.usuario?.nombres || `Usuario #${req.usuario_id}`}</span></span>
                        <span>{formatDate(req.created_at)}</span>
                      </div>
                      {req.respuesta && (
                        <div className="bg-slate-50 rounded-lg p-3 mt-2 text-sm text-slate-600 border-l-4 border-blue-400">
                          <p className="text-xs text-slate-400 font-medium mb-1">Respuesta:</p>
                          {req.respuesta}
                        </div>
                      )}
                    </div>
                  </div>
                  {req.estado !== "resuelto" && req.estado !== "rechazado" && isAdminOrEncargado && (
                    <button
                      onClick={() => setAtenderTarget(req)}
                      className="flex-shrink-0 flex items-center gap-1.5 bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-700 transition font-semibold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Atender
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">
              <ArrowUpRight className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              No hay solicitudes
            </div>
          )}
        </div>
      )}

      {/* ===== INSTRUCCIONES TAB ===== */}
      {tab === "instrucciones" && (
        <div className="space-y-3">
          {instruccionesTab.length > 0 ? (
            instruccionesTab.map((req: Solicitud) => (
              <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-purple-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-semibold">
                        Instrucción
                      </span>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-semibold",
                        ESTADO_STYLES[req.estado] || "bg-gray-100 text-gray-600",
                      )}>
                        {req.estado === "resuelto" ? "✓ Leído" : ESTADO_LABEL[req.estado] || req.estado}
                      </span>
                    </div>
                    <p className="text-gray-900 text-sm">{req.descripcion}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                      <span>De: <span className="text-gray-600 font-medium">{req.usuario?.nombres || `Usuario #${req.usuario_id}`}</span></span>
                      <span>{formatDate(req.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">
              <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              No hay instrucciones registradas
            </div>
          )}
        </div>
      )}

      {/* ===== MODAL ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-gray-900 font-bold">
                {modalType === "anuncio" ? "Publicar Anuncio" : "Nueva Solicitud"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {modalType === "anuncio" ? (
                <>
                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-1">Título *</label>
                    <input
                      type="text"
                      placeholder="Título del anuncio"
                      value={annForm.titulo}
                      onChange={(e) => setAnnForm((p) => ({ ...p, titulo: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-1">Contenido *</label>
                    <textarea
                      rows={4}
                      placeholder="Contenido del anuncio..."
                      value={annForm.contenido}
                      onChange={(e) => setAnnForm((p) => ({ ...p, contenido: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 font-semibold mb-1">Prioridad</label>
                      <select
                        value={annForm.prioridad}
                        onChange={(e) => setAnnForm((p) => ({ ...p, prioridad: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50"
                      >
                        <option value="informativo">Informativo</option>
                        <option value="importante">Importante</option>
                        <option value="urgente">Urgente</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 font-semibold mb-1">
                        Expiración <span className="text-gray-400 font-normal">(opcional)</span>
                      </label>
                      <input
                        type="date"
                        value={annForm.fecha_expiracion}
                        onChange={(e) => setAnnForm((p) => ({ ...p, fecha_expiracion: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-1">Alcance</label>
                    <select
                      value={typeof annForm.area_alcanze === "number" ? annForm.area_alcanze : "general"}
                      onChange={(e) => setAnnForm((p) => ({
                        ...p,
                        area_alcanze: e.target.value === "general" ? "general" : Number(e.target.value),
                      }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50"
                    >
                      <option value="general">General (todas las áreas)</option>
                      {areas?.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.nombre}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-1">Tipo de solicitud</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["apoyo", "herramienta", "equipo", "otro"].map((tipo) => (
                        <button
                          key={tipo}
                          onClick={() => setReqForm((p) => ({ ...p, tipo }))}
                          className={cn(
                            "py-2 px-3 rounded-xl border text-sm transition",
                            reqForm.tipo === tipo
                              ? "border-blue-600 bg-blue-50 text-blue-900 font-semibold"
                              : "border-gray-200 text-gray-600 hover:border-gray-300",
                          )}
                        >
                          {TIPO_ICON[tipo] || "📋"} {TIPO_LABEL[tipo] || tipo}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-1">Descripción *</label>
                    <textarea
                      rows={3}
                      placeholder="Detallá tu solicitud..."
                      value={reqForm.descripcion}
                      onChange={(e) => setReqForm((p) => ({ ...p, descripcion: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-1">Prioridad</label>
                    <select
                      value={reqForm.prioridad}
                      onChange={(e) => setReqForm((p) => ({ ...p, prioridad: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50"
                    >
                      <option value="baja">Baja</option>
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={modalType === "anuncio" ? handleSaveAnuncio : handleSaveSolicitud}
                disabled={crearAnuncio.isPending || crearSolicitud.isPending}
                className="flex-1 bg-blue-900 text-white rounded-xl py-2.5 text-sm hover:bg-blue-800 transition disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
              >
                <Send className="w-4 h-4" />
                {crearAnuncio.isPending || crearSolicitud.isPending
                  ? "Enviando..."
                  : modalType === "anuncio" ? "Publicar" : "Enviar solicitud"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ATENDER MODAL ===== */}
      {atenderTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-gray-900 font-bold">Atender Solicitud</h3>
              <button onClick={() => setAtenderTarget(null)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                <p className="font-medium text-gray-700 mb-1">Solicitud:</p>
                <p>{atenderTarget.descripcion}</p>
              </div>
              <form onSubmit={handleAtender} className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 font-semibold mb-1">Estado</label>
                  <select
                    value={atenderForm.estado}
                    onChange={(e) => setAtenderForm((p) => ({ ...p, estado: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50"
                    required
                  >
                    <option value="en_proceso">En Proceso</option>
                    <option value="resuelto">Resuelto</option>
                    <option value="rechazado">Rechazado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 font-semibold mb-1">
                    Respuesta <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Escribí una respuesta para el solicitante..."
                    value={atenderForm.respuesta}
                    onChange={(e) => setAtenderForm((p) => ({ ...p, respuesta: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50 resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setAtenderTarget(null); setAtenderForm({ estado: "en_proceso", respuesta: "" }); }}
                    className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={atenderSolicitud.isPending}
                    className="flex-1 bg-blue-900 text-white rounded-xl py-2.5 text-sm hover:bg-blue-800 transition disabled:opacity-50 font-semibold"
                  >
                    {atenderSolicitud.isPending ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
