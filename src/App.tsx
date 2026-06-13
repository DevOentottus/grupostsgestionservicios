import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth.js";
import { ErrorBoundary } from "@/app/components/ErrorBoundary.js";
import { RequireAuth } from "@/app/components/RequireAuth.js";
import { RequireRole } from "@/app/components/RequireRole.js";
import { LoginPage } from "@/app/pages/login/Login.js";
import { DashboardPage } from "@/app/pages/seguimiento/Dashboard.js";
import { ServiciosPage } from "@/app/pages/servicios/Servicios.js";
import { NuevoServicioPage } from "@/app/pages/servicios/NuevoServicio.js";
import { ServicioDetailPage } from "@/app/pages/servicios/ServicioDetail.js";
import { UsuariosPage } from "@/app/pages/usuarios/Usuarios.js";
import { AreasPage } from "@/app/pages/areas/Areas.js";
import { AreaServiciosPage } from "@/app/pages/areas/AreaServicios.js";
import { PlantillasPage } from "@/app/pages/plantillas/Plantillas.js";
import { AuditoriaPage } from "@/app/pages/auditoria/Auditoria.js";
import { ReportesPage } from "@/app/pages/reportes/Reportes.js";
import { ComunicacionesPage } from "@/app/pages/comunicaciones/Comunicaciones.js";
import { RendimientoSistemaPage } from "@/app/pages/admin/RendimientoSistema.js";
import { DisplayTVPage } from "@/app/pages/display/DisplayTV.js";
import { ServicioPublicoPage } from "@/app/pages/servicios/ServicioPublico.js";
import { SeguimientoClientePage } from "@/app/pages/seguimiento/SeguimientoCliente.js";
import { ManagerClientesPage } from "@/app/pages/manager/ManagerClientes.js";
import { ManagerDesempenoPage } from "@/app/pages/manager/ManagerDesempeno.js";
import { MiAreaPage } from "@/app/pages/miarea/MiArea.js";
import Layout from "@/app/layout/Layout.js";

/** Redirige según el rol del usuario autenticado */
function IndexRedirect() {
  const { user } = useAuth();
  const destino = user?.rol === "colaborador" || user?.rol === "encargado" ? "/miarea" : "/dashboard";
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
        <Route path="/seguimiento-cliente" element={<SeguimientoClientePage />} />
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
            <RequireRole roles={["admin"]}>
              <DashboardPage />
            </RequireRole>
          } />
          <Route path="miarea" element={<MiAreaPage />} />
          <Route path="servicios" element={<ServiciosPage />} />
          <Route path="servicios/nuevo" element={<NuevoServicioPage />} />
          <Route path="servicios/:id" element={<ServicioDetailPage />} />
          <Route path="areas" element={
            <RequireRole roles={["admin", "sistema"]}>
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
          <Route path="comunicaciones" element={<ComunicacionesPage />} />
          {/* Admin only */}
          <Route path="admin/rendimiento" element={
            <RequireRole roles={["admin", "sistema"]}>
              <RendimientoSistemaPage />
            </RequireRole>
          } />
          <Route path="usuarios" element={
            <RequireRole roles={["sistema"]}>
              <UsuariosPage />
            </RequireRole>
          } />
          <Route path="auditoria" element={
            <RequireRole roles={["admin"]}>
              <AuditoriaPage />
            </RequireRole>
          } />

          {/* Gestión */}
          <Route path="manager/clientes" element={
            <RequireRole roles={["admin", "sistema"]}>
              <ManagerClientesPage />
            </RequireRole>
          } />
          <Route path="manager/desempeno" element={
            <RequireRole roles={["admin", "encargado", "sistema"]}>
              <ManagerDesempenoPage />
            </RequireRole>
          } />
        </Route>
      </Routes>
      </ErrorBoundary>
    </AuthProvider>
  );
}
