# 8. Ordenes de Compra

## Descripcion General

El modulo de Ordenes de Compra permite consultar y gestionar la recepcion de ordenes de compra provenientes del ERP Tunning (tabla `pav_inn_ordencom` en la base de datos externa `InnovaOper_Tunning`). El sistema se conecta a una base de datos PostgreSQL en Azure para leer las OC sincronizadas, y mantiene un registro local de recepcion (`purchase_order_receipts`) que permite hacer seguimiento de recepciones parciales y totales sin modificar los datos del ERP.

El flujo principal consiste en:
1. Buscar una OC por numero.
2. Seleccionar centro de costo.
3. Seleccionar la linea a recepcionar.
4. Confirmar cantidad, producto local y precio.
5. Registrar el ingreso como movimiento de inventario vinculado a la OC.

La vinculacion entre productos del ERP y productos locales se realiza mediante el campo `codprod` de la OC y el campo `erpProductCode` del producto local.

## Paginas Frontend

| Archivo | Descripcion |
|---------|-------------|
| `client/src/pages/orders/PurchaseOrders.tsx` | Vista principal de consulta de OC. Muestra tabla paginada (50 registros por pagina) con filtros por busqueda libre, tipo (suministros/servicios), centro de costo y estado (Activo/Inactivo). Incluye columnas de tracking local: "Recibido Local", "Pendiente" y "Recepcion" con badges de estado (Completo, Parcial, Pendiente). |
| `client/src/components/forms/OcProductEntryForm.tsx` | Formulario de ingreso basado en OC con flujo de 4 pasos: (1) Buscar OC por numero con autocompletado, (2) Seleccionar centro de costo, (3) Seleccionar linea de la OC con datos enriquecidos (producto local vinculado, cantidad pendiente, precio unitario calculado), (4) Confirmar ingreso con cantidad, precio, numeros de serie opcionales y observaciones. |

## Endpoints API

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| GET | `/api/ordenes-compra` | requireAuth | Obtener OC con paginacion y filtros (page, pageSize, search, costCenter, estado, tipoCategoria). Consulta `pav_inn_ordencom` en Tunning DB. |
| GET | `/api/ordenes-compra/cost-centers` | requireAuth | Obtener lista de centros de costo unicos de todas las OC. |
| GET | `/api/ordenes-compra/search?q=` | requireAuth | Buscar OC por numero con autocompletado. Retorna numoc, proveedor, fecha y cantidad de lineas. Limite: 20 resultados. |
| GET | `/api/ordenes-compra/:numoc/cost-centers` | requireAuth | Obtener centros de costo disponibles para una OC especifica. |
| GET | `/api/ordenes-compra/:numoc/lines` | requireAuth | Obtener lineas de una OC enriquecidas con datos locales de recepcion. Incluye: cantidad recibida localmente, pendiente, producto local vinculado (match por `erpProductCode = codprod`), precio unitario calculado, y estado de recepcion completa. |
| POST | `/api/product-entry-oc` | `orders.entry_oc` | Registrar ingreso de producto basado en OC. Valida linea existente, cantidad contra pendiente, crea/actualiza receipt, registra movimiento de inventario tipo "entrada", actualiza stock, y vincula `erpProductCode` al producto si corresponde. |

## Tablas de Base de Datos

### Tabla `purchase_order_receipts` (base local)

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | serial (PK) | Identificador unico |
| purchaseOrderNumber | varchar(50) | Numero de la OC (referencia a ERP) |
| purchaseOrderLine | integer | Numero de linea de la OC |
| codprod | varchar(100) | Codigo del producto en el ERP |
| productId | integer (FK) | ID del producto local vinculado |
| orderedQuantity | decimal(10,2) | Cantidad ordenada en la OC |
| receivedQuantity | decimal(10,2) | Cantidad total recibida localmente (acumulativa) |
| unitPrice | decimal(12,2) | Precio unitario |
| costCenter | varchar(100) | Centro de costo |
| lastMovementId | integer (FK) | ID del ultimo movimiento de inventario asociado |
| createdAt | timestamp | Fecha de creacion |
| updatedAt | timestamp | Fecha de actualizacion |

