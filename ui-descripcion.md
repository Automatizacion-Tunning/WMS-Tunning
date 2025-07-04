# Documentación de Interfaz de Usuario - Sistema de Gestión de Inventarios

## Contexto de la Aplicación
- **Framework**: React + TypeScript + Wouter (SPA)
- **UI**: Radix UI + Tailwind CSS
- **Formularios**: React Hook Form + Zod
- **Estado**: TanStack Query (React Query) 
- **Backend**: Node/Express, Drizzle ORM, PostgreSQL
- **Iconografía**: Lucide React

---

## Estructura de Navegación Principal

### Layout Principal
- **Componente**: `Layout` (`client/src/components/layout/Layout.tsx`)
- **Sidebar**: Navegación lateral con menú jerárquico
- **Header**: Barra superior con información de usuario

---

## Pantallas del Sistema

### Dashboard (ruta /)
- **Título visible**: "Dashboard - WMS Control de Inventario"
- **Componentes**:
  - **Métricas**:
    - Componente: `MetricCard` con iconos de Lucide
    - Datos: Total Productos, Bodegas Activas, Stock Bajo, Valor Inventario
    - Query: `["/api/dashboard/metrics"]`
  - **Tabla de Inventario Reciente**:
    - Componente: `Table` de Radix UI
    - Columnas: Producto, Bodega, Stock, Estado, Acciones
    - Query: `["/api/dashboard/recent-inventory"]`
    - Acciones: Botones Editar (`Edit` icon) y Eliminar (`Trash2` icon)
  - **Alertas de Stock Bajo**:
    - Componente: `Card` con listado
    - Query: `["/api/dashboard/low-stock"]`
    - Badges de estado: "Sin Stock", "Stock Bajo", "Disponible"
- **Dependencias UI**:
  - Radix UI: Card, Table, Badge, Button
  - Lucide Icons: Package, Warehouse, AlertTriangle, DollarSign
  - Tailwind CSS para layout responsive

### Gestión de Productos (ruta /products)
- **Título visible**: "Gestión de Productos"
- **Componentes**:
  - **Sistema de Pestañas**:
    - Componente: `Tabs` de Radix UI
    - `TabsList` con 4 triggers:
      - `products`: Productos (icono Package)
      - `categories`: Categorías (icono Tags)
      - `brands`: Marcas (icono Award)
      - `units`: Unidades (icono Ruler)
  - **Pestaña Productos**:
    - **Botón Crear**:
      - Texto: "Nuevo Producto"
      - Acción: Abre `Dialog` con `SimpleProductForm`
      - Icono: Plus
    - **Grid de Productos**:
      - Layout: Grid responsive de tarjetas (`Card`)
      - Campos mostrados: Nombre, SKU, Tipo, Precio, Estado
      - Query: `["/api/products"]`
    - **Formulario de Creación**:
      - Componente: `SimpleProductForm`
      - Campos: name, sku, barcode, description, productType, requiresSerial, unitId, categoryId, brandId, hasWarranty, warrantyMonths, isActive, currentPrice
      - Validación: Schema Zod con `zodResolver`
    - **Formulario de Edición**:
      - Componente: `EditProductForm`
      - Modal: `Dialog` de Radix UI
      - Same fields as creation form with pre-populated values
  - **Pestaña Categorías**:
    - Componente: `CategoryManagement`
    - CRUD completo para categorías
  - **Pestaña Marcas**:
    - Componente: `BrandManagement`
    - CRUD completo para marcas
  - **Pestaña Unidades**:
    - Componente: `UnitManagement`
    - CRUD completo para unidades de medida
- **Dependencias UI**:
  - Radix UI: Tabs, Dialog, Card, Badge, Button, Form
  - React Hook Form con zodResolver
  - Lucide Icons: Package, Tags, Award, Ruler, Plus, Edit, Trash2

### Movimientos de Productos (ruta /products/movements)
- **Título visible**: "Movimientos de Productos - Alta/Baja"
- **Componentes**:
  - **Tabla de Movimientos**:
    - Componente: `Table` de Radix UI
    - Columnas: Fecha, Producto, Bodega, Tipo, Cantidad, Usuario
    - Query: `["/api/inventory/movements"]`
  - **Filtros**:
    - Por fecha, producto, bodega, tipo de movimiento
- **Dependencias UI**:
  - Radix UI: Table, Select, DatePicker
  - Lucide Icons: RefreshCcw, Filter

### Ingreso de Productos (ruta /inventory/stock-entry)
- **Título visible**: "Ingreso de Productos"
- **Componentes**:
  - **Formulario Principal**:
    - Componente: `SimpleProductEntryForm`
    - Campos: productId, warehouseId, quantity, serialNumbers (opcional)
    - Validación: Zod schema
  - **Selector de Productos**:
    - Con información detallada del producto seleccionado
    - Badges para: Activo, Requiere Serial, Tipo
  - **Escáner de Códigos de Barras**:
    - Integración con `useBarcodeFlow` hook
    - Componente: Scanner modal
  - **Información del Producto**:
    - Card azul con detalles completos
    - Campos: Categoría, Marca, Unidad, Garantía, Precio
- **Dependencias UI**:
  - Radix UI: Form, Select, Dialog, Card, Badge
  - React Hook Form con zodResolver
  - Lucide Icons: ArrowUpCircle, Scan, Package

