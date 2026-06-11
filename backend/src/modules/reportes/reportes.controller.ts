import { FastifyInstance } from "fastify";
import { supabase } from "@/lib/supabase.js";
import { ValidationError, ForbiddenError } from "@/core/errors/index.js";
import { requireRoles } from "@/core/middleware/auth.js";
import { z } from "zod";

export async function reportesController(app: FastifyInstance) {
  // NOTA: No usar app.addHook + route-level preHandler combinados en serverless/emit (causa timeout).

  // ── GET /api/reportes/colaborador ──
  app.get(
    "/api/reportes/colaborador",
    { preHandler: [requireRoles("admin", "encargado")] },
    async (request) => {
      const user = request.user as {
        user_id: number;
        rol: string;
        area_id: number | null;
      };
      const query = request.query as {
        fecha_inicio?: string;
        fecha_fin?: string;
        usuario_id?: string;
      };

      const usuarioId = query.usuario_id ? parseInt(query.usuario_id) : undefined;
      const fechaInicio = query.fecha_inicio ? new Date(query.fecha_inicio) : undefined;
      const fechaFin = query.fecha_fin ? new Date(query.fecha_fin) : undefined;

      // Si es encargado, solo ve colaboradores de su área
      if (user.rol === "encargado" && user.area_id) {
        const { data: areas } = await supabase
          .from("areas")
          .select("area_encargado_id")
          .eq("area_id", user.area_id)
          .limit(1);

        const area = areas?.[0];
        if (!area || area.area_encargado_id !== user.user_id) {
          throw new ForbiddenError("No tienes acceso a este reporte");
        }
      }

      if (usuarioId) {
        const { data: usuarios } = await supabase
          .from("usuarios")
          .select("usuario_id, usuario_nombres, usuario_apellido_paterno, usuario_apellido_materno, usuario_correo")
          .eq("usuario_id", usuarioId)
          .limit(1);

        if (!usuarios?.length) throw new ValidationError("Usuario no encontrado");
        const usuario = usuarios[0];

        // Contar tareas completadas en el período
        let tareasQuery = supabase
          .from("tareas")
          .select("*", { count: "exact", head: true })
          .eq("tarea_completado_por", usuarioId)
          .eq("tarea_estado", "completado");

        if (fechaInicio) {
          tareasQuery = tareasQuery.gte("tarea_fecha_completado", fechaInicio.toISOString().split("T")[0]);
        }
        if (fechaFin) {
          tareasQuery = tareasQuery.lte("tarea_fecha_completado", fechaFin.toISOString().split("T")[0]);
        }

        const { count: tareasCompletadas } = await tareasQuery;

        // Servicios donde el colaborador participó
        const { count: serviciosCompletados } = await supabase
          .from("servicios")
          .select("servicio_id", { count: "exact", head: true })
          .eq("colaborador_id", usuarioId);

        return {
          data: {
            colaborador: {
              id: usuario.usuario_id,
              nombres: usuario.usuario_nombres,
              apellidos: [usuario.usuario_apellido_paterno, usuario.usuario_apellido_materno]
                .filter(Boolean).join(" "),
              email: usuario.usuario_correo,
            },
            servicios_completados: serviciosCompletados || 0,
            tareas_completadas: tareasCompletadas || 0,
            tiempo_promedio_min: 0, // tiempo_tracking no disponible
            eficiencia: 0, // no hay datos de tiempo estimado
            periodo: {
              desde: fechaInicio?.toISOString() || null,
              hasta: fechaFin?.toISOString() || null,
            },
          },
        };
      } else {
        // Reporte general: todos los colaboradores que completaron tareas
        const { data: tareasData } = await supabase
          .from("tareas")
          .select(`
            tarea_completado_por,
            usuarios!tareas_tarea_completado_por_fkey (
              usuario_id,
              usuario_nombres,
              usuario_apellido_paterno,
              usuario_apellido_materno
            )
          `)
          .eq("tarea_estado", "completado");

        // Agrupar en memoria
        const grouped: Record<number, any> = {};
        for (const t of tareasData || []) {
          const id = t.tarea_completado_por;
          if (!id) continue;
          if (!grouped[id]) {
            const u = (t as any).usuarios || {};
            grouped[id] = {
              usuario_id: id,
              nombres: u.usuario_nombres || null,
              apellidos: [u.usuario_apellido_paterno, u.usuario_apellido_materno]
                .filter(Boolean).join(" "),
              tareas_completadas: 0,
            };
          }
          grouped[id].tareas_completadas++;
        }

        const colaboradores = Object.values(grouped).sort(
          (a: any, b: any) => b.tareas_completadas - a.tareas_completadas
        );

        return {
          data: {
            colaboradores,
            total_colaboradores: colaboradores.length,
            periodo: {
              desde: fechaInicio?.toISOString() || null,
              hasta: fechaFin?.toISOString() || null,
            },
          },
        };
      }
    }
  );

  // ── GET /api/reportes/area ──
  app.get(
    "/api/reportes/area",
    { preHandler: [requireRoles("admin", "encargado")] },
    async (request) => {
      const user = request.user as {
        user_id: number;
        rol: string;
        area_id: number | null;
      };
      const query = request.query as {
        fecha_inicio?: string;
        fecha_fin?: string;
        area_id?: string;
      };

      const areaId = query.area_id ? parseInt(query.area_id) : undefined;
      const fechaInicio = query.fecha_inicio ? new Date(query.fecha_inicio) : undefined;
      const fechaFin = query.fecha_fin ? new Date(query.fecha_fin) : undefined;

      if (user.rol === "encargado" && user.area_id && areaId && areaId !== user.area_id) {
        throw new ForbiddenError("Solo puedes ver reportes de tu área");
      }
      const effectiveAreaId = user.rol === "encargado" ? user.area_id : areaId;

      if (effectiveAreaId) {
        const { data: areas } = await supabase
          .from("areas")
          .select("*")
          .eq("area_id", effectiveAreaId)
          .limit(1);

        if (!areas?.length) throw new ValidationError("Área no encontrada");
        const area = areas[0];

        // Contar servicios por estado en el área
        let serviciosQuery = supabase
          .from("servicios")
          .select("servicio_estado")
          .eq("area_id", effectiveAreaId);

        if (fechaInicio) {
          serviciosQuery = serviciosQuery.gte("servicio_fecha_creacion", fechaInicio.toISOString().split("T")[0]);
        }
        if (fechaFin) {
          serviciosQuery = serviciosQuery.lte("servicio_fecha_creacion", fechaFin.toISOString().split("T")[0]);
        }

        const { data: servicios } = await serviciosQuery;
        const totalServicios = servicios?.length || 0;
        const completados = servicios?.filter((s: any) => s.servicio_estado === "completado").length || 0;

        // Tendencias mensuales (agrupar en memoria)
        const tendenciasMap: Record<string, { creados: number; completados: number }> = {};
        for (const s of servicios || []) {
          const fecha = (s as any).servicio_fecha_creacion;
          if (!fecha) continue;
          const mes = fecha.substring(0, 7); // YYYY-MM
          if (!tendenciasMap[mes]) {
            tendenciasMap[mes] = { creados: 0, completados: 0 };
          }
          tendenciasMap[mes].creados++;
          if ((s as any).servicio_estado === "completado") {
            tendenciasMap[mes].completados++;
          }
        }

        const tendencias = Object.entries(tendenciasMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([mes, datos]) => ({ mes, ...datos }));

        return {
          data: {
            area: { id: area.area_id, nombre: area.area_nombre },
            productividad: totalServicios > 0 ? Math.round((completados / totalServicios) * 100) : 0,
            total_servicios: totalServicios,
            completados,
            tiempo_promedio_min: 0, // tiempo_tracking no disponible
            tendencias,
            periodo: {
              desde: fechaInicio?.toISOString() || null,
              hasta: fechaFin?.toISOString() || null,
            },
          },
        };
      } else {
        // Reporte general: todas las áreas
        let areasQuery = supabase
          .from("servicios")
          .select(`
            area_id,
            servicio_estado,
            areas!servicios_area_id_fkey (
              area_id,
              area_nombre
            )
          `);

        if (fechaInicio) {
          areasQuery = areasQuery.gte("servicio_fecha_creacion", fechaInicio.toISOString().split("T")[0]);
        }
        if (fechaFin) {
          areasQuery = areasQuery.lte("servicio_fecha_creacion", fechaFin.toISOString().split("T")[0]);
        }

        const { data: rows } = await areasQuery;

        // Agrupar en memoria
        const grouped: Record<number, any> = {};
        for (const r of rows || []) {
          const a = (r as any).areas || {};
          const id = (r as any).area_id;
          if (!id) continue;
          if (!grouped[id]) {
            grouped[id] = {
              area_id: id,
              nombre: a.area_nombre || `Área #${id}`,
              total: 0,
              completados: 0,
            };
          }
          grouped[id].total++;
          if ((r as any).servicio_estado === "completado") {
            grouped[id].completados++;
          }
        }

        const areas = Object.values(grouped).sort(
          (a: any, b: any) => b.total - a.total
        );

        return {
          data: {
            areas,
            total_areas: areas.length,
            periodo: {
              desde: fechaInicio?.toISOString() || null,
              hasta: fechaFin?.toISOString() || null,
            },
          },
        };
      }
    }
  );

  // ── GET /api/reportes/exportar/:tipo/:formato ──
  app.get(
    "/api/reportes/exportar/:tipo/:formato",
    { preHandler: [requireRoles("admin", "encargado")] },
    async (request, reply) => {
      const user = request.user as {
        user_id: number;
        rol: string;
        area_id: number | null;
      };
      const params = request.params as { tipo: string; formato: string };
      const query = request.query as {
        fecha_inicio?: string;
        fecha_fin?: string;
        area_id?: string;
        usuario_id?: string;
      };

      const { tipo, formato } = params;

      if (!["colaborador", "area"].includes(tipo)) {
        throw new ValidationError("Tipo debe ser 'colaborador' o 'area'");
      }
      if (!["xlsx", "pdf"].includes(formato)) {
        throw new ValidationError("Formato debe ser 'xlsx' o 'pdf'");
      }

      const fechaInicio = query.fecha_inicio
        ? new Date(query.fecha_inicio)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const fechaFin = query.fecha_fin ? new Date(query.fecha_fin) : new Date();

      let title: string;
      let headers: string[];
      let rows: string[][];

      if (tipo === "colaborador") {
        title = "Reporte de Colaboradores";
        headers = ["Colaborador", "Tareas Completadas", "Tiempo Promedio (min)", "Eficiencia (%)"];

        const { data: tareasData } = await supabase
          .from("tareas")
          .select(`
            tarea_completado_por,
            usuarios!tareas_tarea_completado_por_fkey (
              usuario_nombres,
              usuario_apellido_paterno
            )
          `)
          .eq("tarea_estado", "completado")
          .gte("tarea_fecha_completado", fechaInicio.toISOString().split("T")[0])
          .lte("tarea_fecha_completado", fechaFin.toISOString().split("T")[0]);

        const grouped: Record<number, { nombre: string; count: number }> = {};
        for (const t of tareasData || []) {
          const id = t.tarea_completado_por;
          if (!id) continue;
          const u = (t as any).usuarios || {};
          if (!grouped[id]) {
            grouped[id] = {
              nombre: `${u.usuario_nombres || ""} ${u.usuario_apellido_paterno || ""}`.trim(),
              count: 0,
            };
          }
          grouped[id].count++;
        }

        rows = Object.entries(grouped).map(([id, data]) => [
          data.nombre || `Usuario #${id}`,
          String(data.count),
          "—",
          "—",
        ]);
      } else {
        title = "Reporte por Área";
        headers = ["Área", "Total Servicios", "Completados", "Productividad (%)"];

        const effectiveAreaFilter =
          user.rol === "encargado" && user.area_id
            ? user.area_id
            : query.area_id
              ? parseInt(query.area_id)
              : undefined;

        let serviciosQuery = supabase
          .from("servicios")
          .select(`
            servicio_estado,
            areas!servicios_area_id_fkey (
              area_nombre
            )
          `);

        if (effectiveAreaFilter) {
          serviciosQuery = serviciosQuery.eq("area_id", effectiveAreaFilter);
        }
        serviciosQuery = serviciosQuery
          .gte("servicio_fecha_creacion", fechaInicio.toISOString().split("T")[0])
          .lte("servicio_fecha_creacion", fechaFin.toISOString().split("T")[0]);

        const { data: svcs } = await serviciosQuery;

        const grouped: Record<string, { total: number; completados: number }> = {};
        for (const s of svcs || []) {
          const nombre = ((s as any).areas?.area_nombre) || "Sin área";
          if (!grouped[nombre]) {
            grouped[nombre] = { total: 0, completados: 0 };
          }
          grouped[nombre].total++;
          if ((s as any).servicio_estado === "completado") {
            grouped[nombre].completados++;
          }
        }

        rows = Object.entries(grouped).map(([nombre, datos]) => [
          nombre,
          String(datos.total),
          String(datos.completados),
          datos.total > 0 ? String(Math.round((datos.completados / datos.total) * 100)) : "0",
        ]);
      }

      if (formato === "xlsx") {
        await exportXLSX(reply, title, headers, rows);
      } else {
        await exportPDF(reply, title, headers, rows);
      }
    }
  );
}

