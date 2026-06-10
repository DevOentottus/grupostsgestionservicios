import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface SatisfactionDatum {
  area_nombre: string;
  promedio: number;
  cantidad: number;
}

interface SatisfactionByAreaChartProps {
  title?: string;
  data: SatisfactionDatum[];
}

const SAT_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

export function SatisfactionByAreaChart({
  title = "Satisfacción por Área",
  data,
}: SatisfactionByAreaChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-slate-800 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
          No hay datos de satisfacción disponibles
        </div>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.area_nombre,
    value: d.promedio,
    cantidad: d.cantidad,
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h3 className="font-semibold text-slate-800 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 5]}
            ticks={[0, 1, 2, 3, 4, 5]}
            tick={{ fontSize: 11 }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <Tooltip
            formatter={(value, _name, entry) => {
              const payload = entry?.payload as Record<string, unknown> | undefined;
              return [
                `${typeof value === "number" ? value.toFixed(1) : value} / 5`,
                `Promedio (${payload?.cantidad ?? 0} eval.)`,
              ];
            }}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "13px",
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((_entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={SAT_COLORS[index % SAT_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
