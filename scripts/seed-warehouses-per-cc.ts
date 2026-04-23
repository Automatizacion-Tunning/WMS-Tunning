// Script: asegura que cada CC existente en el sistema tenga el set completo de
// bodegas (1 main + 6 sub: um2, plataforma, pem, integrador, garantia, despacho).
//
// Uso:
//   npx tsx --env-file=.env scripts/seed-warehouses-per-cc.ts            -> DRY RUN (default, no inserta)
//   npx tsx --env-file=.env scripts/seed-warehouses-per-cc.ts --apply    -> ejecuta INSERTs
//
// Idempotente: solo crea las bodegas faltantes por CC, no duplica las existentes.

import { db } from "../server/db";
import { warehouses } from "../shared/schema";
import { eq, and, isNull, asc, sql } from "drizzle-orm";

type SubType = "um2" | "plataforma" | "pem" | "integrador" | "garantia" | "despacho";

const SUB_TYPES: { type: SubType; name: string }[] = [
  { type: "um2",        name: "UM2" },
  { type: "plataforma", name: "Plataforma" },
  { type: "pem",        name: "PEM" },
  { type: "integrador", name: "Integrador" },
  { type: "garantia",   name: "Garantía" },
  { type: "despacho",   name: "Despacho" },
];

async function main() {
  const apply = process.argv.includes("--apply");
  const mode = apply ? "APPLY" : "DRY RUN";
  console.log(`\n=== Seed de bodegas por CC — modo: ${mode} ===\n`);

  // 1. Lista de CCs distintos existentes en el sistema (incluyendo inactivos, por si hay que revivir)
  const ccRows = await db
    .selectDistinct({ costCenter: warehouses.costCenter })
    .from(warehouses)
    .orderBy(asc(warehouses.costCenter));
  const allCCs = ccRows.map(r => r.costCenter).filter(Boolean);

  if (!allCCs.length) {
    console.log("No hay CCs en la tabla warehouses. Nada que hacer.");
    process.exit(0);
  }

  console.log(`CCs detectados: ${allCCs.length}`);
  allCCs.forEach(cc => console.log(`  • ${cc}`));
  console.log("");

  let totalCreated = 0;
  let totalAlreadyOk = 0;
  const plan: { cc: string; missing: { kind: "main" } | { kind: "sub"; subType: SubType; name: string } }[] = [];

  for (const cc of allCCs) {
    // Bodegas actuales del CC (activas o no, para no duplicar si alguien las desactivo)
    const existing = await db.select().from(warehouses).where(eq(warehouses.costCenter, cc));

    // ¿Tiene main?
    const hasMain = existing.some(w => w.warehouseType === "main");
    if (!hasMain) {
      plan.push({ cc, missing: { kind: "main" } });
    }

    // ¿Qué sub-types tiene ya?
    const existingSubTypes = new Set(
      existing.filter(w => w.warehouseType === "sub" && w.subWarehouseType)
              .map(w => w.subWarehouseType as SubType)
    );

    for (const { type, name } of SUB_TYPES) {
      if (!existingSubTypes.has(type)) {
        plan.push({ cc, missing: { kind: "sub", subType: type, name } });
      }
    }
  }

  if (!plan.length) {
    console.log("✓ Todos los CCs ya tienen el set completo. Nada por crear.");
    process.exit(0);
  }

  console.log(`Bodegas faltantes a crear: ${plan.length}\n`);
  const groupedByCC = new Map<string, typeof plan>();
  for (const item of plan) {
    if (!groupedByCC.has(item.cc)) groupedByCC.set(item.cc, []);
    groupedByCC.get(item.cc)!.push(item);
  }
  for (const [cc, items] of groupedByCC) {
    console.log(`  ${cc} — faltan ${items.length}:`);
    for (const it of items) {
      if (it.missing.kind === "main") {
        console.log(`    + main  → Bodega Principal ${cc}`);
      } else {
        console.log(`    + sub ${it.missing.subType.padEnd(11)} → Bodega ${it.missing.name} ${cc}`);
      }
    }
  }
  console.log("");

  if (!apply) {
    console.log("DRY RUN: no se insertó nada. Volver a correr con --apply para ejecutar.");
    process.exit(0);
  }

  // 2. Aplicar en transacciones por CC (para que un CC fallido no bloquee al siguiente)
  for (const [cc, items] of groupedByCC) {
    try {
      // Necesitamos el id del main para colgar las sub como children (parentWarehouseId).
      // Si faltaba el main, lo creamos primero.
      let mainId: number | null = null;

      const mainMissing = items.find(i => i.missing.kind === "main");
      if (mainMissing) {
        const [created] = await db.insert(warehouses).values({
          name: `Bodega Principal ${cc}`,
          location: `Ubicación Central ${cc}`,
          costCenter: cc,
          parentWarehouseId: null,
          warehouseType: "main",
          subWarehouseType: null,
          isActive: true,
        }).returning();
        mainId = created.id;
        console.log(`[${cc}] main creada id=${mainId}`);
        totalCreated++;
      } else {
        const [existingMain] = await db.select().from(warehouses)
          .where(and(eq(warehouses.costCenter, cc), eq(warehouses.warehouseType, "main")))
          .limit(1);
        mainId = existingMain?.id ?? null;
      }

      const subItems = items.filter(i => i.missing.kind === "sub") as Array<
        { cc: string; missing: { kind: "sub"; subType: SubType; name: string } }
      >;

      if (subItems.length) {
        const values = subItems.map(s => ({
          name: `Bodega ${s.missing.name} ${cc}`,
          location: `Área ${s.missing.name} - ${cc}`,
          costCenter: cc,
          parentWarehouseId: mainId,
          warehouseType: "sub",
          subWarehouseType: s.missing.subType,
          isActive: true,
        }));
        const inserted = await db.insert(warehouses).values(values).returning({ id: warehouses.id, sub: warehouses.subWarehouseType });
        inserted.forEach(r => console.log(`[${cc}] sub ${r.sub} creada id=${r.id}`));
        totalCreated += inserted.length;
      }
    } catch (err) {
      console.error(`[${cc}] ERROR:`, err);
    }
  }

  console.log(`\n=== Resumen ===`);
  console.log(`Bodegas creadas: ${totalCreated}`);
  console.log(`CCs procesados:  ${groupedByCC.size}`);
  process.exit(0);
}

main().catch(err => {
  console.error("Error fatal:", err);
  process.exit(1);
});