async function exportXLSX(
  reply: any,
  title: string,
  headers: string[],
  rows: string[][]
) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet(title.slice(0, 31));

  worksheet.mergeCells(1, 1, 1, headers.length);
  const titleCell = worksheet.getCell("A1");
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: "center" };

  const headerRow = worksheet.getRow(2);
  headers.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h;
  });
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2563EB" },
  };
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

  rows.forEach((row, i) => {
    const rowNum = i + 3;
    row.forEach((val, j) => {
      worksheet.getCell(rowNum, j + 1).value = val;
    });
  });

  headers.forEach((_, i) => {
    const maxLen = Math.max(
      headers[i].length,
      ...rows.map((r) => (r[i] || "").length)
    );
    worksheet.getColumn(i + 1).width = Math.min(maxLen + 4, 40);
  });

  const buffer = await workbook.xlsx.writeBuffer();

  reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  reply.header(
    "Content-Disposition",
    `attachment; filename="${title.replace(/\s+/g, "_")}.xlsx"`
  );
  reply.send(buffer);
}

async function exportPDF(
  reply: any,
  title: string,
  headers: string[],
  rows: string[][]
) {
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({ margin: 30, size: "A4" });

  const buffers: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => buffers.push(chunk));
  doc.on("end", () => {
    const pdfBuffer = Buffer.concat(buffers);
    reply.header("Content-Type", "application/pdf");
    reply.header(
      "Content-Disposition",
      `attachment; filename="${title.replace(/\s+/g, "_")}.pdf"`
    );
    reply.send(pdfBuffer);
  });

  doc.fontSize(18).font("Helvetica-Bold").text(title, { align: "center" });
  doc.moveDown(1.5);

  doc.fontSize(10).font("Helvetica").text(`Generado: ${new Date().toLocaleDateString("es-PE")}`, { align: "right" });
  doc.moveDown(1);

  const colWidth = (doc.page.width - 60) / headers.length;
  const rowHeight = 20;

  let y = doc.y;
  doc.font("Helvetica-Bold").fontSize(9);
  headers.forEach((h, i) => {
    doc.rect(30 + i * colWidth, y, colWidth, rowHeight).fill("#2563EB");
    doc.fillColor("#FFFFFF").text(h, 30 + i * colWidth + 3, y + 5, {
      width: colWidth - 6,
      align: "left",
    });
    doc.fillColor("#000000");
  });

  doc.font("Helvetica").fontSize(8);
  rows.forEach((row) => {
    y += rowHeight;
    if (y > doc.page.height - 50) {
      doc.addPage();
      y = 30;
      doc.font("Helvetica-Bold").fontSize(9);
      headers.forEach((h, i) => {
        doc.rect(30 + i * colWidth, y, colWidth, rowHeight).fill("#2563EB");
        doc.fillColor("#FFFFFF").text(h, 30 + i * colWidth + 3, y + 5, {
          width: colWidth - 6,
          align: "left",
        });
        doc.fillColor("#000000");
      });
      y += rowHeight;
      doc.font("Helvetica").fontSize(8);
    }

    const rowIdx = rows.indexOf(row);
    if (rowIdx % 2 === 0) {
      doc.rect(30, y, doc.page.width - 60, rowHeight).fill("#F1F5F9");
    }

    doc.fillColor("#000000");
    row.forEach((val, i) => {
      doc.text(val, 30 + i * colWidth + 3, y + 5, {
        width: colWidth - 6,
        align: "left",
      });
    });
  });

  doc.end();
}

