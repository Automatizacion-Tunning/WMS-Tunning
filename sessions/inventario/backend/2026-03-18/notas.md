# Sesion 2026-03-18

## Resumen
Plan de pruebas integral ejecutado. Se revisó el módulo de inventario completo (stock entry, movimientos, barcode) con 19 pruebas.

## Hallazgos principales
- **WARN IN-09**: En `/api/stock-entry`, seriales se registran en `principalWarehouse.id` pero el movimiento va a `validatedData.warehouseId` — inconsistencia
- **WARN IN-12**: Endpoints GET de inventario no verifican permisos granulares, cualquier autenticado accede
- **WARN BC-06**: Console.log de debug en producción en `useBarcodeFlow.tsx`
- Lógica de movimientos correcta: "in" suma, "out" resta, nunca baja de 0

## Resultados
- PASS: 15 | WARN: 4 | FAIL: 0

## Pendientes
- [ ] Corregir warehouseId de seriales en stock-entry para que coincida con el movimiento
- [ ] Agregar verificación de permisos en endpoints GET de inventario
- [ ] Limpiar console.log de useBarcodeFlow.tsx

## Contexto para proxima sesion
La lógica core de inventario (movimientos, sumas, restas) es correcta. Los problemas son de permisos y consistencia de warehouseId en seriales.
