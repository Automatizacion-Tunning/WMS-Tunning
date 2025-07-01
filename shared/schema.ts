import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  sku: varchar("sku", { length: 50 }).notNull().unique(),
  description: text("description"),
  minStock: integer("min_stock").notNull().default(0),
  productType: varchar("product_type", { length: 20 }).notNull().default("tangible"), // 'tangible' or 'intangible'
  requiresSerial: boolean("requires_serial").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  reason: text("reason"),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  inventoryMovements: many(inventoryMovements),
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

export const productsRelations = relations(products, ({ many }) => ({
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
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
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

// Tipo extendido para productos con precio actual
export type ProductWithCurrentPrice = Product & {
  currentPrice?: ProductPrice;
};

// Esquemas de validación para formularios
export const productFormSchema = insertProductSchema.extend({
  currentPrice: z.number().min(0.01, "El precio debe ser mayor a 0"),
});

export const warehouseEntrySchema = z.object({
  productId: z.number().min(1, "Debe seleccionar un producto"),
  warehouseId: z.number().min(1, "Debe seleccionar una bodega"),
  quantity: z.number().min(1, "La cantidad debe ser mayor a 0"),
  serialNumbers: z.array(z.string()).optional(),
  reason: z.string().optional(),
});

export const costCenterFormSchema = z.object({
  costCenter: z.string().min(1, "El centro de costo es requerido"),
  location: z.string().optional(),
});
