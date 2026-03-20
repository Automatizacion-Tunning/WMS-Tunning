# 4. Productos y Catalogo

## Descripcion General

El modulo de Productos y Catalogo es el nucleo del sistema de inventario. Permite administrar el catalogo completo de productos junto con sus clasificaciones auxiliares: categorias, marcas y unidades de medida. Cada producto puede tener SKU, codigo de barras, precios mensuales, numeros de serie opcionales, codigo ERP para integracion con ordenes de compra, y configuracion de garantia. Los productos se clasifican como tangibles o intangibles y se asocian obligatoriamente a una categoria, marca y unidad de medida.

## Paginas Frontend

### ProductManagement.tsx
Pagina principal del modulo. Presenta un sistema de pestanas (Tabs) con cuatro secciones:

- **Productos**: Lista completa de productos en formato tarjeta (Card). Muestra nombre, SKU, codigo de barras, tipo (tangible/intangible), si requiere numero de serie, descripcion, precio actual formateado en CLP y estado activo/inactivo. Incluye boton "Nuevo Producto" que abre un dialogo modal con el formulario `SimpleProductForm`, y boton "Editar" por cada producto que abre `EditProductForm`.
- **Categorias**: Renderiza el componente `CategoryManagement`.
- **Marcas**: Renderiza el componente `BrandManagement`.
- **Unidades**: Renderiza el componente `UnitManagement`.

### CategoryManagement.tsx
Gestion CRUD completa de categorias. Presenta una tabla con columnas: Nombre, Descripcion, Estado (activo/inactivo con Badge), Fecha de Creacion y Acciones (editar/eliminar). Incluye buscador por nombre o descripcion, dialogo de creacion y dialogo de edicion. La eliminacion solicita confirmacion via `window.confirm`. Validacion con Zod: nombre requerido, descripcion opcional.

### BrandManagement.tsx
Gestion CRUD completa de marcas. Estructura identica a CategoryManagement: tabla con Nombre, Descripcion, Estado, Fecha de Creacion y Acciones. Buscador por nombre o descripcion, dialogos de creacion y edicion, eliminacion con confirmacion. Validacion con Zod: nombre requerido, descripcion opcional.

### UnitManagement.tsx
Gestion CRUD de unidades de medida. Tabla con columnas: Nombre, Abreviacion (con Badge), Tipo, Estado, Fecha de Creacion y Acciones. El tipo de unidad se selecciona de una lista predefinida: Cantidad (count), Peso (weight), Longitud (length), Volumen (volume), Area (area), Tiempo (time). Buscador por nombre, abreviacion o tipo. Validacion con Zod: nombre requerido, abreviacion requerida, tipo obligatorio (enum).

### ProductMovements.tsx
Pagina para registrar movimientos manuales de inventario (entradas y salidas). Dividida en dos secciones:

- **Formulario de registro** (columna izquierda): Seleccion de producto, bodega, tipo de movimiento (Entrada/Salida), cantidad (minimo 1) y motivo (texto libre).
- **Historial de movimientos** (columna derecha): Tabla con Producto (nombre + SKU), Bodega, Tipo (Badge verde para Entrada, rojo para Salida), Cantidad, Motivo y Fecha con hora.

## Endpoints API

### Productos

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| GET | `/api/products` | requireAuth | Listar todos los productos. Acepta query param `barcode` para buscar por codigo de barras |
| GET | `/api/products/with-details` | requireAuth | Listar productos con detalles extendidos (categoria, marca, unidad) |
| GET | `/api/products/:id` | requireAuth | Obtener un producto por ID |
| POST | `/api/products` | products.create | Crear producto. Valida unicidad de codigo de barras. Acepta `currentPrice` para establecer precio inicial |
| PUT | `/api/products/:id` | products.edit | Actualizar producto. Valida unicidad de barcode si se modifica. Barcode vacio se convierte a null |
| PUT | `/api/products/:id/barcode` | products.edit | Asociar/cambiar codigo de barras a un producto existente. Valida unicidad |
| DELETE | `/api/products/:id` | products.delete | Eliminar producto por ID |
| GET | `/api/products/barcode/:barcode` | requireAuth | Buscar producto por codigo de barras exacto |

