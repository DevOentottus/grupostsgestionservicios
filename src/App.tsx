import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth.js";
import { LoginPage } from "@/app/pages/login/Login.js";
import { DashboardPage } from "@/app/pages/seguimiento/Dashboard.js";
import { ServiciosPage } from "@/app/pages/servicios/Servicios.js";
import { ServicioDetailPage } from "@/app/pages/servicios/ServicioDetail.js";
import { UsuariosPage } from "@/app/pages/usuarios/Usuarios.js";
import { Layout } from "@/app/layout/Layout.js";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="servicios" element={<ServiciosPage />} />
          <Route path="servicios/:id" element={<ServicioDetailPage />} />
          <Route path="usuarios" element={<UsuariosPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
