# Sesion 2026-04-01

## Resumen
Implementacion frontend de los nuevos tipos de bodega `garantia` y `despacho`. Selectores actualizados en formularios de creacion/edicion de bodegas, badges visuales diferenciados (ambar para garantia, azul para despacho), y restriccion admin en selectores de bodega.

## Cambios realizados
- **client/src/pages/warehouses/WarehouseManagement.tsx**:
  - Selector de sub-tipo de bodega (EditWarehouseDialog): agregados items `garantia` y `despacho`
  - Badge de sub-bodega en listado: colores diferenciados — ambar (bg-amber-100 text-amber-800) para garantia, azul (bg-blue-100 text-blue-800) para despacho
  - Badge en modal de detalle: mismos colores diferenciados

- **client/src/components/forms/WarehouseForm.tsx**:
  - Nuevo campo condicional `subWarehouseType` cuando `warehouseType === "sub"`: muestra selector con los 6 tipos (um2, plataforma, pem, integrador, garantia, despacho)

## Decisiones tomadas
- Colores: ambar para garantia (sugiere atencion/revision), azul para despacho (sugiere completado/entrega)
- El selector de sub-tipo en WarehouseForm solo se muestra cuando el tipo es "sub" (consistente con EditWarehouseDialog)
- Los badges usan variant="secondary" con clases adicionales de color

## Pendientes
- [ ] Verificar visualmente que los badges se ven bien en modo oscuro

## Contexto para proxima sesion
Los badges de tipo especial usan clases Tailwind directas (bg-amber-100, bg-blue-100) — si se cambia a modo oscuro puede necesitar ajuste (dark:bg-amber-900, etc.)
