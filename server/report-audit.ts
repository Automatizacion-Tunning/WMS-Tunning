import { pool } from "./db";

export interface LogReportGenerationInput {
  userId: number;
  costCenter: string;
  format: "json" | "xlsx" | "pdf";
  durationMs?: number;
  productsCount?: number;
  reportVersion?: string;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Inserta una fila en report_generation_log. Nunca lanza al caller (best effort);
 * un fallo de auditoria no debe romper el endpoint.
 */
export async function logReportGeneration(input: LogReportGenerationInput): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO report_generation_log
         (user_id, cost_center, format, duration_ms, products_count, report_version, ip, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        input.userId,
        input.costCenter,
        input.format,
        input.durationMs ?? null,
        input.productsCount ?? null,
        input.reportVersion ?? null,
        input.ip ?? null,
        input.userAgent ?? null,
      ]
    );
  } catch (err) {
    console.error("[report-audit] No se pudo registrar la generacion:", err);
  }
}
