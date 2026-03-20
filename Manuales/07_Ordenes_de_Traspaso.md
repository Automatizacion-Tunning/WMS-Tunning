# 7. Ordenes de Traspaso

## Descripcion General

Este modulo gestiona el flujo completo de solicitudes de traspaso de productos entre bodegas. Un usuario puede solicitar mover una cantidad especifica de un producto desde una bodega origen a una bodega destino. La solicitud queda en estado **pendiente** hasta que un jefe de proyectos con el permiso correspondiente la **aprueba** o **rechaza**. Al aprobar una orden, el sistema ejecuta automaticamente los movimientos de inventario necesarios (salida de bodega origen y entrada en bodega destino). Las ordenes se identifican con un numero unico con formato `OT-XXX`.

## Paginas Frontend

### TransferOrders (`client/src/pages/orders/TransferOrders.tsx`)

Pagina principal de ordenes de traspaso. Incluye:

- **Encabezado**: titulo "Ordenes de Trabajo" con boton "Nueva Solicitud" que abre un dialogo modal con el formulario de creacion.
- **Filtro por estado**: selector con opciones "Todos los estados", "Pendientes", "Aprobadas" y "Rechazadas", mas un contador de ordenes encontradas.
- **Tabla de ordenes**: muestra las columnas:
  - Orden # (numero de orden, ej: OT-678)
  - Producto (nombre y SKU)
  - Traspaso (bodega origen -> bodega destino)
  - Cantidad (en unidades)
  - Centro de Costos
  - Solicitante (nombre de usuario)
  - Estado (Pendiente/Aprobada/Rechazada con iconos y colores)
  - Fecha (formato dia mes ano, hora:minuto)
  - Acciones (botones Aprobar/Rechazar solo para ordenes pendientes)
- **Estado vacio**: mensaje informativo cuando no hay ordenes.

Los badges de estado usan colores diferenciados:
- Pendiente: amarillo con icono de reloj
- Aprobada: verde con icono de check
- Rechazada: rojo con icono de X

### TransferRequestForm (`client/src/components/forms/TransferRequestForm.tsx`)

Formulario para crear una nueva solicitud de traspaso. Campos:

- **Producto**: selector con lista de productos (muestra nombre y SKU)
- **Bodega Origen**: selector de bodegas activas
- **Bodega Destino**: selector de bodegas activas (excluye la bodega origen seleccionada)
- **Cantidad**: campo numerico con minimo 1, maximo limitado al stock disponible. Muestra el stock disponible en la bodega origen seleccionada.
- **Centro de Costos**: selector con los centros de costo existentes (extraidos de las bodegas)
- **Notas**: campo de texto opcional para indicar motivo del traspaso

Incluye un panel de resumen que muestra informacion del producto seleccionado (nombre, SKU, tipo tangible/intangible, advertencia si requiere numeros de serie).

**Validacion en frontend**: antes de enviar, verifica que la cantidad solicitada no supere el stock disponible en la bodega origen.

## Endpoints API

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| GET | `/api/transfer-orders` | Autenticado | Listar ordenes de traspaso. Acepta query params: `userId`, `role`, `costCenter` para filtrado |
| GET | `/api/transfer-orders/:id` | Autenticado | Obtener detalle de una orden de traspaso por ID |
| POST | `/api/transfer-orders` | Autenticado | Crear nueva solicitud de traspaso. Genera numero de orden automaticamente |
| PATCH | `/api/transfer-orders/:id/status` | `orders.approve_transfers` | Aprobar o rechazar una orden. El status debe ser `approved` o `rejected` |

## Tablas de Base de Datos

### transfer_orders

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | serial (PK) | Identificador unico |
| orderNumber | varchar(20) | Numero de orden unico (ej: OT-678) |
| productId | integer (FK) | ID del producto a traspasar (obligatorio) |
| quantity | integer | Cantidad a traspasar (obligatorio) |
| sourceWarehouseId | integer (FK) | ID de la bodega origen (obligatorio) |
| destinationWarehouseId | integer (FK) | ID de la bodega destino (obligatorio) |
| costCenter | varchar(100) | Centro de costo asociado (obligatorio) |
| requesterId | integer (FK) | ID del usuario que solicita el traspaso (obligatorio) |
| projectManagerId | integer (FK) | ID del jefe de proyecto que aprueba/rechaza (opcional) |
| status | varchar(20) | Estado: `pending`, `approved`, `rejected`. Por defecto `pending` |
| notes | text | Comentarios adicionales (opcional) |
| createdAt | timestamp | Fecha de creacion |
| updatedAt | timestamp | Fecha de ultima actualizacion |

**Relaciones:**
- `product`: relacion con la tabla `products` (productId -> products.id)
- `sourceWarehouse`: relacion con `warehouses` (sourceWarehouseId -> warehouses.id)
- `destinationWarehouse`: relacion con `warehouses` (destinationWarehouseId -> warehouses.id)
- `requester`: relacion con `users` (requesterId -> users.id)
- `projectManager`: relacion con `users` (projectManagerId -> users.id)
- `inventoryMovements`: una orden de traspaso puede generar multiples movimientos de inventario

