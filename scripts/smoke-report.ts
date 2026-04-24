/**
 * Smoke test: invoca generateProjectReport contra la BD real y muestra metricas.
 * Uso:  tsx --env-file=.env scripts/smoke-report.ts <costCenter> [userId]
 */
import { generateProjectReport } from "../server/reports";
import { pool } from "../server/db";
import { projectReportSchema } from "../shared/contracts/reports";

async function main() {
  const cc = process.argv[2] ?? "1-INFRED";
  const userId = parseInt(process.argv[3] ?? "1", 10);

  console.log(`[smoke] CC=${cc} userId=${userId}`);
  const t0 = Date.now();

  let report;
  try {
    report = await generateProjectReport(cc, userId);
  } catch (err: any) {
    console.error("[smoke] ERROR:", err.message ?? err);
    process.exit(1);
  }

  const ms = Date.now() - t0;
  console.log(`[smoke] generado en ${ms} ms`);

  // Validar contra el schema Zod compartido
  const parsed = projectReportSchema.safeParse(report);
  if (!parsed.success) {
    console.error("[smoke] ZOD ERRORS:");
    for (const issue of parsed.error.issues.slice(0, 20)) {
      console.error(" -", issue.path.join("."), "->", issue.message);
    }
    process.exit(2);
  }
  console.log("[smoke] payload valida contra projectReportSchema");

  // Resumen
  console.log("[smoke] resumen:", JSON.stringify(report.summary, null, 2));
  console.log(
    "[smoke] bodegas:",
    report.warehouses.map((w) => `${w.name}(${w.subWarehouseType ?? "main"})`).join(", ")
  );
  console.log(
    `[smoke] productos: ${report.products.length} | onlyHistoric: ${report.summary.productsOnlyHistoric} | inTransit (algun): ${
      report.products.filter((p) => p.flags.inTransit).length
    }`
  );

  if (report.products[0]) {
    console.log("[smoke] primer producto:", JSON.stringify(report.products[0], null, 2).slice(0, 1200));
  }

  await pool.end();
}

main().catch((err) => {
  console.error("[smoke] FATAL:", err);
  process.exit(99);
});
