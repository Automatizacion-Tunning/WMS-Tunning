# Sesion 2026-04-01

## Resumen
Implementacion de dos nuevos tipos de bodega especial: `garantia` y `despacho`. Backend: schema actualizado, logica de traspasos extendida con deteccion de bodegas especiales, restriccion admin-only para despacho, razones automaticas en movimientos, y filtro de stock disponible excluyendo bodegas especiales.

## Cambios realizados
- **shared/schema.ts**:
  - Actualizado comentario de `subWarehouseType` para incluir `garantia` y `despacho` como valores validos

- **server/routes.ts** (endpoint POST /api/inventory-transfers):
  - Deteccion de bodegas garantia y despacho (origen y destino), similar a logica existente de integrador
  - Restriccion admin-only: movimientos hacia/desde bodega Despacho requieren `getUserPermissions()` → `isAdmin`. Retorna 403 si no es admin
  - Razones automaticas segun tipo: "Envio a revision por garantia", "Despacho a cliente", "Retorno desde despacho", "Retorno desde garantia"
  - Tipos de respuesta: `warranty` (garantia), `dispatch_client` (despacho), ademas de los existentes `transfer` y `dispatch`
  - A diferencia de integrador (solo OUT), garantia y despacho crean ambos movimientos (OUT + IN)

- **server/routes.ts** (endpoint POST /api/transfer-orders):
  - Verificacion admin-only para crear ordenes de traspaso hacia/desde bodegas Despacho

- **server/routes.ts** (endpoint GET /api/inventory):
  - Nuevo query param `excludeSpecial=true` que filtra inventario de bodegas garantia y despacho del listado

- **server/storage.ts** (metodo createCostCenter):
  - Agregados `garantia` y `despacho` al array de sub-bodegas que se crean automaticamente con un nuevo centro de costo

## Decisiones tomadas
- Garantia y Despacho crean movimientos IN + OUT (a diferencia de Integrador que solo crea OUT) — los productos siguen rastreables dentro del sistema, solo cambian de bodega
- La restriccion admin para Despacho se aplica tanto en traspasos directos como en ordenes de traspaso
- El filtro de stock disponible es opt-in via query param para no romper endpoints existentes
- Las razones automaticas se aplican solo si el usuario no proporciona una razon manual

## Pendientes
- [ ] Verificar visualmente en navegador con datos reales
- [ ] Probar restriccion admin: usuario no-admin intenta mover a bodega Despacho → debe recibir 403
- [ ] Probar creacion de centro de costo nuevo → debe incluir bodegas Garantia y Despacho automaticamente

## Contexto para proxima sesion
Patron de deteccion de bodegas especiales en routes.ts:
- `isIntegrador` / `isGarantia` / `isDespacho` — basado en `destWarehouse.subWarehouseType`
- `sourceIsGarantia` / `sourceIsDespacho` — basado en `sourceWarehouse.subWarehouseType`
- Admin check usa `getUserPermissions(userId)` importado de authorization.ts
