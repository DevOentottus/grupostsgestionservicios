import { useQuery } from "@tanstack/react-query";
import { areasApi } from "@/api/client.js";
import type { Area } from "@shared/index.js";

interface AreaFilterProps {
  value: number | undefined;
  onChange: (areaId: number | undefined) => void;
}

export function AreaFilter({ value, onChange }: AreaFilterProps) {
  const { data: areasData } = useQuery({
    queryKey: ["areas"],
    queryFn: async () => {
      const r = await areasApi.listar();
      return r.data.data as Area[];
    },
  });

  const areas = Array.isArray(areasData) ? areasData : [];

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-slate-500 font-medium">Área:</label>
      <select
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v ? parseInt(v) : undefined);
        }}
        className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">Todas las áreas</option>
        {areas.map((area: Area) => (
          <option key={area.id} value={area.id}>
            {area.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}
