import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: text("password").notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  email: varchar("email", { length: 255 }).unique(),
  role: varchar("role", { length: 30 }).notNull().default("user"), // 'admin', 'project_manager', 'warehouse_operator', 'user'
  costCenter: varchar("cost_center", { length: 100 }), // Centro de costo asignado al usuario
  permissions: text("permissions").array(), // Array de permisos específicos
  managedWarehouses: integer("managed_warehouses").array(), // Array de IDs de bodegas que puede gestionar
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  location: text("location"),
  costCenter: varchar("cost_center", { length: 100 }).notNull(),
  parentWarehouseId: integer("parent_warehouse_id"),
  warehouseType: varchar("warehouse_type", { length: 50 }).notNull().default('sub'), // 'main' or 'sub'
  subWarehouseType: varchar("sub_warehouse_type", { length: 50 }), // 'um2', 'plataforma', 'pem', 'integrador' for sub-warehouses
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tabla para unidades de medida
export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(), // ej: "unidad", "kilogramo", "metro"
  abbreviation: varchar("abbreviation", { length: 10 }).notNull().unique(), // ej: "un", "kg", "m"
  type: varchar("type", { length: 20 }).notNull(), // ej: "count", "weight", "length"
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tabla para categorías de productos
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tabla para marcas de productos
export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  sku: varchar("sku", { length: 50 }),
  barcode: varchar("barcode", { length: 100 }),
  description: text("description"),
  productType: varchar("product_type", { length: 20 }).default("tangible"), // 'tangible' or 'intangible'
  requiresSerial: boolean("requires_serial").default(false),
  unitId: integer("unit_id").notNull(),
  categoryId: integer("category_id").notNull(),
  brandId: integer("brand_id").notNull(),
  hasWarranty: boolean("has_warranty").notNull().default(false),
  warrantyMonths: integer("warranty_months"), // Meses de garantía (solo si hasWarranty es true)
  minStock: integer("min_stock").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabla para precios mensuales
export const productPrices = pgTable("product_prices", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tabla para números de serie
export const productSerials = pgTable("product_serials", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  warehouseId: integer("warehouse_id").notNull(),
  serialNumber: varchar("serial_number", { length: 100 }).notNull(),
  movementId: integer("movement_id").notNull(), // Vinculado al movimiento de inventario
  status: varchar("status", { length: 20 }).notNull().default("active"), // 'active', 'sold', 'damaged'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  warehouseId: integer("warehouse_id").notNull(),
  quantity: integer("quantity").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  warehouseId: integer("warehouse_id").notNull(),
  movementType: varchar("movement_type", { length: 10 }).notNull(), // 'in' or 'out'
  quantity: integer("quantity").notNull(),
  appliedPrice: decimal("applied_price", { precision: 10, scale: 2 }), // Precio aplicado en el momento del movimiento
  barcodeScanned: varchar("barcode_scanned", { length: 100 }), // Código de barras escaneado
  reason: text("reason"),
  userId: integer("user_id").notNull(),
  transferOrderId: integer("transfer_order_id"), // Vinculado a orden de traspaso si aplica
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Nueva tabla para órdenes de traspaso
export const transferOrders = pgTable("transfer_orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 20 }).notNull().unique(), // Ej: OT-678
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  sourceWarehouseId: integer("source_warehouse_id").notNull(),
  destinationWarehouseId: integer("destination_warehouse_id").notNull(),
  costCenter: varchar("cost_center", { length: 100 }).notNull(),
  requesterId: integer("requester_id").notNull(), // Usuario que solicita
  projectManagerId: integer("project_manager_id"), // Jefe de proyecto que aprueba
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'approved', 'rejected'
  notes: text("notes"), // Comentarios adicionales
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  inventoryMovements: many(inventoryMovements),
  requestedTransferOrders: many(transferOrders, {
    relationName: "requesterTransferOrders"
  }),
  managedTransferOrders: many(transferOrders, {
    relationName: "managerTransferOrders"
  }),
}));

export const warehousesRelations = relations(warehouses, ({ one, many }) => ({
  inventory: many(inventory),
  inventoryMovements: many(inventoryMovements),
  parentWarehouse: one(warehouses, {
    fields: [warehouses.parentWarehouseId],
    references: [warehouses.id],
  }),
  subWarehouses: many(warehouses, {
    relationName: "parentChild"
  }),
}));

