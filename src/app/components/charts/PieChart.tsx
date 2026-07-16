import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

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

/** Renderiza el valor numérico en el centroide de cada porción del donut. */
function renderInlineLabel(props: any) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, value } = props;
  // Ocultar etiquetas en porciones muy pequeñas (< 4%)
  if (percent < 0.04) return null;

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={700}
      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
    >
      {value}
    </text>
  );
}

export function PieChartCard({ title, data }: PieChartProps) {
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
      <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-4">{title}</h3>
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

  const total = chartData.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h3 className="font-semibold text-slate-800 mb-4">{title}</h3>
      <div className="relative">
        <ResponsiveContainer width="100%" height={240}>
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
              label={renderInlineLabel}
              labelLine={false}
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
          </RechartsPie>
        </ResponsiveContainer>
        {/* Total en el centro del donut */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">{total}</p>
            <p className="text-xs text-slate-500">servicios</p>
          </div>
        </div>
      </div>
      {/* Divisor entre gráfico y leyenda */}
      <hr className="-mx-6 mt-4 border-t border-slate-200" />
      {/* Leyenda fuera del SVG */}
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 pt-3 text-xs">
        {chartData.map((entry) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: entry.fill }}
            />
            <span className="text-slate-600">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
