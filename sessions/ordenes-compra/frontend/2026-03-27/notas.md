# Sesion 2026-03-27

## Resumen
Primera sesion de frontend de ordenes-compra. Se integraron vistas de OC dentro de la pagina de Centros de Costo (no en la pagina de OC directamente). Las OCs se visualizan agrupadas por CC en la tab "Por Orden de Compra".

## Cambios realizados
- Ninguno en paginas existentes de ordenes-compra
- La visualizacion de OCs por CC se agrego en `CostCenterManagement.tsx` (ver sesion bodegas/frontend/2026-03-27)

## Decisiones tomadas
- La vista de OCs por CC vive en la pagina de Centros de Costo, no en la pagina de Ordenes de Compra, porque el contexto es "ver que OCs llegaron a este CC"

## Pendientes
- Ninguno especifico para este apartado

## Contexto para proxima sesion
La pagina de Ordenes de Compra existente no fue modificada. Si se quiere agregar una vista de OC dentro de su propia pagina (filtrada por CC), seria trabajo nuevo e independiente.
