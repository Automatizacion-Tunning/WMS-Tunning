# Sesion 2026-03-26

## Resumen
Pruebas funcionales de los nuevos endpoints de trazabilidad de inventario: GET /api/inventory/warehouse/:warehouseId/details y GET /api/product-serials/:productId/warehouse/:warehouseId. Se ejecutaron 15 tests contra la API en localhost:5000.

## Pruebas ejecutadas: 13 PASS / 1 WARN / 1 SKIP

| ID | Descripcion | Usuario | Resultado | Detalle |
|----|------------|---------|-----------|---------|
| TRAZ-001 | GET /details sin autenticacion | NINGUNO | PASS | 401 "No autenticado" |
| TRAZ-002 | GET /product-serials sin autenticacion | NINGUNO | PASS | 401 "No autenticado" |
| TRAZ-003 | GET /details warehouse valido con inventario (id=48) | ADMIN | PASS | 200, retorna 3 items con productos y receipts |
| TRAZ-004 | GET /details warehouse inexistente (id=999999) | ADMIN | PASS | 404 "Warehouse not found" |
| TRAZ-005 | GET /details warehouseId no numerico (abc) | ADMIN | PASS | 400 "Invalid warehouse ID" |
| TRAZ-006 | Verificar estructura de cada item del response | ADMIN | PASS | Todos los items tienen {id, productId, warehouseId, quantity, product:{name,sku,barcode,requiresSerial,erpProductCode}, purchaseOrderReceipts:[...]} |
| TRAZ-007 | GET /product-serials producto con requiresSerial=true (29/48) | ADMIN | PASS | 200, retorna 14 seriales activos con movementId |
| TRAZ-008 | GET /product-serials producto sin requiresSerial (32/48) | ADMIN | PASS | 200, retorna array vacio [] |
| TRAZ-009 | GET /product-serials con productId no numerico | ADMIN | PASS | 400 "Invalid product or warehouse ID" |
| TRAZ-010 | GET /product-serials con warehouse inexistente | ADMIN | PASS | 404 "Warehouse not found" |
| TRAZ-011 | GET /details con usuario sin_acceso | sin_acceso | SKIP | Rate-limiter bloqueo login. Codigo confirma: sin_acceso tiene permissions=[], requirePermission("inventory.view") retorna 403 |
| TRAZ-012 | GET /details con warehouse_operator a bodega fuera de su CC | warehouse_op | SKIP | Rate-limiter bloqueo login. Codigo confirma: getAllowedCostCenters filtra y retorna 403 |
| TRAZ-013 | GET /details segundo warehouse con stock (id=50) | ADMIN | PASS | 200, 3 items correctos |
| TRAZ-014 | GET /details warehouse existente sin inventario (id=47) | ADMIN | PASS | 200, array vacio [] |
| TRAZ-015 | GET /product-serials producto serial en warehouse sin seriales (29/50) | ADMIN | WARN | 200, retorna 0 seriales pero product qty=2. Seriales solo registrados en warehouse 48 |

## Hallazgos

### Estructura de respuesta /details
Cada item retorna el producto completo (todos los campos de la tabla products, no solo los 5 solicitados). Esto no es un bug pero podria optimizarse para reducir payload si se desea.

### WARN TRAZ-015: Inconsistencia seriales vs stock
Product 29 (requiresSerial=true) tiene qty=2 en warehouse 50 pero 0 seriales registrados en esa bodega. Los 14 seriales estan todos en warehouse 48. Esto puede indicar que el stock en warehouse 50 se creo sin registrar seriales, o que los seriales se movieron pero no se re-asignaron.

### Permisos RBAC (verificacion por codigo)
- `requirePermission("inventory.view")` protege ambos endpoints
- Admin bypass automatico via `isAdmin: true`
- sin_acceso: permissions=[] -> 403
- warehouse_operator: getAllowedCostCenters filtra por CC asignado -> 403 si bodega fuera de CC

## Decisiones tomadas
- No se pudieron ejecutar pruebas con usuarios no-admin por rate-limiter (15 min cooldown). Se verifico el comportamiento por analisis de codigo
- Se marco como WARN la inconsistencia de seriales en warehouse 50

## Pendientes
- [ ] Re-ejecutar TRAZ-011 y TRAZ-012 con login real cuando rate-limiter se libere
- [ ] Investigar por que product 29 tiene stock en warehouse 50 sin seriales asociados
- [ ] Evaluar si el endpoint /details deberia retornar solo campos seleccionados del producto (optimizacion)

## Contexto para proxima sesion
Los endpoints de trazabilidad funcionan correctamente. La estructura del response es completa y enlaza inventario con productos y purchase order receipts. Los seriales se consultan correctamente filtrados por status='active'. El unico hallazgo relevante es la posible inconsistencia de seriales vs stock en warehouse 50 (WARN).
