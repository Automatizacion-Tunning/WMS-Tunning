/**
 * Exportadores XLSX y PDF para el informe de proyecto.
 *
 * Decisiones de diseño:
 *  - Sanitizacion anti formula-injection en celdas XLSX (R10 del plan).
 *  - PDF muestra top-50 productos por valor cuando hay > 100 (D9 del plan).
 *  - Numeros se imprimen en formato es-CL (Intl.NumberFormat).
 *  - PDFKit se importa como default (esModuleInterop=true).
 */
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type { ProjectReport, ReportProduct } from "@shared/contracts/reports";

// ----------------------------------------------------------
// Helpers de formato
// ----------------------------------------------------------
const moneyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const intFormatter = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function fmtMoney(v: number | null | undefined): string {
  if (v == null) return "-";
  return moneyFormatter.format(v);
}
function fmtInt(v: number | null | undefined): string {
  if (v == null) return "-";
  return intFormatter.format(v);
}
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  return dateFormatter.format(new Date(iso));
}

/**
 * Mitiga formula injection en Excel: si una celda string empieza con
 * = + - @ TAB CR, la prefijamos con apostrofo para que se trate como texto.
 */
function safeText(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) return "'" + s;
  return s;
}

// ----------------------------------------------------------
// XLSX
// ----------------------------------------------------------
export async function exportReportToXlsx(report: ProjectReport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Control de Inventario";
  wb.created = new Date();
  wb.modified = new Date();

  const goldFill: ExcelJS.FillPattern = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF59E0B" },
  };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FF111111" } };

  // -------- Hoja 1: Resumen --------
  const ws1 = wb.addWorksheet("Resumen");
  ws1.columns = [
    { header: "Concepto", key: "k", width: 38 },
    { header: "Valor", key: "v", width: 32 },
  ];
  ws1.getRow(1).font = headerFont;
  ws1.getRow(1).fill = goldFill;
  ws1.addRows([
    { k: "Centro de costo", v: safeText(report.costCenter) },
    { k: "Generado", v: fmtDate(report.generatedAt) },
    {
      k: "Generado por",
      v: safeText(report.generatedBy.fullName ?? report.generatedBy.username),
    },
    { k: "Version informe", v: safeText(report.reportVersion) },
    { k: "Total productos", v: fmtInt(report.summary.totalProducts) },
    { k: "Cantidad total", v: fmtInt(report.summary.totalQuantity) },
    { k: "Valor total", v: fmtMoney(report.summary.totalValue) },
    { k: "Productos con stock", v: fmtInt(report.summary.productsWithStock) },
    { k: "Productos despachados", v: fmtInt(report.summary.productsDispatched) },
    { k: "Productos solo histórico", v: fmtInt(report.summary.productsOnlyHistoric) },
  ]);

  // -------- Hoja 2: Productos --------
  const ws2 = wb.addWorksheet("Productos");
  ws2.columns = [
    { header: "Nombre", key: "name", width: 40 },
    { header: "SKU", key: "sku", width: 18 },
    { header: "Cod. Barra", key: "barcode", width: 18 },
    { header: "Cod. ERP", key: "erp", width: 18 },
    { header: "Tipo", key: "type", width: 12 },
    { header: "Categoria", key: "cat", width: 18 },
    { header: "Marca", key: "brand", width: 18 },
    { header: "Unidad", key: "unit", width: 12 },
    { header: "Requiere serie", key: "rs", width: 14 },
    { header: "Stock total", key: "stock", width: 12 },
    { header: "Despachado", key: "disp", width: 12 },
    { header: "Precio actual", key: "price", width: 16 },
    { header: "Valor total", key: "value", width: 18 },
    { header: "Ult. entrada", key: "lin", width: 18 },
    { header: "Ult. salida", key: "lout", width: 18 },
    { header: "Entradas 12m", key: "i12", width: 14 },
    { header: "Salidas 12m", key: "o12", width: 14 },
    { header: "Series activas", key: "sa", width: 14 },
    { header: "Series vendidas", key: "ss", width: 14 },
    { header: "Series dañadas", key: "sd", width: 14 },
    { header: "Solo histórico", key: "oh", width: 14 },
    { header: "En tránsito", key: "it", width: 12 },
  ];
  ws2.getRow(1).font = headerFont;
  ws2.getRow(1).fill = goldFill;
  for (const p of report.products) {
    ws2.addRow({
      name: safeText(p.name),
      sku: safeText(p.sku),
      barcode: safeText(p.barcode),
      erp: safeText(p.erpProductCode),
      type: safeText(p.productType),
      cat: safeText(p.category),
      brand: safeText(p.brand),
      unit: safeText(p.unit?.abbreviation),
      rs: p.requiresSerial ? "Si" : "No",
      stock: p.stock.total,
      disp: p.stock.dispatched,
      price: p.pricing.currentPrice ?? null,
      value: p.pricing.totalValue,
      lin: fmtDate(p.movements.lastInDate),
      lout: fmtDate(p.movements.lastOutDate),
      i12: p.movements.totalInLast12Months,
      o12: p.movements.totalOutLast12Months,
      sa: p.serials.active,
      ss: p.serials.sold,
      sd: p.serials.damaged,
      oh: p.flags.onlyHistoric ? "Si" : "",
      it: p.flags.inTransit ? "Si" : "",
    });
  }
  // Formato moneda en columnas precio/valor
  ws2.getColumn("price").numFmt = '"$"#,##0';
  ws2.getColumn("value").numFmt = '"$"#,##0';

  // -------- Hoja 3: Desglose por bodega --------
  const ws3 = wb.addWorksheet("Desglose por bodega");
  ws3.columns = [
    { header: "Producto", key: "p", width: 40 },
    { header: "SKU", key: "sku", width: 18 },
    { header: "Bodega", key: "wh", width: 30 },
    { header: "Sub-bodega", key: "sub", width: 18 },
    { header: "Cantidad", key: "q", width: 12 },
  ];
  ws3.getRow(1).font = headerFont;
  ws3.getRow(1).fill = goldFill;
  for (const p of report.products) {
    if (p.stock.byWarehouse.length === 0 && p.stock.dispatched === 0) continue;
    for (const sb of p.stock.byWarehouse) {
      ws3.addRow({
        p: safeText(p.name),
        sku: safeText(p.sku),
        wh: safeText(sb.warehouseName),
        sub: safeText(sb.subWarehouseType ?? "principal"),
        q: sb.quantity,
      });
    }
    if (p.stock.dispatched > 0) {
      ws3.addRow({
        p: safeText(p.name),
        sku: safeText(p.sku),
        wh: "(Despacho)",
        sub: "despacho",
        q: p.stock.dispatched,
      });
    }
  }

  // -------- Hoja 4: Ordenes de Compra --------
  const ws4 = wb.addWorksheet("Ordenes de compra");
  ws4.columns = [
    { header: "Producto", key: "p", width: 40 },
    { header: "SKU", key: "sku", width: 18 },
    { header: "OC", key: "oc", width: 18 },
    { header: "Linea", key: "ln", width: 8 },
    { header: "Cant. ordenada", key: "co", width: 14 },
    { header: "Cant. recibida", key: "cr", width: 14 },
    { header: "% recepcion", key: "pc", width: 12 },
    { header: "Precio unitario", key: "pu", width: 16 },
    { header: "Fecha entrega", key: "fe", width: 18 },
    { header: "Fecha recep. bodega", key: "fr", width: 22 },
  ];
  ws4.getRow(1).font = headerFont;
  ws4.getRow(1).fill = goldFill;
  for (const p of report.products) {
    for (const oc of p.purchaseOrders) {
      ws4.addRow({
        p: safeText(p.name),
        sku: safeText(p.sku),
        oc: safeText(oc.purchaseOrderNumber),
        ln: oc.purchaseOrderLine,
        co: oc.orderedQuantity,
        cr: oc.receivedQuantity,
        pc: `${oc.receptionPercentage}%`,
        pu: oc.unitPrice ?? null,
        fe: fmtDate(oc.deliveryDate),
        fr: fmtDate(oc.warehouseReceptionDate),
      });
    }
  }
  ws4.getColumn("pu").numFmt = '"$"#,##0';

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer as ArrayBuffer);
}

