# Inventory Management System

## Overview

This is a full-stack inventory management system built with a modern TypeScript stack. The application provides comprehensive warehouse and inventory management capabilities with a clean, modern user interface. It's designed as a single-page application (SPA) with a REST API backend and uses PostgreSQL as the primary database.

## System Architecture

The application follows a full-stack TypeScript architecture with clear separation between client and server code:

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state
- **UI Framework**: Radix UI components with Tailwind CSS styling
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite with custom configuration for development and production

### Backend Architecture  
- **Runtime**: Node.js with Express.js server
- **Database**: PostgreSQL with Drizzle ORM
- **Connection**: Neon Database serverless driver
- **API Design**: RESTful API with structured error handling
- **Session Management**: Express sessions with PostgreSQL store

### Database Architecture
- **ORM**: Drizzle ORM with TypeScript-first schema definitions
- **Migrations**: Drizzle Kit for schema management
- **Connection**: Azure PostgreSQL with SSL encryption
- **Host**: tunning-innovaoper-erp.postgres.database.azure.com  
- **User**: administrador_Innovaoper (usuario fijo y correcto)
- **Database**: WMS_Compras

## Key Components

### Core Entities
1. **Users**: Authentication and role-based access control
2. **Warehouses**: Hierarchical storage system organized by cost centers
   - Main warehouse (PRINCIPAL)
   - Sub-warehouses: UM2, PLATAFORMA, PEM, INTEGRADOR
   - Cost center-based organization for better control
3. **Products**: Inventory items with SKU tracking and CLP pricing
4. **Inventory**: Stock levels per product per warehouse across all locations
5. **Inventory Movements**: Audit trail for stock changes with warehouse tracking

### Frontend Components
- **Layout System**: Sidebar navigation with responsive design
- **Dashboard**: Real-time metrics and low stock alerts
- **Forms**: Reusable form components with validation
- **Data Tables**: Paginated tables with sorting and filtering
- **Modals**: Dialog-based workflows for CRUD operations

### Backend Services
- **Storage Layer**: Abstracted data access with TypeScript interfaces
- **Route Handlers**: RESTful endpoints for all entities
- **Middleware**: Logging, error handling, and request processing

## Data Flow

### Client-Server Communication
1. React components use TanStack Query for data fetching
2. API requests go through a centralized request handler
3. Server responds with JSON data or appropriate error codes
4. Client state is automatically synchronized with server state

### Database Operations
1. Drizzle ORM provides type-safe database queries
2. Schema definitions are shared between client and server
3. Migrations ensure consistent database structure
4. Connection pooling handles concurrent requests efficiently

### State Management
1. Server state managed by TanStack Query with caching
2. Form state handled by React Hook Form
3. UI state managed by React hooks
4. Global notifications via toast system

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL driver for serverless environments
- **drizzle-orm**: Type-safe ORM with excellent TypeScript support
- **@tanstack/react-query**: Powerful data synchronization for React
- **@radix-ui/***: Accessible, unstyled UI components
- **react-hook-form**: Performant forms with easy validation

### Development Tools
- **Vite**: Fast development server and build tool
- **TypeScript**: Static type checking across the entire stack
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: Fast JavaScript bundler for production

### UI and Styling
- **Tailwind CSS**: Comprehensive utility classes with custom design system
- **CSS Variables**: Theme customization with light/dark mode support
- **Radix UI**: Accessible component primitives
- **Lucide React**: Modern icon library

## Deployment Strategy

### Development Environment
- Vite development server with hot module replacement
- TypeScript compilation with strict type checking
- Environment variables for database connection
- Replit-specific configurations for cloud development

### Production Build
1. **Frontend**: Vite builds optimized React bundle
2. **Backend**: ESBuild compiles TypeScript server code
3. **Database**: Drizzle migrations ensure schema consistency
4. **Static Assets**: Served from Express with proper caching headers

### Environment Configuration
- Database URL configuration via environment variables
- Separate development and production database instances
- Build scripts handle both development and production workflows

## Changelog

```
Changelog:
- July 01, 2025. Initial setup
- July 01, 2025. Implemented hierarchical warehouse structure with cost centers
  * Added cost center fields to warehouse schema
  * Created main warehouse with sub-warehouses (UM2, PLATAFORMA, PEM, INTEGRADOR)
  * Updated warehouse management interface with hierarchy visualization
  * Populated sample data with proper warehouse structure
- July 02, 2025. Migrated to Azure PostgreSQL database
  * Successfully connected to Azure PostgreSQL with SSL encryption
  * Migrated all existing data (users, warehouses, products, inventory)
  * Updated database configuration with Azure credentials
  * Application now runs 100% on Azure infrastructure
- July 02, 2025. Enhanced warehouse management interface
  * Added comprehensive warehouse management screen with filtering
  * Implemented clickable warehouse cards with detailed product views
  * Added filters by cost center and warehouse with search functionality
  * Created detailed modal views showing complete inventory per warehouse
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
Currency: Chilean Peso (CLP) - Updated system to use CLP formatting and pricing.
Database User: ALWAYS use "administrador_Innovaoper" as username for Azure PostgreSQL connections. Never use "tunning-innovaoper-erp" which was an error.
```