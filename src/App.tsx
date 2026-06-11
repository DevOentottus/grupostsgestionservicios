import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth.js";
import { ErrorBoundary } from "@/app/components/ErrorBoundary.js";
import { RequireAuth } from "@/app/components/RequireAuth.js";
import { RequireRole } from "@/app/components/RequireRole.js";
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
import { MonitorPage } from "@/app/pages/monitor/Monitor.js";
import { SolicitudesInternasPage } from "@/app/pages/solicitudes/SolicitudesInternas.js";
import { AnunciosPage } from "@/app/pages/anuncios/Anuncios.js";
import { ComunicacionesPage } from "@/app/pages/comunicaciones/Comunicaciones.js";
import { RendimientoSistemaPage } from "@/app/pages/admin/RendimientoSistema.js";
import { DisplayTVPage } from "@/app/pages/display/DisplayTV.js";
import { DisplayWaitingRoomPage } from "@/app/pages/display/DisplayWaitingRoom.js";
import { DisplayWorkRoomPage } from "@/app/pages/display/DisplayWorkRoom.js";
import { ServicioPublicoPage } from "@/app/pages/servicios/ServicioPublico.js";
import { ManagerDistribucionPage } from "@/app/pages/manager/ManagerDistribucion.js";
import { ManagerDesempenoPage } from "@/app/pages/manager/ManagerDesempeno.js";
import { MiAreaPage } from "@/app/pages/miarea/MiArea.js";
import Layout from "@/app/layout/Layout.js";

/** Redirige según el rol del usuario autenticado */
function IndexRedirect() {
  const { user } = useAuth();
  const destino = user?.rol === "colaborador" ? "/miarea" : "/dashboard";
  return <Navigate to={destino} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/display/tv" element={<DisplayTVPage />} />
        <Route path="/display/waiting-room" element={<DisplayWaitingRoomPage />} />
        <Route path="/display/work-room" element={<DisplayWorkRoomPage />} />
        <Route path="/public/servicio/:codigo" element={<ServicioPublicoPage />} />

        {/* Protected routes — wrapped in RequireAuth */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<IndexRedirect />} />
          <Route path="dashboard" element={
            <RequireRole roles={["admin", "encargado"]}>
              <DashboardPage />
            </RequireRole>
          } />
          <Route path="miarea" element={<MiAreaPage />} />
          <Route path="servicios" element={<ServiciosPage />} />
          <Route path="servicios/:id" element={<ServicioDetailPage />} />
          <Route path="areas" element={
            <RequireRole roles={["admin"]}>
              <AreasPage />
            </RequireRole>
          } />
          <Route path="areas/:id/servicios" element={
            <RequireRole roles={["admin"]}>
              <AreaServiciosPage />
            </RequireRole>
          } />
          <Route path="plantillas" element={<PlantillasPage />} />
          <Route path="reportes" element={
            <RequireRole roles={["admin", "encargado"]}>
              <ReportesPage />
            </RequireRole>
          } />
          <Route path="solicitudes" element={<SolicitudesInternasPage />} />
          <Route path="anuncios" element={<AnunciosPage />} />
          <Route path="comunicaciones" element={<ComunicacionesPage />} />
          <Route path="monitor" element={<MonitorPage />} />

          {/* Admin only */}
          <Route path="admin/rendimiento" element={
            <RequireRole roles={["admin"]}>
              <RendimientoSistemaPage />
            </RequireRole>
          } />
          <Route path="usuarios" element={
            <RequireRole roles={["admin"]}>
              <UsuariosPage />
            </RequireRole>
          } />
          <Route path="auditoria" element={
            <RequireRole roles={["admin"]}>
              <AuditoriaPage />
            </RequireRole>
          } />

          {/* Encargado */}
          <Route path="manager/distribucion" element={
            <RequireRole roles={["admin"]}>
              <ManagerDistribucionPage />
            </RequireRole>
          } />
          <Route path="manager/desempeno" element={
            <RequireRole roles={["admin", "encargado"]}>
              <ManagerDesempenoPage />
            </RequireRole>
          } />
        </Route>
      </Routes>
      </ErrorBoundary>
    </AuthProvider>
  );
}