### Gestión de Bodegas (ruta /warehouses)
- **Título visible**: "Administración de Bodegas"
- **Componentes**:
  - **Vista Jerárquica**:
    - Organización por centros de costo
    - Accordion expandible
  - **Tarjetas de Bodegas**:
    - Información: Nombre, Ubicación, Productos
    - Acción: Ver detalles (modal)
  - **Formulario de Creación**:
    - Componente: `WarehouseForm`
    - Campos: name, location, costCenter, type
- **Dependencias UI**:
  - Radix UI: Accordion, Card, Dialog, Form
  - Lucide Icons: Warehouse, Building2, Settings

### Centros de Costo (ruta /cost-centers)
- **Título visible**: "Gestión de Centros de Costo"
- **Componentes**:
  - **Lista de Centros**:
    - Tarjetas con información de ubicación
    - Contadores de bodegas asociadas
  - **Formulario de Creación**:
    - Campos: name, location
- **Dependencias UI**:
  - Radix UI: Card, Dialog, Form
  - Lucide Icons: Building2, Plus

### Órdenes de Traspaso (ruta /orders/transfer-orders)
- **Título visible**: "Órdenes de Traspaso"
- **Componentes**:
  - **Tabla de Órdenes**:
    - Columnas: N° Orden, Producto, Origen, Destino, Estado, Fecha
    - Query: `["/api/transfer-orders"]`
  - **Formulario de Solicitud**:
    - Componente: `TransferRequestForm`
    - Campos: productId, sourceWarehouseId, destinationWarehouseId, quantity, reason
  - **Estados de Orden**:
    - Badges: Pendiente, Aprobada, En Tránsito, Completada
- **Dependencias UI**:
  - Radix UI: Table, Dialog, Form, Badge
  - Lucide Icons: RefreshCcw, ArrowRight, CheckCircle

### Gestión de Usuarios (ruta /users)
- **Título visible**: "Gestión de Usuarios"
- **Componentes**:
  - **Tabla de Usuarios**:
    - Componente: `Table` de Radix UI
    - Columnas: Usuario, Rol, Centro de Costo, Estado, Acciones
    - Query: `["/api/users"]`
  - **Formulario de Usuario**:
    - Componente: `UserForm`
    - Campos: username, password, role, costCenter, permissions, managedWarehouses
    - Validación: Zod schema
  - **Gestión de Permisos**:
    - Componente: `UserPermissions`
    - Checkboxes para permisos específicos
- **Dependencias UI**:
  - Radix UI: Table, Dialog, Form, Checkbox, Select
  - Lucide Icons: Users, Shield, Edit, Trash2

### Login (pantalla de autenticación)
- **Título visible**: "Iniciar Sesión - WMS"
- **Componentes**:
  - **Formulario de Login**:
    - Campos: username (input text), password (input password)
    - Validación: required en ambos campos
    - Botón: "Iniciar Sesión"
    - Acción: `onLoginSuccess` callback
  - **Estado de Carga**:
    - Spinner animado durante autenticación
    - Texto: "Iniciando sesión..."
- **Dependencias UI**:
  - Radix UI: Form, Button, Input
  - Lucide Icons: User, Lock

### Página No Encontrada (ruta 404)
- **Título visible**: "Página no encontrada"
- **Componentes**:
  - Mensaje de error 404
  - Botón de regreso al dashboard
- **Dependencias UI**:
  - Radix UI: Button
  - Lucide Icons: Home

---

## Componentes Reutilizables

### Formularios
- **SimpleProductForm**: Creación básica de productos
- **EditProductForm**: Edición completa de productos
- **SimpleProductEntryForm**: Ingreso de stock con info detallada
- **NewProductWithBarcodeForm**: Creación con escaneo de código de barras
- **UserForm**: Gestión de usuarios y permisos
- **WarehouseForm**: Creación y edición de bodegas
- **TransferRequestForm**: Solicitudes de traspaso

### UI Components
- **MetricCard**: Tarjetas de métricas del dashboard
- **Layout**: Layout principal con sidebar y header
- **Sidebar**: Navegación lateral jerárquica
- Todos los componentes de Radix UI (Table, Dialog, Form, etc.)

### Hooks Personalizados
- **useAuth**: Gestión de autenticación
- **useBarcodeFlow**: Flujo de escaneo de códigos de barras
- **use-toast**: Sistema de notificaciones
- **use-mobile**: Detección de dispositivos móviles

---

## Patrones de Diseño

### Formularios
- Todos usan React Hook Form + Zod para validación
- Patrón: `useForm({ resolver: zodResolver(schema) })`
- Submit handler con manejo de errores y toast notifications

### Consultas de Datos
- TanStack Query para todas las peticiones
- Patrón: `useQuery({ queryKey: ["/api/endpoint"] })`
- Estados de loading, error y success manejados consistentemente

### Modales y Diálogos
- Configuración estándar: `max-w-2xl max-h-[90vh] overflow-y-auto`
- Radix UI Dialog como base
- Estados controlados con useState

### Responsive Design
- Mobile-first approach con Tailwind CSS
- Vistas específicas para móvil y desktop
- Grid layouts adaptativos

### Iconografía
- Lucide React como librería principal
- Iconos semánticamente apropiados
- Tamaños consistentes (w-4 h-4, w-5 h-5)

---

*Última actualización: 04 Julio 2025*
*Sistema funcionando con Azure PostgreSQL exclusivamente*