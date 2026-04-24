/**
 * Smoke test: genera informe + xlsx + pdf en /tmp y reporta tamanios.
 * Uso:  tsx --env-file=.env scripts/smoke-export.ts <costCenter> [userId]
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateProjectReport } from "../server/reports";
import { exportReportToXlsx, exportReportToPdf } from "../server/report-exporters";
import { pool } from "../server/db";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "_smoke-out");
mkdirSync(OUT_DIR, { recursive: true });

async function main() {
  const cc = process.argv[2] ?? "1-INFRED";
  const userId = parseInt(process.argv[3] ?? "1", 10);

  console.log(`[export-smoke] CC=${cc} userId=${userId}`);
  console.log(`[export-smoke] OUT_DIR=${OUT_DIR}`);

  const tGen0 = Date.now();
  const report = await generateProjectReport(cc, userId);
  console.log(`[export-smoke] dataset listo en ${Date.now() - tGen0} ms (${report.products.length} productos)`);

  // Inyectar producto malicioso para verificar sanitizacion en XLSX
  if (report.products.length > 0) {
    report.products[0] = {
      ...report.products[0],
      name: "=cmd|/c calc'!A1",
      sku: "@SUM(1+1)",
    };
  }

  const tXlsx = Date.now();
  const xlsx = await exportReportToXlsx(report);
  writeFileSync(resolve(OUT_DIR, `informe-${cc}.xlsx`), xlsx);
  console.log(`[export-smoke] XLSX ${(xlsx.length / 1024).toFixed(1)} KB en ${Date.now() - tXlsx} ms`);

  const tPdf = Date.now();
  const pdf = await exportReportToPdf(report);
  writeFileSync(resolve(OUT_DIR, `informe-${cc}.pdf`), pdf);
  console.log(`[export-smoke] PDF  ${(pdf.length / 1024).toFixed(1)} KB en ${Date.now() - tPdf} ms`);

  console.log(`[export-smoke] OK — archivos en ${OUT_DIR}/informe-${cc}.{xlsx,pdf}`);

  await pool.end();
}

main().catch((err) => {
  console.error("[export-smoke] FATAL:", err);
  process.exit(1);
});
