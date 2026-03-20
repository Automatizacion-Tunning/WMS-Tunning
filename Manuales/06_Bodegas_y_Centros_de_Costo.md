# 6. Bodegas y Centros de Costo

## Descripcion General

Este modulo gestiona la estructura jerarquica de bodegas organizadas por centros de costo. Cada centro de costo agrupa una **bodega principal** y hasta cuatro **sub-bodegas** con tipos especificos del negocio (UM2, Plataforma, PEM, Integrador). El sistema soporta creacion automatica de toda la estructura al registrar un nuevo centro de costo, asi como la visualizacion, edicion y eliminacion de bodegas individuales. Ademas, permite consultar el inventario asociado a cada bodega y filtrar por centro de costo, bodega especifica o termino de busqueda.

## Paginas Frontend

### CostCenterManagement (`client/src/pages/warehouses/CostCenterManagement.tsx`)

Pagina dedicada a la gestion de centros de costo. Presenta las bodegas agrupadas por centro de costo en tarjetas con tabla interna. Permite crear un nuevo centro de costo mediante un dialogo modal que solicita:

- **Centro de Costos** (obligatorio, ej: CC252130)
- **Ubicacion** (opcional)

Al crear un centro de costo se generan automaticamente:
- 1 Bodega Principal
- 4 Sub-bodegas: UM2, Plataforma, PEM, Integrador

La tabla muestra nombre, tipo (Principal o subtipo en mayusculas), ubicacion y estado (Activa/Inactiva) de cada bodega. Las bodegas principales se listan primero, seguidas de las sub-bodegas ordenadas alfabeticamente.

### WarehouseManagement (`client/src/pages/warehouses/WarehouseManagement.tsx`)

Pagina principal de gestion de bodegas con vista jerarquica por centro de costo. Incluye:

- **Panel de filtros**: busqueda por texto, filtro por centro de costo, filtro por bodega especifica y contador de resultados.
- **Vista colapsable por centro de costo**: cada centro se presenta como una tarjeta expandible (Collapsible) que muestra la bodega principal destacada en azul y las sub-bodegas en cuadricula.
- **Tarjetas de bodega**: muestran ubicacion, cantidad de productos unicos y total de unidades.
- **Modal de detalle**: al hacer clic en una bodega se abre un dialogo con informacion completa (productos diferentes, total unidades, centro de costo) y la tabla de inventario con producto, SKU, codigo de barras, cantidad y estado de stock.
- **Modal de edicion (EditWarehouseDialog)**: permite modificar nombre, centro de costo, ubicacion, tipo de bodega (principal/sub) y subtipo de sub-bodega (UM2, Plataforma, PEM, Integrador).

### WarehouseDetails (`client/src/pages/warehouses/WarehouseDetails.tsx`)

Pagina de detalle individual de una bodega accesible por ruta parametrizada (`/warehouses/:id`). Muestra:

- Estado de la bodega (Activa/Inactiva)
- Ubicacion
- Cantidad total de productos
- Tabla de inventario con producto, SKU, stock actual y estado (Disponible/Sin Stock)

## Endpoints API

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| GET | `/api/warehouses` | Autenticado | Obtener todas las bodegas |
| GET | `/api/warehouses/:id` | Autenticado | Obtener una bodega por ID |
| POST | `/api/warehouses` | `warehouses.create` | Crear una bodega individual |
| PUT | `/api/warehouses/:id` | `warehouses.edit` | Actualizar una bodega existente (parcial) |
| DELETE | `/api/warehouses/:id` | `warehouses.delete` | Eliminar una bodega |
| POST | `/api/cost-centers` | `cost_centers.create` | Crear centro de costo completo (bodega principal + 4 sub-bodegas) |
| GET | `/api/principal-warehouse/:costCenter` | Autenticado | Obtener la bodega principal de un centro de costo |
| POST | `/api/principal-warehouse` | `warehouses.create` | Crear bodega principal para un centro de costo |

## Tablas de Base de Datos

### warehouses

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | serial (PK) | Identificador unico |
| name | varchar(100) | Nombre de la bodega (obligatorio) |
| location | text | Ubicacion fisica (opcional) |
| costCenter | varchar(100) | Centro de costo al que pertenece (obligatorio) |
| parentWarehouseId | integer (FK) | ID de la bodega padre (para sub-bodegas) |
| warehouseType | varchar(50) | Tipo: `main` (principal) o `sub` (sub-bodega). Por defecto `sub` |
| subWarehouseType | varchar(50) | Subtipo de sub-bodega: `um2`, `plataforma`, `pem`, `integrador` |
| isActive | boolean | Estado activo/inactivo. Por defecto `true` |
| createdAt | timestamp | Fecha de creacion |

