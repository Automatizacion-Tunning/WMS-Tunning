# 3. Dashboard

## Descripcion General

El Dashboard es la pagina principal del sistema WMS. Presenta un resumen ejecutivo del estado del inventario mediante tarjetas de metricas, una tabla de inventario reciente y accesos directos a acciones frecuentes. Es la primera pantalla que ve el usuario despues de autenticarse y se accede desde la ruta raiz `/`.

## Paginas Frontend

| Ruta | Componente | Archivo |
|------|-----------|---------|
| `/` | Dashboard | `client/src/pages/Dashboard.tsx` |

## Endpoints API

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| GET | `/api/dashboard/metrics` | requireAuth | Obtiene las metricas principales del dashboard |
| GET | `/api/dashboard/recent-inventory` | requireAuth | Obtiene los 10 registros de inventario mas recientes |

### Detalle de cada endpoint

**GET /api/dashboard/metrics**
- Llama a `storage.getDashboardMetrics()`
- Retorna un objeto con:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `totalProducts` | number | Cantidad de productos activos (`isActive = true`) |
| `activeWarehouses` | number | Cantidad de bodegas activas (`isActive = true`) |
| `totalInventoryValue` | number | Valor total del inventario calculado como `SUM(cantidad * precio_mensual_actual)` |

El valor del inventario se calcula multiplicando la cantidad en stock por el precio del mes y ano actuales registrado en la tabla `productPrices`.

**GET /api/dashboard/recent-inventory**
- Llama a `storage.getAllInventory()`
- Retorna los primeros 10 registros (`.slice(0, 10)`)
- Cada registro incluye datos del producto y la bodega asociada (tipo `InventoryWithDetails`)

## Tablas de Base de Datos

### Tablas consultadas por el Dashboard

**products** (para conteo de productos activos)
| Campo | Tipo | Relevancia |
|-------|------|------------|
| id | serial PK | Identificador |
| isActive | boolean | Filtro: solo cuenta productos activos |

**warehouses** (para conteo de bodegas activas)
| Campo | Tipo | Relevancia |
|-------|------|------------|
| id | serial PK | Identificador |
| isActive | boolean | Filtro: solo cuenta bodegas activas |

**inventory** (para inventario reciente y valor total)
| Campo | Tipo | Relevancia |
|-------|------|------------|
| id | serial PK | Identificador |
| productId | integer FK | Referencia al producto |
| warehouseId | integer FK | Referencia a la bodega |
| quantity | integer | Cantidad en stock |

**productPrices** (para calculo de valor de inventario)
| Campo | Tipo | Relevancia |
|-------|------|------------|
| productId | integer FK | Referencia al producto |
| year | integer | Ano del precio |
| month | integer | Mes del precio (1-12) |
| price | decimal(10,2) | Precio unitario |

## Validaciones

### Reglas de negocio
- Solo se contabilizan productos con `isActive = true`
- Solo se contabilizan bodegas con `isActive = true`
- El valor del inventario usa el precio del mes y ano actual; si no existe precio para el periodo actual, el producto no suma al valor total (resultado del `coalesce` con 0)
- El inventario reciente se limita a 10 registros

### Validaciones de estado en el frontend
- Si `quantity === 0`, el estado se muestra como **"Sin Stock"** con badge `destructive` (rojo)
- Si `quantity > 0`, el estado se muestra como **"Disponible"** con badge `default`

## Permisos Requeridos

| Accion | Permiso |
|--------|---------|
| Ver dashboard | requireAuth (cualquier usuario autenticado) |
| Ver metricas | requireAuth (cualquier usuario autenticado) |
| Ver inventario reciente | requireAuth (cualquier usuario autenticado) |

No se requieren permisos especificos de rol para acceder al Dashboard. Cualquier usuario autenticado con sesion activa puede ver todas las metricas e inventario reciente.

## Componentes de la Interfaz

### Tarjetas de Metricas (MetricCard)

Se muestran 3 tarjetas en una grilla responsive (2 columnas en movil, 3 en desktop):

| Metrica | Icono | Color | Subtitulo |
|---------|-------|-------|-----------|
| Total Productos | Package | primary (azul) | "productos activos" |
| Bodegas Activas | Warehouse | verde | "100% operativas" |
| Valor Inventario | DollarSign | purpura | "valor total" |

El valor del inventario se formatea como moneda chilena (CLP) usando `Intl.NumberFormat('es-CL')`.

### Tabla de Inventario Reciente

Muestra los ultimos 10 registros del inventario con las siguientes columnas:

| Columna | Contenido |
|---------|-----------|
| Producto | Nombre del producto + SKU |
| Bodega | Nombre de la bodega |
| Stock | Cantidad + "unidades" |
| Estado | Badge: "Disponible" o "Sin Stock" |
| Acciones | Botones de editar y eliminar |

**Vista responsiva:** En pantallas moviles, la tabla se reemplaza por tarjetas individuales que muestran la misma informacion en formato compacto.

### Panel de Acciones Rapidas

Ubicado en la columna lateral derecha (ocupa 1/3 del ancho en desktop):

| Accion | Icono | Color |
|--------|-------|-------|
| Agregar Producto | Plus | azul (primary) |
| Nueva Bodega | Warehouse | verde |
| Generar Reporte | BarChart3 | purpura |

### Estados de Carga

Mientras los datos se obtienen del servidor, se muestran componentes `Skeleton` como placeholders:
- 3 skeletons para las tarjetas de metricas
- 3 skeletons para las filas de inventario

## Flujos de Uso

### Flujo de carga del Dashboard

1. El usuario se autentica exitosamente y es redirigido a `/`
2. El componente Dashboard se monta
3. Se disparan dos queries en paralelo via React Query:
   - `GET /api/dashboard/metrics` (key: `/api/dashboard/metrics`)
   - `GET /api/dashboard/recent-inventory` (key: `/api/dashboard/recent-inventory`)
4. Mientras cargan, se muestran skeletons animados
5. Al recibir las metricas, se renderizan las 3 tarjetas MetricCard
6. Al recibir el inventario, se renderiza la tabla (desktop) o tarjetas (movil)
7. El panel de acciones rapidas se muestra inmediatamente (no depende de datos)

### Flujo de consulta de estado de stock

1. El usuario observa la tabla de inventario reciente
2. Para cada producto, el sistema evalua la cantidad:
   - `quantity === 0` -> Badge rojo "Sin Stock"
   - `quantity > 0` -> Badge default "Disponible"
3. El usuario puede identificar rapidamente productos sin stock
