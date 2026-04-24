/**
 * Generador del informe consolidado por proyecto (centro de costo).
 *
 * Toda la agregacion vive aqui (no se ensucia storage.ts) y usa SQL
 * parametrizado via el pool compartido para minimizar N+1.
 *
 * Convenciones:
 *  - "stock total" excluye sub-bodega 'despacho' (consistencia con
 *    server/storage.ts:846 / :877).
 *  - "ultimos 12 meses" = rolling 365 dias (NOW() - INTERVAL '365 days').
 *  - "in transit" = traspasos en estado pending|approved cuyo destination
 *    apunta a una bodega del CC.
 *  - avgAppliedPrice = promedio ponderado por quantity (SUM(price*qty)/SUM(qty)).
 */
import memoize from "memoizee";
import { pool } from "./db";
import {
  REPORT_VERSION,
  type ProjectReport,
  type ReportProduct,
  type ReportWarehouse,
  type ReportStockByWarehouse,
  type ReportProductPurchaseOrder,
  type ReportSummary,
  type ReportUser,
} from "@shared/contracts/reports";

interface WarehouseRow {
  id: number;
  name: string;
  warehouse_type: string;
  sub_warehouse_type: string | null;
  parent_warehouse_id: number | null;
}

interface ProductDetailsRow {
  id: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  erp_product_code: string | null;
  product_type: string | null;
  requires_serial: boolean | null;
  unit_name: string | null;
  unit_abbr: string | null;
  category_name: string | null;
  brand_name: string | null;
}

const DISPATCH_SUBTYPE = "despacho";

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toIsoOrNull(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  return new Date(String(v)).toISOString();
}

