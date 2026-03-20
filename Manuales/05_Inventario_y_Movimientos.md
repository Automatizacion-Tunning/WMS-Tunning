# 5. Inventario y Movimientos

## Descripcion General

El modulo de Inventario y Movimientos gestiona el stock de productos por bodega, el registro de todos los movimientos de entrada y salida, y los flujos de ingreso de productos al sistema. Cada movimiento queda registrado con precio aplicado, usuario responsable, codigo de barras escaneado y datos de trazabilidad de ordenes de compra (OC). El inventario se actualiza automaticamente con cada movimiento. El modulo soporta dos flujos de ingreso: ingreso por centro de costo (que auto-detecta o crea la bodega principal) e ingreso directo a bodega especifica. Ambos flujos manejan numeros de serie para productos que los requieren.

## Paginas Frontend

### StockEntry.tsx
Pagina principal de ingreso de productos al inventario. Contiene:

- **Encabezado**: Titulo "Ingreso de Productos" con subtitulo "Gestion de ingreso de productos por centro de costo" y boton "Nuevo Ingreso" que abre un dialogo modal con el formulario `ProductEntryForm`.
- **Guia de uso**: Tarjeta informativa con 4 secciones visuales explicando el flujo: Nuevo Ingreso, Scanner (busqueda por codigo de barras), Centro de Costo (seleccion de destino) y Bodega Principal (ingreso automatico a bodega principal del CC).
- **Tabla de ingresos recientes**: Muestra solo movimientos de tipo "in" (entrada). Columnas: Fecha (formato dd/mm/yyyy hh:mm), Producto (nombre + SKU), Bodega/CC (nombre de bodega + centro de costo con Badge), Cantidad (formato monoespaciado), Precio Unitario (formato CLP), Razon y Usuario. Si no hay registros, muestra estado vacio con boton para crear el primer ingreso.

### SimpleProductEntryForm.tsx (componente de formulario)
Formulario avanzado de ingreso de producto con las siguientes capacidades:

- Seleccion de producto del catalogo o busqueda por codigo de barras mediante scanner integrado (`BarcodeScannerNative`)
- Seleccion de centro de costo (extraido dinamicamente de las bodegas existentes)
- Cantidad y precio a aplicar
- Numeros de serie (si el producto los requiere): campo de ingreso individual con boton agregar
- Seccion expandible de Orden de Compra (OC): busqueda de OC por numero, seleccion de linea de OC, visualizacion de cantidades pendientes
- Manejo de producto no encontrado via `ProductNotFoundModal` y asociacion de barcode via `AssociateProductModal`
- Creacion de producto nuevo con barcode via `NewProductWithBarcodeForm`

### ProductMovements.tsx
Pagina de movimientos manuales (documentada en el Manual 04). Permite registrar entradas y salidas directas con seleccion de producto, bodega, tipo, cantidad y motivo. Muestra historial completo de movimientos.

## Endpoints API

### Inventario (Stock)

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| GET | `/api/inventory` | requireAuth | Obtener todo el inventario (stock actual por producto y bodega) |
| GET | `/api/inventory/warehouse/:warehouseId` | requireAuth | Obtener inventario filtrado por bodega |
| GET | `/api/inventory/product/:productId` | requireAuth | Obtener inventario de un producto en todas las bodegas |

### Movimientos de Inventario

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| GET | `/api/inventory-movements` | requireAuth | Listar movimientos recientes. Acepta query param `limit` (default: 50) |
| POST | `/api/inventory-movements` | inventory.movements | Crear movimiento manual de inventario (entrada o salida) |
| GET | `/api/inventory-movements/product/:productId` | requireAuth | Listar movimientos de un producto especifico |

### Ingreso de Productos

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| POST | `/api/product-entry` | inventory.entry | Ingreso de producto por centro de costo. Busca o crea la bodega principal del CC automaticamente. Registra numeros de serie si aplica |
| POST | `/api/stock-entry` | inventory.entry | Ingreso de stock directo a una bodega especifica. Registra numeros de serie si aplica |
| POST | `/api/product-entry-oc` | orders.entry_oc | Ingreso de producto vinculado a una orden de compra del ERP |

