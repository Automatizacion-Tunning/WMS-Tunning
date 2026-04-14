# Sesion 2026-03-27

## Resumen
Agregados sub-apartados de OC y Productos como pestanas (Tabs) dentro de cada centro de costo expandido en CostCenterManagement.tsx. Ademas, cada fila de bodega es ahora expandible para ver los productos de esa bodega con filtro de busqueda. Funcionalidad de solo lectura con lazy loading.

## Cambios realizados
- **client/src/pages/warehouses/CostCenterManagement.tsx**:
  - Import de `React` agregado para usar `React.Fragment`
  - Import de `Search` icon de lucide-react
  - Agregado estado `expandedCCs` para controlar que CCs estan expandidos (click en CardHeader)
  - Agregado estado `expandedWarehouses` para controlar que bodegas estan expandidas
  - Funcion `toggleWarehouse(id)` para expand/collapse de bodegas
  - Cada fila de bodega es ahora clickable: al hacer click se despliega un panel con los productos de esa bodega
  - Componente `WarehouseProductsPanel`: consume `GET /api/inventory/warehouse/:warehouseId/details`. Muestra input de busqueda para filtrar por nombre, SKU, codigo ERP, barcode o N° OC. Lista de productos como bloques expandibles (Collapsible).
  - Componente `WarehouseProductItem`: muestra detalle del producto (codigo ERP, barcode), OCs enlazadas con estado (Pendiente/Completo), y numeros de serie (lazy-loaded via `GET /api/product-serials/:productId/warehouse/:warehouseId`).
  - Componente `CostCenterTabs` se renderiza debajo de la tabla de bodegas cuando el CC esta expandido
  - Tab "Por Orden de Compra" (`PurchaseOrdersTab`): consume `GET /api/cost-centers/:costCenter/purchase-orders`
  - Tab "Por Producto" (`ProductsTab`): consume `GET /api/cost-centers/:costCenter/products`
  - Tema dark mantenido: zinc-900/zinc-800 backgrounds, amber-400 accents

## Decisiones tomadas
- Lazy loading a 3 niveles: CC expand → bodega expand → producto expand (seriales)
- El filtro de productos en bodega busca en nombre, SKU, barcode, erpProductCode y purchaseOrderNumber
- Se usa el endpoint existente `/api/inventory/warehouse/:warehouseId/details` (no se creo endpoint nuevo)
- Los seriales se cargan lazy solo al expandir un producto con requiresSerial=true
- Se usa React.Fragment para poder renderizar filas expandibles dentro de TableBody

## Pendientes
- [ ] Verificar visualmente en el navegador que el tema dark se ve correcto
- [ ] Verificar que no hay conflictos con la pagina de trazabilidad (TraceabilityView.tsx)
- [ ] Test con datos reales despues de limpieza de productos

## Contexto para proxima sesion
Hay 3 niveles de expansion en la pagina:
1. CC (click en header) → muestra tabla de bodegas + tabs OC/Productos
2. Bodega (click en fila) → muestra productos de esa bodega con filtro
3. Producto dentro de bodega (click en producto) → muestra detalle, OCs enlazadas, seriales

Todos los datos se cargan lazy. No se modifico ningun endpoint ni funcionalidad existente. Se reutiliza el endpoint existente de trazabilidad `/api/inventory/warehouse/:warehouseId/details`.
