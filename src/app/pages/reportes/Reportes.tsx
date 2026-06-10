import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReporteColaborador, useReporteArea, useExportarReporte } from "@/api/queries/useReportes.js";
import { usuariosApi, areasApi } from "@/api/client.js";
import type { Usuario, Area } from "@shared/index.js";
import { useAuth } from "@/lib/auth.js";

type TabType = "colaborador" | "area";

export function ReportesPage() {
  const { user } = useAuth();
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
          <h2 className="text-2xl font-bold text-slate-800">Reportes</h2>
          <p className="text-sm text-slate-500">
            Visualiza y exporta reportes de rendimiento
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setTab("colaborador")}
          className={`px-6 py-3 font-medium text-sm transition-colors ${
            tab === "colaborador"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Por Colaborador
        </button>
        <button
          onClick={() => setTab("area")}
          className={`px-6 py-3 font-medium text-sm transition-colors ${
            tab === "area"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Por Área
        </button>
      </div>

      {/* ─── Colaborador Tab ─── */}
      {tab === "colaborador" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Colaborador
              </label>
              <select
                value={colabUserId || ""}
                onChange={(e) => setColabUserId(e.target.value ? parseInt(e.target.value) : undefined)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm min-w-[200px]"
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
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Fecha inicio
              </label>
              <input
                type="date"
                value={colabFechaInicio}
                onChange={(e) => setColabFechaInicio(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Fecha fin
              </label>
              <input
                type="date"
                value={colabFechaFin}
                onChange={(e) => setColabFechaFin(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={() => refetchColab()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Consultar
            </button>
          </div>

          {/* Summary Cards */}
          {colabData && colabUserId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard
                label="Servicios Completados"
                value={colabData.servicios_completados}
                color="bg-green-500"
              />
              <SummaryCard
                label="Tareas Completadas"
                value={colabData.tareas_completadas}
                color="bg-blue-500"
              />
              <SummaryCard
                label="Tiempo Promedio"
                value={`${colabData.tiempo_promedio_min} min`}
                color="bg-amber-500"
              />
              <SummaryCard
                label="Eficiencia"
                value={`${colabData.eficiencia}%`}
                color="bg-purple-500"
              />
            </div>
          )}

          {/* Data Table */}
          {colabData && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-700">
                  {colabUserId ? "Rendimiento del Colaborador" : "Todos los Colaboradores"}
                </h3>
                <div className="flex gap-2">
                  <ExportButton
                    label="XLSX"
                    onClick={() => handleExport("colaborador", "xlsx")}
                  />
                  <ExportButton
                    label="PDF"
                    onClick={() => handleExport("colaborador", "pdf")}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">Colaborador</th>
                      <th className="text-center px-4 py-3">Tareas Completadas</th>
                      {(colabData as any).colaboradores
                        ? <th className="text-center px-4 py-3">Rendimiento</th>
                        : <>
                            <th className="text-center px-4 py-3">Servicios</th>
                            <th className="text-center px-4 py-3">Tiempo Prom.</th>
                            <th className="text-center px-4 py-3">Eficiencia</th>
                          </>
                      }
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {colabUserId ? (
                      <tr className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">
                          {colabData.colaborador?.nombres} {colabData.colaborador?.apellidos || ""}
                        </td>
                        <td className="px-4 py-3 text-center">{colabData.tareas_completadas}</td>
                        <td className="px-4 py-3 text-center">{colabData.servicios_completados}</td>
                        <td className="px-4 py-3 text-center">{colabData.tiempo_promedio_min} min</td>
                        <td className="px-4 py-3 text-center">{colabData.eficiencia}%</td>
                      </tr>
                    ) : (
                      (colabData as any).colaboradores?.map((c: any) => (
                        <tr key={c.usuario_id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium">
                            {c.nombres} {c.apellidos || ""}
                          </td>
                          <td className="px-4 py-3 text-center">{c.tareas_completadas}</td>
                          <td className="px-4 py-3 text-center text-slate-400">—</td>
                        </tr>
                      ))
                    )}
                    {!colabData && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          Seleccione un colaborador y consulte
                        </td>
                      </tr>
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
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-4 items-end">
            {!isEncargado && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Área
                </label>
                <select
                  value={areaId || ""}
                  onChange={(e) => setAreaId(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm min-w-[200px]"
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
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Fecha inicio
              </label>
              <input
                type="date"
                value={areaFechaInicio}
                onChange={(e) => setAreaFechaInicio(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Fecha fin
              </label>
              <input
                type="date"
                value={areaFechaFin}
                onChange={(e) => setAreaFechaFin(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={() => refetchArea()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Consultar
            </button>
          </div>

          {/* Summary Cards */}
          {areaData && areaId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard
                label="Productividad"
                value={`${areaData.productividad}%`}
                color="bg-green-500"
              />
              <SummaryCard
                label="Total Servicios"
                value={areaData.total_servicios}
                color="bg-blue-500"
              />
              <SummaryCard
                label="Completados"
                value={areaData.completados}
                color="bg-indigo-500"
              />
              <SummaryCard
                label="Tiempo Promedio"
                value={`${areaData.tiempo_promedio_min} min`}
                color="bg-amber-500"
              />
            </div>
          )}

          {/* Data Table */}
          {areaData && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-700">
                  {areaId ? `Rendimiento: ${(areaData as any).area?.nombre || ""}` : "Todas las Áreas"}
                </h3>
                <div className="flex gap-2">
                  <ExportButton
                    label="XLSX"
                    onClick={() => handleExport("area", "xlsx")}
                  />
                  <ExportButton
                    label="PDF"
                    onClick={() => handleExport("area", "pdf")}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">Área</th>
                      <th className="text-center px-4 py-3">Total Servicios</th>
                      <th className="text-center px-4 py-3">Completados</th>
                      <th className="text-center px-4 py-3">Productividad</th>
                      <th className="text-center px-4 py-3">Tiempo Prom.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {areaId ? (
                      <tr className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">
                          {(areaData as any).area?.nombre}
                        </td>
                        <td className="px-4 py-3 text-center">{areaData.total_servicios}</td>
                        <td className="px-4 py-3 text-center">{areaData.completados}</td>
                        <td className="px-4 py-3 text-center">{areaData.productividad}%</td>
                        <td className="px-4 py-3 text-center">{areaData.tiempo_promedio_min} min</td>
                      </tr>
                    ) : (
                      (areaData as any).areas?.map((a: any) => (
                        <tr key={a.area_id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium">{a.nombre}</td>
                          <td className="px-4 py-3 text-center">{a.total}</td>
                          <td className="px-4 py-3 text-center">{a.completados}</td>
                          <td className="px-4 py-3 text-center">
                            {a.total > 0
                              ? `${Math.round((a.completados / a.total) * 100)}%`
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-400">—</td>
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
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-700">Tendencias Mensuales</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">Mes</th>
                      <th className="text-center px-4 py-3">Creados</th>
                      <th className="text-center px-4 py-3">Completados</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(areaData as any).tendencias?.map((t: any) => (
                      <tr key={t.mes} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{t.mes}</td>
                        <td className="px-4 py-3 text-center">{t.creados}</td>
                        <td className="px-4 py-3 text-center">{t.completados}</td>
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

// ── Sub-components ──

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold ${color.replace("bg-", "text-")}`}>
        {value}
      </p>
    </div>
  );
}

function ExportButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
    >
      Exportar {label}
    </button>
  );
}