## Tablas de Base de Datos

### inventory
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | serial (PK) | Identificador unico |
| productId | integer, NOT NULL | FK a tabla products |
| warehouseId | integer, NOT NULL | FK a tabla warehouses |
| quantity | integer, NOT NULL, default 0 | Cantidad actual en stock |
| updatedAt | timestamp | Fecha de ultima actualizacion del stock |

### inventoryMovements (inventory_movements)
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | serial (PK) | Identificador unico |
| productId | integer, NOT NULL | FK a tabla products |
| warehouseId | integer, NOT NULL | FK a tabla warehouses |
| movementType | varchar(10), NOT NULL | Tipo: "in" (entrada) o "out" (salida) |
| quantity | integer, NOT NULL | Cantidad del movimiento |
| appliedPrice | decimal(10,2) | Precio unitario aplicado en el momento del movimiento |
| barcodeScanned | varchar(100) | Codigo de barras escaneado al momento del registro |
| reason | text | Motivo o descripcion del movimiento |
| userId | integer, NOT NULL | FK al usuario que realizo el movimiento |
| transferOrderId | integer | FK a orden de traspaso (si el movimiento fue generado por un traspaso) |
| purchaseOrderNumber | varchar(50) | Numero de orden de compra (numoc) del ERP |
| purchaseOrderLine | integer | Numero de linea de la OC |
| purchaseOrderCodprod | varchar(100) | Codigo de producto ERP (codprod) para trazabilidad |
| createdAt | timestamp | Fecha y hora del movimiento |

### purchaseOrderReceipts (purchase_order_receipts)
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | serial (PK) | Identificador unico |
| purchaseOrderNumber | varchar(50), NOT NULL | Numero de orden de compra |
| purchaseOrderLine | integer, NOT NULL | Numero de linea de la OC |
| codprod | varchar(100) | Codigo de producto del ERP |
| productId | integer | FK a tabla products (si se ha asociado) |
| orderedQuantity | decimal(10,2), NOT NULL | Cantidad ordenada en la OC |
| receivedQuantity | decimal(10,2), NOT NULL, default 0 | Cantidad recibida acumulada |
| unitPrice | decimal(12,2) | Precio unitario de la linea |
| costCenter | varchar(100) | Centro de costo de destino |
| lastMovementId | integer | FK al ultimo movimiento de recepcion |
| createdAt | timestamp | Fecha de creacion del registro |
| updatedAt | timestamp | Fecha de ultima actualizacion |

## Validaciones

### Movimiento manual de inventario (POST /api/inventory-movements)
- **productId**: Obligatorio, tipo numerico
- **warehouseId**: Obligatorio, tipo numerico
- **movementType**: Obligatorio, debe ser "in" o "out"
- **quantity**: Obligatorio, tipo numerico
- **userId**: Obligatorio, tipo numerico
- **reason**: Opcional, texto libre
- Validacion general via `insertInventoryMovementSchema` de Zod

### Ingreso por centro de costo (POST /api/product-entry)
- **productId**: Obligatorio, debe corresponder a un producto existente (devuelve 404 si no existe)
- **costCenter**: Obligatorio, identificador del centro de costo
- **quantity**: Obligatorio, numerico
- **price**: Obligatorio, numerico (se registra como appliedPrice)
- **location**: Opcional, ubicacion para crear centro de costo si no existe
- **reason**: Opcional, si no se proporciona se genera automaticamente ("Ingreso de producto al centro de costo {CC}")
- **serialNumbers**: Obligatorio si el producto tiene `requiresSerial=true`. La cantidad de numeros de serie debe coincidir exactamente con la cantidad ingresada (devuelve 400 si no coincide)
- Validacion general via `productEntrySchema` de Zod

### Ingreso directo a bodega (POST /api/stock-entry)
- **productId**: Obligatorio, debe corresponder a un producto existente (devuelve 404 si no existe)
- **warehouseId**: Obligatorio, bodega destino
- **quantity**: Obligatorio, numerico
- **price**: Obligatorio, numerico
- **reason**: Opcional, default "Ingreso de stock"
- **serialNumbers**: Obligatorio si el producto tiene `requiresSerial=true`. Debe coincidir en cantidad con el campo quantity
- Validacion general via `warehouseEntrySchema` de Zod

