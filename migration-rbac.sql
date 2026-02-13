-- RBAC Migration: Create roles, permissions, role_permissions tables with seed data

-- Tabla de roles
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  hierarchy INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabla de permisos
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  module VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Junction: roles <-> permisos
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);

-- Seed: Roles del sistema
INSERT INTO roles (code, name, description, is_system, hierarchy) VALUES
  ('admin', 'Administrador', 'Acceso total al sistema', true, 100),
  ('project_manager', 'Jefe de Proyecto', 'Gestiona inventario, productos y aprueba traspasos de sus centros de costo', true, 50),
  ('warehouse_operator', 'Operador de Bodega', 'Ingresa productos, gestiona stock y movimientos de inventario', true, 30),
  ('viewer', 'Solo Lectura', 'Puede ver informacion pero no modificar nada', true, 15),
  ('sin_acceso', 'Sin Acceso', 'Puede autenticarse pero no tiene acceso a ninguna seccion', true, 0)
ON CONFLICT (code) DO NOTHING;

-- Seed: Permisos del sistema (23 permisos)
INSERT INTO permissions (key, name, module, category) VALUES
  ('dashboard.view', 'Ver Dashboard', 'dashboard', 'Dashboard'),
  ('products.view', 'Ver Productos', 'products', 'Productos'),
  ('products.create', 'Crear Productos', 'products', 'Productos'),
  ('products.edit', 'Editar Productos', 'products', 'Productos'),
  ('products.delete', 'Eliminar Productos', 'products', 'Productos'),
  ('inventory.view', 'Ver Inventario', 'inventory', 'Inventario'),
  ('inventory.entry', 'Ingresar Productos', 'inventory', 'Inventario'),
  ('inventory.movements', 'Gestionar Movimientos', 'inventory', 'Inventario'),
  ('warehouses.view', 'Ver Bodegas', 'warehouses', 'Bodegas'),
  ('warehouses.create', 'Crear Bodegas', 'warehouses', 'Bodegas'),
  ('warehouses.edit', 'Editar Bodegas', 'warehouses', 'Bodegas'),
  ('warehouses.delete', 'Eliminar Bodegas', 'warehouses', 'Bodegas'),
  ('cost_centers.view', 'Ver Centros de Costo', 'cost_centers', 'Centros de Costo'),
  ('cost_centers.create', 'Crear Centros de Costo', 'cost_centers', 'Centros de Costo'),
  ('orders.view_purchase', 'Ver Ordenes de Compra', 'orders', 'Ordenes'),
  ('orders.entry_oc', 'Ingresar por OC', 'orders', 'Ordenes'),
  ('orders.view_transfers', 'Ver Traspasos', 'orders', 'Ordenes'),
  ('orders.create_transfers', 'Crear Traspasos', 'orders', 'Ordenes'),
  ('orders.approve_transfers', 'Aprobar Traspasos', 'orders', 'Ordenes'),
  ('users.view', 'Ver Usuarios', 'users', 'Administracion'),
  ('users.manage', 'Gestionar Usuarios', 'users', 'Administracion'),
  ('roles.view', 'Ver Roles', 'roles', 'Administracion'),
  ('roles.manage', 'Gestionar Roles', 'roles', 'Administracion')
ON CONFLICT (key) DO NOTHING;

-- Seed: Permisos por rol
-- Admin: TODOS los permisos
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.code = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Jefe de Proyecto
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.code = 'project_manager' AND p.key IN (
    'dashboard.view', 'products.view', 'products.create', 'products.edit',
    'inventory.view', 'inventory.entry', 'inventory.movements',
    'warehouses.view', 'warehouses.create', 'warehouses.edit',
    'cost_centers.view', 'cost_centers.create',
    'orders.view_purchase', 'orders.entry_oc', 'orders.view_transfers',
    'orders.create_transfers', 'orders.approve_transfers',
    'users.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Operador de Bodega
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.code = 'warehouse_operator' AND p.key IN (
    'dashboard.view', 'products.view', 'products.create', 'products.edit',
    'inventory.view', 'inventory.entry', 'inventory.movements',
    'warehouses.view', 'cost_centers.view',
    'orders.view_purchase', 'orders.entry_oc', 'orders.view_transfers',
    'orders.create_transfers'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Solo Lectura
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.code = 'viewer' AND p.key IN (
    'dashboard.view', 'products.view', 'inventory.view',
    'warehouses.view', 'cost_centers.view',
    'orders.view_purchase', 'orders.view_transfers'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Sin Acceso: NINGUN permiso (no se inserta nada)

-- Migrar usuarios existentes: los que tienen role='user' pasan a 'sin_acceso'
UPDATE users SET role = 'sin_acceso' WHERE role = 'user';
