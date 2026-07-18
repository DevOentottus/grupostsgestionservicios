"use client";

import { type ReactNode } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "./popover";

type InfoVariant = "info" | "formula" | "tip" | "warning" | "mejora";

interface InfoPopoverProps {
  /** Texto breve de la fórmula o indicador (obligatorio) */
  formula: string;
  /** Descripción extendida del indicador */
  descripcion?: string;
  /** Tip o buena práctica opcional */
  tip?: string;
  /** Variante visual que cambia icono y color */
  variant?: InfoVariant;
  /** Título personalizado para la sección principal (default: según variant) */
  title?: string;
  /** Children extra opcionales para contenido adicional */
  children?: ReactNode;
  /** Lado del popover respecto al trigger */
  side?: "top" | "bottom" | "left" | "right";
}

const variantConfig: Record<InfoVariant, {
  icon: string;
  label: string;
  defaultTitle: string;
  triggerClass: string;
  headerClass: string;
}> = {
  formula: {
    icon: "∑",
    label: "Ver fórmula del indicador",
    defaultTitle: "Fórmula",
    triggerClass: "bg-slate-200 hover:bg-slate-300 text-slate-600",
    headerClass: "text-blue-700",
  },
  info: {
    icon: "i",
    label: "Más información",
    defaultTitle: "Información",
    triggerClass: "bg-blue-100 hover:bg-blue-200 text-blue-700",
    headerClass: "text-blue-700",
  },
  tip: {
    icon: "✦",
    label: "Ver recomendación",
    defaultTitle: "Recomendación",
    triggerClass: "bg-amber-100 hover:bg-amber-200 text-amber-700",
    headerClass: "text-amber-700",
  },
  warning: {
    icon: "⚠",
    label: "Ver advertencia",
    defaultTitle: "Precaución",
    triggerClass: "bg-red-100 hover:bg-red-200 text-red-700",
    headerClass: "text-red-700",
  },
  mejora: {
    icon: "↑",
    label: "Ver sugerencia de mejora",
    defaultTitle: "Mejora continua",
    triggerClass: "bg-emerald-100 hover:bg-emerald-200 text-emerald-700",
    headerClass: "text-emerald-700",
  },
};

export function InfoPopover({
  formula,
  descripcion,
  tip,
  variant = "info",
  title,
  children,
  side = "top",
}: InfoPopoverProps) {
  const cfg = variantConfig[variant];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold leading-none cursor-pointer transition-all shrink-0 shadow-xs hover:shadow-sm active:scale-95 ${cfg.triggerClass}`}
          aria-label={cfg.label}
        >
          {cfg.icon}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align="center"
        className="w-80 p-0 text-xs bg-white border border-slate-200 shadow-lg rounded-xl overflow-hidden"
      >
        {/* Header con color según variante */}
        <div className={`px-4 py-2 font-semibold text-[11px] uppercase tracking-wider ${cfg.headerClass} bg-slate-50/80 border-b border-slate-100`}>
          {title ?? cfg.defaultTitle}
        </div>

        {/* Cuerpo */}
        <div className="px-4 py-3 space-y-2">
          <p className="text-slate-700 leading-relaxed text-[12.5px]">{formula}</p>

          {descripcion && (
            <div className="border-t border-slate-100 pt-2">
              <p className="font-medium text-slate-600 text-[11px] mb-0.5">Indicador</p>
              <p className="text-slate-500 leading-relaxed text-[12px]">{descripcion}</p>
            </div>
          )}

          {tip && (
            <div className="border-t border-slate-100 pt-2">
              <p className="font-medium text-slate-600 text-[11px] mb-0.5">Buena práctica</p>
              <p className="text-slate-500 leading-relaxed text-[12px]">{tip}</p>
            </div>
          )}

          {children && (
            <div className="border-t border-slate-100 pt-2">
              {children}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
