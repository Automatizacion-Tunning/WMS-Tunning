# Sesion 2026-04-01

## Resumen
Logica backend de traspasos extendida para soportar bodegas Garantia y Despacho. Restriccion admin-only para Despacho, razones automaticas, y tipos de movimiento diferenciados.

## Cambios realizados
- **server/routes.ts** (POST /api/inventory-transfers):
  - Deteccion de tipo de bodega destino y origen (garantia, despacho)
  - Restriccion admin-only para despacho via `getUserPermissions()`
  - Razones automaticas: "Envio a revision por garantia", "Despacho a cliente", "Retorno desde garantia/despacho"
  - Tipos de respuesta: `warranty`, `dispatch_client`

- **server/routes.ts** (POST /api/transfer-orders):
  - Verificacion admin para ordenes de traspaso hacia/desde bodega despacho

- **server/routes.ts** (GET /api/inventory):
  - Query param `excludeSpecial=true` para filtrar inventario de bodegas especiales

## Decisiones tomadas
- Garantia y Despacho no son como Integrador (que solo crea OUT). Ambos crean IN + OUT porque los productos siguen siendo rastreables dentro del sistema.
- La restriccion admin se verifica en runtime en cada request, no via middleware separado — esto permite mas flexibilidad (un endpoint puede tener multiples restricciones segun el tipo de bodega).

## Pendientes
- [ ] Probar endpoint de traspasos con bodega garantia
- [ ] Probar endpoint de traspasos con bodega despacho como admin → debe funcionar
- [ ] Probar endpoint de traspasos con bodega despacho como operator → debe retornar 403
- [ ] Probar query param excludeSpecial en /api/inventory

## Contexto para proxima sesion
El patron de restriccion admin inline (dentro del handler, no como middleware) se aplica en 2 endpoints:
1. POST /api/inventory-transfers — traspaso directo
2. POST /api/transfer-orders — creacion de orden de traspaso
Ambos usan `getUserPermissions(userId).isAdmin` de authorization.ts.
