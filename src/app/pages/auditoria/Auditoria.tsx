import { useState } from "react";
import { useAuditoria } from "@/api/queries/useAuditoria.js";
import type { AuditoriaDisplay } from "@shared/index.js";

export function AuditoriaPage() {
  const [page, setPage] = useState(1);
  const [entidad, setEntidad] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const { data, isLoading } = useAuditoria({
    page,
    limit: 20,
    entidad: entidad || undefined,
    fecha_desde: fechaDesde || undefined,
    fecha_hasta: fechaHasta || undefined,
  });

  const rows = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Auditoría</h2>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Entidad
          </label>
          <select
            value={entidad}
            onChange={(e) => {
              setEntidad(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">Todas</option>
            <option value="servicio">servicio</option>
            <option value="usuario">usuario</option>
            <option value="tarea">tarea</option>
            <option value="area">area</option>
            <option value="area-colaborador">area-colaborador</option>
            <option value="plantilla">plantilla</option>
            <option value="comentario">comentario</option>
            <option value="auth">auth</option>
            <option value="tiempo-tracking">tiempo-tracking</option>
            <option value="tarea-reordenar">tarea-reordenar</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Desde
          </label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => {
              setFechaDesde(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Hasta
          </label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => {
              setFechaHasta(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border rounded-lg text-sm"
          />
        </div>

        {(entidad || fechaDesde || fechaHasta) && (
          <button
            onClick={() => {
              setEntidad("");
              setFechaDesde("");
              setFechaHasta("");
              setPage(1);
            }}
            className="px-3 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Fecha/Hora</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Usuario</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Acción</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Entidad</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">ID</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Cargando...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No se encontraron registros de auditoría
                </td>
              </tr>
            ) : (
              rows.map((row: AuditoriaDisplay) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-mono text-xs">
                    {new Date(row.created_at).toLocaleString("es-PE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {row.usuario ? (
                      <span title={row.usuario.username}>
                        {row.usuario.nombres}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.accion === "CREATE"
                          ? "bg-green-100 text-green-700"
                          : row.accion === "DELETE"
                          ? "bg-red-100 text-red-700"
                          : row.accion === "UPDATE" ||
                            row.accion === "STATUS_CHANGE" ||
                            row.accion === "COMPLETE" ||
                            row.accion === "REOPEN"
                          ? "bg-blue-100 text-blue-700"
                          : row.accion === "LOGIN"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {row.accion}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.entidad}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                    {row.entidad_id ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">
                    {row.detalle
                      ? JSON.stringify(row.detalle).slice(0, 100)
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">
            Total: {meta.total} registros — Página {meta.page} de{" "}
            {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 border rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= meta.totalPages}
              className="px-3 py-1.5 border rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
