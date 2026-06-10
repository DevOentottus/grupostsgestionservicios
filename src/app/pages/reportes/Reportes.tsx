import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useReporteColaborador, useReporteArea, useExportarReporte } from "@/api/queries/useReportes.js";
import { usuariosApi, areasApi } from "@/api/client.js";
import { cn } from "@/app/lib/utils";
import type { Usuario, Area } from "@shared/index.js";
import { useAuth } from "@/lib/auth.js";
import {
  Download, FileText, Filter, Users, MapPin,
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
  const [areaId, setAreaId] = useState<number | undefined>();
  const [areaFechaInicio, setAreaFechaInicio] = useState("");
  const [areaFechaFin, setAreaFechaFin] = useState("");

  const exportar = useExportarReporte();

  // Fetch colaboradores and areas for dropdowns
  const { data: colaboradores } = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const r = await usuariosApi.listar();
      return (r.data.data as Usuario[]).filter((u) => u.rol !== "admin");
    },
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900" style={{ fontWeight: 700 }}>Reportes</h2>
          <p className="text-sm text-gray-500">Visualiza y exporta reportes de rendimiento</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab("colaborador")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-sm transition-colors rounded-t-lg",
            tab === "colaborador"
              ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 font-medium"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50",
          )}
        >
          <Users className="w-4 h-4" />
          Por Colaborador
        </button>
        <button
          onClick={() => setTab("area")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-sm transition-colors rounded-t-lg",
            tab === "area"
              ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 font-medium"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50",
          )}
        >
          <MapPin className="w-4 h-4" />
          Por Área
        </button>
      </div>

      {/* ─── Colaborador Tab ─── */}
      {tab === "colaborador" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Colaborador</label>
              <select
                value={colabUserId || ""}
                onChange={(e) => setColabUserId(e.target.value ? parseInt(e.target.value) : undefined)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-w-[200px] bg-gray-50"
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
              <label className="block text-xs font-medium text-gray-500 mb-1">Fecha inicio</label>
              <input
                type="date"
                value={colabFechaInicio}
                onChange={(e) => setColabFechaInicio(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fecha fin</label>
              <input
                type="date"
                value={colabFechaFin}
                onChange={(e) => setColabFechaFin(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"
              />
            </div>
            <button
              onClick={() => refetchColab()}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Consultar
            </button>
          </div>

          {/* Summary Cards */}
          {colabData && colabUserId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Servicios Completados", value: colabData.servicios_completados, icon: CheckCircle2, color: "bg-green-500" },
                { label: "Tareas Completadas", value: colabData.tareas_completadas, icon: BarChart3, color: "bg-blue-500" },
                { label: "Tiempo Promedio", value: `${colabData.tiempo_promedio_min} min`, icon: Clock, color: "bg-amber-500" },
                { label: "Eficiencia", value: `${colabData.eficiencia}%`, icon: TrendingUp, color: "bg-purple-500" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center mb-3`}>
                    <s.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>{s.value}</p>
                  <p className="text-gray-500 text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Data Table */}
          {colabData && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-gray-800" style={{ fontWeight: 600 }}>
                  {colabUserId ? "Rendimiento del Colaborador" : "Todos los Colaboradores"}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExport("colaborador", "xlsx")}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50 transition"
                    style={{ fontWeight: 600 }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    XLSX
                  </button>
                  <button
                    onClick={() => handleExport("colaborador", "pdf")}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50 transition"
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
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Colaborador</th>
                      <th className="text-center px-4 py-3 text-xs text-gray-500 font-medium">Tareas Completadas</th>
                      {(colabData as any).colaboradores
                        ? <th className="text-center px-4 py-3 text-xs text-gray-500 font-medium">Rendimiento</th>
                        : <>
                            <th className="text-center px-4 py-3 text-xs text-gray-500 font-medium">Servicios</th>
                            <th className="text-center px-4 py-3 text-xs text-gray-500 font-medium">Tiempo Prom.</th>
                            <th className="text-center px-4 py-3 text-xs text-gray-500 font-medium">Eficiencia</th>
                          </>
                      }
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {colabUserId ? (
                      <tr className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {colabData.colaborador?.nombres} {colabData.colaborador?.apellidos || ""}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">{colabData.tareas_completadas}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{colabData.servicios_completados}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{colabData.tiempo_promedio_min} min</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            colabData.eficiencia >= 80 ? "bg-green-100 text-green-700" :
                            colabData.eficiencia >= 50 ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700",
                          )}>
                            {colabData.eficiencia}%
                          </span>
                        </td>
                      </tr>
                    ) : (
                      (colabData as any).colaboradores?.map((c: any) => (
                        <tr key={c.usuario_id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {c.nombres} {c.apellidos || ""}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-700">{c.tareas_completadas}</td>
                          <td className="px-4 py-3 text-center text-gray-400">—</td>
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

      {/* ─── Area Tab ─── */}
      {tab === "area" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
            {!isEncargado && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Área</label>
                <select
                  value={areaId || ""}
                  onChange={(e) => setAreaId(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-w-[200px] bg-gray-50"
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
              <label className="block text-xs font-medium text-gray-500 mb-1">Fecha inicio</label>
              <input
                type="date"
                value={areaFechaInicio}
                onChange={(e) => setAreaFechaInicio(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fecha fin</label>
              <input
                type="date"
                value={areaFechaFin}
                onChange={(e) => setAreaFechaFin(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"
              />
            </div>
            <button
              onClick={() => refetchArea()}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Consultar
            </button>
          </div>

          {/* Summary Cards */}
          {areaData && areaId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Productividad", value: `${areaData.productividad}%`, icon: TrendingUp, color: "bg-green-500" },
                { label: "Total Servicios", value: areaData.total_servicios, icon: BarChart3, color: "bg-blue-500" },
                { label: "Completados", value: areaData.completados, icon: CheckCircle2, color: "bg-indigo-500" },
                { label: "Tiempo Promedio", value: `${areaData.tiempo_promedio_min} min`, icon: Clock, color: "bg-amber-500" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center mb-3`}>
                    <s.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>{s.value}</p>
                  <p className="text-gray-500 text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Data Table */}
          {areaData && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-gray-800" style={{ fontWeight: 600 }}>
                  {areaId ? `Rendimiento: ${(areaData as any).area?.nombre || ""}` : "Todas las Áreas"}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExport("area", "xlsx")}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50 transition"
                    style={{ fontWeight: 600 }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    XLSX
                  </button>
                  <button
                    onClick={() => handleExport("area", "pdf")}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50 transition"
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
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Área</th>
                      <th className="text-center px-4 py-3 text-xs text-gray-500 font-medium">Total Servicios</th>
                      <th className="text-center px-4 py-3 text-xs text-gray-500 font-medium">Completados</th>
                      <th className="text-center px-4 py-3 text-xs text-gray-500 font-medium">Productividad</th>
                      <th className="text-center px-4 py-3 text-xs text-gray-500 font-medium">Tiempo Prom.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {areaId ? (
                      <tr className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {(areaData as any).area?.nombre}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">{areaData.total_servicios}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm text-green-700 bg-green-50 px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>
                            {areaData.completados}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">{areaData.productividad}%</td>
                        <td className="px-4 py-3 text-center text-gray-700">{areaData.tiempo_promedio_min} min</td>
                      </tr>
                    ) : (
                      (areaData as any).areas?.map((a: any) => (
                        <tr key={a.area_id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 font-medium text-gray-800">{a.nombre}</td>
                          <td className="px-4 py-3 text-center text-gray-700">{a.total}</td>
                          <td className="px-4 py-3 text-center text-gray-700">{a.completados}</td>
                          <td className="px-4 py-3 text-center text-gray-700">{a.total > 0 ? `${Math.round((a.completados / a.total) * 100)}%` : "—"}</td>
                          <td className="px-4 py-3 text-center text-gray-400">—</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tendencias mensuales */}
          {areaData && areaId && (areaData as any).tendencias?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Tendencias Mensuales</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Mes</th>
                      <th className="text-center px-4 py-3 text-xs text-gray-500 font-medium">Creados</th>
                      <th className="text-center px-4 py-3 text-xs text-gray-500 font-medium">Completados</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(areaData as any).tendencias?.map((t: any) => (
                      <tr key={t.mes} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 font-medium text-gray-800">{t.mes}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{t.creados}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{t.completados}</td>
                      </tr>
                    ))}
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
