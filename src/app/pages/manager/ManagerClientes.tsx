import { useQuery } from "@tanstack/react-query";
import { managerApi } from "@/api/client.js";
import { useState } from "react";
import { Search, Phone, Mail, MapPin, Calendar, Wrench } from "lucide-react";

interface Cliente {
  cliente_id: number;
  cliente_nombres: string;
  cliente_apellido_paterno: string;
  cliente_apellido_materno: string | null;
  cliente_dni: string | null;
  cliente_telefono: string | null;
  cliente_correo: string | null;
  cliente_direccion: string | null;
  cliente_fecha_creacion: string;
  total_servicios: number;
  ultimo_servicio: { codigo: string; fecha: string } | null;
}

export function ManagerClientesPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["manager", "clientes"],
    queryFn: async () => {
      const r = await managerApi.clientes();
      return r.data.data as Cliente[];
    },
  });

  const filtered = (data || []).filter((c) => {
    const q = search.toLowerCase();
    return (
      c.cliente_nombres?.toLowerCase().includes(q) ||
      c.cliente_apellido_paterno?.toLowerCase().includes(q) ||
      c.cliente_dni?.includes(q) ||
      c.cliente_correo?.toLowerCase().includes(q) ||
      c.cliente_telefono?.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
          <p className="text-sm text-slate-500 mt-1">
            {data?.length || 0} clientes registrados
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, DNI, correo o teléfono..."
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-12 text-slate-400">Cargando...</div>
      )}

      {/* Table */}
      {!isLoading && filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">DNI</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Contacto</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Dirección</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Servicios</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Último servicio</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Registrado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.cliente_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">
                        {c.cliente_nombres}{" "}
                        {c.cliente_apellido_paterno}
                        {c.cliente_apellido_materno ? ` ${c.cliente_apellido_materno}` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                      {c.cliente_dni || "--"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {c.cliente_correo && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Mail className="w-3 h-3" />
                            <span className="text-xs">{c.cliente_correo}</span>
                          </div>
                        )}
                        {c.cliente_telefono && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Phone className="w-3 h-3" />
                            <span className="text-xs">{c.cliente_telefono}</span>
                          </div>
                        )}
                        {!c.cliente_correo && !c.cliente_telefono && (
                          <span className="text-slate-400 text-xs">Sin contacto</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {c.cliente_direccion ? (
                        <div className="flex items-start gap-1.5 text-slate-600">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                          <span className="text-xs line-clamp-2">{c.cliente_direccion}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                        <Wrench className="w-3 h-3" />
                        {c.total_servicios}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {c.ultimo_servicio ? (
                        <div className="flex flex-col">
                          <span className="font-mono text-blue-600">{c.ultimo_servicio.codigo}</span>
                          <span className="text-slate-400">{new Date(c.ultimo_servicio.fecha).toLocaleDateString("es-PE")}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(c.cliente_fecha_creacion).toLocaleDateString("es-PE")}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && data?.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-lg font-medium">Sin clientes registrados</p>
          <p className="text-sm mt-1">Los clientes se crean al registrar servicios.</p>
        </div>
      )}

      {/* No results */}
      {!isLoading && data && data.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p>No se encontraron clientes con "{search}"</p>
        </div>
      )}
    </div>
  );
}
