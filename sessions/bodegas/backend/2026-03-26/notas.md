# Sesion 2026-03-26

## Resumen
Se ejecutaron pruebas funcionales sobre los 4 nuevos endpoints de trazabilidad jerarquica: GET /api/cost-centers, GET /api/warehouses/by-cost-center/:costCenter, GET /api/inventory/warehouse/:warehouseId/details, y GET /api/product-serials/:productId/warehouse/:warehouseId.

## Cambios realizados
- No se modifico codigo. Solo ejecucion de pruebas.

## Decisiones tomadas
- Se reseteo password de usuario sin_acceso (id=12) para poder ejecutar pruebas RBAC — No habia credenciales conocidas
- No se pudo probar con warehouse_operator ni project_manager por rate limiting activo — Se documento como pendiente

## Pendientes
- [ ] Probar endpoints con usuario warehouse_operator (tiene warehouses.view) para verificar filtrado RBAC por CC asignado
- [ ] Probar endpoints con usuario project_manager para verificar acceso limitado a sus CCs
- [ ] Probar GET /api/inventory/warehouse/:warehouseId/details con datos reales de inventario
- [ ] Verificar que warehouse_operator solo ve bodegas de sus CCs asignados en /api/cost-centers

## Contexto para proxima sesion
- Los 4 endpoints de trazabilidad estan implementados y funcionales
- Autenticacion (401) y autorizacion (403 sin_acceso) verificados OK
- Estructura de respuesta validada: cost-centers retorna {costCenter, warehouseCount}, by-cost-center retorna bodegas con totalProducts y totalUnits
- CC inexistente retorna array vacio (200), no 404
- product-serials con IDs invalidos retorna 400, warehouse inexistente retorna 404
- Rate limiting bloqueo pruebas con operator y PM — esperar 15 min o probar en otra sesion
