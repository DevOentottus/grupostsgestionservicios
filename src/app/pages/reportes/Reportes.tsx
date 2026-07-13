import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useReporteColaborador, useReporteArea, useExportarReporte } from "@/api/queries/useReportes.js";
import { useMiArea } from "@/api/queries/useManager.js";
import { usuariosApi, areasApi } from "@/api/client.js";
import { cn, formatMinutos } from "@/app/lib/utils";
import type { Usuario, Area } from "@shared/index.js";
import { useAuth } from "@/lib/auth.js";
import {
  Download, FileText, Users, MapPin,
  TrendingUp, BarChart3, CheckCircle2, Clock,
} from "lucide-react";

type TabType = "colaborador" | "area";

export function ReportesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>("colaborador");

  // Colaborador filters
  const [colabUserId, setColabUserId] = useState<number | undefined>();
  const [colabFechaInicio, setColabFechaInicio] = useState("");
  const [colabFechaFin, setColabFechaFin] = useState("");

  // Area filters
  const [areaId, setAreaId] = useState<number | undefined>(
    user?.rol === "encargado" ? (user.area_id ?? undefined) : undefined
  );
  const [areaFechaInicio, setAreaFechaInicio] = useState("");
  const [areaFechaFin, setAreaFechaFin] = useState("");

  const exportar = useExportarReporte();
  const { data: miArea } = useMiArea();

  // Fetch colaboradores (encargado → solo su área, admin → todos)
  const { data: colaboradores } = useQuery({
    queryKey: ["reportes-colaboradores", user?.rol, user?.area_id],
    queryFn: async () => {
      if (user?.rol === "encargado" && miArea?.colaboradores) {
        return miArea.colaboradores.map((c) => ({
          id: c.usuario_id,
          nombres: c.nombres,
          apellidos: "",
          username: c.username || "",
          email: c.email,
          rol: "colaborador",
        }));
      }
      const r = await usuariosApi.listar();
      return (r.data.data as Usuario[]).filter((u) => u.rol !== "admin");
    },
    enabled: user?.rol !== "encargado" || !!miArea,
  });

  const { data: areas } = useQuery({
    queryKey: ["areas"],
    queryFn: async () => {
      const r = await areasApi.listar();
      return r.data.data as Area[];
    },
  });

  const colabFilters = {
    fecha_inicio: colabFechaInicio || undefined,
    fecha_fin: colabFechaFin || undefined,
    usuario_id: colabUserId,
  };

  const areaFilters = {
    fecha_inicio: areaFechaInicio || undefined,
    fecha_fin: areaFechaFin || undefined,
    area_id: areaId,
  };

  const {
    data: colabData,
    isLoading: colabLoading,
    refetch: refetchColab,
  } = useReporteColaborador(colabUserId ? colabFilters : {});
  const {
    data: areaData,
    isLoading: areaLoading,
    refetch: refetchArea,
  } = useReporteArea(areaId ? areaFilters : {});

  // Default date range: last 30 days
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    const fmt = (d: Date) => d.toISOString().split("T")[0];
    if (!colabFechaInicio && !colabFechaFin) {
      setColabFechaInicio(fmt(start));
      setColabFechaFin(fmt(end));
    }
    if (!areaFechaInicio && !areaFechaFin) {
      setAreaFechaInicio(fmt(start));
      setAreaFechaFin(fmt(end));
    }
  }, []);

  const handleExport = (tipo: TabType, formato: "xlsx" | "pdf") => {
    const params: any = {};
    if (tipo === "colaborador") {
      params.fecha_inicio = colabFechaInicio || undefined;
      params.fecha_fin = colabFechaFin || undefined;
      params.usuario_id = colabUserId;
    } else {
      params.fecha_inicio = areaFechaInicio || undefined;
      params.fecha_fin = areaFechaFin || undefined;
      params.area_id = areaId;
    }
    exportar(tipo, formato, params);
  };

  const isEncargado = user?.rol === "encargado";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>Reportes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visualiza y exporta reportes de rendimiento</p>
        </div>
      </div>

      {/* Tabs - Pill style */}
      <div className="bg-gray-100/60 inline-flex p-1 rounded-2xl">
        <button
          onClick={() => setTab("colaborador")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-200",
            tab === "colaborador"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700",
          )}
        >
          <Users className="w-4 h-4" />
          Por Colaborador
        </button>
        <button
          onClick={() => setTab("area")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-200",
            tab === "area"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700",
          )}
        >
          <MapPin className="w-4 h-4" />
          Por Área
        </button>
      </div>

      {/* --- Colaborador Tab --- */}
      {tab === "colaborador" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="min-w-0 flex-1 max-w-xs">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Colaborador</label>
                <select
                  value={colabUserId || ""}
                  onChange={(e) => setColabUserId(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                >
                  <option value="">Todos los colaboradores</option>
                  {colaboradores?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombres} {u.apellidos || ""} ({u.username})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Fecha inicio</label>
                <input
                  type="date"
                  value={colabFechaInicio}
                  onChange={(e) => setColabFechaInicio(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Fecha fin</label>
                <input
                  type="date"
                  value={colabFechaFin}
                  onChange={(e) => setColabFechaFin(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                />
              </div>
              <button
                onClick={() => refetchColab()}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
              >
                Consultar
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          {colabData && colabUserId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { label: "Servicios Completados", value: colabData.servicios_completados, icon: CheckCircle2, color: "bg-green-500" },
                { label: "Tareas Completadas", value: colabData.tareas_completadas, icon: BarChart3, color: "bg-blue-500" },
                { label: "Tiempo Promedio", value: formatMinutos(colabData.tiempo_promedio_min), icon: Clock, color: "bg-amber-500" },
                { label: "Eficiencia", value: `${colabData.eficiencia}%`, icon: TrendingUp, color: "bg-purple-500" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <div className={`w-11 h-11 ${s.color} rounded-xl flex items-center justify-center mb-3 shadow-sm`}>
                    <s.icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>{s.value}</p>
                  <p className="text-gray-500 text-xs mt-1.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Data Table */}
          {colabData && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-gray-800" style={{ fontWeight: 600 }}>
                  {colabUserId ? "Rendimiento del Colaborador" : "Todos los Colaboradores"}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExport("colaborador", "xlsx")}
                    className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
                    style={{ fontWeight: 600 }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    XLSX
                  </button>
                  <button
                    onClick={() => handleExport("colaborador", "pdf")}
                    className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
                    style={{ fontWeight: 600 }}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    PDF
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800">
                      <th className="text-left px-5 py-3.5 text-xs text-white font-semibold tracking-wider uppercase">Colaborador</th>
                      <th className="text-center px-5 py-3.5 text-xs text-white font-semibold tracking-wider uppercase">Tareas Completadas</th>
                      {colabData?.colaboradores
                        ? <th className="text-center px-5 py-3.5 text-xs text-white font-semibold tracking-wider uppercase">Rendimiento</th>
                        : <>
                            <th className="text-center px-5 py-3.5 text-xs text-white font-semibold tracking-wider uppercase">Servicios</th>
                            <th className="text-center px-5 py-3.5 text-xs text-white font-semibold tracking-wider uppercase">Tiempo Prom.</th>
                            <th className="text-center px-5 py-3.5 text-xs text-white font-semibold tracking-wider uppercase">Eficiencia</th>
                          </>
                      }
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {colabUserId ? (
                      <tr className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-5 py-4 font-medium text-gray-800">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                              {((colabData.colaborador?.nombres?.[0] || "") + (colabData.colaborador?.apellidos?.[0] || "")).toUpperCase() || "?"}
                            </div>
                            <span>{colabData.colaborador?.nombres} {colabData.colaborador?.apellidos || ""}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="text-gray-800 font-medium">{colabData.tareas_completadas}</span>
                        </td>
                        <td className="px-5 py-4 text-center text-gray-700">{colabData.servicios_completados}</td>
                        <td className="px-5 py-4 text-center text-gray-700">{formatMinutos(colabData.tiempo_promedio_min)}</td>
                        <td className="px-5 py-4 text-center">
                          <span className={cn(
                            "inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-semibold",
                            colabData.eficiencia >= 80 ? "bg-green-100 text-green-700" :
                            colabData.eficiencia >= 50 ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700",
                          )}>
                            {colabData.eficiencia >= 80 && <TrendingUp className="w-3 h-3" />}
                            {colabData.eficiencia}%
                          </span>
                        </td>
                      </tr>
                    ) : (
                      colabData?.colaboradores?.map((c: any) => (
                        <tr key={c.usuario_id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="px-5 py-4 font-medium text-gray-800">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">
                                {((c.nombres?.[0] || "") + (c.apellidos?.[0] || "")).toUpperCase() || "?"}
                              </div>
                              <span>{c.nombres} {c.apellidos || ""}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="text-gray-800 font-medium">{c.tareas_completadas}</span>
                          </td>
                          <td className="px-5 py-4 text-center text-gray-400">--</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- Area Tab --- */}
      {tab === "area" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex flex-wrap gap-4 items-end">
              {!isEncargado && (
                <div className="min-w-0 flex-1 max-w-xs">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Área</label>
                  <select
                    value={areaId || ""}
                    onChange={(e) => setAreaId(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                  >
                    <option value="">Todas las áreas</option>
                    {areas?.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Fecha inicio</label>
                <input
                  type="date"
                  value={areaFechaInicio}
                  onChange={(e) => setAreaFechaInicio(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Fecha fin</label>
                <input
                  type="date"
                  value={areaFechaFin}
                  onChange={(e) => setAreaFechaFin(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                />
              </div>
              <button
                onClick={() => refetchArea()}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
              >
                Consultar
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          {areaData && areaId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { label: "Productividad", value: `${areaData.productividad}%`, icon: TrendingUp, color: "bg-green-500" },
                { label: "Total Servicios", value: areaData.total_servicios, icon: BarChart3, color: "bg-blue-500" },
                { label: "Completados", value: areaData.completados, icon: CheckCircle2, color: "bg-indigo-500" },
                { label: "Tiempo Promedio", value: formatMinutos(areaData.tiempo_promedio_min), icon: Clock, color: "bg-amber-500" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <div className={`w-11 h-11 ${s.color} rounded-xl flex items-center justify-center mb-3 shadow-sm`}>
                    <s.icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>{s.value}</p>
                  <p className="text-gray-500 text-xs mt-1.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Data Table */}
          {areaData && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-gray-800" style={{ fontWeight: 600 }}>
                  {areaId ? `Rendimiento: ${areaData?.area?.nombre || ""}` : "Todas las Áreas"}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExport("area", "xlsx")}
                    className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
                    style={{ fontWeight: 600 }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    XLSX
                  </button>
                  <button
                    onClick={() => handleExport("area", "pdf")}
                    className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
                    style={{ fontWeight: 600 }}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    PDF
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800">
                      <th className="text-left px-5 py-3.5 text-xs text-white font-semibold tracking-wider uppercase">Área</th>
                      <th className="text-center px-5 py-3.5 text-xs text-white font-semibold tracking-wider uppercase">Total Servicios</th>
                      <th className="text-center px-5 py-3.5 text-xs text-white font-semibold tracking-wider uppercase">Completados</th>
                      <th className="text-center px-5 py-3.5 text-xs text-white font-semibold tracking-wider uppercase">Productividad</th>
                      <th className="text-center px-5 py-3.5 text-xs text-white font-semibold tracking-wider uppercase">Tiempo Prom.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {areaId ? (
                      <tr className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-5 py-4 font-medium text-gray-800">{areaData?.area?.nombre}</td>
                        <td className="px-5 py-4 text-center text-gray-700">{areaData.total_servicios}</td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex items-center gap-1 text-sm text-green-700 bg-green-50 px-3 py-1 rounded-full font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {areaData.completados}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={cn(
                            "inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-semibold",
                            areaData.productividad >= 80 ? "bg-green-100 text-green-700" :
                            areaData.productividad >= 50 ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700",
                          )}>
                            {areaData.productividad}%
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center text-gray-700">{formatMinutos(areaData.tiempo_promedio_min)}</td>
                      </tr>
                    ) : (
                      areaData?.areas?.map((a: any) => (
                        <tr key={a.area_id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="px-5 py-4 font-medium text-gray-800">{a.nombre}</td>
                          <td className="px-5 py-4 text-center text-gray-700">{a.total}</td>
                          <td className="px-5 py-4 text-center text-gray-700">{a.completados}</td>
                          <td className="px-5 py-4 text-center">
                            {a.total > 0 ? (
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 bg-gray-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-2 rounded-full transition-all",
                                      (a.completados / a.total) >= 0.8 ? "bg-green-500" :
                                      (a.completados / a.total) >= 0.5 ? "bg-amber-500" :
                                      "bg-red-500",
                                    )}
                                    style={{ width: `${(a.completados / a.total) * 100}%` }}
                                  />
                                </div>
                                <span className="text-gray-700 font-medium">{Math.round((a.completados / a.total) * 100)}%</span>
                              </div>
                            ) : "--"}
                          </td>
                          <td className="px-5 py-4 text-center text-gray-400">--</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tendencias mensuales */}
          {areaData && areaId && areaData?.tendencias?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Tendencias Mensuales</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800">
                      <th className="text-left px-5 py-3.5 text-xs text-white font-semibold tracking-wider uppercase">Mes</th>
                      <th className="text-center px-5 py-3.5 text-xs text-white font-semibold tracking-wider uppercase">Creados</th>
                      <th className="text-center px-5 py-3.5 text-xs text-white font-semibold tracking-wider uppercase">Completados</th>
                      <th className="text-center px-5 py-3.5 text-xs text-white font-semibold tracking-wider uppercase">Proporción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {areaData?.tendencias?.map((t: any) => {
                      const proporcion = t.creados > 0 ? t.completados / t.creados : 0;
                      return (
                        <tr key={t.mes} className="hover:bg-blue-50/40 transition-colors">
                          <td className="px-5 py-4 font-medium text-gray-800">{t.mes}</td>
                          <td className="px-5 py-4 text-center">
                            <span className="font-medium text-gray-800">{t.creados}</span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="font-medium text-gray-800">{t.completados}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3 max-w-[180px] mx-auto">
                              <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                <div
                                  className={cn(
                                    "h-2.5 rounded-full transition-all",
                                    proporcion >= 0.8 ? "bg-green-500" :
                                    proporcion >= 0.5 ? "bg-blue-500" :
                                    "bg-amber-500",
                                  )}
                                  style={{ width: `${Math.min(proporcion * 100, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 font-medium w-8 text-right">{Math.round(proporcion * 100)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
