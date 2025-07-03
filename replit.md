# Sistema de Gestión de Inventarios

## Descripción General

Este es un sistema completo de gestión de inventarios construido con tecnologías modernas de TypeScript. La aplicación proporciona capacidades integrales de gestión de bodegas e inventarios con una interfaz de usuario limpia y moderna. Está diseñada como una aplicación de página única (SPA) con un backend de API REST y utiliza PostgreSQL como base de datos principal.

## Arquitectura del Sistema

La aplicación sigue una arquitectura completa de TypeScript con separación clara entre código cliente y servidor:

### Arquitectura Frontend
- **Framework**: React 18 con TypeScript
- **Enrutamiento**: Wouter para enrutamiento del lado del cliente
- **Gestión de Estado**: TanStack Query (React Query) para estado del servidor
- **Framework UI**: Componentes Radix UI con estilos Tailwind CSS
- **Formularios**: React Hook Form con validación Zod
- **Herramienta de Construcción**: Vite con configuración personalizada para desarrollo y producción

### Arquitectura Backend  
- **Runtime**: Servidor Node.js con Express.js
- **Base de Datos**: PostgreSQL con Drizzle ORM
- **Conexión**: Driver serverless de Neon Database
- **Diseño de API**: API RESTful con manejo estructurado de errores
- **Gestión de Sesiones**: Sesiones Express con almacén PostgreSQL

### Arquitectura de Base de Datos
- **ORM**: Drizzle ORM con definiciones de esquema TypeScript-first
- **Migraciones**: Drizzle Kit para gestión de esquemas
- **Conexión**: Azure PostgreSQL 16.8 con cifrado SSL
- **Host**: tunning-innovaoper-erp.postgres.database.azure.com  
- **Usuario**: administrador_Innovaoper (usuario fijo y correcto)
- **Base de Datos**: WMS_Compras
- **IP Autorizada**: 35.185.107.58 (IP de Replit configurada en firewall Azure)

## Componentes Principales

### Entidades Centrales
1. **Usuarios**: Autenticación y control de acceso basado en roles
2. **Bodegas**: Sistema jerárquico de almacenamiento organizado por centros de costo
   - Bodega principal (PRINCIPAL)
   - Sub-bodegas: UM2, PLATAFORMA, PEM, INTEGRADOR
   - Organización basada en centros de costo para mejor control
3. **Productos**: Artículos de inventario con seguimiento de SKU y precios en CLP
4. **Inventario**: Niveles de stock por producto por bodega en todas las ubicaciones
5. **Movimientos de Inventario**: Auditoría de cambios de stock con seguimiento de bodegas

### Componentes Frontend
- **Sistema de Layout**: Navegación lateral con diseño responsivo
- **Dashboard**: Métricas en tiempo real y alertas de stock bajo
- **Formularios**: Componentes de formulario reutilizables con validación
- **Tablas de Datos**: Tablas paginadas con ordenamiento y filtrado
- **Modales**: Flujos de trabajo basados en diálogos para operaciones CRUD

### Servicios Backend
- **Capa de Almacenamiento**: Acceso a datos abstraído con interfaces TypeScript
- **Manejadores de Rutas**: Endpoints RESTful para todas las entidades
- **Middleware**: Logging, manejo de errores y procesamiento de solicitudes

## Flujo de Datos

### Comunicación Cliente-Servidor
1. Los componentes React usan TanStack Query para obtención de datos
2. Las solicitudes API pasan por un manejador centralizado de solicitudes
3. El servidor responde con datos JSON o códigos de error apropiados
4. El estado del cliente se sincroniza automáticamente con el estado del servidor

### Operaciones de Base de Datos
1. Drizzle ORM proporciona consultas de base de datos type-safe
2. Las definiciones de esquema se comparten entre cliente y servidor
3. Las migraciones aseguran estructura consistente de base de datos
4. El pooling de conexiones maneja solicitudes concurrentes eficientemente

### Gestión de Estado
1. Estado del servidor gestionado por TanStack Query con caché
2. Estado de formularios manejado por React Hook Form
3. Estado de UI gestionado por hooks de React
4. Notificaciones globales via sistema de toast

## Dependencias Externas