export const unitsRelations = relations(units, ({ many }) => ({
  products: many(products),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  unit: one(units, {
    fields: [products.unitId],
    references: [units.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
  inventory: many(inventory),
  inventoryMovements: many(inventoryMovements),
  productPrices: many(productPrices),
  productSerials: many(productSerials),
}));

export const productPricesRelations = relations(productPrices, ({ one }) => ({
  product: one(products, {
    fields: [productPrices.productId],
    references: [products.id],
  }),
}));

export const productSerialsRelations = relations(productSerials, ({ one }) => ({
  product: one(products, {
    fields: [productSerials.productId],
    references: [products.id],
  }),
  warehouse: one(warehouses, {
    fields: [productSerials.warehouseId],
    references: [warehouses.id],
  }),
  movement: one(inventoryMovements, {
    fields: [productSerials.movementId],
    references: [inventoryMovements.id],
  }),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  product: one(products, {
    fields: [inventory.productId],
    references: [products.id],
  }),
  warehouse: one(warehouses, {
    fields: [inventory.warehouseId],
    references: [warehouses.id],
  }),
}));

export const inventoryMovementsRelations = relations(inventoryMovements, ({ one }) => ({
  product: one(products, {
    fields: [inventoryMovements.productId],
    references: [products.id],
  }),
  warehouse: one(warehouses, {
    fields: [inventoryMovements.warehouseId],
    references: [warehouses.id],
  }),
  user: one(users, {
    fields: [inventoryMovements.userId],
    references: [users.id],
  }),
  transferOrder: one(transferOrders, {
    fields: [inventoryMovements.transferOrderId],
    references: [transferOrders.id],
  }),
}));

export const transferOrdersRelations = relations(transferOrders, ({ one, many }) => ({
  product: one(products, {
    fields: [transferOrders.productId],
    references: [products.id],
  }),
  sourceWarehouse: one(warehouses, {
    fields: [transferOrders.sourceWarehouseId],
    references: [warehouses.id],
    relationName: "sourceWarehouse"
  }),
  destinationWarehouse: one(warehouses, {
    fields: [transferOrders.destinationWarehouseId],
    references: [warehouses.id],
    relationName: "destinationWarehouse"
  }),
  requester: one(users, {
    fields: [transferOrders.requesterId],
    references: [users.id],
    relationName: "requesterTransferOrders"
  }),
  projectManager: one(users, {
    fields: [transferOrders.projectManagerId],
    references: [users.id],
    relationName: "managerTransferOrders"
  }),
  inventoryMovements: many(inventoryMovements),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWarehouseSchema = createInsertSchema(warehouses).omit({
  id: true,
  createdAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});

export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
  updatedAt: true,
});

export const insertInventoryMovementSchema = createInsertSchema(inventoryMovements).omit({
  id: true,
  createdAt: true,
});

export const insertProductPriceSchema = createInsertSchema(productPrices).omit({
  id: true,
  createdAt: true,
});

export const insertProductSerialSchema = createInsertSchema(productSerials).omit({
  id: true,
  createdAt: true,
});

export const insertTransferOrderSchema = createInsertSchema(transferOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUnitSchema = createInsertSchema(units).omit({
  id: true,
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertBrandSchema = createInsertSchema(brands).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;

export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = z.infer<typeof insertInventoryMovementSchema>;

// Extended types for API responses
export type InventoryWithDetails = Inventory & {
  product: Product;
  warehouse: Warehouse;
};

export type InventoryMovementWithDetails = InventoryMovement & {
  product: Product;
  warehouse: Warehouse;
  user: User;
};

export type ProductPrice = typeof productPrices.$inferSelect;
export type InsertProductPrice = z.infer<typeof insertProductPriceSchema>;

export type ProductSerial = typeof productSerials.$inferSelect;
export type InsertProductSerial = z.infer<typeof insertProductSerialSchema>;

export type TransferOrder = typeof transferOrders.$inferSelect;
export type InsertTransferOrder = z.infer<typeof insertTransferOrderSchema>;

export type Unit = typeof units.$inferSelect;
export type InsertUnit = z.infer<typeof insertUnitSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Brand = typeof brands.$inferSelect;
export type InsertBrand = z.infer<typeof insertBrandSchema>;

// Tipo extendido para productos con precio actual
export type ProductWithCurrentPrice = Product & {
  currentPrice?: ProductPrice;
};

// Tipo extendido para productos con relaciones completas
export type ProductWithDetails = Product & {
  unit: Unit;
  category: Category;
  brand: Brand;
  currentPrice?: ProductPrice;
};

// Tipo extendido para órdenes de traspaso con detalles
export type TransferOrderWithDetails = TransferOrder & {
  product: Product;
  sourceWarehouse: Warehouse;
  destinationWarehouse: Warehouse;
  requester: User;
  projectManager?: User;
};

// Esquemas de validación para formularios
export const productFormSchema = insertProductSchema.extend({
  currentPrice: z.number().min(0.01, "El precio debe ser mayor a 0"),
  barcode: z.string().optional().refine((val) => {
    if (!val) return true; // Barcode is optional
    // Validate EAN-13 (13 digits) or Code 128 format
    return /^\d{8,13}$/.test(val) || /^[A-Z0-9\-\.\/\+\%\$\#\s]+$/.test(val);
  }, "Formato de código de barras inválido"),
});

export const warehouseEntrySchema = z.object({
  productId: z.number().min(1, "Debe seleccionar un producto"),
  warehouseId: z.number().min(1, "Debe seleccionar una bodega"),
  quantity: z.number().min(1, "La cantidad debe ser mayor a 0"),
  price: z.number().min(0.01, "El precio es obligatorio y debe ser mayor a 0"),
  serialNumbers: z.array(z.string()).optional(),
  reason: z.string().optional(),
});

export const productEntrySchema = z.object({
  productId: z.number().min(1, "Debe seleccionar un producto"),
  costCenter: z.string().min(1, "Debe seleccionar un centro de costo"),
  quantity: z.number().min(1, "La cantidad debe ser mayor a 0"),
  price: z.number().min(0.01, "El precio es obligatorio y debe ser mayor a 0"),
  serialNumbers: z.array(z.string()).optional(),
  reason: z.string().optional(),
  location: z.string().optional(),
});

export const costCenterFormSchema = z.object({
  costCenter: z.string().min(1, "El centro de costo es requerido"),
  location: z.string().optional(),
});

// Esquema para solicitar traspaso entre bodegas
export const transferRequestSchema = z.object({
  productId: z.number().min(1, "Debe seleccionar un producto"),
  quantity: z.number().min(1, "La cantidad debe ser mayor a 0"),
  sourceWarehouseId: z.number().min(1, "Debe seleccionar bodega origen"),
  destinationWarehouseId: z.number().min(1, "Debe seleccionar bodega destino"),
  costCenter: z.string().min(1, "El centro de costo es requerido"),
  notes: z.string().optional(),
});

// Esquema para ingreso inicial de productos (solo a bodega principal)
export const stockEntrySchema = z.object({
  productId: z.number().min(1, "Debe seleccionar un producto"),
  quantity: z.number().min(1, "La cantidad debe ser mayor a 0"),
  serialNumbers: z.array(z.string().min(1, "El número de serie no puede estar vacío")).optional(),
  barcodeScanned: z.string().optional(),
  reason: z.string().optional(),
});

// Definición de permisos disponibles
export const PERMISSIONS = {
  // Gestión de usuarios
  MANAGE_USERS: 'manage_users',
  VIEW_USERS: 'view_users',
  
  // Gestión de productos
  CREATE_PRODUCTS: 'create_products',
  EDIT_PRODUCTS: 'edit_products',
  DELETE_PRODUCTS: 'delete_products',
  VIEW_PRODUCTS: 'view_products',
  
  // Gestión de inventario
  CREATE_INVENTORY: 'create_inventory',
  EDIT_INVENTORY: 'edit_inventory',
  VIEW_INVENTORY: 'view_inventory',
  
  // Gestión de bodegas
  CREATE_WAREHOUSES: 'create_warehouses',
  EDIT_WAREHOUSES: 'edit_warehouses',
  DELETE_WAREHOUSES: 'delete_warehouses',
  VIEW_WAREHOUSES: 'view_warehouses',
  
  // Órdenes de transferencia
  CREATE_TRANSFER_ORDERS: 'create_transfer_orders',
  APPROVE_TRANSFER_ORDERS: 'approve_transfer_orders',
  VIEW_TRANSFER_ORDERS: 'view_transfer_orders',
  
  // Dashboard y reportes
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_REPORTS: 'view_reports',
} as const;

// Roles predefinidos
export const USER_ROLES = {
  ADMIN: 'admin',
  PROJECT_MANAGER: 'project_manager',
  WAREHOUSE_OPERATOR: 'warehouse_operator',
  USER: 'user',
} as const;

// Esquema para crear/editar usuarios
export const userFormSchema = z.object({
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional(),
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  email: z.string().email("Email inválido").optional(),
  role: z.enum([USER_ROLES.ADMIN, USER_ROLES.PROJECT_MANAGER, USER_ROLES.WAREHOUSE_OPERATOR, USER_ROLES.USER]),
  costCenter: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  managedWarehouses: z.array(z.number()).optional(),
  isActive: z.boolean().default(true),
});

// Esquema para asignar permisos
export const assignPermissionsSchema = z.object({
  userId: z.number().min(1, "ID de usuario requerido"),
  permissions: z.array(z.string()),
  managedWarehouses: z.array(z.number()).optional(),
});