export async function generateProjectReport(
  costCenter: string,
  requesterUserId: number
): Promise<ProjectReport> {
  // ----------------------------------------------------------
  // Q1 — Bodegas del CC (todas, incluye despacho para reportarlo aparte)
  // ----------------------------------------------------------
  const whRes = await pool.query<WarehouseRow>(
    `SELECT id, name, warehouse_type, sub_warehouse_type, parent_warehouse_id
       FROM warehouses
      WHERE cost_center = $1 AND is_active = true
      ORDER BY warehouse_type, name`,
    [costCenter]
  );
  const warehousesAll = whRes.rows;
  if (warehousesAll.length === 0) {
    throw Object.assign(new Error("Centro de costo no existe o no tiene bodegas activas"), {
      status: 404,
    });
  }

  const warehouseIds = warehousesAll.map((w) => w.id);
  const dispatchIds = new Set(
    warehousesAll.filter((w) => w.sub_warehouse_type === DISPATCH_SUBTYPE).map((w) => w.id)
  );
  const nonDispatchIds = warehouseIds.filter((id) => !dispatchIds.has(id));

  const reportWarehouses: ReportWarehouse[] = warehousesAll.map((w) => ({
    id: w.id,
    name: w.name,
    warehouseType: w.warehouse_type,
    subWarehouseType: w.sub_warehouse_type,
    isMain: w.warehouse_type === "main",
    isDispatch: w.sub_warehouse_type === DISPATCH_SUBTYPE,
  }));

  // ----------------------------------------------------------
  // Q2 — Pool de productos en el CC (union: stock + OC + movimientos)
  // ----------------------------------------------------------
  const poolRes = await pool.query<{ product_id: number }>(
    `SELECT DISTINCT product_id FROM (
        SELECT product_id FROM inventory
         WHERE warehouse_id = ANY($1::int[]) AND quantity > 0
        UNION
        SELECT product_id FROM purchase_order_receipts
         WHERE cost_center = $2 AND product_id IS NOT NULL
        UNION
        SELECT product_id FROM inventory_movements
         WHERE warehouse_id = ANY($1::int[])
       ) sub
      WHERE product_id IS NOT NULL`,
    [warehouseIds, costCenter]
  );
  const productIds = poolRes.rows.map((r) => r.product_id).filter((id) => id != null);

  // Si no hay productos asociados, retornamos informe vacio coherente
  if (productIds.length === 0) {
    return buildEmptyReport(costCenter, reportWarehouses, await loadGenerator(requesterUserId));
  }

  // ----------------------------------------------------------
  // Q3..Q9 en paralelo — minimizar latencia
  // ----------------------------------------------------------
  const [
    detailsRes,
    stockRes,
    priceRes,
    serialsRes,
    movementsRes,
    ocRes,
    transitRes,
    generatedBy,
  ] = await Promise.all([
    pool.query<ProductDetailsRow>(
      `SELECT p.id, p.name, p.sku, p.barcode, p.erp_product_code, p.product_type, p.requires_serial,
              u.name AS unit_name, u.abbreviation AS unit_abbr,
              c.name AS category_name,
              b.name AS brand_name
         FROM products p
         LEFT JOIN units u ON u.id = p.unit_id
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN brands b ON b.id = p.brand_id
        WHERE p.id = ANY($1::int[])`,
      [productIds]
    ),
    pool.query<{ product_id: number; warehouse_id: number; quantity: number }>(
      `SELECT product_id, warehouse_id, quantity
         FROM inventory
        WHERE warehouse_id = ANY($1::int[])
          AND quantity > 0
          AND product_id = ANY($2::int[])`,
      [warehouseIds, productIds]
    ),
    pool.query<{ product_id: number; price: string }>(
      `SELECT DISTINCT ON (product_id) product_id, price
         FROM product_prices
        WHERE product_id = ANY($1::int[])
        ORDER BY product_id, year DESC, month DESC`,
      [productIds]
    ),
    pool.query<{
      product_id: number;
      active: number;
      sold: number;
      damaged: number;
    }>(
      `SELECT product_id,
              SUM(CASE WHEN status = 'active'  THEN 1 ELSE 0 END)::int AS active,
              SUM(CASE WHEN status = 'sold'    THEN 1 ELSE 0 END)::int AS sold,
              SUM(CASE WHEN status = 'damaged' THEN 1 ELSE 0 END)::int AS damaged
         FROM product_serials
        WHERE warehouse_id = ANY($1::int[])
          AND product_id  = ANY($2::int[])
        GROUP BY product_id`,
      [warehouseIds, productIds]
    ),
    pool.query<{
      product_id: number;
      last_in: Date | null;
      last_out: Date | null;
      total_in_12m: number | null;
      total_out_12m: number | null;
      avg_applied_price: string | null;
    }>(
      `SELECT product_id,
              MAX(created_at) FILTER (WHERE movement_type='in')  AS last_in,
              MAX(created_at) FILTER (WHERE movement_type='out') AS last_out,
              SUM(quantity) FILTER (WHERE movement_type='in'  AND created_at > NOW() - INTERVAL '365 days')::int AS total_in_12m,
              SUM(quantity) FILTER (WHERE movement_type='out' AND created_at > NOW() - INTERVAL '365 days')::int AS total_out_12m,
              (SUM(applied_price::numeric * quantity) FILTER (WHERE applied_price IS NOT NULL))
                / NULLIF(SUM(quantity) FILTER (WHERE applied_price IS NOT NULL), 0) AS avg_applied_price
         FROM inventory_movements
        WHERE warehouse_id = ANY($1::int[])
          AND product_id  = ANY($2::int[])
        GROUP BY product_id`,
      [warehouseIds, productIds]
    ),
    pool.query<{
      product_id: number;
      purchase_order_number: string;
      purchase_order_line: number;
      ordered_quantity: string;
      received_quantity: string;
      unit_price: string | null;
      delivery_date: Date | null;
      warehouse_reception_date: Date | null;
    }>(
      `SELECT product_id, purchase_order_number, purchase_order_line,
              ordered_quantity, received_quantity, unit_price,
              delivery_date, warehouse_reception_date
         FROM purchase_order_receipts
        WHERE cost_center = $1
          AND product_id = ANY($2::int[])
        ORDER BY product_id, purchase_order_number, purchase_order_line`,
      [costCenter, productIds]
    ),
    pool.query<{ product_id: number; qty: number }>(
      `SELECT product_id, COUNT(*)::int AS qty
         FROM transfer_orders
        WHERE destination_warehouse_id = ANY($1::int[])
          AND status IN ('pending','approved')
          AND product_id = ANY($2::int[])
        GROUP BY product_id`,
      [warehouseIds, productIds]
    ),
    loadGenerator(requesterUserId),
  ]);

  // ----------------------------------------------------------
  // Indexar resultados para join en memoria
  // ----------------------------------------------------------
  const detailsByPid = new Map(detailsRes.rows.map((r) => [r.id, r]));
  const warehousesById = new Map(warehousesAll.map((w) => [w.id, w]));
  const priceByPid = new Map(
    priceRes.rows.map((r) => [r.product_id, toNumberOrNull(r.price)])
  );
  const serialsByPid = new Map(
    serialsRes.rows.map((r) => [
      r.product_id,
      { active: r.active ?? 0, sold: r.sold ?? 0, damaged: r.damaged ?? 0 },
    ])
  );
  const movementsByPid = new Map(movementsRes.rows.map((r) => [r.product_id, r]));
  const transitByPid = new Map(transitRes.rows.map((r) => [r.product_id, r.qty]));

  // Stock por producto (separado por bodega, dispatched aparte)
  type StockAcc = {
    byWarehouse: Map<number, number>;
    dispatched: number;
  };
  const stockByPid = new Map<number, StockAcc>();
  for (const row of stockRes.rows) {
    const acc =
      stockByPid.get(row.product_id) ??
      { byWarehouse: new Map<number, number>(), dispatched: 0 };
    if (dispatchIds.has(row.warehouse_id)) {
      acc.dispatched += row.quantity;
    } else {
      acc.byWarehouse.set(row.warehouse_id, (acc.byWarehouse.get(row.warehouse_id) ?? 0) + row.quantity);
    }
    stockByPid.set(row.product_id, acc);
  }

  // OCs por producto
  const ocByPid = new Map<number, ReportProductPurchaseOrder[]>();
  for (const r of ocRes.rows) {
    const ordered = Number(r.ordered_quantity);
    const received = Number(r.received_quantity);
    const list = ocByPid.get(r.product_id) ?? [];
    list.push({
      purchaseOrderNumber: r.purchase_order_number,
      purchaseOrderLine: r.purchase_order_line,
      orderedQuantity: ordered,
      receivedQuantity: received,
      unitPrice: toNumberOrNull(r.unit_price),
      receptionPercentage:
        ordered > 0 ? Math.round((received / ordered) * 1000) / 10 : 0,
      deliveryDate: toIsoOrNull(r.delivery_date),
      warehouseReceptionDate: toIsoOrNull(r.warehouse_reception_date),
    });
    ocByPid.set(r.product_id, list);
  }

  // ----------------------------------------------------------
  // Construir payload por producto
  // ----------------------------------------------------------
  const products: ReportProduct[] = [];
  for (const pid of productIds) {
    const d = detailsByPid.get(pid);
    if (!d) continue;

    const stockAcc = stockByPid.get(pid);
    const totalStock = stockAcc
      ? Array.from(stockAcc.byWarehouse.values()).reduce((s, n) => s + n, 0)
      : 0;
    const dispatched = stockAcc?.dispatched ?? 0;
    const byWarehouse: ReportStockByWarehouse[] = [];
    if (stockAcc) {
      for (const [whId, qty] of Array.from(stockAcc.byWarehouse.entries())) {
        const w = warehousesById.get(whId);
        if (!w) continue;
        byWarehouse.push({
          warehouseId: whId,
          warehouseName: w.name,
          subWarehouseType: w.sub_warehouse_type,
          quantity: qty,
        });
      }
      byWarehouse.sort((a, b) => a.warehouseName.localeCompare(b.warehouseName));
    }

    const currentPrice = priceByPid.get(pid) ?? null;
    const totalValue = currentPrice != null ? totalStock * currentPrice : 0;

    const movements = movementsByPid.get(pid);
    const serials = serialsByPid.get(pid) ?? { active: 0, sold: 0, damaged: 0 };
    const ocs = ocByPid.get(pid) ?? [];
    const inTransitQty = transitByPid.get(pid) ?? 0;

    const onlyHistoric = totalStock === 0 && dispatched === 0 && (ocs.length > 0 || (movements != null));

    products.push({
      id: pid,
      name: d.name,
      sku: d.sku,
      barcode: d.barcode,
      erpProductCode: d.erp_product_code,
      productType: d.product_type,
      category: d.category_name,
      brand: d.brand_name,
      unit:
        d.unit_name && d.unit_abbr
          ? { name: d.unit_name, abbreviation: d.unit_abbr }
          : null,
      requiresSerial: d.requires_serial === true,
      stock: {
        total: totalStock,
        byWarehouse,
        dispatched,
      },
      pricing: {
        currentPrice,
        totalValue,
        avgAppliedPrice: movements ? toNumberOrNull(movements.avg_applied_price) : null,
      },
      serials,
      movements: {
        lastInDate: toIsoOrNull(movements?.last_in ?? null),
        lastOutDate: toIsoOrNull(movements?.last_out ?? null),
        totalInLast12Months: movements?.total_in_12m ?? 0,
        totalOutLast12Months: movements?.total_out_12m ?? 0,
      },
      purchaseOrders: ocs,
      flags: {
        onlyHistoric,
        inTransit: inTransitQty > 0,
      },
    });
  }

  products.sort((a, b) => a.name.localeCompare(b.name));

  // ----------------------------------------------------------
  // Summary
  // ----------------------------------------------------------
  const summary: ReportSummary = {
    totalProducts: products.length,
    totalQuantity: products.reduce((s, p) => s + p.stock.total, 0),
    totalValue: products.reduce((s, p) => s + p.pricing.totalValue, 0),
    productsWithStock: products.filter((p) => p.stock.total > 0).length,
    productsDispatched: products.filter((p) => p.stock.dispatched > 0).length,
    productsOnlyHistoric: products.filter((p) => p.flags.onlyHistoric).length,
  };

  return {
    reportVersion: REPORT_VERSION,
    generatedAt: new Date().toISOString(),
    generatedBy,
    costCenter,
    warehouses: reportWarehouses,
    products,
    summary,
  };
}

