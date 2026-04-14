# Sesion 2026-03-30

## Resumen
Refactorizacion completa de los sub-apartados de OC y Productos dentro de Centros de Costo. Se reemplazo el sistema de collapsibles por tablas con filas clickeables que abren un modal (Dialog) de ficha de producto con detalle completo y trazabilidad unitaria.

## Cambios realizados
- **client/src/pages/warehouses/CostCenterManagement.tsx**:
  - Import de `X` icon agregado
  - Eliminados componentes: `OcProductRow` (con expand de seriales inline), `ProductBlock` (collapsible con detalle)
  - NUEVO componente `ProductDetailModal`: Dialog modal que carga datos desde `/api/cost-centers/:costCenter/products/:productId/detail`. Contenido:
    - Header: nombre, SKU, barcode, codigo ERP, badge Serial/Cantidad, precio actual, fecha ultima recepcion
    - Seccion Distribucion por Bodega: tabla con bodega, tipo, stock
    - Seccion Ordenes de Compra: tabla con OC, linea, cod ERP, ordenado, recibido, pendiente, precio unit., fecha
    - Seccion Detalle por Unidad (condicional): SI requiresSerial=true muestra tabla de seriales con trazabilidad (serial, bodega, OC origen, fecha ingreso, estado) + input busqueda. SI requiresSerial=false no muestra esta seccion.
  - `CostCenterTabs`: ahora gestiona estado `modalProduct` para abrir/cerrar el modal. Pasa `onProductClick` a ambos tabs.
  - `PurchaseOrdersTab` y `OcBlock`: refactorizados. La tabla de productos dentro de cada OC ahora incluye columnas Precio Unit., Estado (Completo/Parcial/Pendiente), Tipo (badge Serial/Cantidad). Cada fila es clickeable → abre modal.
  - `ProductsTab`: refactorizado de collapsibles a tabla unica con columnas Producto, SKU, Stock Total, Bodegas, OCs, Precio Actual, Ult. Recepcion, Tipo. Cada fila clickeable → abre modal.
  - `WarehouseProductsPanel` y `WarehouseProductItem`: NO MODIFICADOS — siguen funcionando para la expansion de bodegas individuales.

## Decisiones tomadas
- Modal en vez de collapsible para la ficha de producto — mejor UX, mas espacio para mostrar detalle, y lazy loading natural (carga al abrir).
- Badge de tipo (Serial/Cantidad) en azul/gris para diferenciar visualmente en todas las tablas.
- Estado tripartito en tab OC: Completo (verde), Parcial (amarillo), Pendiente (rojo) en vez de solo Completo/Pendiente.
- Icono lupa (Search) en cada fila clickeable para indicar que se puede hacer click.
- Filtro de seriales en el modal con input de busqueda.
- El modal se monta/desmonta al abrir/cerrar → limpia la query automaticamente.

## Pendientes
- [ ] Verificar visualmente en el navegador con datos reales
- [ ] Probar modal con producto CON serial (tabla de trazabilidad)
- [ ] Probar modal con producto SIN serial (sin seccion de detalle por unidad)
- [ ] Verificar que la tabla de bodegas expandible (WarehouseProductsPanel) sigue funcionando

## Contexto para proxima sesion
Estructura de componentes:
- CostCenterTabs → PurchaseOrdersTab / ProductsTab (tablas con filas clickeables)
- ProductDetailModal (Dialog) — se abre desde cualquier tab, carga /detail bajo demanda
- WarehouseProductsPanel / WarehouseProductItem — sin cambios, funcionan dentro de la tabla de bodegas

Tema dark (zinc-950, amber-400) mantenido en el modal. Max-width 3xl, max-height 85vh con scroll.
