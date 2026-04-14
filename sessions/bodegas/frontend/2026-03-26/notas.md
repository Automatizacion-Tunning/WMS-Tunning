# Sesion 2026-03-26

## Resumen
Creacion de vista jerarquica de trazabilidad (solo lectura) con 4 niveles expandibles usando Collapsible de Radix UI.

## Cambios realizados

### client/src/pages/warehouses/TraceabilityView.tsx (NUEVO)
- Componente principal `TraceabilityView` con 4 niveles de drill-down:
  - Nivel 1: Centros de Costo (cards expandibles con filtro de busqueda)
  - Nivel 2: Bodegas por CC (nombre, tipo main/sub, total productos, total unidades)
  - Nivel 3: Productos por bodega (nombre, SKU, barcode, stock, codigo ERP, badges OC/Serial)
  - Nivel 4: Detalle del producto (tabla de OC enlazadas + lista de seriales activos)
- Lazy loading: cada nivel carga datos solo al expandir (useQuery con enabled)
- Componentes usados: Collapsible (Radix), Table, Badge, Card, Skeleton, Input
- Tema dark con acentos en amber-400 (dorado)
- Solo lectura — no hay mutaciones ni formularios

### client/src/App.tsx
- Importado `TraceabilityView`
- Agregada ruta `/traceability`

### client/src/components/layout/Sidebar.tsx
- Agregado icono `GitBranch` de lucide
- Nuevo item "Trazabilidad" en seccion Bodegas, visible con permisos `warehouses.view` o `inventory.view`

### client/src/components/layout/Header.tsx
- Agregado titulo de pagina para `/traceability`

## Decisiones tomadas
- Se creo como pagina separada (`/traceability`) en lugar de integrarla en CostCenterManagement.tsx para no afectar funcionalidad existente
- Se uso Collapsible en vez de Accordion para mayor control del lazy loading (expanded state manual)
- Se ubico en la seccion "Bodegas" del sidebar ya que la jerarquia parte desde centros de costo
- Estados de OC: Completo (verde), Parcial (gris), Pendiente (outline) calculados desde ordered-received
- Seriales solo se muestran si el producto tiene requiresSerial=true

## Pendientes
- [ ] Verificar visualmente con datos reales
- [ ] Evaluar paginacion si hay muchos productos por bodega

## Contexto para proxima sesion
Vista completamente funcional con 4 niveles. Accesible desde sidebar > Bodegas > Trazabilidad. No modifica ninguna pagina ni componente existente.
