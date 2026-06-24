import { useState, useEffect, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth.js";
import { useAreas } from "@/api/queries/useAreas.js";
import { useUsuarios } from "@/api/queries/useUsuarios.js";
import { useCrearServicio, useCrearTarea } from "@/api/queries/useServicios.js";
import { usePlantillas, usePlantilla } from "@/api/queries/usePlantillas.js";
import { AudioRecorder } from "@/app/components/AudioRecorder.js";
import type { Usuario } from "@shared/index.js";
import {
  ArrowLeft, User, Monitor, Wrench, CheckSquare, Square, Camera,
  ChevronRight, ChevronLeft, Save, Plus, Trash2, ChevronUp, ChevronDown, Pencil, Mic,
} from "lucide-react";
import { toast } from "sonner";

const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50 transition";
const labelClass = "block text-xs text-gray-600 font-semibold mb-1";
const sectionTitleClass = "text-gray-800 font-bold text-sm flex items-center gap-2";

// --- Componentes extraídos ---

const InputField = memo(function InputField({
  label, value, onChange, placeholder, required, rows, error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  error?: string;
}) {
  return (
    <div>
      <label className={labelClass}>
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {rows ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} resize-none`}
          rows={rows}
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          placeholder={placeholder}
        />
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
});

const SelectField = memo(function SelectField({
  label, value, onChange, options, placeholder, required, error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className={labelClass}>
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        <option value="">{placeholder || "Seleccionar..."}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
});

const CheckboxToggle = memo(function CheckboxToggle({
  checked, onChange, label, description, icon, disabled,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange && !disabled && onChange(!checked)}
      className={`w-full flex items-start gap-3 p-3 rounded-xl border transition text-left ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      } ${
        checked
          ? "border-blue-200 bg-blue-50/60"
          : "border-gray-200 bg-white hover:bg-gray-50"
      }`}
    >
      <span className={`mt-0.5 flex-shrink-0 ${checked ? "text-blue-600" : "text-gray-300"} ${disabled ? "opacity-50" : ""}`}>
        {checked ? (
          <CheckSquare className="w-5 h-5" />
        ) : icon ? (
          icon
        ) : (
          <Square className="w-5 h-5" />
        )}
      </span>
      <div>
        <p className={`text-sm font-medium ${checked ? "text-blue-800" : "text-gray-700"}`}>
          {label}
          {disabled && <span className="ml-2 text-xs text-gray-400 font-normal">(bloqueado)</span>}
        </p>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
    </button>
  );
});

// --- Steps ---
const STEPS = [
  { id: 1, label: "Cliente", icon: User },
  { id: 2, label: "Equipo y accesorios", icon: Monitor },
  { id: 3, label: "Servicio", icon: Wrench },
];

export function NuevoServicioPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { data: areas } = useAreas();
  const { data: usuarios } = useUsuarios();
  const { data: plantillas } = usePlantillas();
  const crearServicio = useCrearServicio();
  const crearTarea = useCrearTarea();

  const isColaborador = currentUser?.rol === "colaborador";
  const puedeToggleEvidencia = currentUser?.rol === "admin" || currentUser?.rol === "sistema";

  // -- Form state --
  const [form, setForm] = useState({
    cliente_dni: "",
    cliente_apellido_paterno: "",
    cliente_apellido_materno: "",
    cliente_nombres: "",
    cliente_telefono: "",
    descripcion_equipo: "",
    serie_equipo: "",
    detalles_equipo: "",
    descripcion_accesorio: "",
    detalles_accesorio: "",
    titulo: "",
    codigo_servicio: "",
    area_id: "",
    cliente_reporte: "",
    diagnostico_inicial: "",
    servicio_audio_cliente: "",
    servicio_audio_diagnostico: "",
    descripcion: "",
    colaborador_id: "",
    id_plantilla_inicial: "",
  });

  const [guiarEntrada, setGuiarEntrada] = useState(false);
  const [permiteEvidencia, setPermiteEvidencia] = useState(() => {
    const stored = localStorage.getItem("default_permite_evidencia");
    return stored !== null ? stored === "true" : true;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paso, setPaso] = useState(1);

  // Resetear paso si se activa guía desde pasos avanzados
  const toggleGuiarEntrada = (v: boolean) => {
    setGuiarEntrada(v);
    if (v) setPaso(1);
  };

  const totalPasos = guiarEntrada ? 1 : 3; // guía activa: solo Servicio

  useEffect(() => {
    if (isColaborador && currentUser?.area_id) {
      setForm((p) => ({ ...p, area_id: String(currentUser.area_id) }));
    }
  }, [isColaborador, currentUser]);

  const set = (key: string, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: "" }));
  };

  const tecnicos = (usuarios || []).filter(
    (u: Usuario) => u.rol === "colaborador" && u.activo
  );

  const plantillasFiltradas = (plantillas || []).filter((p: any) =>
    !form.area_id || !p.area_id || p.area_id === Number(form.area_id)
  );

  const plantillaId = form.id_plantilla_inicial ? Number(form.id_plantilla_inicial) : 0;
  const { data: plantillaDetalle } = usePlantilla(plantillaId);
  const tareasPlantilla = plantillaDetalle?.tareas || [];

  // -- Tareas editables --
  interface TareaEditable { tempId: number; titulo: string; }
  const nextTempId = useRef(0);
  const [tareas, setTareas] = useState<TareaEditable[]>([]);
  const [editandoTarea, setEditandoTarea] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [nuevaTareaTexto, setNuevaTareaTexto] = useState("");

  // Sincronizar desde plantilla cuando cambia
  const lastPlantillaId = useRef<number | null>(null);
  useEffect(() => {
    const pid = plantillaId || 0;
    if (pid && pid !== lastPlantillaId.current && tareasPlantilla.length > 0) {
      setTareas(tareasPlantilla.map((t: any) => {
        const id = --nextTempId.current;
        return { tempId: id, titulo: t.plantillatarea_titulo || t.titulo };
      }));
      lastPlantillaId.current = pid;
    }
    if (!pid) {
      lastPlantillaId.current = null;
    }
  }, [plantillaDetalle]);

  // -- Validación por paso --
  const validarPaso = (step: number): boolean => {
    const errs: Record<string, string> = {};
    if (step === 1 && !guiarEntrada) {
      if (!form.cliente_dni.trim()) errs.cliente_dni = "Requerido";
      if (!form.cliente_apellido_paterno.trim()) errs.cliente_apellido_paterno = "Requerido";
      if (!form.cliente_nombres.trim()) errs.cliente_nombres = "Requerido";
      if (!form.cliente_telefono.trim()) errs.cliente_telefono = "Requerido";
    }
    if (step === 2 && !guiarEntrada) {
      if (!form.descripcion_equipo.trim()) errs.descripcion_equipo = "Requerido";
      if (!form.serie_equipo.trim()) errs.serie_equipo = "Requerido";
      if (!form.descripcion_accesorio.trim()) errs.descripcion_accesorio = "Requerido";
    }
    if (step === 3 || (step === 1 && guiarEntrada)) {
      if (!form.titulo.trim()) errs.titulo = "Requerido";
      if (!isColaborador && !form.colaborador_id) errs.colaborador_id = "Requerido";
      if (guiarEntrada && !form.cliente_dni.trim()) errs.cliente_dni = "Requerido";
      if (guiarEntrada && !form.codigo_servicio.trim()) errs.codigo_servicio = "Requerido";
      if (!isColaborador && !form.area_id) errs.area_id = "Requerido";
      if (!form.cliente_reporte.trim()) errs.cliente_reporte = "Requerido";
      if (!form.diagnostico_inicial.trim()) errs.diagnostico_inicial = "Requerido";
    }
    setErrors(errs);
    const ok = Object.keys(errs).length === 0;
    if (!ok) toast.error("Completá todos los campos requeridos");
    return ok;
  };

  const irAlSiguiente = () => {
    if (!validarPaso(paso)) return;
    const maxPaso = guiarEntrada ? 2 : 3;
    if (paso < maxPaso) setPaso((p) => p + 1);
  };

  const irAlAnterior = () => {
    if (paso > 1) setPaso((p) => p - 1);
  };

  const handleSubmit = async () => {
    if (!validarPaso(paso)) return;

    const payload: Record<string, unknown> = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      area_id: form.area_id ? Number(form.area_id) : null,
      colaborador_id: isColaborador
        ? (currentUser?.id ?? null)
        : (form.colaborador_id ? Number(form.colaborador_id) : null),
      id_plantilla_inicial: form.id_plantilla_inicial ? Number(form.id_plantilla_inicial) : null,
      cliente_dni: form.cliente_dni.trim(),
      cliente_apellido_paterno: form.cliente_apellido_paterno.trim() || null,
      cliente_apellido_materno: form.cliente_apellido_materno.trim() || null,
      cliente_nombres: form.cliente_nombres.trim() || null,
      cliente_telefono: form.cliente_telefono.trim() || null,
      descripcion_equipo: form.descripcion_equipo.trim() || null,
      serie_equipo: form.serie_equipo.trim() || null,
      detalles_equipo: form.detalles_equipo.trim() || null,
      descripcion_accesorio: form.descripcion_accesorio.trim() || null,
      detalles_accesorio: form.detalles_accesorio.trim() || null,
      cliente_reporte: form.cliente_reporte.trim() || null,
      diagnostico_inicial: form.diagnostico_inicial.trim() || null,
      servicio_audio_cliente: form.servicio_audio_cliente || null,
      servicio_audio_diagnostico: form.servicio_audio_diagnostico || null,
      codigo: form.codigo_servicio.trim() || undefined,
      permite_evidencia: permiteEvidencia,
    };

    try {
      const res = await crearServicio.mutateAsync(payload);
      const servicioId = res.data.data.id;

      // Crear tareas personalizadas si hay
      if (tareas.length > 0) {
        for (const t of tareas) {
          await crearTarea.mutateAsync({ servicioId, data: { titulo: t.titulo } });
        }
      }

      toast.success("Servicio creado con " + tareas.length + " tareas");
      navigate(`/servicios/${servicioId}`);
    } catch (err: any) {
      const serverErrors = err?.response?.data?.errors;
      if (serverErrors?.length) {
        const fieldErrors: Record<string, string> = {};
        for (const e of serverErrors) fieldErrors[e.field] = e.message;
        setErrors(fieldErrors);
      } else if (err?.response?.data?.detail) {
        toast.error(err.response.data.detail);
      } else {
        toast.error("Error al crear el servicio");
      }
    }
  };

  // -- Mapear paso visible --
  function pasoVisible(): number {
    if (guiarEntrada && paso === 2) return 3; // skip paso 2
    return paso;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/servicios")}
          className="p-2 rounded-lg hover:bg-gray-100 transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-gray-900 font-bold text-lg">Nuevo Servicio Técnico</h1>
          {totalPasos > 1 ? (
            <p className="text-gray-500 text-xs">Paso {paso} de {totalPasos}</p>
          ) : (
            <p className="text-gray-500 text-xs">Guía de entrada rápida</p>
          )}
        </div>
      </div>

      {/* ═══ OPCIONES ═══ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5 space-y-3">
        <CheckboxToggle
          checked={guiarEntrada}
          onChange={toggleGuiarEntrada}
          label="Continuar guía de entrada"
          description="Al activar esta opción se ocultan los campos de Equipo y Accesorios, y se muestra la lista de tareas de la plantilla seleccionada."
        />
        <CheckboxToggle
          checked={permiteEvidencia}
          onChange={puedeToggleEvidencia ? setPermiteEvidencia : undefined}
          disabled={!puedeToggleEvidencia}
          label="Mostrar evidencias del servicio"
          description={
            puedeToggleEvidencia
              ? "Muestra las evidencias (fotos/videos) en la vista de detalle del servicio."
              : "Solo administradores pueden desactivar esta opción."
          }
          icon={<Camera className="w-5 h-5 text-gray-300" />}
        />
      </div>

      {/* ═══ INDICADOR DE PASOS ═══ */}
      {!guiarEntrada && (
        <div className="flex items-center justify-center gap-0">
          {STEPS.map((step, idx) => {
            const StepIcon = step.icon;
            const activo = paso === step.id;
            const completado = paso > step.id;
            return (
              <div key={step.id} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      activo
                        ? "bg-blue-900 text-white shadow-md"
                        : completado
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {completado ? <CheckSquare className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                  </div>
                  <span className={`text-xs font-medium hidden sm:inline ${
                    activo ? "text-blue-900" : completado ? "text-green-700" : "text-gray-400"
                  }`}>
                    {step.label}
                  </span>
                </div>
                {idx < 2 && (
                  <div className={`w-8 sm:w-12 h-px mx-2 ${
                    completado ? "bg-green-300" : "bg-gray-200"
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ FORMULARIO POR PASO ═══ */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (paso === totalPasos) handleSubmit();
          else irAlSiguiente();
        }}
      >
        {/* ═══ ERROR BANNER ═══ */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm font-medium text-red-700">
              Completá todos los campos requeridos ({Object.keys(errors).length} pendiente{Object.keys(errors).length !== 1 ? "s" : ""})
            </p>
          </div>
        )}
        {/* ─── PASO 1: CLIENTE (solo si guía INACTIVA) ─── */}
        {paso === 1 && !guiarEntrada && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5 space-y-3 md:space-y-4">
            <h2 className={sectionTitleClass}>
              <User className="w-4 h-4 text-blue-600" />
              Cliente
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="DNI"
                value={form.cliente_dni}
                onChange={(v) => set("cliente_dni", v.replace(/\D/g, ""))}
                placeholder="12345678"
                required
                error={errors.cliente_dni}
              />
              <InputField
                label="Teléfono"
                value={form.cliente_telefono}
                onChange={(v) => set("cliente_telefono", v.replace(/\D/g, ""))}
                placeholder="999888777"
                required
                error={errors.cliente_telefono}
              />
              <InputField
                label="Apellido Paterno"
                value={form.cliente_apellido_paterno}
                onChange={(v) => set("cliente_apellido_paterno", v)}
                required
                error={errors.cliente_apellido_paterno}
              />
              <InputField
                label="Apellido Materno"
                value={form.cliente_apellido_materno}
                onChange={(v) => set("cliente_apellido_materno", v)}
              />
              <div className="sm:col-span-2">
                <InputField
                  label="Nombres"
                  value={form.cliente_nombres}
                  onChange={(v) => set("cliente_nombres", v)}
                  required
                  error={errors.cliente_nombres}
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── PASO 2: EQUIPO Y ACCESORIOS (solo si guía INACTIVA) ─── */}
        {paso === 2 && !guiarEntrada && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5 space-y-3 md:space-y-4">
            <h2 className={sectionTitleClass}>
              <Monitor className="w-4 h-4 text-blue-600" />
              Equipo y accesorios
            </h2>

            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Equipo</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <InputField
                    label="Descripción"
                    value={form.descripcion_equipo}
                    onChange={(v) => set("descripcion_equipo", v)}
                    placeholder="Ej: Laptop HP Pavilion, Router TP-Link..."
                    required
                    error={errors.descripcion_equipo}
                  />
                </div>
                <InputField
                  label="N° de Serie"
                  value={form.serie_equipo}
                  onChange={(v) => set("serie_equipo", v)}
                  placeholder="SN-12345-ABC"
                  required
                  error={errors.serie_equipo}
                />
                <div className="sm:col-span-3">
                  <InputField
                    label="Detalles"
                    value={form.detalles_equipo}
                    onChange={(v) => set("detalles_equipo", v)}
                    rows={2}
                    placeholder="Color, marca, modelo, estado físico..."
                  />
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Accesorios</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="Descripción"
                  value={form.descripcion_accesorio}
                  onChange={(v) => set("descripcion_accesorio", v)}
                  placeholder="Ej: Cargador, mouse, cable HDMI..."
                  required
                  error={errors.descripcion_accesorio}
                />
                <InputField
                  label="Detalles"
                  value={form.detalles_accesorio}
                  onChange={(v) => set("detalles_accesorio", v)}
                  rows={2}
                  placeholder="Cantidad, estado, observaciones..."
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── PASO 3 (o único si guía activa): SERVICIO ─── */}
        {paso === 3 || (paso === 1 && guiarEntrada) ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5 space-y-3 md:space-y-4">
            <h2 className={sectionTitleClass}>
              <Wrench className="w-4 h-4 text-blue-600" />
              Servicio
            </h2>
            <div className="space-y-4">
              <InputField
                label="Nombre del Servicio"
                value={form.titulo}
                onChange={(v) => set("titulo", v)}
                required
                error={errors.titulo}
                placeholder="Ej: Reparación de pantalla, Instalación de software..."
              />

              {/* Código y DNI en guía de entrada */}
              {guiarEntrada && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField
                    label="Código de servicio"
                    value={form.codigo_servicio}
                    onChange={(v) => set("codigo_servicio", v.toUpperCase())}
                    placeholder="SRV20260617120000"
                    required
                    error={errors.codigo_servicio}
                  />
                  <InputField
                    label="DNI Cliente"
                    value={form.cliente_dni}
                    onChange={(v) => set("cliente_dni", v.replace(/\D/g, ""))}
                    placeholder="12345678"
                    required
                    error={errors.cliente_dni}
                  />
                </div>
              )}

              {!isColaborador && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SelectField
                    label="Área"
                    value={form.area_id}
                    onChange={(v) => set("area_id", v)}
                    options={(areas || []).map((a: any) => ({
                      value: String(a.id),
                      label: a.nombre,
                    }))}
                    placeholder="Sin área"
                    required
                    error={errors.area_id}
                  />
                  <SelectField
                    label="Técnico"
                    value={form.colaborador_id}
                    onChange={(v) => set("colaborador_id", v)}
                    options={tecnicos.map((t: Usuario) => ({
                      value: String(t.id),
                      label: `${t.nombres} ${t.apellidos || ""}`.trim(),
                    }))}
                    placeholder="Seleccionar técnico..."
                    required
                  />
                  {errors.colaborador_id && (
                    <p className="text-xs text-red-500 mt-1">{errors.colaborador_id}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <InputField
                    label="Situación Inicial del Cliente"
                    value={form.cliente_reporte}
                    onChange={(v) => set("cliente_reporte", v)}
                    rows={2}
                    placeholder="¿Qué reportó el cliente?"
                    required
                    error={errors.cliente_reporte}
                  />
                  <AudioRecorder
                    label="Audio del reporte"
                    existingUrl={form.servicio_audio_cliente || null}
                    onAudioUploaded={(url) => set("servicio_audio_cliente", url)}
                    onAudioRemoved={() => set("servicio_audio_cliente", "")}
                  />
                </div>
                <div className="space-y-2">
                  <InputField
                    label="Diagnóstico Inicial"
                    value={form.diagnostico_inicial}
                    onChange={(v) => set("diagnostico_inicial", v)}
                    rows={2}
                    placeholder="Primera impresión técnica"
                    required
                    error={errors.diagnostico_inicial}
                  />
                  <AudioRecorder
                    label="Audio del diagnóstico"
                    existingUrl={form.servicio_audio_diagnostico || null}
                    onAudioUploaded={(url) => set("servicio_audio_diagnostico", url)}
                    onAudioRemoved={() => set("servicio_audio_diagnostico", "")}
                  />
                </div>
              </div>

              <InputField
                label="Descripción del Servicio"
                value={form.descripcion}
                onChange={(v) => set("descripcion", v)}
                rows={3}
                placeholder="Detalles adicionales del trabajo a realizar..."
              />

              <SelectField
                label="Plantilla de Tareas"
                value={form.id_plantilla_inicial}
                onChange={(v) => set("id_plantilla_inicial", v)}
                options={plantillasFiltradas.map((p: any) => ({
                  value: String(p.id),
                  label: `${p.nombre} (${p.tareas_count || 0} tareas)`,
                }))}
                placeholder="Sin plantilla"
              />

              {/* Lista de tareas editables */}
              {(guiarEntrada || form.id_plantilla_inicial || tareas.length > 0) && (
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center justify-between">
                    <span>Tareas del servicio</span>
                    <span className="text-gray-400 font-normal text-[10px]">{tareas.length} tareas</span>
                  </p>

                  {tareas.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Agregá tareas para este servicio</p>
                  ) : (
                    <div className="space-y-1.5">
                      {tareas.map((t, idx) => (
                        <div
                          key={t.tempId}
                          className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 px-2 py-2 text-sm group"
                        >
                          {/* Reorder arrows (before order number) */}
                          <div className="flex flex-col items-center gap-0.5 mr-0.5">
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setTareas((prev) => {
                                    const arr = [...prev];
                                    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                                    return arr;
                                  })
                                }
                                className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 leading-none"
                                title="Subir"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                            )}
                            {idx < tareas.length - 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setTareas((prev) => {
                                    const arr = [...prev];
                                    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                                    return arr;
                                  })
                                }
                                className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 leading-none"
                                title="Bajar"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </span>

                          {editandoTarea === t.tempId ? (
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  setTareas((prev) =>
                                    prev.map((x) =>
                                      x.tempId === t.tempId ? { ...x, titulo: editText.trim() || x.titulo } : x
                                    )
                                  );
                                  setEditandoTarea(null);
                                }
                                if (e.key === "Escape") setEditandoTarea(null);
                              }}
                              onBlur={() => {
                                setTareas((prev) =>
                                  prev.map((x) =>
                                    x.tempId === t.tempId ? { ...x, titulo: editText.trim() || x.titulo } : x
                                  )
                                );
                                setEditandoTarea(null);
                              }}
                              className="flex-1 border border-blue-300 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                              ref={(el) => {
                                if (el && editandoTarea === t.tempId)
                                  setTimeout(() => el.focus({ preventScroll: true }), 0);
                              }}
                            />
                          ) : (
                            <span
                              className="flex-1 text-gray-700 cursor-pointer hover:text-blue-700 transition"
                              onClick={() => {
                                setEditText(t.titulo);
                                setEditandoTarea(t.tempId);
                              }}
                            >
                              {t.titulo}
                            </span>
                          )}

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              type="button"
                              onClick={() => {
                                setEditText(t.titulo);
                                setEditandoTarea(t.tempId);
                              }}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setTareas((prev) => prev.filter((x) => x.tempId !== t.tempId))
                              }
                              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Barra agregar tarea */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nuevaTareaTexto}
                      onChange={(e) => setNuevaTareaTexto(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const txt = nuevaTareaTexto.trim();
                          if (txt) {
                            setTareas((prev) => [...prev, { tempId: --nextTempId.current, titulo: txt }]);
                            setNuevaTareaTexto("");
                          }
                        }
                      }}
                      placeholder="Escribí una tarea nueva..."
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const txt = nuevaTareaTexto.trim();
                        if (txt) {
                          setTareas((prev) => [...prev, { tempId: --nextTempId.current, titulo: txt }]);
                          setNuevaTareaTexto("");
                        }
                      }}
                      disabled={!nuevaTareaTexto.trim()}
                      className="flex items-center gap-1.5 px-3 py-2 bg-blue-900 hover:bg-blue-800 disabled:bg-gray-300 text-white rounded-lg text-sm font-semibold transition"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* ═══ NAVEGACIÓN ═══ */}
        <div className="flex items-center justify-between gap-3 pt-4 pb-8">
          <button
            type="button"
            onClick={paso > 1 ? irAlAnterior : () => navigate("/servicios")}
            className="flex items-center gap-1.5 px-5 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            {paso > 1 ? "Anterior" : "Cancelar"}
          </button>

          {paso < totalPasos ? (
            <button
              type="submit"
              className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={crearServicio.isPending}
              className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {crearServicio.isPending ? "Guardando..." : "Crear Servicio"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