// ----------------------------------------------------------
// PDF
// ----------------------------------------------------------
const PDF_TOP_LIMIT = 50;
const PDF_TOP_THRESHOLD = 100;

export async function exportReportToPdf(report: ProjectReport): Promise<Buffer> {
  // Decidir si listamos top-50 (cuando hay muchos productos)
  const products = [...report.products];
  let productsToShow: ReportProduct[] = products;
  let truncated = false;
  if (products.length > PDF_TOP_THRESHOLD) {
    productsToShow = products
      .slice()
      .sort((a, b) => b.pricing.totalValue - a.pricing.totalValue)
      .slice(0, PDF_TOP_LIMIT);
    truncated = true;
  }

  return await new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margins: { top: 60, bottom: 50, left: 40, right: 40 },
      });
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header recurrente
      const drawHeader = () => {
        doc
          .fontSize(14)
          .fillColor("#111")
          .text(`Informe de Proyecto: ${safeText(report.costCenter)}`, 40, 28, { align: "left" });
        doc
          .fontSize(9)
          .fillColor("#444")
          .text(`Generado: ${fmtDate(report.generatedAt)}`, 40, 46)
          .text(
            `Por: ${safeText(report.generatedBy.fullName ?? report.generatedBy.username)}`,
            300,
            46
          )
          .text(`Version: ${safeText(report.reportVersion)}`, 600, 46);
        // linea divisoria dorada
        doc
          .moveTo(40, 60)
          .lineTo(800, 60)
          .strokeColor("#F59E0B")
          .lineWidth(1)
          .stroke();
      };

      drawHeader();
      doc.on("pageAdded", drawHeader);

      // Resumen
      doc.moveDown(2);
      doc.fontSize(11).fillColor("#111").text("Resumen", { underline: true });
      doc.moveDown(0.4);
      doc.fontSize(10).fillColor("#222");
      const s = report.summary;
      doc.text(
        `Productos: ${fmtInt(s.totalProducts)}    Cantidad: ${fmtInt(s.totalQuantity)}    Valor total: ${fmtMoney(
          s.totalValue
        )}`
      );
      doc.text(
        `Con stock: ${fmtInt(s.productsWithStock)}    Despachados: ${fmtInt(
          s.productsDispatched
        )}    Solo histórico: ${fmtInt(s.productsOnlyHistoric)}`
      );

      if (truncated) {
        doc.moveDown(0.4);
        doc
          .fontSize(9)
          .fillColor("#9a3412")
          .text(
            `Mostrando top ${PDF_TOP_LIMIT} de ${products.length} productos por valor total. Ver XLSX para listado completo.`
          );
        doc.fillColor("#222");
      }

      // Tabla productos
      doc.moveDown(0.8);
      doc.fontSize(11).fillColor("#111").text("Productos", { underline: true });
      doc.moveDown(0.3);

      const cols = [
        { label: "Producto", w: 220 },
        { label: "SKU", w: 80 },
        { label: "Cant.", w: 50, align: "right" as const },
        { label: "Valor", w: 90, align: "right" as const },
        { label: "Últ. entrada", w: 110 },
        { label: "Últ. salida", w: 110 },
        { label: "Series A/V/D", w: 90 },
      ];

      const drawRow = (cells: string[], opts: { bold?: boolean } = {}) => {
        const yStart = doc.y;
        let x = 40;
        if (opts.bold) doc.fontSize(9.5).fillColor("#111").font("Helvetica-Bold");
        else doc.fontSize(9).fillColor("#222").font("Helvetica");
        for (let i = 0; i < cols.length; i++) {
          const c = cols[i];
          doc.text(cells[i] ?? "", x, yStart, {
            width: c.w,
            align: c.align ?? "left",
            ellipsis: true,
          });
          x += c.w;
        }
        doc.font("Helvetica");
        // mover el cursor a la siguiente fila considerando wrap
        doc.y = yStart + 14;
        if (doc.y > doc.page.height - 50) doc.addPage();
      };

      drawRow(cols.map((c) => c.label), { bold: true });
      doc.moveTo(40, doc.y - 2).lineTo(800, doc.y - 2).strokeColor("#aaa").lineWidth(0.5).stroke();

      for (const p of productsToShow) {
        drawRow([
          safeText(p.name),
          safeText(p.sku ?? p.barcode ?? p.erpProductCode ?? "-"),
          fmtInt(p.stock.total),
          fmtMoney(p.pricing.totalValue),
          fmtDate(p.movements.lastInDate),
          fmtDate(p.movements.lastOutDate),
          `${p.serials.active}/${p.serials.sold}/${p.serials.damaged}`,
        ]);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
