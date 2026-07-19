import { useState, useEffect, useRef, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth.js";
import { useAreas } from "@/api/queries/useAreas.js";
import { useUsuarios } from "@/api/queries/useUsuarios.js";
import { useCrearServicio, useCrearTarea } from "@/api/queries/useServicios.js";
import { usePlantillas, usePlantilla } from "@/api/queries/usePlantillas.js";
import { useFallasComunes } from "@/api/queries/useTiposServicio.js";
import { AudioRecorder } from "@/app/components/AudioRecorder.js";
import type { Usuario } from "@shared/index.js";
import {
  ArrowLeft, User, Monitor, Wrench, CheckSquare, Square,
  Save, Plus, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Pencil, Mic, AlertTriangle, FileText,
} from "lucide-react";
import { toast } from "sonner";

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";
const sectionTitleClass = "flex items-center gap-2 text-sm font-bold text-slate-900";

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
          : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <span className={`mt-0.5 flex-shrink-0 ${checked ? "text-blue-600" : "text-slate-300"} ${disabled ? "opacity-50" : ""}`}>
        {checked ? (
          <CheckSquare className="w-5 h-5" />
        ) : icon ? (
          icon
        ) : (
          <Square className="w-5 h-5" />
        )}
      </span>
      <div>
        <p className={`text-sm font-medium ${checked ? "text-blue-800" : "text-slate-700"}`}>
          {label}
          {disabled && <span className="ml-2 text-xs text-slate-400 font-normal">(bloqueado)</span>}
        </p>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        )}
      </div>
    </button>
  );
});

// ═══════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════