### Unidades de Medida

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| GET | `/api/units` | requireAuth | Listar todas las unidades de medida |
| GET | `/api/units/:id` | requireAuth | Obtener unidad por ID |
| POST | `/api/units` | products.edit | Crear nueva unidad de medida |
| PUT | `/api/units/:id` | products.edit | Actualizar unidad de medida |
| DELETE | `/api/units/:id` | products.delete | Eliminar unidad de medida |

### Categorias

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| GET | `/api/categories` | requireAuth | Listar todas las categorias |
| GET | `/api/categories/:id` | requireAuth | Obtener categoria por ID |
| POST | `/api/categories` | products.edit | Crear nueva categoria |
| PUT | `/api/categories/:id` | products.edit | Actualizar categoria |
| DELETE | `/api/categories/:id` | products.delete | Eliminar categoria |

### Marcas

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| GET | `/api/brands` | requireAuth | Listar todas las marcas |
| GET | `/api/brands/:id` | requireAuth | Obtener marca por ID |
| POST | `/api/brands` | products.edit | Crear nueva marca |
| PUT | `/api/brands/:id` | products.edit | Actualizar marca |
| DELETE | `/api/brands/:id` | products.delete | Eliminar marca |

## Tablas de Base de Datos

### products
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | serial (PK) | Identificador unico |
| name | varchar(200), NOT NULL | Nombre del producto |
| sku | varchar(50) | Codigo SKU (opcional) |
| barcode | varchar(100) | Codigo de barras (opcional, unico si se asigna) |
| description | text | Descripcion del producto |
| productType | varchar(20), default "tangible" | Tipo: "tangible" o "intangible" |
| requiresSerial | boolean, default false | Indica si requiere numeros de serie |
| unitId | integer, NOT NULL | FK a tabla units |
| categoryId | integer, NOT NULL | FK a tabla categories |
| brandId | integer, NOT NULL | FK a tabla brands |
| erpProductCode | varchar(100) | Codigo de producto del ERP (codprod) para matching con ordenes de compra |
| hasWarranty | boolean, NOT NULL, default false | Indica si tiene garantia |
| warrantyMonths | integer | Meses de garantia (solo si hasWarranty es true) |
| isActive | boolean, default true | Estado activo/inactivo |
| createdAt | timestamp | Fecha de creacion |
| updatedAt | timestamp | Fecha de ultima actualizacion |

### productPrices (product_prices)
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | serial (PK) | Identificador unico |
| productId | integer, NOT NULL | FK a tabla products |
| year | integer, NOT NULL | Ano del precio |
| month | integer, NOT NULL | Mes del precio (1-12) |
| price | decimal(10,2), NOT NULL | Precio del producto para ese mes |
| createdAt | timestamp | Fecha de creacion del registro |

### productSerials (product_serials)
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | serial (PK) | Identificador unico |
| productId | integer, NOT NULL | FK a tabla products |
| warehouseId | integer, NOT NULL | FK a tabla warehouses |
| serialNumber | varchar(100), NOT NULL | Numero de serie |
| movementId | integer, NOT NULL | FK al movimiento de inventario que lo creo |
| status | varchar(20), NOT NULL, default "active" | Estado: "active", "sold", "damaged" |
| createdAt | timestamp | Fecha de creacion |

### units
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | serial (PK) | Identificador unico |
| name | varchar(50), NOT NULL, UNIQUE | Nombre de la unidad (ej: "kilogramo") |
| abbreviation | varchar(10), NOT NULL, UNIQUE | Abreviacion (ej: "kg") |
| type | varchar(20), NOT NULL | Tipo: "count", "weight", "length", "volume", "area", "time" |
| isActive | boolean, NOT NULL, default true | Estado activo/inactivo |
| createdAt | timestamp | Fecha de creacion |

### categories
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | serial (PK) | Identificador unico |
| name | varchar(100), NOT NULL, UNIQUE | Nombre de la categoria |
| description | text | Descripcion opcional |
| isActive | boolean, NOT NULL, default true | Estado activo/inactivo |
| createdAt | timestamp | Fecha de creacion |

### brands
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | serial (PK) | Identificador unico |
| name | varchar(100), NOT NULL, UNIQUE | Nombre de la marca |
| description | text | Descripcion opcional |
| isActive | boolean, NOT NULL, default true | Estado activo/inactivo |
| createdAt | timestamp | Fecha de creacion |

## Validaciones

