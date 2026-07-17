import { CalendarDays } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface Preset {
  label: string;
  active: boolean;
  action: () => void;
}

interface DateFilterCardProps {
  presets: Preset[];
  fechaInicio: string;
  fechaFin: string;
  periodoLabel: string;
  onFechaInicio: (val: string) => void;
  onFechaFin: (val: string) => void;
  onLabelChange: (label: string) => void;
}

export function DateFilterCard({
  presets,
  fechaInicio,
  fechaFin,
  periodoLabel,
  onFechaInicio,
  onFechaFin,
  onLabelChange,
}: DateFilterCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-x-2 gap-y-2">
      <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={p.action}
            className={cn(
              "text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
              p.active
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 w-full sm:w-auto">
        <input
          type="date"
          value={fechaInicio}
          onChange={(e) => {
            const v = e.target.value;
            onFechaInicio(v);
            if (!fechaFin) onFechaFin(v);
            onLabelChange("Personalizado");
          }}
          className="flex-1 sm:flex-none text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 min-w-0"
        />
        <span className="text-xs text-slate-400 shrink-0">→</span>
        <input
          type="date"
          value={fechaFin}
          onChange={(e) => {
            const v = e.target.value;
            onFechaFin(v);
            if (!fechaInicio) onFechaInicio(v);
            onLabelChange("Personalizado");
          }}
          className="flex-1 sm:flex-none text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 min-w-0"
        />
        {periodoLabel !== "Sin filtro" && (
          <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">{periodoLabel}</span>
        )}
      </div>
    </div>
  );
}