### Dependencias Principales
- **drizzle-orm**: ORM type-safe con excelente soporte TypeScript
- **@tanstack/react-query**: Sincronización de datos potente para React
- **@radix-ui/***: Componentes UI accesibles y sin estilos
- **react-hook-form**: Formularios performantes con validación fácil

### Herramientas de Desarrollo
- **Vite**: Servidor de desarrollo rápido y herramienta de construcción
- **TypeScript**: Verificación de tipos estática en todo el stack
- **Tailwind CSS**: Framework CSS utility-first
- **ESBuild**: Bundler JavaScript rápido para producción

### UI y Estilos
- **Tailwind CSS**: Clases de utilidad comprehensivas con sistema de diseño personalizado
- **Variables CSS**: Personalización de temas con soporte modo claro/oscuro
- **Radix UI**: Primitivos de componentes accesibles
- **Lucide React**: Librería de iconos moderna

## Estrategia de Despliegue

### Entorno de Desarrollo
- Servidor de desarrollo Vite con reemplazo de módulos en caliente
- Compilación TypeScript con verificación estricta de tipos
- Variables de entorno para conexión de base de datos
- Configuraciones específicas de Replit para desarrollo en la nube

### Construcción de Producción
1. **Frontend**: Vite construye bundle React optimizado
2. **Backend**: ESBuild compila código TypeScript del servidor
3. **Base de Datos**: Migraciones Drizzle aseguran consistencia de esquema
4. **Assets Estáticos**: Servidos desde Express con headers de caché apropiados

### Configuración de Entorno
- Configuración URL de base de datos via variables de entorno
- Instancias separadas de base de datos para desarrollo y producción
- Scripts de construcción manejan flujos de trabajo de desarrollo y producción

## Registro de Cambios

```
Registro de Cambios:
- 01 Julio, 2025. Configuración inicial
- 01 Julio, 2025. Implementación de estructura jerárquica de bodegas con centros de costo
  * Agregados campos de centro de costo al esquema de bodegas
  * Creada bodega principal con sub-bodegas (UM2, PLATAFORMA, PEM, INTEGRADOR)
  * Actualizada interfaz de gestión de bodegas con visualización jerárquica
  * Poblados datos de ejemplo con estructura apropiada de bodegas
- 02 Julio, 2025. Migración a base de datos Azure PostgreSQL
  * Conectado exitosamente a Azure PostgreSQL con cifrado SSL
  * Migrados todos los datos existentes (usuarios, bodegas, productos, inventario)
  * Actualizada configuración de base de datos con credenciales Azure
  * La aplicación ahora funciona 100% en infraestructura Azure
- 02 Julio, 2025. Interfaz mejorada de gestión de bodegas
  * Agregada pantalla integral de gestión de bodegas con filtrado
  * Implementadas tarjetas clickeables de bodegas con vistas detalladas de productos
  * Agregados filtros por centro de costo y bodega con funcionalidad de búsqueda
  * Creadas vistas modales detalladas mostrando inventario completo por bodega
- 02 Julio, 2025. Completado sistema integral de escaneo de códigos de barras
  * Implementado escaneo completo de códigos de barras en formularios de ingreso de productos (SimpleProductEntryForm)
  * Agregado flujo de códigos de barras con escanear → encontrar → seleccionar O crear/asociar
  * Integrado escaneo nativo de códigos de barras con cámara usando librería ZXing
  * Agregada validación de códigos de barras duplicados en todas las operaciones de productos
  * Completados endpoints API para búsqueda de códigos de barras y asociación de productos
- 02 Julio, 2025. Finalizada arquitectura completa de API REST
  * Todas las operaciones CRUD disponibles vía endpoints REST
  * Endpoints de búsqueda de códigos de barras: GET /api/products?barcode=XXX
  * Métricas de dashboard y gestión de inventario vía API
  * Listo para integraciones externas y desarrollo de aplicaciones móviles
  * Sistema funcionando completamente con Azure PostgreSQL
- 03 Julio, 2025. Solución completa de sistema de autenticación y gestión de usuarios
  * Corregido bucle infinito en autenticación y optimizadas consultas
  * Formulario de edición de usuarios completamente funcional
  * Eliminadas rutas duplicadas que causaban conflictos
  * Sistema de logging implementado para debugging
  * Validación JSON corregida en envío de formularios
  * Aplicación funcionando con Node.js 20.18.1 y Azure PostgreSQL 16.8
- 03 Julio, 2025. Migración completa y exitosa a Azure PostgreSQL
  * Configurada IP 35.185.107.58 en firewall Azure PostgreSQL
  * Migrados todos los datos de Neon a Azure PostgreSQL: 4 usuarios, 20 bodegas, 4 productos
  * Esquemas recreados exactamente para mantener compatibilidad total
  * Corregidas diferencias de columnas entre esquema y base de datos
  * Sistema ahora funcionando 100% en Azure PostgreSQL (tunning-innovaoper-erp.postgres.database.azure.com)
  * Base de datos WMS_Compras completamente operativa con usuario administrador_Innovaoper
  * Dashboard, inventario, productos y todas las funcionalidades completamente operativas
- 03 Julio, 2025. Verificación completa y sincronización final entre Neon y Azure
  * Verificadas todas las tablas, columnas y registros entre ambas bases de datos
  * Corregidas inconsistencias: producto ID 3 requires_serial sincronizado, producto extra eliminado
  * Migrados 6 registros de inventario válidos (datos con referencias correctas a bodegas existentes)
  * CONFIRMACIÓN: Ambas bases de datos completamente idénticas en datos operativos
  * Estado final: 4 usuarios, 4 productos, 20 bodegas, 6 registros inventario, 1 orden transferencia
- 03 Julio, 2025. Eliminación completa de dependencias a Neon PostgreSQL
  * Removidas todas las referencias a Neon de archivos de configuración
  * Limpiada documentación de menciones innecesarias a Neon
  * Eliminados secretos de Neon del panel de Replit (DATABASE_URL, PGHOST, etc.)
  * Sistema configurado para trabajar EXCLUSIVAMENTE con Azure PostgreSQL
  * Política establecida: Si Azure falla, aplicación queda con error hasta solucionar problema
  * Verificado: Solo credenciales Azure activas, aplicación funcionando correctamente
  * NO usar fallbacks a Neon bajo ninguna circunstancia
```

## Preferencias del Usuario

```
Estilo de comunicación preferido: Lenguaje simple y cotidiano.
Moneda: Peso Chileno (CLP) - Sistema actualizado para usar formato y precios CLP.
Usuario de Base de Datos: SIEMPRE usar "administrador_Innovaoper" como nombre de usuario para conexiones Azure PostgreSQL. Nunca usar "tunning-innovaoper-erp" que fue un error.
Idioma: Documentación y comunicación siempre en español.
```