export function NuevoServicioPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { data: areas } = useAreas();
  const { data: usuarios } = useUsuarios();
  const { data: plantillas } = usePlantillas();
  const crearServicio = useCrearServicio();
  const crearTarea = useCrearTarea();

  const autoAsignar = currentUser?.rol === "colaborador" || currentUser?.rol === "encargado";

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

  const toggleGuiarEntrada = (v: boolean) => {
    setGuiarEntrada(v);
    if (v) setPaso(3);
    else setPaso(1);
  };

  useEffect(() => {
    if (autoAsignar && currentUser?.area_id) {
      setForm((p) => ({ ...p, area_id: String(currentUser.area_id) }));
    }
  }, [autoAsignar, currentUser]);

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

  // Fallas comunes
  const { data: fallas } = useFallasComunes();
  const fallasAgrupadas = useMemo(() => {
    if (!fallas?.length) return [];
    const map = new Map<string, { value: string; label: string }[]>();
    for (const f of fallas) {
      const grupo = f.tipos_servicio?.nombre || "Sin tipo";
      if (!map.has(grupo)) map.set(grupo, []);
      map.get(grupo)!.push({ value: String(f.id), label: f.nombre });
    }
    return Array.from(map.entries());
  }, [fallas]);

  const tiposFalla = useMemo(() => {
    if (!fallas?.length) return [];
    const set = new Set<string>();
    for (const f of fallas) {
      if (f.tipos_servicio?.nombre) set.add(f.tipos_servicio.nombre);
    }
    return Array.from(set).sort();
  }, [fallas]);

  const [tipoFallaFiltro, setTipoFallaFiltro] = useState("");
  const [fallasSeleccionadas, setFallasSeleccionadas] = useState<Set<number>>(new Set());

  const fallasFiltradas = useMemo(() => {
    if (!fallas?.length) return [];
    return fallas.filter((f) => {
      if (tipoFallaFiltro && f.tipos_servicio?.nombre !== tipoFallaFiltro) return false;
      return true;
    });
  }, [fallas, tipoFallaFiltro]);

  const toggleFalla = (fallaId: number, nombre: string) => {
    const yaSeleccionada = fallasSeleccionadas.has(fallaId);
    setFallasSeleccionadas((prev) => {
      const next = new Set(prev);
      if (yaSeleccionada) next.delete(fallaId);
      else next.add(fallaId);
      return next;
    });
    setForm((p) => {
      const current = p.diagnostico_inicial.trim();
      if (yaSeleccionada) {
        const lines = current.split("\n").filter((l) => l.trim() !== `- ${nombre}`);
        return { ...p, diagnostico_inicial: lines.join("\n") };
      } else {
        const texto = `- ${nombre}`;
        return { ...p, diagnostico_inicial: current ? `${current}\n${texto}` : texto };
      }
    });
  };

  // -- Tareas editables --
  interface TareaEditable { tempId: number; titulo: string; obligatoria?: boolean; }
  const nextTempId = useRef(0);
  const [tareas, setTareas] = useState<TareaEditable[]>([]);
  const [editandoTarea, setEditandoTarea] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [nuevaTareaTexto, setNuevaTareaTexto] = useState("");

  const lastPlantillaId = useRef<number | null>(null);
  useEffect(() => {
    const pid = plantillaId || 0;
    if (pid && pid !== lastPlantillaId.current && tareasPlantilla.length > 0) {
      setTareas(tareasPlantilla.map((t: any) => {
        const id = --nextTempId.current;
        return { tempId: id, titulo: t.plantillatarea_titulo || t.titulo, obligatoria: t.obligatoria ?? false };
      }));
      lastPlantillaId.current = pid;
    }
    if (!pid) {
      lastPlantillaId.current = null;
    }
  }, [plantillaDetalle]);

  // -- Validación --
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
      if (!autoAsignar && !form.colaborador_id) errs.colaborador_id = "Requerido";
      if (guiarEntrada && !form.cliente_dni.trim()) errs.cliente_dni = "Requerido";
      if (guiarEntrada && !form.codigo_servicio.trim()) errs.codigo_servicio = "Requerido";
      if (!autoAsignar && !form.area_id) errs.area_id = "Requerido";
      if (!form.cliente_reporte.trim() && !form.servicio_audio_cliente) errs.cliente_reporte = "Requerido";
      if (!form.diagnostico_inicial.trim() && !form.servicio_audio_diagnostico) errs.diagnostico_inicial = "Requerido";
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

  const validarFormularioGuiado = (): boolean => {
    // Para modo guía, validamos todos los campos visibles
    const errs: Record<string, string> = {};
    if (!form.titulo.trim()) errs.titulo = "Requerido";
    if (guiarEntrada && !form.cliente_dni.trim()) errs.cliente_dni = "Requerido";
    if (guiarEntrada && !form.codigo_servicio.trim()) errs.codigo_servicio = "Requerido";
    if (!autoAsignar && !form.colaborador_id) errs.colaborador_id = "Requerido";
    if (!autoAsignar && !form.area_id) errs.area_id = "Requerido";
    if (!form.cliente_reporte.trim() && !form.servicio_audio_cliente) errs.cliente_reporte = "Requerido";
    if (!form.diagnostico_inicial.trim() && !form.servicio_audio_diagnostico) errs.diagnostico_inicial = "Requerido";
    setErrors(errs);
    const ok = Object.keys(errs).length === 0;
    if (!ok) toast.error("Completá todos los campos requeridos");
    return ok;
  };

  const handleSubmit = async () => {
    if (guiarEntrada) {
      if (!validarFormularioGuiado()) return;
    } else {
      if (!validarPaso(paso)) return;
    }

    const payload: Record<string, unknown> = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      area_id: form.area_id ? Number(form.area_id) : null,
      colaborador_id: autoAsignar
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

  // -- Modo pasos (sin guía) --
  const STEP_CONFIG = [
    { id: 1, label: "Cliente", icon: User },
    { id: 2, label: "Equipo y accesorios", icon: Monitor },
    { id: 3, label: "Servicio", icon: Wrench },
  ];

  const renderPaso1 = () => (
    <div className="space-y-4">
      <InputField label="DNI Cliente" value={form.cliente_dni} onChange={(v) => set("cliente_dni", v.replace(/\D/g, ""))} required error={errors.cliente_dni} placeholder="12345678" />
      <InputField label="Apellido Paterno" value={form.cliente_apellido_paterno} onChange={(v) => set("cliente_apellido_paterno", v)} required error={errors.cliente_apellido_paterno} placeholder="García" />
      <InputField label="Apellido Materno" value={form.cliente_apellido_materno} onChange={(v) => set("cliente_apellido_materno", v)} placeholder="Mendoza" />
      <InputField label="Nombres" value={form.cliente_nombres} onChange={(v) => set("cliente_nombres", v)} required error={errors.cliente_nombres} placeholder="Carlos" />
      <InputField label="Teléfono" value={form.cliente_telefono} onChange={(v) => set("cliente_telefono", v.replace(/\D/g, ""))} required error={errors.cliente_telefono} placeholder="987654321" />
    </div>
  );

  const renderPaso2 = () => (
    <div className="space-y-4">
      <InputField label="Equipo" value={form.descripcion_equipo} onChange={(v) => set("descripcion_equipo", v)} required error={errors.descripcion_equipo} placeholder="Ej: Laptop HP Pavilion" />
      <InputField label="N° de Serie" value={form.serie_equipo} onChange={(v) => set("serie_equipo", v)} required error={errors.serie_equipo} placeholder="SN-12345" />
      <InputField label="Detalles del Equipo" value={form.detalles_equipo} onChange={(v) => set("detalles_equipo", v)} rows={2} placeholder="Marca, modelo, especificaciones..." />
      <hr className="border-slate-100" />
      <InputField label="Accesorios" value={form.descripcion_accesorio} onChange={(v) => set("descripcion_accesorio", v)} required error={errors.descripcion_accesorio} placeholder="Cargador, cable HDMI, mouse..." />
      <InputField label="Detalles de Accesorios" value={form.detalles_accesorio} onChange={(v) => set("detalles_accesorio", v)} rows={2} placeholder="Estado, cantidad, marcas..." />
    </div>
  );

  const renderPaso3 = () => (
    <div className="space-y-4">
      <InputField label="Nombre del Servicio" value={form.titulo} onChange={(v) => set("titulo", v)} required error={errors.titulo} placeholder="Ej: Reparación de pantalla, Instalación de software..." />
      {!autoAsignar && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label="Área" value={form.area_id} onChange={(v) => set("area_id", v)} options={(areas || []).map((a: any) => ({ value: String(a.id), label: a.nombre }))} placeholder="Sin área" required error={errors.area_id} />
          <SelectField label="Técnico" value={form.colaborador_id} onChange={(v) => set("colaborador_id", v)} options={tecnicos.map((t: Usuario) => ({ value: String(t.id), label: `${t.nombres} ${t.apellidos || ""}`.trim() }))} placeholder="Seleccionar técnico..." required />
        </div>
      )}
      <hr className="border-slate-100" />
      <div>
        <label className={labelClass}>Situación Inicial {!form.servicio_audio_cliente && <span className="text-red-400">*</span>}</label>
        <div className="flex items-start gap-2">
          <textarea value={form.cliente_reporte} onChange={(e) => set("cliente_reporte", e.target.value)} className={`${inputClass} resize-none flex-1`} rows={2} placeholder="¿Qué reportó el cliente?" />
          <AudioRecorder label="Audio" existingUrl={form.servicio_audio_cliente || null} onAudioUploaded={(url) => set("servicio_audio_cliente", url)} onAudioRemoved={() => set("servicio_audio_cliente", "")} className="flex-shrink-0" />
        </div>
        {errors.cliente_reporte && <p className="text-xs text-red-500 mt-1">{errors.cliente_reporte}</p>}
      </div>
      <div>
        <label className={labelClass}>Diagnóstico Inicial {!form.servicio_audio_diagnostico && <span className="text-red-400">*</span>}</label>
        <div className="flex items-start gap-2">
          <textarea value={form.diagnostico_inicial} onChange={(e) => set("diagnostico_inicial", e.target.value)} className={`${inputClass} resize-none flex-1`} rows={2} placeholder="Primera impresión técnica" />
          <AudioRecorder label="Audio" existingUrl={form.servicio_audio_diagnostico || null} onAudioUploaded={(url) => set("servicio_audio_diagnostico", url)} onAudioRemoved={() => set("servicio_audio_diagnostico", "")} className="flex-shrink-0" />
        </div>
        {errors.diagnostico_inicial && <p className="text-xs text-red-500 mt-1">{errors.diagnostico_inicial}</p>}
      </div>
      <hr className="border-slate-100" />
      <InputField label="Descripción del Servicio" value={form.descripcion} onChange={(v) => set("descripcion", v)} rows={2} placeholder="Detalles adicionales del trabajo a realizar..." />
      {fallas && fallas.length > 0 && (
        <div>
          <p className={labelClass}>Incluir fallas comunes</p>
          <div className="mt-2 space-y-3">
            <select value={tipoFallaFiltro} onChange={(e) => setTipoFallaFiltro(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
              <option value="">Seleccioná un tipo de falla</option>
              {tiposFalla.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {tipoFallaFiltro && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                {fallasFiltradas.map((f) => (
                  <label key={f.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                    <input type="checkbox" checked={fallasSeleccionadas.has(f.id)} onChange={() => toggleFalla(f.id, f.nombre)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-slate-700">{f.nombre}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <PlantillaYSeccion3 form={form} set={set} plantillasFiltradas={plantillasFiltradas} guiarEntrada={guiarEntrada} tareas={tareas} setTareas={setTareas} editandoTarea={editandoTarea} setEditandoTarea={setEditandoTarea} editText={editText} setEditText={setEditText} nuevaTareaTexto={nuevaTareaTexto} setNuevaTareaTexto={setNuevaTareaTexto} nextTempId={nextTempId} errors={errors} />
    </div>
  );

  // ── Render ──
  return (
    <div className="mx-auto max-w-full space-y-6 px-6 pb-28 pt-6">
      {/* ═══ HEADER ═══ */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-5 text-white shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            {!guiarEntrada && (
              <button onClick={() => paso > 1 ? irAlAnterior() : navigate("/servicios")} className="rounded-xl border border-white/20 p-2 text-white transition hover:bg-white/10">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <h1 className="text-lg font-bold text-white">Nuevo servicio técnico</h1>
              <p className="text-sm text-blue-200">Registrá el ingreso, diagnóstico y tareas iniciales del servicio.</p>
            </div>
          </div>
          {!guiarEntrada && (
            <div className="sm:ml-auto">
              <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-blue-100">
                Paso {paso} de 3
              </span>
            </div>
          )}
        </div>
        <div className="mt-4">
          <CheckboxToggle checked={guiarEntrada} onChange={toggleGuiarEntrada} label="Seguir guía de entrada" />
        </div>
      </div>

      {/* ═══ FORMULARIO ═══ */}
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-5">
        {Object.keys(errors).length > 0 && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-medium text-red-700">
              Completá todos los campos requeridos ({Object.keys(errors).length} pendiente{Object.keys(errors).length !== 1 ? "s" : ""})
            </p>
          </div>
        )}

        {guiarEntrada ? (
          /* ══════ MODO GUÍA: 3 SECCIONES PLANAS ══════ */
          <>
            {/* SECCIÓN 1 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className={sectionTitleClass}><Wrench className="w-4 h-4 text-blue-600" /> Servicio y situación inicial del servicio</h2>
              <div className="mt-4 space-y-4">
                <InputField label="Nombre del Servicio" value={form.titulo} onChange={(v) => set("titulo", v)} required error={errors.titulo} placeholder="Ej: Reparación de pantalla, Instalación de software..." />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="Código de servicio" value={form.codigo_servicio} onChange={(v) => set("codigo_servicio", v.toUpperCase())} placeholder="SRV20260617120000" required error={errors.codigo_servicio} />
                  <InputField label="DNI Cliente" value={form.cliente_dni} onChange={(v) => set("cliente_dni", v.replace(/\D/g, ""))} placeholder="12345678" required error={errors.cliente_dni} />
                </div>
                {!autoAsignar && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SelectField label="Área" value={form.area_id} onChange={(v) => set("area_id", v)} options={(areas || []).map((a: any) => ({ value: String(a.id), label: a.nombre }))} placeholder="Sin área" required error={errors.area_id} />
                    <SelectField label="Técnico" value={form.colaborador_id} onChange={(v) => set("colaborador_id", v)} options={tecnicos.map((t: Usuario) => ({ value: String(t.id), label: `${t.nombres} ${t.apellidos || ""}`.trim() }))} placeholder="Seleccionar técnico..." required />
                  </div>
                )}
                <hr className="border-slate-100" />
                <div>
                  <label className={labelClass}>Situación Inicial del Servicio {!form.servicio_audio_cliente && <span className="text-red-400">*</span>}</label>
                  <div className="flex items-start gap-2">
                    <textarea value={form.cliente_reporte} onChange={(e) => set("cliente_reporte", e.target.value)} className={`${inputClass} resize-none flex-1`} rows={2} placeholder="¿Qué reportó el cliente?" />
                    <AudioRecorder label="Audio" existingUrl={form.servicio_audio_cliente || null} onAudioUploaded={(url) => set("servicio_audio_cliente", url)} onAudioRemoved={() => set("servicio_audio_cliente", "")} className="flex-shrink-0" />
                  </div>
                  {errors.cliente_reporte && <p className="text-xs text-red-500 mt-1">{errors.cliente_reporte}</p>}
                </div>
                <div>
                  <label className={labelClass}>Diagnóstico Inicial {!form.servicio_audio_diagnostico && <span className="text-red-400">*</span>}</label>
                  <div className="flex items-start gap-2">
                    <textarea value={form.diagnostico_inicial} onChange={(e) => set("diagnostico_inicial", e.target.value)} className={`${inputClass} resize-none flex-1`} rows={2} placeholder="Primera impresión técnica" />
                    <AudioRecorder label="Audio" existingUrl={form.servicio_audio_diagnostico || null} onAudioUploaded={(url) => set("servicio_audio_diagnostico", url)} onAudioRemoved={() => set("servicio_audio_diagnostico", "")} className="flex-shrink-0" />
                  </div>
                  {errors.diagnostico_inicial && <p className="text-xs text-red-500 mt-1">{errors.diagnostico_inicial}</p>}
                </div>
              </div>
            </div>

            {/* SECCIÓN 2 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className={sectionTitleClass}><AlertTriangle className="w-4 h-4 text-amber-500" /> Descripción del servicio con incluir fallas comunes</h2>
              <div className="mt-4 space-y-4">
                <InputField label="Descripción del Servicio" value={form.descripcion} onChange={(v) => set("descripcion", v)} rows={2} placeholder="Detalles adicionales del trabajo a realizar..." />
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                    <div>
                      <p className="font-medium text-amber-800">Redacción para el cliente</p>
                      <p className="text-amber-700 mt-0.5 leading-relaxed text-xs">Evitá tecnicismos. Esta descripción la verá el cliente al dar seguimiento a su servicio.</p>
                    </div>
                  </div>
                </div>
                {fallas && fallas.length > 0 && (
                  <div>
                    <p className={labelClass}>Incluir fallas comunes</p>
                    <div className="mt-2 space-y-3">
                      <select value={tipoFallaFiltro} onChange={(e) => setTipoFallaFiltro(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                        <option value="">Seleccioná un tipo de falla</option>
                        {tiposFalla.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      {tipoFallaFiltro && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                          {fallasFiltradas.map((f) => (
                            <label key={f.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                              <input type="checkbox" checked={fallasSeleccionadas.has(f.id)} onChange={() => toggleFalla(f.id, f.nombre)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                              <span className="text-sm text-slate-700">{f.nombre}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SECCIÓN 3 */}
            <PlantillaYSeccion3 form={form} set={set} plantillasFiltradas={plantillasFiltradas} guiarEntrada={guiarEntrada} tareas={tareas} setTareas={setTareas} editandoTarea={editandoTarea} setEditandoTarea={setEditandoTarea} editText={editText} setEditText={setEditText} nuevaTareaTexto={nuevaTareaTexto} setNuevaTareaTexto={setNuevaTareaTexto} nextTempId={nextTempId} errors={errors} />

            <div className="flex justify-end">
              <button type="submit" disabled={crearServicio.isPending} className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-6 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-50 shadow-sm">
                <Save className="w-4 h-4" /> {crearServicio.isPending ? "Guardando..." : "Crear Servicio"}
              </button>
            </div>
          </>
        ) : (
          /* ══════ MODO PASOS ══════ */
          <>
            {paso === 1 && renderPaso1()}
            {paso === 2 && renderPaso2()}
            {paso === 3 && renderPaso3()}

            {/* Navegación sin botón cancelar */}
            <div className="flex justify-between pt-2">
              <div>
                {paso > 1 && (
                  <button type="button" onClick={irAlAnterior} className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition">
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </button>
                )}
              </div>
              {paso < 3 ? (
                <button type="button" onClick={irAlSiguiente} className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-6 py-3 rounded-xl text-sm font-semibold transition shadow-sm">
                  Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button type="submit" disabled={crearServicio.isPending} className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-6 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-50 shadow-sm">
                  <Save className="w-4 h-4" /> {crearServicio.isPending ? "Guardando..." : "Crear Servicio"}
                </button>
              )}
            </div>
          </>
        )}
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// COMPONENTE SECCIÓN 3 (compartido entre ambos modos)
// ═══════════════════════════════════════════════════════

const PlantillaYSeccion3 = memo(function PlantillaYSeccion3({
  form, set, plantillasFiltradas, guiarEntrada, tareas, setTareas,
  editandoTarea, setEditandoTarea, editText, setEditText,
  nuevaTareaTexto, setNuevaTareaTexto, nextTempId, errors,
}: {
  form: any; set: (k: string, v: string) => void; plantillasFiltradas: any[];
  guiarEntrada: boolean; tareas: any[]; setTareas: (f: any) => void;
  editandoTarea: number | null; setEditandoTarea: (v: number | null) => void;
  editText: string; setEditText: (v: string) => void;
  nuevaTareaTexto: string; setNuevaTareaTexto: (v: string) => void;
  nextTempId: React.MutableRefObject<number>; errors: Record<string, string>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <FileText className="w-4 h-4 text-blue-600" /> Plantillas de tareas con tareas del servicio
      </h2>
      <div className="mt-4 space-y-4">
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
        {(guiarEntrada || form.id_plantilla_inicial || tareas.length > 0) && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center justify-between">
              <span>Tareas del servicio</span>
              <span className="text-slate-400 font-normal text-[10px]">{tareas.length} tareas</span>
            </p>
            <div className="mt-3 space-y-2">
              {tareas.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Agregá tareas para este servicio</p>
              ) : (
                <div className="space-y-1">
                  {tareas.map((t, idx) => (
                    <div key={t.tempId} className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 px-2 py-1.5 text-sm group">
                      <div className="flex flex-col items-center gap-0.5 mr-0.5">
                        {idx > 0 && <button type="button" onClick={() => setTareas((prev: any[]) => { const arr = [...prev]; [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; return arr; })} className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 leading-none"><ChevronUp className="w-3 h-3" /></button>}
                        {idx < tareas.length - 1 && <button type="button" onClick={() => setTareas((prev: any[]) => { const arr = [...prev]; [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; return arr; })} className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 leading-none"><ChevronDown className="w-3 h-3" /></button>}
                      </div>
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                      {editandoTarea === t.tempId ? (
                        <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { setTareas((prev: any[]) => prev.map((x: any) => x.tempId === t.tempId ? { ...x, titulo: editText.trim() || x.titulo } : x)); setEditandoTarea(null); } if (e.key === "Escape") setEditandoTarea(null); }}
                          onBlur={() => { setTareas((prev: any[]) => prev.map((x: any) => x.tempId === t.tempId ? { ...x, titulo: editText.trim() || x.titulo } : x)); setEditandoTarea(null); }}
                          className="flex-1 border border-blue-300 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                          ref={(el) => { if (el && editandoTarea === t.tempId) setTimeout(() => el.focus({ preventScroll: true }), 0); }} />
                      ) : (
                        <span className="flex-1 text-gray-700 cursor-pointer hover:text-blue-700 transition" onClick={() => { setEditText(t.titulo); setEditandoTarea(t.tempId); }}>{t.titulo}</span>
                      )}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button type="button" onClick={() => { setEditText(t.titulo); setEditandoTarea(t.tempId); }} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                      </div>
                      {t.obligatoria ? (
                        <span className="ml-auto flex items-center gap-1 text-amber-500 text-[10px] font-medium shrink-0">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                        </span>
                      ) : (
                        <button type="button" onClick={() => setTareas((prev: any[]) => prev.filter((x: any) => x.tempId !== t.tempId))} className="ml-auto p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 shrink-0"><X className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input type="text" value={nuevaTareaTexto} onChange={(e) => setNuevaTareaTexto(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { const txt = nuevaTareaTexto.trim(); if (txt) { setTareas((prev: any[]) => [...prev, { tempId: --nextTempId.current, titulo: txt }]); setNuevaTareaTexto(""); } }}}
                  placeholder="Escribí una tarea nueva..." className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" />
                <button type="button" onClick={() => { const txt = nuevaTareaTexto.trim(); if (txt) { setTareas((prev: any[]) => [...prev, { tempId: --nextTempId.current, titulo: txt }]); setNuevaTareaTexto(""); }}} disabled={!nuevaTareaTexto.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 text-white rounded-lg text-sm font-semibold transition"><Plus className="w-4 h-4" /> Agregar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