### Tipo extendido TransferOrderWithDetails

La API retorna ordenes con relaciones resueltas:
- `product`: datos completos del producto
- `sourceWarehouse`: datos de la bodega origen
- `destinationWarehouse`: datos de la bodega destino
- `requester`: datos del usuario solicitante
- `projectManager`: datos del jefe de proyecto (opcional)

## Validaciones

### Backend - Creacion (transferRequestSchema)
- `productId`: numerico, minimo 1 ("Debe seleccionar un producto")
- `quantity`: numerico, minimo 1 ("La cantidad debe ser mayor a 0")
- `sourceWarehouseId`: numerico, minimo 1 ("Debe seleccionar bodega origen")
- `destinationWarehouseId`: numerico, minimo 1 ("Debe seleccionar bodega destino")
- `costCenter`: string, minimo 1 caracter ("El centro de costo es requerido")
- `notes`: string opcional

### Backend - Cambio de estado (PATCH /status)
- `status` debe ser `approved` o `rejected` (retorna 400 si es otro valor)
- El `projectManagerId` se toma de la sesion del usuario autenticado

### Frontend - TransferRequestForm
- Todos los campos del esquema `transferRequestSchema`
- Validacion adicional: la cantidad no puede superar el stock disponible en la bodega origen
- La bodega destino no puede ser igual a la bodega origen
- El campo de cantidad limita el ingreso al rango [1, stockDisponible]

## Permisos Requeridos

| Permiso | Clave | Descripcion |
|---------|-------|-------------|
| Crear ordenes de traspaso | `CREATE_TRANSFER_ORDERS` | Cualquier usuario autenticado puede crear solicitudes (el endpoint POST solo requiere autenticacion) |
| Aprobar/rechazar ordenes | `orders.approve_transfers` / `APPROVE_TRANSFER_ORDERS` | Permite cambiar el estado de una orden de pendiente a aprobada o rechazada |
| Ver ordenes de traspaso | `VIEW_TRANSFER_ORDERS` | Permiso definido en el sistema (las rutas GET solo requieren autenticacion) |

## Flujos de Uso

### Flujo 1: Crear una solicitud de traspaso

1. El usuario navega a "Ordenes de Trabajo" y hace clic en "Nueva Solicitud".
2. Selecciona el producto a traspasar del catalogo.
3. Selecciona la bodega origen (solo bodegas activas). El sistema muestra el stock disponible del producto en esa bodega.
4. Selecciona la bodega destino (solo bodegas activas, excluyendo la bodega origen).
5. Ingresa la cantidad deseada (no puede exceder el stock disponible).
6. Selecciona el centro de costos y opcionalmente agrega notas.
7. El sistema muestra un resumen del producto seleccionado.
8. Al confirmar, el backend genera un numero de orden automatico (formato OT-XXX), asigna el `requesterId` de la sesion, busca un usuario con rol `project_manager` para asignarlo como `projectManagerId`, y crea la orden en estado `pending`.
9. Se muestra un mensaje de exito indicando que la solicitud fue enviada para aprobacion.

### Flujo 2: Aprobar una orden de traspaso

1. Un usuario con permiso `APPROVE_TRANSFER_ORDERS` accede a la lista de ordenes.
2. Filtra por estado "Pendientes" para ver las solicitudes por aprobar.
3. Revisa los detalles de la orden (producto, cantidad, bodegas origen/destino, solicitante).
4. Hace clic en el boton "Aprobar".
5. El backend ejecuta `storage.updateTransferOrderStatus(id, 'approved', userId)` que:
   - Actualiza el estado de la orden a `approved`
   - Registra el `projectManagerId` con el ID del usuario que aprueba
   - Genera automaticamente los movimientos de inventario:
     - Un movimiento de tipo `out` (salida) en la bodega origen
     - Un movimiento de tipo `in` (entrada) en la bodega destino
   - Actualiza las cantidades en la tabla de inventario
6. Se invalidan las queries de ordenes de traspaso e inventario para refrescar los datos.

### Flujo 3: Rechazar una orden de traspaso

1. Un usuario con permiso `APPROVE_TRANSFER_ORDERS` accede a la lista de ordenes pendientes.
2. Hace clic en el boton "Rechazar" de la orden correspondiente.
3. El backend actualiza el estado a `rejected` y registra quien rechazo.
4. No se ejecutan movimientos de inventario.
5. La orden queda registrada como rechazada en el historial.

### Flujo 4: Consultar historial de ordenes

1. El usuario accede a la lista de ordenes de traspaso.
2. Puede filtrar por estado (Todos, Pendientes, Aprobadas, Rechazadas).
3. Las ordenes ya procesadas (aprobadas o rechazadas) muestran la leyenda "Procesada" o "Finalizada" en la columna de acciones, sin botones de accion.
4. El endpoint GET soporta filtrado por `userId`, `role` y `costCenter` mediante query params para limitar la vista segun el contexto del usuario.
