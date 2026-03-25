# Sesion 2026-03-23

## Resumen
Implementacion de endpoints de dashboard para graficos de suministros por centro de costo con filtro por CC.

## Cambios realizados
- `shared/schema.ts`: Agregados tipos `DashboardOcStatus` y `DashboardWarehouseDistribution`
- `server/storage.ts`:
  - Importados nuevos tipos
  - Agregados 4 metodos a IStorage y DatabaseStorage:
    - `getCostCentersByWarehouses(warehouseIds)`: DISTINCT costCenter de warehouses por IDs
    - `getAllActiveCostCenters()`: DISTINCT costCenter de todas las bodegas activas
    - `getDashboardOcStatus(costCenters?)`: Agrupacion de purchaseOrderReceipts por CC
    - `getDashboardWarehouseDistribution(costCenters?)`: JOIN inventory+warehouses por CC
- `server/routes.ts`:
  - Helper `getAllowedCostCenters(userId)`: determina CCs permitidos segun rol
  - `GET /api/dashboard/available-cost-centers`: retorna CCs segun rol (admin=todos, PM=solo suyos)
  - `GET /api/dashboard/oc-status?costCenter=XXX`: datos OC, filtro opcional por CC con validacion 403
  - `GET /api/dashboard/warehouse-distribution?costCenter=XXX`: distribucion, filtro opcional con validacion 403

## Decisiones tomadas
- Helper `getAllowedCostCenters` extraido para evitar duplicacion entre endpoints
- Admin retorna `undefined` (sin filtro), PM retorna array de CCs permitidos
- Query param `costCenter` se valida contra CCs permitidos: si PM pide CC ajeno -> 403
- Si PM no tiene ni managedWarehouses ni costCenter -> retorna array vacio

## Pendientes
- [ ] Verificar con datos reales
- [ ] Considerar cache si los queries son lentos

## Contexto para proxima sesion
3 endpoints de dashboard listos con filtrado por CC y validacion de permisos por rol.
Frontend consume via DashboardChartsSection con selector dropdown.
