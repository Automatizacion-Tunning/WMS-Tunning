/**
 * Aplica migration-report-audit.sql contra la BD configurada en .env
 * Idempotente: usa ON CONFLICT / IF NOT EXISTS y se puede re-ejecutar.
 *
 * Uso:  tsx --env-file=.env scripts/apply-report-migration.ts
 *       (o)  npm run migrate:reports   (si se agrega al package.json)
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = resolve(__dirname, "..", "migration-report-audit.sql");

async function main() {
  const sql = readFileSync(sqlPath, "utf8");

  const pool = new Pool({
    host: process.env.AZURE_DB_HOST,
    user: process.env.AZURE_DB_USER,
    password: process.env.AZURE_DB_PASSWORD,
    database: process.env.AZURE_DB_NAME,
    port: parseInt(process.env.AZURE_DB_PORT || "5432"),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  console.log(`[migrate] BD: ${process.env.AZURE_DB_HOST}/${process.env.AZURE_DB_NAME}`);
  console.log(`[migrate] Aplicando: ${sqlPath}`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");

    // Verificacion post-migracion
    const perm = await client.query(
      `SELECT id, key, name FROM permissions WHERE key='reports.view'`
    );
    const rolePerms = await client.query(
      `SELECT r.code FROM role_permissions rp
         JOIN roles r ON r.id = rp.role_id
         JOIN permissions p ON p.id = rp.permission_id
        WHERE p.key='reports.view'
        ORDER BY r.code`
    );
    const tableExists = await client.query(
      `SELECT to_regclass('public.report_generation_log') AS t`
    );

    console.log("[migrate] OK");
    console.log("  - Permiso reports.view:", perm.rows[0] ?? "NO ENCONTRADO");
    console.log("  - Roles asignados:", rolePerms.rows.map((r) => r.code).join(", "));
    console.log("  - Tabla report_generation_log:", tableExists.rows[0].t);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[migrate] ERROR:", err);
  process.exit(1);
});
