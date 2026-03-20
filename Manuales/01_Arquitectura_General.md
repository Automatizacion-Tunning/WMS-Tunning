# 1. Arquitectura General

## Descripcion General

El sistema **Control de Inventario (WMS)** es una aplicacion web fullstack de gestion de bodegas e inventario. Utiliza una arquitectura monolito con un servidor Express que sirve tanto la API REST como el frontend React desde un unico puerto. Esta disenado para el control de productos, bodegas, ordenes de transferencia, ordenes de compra y gestion de usuarios con roles y permisos.

## Stack Tecnologico

| Capa | Tecnologia | Version |
|------|-----------|---------|
| **Frontend** | React + TypeScript | React 18.3, TS 5.6 |
| **Routing (cliente)** | Wouter | 3.3.5 |
| **Estado/Fetch** | TanStack React Query | 5.60.5 |
| **Formularios** | React Hook Form + Zod | RHF 7.55, Zod 3.24 |
| **UI Components** | Radix UI + Tailwind CSS | Tailwind 3.4 |
| **Graficos** | Recharts | 2.15.2 |
| **Backend** | Express (Node.js) | 4.21.2 |
| **ORM** | Drizzle ORM | 0.39.1 |
| **Base de Datos** | PostgreSQL (Azure) | pg 8.16 |
| **Sesiones** | express-session | 1.18.1 |
| **Seguridad** | Helmet + express-rate-limit | Helmet 8.1, rate-limit 8.2 |
| **Validacion** | Zod + drizzle-zod | Zod 3.24 |
| **Build** | Vite (dev) + esbuild (prod) | Vite 5.4, esbuild 0.25 |

## Estructura del Proyecto

```
Control-de-Inventario/
  client/
    src/
      components/       # Componentes UI reutilizables (Radix/shadcn)
      hooks/             # Hooks personalizados (useAuth, etc.)
      lib/               # Utilidades (queryClient)
      pages/
        auth/            # Login
        admin/           # Gestion de roles
        inventory/       # Ingreso de stock
        orders/          # Ordenes de compra y transferencia
        products/        # Productos y movimientos
        users/           # Gestion de usuarios
        warehouses/      # Bodegas y centros de costo
      App.tsx            # Router principal
  server/
    index.ts             # Entry point, middleware chain
    routes.ts            # Definicion de todos los endpoints API
    auth.ts              # Funciones de hashing de passwords
    db.ts                # Conexion a PostgreSQL (Azure)
    storage.ts           # Capa de acceso a datos (Drizzle)
    vite.ts              # Configuracion de Vite en desarrollo
  shared/
    schema.ts            # Esquema de base de datos (Drizzle) + validaciones Zod
  package.json
```

## Conexion Frontend-Backend

El frontend y el backend se sirven desde el mismo servidor en el puerto configurado (por defecto `5000`):

- **Desarrollo:** Vite se configura como middleware del servidor Express, proporcionando HMR (Hot Module Replacement).
- **Produccion:** Se ejecuta `vite build` para generar los archivos estaticos, que luego Express sirve con `serveStatic`.
- **Comunicacion:** El frontend usa `apiRequest` (wrapper sobre `fetch`) para llamar a los endpoints `/api/*`. React Query gestiona el cache y el estado de las peticiones.

## Configuracion de Base de Datos

La base de datos es **PostgreSQL hospedado en Azure**. La conexion se configura mediante variables de entorno:

| Variable | Descripcion |
|----------|-------------|
| `AZURE_DB_HOST` | Host del servidor PostgreSQL en Azure |
| `AZURE_DB_USER` | Usuario de la base de datos |
| `AZURE_DB_PASSWORD` | Contrasena de la base de datos |
| `AZURE_DB_NAME` | Nombre de la base de datos |
| `AZURE_DB_PORT` | Puerto (por defecto 5432) |

Configuracion del pool de conexiones:
- **Maximo conexiones:** 10
- **Timeout inactividad:** 30 segundos
- **Timeout conexion:** 10 segundos
- **SSL:** Habilitado (`rejectUnauthorized: false`)
- **Reintentos de conexion:** 3 intentos con 2 segundos de espera entre cada uno

El ORM Drizzle se inicializa con el pool de `pg` y el esquema compartido. Las migraciones se ejecutan con `drizzle-kit push`.

## Cadena de Middleware

El servidor Express aplica los siguientes middlewares en orden:

1. **Helmet** - Headers de seguridad HTTP (CSP desactivado en desarrollo para permitir Vite HMR).
2. **Rate Limiting global** - Maximo 500 peticiones por IP cada 15 minutos en rutas `/api/`.
3. **Rate Limiting de login** - Maximo 10 intentos de login por IP cada 15 minutos en `/api/auth/login`.
4. **Trust Proxy** - Configurado para operar detras de un proxy inverso.
5. **express-session** - Gestion de sesiones con cookie segura.
6. **express.json** - Parseo de JSON con limite de 1 MB.
7. **express.urlencoded** - Parseo de formularios.
8. **Logger personalizado** - Registra metodo, ruta, status y duracion de las peticiones API (truncado a 80 caracteres).
9. **Rutas de la aplicacion** - Registradas via `registerRoutes(app)`.
10. **Error handler** - Captura errores y responde con JSON `{ message }`.
11. **Vite / Static** - En desarrollo sirve Vite HMR; en produccion sirve archivos estaticos.