async function loadGenerator(userId: number): Promise<ReportUser> {
  const r = await pool.query<{
    id: number;
    username: string;
    first_name: string | null;
    last_name: string | null;
  }>(
    `SELECT id, username, first_name, last_name FROM users WHERE id = $1`,
    [userId]
  );
  const u = r.rows[0];
  if (!u) {
    return { id: userId, username: `usuario#${userId}`, fullName: null };
  }
  const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || null;
  return { id: u.id, username: u.username, fullName };
}

/**
 * Version cacheada en memoria con TTL de 60s. Reduce carga en BD cuando
 * un usuario recarga la pagina varias veces seguidas.
 *
 * Bypass: el handler puede invocar `generateProjectReportCached.delete(cc, userId)`
 * o llamar directamente a `generateProjectReport` cuando el cliente envia
 * Cache-Control: no-cache.
 */
export const generateProjectReportCached = memoize(generateProjectReport, {
  promise: true,
  maxAge: 60 * 1000,
  max: 100,
});

function buildEmptyReport(
  costCenter: string,
  warehouses: ReportWarehouse[],
  generatedBy: ReportUser
): ProjectReport {
  return {
    reportVersion: REPORT_VERSION,
    generatedAt: new Date().toISOString(),
    generatedBy,
    costCenter,
    warehouses,
    products: [],
    summary: {
      totalProducts: 0,
      totalQuantity: 0,
      totalValue: 0,
      productsWithStock: 0,
      productsDispatched: 0,
      productsOnlyHistoric: 0,
    },
  };
}
