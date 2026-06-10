import { useState, useCallback } from "react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, subDays } from "date-fns";

interface DateRangeFilterProps {
  fechaInicio: string;
  fechaFin: string;
  onChange: (inicio: string, fin: string) => void;
}

interface QuickOption {
  label: string;
  getRange: () => { inicio: Date; fin: Date };
}

const QUICK_OPTIONS: QuickOption[] = [
  {
    label: "Hoy",
    getRange: () => ({
      inicio: startOfDay(new Date()),
      fin: endOfDay(new Date()),
    }),
  },
  {
    label: "Esta semana",
    getRange: () => ({
      inicio: startOfWeek(new Date(), { weekStartsOn: 1 }),
      fin: endOfWeek(new Date(), { weekStartsOn: 1 }),
    }),
  },
  {
    label: "Este mes",
    getRange: () => ({
      inicio: startOfMonth(new Date()),
      fin: endOfMonth(new Date()),
    }),
  },
  {
    label: "Este trimestre",
    getRange: () => ({
      inicio: startOfQuarter(new Date()),
      fin: endOfQuarter(new Date()),
    }),
  },
  {
    label: "Últimos 7 días",
    getRange: () => ({
      inicio: startOfDay(subDays(new Date(), 7)),
      fin: endOfDay(new Date()),
    }),
  },
  {
    label: "Últimos 30 días",
    getRange: () => ({
      inicio: startOfDay(subDays(new Date(), 30)),
      fin: endOfDay(new Date()),
    }),
  },
];

export function DateRangeFilter({ fechaInicio, fechaFin, onChange }: DateRangeFilterProps) {
  const [showQuick, setShowQuick] = useState(false);

  const handleQuickSelect = useCallback(
    (option: QuickOption) => {
      const { inicio, fin } = option.getRange();
      onChange(format(inicio, "yyyy-MM-dd"), format(fin, "yyyy-MM-dd"));
      setShowQuick(false);
    },
    [onChange]
  );

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <label className="text-xs text-slate-500 font-medium">Desde:</label>
        <input
          type="date"
          value={fechaInicio}
          onChange={(e) => onChange(e.target.value, fechaFin)}
          className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div className="flex items-center gap-1">
        <label className="text-xs text-slate-500 font-medium">Hasta:</label>
        <input
          type="date"
          value={fechaFin}
          onChange={(e) => onChange(fechaInicio, e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowQuick(!showQuick)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
        >
          Rápido
        </button>
        {showQuick && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowQuick(false)}
            />
            <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[160px]">
              {QUICK_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => handleQuickSelect(opt)}
                  className="block w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
