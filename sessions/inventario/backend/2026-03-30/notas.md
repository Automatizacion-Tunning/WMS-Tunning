# Sesion 2026-03-30

## Resumen
Nuevo endpoint de detalle de producto con trazabilidad unitaria por numero de serie. Se hace LEFT JOIN de productSerials con inventoryMovements para obtener OC de origen y fecha de ingreso de cada serial.

## Cambios realizados
- **server/storage.ts**: Nuevo metodo `getProductDetailByCostCenter(costCenter, productId)` que ejecuta LEFT JOIN de productSerials con inventoryMovements (via movementId) para cada bodega del CC. Retorna: serialNumber, warehouseId, warehouseName, purchaseOrderNumber (OC de origen), dateIngress (createdAt del movimiento), status.
- **server/routes.ts**: Nuevo endpoint `GET /api/cost-centers/:costCenter/products/:productId/detail` con auth + warehouses.view + RBAC.

## Decisiones tomadas
- LEFT JOIN (no INNER JOIN) para no perder seriales que puedan tener movementId null
- La trazabilidad se resuelve en una sola query por bodega: productSerials LEFT JOIN inventoryMovements ON movementId = id
- Solo se incluyen seriales con status='active'
- Para productos SIN serial, el campo `serials` no se incluye en la respuesta (undefined)

## Pendientes
- [ ] Verificar trazabilidad con datos reales (que el movementId este correctamente enlazado a inventoryMovements con purchaseOrderNumber)
- [ ] Verificar el caso de WARN TRAZ-015 de la sesion anterior (product 29 con stock en warehouse 50 sin seriales)

## Contexto para proxima sesion
Endpoint de detalle retorna estructura:
```json
{
  "productId": 29,
  "name": "...",
  "requiresSerial": true,
  "currentPrice": 2350,
  "lastReceptionDate": "2026-03-15",
  "warehouseDistribution": [{ "warehouseId": 48, "warehouseName": "...", "warehouseType": "Principal", "quantity": 3 }],
  "purchaseOrders": [{ "purchaseOrderNumber": "45230", "purchaseOrderLine": 1, "codprod": "...", ... }],
  "serials": [{ "serialNumber": "23412", "warehouseName": "Bodega Principal", "purchaseOrderNumber": "45230", "dateIngress": "2026-03-15", "status": "active" }]
}
```
