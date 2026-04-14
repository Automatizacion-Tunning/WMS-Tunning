# Sesion 2026-03-27

## Resumen
Creacion de 2 endpoints de solo lectura para sub-apartados de OC y Productos dentro de Centros de Costo. Tambien se agregaron 2 metodos en storage.ts para las queries correspondientes.

## Cambios realizados
- **server/storage.ts**: Agregados metodos `getPurchaseOrdersByCostCenter(costCenter)` y `getProductsByCostCenter(costCenter)` a la interfaz IStorage y a la clase DatabaseStorage.
  - `getPurchaseOrdersByCostCenter`: Obtiene recepciones (purchaseOrderReceipts) con productId no null en el CC, las agrupa por purchaseOrderNumber, e incluye datos del producto y seriales activos si requiresSerial=true.
  - `getProductsByCostCenter`: Obtiene productos con inventory > 0 en bodegas del CC que ademas tienen purchaseOrderReceipts enlazados. Incluye detalle por bodega, OCs enlazadas, y seriales agrupados por bodega.
- **server/routes.ts**: Agregados 2 endpoints:
  - `GET /api/cost-centers/:costCenter/purchase-orders` — con requirePermission("warehouses.view") y validacion RBAC via getAllowedCostCenters
  - `GET /api/cost-centers/:costCenter/products` — mismo esquema de autorizacion

## Decisiones tomadas
- Se usa el patron de autorizacion existente (getAllowedCostCenters + 403) identico al de los endpoints de trazabilidad
- Los endpoints se colocaron justo antes de la seccion PRODUCT ROUTES para mantener agrupados todos los endpoints de cost-centers
- Se filtra por `purchaseOrderReceipts.productId IS NOT NULL` para solo mostrar recepciones con producto enlazado
- En getProductsByCostCenter se hace doble filtro: stock > 0 Y receipt existente en el CC

## Pendientes
- [ ] Verificacion con roles PM y operator (rate limiting impidio testing completo en sesion anterior)
- [ ] Limpieza de datos de prueba (productos duplicados, nombres incorrectos como "Alejandro")

## Contexto para proxima sesion
Endpoints 100% funcionales. Probados con admin: CC 3-1564A1 retorna OCs y productos correctamente. CC252130 retorna arrays vacios (no tiene recepciones con productId enlazado). Sin autenticacion retorna 401. No se modifico ningun endpoint ni funcionalidad existente.
