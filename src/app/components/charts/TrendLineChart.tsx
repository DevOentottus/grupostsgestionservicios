import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface TrendDatum {
  label: string;
  valor: number;
  valor2?: number;
}

interface TrendLineChartProps {
  title: string;
  data: TrendDatum[];
  lineLabel?: string;
  line2Label?: string;
  lineColor?: string;
  line2Color?: string;
}

export function TrendLineChart({
  title,
  data,
  lineLabel = "Valor",
  line2Label,
  lineColor = "#3b82f6",
  line2Color = "#22c55e",
}: TrendLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-slate-800 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
          No hay datos de tendencia disponibles
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h3 className="font-semibold text-slate-800 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
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
          <Line
            type="monotone"
            dataKey="valor"
            stroke={lineColor}
            strokeWidth={2}
            dot={{ r: 3, fill: lineColor }}
            name={lineLabel}
          />
          {data[0]?.valor2 !== undefined && (
            <Line
              type="monotone"
              dataKey="valor2"
              stroke={line2Color}
              strokeWidth={2}
              dot={{ r: 3, fill: line2Color }}
              name={line2Label}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
