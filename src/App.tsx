import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth.js";
import { LoginPage } from "@/app/pages/login/Login.js";
import { DashboardPage } from "@/app/pages/seguimiento/Dashboard.js";
import { ServiciosPage } from "@/app/pages/servicios/Servicios.js";
import { ServicioDetailPage } from "@/app/pages/servicios/ServicioDetail.js";
import { UsuariosPage } from "@/app/pages/usuarios/Usuarios.js";
import { AreasPage } from "@/app/pages/areas/Areas.js";
import { AreaServiciosPage } from "@/app/pages/areas/AreaServicios.js";
import { PlantillasPage } from "@/app/pages/plantillas/Plantillas.js";
import { AuditoriaPage } from "@/app/pages/auditoria/Auditoria.js";
import { ReportesPage } from "@/app/pages/reportes/Reportes.js";
import { DisplayTVPage } from "@/app/pages/display/DisplayTV.js";
import { DisplayWaitingRoomPage } from "@/app/pages/display/DisplayWaitingRoom.js";
import { DisplayWorkRoomPage } from "@/app/pages/display/DisplayWorkRoom.js";
import { ServicioPublicoPage } from "@/app/pages/servicios/ServicioPublico.js";
import { ManagerAreaPage } from "@/app/pages/manager/ManagerArea.js";
import { ManagerDistribucionPage } from "@/app/pages/manager/ManagerDistribucion.js";
import { ManagerDesempenoPage } from "@/app/pages/manager/ManagerDesempeno.js";
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
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/display/tv" element={<DisplayTVPage />} />
        <Route path="/display/waiting-room" element={<DisplayWaitingRoomPage />} />
        <Route path="/display/work-room" element={<DisplayWorkRoomPage />} />
        <Route path="/public/servicio/:codigo" element={<ServicioPublicoPage />} />

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
          <Route path="areas" element={<AreasPage />} />
          <Route path="areas/:id/servicios" element={<AreaServiciosPage />} />
          <Route path="plantillas" element={<PlantillasPage />} />
          <Route path="auditoria" element={<AuditoriaPage />} />
          <Route path="reportes" element={<ReportesPage />} />
          <Route path="manager/mi-area" element={<ManagerAreaPage />} />
          <Route path="manager/distribucion" element={<ManagerDistribucionPage />} />
          <Route path="manager/desempeno" element={<ManagerDesempenoPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
