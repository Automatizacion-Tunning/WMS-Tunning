# Sistema de Gestión de Inventarios

## Overview

Este proyecto es un sistema integral de gestión de inventarios para bodegas, desarrollado con TypeScript. Su propósito es proporcionar una solución moderna y eficiente para el seguimiento de inventario, el control de productos y la gestión de almacenes. La aplicación está diseñada como una Single Page Application (SPA) con una API RESTful y utiliza PostgreSQL como su base de datos principal, enfocándose en la gestión jerárquica de bodegas y un seguimiento detallado de productos.

## User Preferences

*   **Estilo de comunicación preferido**: Lenguaje simple y cotidiano.
*   **Moneda**: Peso Chileno (CLP) - Sistema actualizado para usar formato y precios CLP.
*   **Usuario de Base de Datos**: SIEMPRE usar "administrador_Innovaoper" como nombre de usuario para conexiones Azure PostgreSQL. Nunca usar "tunning-innovaoper-erp" que fue un error.
*   **Idioma**: Documentación y comunicación siempre en español.

## System Architecture

La aplicación emplea una arquitectura full-stack TypeScript, dividida en frontend y backend:

### Frontend
- **Tecnologías**: React 18, TypeScript, Vite.
- **UI/UX**: Radix UI para componentes accesibles, Tailwind CSS para estilos utility-first, Lucide React para iconos. El layout incluye una navegación lateral y es responsivo.
- **Gestión de Estado**: TanStack Query para estado del servidor, React Hook Form con Zod para formularios y validación, hooks de React para estado UI.
- **Características UI/UX**: Dashboard con métricas y alertas de stock, formularios reutilizables con validación, tablas paginadas con ordenamiento y filtrado, modales para flujos CRUD.

### Backend
- **Tecnologías**: Node.js con Express.js.
- **API**: RESTful con manejo estructurado de errores y gestión de sesiones mediante Express.
- **Entidades Clave**: Usuarios (autenticación y roles), Bodegas (jerárquicas por centros de costo: PRINCIPAL, UM2, PLATAFORMA, PEM, INTEGRADOR), Productos (SKU, precios CLP), Inventario (niveles de stock por producto/bodega), Movimientos de Inventario (auditoría).
- **Servicios**: Capa de almacenamiento abstraída, manejadores de rutas para endpoints RESTful, middleware para logging y manejo de errores.

### Base de Datos
- **Motor**: PostgreSQL (Azure PostgreSQL 16.8).
- **ORM**: Drizzle ORM para consultas type-safe y definiciones de esquema TypeScript-first.
- **Gestión**: Drizzle Kit para migraciones de esquema.
- **Conexión**: Driver serverless de Neon Database (usado para conexión, no para el host), tunning-innovaoper-erp.postgres.database.azure.com, DB: WMS_Compras, Usuario: administrador_Innovaoper, IP Autorizada: 35.185.107.58.
- **Flujo de Datos**: Comunicación cliente-servidor vía TanStack Query y API REST. Drizzle ORM maneja las operaciones de base de datos con esquemas compartidos y pooling de conexiones.

### Consideraciones Generales
- **Control de Stock**: El sistema opera únicamente con estados binarios de stock (existe/no existe), sin control de umbrales mínimos/máximos.
- **Flujo de Ingreso de Productos**: Unificado a través de un único formulario `NewProductWithBarcodeForm` que incluye todas las opciones (categorías, marcas, unidades, garantía, precios, tipo de producto) y soporta escaneo de códigos de barras.
- **Optimización de UI**: Todos los diálogos del sistema tienen una configuración estandarizada para permitir scroll (`max-w-2xl max-h-[90vh] overflow-y-auto`).

## External Dependencies

*   **drizzle-orm**: ORM type-safe para interacciones con la base de datos.
*   **@tanstack/react-query**: Gestión y sincronización de estado del servidor en React.
*   **@radix-ui/**: Primitivos de componentes UI accesibles y sin estilos.
*   **react-hook-form**: Manejo de formularios performante con validación.
*   **Zod**: Librería de validación de esquemas utilizada con React Hook Form.
*   **Vite**: Herramienta de construcción y servidor de desarrollo rápido.
*   **TypeScript**: Lenguaje de programación estáticamente tipado para todo el stack.
*   **Tailwind CSS**: Framework CSS utility-first.
*   **ESBuild**: Bundler JavaScript rápido para el backend en producción.
*   **Wouter**: Librería de enrutamiento del lado del cliente.
*   **Express.js**: Framework web para el backend Node.js.
*   **Neon Database (serverless driver)**: Para la conexión a PostgreSQL.
*   **PostgreSQL**: Base de datos relacional.
*   **Lucide React**: Librería de iconos.
*   **ZXing**: Librería para escaneo de códigos de barras.
```