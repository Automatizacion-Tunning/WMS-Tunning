-- Crear esquema de base de datos en Azure PostgreSQL
-- Script de migración completo

-- Users table
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  "firstName" VARCHAR(100),
  "lastName" VARCHAR(100),
  email VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  "costCenter" VARCHAR(100),
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Warehouses table
DROP TABLE IF EXISTS warehouses CASCADE;
CREATE TABLE warehouses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  "costCenter" VARCHAR(100),
  type VARCHAR(50) DEFAULT 'SUB_BODEGA',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Products table
DROP TABLE IF EXISTS products CASCADE;
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE,
  barcode VARCHAR(100) UNIQUE,
  description TEXT,
  category VARCHAR(100),
  "minStock" INTEGER DEFAULT 0,
  "maxStock" INTEGER DEFAULT 1000,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Product prices table
DROP TABLE IF EXISTS product_prices CASCADE;
CREATE TABLE product_prices (
  id SERIAL PRIMARY KEY,
  "productId" INTEGER REFERENCES products(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("productId", year, month)
);

-- Product serials table
DROP TABLE IF EXISTS product_serials CASCADE;
CREATE TABLE product_serials (
  id SERIAL PRIMARY KEY,
  "productId" INTEGER REFERENCES products(id) ON DELETE CASCADE,
  "warehouseId" INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
  "serialNumber" VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'AVAILABLE',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("productId", "serialNumber")
);

-- Inventory table
DROP TABLE IF EXISTS inventory CASCADE;
CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  "productId" INTEGER REFERENCES products(id) ON DELETE CASCADE,
  "warehouseId" INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 0,
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("productId", "warehouseId")
);

