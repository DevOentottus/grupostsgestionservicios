import { useState, useEffect, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth.js";
import { useAreas } from "@/api/queries/useAreas.js";
import { useUsuarios } from "@/api/queries/useUsuarios.js";
import { useCrearServicio } from "@/api/queries/useServicios.js";
import { usePlantillas, usePlantilla } from "@/api/queries/usePlantillas.js";
import type { Usuario } from "@shared/index.js";
import {
  ArrowLeft, Save, User, Monitor, Package, Wrench,
  CheckSquare, Square, Camera,
} from "lucide-react";
import { toast } from "sonner";

const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50 transition";
const labelClass = "block text-xs text-gray-600 font-semibold mb-1";
const sectionTitleClass = "text-gray-800 font-bold text-sm flex items-center gap-2";

// --- Componentes extraídos para evitar recreación en cada render ---

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
  label, value, onChange, options, placeholder, required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
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
    </div>
  );
});

const CheckboxToggle = memo(function CheckboxToggle({
  checked, onChange, label, description, icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full flex items-start gap-3 p-3 rounded-xl border transition text-left ${
        checked
          ? "border-blue-200 bg-blue-50/60"
          : "border-gray-200 bg-white hover:bg-gray-50"
      }`}
    >
      <span className={`mt-0.5 flex-shrink-0 ${checked ? "text-blue-600" : "text-gray-300"}`}>
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
        </p>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
    </button>
  );
});

export function NuevoServicioPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { data: areas } = useAreas();
  const { data: usuarios } = useUsuarios();
  const { data: plantillas } = usePlantillas();
  const crearServicio = useCrearServicio();

  const isColaborador = currentUser?.rol === "colaborador";

  // -- Form state --
  const [form, setForm] = useState({
    // Cliente
    cliente_dni: "",
    cliente_apellido_paterno: "",
    cliente_apellido_materno: "",
    cliente_nombres: "",
    cliente_telefono: "",

    // Equipo
    descripcion_equipo: "",
    serie_equipo: "",
    detalles_equipo: "",

    // Accesorios
    descripcion_accesorio: "",
    detalles_accesorio: "",

    // Servicio
    titulo: "",
    area_id: "",
    cliente_reporte: "",
    diagnostico_inicial: "",
    descripcion: "",
    colaborador_id: "",
    id_plantilla_inicial: "",
  });

  // -- Checkboxes --
  const [guiarEntrada, setGuiarEntrada] = useState(false);
  const [permiteEvidencia, setPermiteEvidencia] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Si es colaborador, autocompletar su área
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

  // -- Cargar tareas de la plantilla seleccionada --
  const plantillaId = form.id_plantilla_inicial ? Number(form.id_plantilla_inicial) : 0;
  const { data: plantillaDetalle } = usePlantilla(plantillaId);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.titulo.trim()) errs.titulo = "Requerido";
    if (!form.cliente_nombres.trim()) errs.cliente_nombres = "Requerido";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: Record<string, unknown> = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      area_id: form.area_id ? Number(form.area_id) : null,
      colaborador_id: isColaborador
        ? (currentUser?.id ?? null)
        : (form.colaborador_id ? Number(form.colaborador_id) : null),
      id_plantilla_inicial: form.id_plantilla_inicial ? Number(form.id_plantilla_inicial) : null,

      // Cliente
      cliente_dni: form.cliente_dni.trim() || null,
      cliente_apellido_paterno: form.cliente_apellido_paterno.trim() || null,
      cliente_apellido_materno: form.cliente_apellido_materno.trim() || null,
      cliente_nombres: form.cliente_nombres.trim() || null,
      cliente_telefono: form.cliente_telefono.trim() || null,

      // Equipo (siempre se envían, el backend los guarda como null si están vacíos)
      descripcion_equipo: form.descripcion_equipo.trim() || null,
      serie_equipo: form.serie_equipo.trim() || null,
      detalles_equipo: form.detalles_equipo.trim() || null,

      // Accesorios
      descripcion_accesorio: form.descripcion_accesorio.trim() || null,
      detalles_accesorio: form.detalles_accesorio.trim() || null,

      // Servicio
      cliente_reporte: form.cliente_reporte.trim() || null,
      diagnostico_inicial: form.diagnostico_inicial.trim() || null,

      // Evidencias
      permite_evidencia: permiteEvidencia,
    };

    try {
      const res = await crearServicio.mutateAsync(payload);
      toast.success("Servicio creado");
      navigate(`/servicios/${res.data.data.id}`);
    } catch (err: any) {
      const serverErrors = err?.response?.data?.errors;
      if (serverErrors?.length) {
        const fieldErrors: Record<string, string> = {};
        for (const e of serverErrors) {
          fieldErrors[e.field] = e.message;
        }
        setErrors(fieldErrors);
      } else if (err?.response?.data?.detail) {
        toast.error(err.response.data.detail);
      } else {
        toast.error("Error al crear el servicio");
      }
    }
  };

  const tareasPlantilla = plantillaDetalle?.tareas || [];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
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
          <p className="text-gray-500 text-xs">Completá los datos del servicio</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ═══ GUÍA DE ENTRADA ═══ */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <CheckboxToggle
            checked={guiarEntrada}
            onChange={setGuiarEntrada}
            label="Continuar guía de entrada"
            description="Al activar esta opción se ocultan los campos de Equipo y Accesorios, y se muestra la lista de tareas de la plantilla seleccionada."
          />
          <CheckboxToggle
            checked={permiteEvidencia}
            onChange={setPermiteEvidencia}
            label="Solicitar evidencias al cliente"
            description="El cliente podrá subir fotos y videos como evidencia del servicio."
            icon={<Camera className="w-5 h-5 text-gray-300" />}
          />
        </div>

        {/* ═══ CLIENTE ═══ */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className={sectionTitleClass}>
            <User className="w-4 h-4 text-blue-600" />
            Cliente
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="DNI"
              value={form.cliente_dni}
              onChange={(v) => set("cliente_dni", v)}
              placeholder="12345678"
            />
            <InputField
              label="Teléfono"
              value={form.cliente_telefono}
              onChange={(v) => set("cliente_telefono", v)}
              placeholder="+51 999 888 777"
            />
            <InputField
              label="Apellido Paterno"
              value={form.cliente_apellido_paterno}
              onChange={(v) => set("cliente_apellido_paterno", v)}
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

        {/* ═══ EQUIPO — oculto si guía de entrada activa ═══ */}
        {!guiarEntrada && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className={sectionTitleClass}>
              <Monitor className="w-4 h-4 text-blue-600" />
              Equipo
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <InputField
                  label="Descripción"
                  value={form.descripcion_equipo}
                  onChange={(v) => set("descripcion_equipo", v)}
                  placeholder="Ej: Laptop HP Pavilion, Router TP-Link..."
                />
              </div>
              <InputField
                label="N° de Serie"
                value={form.serie_equipo}
                onChange={(v) => set("serie_equipo", v)}
                placeholder="SN-12345-ABC"
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
        )}

        {/* ═══ ACCESORIOS — oculto si guía de entrada activa ═══ */}
        {!guiarEntrada && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className={sectionTitleClass}>
              <Package className="w-4 h-4 text-blue-600" />
              Accesorios
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Descripción"
                value={form.descripcion_accesorio}
                onChange={(v) => set("descripcion_accesorio", v)}
                placeholder="Ej: Cargador, mouse, cable HDMI..."
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
        )}

        {/* ═══ SERVICIO ═══ */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
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

            {isColaborador ? (
              <SelectField
                label="Área"
                value={form.area_id}
                onChange={(v) => set("area_id", v)}
                options={(areas || []).map((a: any) => ({
                  value: String(a.id),
                  label: a.nombre,
                }))}
                placeholder="Sin área"
              />
            ) : (
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
                />

                <SelectField
                  label="Técnico"
                  value={form.colaborador_id}
                  onChange={(v) => set("colaborador_id", v)}
                  options={tecnicos.map((t: Usuario) => ({
                    value: String(t.id),
                    label: `${t.nombres} ${t.apellidos || ""}`.trim(),
                  }))}
                  placeholder="Sin asignar"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Reporte del Cliente"
                value={form.cliente_reporte}
                onChange={(v) => set("cliente_reporte", v)}
                rows={2}
                placeholder="¿Qué reportó el cliente?"
              />
              <InputField
                label="Diagnóstico Inicial"
                value={form.diagnostico_inicial}
                onChange={(v) => set("diagnostico_inicial", v)}
                rows={2}
                placeholder="Primera impresión técnica"
              />
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

            {/* ═══ LISTA DE TAREAS DE LA PLANTILLA (solo si guía activa) ═══ */}
            {guiarEntrada && form.id_plantilla_inicial && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Tareas de la plantilla
                </p>
                {tareasPlantilla.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Cargando tareas...</p>
                ) : (
                  <ol className="space-y-2">
                    {tareasPlantilla.map((t: any, idx: number) => (
                      <li
                        key={t.id || idx}
                        className="flex items-start gap-3 text-sm text-gray-700"
                      >
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="pt-1">{t.titulo}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ═══ SUBMIT ═══ */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <button
            type="button"
            onClick={() => navigate("/servicios")}
            className="px-5 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={crearServicio.isPending}
            className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {crearServicio.isPending ? "Guardando..." : "Crear Servicio"}
          </button>
        </div>
      </form>
    </div>
  );
}
