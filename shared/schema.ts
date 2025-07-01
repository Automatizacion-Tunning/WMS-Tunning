import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar } from "drizzle-orm/pg-core";
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
  price: decimal("price", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
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
