# Sesion 2026-04-01

## Resumen
Implementacion de restricciones y diferenciacion visual para bodegas Garantia y Despacho en los formularios de traspaso (TransferRequestForm y ProductMovements).

## Cambios realizados
- **client/src/components/forms/TransferRequestForm.tsx**:
  - Import de `usePermissions` para obtener `isAdmin`
  - Filtro de bodegas origen y destino: Despacho solo visible si `isAdmin`
  - Badges visuales en selectores: ambar para Garantia, azul para Despacho
  - Variable `specialTypes` definida para referencia futura

- **client/src/pages/products/ProductMovements.tsx**:
  - Import de `usePermissions` para obtener `isAdmin`
  - Deteccion de tipo destino refactorizada: `destinationSubType` (memo) con flags `isDestinationGarantia`, `isDestinationDespacho`
  - Filtro de bodegas destino: Despacho solo visible si `isAdmin`
  - Indicadores visuales nuevos:
    - Garantia: banner ambar "Envio a Garantia — Los productos quedaran en revision por garantia y no estaran disponibles"
    - Despacho: banner azul "Despacho a Cliente — Los productos se registraran como entregados al cliente"
  - Boton de submit con texto dinamico: "Enviar a Garantia (N)" / "Registrar Despacho (N)"
  - Badges de tipo en opciones de bodega destino
  - Campo `subWarehouseType` incluido en el mapeo de `destinationBodegas`

## Decisiones tomadas
- La restriccion admin se aplica filtrando las opciones del select (no deshabilitando) — usuario no-admin simplemente no ve Despacho como opcion
- Los indicadores visuales siguen el patron del indicador de Integrador existente
- Se incluyo `subWarehouseType` en el mapeo de destinationBodegas para poder renderizar badges

## Pendientes
- [ ] Verificar visualmente los banners y badges en el navegador
- [ ] Probar como admin: debe ver Despacho en selectores
- [ ] Probar como operator: no debe ver Despacho en selectores

## Contexto para proxima sesion
Flujo de traspasos ahora soporta 4 tipos de destino:
1. Normal (transfer) — traspaso estandar entre bodegas
2. Integrador (dispatch) — solo OUT, salida del inventario del CC
3. Garantia (warranty) — IN + OUT, productos en revision
4. Despacho (dispatch_client) — IN + OUT, solo admin, entregado a cliente
