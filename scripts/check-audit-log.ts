/**
 * Inspecciona las ultimas filas de report_generation_log.
 * Uso: tsx --env-file=.env scripts/check-audit-log.ts
 */
import { pool } from "../server/db";

async function main() {
  const r = await pool.query(
    `SELECT id, user_id, cost_center, format, duration_ms, products_count, report_version, created_at
       FROM report_generation_log
      ORDER BY id DESC
      LIMIT 10`
  );
  console.log(`[audit] ultimas ${r.rows.length} filas:`);
  for (const row of r.rows) {
    console.log(
      `  #${row.id}  user=${row.user_id}  cc=${row.cost_center}  fmt=${row.format}  ms=${row.duration_ms}  prods=${row.products_count}  v=${row.report_version}  ts=${row.created_at.toISOString()}`
    );
  }
  await pool.end();
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
