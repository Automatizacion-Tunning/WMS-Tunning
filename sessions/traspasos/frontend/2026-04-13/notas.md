# Sesion 2026-04-13

## Resumen
Creacion de pagina dedicada de despacho (DispatchPage.tsx) con estructura visual identica a ProductMovements.tsx, ruta /despacho, y enlace en Sidebar solo para admin.

## Cambios realizados
- **client/src/pages/dispatch/DispatchPage.tsx** (NUEVO): Pagina completa de despacho
  - Selector de centro de costo
  - Selector de bodega origen (excluye bodegas especiales: despacho, integrador)
  - Bodega despacho destino auto-seleccionada si solo hay una en el CC
  - Campo obligatorio "N° Guia de Despacho" (`dispatchGuideNumber`)
  - Campo opcional "Observacion" (reason)
  - Tabla de productos multi-linea con selector, stock visible, cantidad
  - Boton "Registrar Despacho" con validacion completa
  - Historial de despachos filtrado (movimientos con `dispatchGuideNumber` o bodega tipo despacho)
  - Columna "Guia Despacho" en tabla de historial con Badge mono-espaciado
  - Icono Truck de Lucide para toda la UI
  - Proteccion: muestra mensaje de acceso restringido si no es admin
- **client/src/App.tsx** (linea ~59): Agregada ruta `/despacho` -> `DispatchPage`
- **client/src/components/layout/Sidebar.tsx**:
  - Import de icono `Truck` de lucide-react
  - Destructuracion de `isAdmin` del hook `usePermissions`
  - Nuevo enlace "Despacho" en seccion Inventario, visible solo para `isAdmin`

## Decisiones tomadas
- Se creo como pagina independiente en vez de reutilizar ProductMovements para mantener separacion de responsabilidades
- Bodegas origen excluyen despacho e integrador (solo bodegas operativas)
- Auto-seleccion de bodega despacho cuando solo hay una en el CC (UX mejorada)
- El historial filtra por `subWarehouseType === 'despacho'` O `dispatchGuideNumber` presente
- Enlace en seccion "Inventario" del sidebar con condicion `isAdmin`

## Pendientes
- [ ] Ninguno — frontend completo

## Contexto para proxima sesion
La pagina `/despacho` esta disponible y funcional. Solo admin puede verla y usarla. Usa el endpoint POST /api/inventory-transfers con el campo adicional `dispatchGuideNumber`. El historial muestra la guia de despacho asociada a cada movimiento.
