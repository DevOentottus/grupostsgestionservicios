import {
  BarChart as RechartsBar,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface BarChartDatum {
  name: string;
  value: number;
  fill?: string;
}

interface BarChartProps {
  title: string;
  data: BarChartDatum[];
  valueLabel?: string;
  color?: string;
}

export function BarChartCard({ title, data, valueLabel = "Total", color = "#3b82f6" }: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-slate-800 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
          No hay datos disponibles
        </div>
      </div>
    );
  }

  const chartData = data.map((d) => ({ ...d, fill: d.fill || color }));

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h3 className="font-semibold text-slate-800 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <RechartsBar data={chartData}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [`${value}`, valueLabel]}
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
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </RechartsBar>
      </ResponsiveContainer>
    </div>
  );
}
