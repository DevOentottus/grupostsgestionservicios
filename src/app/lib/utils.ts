import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea minutos a "Xh Ymin" si >= 60, o "Xmin" si < 60. */
export function formatMinutos(minutos: number | null | undefined): string {
  if (minutos == null || isNaN(minutos)) return "—";
  if (minutos < 60) return `${minutos}min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
