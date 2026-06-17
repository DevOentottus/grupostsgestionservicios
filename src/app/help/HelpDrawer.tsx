import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { RolBadge } from "./RolBadge";
import { getHelpContent, getHelpScreenshot, pageExistsInRegistry } from "./help-content";
import type { Rol } from "./help-types";

interface HelpDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getPageTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const mainSegment = segments[0] || "dashboard";
  const titles: Record<string, string> = {
    dashboard: "Dashboard",
    miarea: "Mi Área",
    misservicios: "Mis Servicios",
    servicios: "Servicios",
    plantillas: "Plantillas",
    areas: "Áreas",
    usuarios: "Usuarios",
    reportes: "Reportes",
    auditoria: "Auditoría",
    comunicaciones: "Comunicaciones",
    manager: "Gestión",
    display: "Pantallas",
  };
  return titles[mainSegment] || "Dashboard";
}

export function HelpDrawer({ open, onOpenChange }: HelpDrawerProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRol = (user?.rol ?? "colaborador") as Rol;
  const pageTitle = getPageTitle(location.pathname);

  const content = getHelpContent(location.pathname, userRol);
  const pageExists = pageExistsInRegistry(location.pathname);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-[400px] w-full p-0 gap-0"
        aria-describedby={undefined}
      >
        <SheetHeader className="bg-yellow-50 border-b border-yellow-200 p-4">
          <div className="flex items-center justify-between gap-2 pr-8">
            <SheetTitle className="text-lg font-semibold">
              Ayuda: {pageTitle}
            </SheetTitle>
            <RolBadge rol={userRol} />
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)] p-6">
          {content ? (
            <div className="space-y-6">
              {/* Screenshot principal de la página */}
              {(() => {
                const imgSrc = getHelpScreenshot(location.pathname, userRol);
                if (!imgSrc) return null;
                return (
                  <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                    <img
                      src={imgSrc}
                      alt={`Captura de ${pageTitle}`}
                      className="w-full h-auto"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                );
              })()}

              {/* TOC -- Índice de secciones */}
              {content.sections.length > 1 && (
                <nav className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    En esta guía:
                  </h4>
                  <ul className="space-y-1">
                    {content.sections.map((section) => (
                      <li key={section.id}>
                        <button
                          onClick={() => {
                            document
                              .getElementById(section.id)
                              ?.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              });
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline text-left focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 rounded px-1"
                        >
                          {section.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
              {content.sections.map((section) => (
                <section key={section.id} id={section.id}>
                  <h3 className="text-base font-semibold text-gray-900 mb-3">
                    {section.title}
                  </h3>
                  <ol className="space-y-3 list-none pl-0">
                    {section.steps.map((step) => (
                      <li key={step.number} className="text-sm text-gray-600">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-medium mr-2 shrink-0">
                          {step.number}
                        </span>
                        <span>{step.description}</span>
                        {step.note && (
                          <p className="mt-1 text-xs text-gray-400 italic ml-8">
                            {step.note}
                          </p>
                        )}
                        {step.image && (
                          <img
                            src={step.image}
                            alt=""
                            className="mt-2 rounded-lg border border-gray-200 w-full"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          ) : pageExists ? (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <p className="text-gray-500 text-sm">
                No hay ayuda específica para tu rol en esta página
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12 px-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Bienvenido a ServicioLocalSTS
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                No hay ayuda específica para esta página. Probá con estas
                secciones:
              </p>
              <div className="flex flex-col gap-2 w-full max-w-[240px]">
                {userRol === "admin" && (
                  <button
                    onClick={() => {
                      navigate("/dashboard");
                      onOpenChange(false);
                    }}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
                  >
                    Dashboard
                  </button>
                )}
                <button
                  onClick={() => {
                    navigate("/miarea");
                    onOpenChange(false);
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
                >
                  Mi Área
                </button>
                <button
                  onClick={() => {
                    navigate("/servicios");
                    onOpenChange(false);
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
                >
                  Servicios
                </button>
                <button
                  onClick={() => {
                    navigate("/plantillas");
                    onOpenChange(false);
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
                >
                  Plantillas
                </button>
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
