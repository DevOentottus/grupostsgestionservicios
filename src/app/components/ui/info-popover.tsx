"use client";

import { Popover, PopoverTrigger, PopoverContent } from "./popover";

export function InfoPopover({ formula, descripcion }: { formula: string; descripcion?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-200 hover:bg-slate-300 text-[9px] font-bold text-slate-600 leading-none cursor-pointer transition-colors shrink-0"
          aria-label="Ver fórmula del indicador"
        >
          i
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        className="w-72 p-3 text-xs bg-white border border-slate-200 shadow-lg rounded-lg"
      >
        <p className="font-semibold text-slate-700 text-[11px] mb-1">Fórmula</p>
        <p className="text-slate-600 leading-relaxed">{formula}</p>
        {descripcion && (
          <>
            <div className="border-t border-slate-100 my-2" />
            <p className="font-semibold text-slate-700 text-[11px] mb-1">Indicador</p>
            <p className="text-slate-500 leading-relaxed">{descripcion}</p>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