### Producto
- **name**: Obligatorio, maximo 200 caracteres
- **unitId**: Obligatorio, debe ser un ID de unidad existente
- **categoryId**: Obligatorio, debe ser un ID de categoria existente
- **brandId**: Obligatorio, debe ser un ID de marca existente
- **barcode**: Si se proporciona, debe ser unico en todo el sistema. El servidor devuelve error 409 si ya esta asociado a otro producto. Un barcode vacio se normaliza a null
- **productType**: Debe ser "tangible" o "intangible"
- **warrantyMonths**: Solo aplica si hasWarranty es true
- **currentPrice**: Precio inicial opcional al crear producto (numerico, decimal con 2 posiciones)
- Validacion general via `insertProductSchema` de Zod en el servidor; datos invalidos devuelven 400

### Categoria
- **name**: Obligatorio, minimo 1 caracter, unico en la tabla
- **description**: Opcional

### Marca
- **name**: Obligatorio, minimo 1 caracter, unico en la tabla
- **description**: Opcional

### Unidad de Medida
- **name**: Obligatorio, minimo 1 caracter, unico en la tabla
- **abbreviation**: Obligatoria, minimo 1 caracter, unica en la tabla
- **type**: Obligatorio, debe ser uno de: "count", "weight", "length", "volume", "area", "time"

### Movimiento Manual
- **productId**: Obligatorio, debe ser mayor a 0
- **warehouseId**: Obligatorio, debe ser mayor a 0
- **quantity**: Obligatorio, debe ser mayor a 0
- **movementType**: Obligatorio, "in" o "out"
- **reason**: Opcional, texto libre

## Permisos Requeridos

| Permiso | Acciones que habilita |
|---------|----------------------|
| (requireAuth) | Listar y consultar productos, categorias, marcas, unidades. Buscar por barcode |
| products.create | Crear nuevos productos |
| products.edit | Editar productos, crear/editar categorias, crear/editar marcas, crear/editar unidades, asociar codigos de barras |
| products.delete | Eliminar productos, eliminar categorias, eliminar marcas, eliminar unidades |
| inventory.movements | Registrar movimientos manuales de inventario (entrada/salida) |

## Flujos de Uso

### Crear un nuevo producto
1. El usuario navega a "Gestion de Productos" y selecciona la pestana "Productos"
2. Hace clic en "Nuevo Producto" para abrir el formulario modal
3. Completa los campos obligatorios: nombre, unidad de medida, categoria y marca
4. Opcionalmente configura: SKU, codigo de barras, descripcion, tipo de producto, si requiere serial, codigo ERP, garantia y precio inicial
5. El sistema valida unicidad de barcode si fue proporcionado
6. Al guardar, el producto se crea y aparece en la lista

### Editar un producto
1. En la lista de productos, el usuario hace clic en "Editar" en la tarjeta del producto
2. Se abre el formulario de edicion con los datos actuales precargados
3. El usuario modifica los campos deseados
4. Si se cambia el barcode, el sistema valida que no este en uso por otro producto
5. Al guardar, los cambios se aplican inmediatamente

### Asociar codigo de barras
1. Se puede asociar un codigo de barras a un producto existente mediante el endpoint dedicado PUT `/api/products/:id/barcode`
2. El sistema valida que el barcode no este asociado a otro producto (devuelve 409 si ya existe)

### Gestionar catalogo auxiliar (categorias, marcas, unidades)
1. El usuario navega a la pestana correspondiente dentro de Gestion de Productos
2. Puede crear nuevos registros mediante el boton "Nueva Categoria/Marca/Unidad"
3. Puede buscar registros existentes con el buscador integrado
4. Puede editar haciendo clic en el icono de edicion
5. Puede eliminar haciendo clic en el icono de eliminacion (requiere confirmacion)

### Registrar movimiento manual de inventario
1. El usuario navega a "Movimientos de Productos"
2. En el formulario lateral selecciona producto, bodega, tipo (Entrada o Salida), cantidad y motivo
3. Al hacer clic en "Registrar Movimiento", se crea el movimiento y se actualiza el inventario
4. El movimiento aparece inmediatamente en el historial de la derecha

### Buscar producto por codigo de barras
1. El sistema permite buscar un producto por su codigo de barras via query param en GET `/api/products?barcode=...` o por ruta GET `/api/products/barcode/:barcode`
2. Si no se encuentra, se retorna error 404

### Precios mensuales
1. Los precios se almacenan por producto, ano y mes en la tabla `product_prices`
2. Al crear un producto se puede establecer un precio inicial
3. El frontend muestra el precio actual del mes vigente junto a cada producto
