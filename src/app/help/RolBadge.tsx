import { Badge } from "@/app/components/ui/badge";
import type { Rol } from "./help-types";
import { cn } from "@/app/lib/utils";

interface RolBadgeProps {
  rol: Rol;
}

const rolStyles: Record<Rol, string> = {
  sistema: "bg-purple-100 text-purple-800 hover:bg-purple-100 border-transparent",
  admin: "bg-blue-100 text-blue-800 hover:bg-blue-100 border-transparent",
  encargado: "bg-orange-100 text-orange-800 hover:bg-orange-100 border-transparent",
  colaborador: "bg-green-100 text-green-800 hover:bg-green-100 border-transparent",
};

const rolLabels: Record<Rol, string> = {
  sistema: "Sistema",
  admin: "Administrador",
  encargado: "Encargado",
  colaborador: "Colaborador",
};

export function RolBadge({ rol }: RolBadgeProps) {
  return (
    <Badge className={cn(rolStyles[rol])}>
      {rolLabels[rol]}
    </Badge>
  );
}
