# Sesion 2026-04-13

## Resumen
Extension del endpoint POST /api/inventory-transfers para soportar guia de despacho obligatoria en movimientos hacia bodega despacho. Parte del flujo de despacho completo.

## Cambios realizados
- **server/routes.ts** (POST /api/inventory-transfers ~linea 682):
  - Extraccion de `dispatchGuideNumber` del request body
  - Validacion: si destino es bodega despacho y no hay guia, retorna 400
  - El campo se pasa a ambos movimientos (OUT e IN) via spread condicional

## Decisiones tomadas
- La guia se valida SOLO cuando destino es despacho — no afecta otros tipos de transfer
- Se guarda en ambos movimientos para trazabilidad completa
- Se usa `.trim()` para evitar guias con solo espacios

## Pendientes
- [ ] Ninguno

## Contexto para proxima sesion
El endpoint de transfers ahora soporta `dispatchGuideNumber` como campo opcional que se vuelve obligatorio cuando el destino es bodega despacho. Compatible con la pagina de despacho y con ProductMovements.tsx (que no envia el campo para traspasos normales).
