// Script: siembra baseline de feature KPI Proveedores Fase 1
// - appSettings (umbral inicial + feature flags + estrategia de año)
// - permissions nuevas (orders.edit_receipt, orders.view_audit_log, settings.admin)
// - role_permissions (admin=todas, project_manager=edit+view audit, warehouse_operator=edit)
// - kpiThresholdHistory (umbral vigente desde 2026-01-01 = 5)
//
// Uso:
//   npx tsx --env-file=.env scripts/seed-kpi-proveedores.ts           -> DRY RUN
//   npx tsx --env-file=.env scripts/seed-kpi-proveedores.ts --apply   -> aplica cambios
//
// Idempotente: todos los inserts usan ON CONFLICT DO NOTHING o verifican existencia.

import { db } from "../server/db";
import { appSettings, permissions, kpiThresholdHistory } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

type Setting = { key: string; value: string; description: string };

const SETTINGS: Setting[] = [
  {
    key: "supplier_kpi_max_late_orders_per_year",
    value: "5",
    description: "Máximo de OC atrasadas al año antes de marcar al proveedor como incumplido.",
  },
  {
    key: "kpi_feature.audit_log_enabled",
    value: "true",
    description: "Activa el registro de audit log para ediciones sobre recepciones de OC.",
  },
  {
    key: "kpi_feature.phase_2_modifiedAt_column",
    value: "false",
    description: "Muestra columna 'Última modificación' en la tabla de OC. Activar tras Fase 2.",
  },
  {
    key: "kpi_feature.phase_3_reception_date_edit",
    value: "false",
    description: "Habilita edición manual de warehouseReceptionDate vía endpoint PATCH. Activar tras Fase 3.",
  },
  {
    key: "kpi_feature.phase_4_status_badge",
    value: "false",
    description: "Muestra semáforo de estado de entrega en la tabla de OC. Activar tras Fase 4.",
  },
  {
    key: "kpi_feature.phase_5_kpi_endpoint",
    value: "false",
    description: "Habilita endpoints /api/kpi/proveedores y /api/kpi/config. Activar tras Fase 5.",
  },
  {
    key: "kpi_feature.year_strategy",
    value: "calendar",
    description: "Estrategia de agregación anual del KPI: 'calendar' (1 ene - 31 dic), 'fiscal' o 'rolling_365'.",
  },
];

type Perm = { key: string; name: string; module: string; category: string };

const NEW_PERMS: Perm[] = [
  { key: "orders.edit_receipt",    name: "Editar Recepción de OC",        module: "orders",   category: "Ordenes" },
  { key: "orders.view_audit_log",  name: "Ver Historial de Recepción",    module: "orders",   category: "Ordenes" },
  { key: "settings.admin",         name: "Administrar Configuración",     module: "settings", category: "Administracion" },
];

const ROLE_PERM_MAP: Record<string, string[]> = {
  admin:              ["orders.edit_receipt", "orders.view_audit_log", "settings.admin"],
  project_manager:    ["orders.edit_receipt", "orders.view_audit_log"],
  warehouse_operator: ["orders.edit_receipt"],
};

const THRESHOLD_SEED = {
  metricKey: "supplier_kpi_max_late_orders_per_year",
  threshold: 5,
  effectiveFrom: new Date("2026-01-01T00:00:00Z"),
  reason: "Seed inicial del feature KPI Proveedores (Fase 1).",
};