-- Inventory movements table
DROP TABLE IF EXISTS inventory_movements CASCADE;
CREATE TABLE inventory_movements (
  id SERIAL PRIMARY KEY,
  "productId" INTEGER REFERENCES products(id) ON DELETE CASCADE,
  "warehouseId" INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
  "userId" INTEGER REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  "previousQuantity" INTEGER DEFAULT 0,
  "newQuantity" INTEGER DEFAULT 0,
  reference VARCHAR(255),
  notes TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Transfer orders table
DROP TABLE IF EXISTS transfer_orders CASCADE;
CREATE TABLE transfer_orders (
  id SERIAL PRIMARY KEY,
  "orderNumber" VARCHAR(50) UNIQUE NOT NULL,
  "productId" INTEGER REFERENCES products(id) ON DELETE CASCADE,
  "sourceWarehouseId" INTEGER REFERENCES warehouses(id),
  "destinationWarehouseId" INTEGER REFERENCES warehouses(id),
  "requesterId" INTEGER REFERENCES users(id),
  "projectManagerId" INTEGER REFERENCES users(id),
  quantity INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  "requestDate" TIMESTAMP DEFAULT NOW(),
  "approvalDate" TIMESTAMP,
  notes TEXT
);

-- Insertar datos iniciales de usuarios
INSERT INTO users (username, password, "firstName", "lastName", email, role, "costCenter", "isActive") VALUES
('admin', 'admin', 'Administrador', 'Sistema', 'admin@innovaoper.com', 'admin', NULL, true),
('jefe_proyecto', 'jefe123', 'Juan Carlos', 'Martínez', 'jcmartinez@innovaoper.com', 'project_manager', 'CENTRO_1', true),
('operador1', 'oper123', 'María', 'González', 'mgonzalez@innovaoper.com', 'warehouse_operator', 'CENTRO_1', true),
('usuario1', 'user123', 'Carlos', 'Rodríguez', 'crodriguez@innovaoper.com', 'user', 'CENTRO_2', true);

-- Insertar datos iniciales de bodegas
INSERT INTO warehouses (name, location, "costCenter", type, "isActive") VALUES
('Bodega Principal CC2521', 'Centro de Costo 2521', 'CENTRO_1', 'PRINCIPAL', true),
('Bodega UM2 CC2521', 'Unidad Móvil 2, Centro de Costo 2521', 'CENTRO_1', 'SUB_BODEGA', true),
('Bodega Plataforma CC2521', 'Plataforma de Trabajo, Centro de Costo 2521', 'CENTRO_1', 'SUB_BODEGA', true),
('Bodega PEM CC2521', 'Plataforma Elevadora Móvil, Centro de Costo 2521', 'CENTRO_1', 'SUB_BODEGA', true),
('Bodega Integrador CC2521', 'Integrador de Sistemas, Centro de Costo 2521', 'CENTRO_1', 'SUB_BODEGA', true),
('Bodega Principal CC3050', 'Centro de Costo 3050', 'CENTRO_2', 'PRINCIPAL', true),
('Bodega UM2 CC3050', 'Unidad Móvil 2, Centro de Costo 3050', 'CENTRO_2', 'SUB_BODEGA', true),
('Bodega Plataforma CC3050', 'Plataforma de Trabajo, Centro de Costo 3050', 'CENTRO_2', 'SUB_BODEGA', true);

-- Insertar productos de ejemplo
INSERT INTO products (name, sku, barcode, description, category, "minStock", "maxStock", "isActive") VALUES
('Interruptor Automático ABB S200', 'INT-ABB-S200-20A', '7891234567890', 'Interruptor automático monopolar 20A curva C', 'Protección Eléctrica', 5, 50, true),
('Cable THHN 12 AWG', 'CABLE-THHN-12AWG', '7891234567891', 'Cable conductor THHN calibre 12 AWG', 'Cables', 10, 100, true),
('Control Logix Junmper bar kit', 'CTL-LOGIX-JMPBAR', NULL, 'Kit de barras de conexión para Control Logix', 'Automatización', 2, 20, true);

-- Insertar precios actuales
INSERT INTO product_prices ("productId", price, year, month, "isActive") VALUES
(1, 15500.00, 2025, 7, true),
(2, 2800.00, 2025, 7, true),
(3, 125000.00, 2025, 7, true);

-- Insertar inventario inicial
INSERT INTO inventory ("productId", "warehouseId", quantity) VALUES
(1, 1, 25), (1, 2, 5), (1, 6, 15),
(2, 1, 50), (2, 3, 20), (2, 7, 30),
(3, 1, 8), (3, 4, 2), (3, 8, 5);

-- Insertar movimientos de inventario
INSERT INTO inventory_movements ("productId", "warehouseId", "userId", type, quantity, "previousQuantity", "newQuantity", reference, notes) VALUES
(1, 1, 1, 'INGRESO', 25, 0, 25, 'COMPRA-001', 'Ingreso inicial de interruptores ABB'),
(2, 1, 1, 'INGRESO', 50, 0, 50, 'COMPRA-002', 'Ingreso inicial de cable THHN'),
(3, 1, 1, 'INGRESO', 8, 0, 8, 'COMPRA-003', 'Ingreso inicial de kits Control Logix');

-- Insertar orden de transferencia de ejemplo
INSERT INTO transfer_orders ("orderNumber", "productId", "sourceWarehouseId", "destinationWarehouseId", "requesterId", quantity, status, notes) VALUES
('OT-001', 1, 1, 2, 4, 10, 'PENDING', 'Transferencia para proyecto de instalación eléctrica');

-- Verificar datos insertados
SELECT 'Users' as tabla, count(*) as registros FROM users
UNION ALL
SELECT 'Warehouses' as tabla, count(*) as registros FROM warehouses  
UNION ALL
SELECT 'Products' as tabla, count(*) as registros FROM products
UNION ALL
SELECT 'Product Prices' as tabla, count(*) as registros FROM product_prices
UNION ALL
SELECT 'Inventory' as tabla, count(*) as registros FROM inventory
UNION ALL
SELECT 'Inventory Movements' as tabla, count(*) as registros FROM inventory_movements
UNION ALL
SELECT 'Transfer Orders' as tabla, count(*) as registros FROM transfer_orders;