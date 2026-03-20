# 10. Escaneo de Codigos

## Descripcion General

El modulo de Escaneo de Codigos permite utilizar la camara del dispositivo (celular, tablet o computador) para leer codigos de barras y vincularlos a productos del sistema. El flujo implementa una maquina de estados que maneja todo el ciclo: escaneo, busqueda del producto, y acciones cuando el producto no se encuentra (crear nuevo o asociar a existente).

El sistema utiliza dos librerias de escaneo:
- **ZXing (`@zxing/library`):** Componente `BarcodeScannerNative` que usa `BrowserMultiFormatReader` para decodificar multiples formatos de codigos de barras directamente desde el stream de video.
- **html5-qrcode:** Componente `BarcodeScanner` alternativo que usa `Html5QrcodeScanner` con soporte para QR y codigos de barras.

El componente principal en uso es `BarcodeScannerNative` (basado en ZXing), que se presenta como un dialogo modal con vista de camara en tiempo real.

## Paginas Frontend

| Archivo | Descripcion |
|---------|-------------|
| `client/src/pages/TestBarcode.tsx` | Pagina de prueba del flujo completo de escaneo. Permite probar el escaner con la camara real o simular codigos manualmente. Muestra el estado actual del flujo (estado, codigo, producto, carga, errores). Integra todos los modales del flujo: ProductNotFoundModal, NewProductWithBarcodeForm y AssociateProductModal. |
| `client/src/hooks/useBarcodeFlow.tsx` | Hook personalizado que implementa la maquina de estados del flujo de escaneo. Gestiona 7 estados: `idle`, `scanning`, `searching`, `product-found`, `product-not-found`, `creating-new`, `associating-existing`. Expone acciones para transicionar entre estados. |
| `client/src/components/ui/barcode-scanner-native.tsx` | Componente de escaner basado en ZXing (`BrowserMultiFormatReader`). Presenta un dialogo modal con vista de camara, solicita permisos, decodifica codigos de barras en tiempo real. |
| `client/src/components/ui/barcode-scanner.tsx` | Componente de escaner alternativo basado en `html5-qrcode` (`Html5QrcodeScanner`). Soporta QR y codigos de barras. |
| `client/src/components/modals/ProductNotFoundModal.tsx` | Modal que aparece cuando el codigo escaneado no corresponde a ningun producto. Presenta dos opciones: "Crear nuevo producto" (con codigo pre-llenado) o "Asociar a producto existente" (vincular codigo a un producto sin barcode). |
| `client/src/components/modals/AssociateProductModal.tsx` | Modal para asociar un codigo de barras a un producto existente que no tenga barcode asignado. Permite buscar productos por nombre o SKU, muestra solo productos sin codigo de barras, y realiza la vinculacion via PUT al endpoint de barcode. |

## Endpoints API

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| GET | `/api/products/barcode/:barcode` | requireAuth | Buscar producto por codigo de barras. Retorna el producto si existe, o 404 si no se encuentra. |
| PUT | `/api/products/:id/barcode` | `products.edit` | Asociar un codigo de barras a un producto existente. Recibe `{ barcode: string }` en el body. |
| GET | `/api/products` | requireAuth | Obtener todos los productos. Usado en AssociateProductModal para filtrar productos sin barcode. El hook tambien consulta `/api/products?barcode=` para buscar por codigo. |

## Tablas de Base de Datos

El escaneo de codigos no utiliza tablas propias. Opera sobre la tabla `products` existente, especificamente el campo `barcode`:

### Campos relevantes de `products`

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | serial (PK) | Identificador unico del producto |
| name | varchar | Nombre del producto |
| sku | varchar | Codigo SKU del producto |
| barcode | varchar | Codigo de barras del producto (puede ser null si no tiene asignado) |
| erpProductCode | varchar | Codigo del producto en el ERP (para vinculacion con OC) |

## Validaciones

- **Codigo de barras requerido:** Al asociar un barcode, se verifica que el string no este vacio (`barcode.trim() !== ""`).
- **Producto sin barcode:** El modal de asociacion solo muestra productos que no tienen barcode asignado (`product.barcode` es null/vacio).
- **Busqueda minima:** El hook `useBarcodeFlow` solo ejecuta la busqueda cuando el estado es `searching` y hay un barcode definido.
- **Permisos de camara:** Los componentes de escaneo solicitan permisos de camara al navegador (`navigator.mediaDevices.getUserMedia`). Si no hay camara o se deniegan permisos, se muestra un mensaje de error.

## Permisos Requeridos

| Accion | Permiso |
|--------|---------|
| Buscar producto por barcode | Autenticacion basica (`requireAuth`) |
| Asociar barcode a producto | `products.edit` |
| Crear producto nuevo (desde flujo de escaneo) | `products.create` |

## Flujos de Uso

### Flujo 1: Escaneo con producto encontrado
1. El usuario hace clic en "Escanear Codigo de Barras".
2. Se abre el modal del escaner con la vista de camara.
3. El estado cambia a `scanning`.
4. El usuario apunta la camara al codigo de barras.
5. ZXing decodifica el codigo y lo retorna al hook.
6. El estado cambia a `searching`. Se ejecuta la consulta `GET /api/products?barcode=`.
7. Si el producto existe, el estado cambia a `product-found`.
8. Se muestra un toast con el nombre y SKU del producto.
9. El flujo vuelve a `idle`.

### Flujo 2: Escaneo con producto no encontrado - Crear nuevo
1. Los pasos 1-6 son iguales al Flujo 1.
2. Si la API retorna 404, el estado cambia a `product-not-found`.
3. Aparece el modal `ProductNotFoundModal` con el codigo escaneado.
4. El usuario selecciona "Crear nuevo producto".
5. El estado cambia a `creating-new`.
6. Se abre el formulario `NewProductWithBarcodeForm` con el barcode pre-llenado.
7. El usuario completa los datos del producto y lo guarda.
8. Al crearse exitosamente, el estado cambia a `product-found` con el nuevo producto.

### Flujo 3: Escaneo con producto no encontrado - Asociar a existente
1. Los pasos 1-3 son iguales al Flujo 2.
2. El usuario selecciona "Asociar a producto existente".
3. El estado cambia a `associating-existing`.
4. Se abre el modal `AssociateProductModal`.
5. El usuario busca un producto por nombre o SKU (se muestran solo productos sin barcode).
6. Selecciona el producto deseado y confirma.
7. Se ejecuta `PUT /api/products/:id/barcode` con el codigo escaneado.
8. Al asociarse exitosamente, el estado cambia a `product-found` con el producto actualizado.

### Flujo 4: Prueba manual (pagina TestBarcode)
1. El usuario accede a la pagina "Prueba del Escaner".
2. Puede probar con la camara real (boton "Escanear Codigo de Barras").
3. Puede simular codigos manualmente con los botones "Simular codigo existente" (123456789) y "Simular codigo no existente" (999999999).
4. El panel de estado muestra en tiempo real: estado del flujo, codigo escaneado, producto encontrado, indicador de carga y errores.
5. El boton "Reset" reinicia el flujo a `idle`.

### Diagrama de estados del hook `useBarcodeFlow`

```
idle --> scanning --> searching --> product-found --> idle
                          |
                          v
                    product-not-found
                     /           \
                    v             v
             creating-new   associating-existing
                    \             /
                     v           v
                    product-found --> idle
```

Cualquier estado puede volver a `idle` mediante `handleCancel()` o `reset()`.