**Restriccion unica:** `(purchaseOrderNumber, purchaseOrderLine)` - Solo un registro de recepcion por linea de OC.

### Tabla `pav_inn_ordencom` (base ERP Tunning, solo lectura)

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| codaux | string | Codigo del proveedor |
| nomaux | string | Nombre del proveedor |
| numoc | string | Numero de la orden de compra |
| numinteroc | number | Numero interno de la OC |
| fechaoc | string | Fecha de la OC |
| numlinea | number | Numero de linea |
| codprod | string | Codigo del producto en el ERP |
| desprod | string | Descripcion del producto |
| desprod2 | string | Descripcion secundaria |
| fechaent | string | Fecha de entrega |
| cantidad | string | Cantidad ordenada |
| recibido | string | Cantidad recibida en el ERP |
| codicc | string | Centro de costo |
| equivmonoc | string | Equivalencia moneda OC |
| subtotaloc | string | Subtotal en moneda OC |
| subtotalmb | string | Subtotal en moneda base |
| valortotoc | string | Valor total en moneda OC |
| valortotmb | string | Valor total en moneda base |
| estado_registro | string | Estado del registro (Activo/Inactivo) |
| tipo | string | Tipo de OC (1 = suministros, otro = servicios) |

## Validaciones

- **ocProductEntrySchema (Zod):**
  - `purchaseOrderNumber`: string obligatorio, minimo 1 caracter.
  - `purchaseOrderLine`: numero obligatorio, minimo 1.
  - `costCenter`: string obligatorio, minimo 1 caracter.
  - `productId`: numero obligatorio, minimo 1.
  - `quantity`: numero obligatorio, mayor a 0.
  - `price`: numero obligatorio, mayor o igual a 0.
  - `serialNumbers`: array de strings (opcional).
  - `reason`: string (opcional).
- **Validacion de cantidad:** La cantidad a recepcionar no puede superar la cantidad pendiente (`ordenada - ya recibida`).
- **Validacion de linea:** La linea de OC debe existir en `pav_inn_ordencom`.
- **Vinculacion automatica:** Si la linea tiene `codprod` y el producto local no tiene `erpProductCode`, se vincula automaticamente.

## Permisos Requeridos

| Accion | Permiso |
|--------|---------|
| Consultar ordenes de compra | Autenticacion basica (`requireAuth`) |
| Buscar OC y consultar lineas | Autenticacion basica (`requireAuth`) |
| Registrar ingreso por OC | `orders.entry_oc` |

## Flujos de Uso

### Flujo 1: Consultar ordenes de compra
1. El usuario accede a la pagina "Ordenes de Compra".
2. Se carga la tabla paginada con datos desde la base Tunning.
3. El usuario puede filtrar por tipo (suministros/servicios), centro de costo, estado o busqueda libre.
4. Las columnas "Recibido Local" y "Pendiente" muestran el estado de recepcion local.
5. Los badges de recepcion indican: Completo (verde), Parcial (ambar), Pendiente (gris).

### Flujo 2: Ingreso de producto por OC (4 pasos)
1. **Paso 1 - Buscar OC:** El usuario escribe el numero de OC. Se busca en Tunning DB con autocompletado (minimo 2 caracteres). Selecciona la OC deseada.
2. **Paso 2 - Centro de Costo:** Se muestran los centros de costo disponibles para esa OC. El usuario selecciona uno.
3. **Paso 3 - Seleccionar Linea:** Se muestran las lineas filtradas por centro de costo, enriquecidas con datos locales (producto vinculado, cantidad pendiente, precio unitario calculado). Las lineas completamente recibidas aparecen resaltadas.
4. **Paso 4 - Confirmar Ingreso:** El usuario indica cantidad a recepcionar, selecciona o crea el producto local, define precio, agrega numeros de serie opcionales y observaciones. Al confirmar, se registra el movimiento de inventario y se actualiza el receipt local.

### Flujo 3: Vinculacion automatica de productos
1. Cuando se registra un ingreso por OC, si la linea tiene `codprod` y el producto local no tiene `erpProductCode`, el sistema vincula automaticamente ambos codigos.
2. En consultas posteriores, las lineas con `codprod` vinculado muestran el nombre del producto local en la tabla.
