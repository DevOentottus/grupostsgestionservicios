import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth.js";
import { useServicios, useCrearServicio } from "@/api/queries/useServicios.js";
import { useAreas } from "@/api/queries/useAreas.js";
import {
  usePlantillas,
  usePlantilla,
  useAplicarPlantilla,
} from "@/api/queries/usePlantillas.js";
import { cn } from "@/app/lib/utils";
import type { Servicio, PlantillaTarea } from "@shared/index.js";
import {
  Plus, Search, ClipboardList, ArrowRight, AlertTriangle, AlertCircle,
  CheckCircle2, Clock, X, Users, Wrench, Calendar,
} from "lucide-react";

const statusConfig: Record<string, { bg: string; text: string; dot: string; bar: string }> = {
  pendiente:   { bg: "bg-yellow-100", text: "text-yellow-800", dot: "bg-yellow-500", bar: "bg-yellow-400" },
  en_progreso: { bg: "bg-blue-100",   text: "text-blue-800",   dot: "bg-blue-500",   bar: "bg-blue-600" },
  completado:  { bg: "bg-green-100",  text: "text-green-800",  dot: "bg-green-500",  bar: "bg-green-500" },
  cancelado:   { bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400",   bar: "bg-gray-400" },
  bloqueado:   { bg: "bg-red-100",    text: "text-red-800",    dot: "bg-red-500",    bar: "bg-red-500" },
};

const statusDisplay: Record<string, string> = {
  pendiente: "Pendiente",
  en_progreso: "En Progreso",
  completado: "Completado",
  cancelado: "Cancelado",
  bloqueado: "Bloqueado",
};

const statusFilters = ["todos", "pendiente", "en_progreso", "completado", "bloqueado"];

export function ServiciosPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const { data: servicios, isLoading } = useServicios(
    filterStatus === "todos" ? undefined : filterStatus
  );
  const { data: areas } = useAreas();
  const { data: plantillas } = usePlantillas();
  const crearServicio = useCrearServicio();
  const aplicarPlantilla = useAplicarPlantilla();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    cliente_nombre: "",
    cliente_email: "",
    area_id: "" as string | number,
    plantilla_id: "" as string | number,
  });

  const plantillaId = form.plantilla_id ? Number(form.plantilla_id) : undefined;
  const { data: plantillaDetail } = usePlantilla(plantillaId ?? 0);

  const filtered = (servicios || []).filter((s: Servicio) => {
    const matchSearch = `${s.codigo} ${s.cliente_nombre} ${s.titulo}`
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchSearch;
  });

  const canCreate = currentUser?.rol === "admin" || currentUser?.rol === "encargado" || currentUser?.rol === "sistema";

  const handleCreate = async () => {
    if (!form.titulo || !form.cliente_nombre) return;

    const payload: Record<string, unknown> = {
      titulo: form.titulo,
      descripcion: form.descripcion || undefined,
      cliente_nombre: form.cliente_nombre,
      cliente_email: form.cliente_email || undefined,
    };
    if (form.area_id) {
      payload.area_id = Number(form.area_id);
    }

    const result = await crearServicio.mutateAsync(payload);
    const newServicio = result?.data?.data;

    if (plantillaId && newServicio?.id) {
      await aplicarPlantilla.mutateAsync({
        plantillaId,
        servicioId: newServicio.id,
      });
    }

    closeModal();
  };

  const closeModal = () => {
    setShowModal(false);
    setStep(1);
    setForm({
      titulo: "", descripcion: "", cliente_nombre: "", cliente_email: "",
      area_id: "", plantilla_id: "",
    });
  };

  const statusCount = (status: string) => {
    if (status === "todos") return servicios?.length || 0;
    return servicios?.filter((s: Servicio) => s.estado === status).length || 0;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-gray-900 font-bold">Gestión de Servicios</h1>
          <p className="text-gray-500 text-sm">
            {servicios?.length || 0} servicios
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 px-4 py-2.5 rounded-xl text-sm font-bold transition"
          >
            <Plus className="w-4 h-4" />
            Nuevo Servicio
          </button>
        )}
      </div>

      {/* Status filter buttons */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2",
              filterStatus === status
                ? "bg-yellow-400 text-blue-900"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50",
            )}
          >
            <span className={cn(
              "w-2 h-2 rounded-full",
              status === "todos" && "bg-blue-600",
              status === "pendiente" && "bg-yellow-500",
              status === "en_progreso" && "bg-blue-500",
              status === "completado" && "bg-green-500",
              status === "bloqueado" && "bg-red-500",
            )} />
            <span>{status === "todos" ? "Todos" : statusDisplay[status] || status}</span>
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-full",
              filterStatus === status ? "bg-blue-900/20 text-blue-900" : "bg-gray-100 text-gray-500",
            )}>
              {statusCount(status)}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código, cliente, título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50"
          />
        </div>
      </div>

      {/* Card grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-5 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="h-2 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">No se encontraron servicios</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((srv: Servicio) => {
            const cfg = statusConfig[srv.estado] || statusConfig.pendiente;
            return (
              <div
                key={srv.id}
                onClick={() => navigate(`/servicios/${srv.id}`)}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition cursor-pointer"
              >
                <div className={cn("h-1.5", cfg.bar)} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg font-bold">
                          {srv.codigo}
                        </span>
                        <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                          {statusDisplay[srv.estado] || srv.estado}
                        </span>
                        {srv.estado === "bloqueado" && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <h3 className="text-gray-900 text-sm font-semibold truncate">{srv.titulo}</h3>
                      <p className="text-gray-500 text-xs mt-0.5">{srv.cliente_nombre}</p>
                    </div>
                  </div>

                  {/* Info row */}
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    {srv.area_id && (
                      <span className="bg-gray-100 px-2 py-1 rounded-lg flex items-center gap-1">
                        <Wrench className="w-3 h-3" />
                        Área #{srv.area_id}
                      </span>
                    )}
                    {srv.fecha_inicio && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(srv.fecha_inicio).toLocaleDateString("es-AR")}
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", cfg.bar)}
                        style={{ width: `${srv.estado === "completado" ? 100 : srv.estado === "en_progreso" ? 50 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* View detail */}
                  <div className="mt-3 flex justify-end">
                    <span className="flex items-center gap-1 text-xs text-blue-700 font-semibold">
                      Ver detalle <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== 3-Step Wizard Modal ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h3 className="text-gray-900 font-bold">Nuevo Servicio Técnico</h3>
                <div className="flex items-center gap-2 mt-1">
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      className={cn("w-6 h-1.5 rounded-full transition-all", step >= s ? "bg-blue-600" : "bg-gray-200")}
                    />
                  ))}
                  <span className="text-xs text-gray-400">Paso {step} de 3</span>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <div className="space-y-4">
                  <h4 className="text-gray-700 font-semibold">Información del Servicio</h4>

                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-1">Título *</label>
                    <input
                      type="text"
                      placeholder="Título del servicio"
                      value={form.titulo}
                      onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-1">Cliente *</label>
                    <input
                      type="text"
                      placeholder="Nombre de la empresa o cliente"
                      value={form.cliente_nombre}
                      onChange={(e) => setForm((p) => ({ ...p, cliente_nombre: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-1">
                      Email del cliente <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <input
                      type="email"
                      placeholder="cliente@empresa.com"
                      value={form.cliente_email}
                      onChange={(e) => setForm((p) => ({ ...p, cliente_email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-1">Descripción</label>
                    <textarea
                      placeholder="Describe el trabajo a realizar..."
                      rows={3}
                      value={form.descripcion}
                      onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Area + Plantilla */}
              {step === 2 && (
                <div className="space-y-4">
                  <h4 className="text-gray-700 font-semibold">Área y Plantilla</h4>

                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-1">
                      Área asignada <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <select
                      value={form.area_id}
                      onChange={(e) => setForm((p) => ({ ...p, area_id: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50"
                    >
                      <option value="">Sin área</option>
                      {areas?.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-1">
                      Plantilla de tareas <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <select
                      value={form.plantilla_id}
                      onChange={(e) => setForm((p) => ({ ...p, plantilla_id: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50"
                    >
                      <option value="">Sin plantilla</option>
                      {plantillas?.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} ({p.tareas_count} tareas)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Task preview from selected plantilla */}
                  {plantillaDetail?.tareas && plantillaDetail.tareas.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-blue-700 mb-2">
                        Tareas que se crearán desde "{plantillaDetail.nombre}":
                      </p>
                      <ol className="list-decimal list-inside space-y-1">
                        {plantillaDetail.tareas
                          .sort((a: PlantillaTarea, b: PlantillaTarea) => a.orden - b.orden)
                          .map((t: PlantillaTarea) => (
                            <li key={t.id} className="text-sm text-blue-800">{t.titulo}</li>
                          ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Summary */}
              {step === 3 && (
                <div className="space-y-4">
                  <h4 className="text-gray-700 font-semibold">Resumen y Confirmación</h4>

                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Título</span>
                      <span className="text-gray-900 font-semibold">{form.titulo}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Cliente</span>
                      <span className="text-gray-900 font-semibold">{form.cliente_nombre}</span>
                    </div>
                    {form.cliente_email && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Email</span>
                        <span className="text-gray-900">{form.cliente_email}</span>
                      </div>
                    )}
                    {form.descripcion && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Descripción</span>
                        <span className="text-gray-900 text-right max-w-[60%]">{form.descripcion}</span>
                      </div>
                    )}
                    {form.area_id && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Área</span>
                        <span className="text-gray-900">
                          {areas?.find((a: any) => a.id === Number(form.area_id))?.nombre || `ID: ${form.area_id}`}
                        </span>
                      </div>
                    )}
                    {plantillaDetail && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Plantilla</span>
                        <span className="text-gray-900">{plantillaDetail.nombre} ({plantillaDetail.tareas?.length || 0} tareas)</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-700">
                      Al confirmar, se creará el servicio y se asignarán las tareas de la plantilla seleccionada.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              {step > 1 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition"
                >
                  Atrás
                </button>
              )}
              <div className="flex-1" />
              {step < 3 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={step === 1 && (!form.titulo || !form.cliente_nombre)}
                  className="bg-blue-900 text-white rounded-xl px-6 py-2.5 text-sm hover:bg-blue-800 transition disabled:opacity-50 flex items-center gap-2 font-semibold"
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleCreate}
                  disabled={crearServicio.isPending || aplicarPlantilla.isPending}
                  className="bg-yellow-400 text-blue-900 rounded-xl px-6 py-2.5 text-sm hover:bg-yellow-500 transition disabled:opacity-50 flex items-center gap-2 font-bold"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {crearServicio.isPending ? "Creando..." : "Crear Servicio"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