## Configuracion de Seguridad

### Sesiones

| Parametro | Valor |
|-----------|-------|
| Nombre de cookie | `wms.sid` |
| `httpOnly` | `true` (no accesible desde JavaScript del cliente) |
| `secure` | `true` en produccion, `false` en desarrollo |
| `sameSite` | `lax` |
| `maxAge` | 24 horas |
| `resave` | `false` |
| `saveUninitialized` | `false` |
| Secret | Variable de entorno `SESSION_SECRET` (obligatorio en produccion) |

### Rate Limiting

| Ruta | Limite | Ventana |
|------|--------|---------|
| `/api/*` (global) | 500 peticiones | 15 minutos |
| `/api/auth/login` | 10 intentos | 15 minutos |

### Autenticacion en Rutas

El middleware `requireAuth` verifica que exista `req.session.userId`. Si no existe, responde con `401 Authentication required`. Se aplica a todas las rutas protegidas de la API.

## Paginas Frontend

| Ruta | Componente | Descripcion |
|------|-----------|-------------|
| `/` | Dashboard | Panel principal con metricas e inventario reciente |
| `/warehouses` | WarehouseManagement | Gestion de bodegas |
| `/cost-centers` | CostCenterManagement | Gestion de centros de costo |
| `/products` | ProductManagement | Gestion de productos |
| `/products/management` | ProductManagement | Gestion de productos (alias) |
| `/products/movements` | ProductMovements | Movimientos de productos |
| `/inventory/stock-entry` | StockEntry | Ingreso de stock |
| `/orders/purchase-order` | PurchaseOrders | Ordenes de compra |
| `/orders/transfer-orders` | TransferOrders | Ordenes de transferencia |
| `/users` | UserManagement | Gestion de usuarios |
| `/roles` | RolesManagement | Gestion de roles y permisos |
| `/test-barcode` | TestBarcode | Prueba de escaneo de codigos de barra |

## Tablas de Base de Datos (principales)

### users
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | serial PK | Identificador unico |
| username | varchar(50) | Nombre de usuario (unico) |
| password | text | Hash SHA256 de la contrasena |
| firstName | varchar(100) | Nombre |
| lastName | varchar(100) | Apellido |
| email | varchar(255) | Correo electronico (unico) |
| ficha | varchar(20) | Numero de ficha del trabajador (unico) |
| role | varchar(30) | Rol: admin, project_manager, warehouse_operator, user |
| costCenter | varchar(100) | Centro de costo asignado |
| permissions | text[] | Array de permisos especificos |
| managedWarehouses | integer[] | IDs de bodegas que puede gestionar |
| isActive | boolean | Estado activo/inactivo |

### warehouses
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | serial PK | Identificador unico |
| name | varchar(100) | Nombre de la bodega |
| location | text | Ubicacion |
| costCenter | varchar(100) | Centro de costo |
| parentWarehouseId | integer | ID de bodega padre (jerarquia) |
| warehouseType | varchar(50) | Tipo: 'main' o 'sub' |
| subWarehouseType | varchar(50) | Subtipo: 'um2', 'plataforma', 'pem', 'integrador' |

### products
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | serial PK | Identificador unico |
| name | varchar(200) | Nombre del producto |
| sku | varchar(50) | Codigo SKU |
| barcode | varchar(100) | Codigo de barra |
| productType | varchar(20) | 'tangible' o 'intangible' |
| requiresSerial | boolean | Requiere numero de serie |
| unitId | integer FK | Unidad de medida |
| categoryId | integer FK | Categoria |
| brandId | integer FK | Marca |
| erpProductCode | varchar(100) | Codigo del ERP para matching con OC |
| hasWarranty | boolean | Tiene garantia |
| warrantyMonths | integer | Meses de garantia |

### Tablas complementarias
- **units** - Unidades de medida (nombre, abreviacion, tipo)
- **categories** - Categorias de productos
- **brands** - Marcas de productos
- **productPrices** - Precios mensuales por producto (ano, mes, precio)
- **productSerials** - Numeros de serie individuales por producto y bodega

## Scripts de Desarrollo

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Inicia servidor de desarrollo con Vite HMR |
| `npm run build` | Compila frontend (Vite) y backend (esbuild) |
| `npm start` | Ejecuta la version compilada en produccion |
| `npm run check` | Verifica tipos TypeScript |
| `npm run db:push` | Sincroniza esquema con la base de datos |
