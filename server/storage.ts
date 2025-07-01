import { 
  users, warehouses, products, inventory, inventoryMovements,
  type User, type InsertUser,
  type Warehouse, type InsertWarehouse,
  type Product, type InsertProduct,
  type Inventory, type InsertInventory,
  type InventoryMovement, type InsertInventoryMovement,
  type InventoryWithDetails, type InventoryMovementWithDetails
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  // Warehouses
  getWarehouse(id: number): Promise<Warehouse | undefined>;
  getAllWarehouses(): Promise<Warehouse[]>;
  createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse>;
  updateWarehouse(id: number, warehouse: Partial<InsertWarehouse>): Promise<Warehouse | undefined>;
  deleteWarehouse(id: number): Promise<boolean>;

  // Products
  getProduct(id: number): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  getAllProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;

  // Inventory
  getInventory(productId: number, warehouseId: number): Promise<Inventory | undefined>;
  getInventoryByWarehouse(warehouseId: number): Promise<InventoryWithDetails[]>;
  getInventoryByProduct(productId: number): Promise<InventoryWithDetails[]>;
  getAllInventory(): Promise<InventoryWithDetails[]>;
  updateInventory(productId: number, warehouseId: number, quantity: number): Promise<Inventory>;
  getLowStockItems(): Promise<InventoryWithDetails[]>;

  // Inventory Movements
  createInventoryMovement(movement: InsertInventoryMovement): Promise<InventoryMovement>;
  getInventoryMovements(limit?: number): Promise<InventoryMovementWithDetails[]>;
  getInventoryMovementsByProduct(productId: number): Promise<InventoryMovementWithDetails[]>;

  // Dashboard metrics
  getDashboardMetrics(): Promise<{
    totalProducts: number;
    activeWarehouses: number;
    lowStockCount: number;
    totalInventoryValue: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.username));
  }

  // Warehouses
  async getWarehouse(id: number): Promise<Warehouse | undefined> {
    const [warehouse] = await db.select().from(warehouses).where(eq(warehouses.id, id));
    return warehouse || undefined;
  }

  async getAllWarehouses(): Promise<Warehouse[]> {
    return await db.select().from(warehouses)
      .where(eq(warehouses.isActive, true))
      .orderBy(asc(warehouses.name));
  }

  async createWarehouse(insertWarehouse: InsertWarehouse): Promise<Warehouse> {
    const [warehouse] = await db.insert(warehouses).values(insertWarehouse).returning();
    return warehouse;
  }

  async updateWarehouse(id: number, updateData: Partial<InsertWarehouse>): Promise<Warehouse | undefined> {
    const [warehouse] = await db.update(warehouses)
      .set(updateData)
      .where(eq(warehouses.id, id))
      .returning();
    return warehouse || undefined;
  }

  async deleteWarehouse(id: number): Promise<boolean> {
    const result = await db.update(warehouses)
      .set({ isActive: false })
      .where(eq(warehouses.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Products
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.sku, sku));
    return product || undefined;
  }

  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(products)
      .where(eq(products.isActive, true))
      .orderBy(asc(products.name));
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct).returning();
    return product;
  }

  async updateProduct(id: number, updateData: Partial<InsertProduct>): Promise<Product | undefined> {
    const [product] = await db.update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();
    return product || undefined;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.update(products)
      .set({ isActive: false })
      .where(eq(products.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Inventory
  async getInventory(productId: number, warehouseId: number): Promise<Inventory | undefined> {
    const [inventoryItem] = await db.select().from(inventory)
      .where(and(eq(inventory.productId, productId), eq(inventory.warehouseId, warehouseId)));
    return inventoryItem || undefined;
  }

  async getInventoryByWarehouse(warehouseId: number): Promise<InventoryWithDetails[]> {
    return await db.select({
      id: inventory.id,
      productId: inventory.productId,
      warehouseId: inventory.warehouseId,
      quantity: inventory.quantity,
      updatedAt: inventory.updatedAt,
      product: products,
      warehouse: warehouses,
    })
    .from(inventory)
    .innerJoin(products, eq(inventory.productId, products.id))
    .innerJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
    .where(eq(inventory.warehouseId, warehouseId));
  }

  async getInventoryByProduct(productId: number): Promise<InventoryWithDetails[]> {
    return await db.select({
      id: inventory.id,
      productId: inventory.productId,
      warehouseId: inventory.warehouseId,
      quantity: inventory.quantity,
      updatedAt: inventory.updatedAt,
      product: products,
      warehouse: warehouses,
    })
    .from(inventory)
    .innerJoin(products, eq(inventory.productId, products.id))
    .innerJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
    .where(eq(inventory.productId, productId));
  }

  async getAllInventory(): Promise<InventoryWithDetails[]> {
    return await db.select({
      id: inventory.id,
      productId: inventory.productId,
      warehouseId: inventory.warehouseId,
      quantity: inventory.quantity,
      updatedAt: inventory.updatedAt,
      product: products,
      warehouse: warehouses,
    })
    .from(inventory)
    .innerJoin(products, eq(inventory.productId, products.id))
    .innerJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
    .orderBy(desc(inventory.updatedAt));
  }

  async updateInventory(productId: number, warehouseId: number, quantity: number): Promise<Inventory> {
    const existing = await this.getInventory(productId, warehouseId);
    
    if (existing) {
      const [updated] = await db.update(inventory)
        .set({ quantity, updatedAt: new Date() })
        .where(and(eq(inventory.productId, productId), eq(inventory.warehouseId, warehouseId)))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(inventory)
        .values({ productId, warehouseId, quantity })
        .returning();
      return created;
    }
  }

  async getLowStockItems(): Promise<InventoryWithDetails[]> {
    return await db.select({
      id: inventory.id,
      productId: inventory.productId,
      warehouseId: inventory.warehouseId,
      quantity: inventory.quantity,
      updatedAt: inventory.updatedAt,
      product: products,
      warehouse: warehouses,
    })
    .from(inventory)
    .innerJoin(products, eq(inventory.productId, products.id))
    .innerJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
    .where(sql`${inventory.quantity} <= ${products.minStock}`);
  }

  // Inventory Movements
  async createInventoryMovement(movement: InsertInventoryMovement): Promise<InventoryMovement> {
    const [created] = await db.insert(inventoryMovements).values(movement).returning();
    
    // Update inventory quantity
    const currentInventory = await this.getInventory(movement.productId, movement.warehouseId);
    const currentQuantity = currentInventory?.quantity || 0;
    const newQuantity = movement.movementType === 'in' 
      ? currentQuantity + movement.quantity 
      : currentQuantity - movement.quantity;
    
    await this.updateInventory(movement.productId, movement.warehouseId, Math.max(0, newQuantity));
    
    return created;
  }

  async getInventoryMovements(limit: number = 50): Promise<InventoryMovementWithDetails[]> {
    return await db.select({
      id: inventoryMovements.id,
      productId: inventoryMovements.productId,
      warehouseId: inventoryMovements.warehouseId,
      movementType: inventoryMovements.movementType,
      quantity: inventoryMovements.quantity,
      reason: inventoryMovements.reason,
      userId: inventoryMovements.userId,
      createdAt: inventoryMovements.createdAt,
      product: products,
      warehouse: warehouses,
      user: users,
    })
    .from(inventoryMovements)
    .innerJoin(products, eq(inventoryMovements.productId, products.id))
    .innerJoin(warehouses, eq(inventoryMovements.warehouseId, warehouses.id))
    .innerJoin(users, eq(inventoryMovements.userId, users.id))
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(limit);
  }

  async getInventoryMovementsByProduct(productId: number): Promise<InventoryMovementWithDetails[]> {
    return await db.select({
      id: inventoryMovements.id,
      productId: inventoryMovements.productId,
      warehouseId: inventoryMovements.warehouseId,
      movementType: inventoryMovements.movementType,
      quantity: inventoryMovements.quantity,
      reason: inventoryMovements.reason,
      userId: inventoryMovements.userId,
      createdAt: inventoryMovements.createdAt,
      product: products,
      warehouse: warehouses,
      user: users,
    })
    .from(inventoryMovements)
    .innerJoin(products, eq(inventoryMovements.productId, products.id))
    .innerJoin(warehouses, eq(inventoryMovements.warehouseId, warehouses.id))
    .innerJoin(users, eq(inventoryMovements.userId, users.id))
    .where(eq(inventoryMovements.productId, productId))
    .orderBy(desc(inventoryMovements.createdAt));
  }

  async getDashboardMetrics() {
    const [totalProducts] = await db.select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.isActive, true));

    const [activeWarehouses] = await db.select({ count: sql<number>`count(*)` })
      .from(warehouses)
      .where(eq(warehouses.isActive, true));

    const lowStock = await this.getLowStockItems();

    const [inventoryValue] = await db.select({ 
      total: sql<number>`coalesce(sum(${inventory.quantity} * ${products.price}), 0)` 
    })
    .from(inventory)
    .leftJoin(products, eq(inventory.productId, products.id))
    .where(eq(products.isActive, true));

    return {
      totalProducts: totalProducts.count,
      activeWarehouses: activeWarehouses.count,
      lowStockCount: lowStock.length,
      totalInventoryValue: Number(inventoryValue.total) || 0,
    };
  }
}

export const storage = new DatabaseStorage();
