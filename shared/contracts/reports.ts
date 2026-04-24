import { z } from "zod";

// Version del esquema del informe.
// Incrementar SIEMPRE que cambie la forma del payload o la semantica de un campo.
export const REPORT_VERSION = "1.0.0";

// ============================================================
// Validacion de input
// ============================================================
// CC tipico: "1-INFRED", "2-PROY", "EAGON_SE-001". Restringido a alfanumerico,
// guion y underscore para mitigar inyeccion via path param.
export const costCenterParamSchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[A-Za-z0-9_-]+$/, "costCenter debe ser alfanumerico");

export const exportFormatSchema = z.enum(["xlsx", "pdf"]);
export type ExportFormat = z.infer<typeof exportFormatSchema>;

// ============================================================
// Subschemas reutilizables
// ============================================================
export const reportUserSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  fullName: z.string().nullable(),
});

export const reportWarehouseSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  warehouseType: z.string(),
  subWarehouseType: z.string().nullable(),
  isMain: z.boolean(),
  isDispatch: z.boolean(),
});

export const reportStockByWarehouseSchema = z.object({
  warehouseId: z.number().int(),
  warehouseName: z.string(),
  subWarehouseType: z.string().nullable(),
  quantity: z.number().int(),
});

export const reportProductPurchaseOrderSchema = z.object({
  purchaseOrderNumber: z.string(),
  purchaseOrderLine: z.number().int(),
  orderedQuantity: z.number(),
  receivedQuantity: z.number(),
  unitPrice: z.number().nullable(),
  receptionPercentage: z.number(),
  deliveryDate: z.string().datetime().nullable(),
  warehouseReceptionDate: z.string().datetime().nullable(),
});

export const reportProductSchema = z.object({
  // ---- Identificacion ----
  id: z.number().int(),
  name: z.string(),
  sku: z.string().nullable(),
  barcode: z.string().nullable(),
  erpProductCode: z.string().nullable(),
  productType: z.string().nullable(),
  category: z.string().nullable(),
  brand: z.string().nullable(),
  unit: z
    .object({ name: z.string(), abbreviation: z.string() })
    .nullable(),
  requiresSerial: z.boolean(),

  // ---- Stock en el proyecto ----
  stock: z.object({
    total: z.number().int(),
    byWarehouse: z.array(reportStockByWarehouseSchema),
    dispatched: z.number().int(),
  }),

  // ---- Valorizacion ----
  pricing: z.object({
    currentPrice: z.number().nullable(),
    totalValue: z.number(),
    avgAppliedPrice: z.number().nullable(),
  }),

  // ---- Series ----
  serials: z.object({
    active: z.number().int(),
    sold: z.number().int(),
    damaged: z.number().int(),
  }),

  // ---- Movimientos ----
  movements: z.object({
    lastInDate: z.string().datetime().nullable(),
    lastOutDate: z.string().datetime().nullable(),
    totalInLast12Months: z.number().int(),
    totalOutLast12Months: z.number().int(),
  }),

  // ---- OC asociadas ----
  purchaseOrders: z.array(reportProductPurchaseOrderSchema),

  // ---- Flags de presentacion ----
  flags: z.object({
    onlyHistoric: z.boolean(), // sin stock pero con histórico OC
    inTransit: z.boolean(),    // con traspasos pendientes destino al CC
  }),
});

export const reportSummarySchema = z.object({
  totalProducts: z.number().int(),
  totalQuantity: z.number().int(),
  totalValue: z.number(),
  productsWithStock: z.number().int(),
  productsDispatched: z.number().int(),
  productsOnlyHistoric: z.number().int(),
});

export const projectReportSchema = z.object({
  reportVersion: z.string(),
  generatedAt: z.string().datetime(),
  generatedBy: reportUserSchema,
  costCenter: z.string(),
  warehouses: z.array(reportWarehouseSchema),
  products: z.array(reportProductSchema),
  summary: reportSummarySchema,
});

// ============================================================
// Tipos exportados
// ============================================================
export type ProjectReport = z.infer<typeof projectReportSchema>;
export type ReportProduct = z.infer<typeof reportProductSchema>;
export type ReportWarehouse = z.infer<typeof reportWarehouseSchema>;
export type ReportStockByWarehouse = z.infer<typeof reportStockByWarehouseSchema>;
export type ReportProductPurchaseOrder = z.infer<typeof reportProductPurchaseOrderSchema>;
export type ReportSummary = z.infer<typeof reportSummarySchema>;
export type ReportUser = z.infer<typeof reportUserSchema>;
