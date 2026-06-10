import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface PieChartDatum {
  name: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  title: string;
  data: PieChartDatum[];
}

const DEFAULT_COLORS = [
  "#f59e0b",
  "#3b82f6",
  "#22c55e",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

export function PieChartCard({ title, data }: PieChartProps) {
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-slate-800 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
          No hay datos disponibles
        </div>
      </div>
    );
  }

  const chartData = data.map((d, i) => ({
    ...d,
    fill: d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h3 className="font-semibold text-slate-800 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <RechartsPie>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={50}
            paddingAngle={3}
          >
            {chartData.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={chartData[index].fill} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [`${value}`, `${name}`]}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "13px",
            }}
          />
          <Legend
            verticalAlign="bottom"
            wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
          />
        </RechartsPie>
      </ResponsiveContainer>
    </div>
  );
}