## Permisos Requeridos

| Permiso | Acciones que habilita |
|---------|----------------------|
| (requireAuth) | Consultar inventario general, por bodega o por producto. Listar movimientos de inventario |
| inventory.movements | Crear movimientos manuales de inventario (entradas y salidas directas) |
| inventory.entry | Ingresar productos por centro de costo (product-entry) o directo a bodega (stock-entry) |
| orders.entry_oc | Ingresar productos vinculados a ordenes de compra del ERP |

## Flujos de Uso

### Ingreso de producto por centro de costo
1. El usuario navega a "Ingreso de Productos" y hace clic en "Nuevo Ingreso"
2. Se abre el formulario modal `ProductEntryForm`
3. El usuario selecciona el centro de costo destino (la lista se obtiene de las bodegas existentes)
4. Selecciona el producto del catalogo o lo busca escaneando un codigo de barras con el scanner integrado
5. Ingresa la cantidad y el precio unitario a aplicar
6. Si el producto requiere numeros de serie, ingresa cada serial individualmente
7. Opcionalmente puede vincular el ingreso a una orden de compra del ERP (seccion expandible)
8. Al confirmar, el sistema:
   - Busca la bodega principal del centro de costo
   - Si no existe, crea automaticamente el centro de costo con su bodega principal
   - Crea un movimiento de tipo "in" con el precio aplicado
   - Si aplica, registra los numeros de serie en `product_serials` vinculados al movimiento
   - Actualiza el stock en la tabla `inventory`
9. El ingreso aparece en la tabla de "Ingresos Recientes"

### Ingreso directo a bodega
1. Se utiliza el endpoint POST `/api/stock-entry`
2. Se especifica directamente el ID de bodega destino, producto, cantidad y precio
3. El sistema crea el movimiento de entrada y registra seriales si aplica
4. Los numeros de serie se asocian a la bodega principal del sistema (tipo "main")

### Registrar movimiento manual
1. El usuario navega a "Movimientos de Productos"
2. Completa el formulario: producto, bodega, tipo (Entrada/Salida), cantidad y motivo
3. Al registrar, se crea el movimiento y se actualiza el inventario automaticamente
4. El historial de movimientos se actualiza en tiempo real

### Consultar stock actual
1. GET `/api/inventory` retorna el stock completo: cada registro indica producto, bodega y cantidad actual
2. Se puede filtrar por bodega (GET `/api/inventory/warehouse/:id`) o por producto (GET `/api/inventory/product/:id`)
3. La cantidad se actualiza automaticamente con cada movimiento de entrada (suma) o salida (resta)

### Consultar historial de movimientos
1. GET `/api/inventory-movements` retorna los ultimos 50 movimientos (configurable via `limit`)
2. Cada movimiento incluye detalles del producto, bodega, usuario, tipo, cantidad, precio aplicado y fecha
3. Se pueden filtrar por producto via GET `/api/inventory-movements/product/:productId`

### Flujo con codigo de barras (scanner)
1. En el formulario de ingreso, el usuario activa el scanner de codigo de barras
2. El sistema busca el producto por barcode en el catalogo
3. Si lo encuentra, pre-selecciona el producto automaticamente
4. Si no lo encuentra, muestra el modal `ProductNotFoundModal` con opciones:
   - Asociar el barcode a un producto existente via `AssociateProductModal`
   - Crear un producto nuevo con ese barcode via `NewProductWithBarcodeForm`

### Trazabilidad de ordenes de compra
1. Los movimientos pueden registrar datos de OC: numero de OC (numoc), linea (numlinea) y codigo de producto ERP (codprod)
2. La tabla `purchaseOrderReceipts` lleva el tracking de cantidades ordenadas vs recibidas por cada linea de OC
3. Esto permite saber cuanto falta por recibir de cada linea de una orden de compra