async function main() {
  const apply = process.argv.includes("--apply");
  const mode = apply ? "APPLY" : "DRY RUN";
  console.log(`\n=== Seed KPI Proveedores — modo: ${mode} ===\n`);

  // 0. DDL: CREATE TABLE IF NOT EXISTS + ALTER TABLE ADD COLUMN IF NOT EXISTS.
  //    Defensivo: evita drizzle-kit push interactivo y sincroniza Azure con shared/schema.ts
  //    para tablas/columnas que pudieron nunca haberse pusheado.
  const DDL_STATEMENTS = [
    // app_settings (declarada en schema.ts pero puede no existir en Azure)
    sql`CREATE TABLE IF NOT EXISTS app_settings (
      id SERIAL PRIMARY KEY,
      key VARCHAR(100) NOT NULL UNIQUE,
      value TEXT NOT NULL,
      description TEXT,
      updated_by INTEGER,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    // purchase_order_receipts: asegurar columnas nuevas que shared/schema.ts declara.
    sql`ALTER TABLE purchase_order_receipts ADD COLUMN IF NOT EXISTS supplier_code VARCHAR(50)`,
    sql`ALTER TABLE purchase_order_receipts ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(200)`,
    sql`ALTER TABLE purchase_order_receipts ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP`,
    sql`ALTER TABLE purchase_order_receipts ADD COLUMN IF NOT EXISTS warehouse_reception_date TIMESTAMP`,
    sql`ALTER TABLE purchase_order_receipts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()`,
    // Audit / threshold tables (Fase 1 KPI Proveedores)
    sql`CREATE TABLE IF NOT EXISTS receipt_audit_log (
      id SERIAL PRIMARY KEY,
      receipt_id INTEGER NOT NULL,
      field VARCHAR(64) NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_by INTEGER,
      changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
      source VARCHAR(32) NOT NULL,
      reason TEXT
    )`,
    sql`CREATE TABLE IF NOT EXISTS settings_audit_log (
      id SERIAL PRIMARY KEY,
      setting_key VARCHAR(100) NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_by INTEGER,
      changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
      reason TEXT
    )`,
    sql`CREATE TABLE IF NOT EXISTS kpi_threshold_history (
      id SERIAL PRIMARY KEY,
      metric_key VARCHAR(100) NOT NULL,
      threshold INTEGER NOT NULL,
      effective_from TIMESTAMP NOT NULL,
      set_by INTEGER,
      set_at TIMESTAMP NOT NULL DEFAULT NOW(),
      reason TEXT
    )`,
    sql`CREATE INDEX IF NOT EXISTS idx_receipt_audit_receipt ON receipt_audit_log(receipt_id, changed_at DESC)`,
    sql`CREATE INDEX IF NOT EXISTS idx_settings_audit_key ON settings_audit_log(setting_key, changed_at DESC)`,
    sql`CREATE INDEX IF NOT EXISTS idx_kpi_threshold_metric ON kpi_threshold_history(metric_key, effective_from DESC)`,
    sql`CREATE INDEX IF NOT EXISTS idx_por_supplier_code_delivery ON purchase_order_receipts(supplier_code, delivery_date) WHERE supplier_code IS NOT NULL`,
  ];

  // La DDL es idempotente (IF NOT EXISTS) — se ejecuta SIEMPRE.
  // Dry-run sigue siendo seguro porque solo se SALTAN los INSERTs/UPDATEs de datos.
  console.log(`> DDL (${DDL_STATEMENTS.length} statements) [idempotente, se ejecuta aun en dry-run]`);
  for (const stmt of DDL_STATEMENTS) {
    await db.execute(stmt);
  }
  console.log(`  ✓ ${DDL_STATEMENTS.length} statements ejecutados (IF NOT EXISTS)`);

  // 1. appSettings
  console.log(`> appSettings (${SETTINGS.length} claves)`);
  for (const s of SETTINGS) {
    const [existing] = await db.select().from(appSettings).where(eq(appSettings.key, s.key));
    if (existing) {
      console.log(`  = ${s.key} ya existe (value=${existing.value})`);
    } else {
      if (apply) {
        await db.insert(appSettings).values({ key: s.key, value: s.value, description: s.description });
        console.log(`  + ${s.key} = ${s.value} INSERTADO`);
      } else {
        console.log(`  + ${s.key} = ${s.value} (pendiente)`);
      }
    }
  }

  // 2. permissions
  console.log(`\n> permissions (${NEW_PERMS.length} nuevos)`);
  for (const p of NEW_PERMS) {
    const [existing] = await db.select().from(permissions).where(eq(permissions.key, p.key));
    if (existing) {
      console.log(`  = ${p.key} ya existe (id=${existing.id})`);
    } else {
      if (apply) {
        const [ins] = await db.insert(permissions).values(p).returning();
        console.log(`  + ${p.key} INSERTADO id=${ins.id}`);
      } else {
        console.log(`  + ${p.key} (pendiente)`);
      }
    }
  }

  // 3. role_permissions (via SQL raw para el JOIN)
  console.log(`\n> role_permissions`);
  for (const [roleCode, permKeys] of Object.entries(ROLE_PERM_MAP)) {
    for (const permKey of permKeys) {
      if (apply) {
        const result = await db.execute(sql`
          INSERT INTO role_permissions (role_id, permission_id)
          SELECT r.id, p.id FROM roles r, permissions p
          WHERE r.code = ${roleCode} AND p.key = ${permKey}
          ON CONFLICT (role_id, permission_id) DO NOTHING
          RETURNING id
        `);
        const rows = (result as any).rows ?? result;
        const count = Array.isArray(rows) ? rows.length : 0;
        console.log(`  ${count > 0 ? "+" : "="} ${roleCode} → ${permKey} ${count > 0 ? "ASIGNADO" : "ya existía"}`);
      } else {
        console.log(`  + ${roleCode} → ${permKey} (pendiente)`);
      }
    }
  }

  // 4. kpiThresholdHistory
  console.log(`\n> kpiThresholdHistory`);
  const [existingTh] = await db.select().from(kpiThresholdHistory)
    .where(eq(kpiThresholdHistory.metricKey, THRESHOLD_SEED.metricKey));
  if (existingTh) {
    console.log(`  = ya existe registro inicial para ${THRESHOLD_SEED.metricKey} (id=${existingTh.id}, threshold=${existingTh.threshold})`);
  } else {
    if (apply) {
      const [ins] = await db.insert(kpiThresholdHistory).values(THRESHOLD_SEED).returning();
      console.log(`  + threshold=${ins.threshold} effectiveFrom=${ins.effectiveFrom.toISOString()} INSERTADO id=${ins.id}`);
    } else {
      console.log(`  + threshold=${THRESHOLD_SEED.threshold} effectiveFrom=${THRESHOLD_SEED.effectiveFrom.toISOString()} (pendiente)`);
    }
  }

  // 5. Verificación final si apply
  if (apply) {
    console.log(`\n> Verificación final`);
    const settingsCount = await db.select({ c: sql<number>`count(*)` }).from(appSettings)
      .where(sql`${appSettings.key} LIKE 'kpi_feature%' OR ${appSettings.key} = 'supplier_kpi_max_late_orders_per_year'`);
    const permsCount = await db.select({ c: sql<number>`count(*)` }).from(permissions)
      .where(sql`${permissions.key} IN ('orders.edit_receipt', 'orders.view_audit_log', 'settings.admin')`);
    const thCount = await db.select({ c: sql<number>`count(*)` }).from(kpiThresholdHistory);
    console.log(`  settings KPI: ${settingsCount[0]?.c}`);
    console.log(`  permisos nuevos: ${permsCount[0]?.c}`);
    console.log(`  threshold rows: ${thCount[0]?.c}`);
  } else {
    console.log(`\nDRY RUN: nada se aplicó. Rerun con --apply para ejecutar.`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
