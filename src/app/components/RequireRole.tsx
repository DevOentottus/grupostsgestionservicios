import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth.js";
import { toast } from "sonner";

interface RequireRoleProps {
  roles: string[];
  children: React.ReactNode;
}

export function RequireRole({ roles, children }: RequireRoleProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Sistema (super-admin) tiene acceso a todo
  if (!user || (user.rol !== "sistema" && !roles.includes(user.rol))) {
    toast.error("No tenés permisos para acceder a esta sección");
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