**Relaciones:**
- `parentWarehouse`: relacion padre-hijo consigo misma (`parentWarehouseId` -> `warehouses.id`)
- `subWarehouses`: relacion inversa, una bodega principal tiene muchas sub-bodegas
- `inventory`: una bodega tiene muchos registros de inventario
- `inventoryMovements`: una bodega tiene muchos movimientos de inventario

## Validaciones

### Backend (insertWarehouseSchema)
- `name`: requerido, maximo 100 caracteres
- `costCenter`: requerido, maximo 100 caracteres
- `warehouseType`: requerido, debe ser `main` o `sub`
- `subWarehouseType`: opcional, solo aplica si `warehouseType` es `sub`

### Frontend - Creacion de Centro de Costo (costCenterFormSchema)
- `costCenter`: requerido, minimo 1 caracter ("Centro de costos es requerido")
- `location`: opcional

### Frontend - Edicion de Bodega
- Utiliza `insertWarehouseSchema` con todos los campos del esquema de insercion
- El campo `subWarehouseType` solo se muestra condicionalmente cuando `warehouseType === "sub"`

### Endpoint POST /api/cost-centers
- Valida que el campo `costCenter` este presente en el body (retorna 400 si falta)

### Endpoint POST /api/principal-warehouse
- Valida que el campo `costCenter` este presente en el body (retorna 400 si falta)

## Permisos Requeridos

| Permiso | Clave | Descripcion |
|---------|-------|-------------|
| Crear bodegas | `warehouses.create` / `CREATE_WAREHOUSES` | Permite crear bodegas individuales y bodegas principales |
| Editar bodegas | `warehouses.edit` / `EDIT_WAREHOUSES` | Permite modificar informacion de bodegas existentes |
| Eliminar bodegas | `warehouses.delete` / `DELETE_WAREHOUSES` | Permite eliminar bodegas |
| Ver bodegas | `VIEW_WAREHOUSES` | Permiso definido en el sistema (las rutas GET solo requieren autenticacion) |
| Crear centros de costo | `cost_centers.create` | Permite crear un centro de costo completo con todas sus bodegas |

## Flujos de Uso

### Flujo 1: Crear un nuevo centro de costo

1. El usuario navega a la pagina de Centros de Costos.
2. Hace clic en "Nuevo Centro de Costos".
3. Ingresa el codigo del centro de costo (ej: CC252130) y opcionalmente una ubicacion.
4. El sistema muestra un aviso informativo indicando que se crearan automaticamente 1 bodega principal y 4 sub-bodegas.
5. Al confirmar, el backend ejecuta `storage.createCostCenter(costCenter, location)` que crea las 5 bodegas.
6. La lista de centros de costo se actualiza automaticamente.

### Flujo 2: Consultar bodegas y su inventario

1. El usuario navega a la pagina de Gestion de Bodegas.
2. Puede filtrar por texto de busqueda, centro de costo especifico o bodega individual.
3. Expande un centro de costo para ver su estructura jerarquica (bodega principal + sub-bodegas).
4. Hace clic en una bodega para abrir el modal de detalle con la tabla completa de productos en inventario.

### Flujo 3: Editar una bodega

1. Desde la vista jerarquica, el usuario hace clic en el icono de edicion de una bodega.
2. Se abre el modal de edicion con los datos actuales precargados.
3. Puede modificar nombre, centro de costo, ubicacion, tipo y subtipo.
4. Al guardar, se envia una peticion PUT al endpoint `/api/warehouses/:id`.
5. La lista de bodegas se actualiza automaticamente.

### Flujo 4: Consultar detalle individual de bodega

1. El usuario accede a la ruta `/warehouses/:id` (por ejemplo desde un enlace directo).
2. Se muestra el estado, ubicacion y cantidad de productos.
3. Se presenta la tabla de inventario con producto, SKU, stock y estado.

### Flujo 5: Obtener bodega principal de un centro de costo

1. Otros modulos del sistema (como ingreso de inventario) consultan `GET /api/principal-warehouse/:costCenter`.
2. El sistema retorna la bodega principal asociada a ese centro de costo.
3. Si no existe, se puede crear con `POST /api/principal-warehouse` proporcionando el centro de costo.
