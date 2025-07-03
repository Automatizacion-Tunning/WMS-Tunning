import { 
  users, warehouses, products, inventory, inventoryMovements, productPrices, productSerials, transferOrders,
  units, categories, brands,
  type User, type InsertUser,
  type Warehouse, type InsertWarehouse,
  type Product, type InsertProduct,
  type Inventory, type InsertInventory,
  type InventoryMovement, type InsertInventoryMovement,
  type ProductPrice, type InsertProductPrice,
  type ProductSerial, type InsertProductSerial,
  type TransferOrder, type InsertTransferOrder,
  type Unit, type InsertUnit,
  type Category, type InsertCategory,
  type Brand, type InsertBrand,
  type InventoryWithDetails, type InventoryMovementWithDetails,
  type ProductWithCurrentPrice, type ProductWithDetails, type TransferOrderWithDetails
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
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByCostCenter(costCenter: string): Promise<User[]>;
  assignPermissions(userId: number, permissions: string[], managedWarehouses?: number[]): Promise<User | undefined>;
  checkUserPermission(userId: number, permission: string): Promise<boolean>;
  getProjectManagers(): Promise<User[]>;
  deleteUser(id: number): Promise<boolean>;

  // Warehouses
  getWarehouse(id: number): Promise<Warehouse | undefined>;
  getAllWarehouses(): Promise<Warehouse[]>;
  createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse>;
  updateWarehouse(id: number, warehouse: Partial<InsertWarehouse>): Promise<Warehouse | undefined>;
  deleteWarehouse(id: number): Promise<boolean>;

  // Products
  getProduct(id: number): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  getProductByBarcode(barcode: string): Promise<Product | undefined>;
  getAllProducts(): Promise<ProductWithCurrentPrice[]>;
  createProduct(product: InsertProduct, currentPrice?: number): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;

  // Product Prices
  getProductPrice(productId: number, year: number, month: number): Promise<ProductPrice | undefined>;
  getCurrentProductPrice(productId: number): Promise<ProductPrice | undefined>;
  setProductPrice(productId: number, year: number, month: number, price: number): Promise<ProductPrice>;
  getProductPriceHistory(productId: number): Promise<ProductPrice[]>;

  // Product Serials
  createProductSerial(serial: InsertProductSerial): Promise<ProductSerial>;
  getProductSerials(productId: number, warehouseId: number): Promise<ProductSerial[]>;
  validateSerialNumber(productId: number, serialNumber: string): Promise<boolean>;
  updateSerialStatus(serialId: number, status: string): Promise<ProductSerial | undefined>;

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

  // Cost Center operations
  createCostCenter(costCenter: string, location?: string): Promise<Warehouse[]>;

  // Transfer Orders operations
  createTransferOrder(order: InsertTransferOrder): Promise<TransferOrder>;
  getTransferOrders(userId?: number, role?: string, costCenter?: string): Promise<TransferOrderWithDetails[]>;
  getTransferOrder(id: number): Promise<TransferOrderWithDetails | undefined>;
  updateTransferOrderStatus(id: number, status: string, projectManagerId?: number): Promise<TransferOrder | undefined>;
  generateOrderNumber(): Promise<string>;
  
  // Principal warehouse operations
  getPrincipalWarehouse(costCenter: string): Promise<Warehouse | undefined>;
  createPrincipalWarehouse(costCenter: string, location?: string): Promise<Warehouse>;

  // Units operations
  getUnit(id: number): Promise<Unit | undefined>;
  getAllUnits(): Promise<Unit[]>;
  createUnit(unit: InsertUnit): Promise<Unit>;
  updateUnit(id: number, unit: Partial<InsertUnit>): Promise<Unit | undefined>;
  deleteUnit(id: number): Promise<boolean>;

  // Categories operations
  getCategory(id: number): Promise<Category | undefined>;
  getAllCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;

  // Brands operations
  getBrand(id: number): Promise<Brand | undefined>;
  getAllBrands(): Promise<Brand[]>;
  createBrand(brand: InsertBrand): Promise<Brand>;
  updateBrand(id: number, brand: Partial<InsertBrand>): Promise<Brand | undefined>;
  deleteBrand(id: number): Promise<boolean>;

  // Enhanced product operations
  getAllProductsWithDetails(): Promise<ProductWithDetails[]>;
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

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users)
      .where(and(eq(users.role, role), eq(users.isActive, true)))
      .orderBy(asc(users.username));
  }

  async getUsersByCostCenter(costCenter: string): Promise<User[]> {
    return await db.select().from(users)
      .where(and(eq(users.costCenter, costCenter), eq(users.isActive, true)))
      .orderBy(asc(users.username));
  }

  async assignPermissions(userId: number, permissions: string[], managedWarehouses?: number[]): Promise<User | undefined> {
    const updateData: any = {
      permissions: permissions,
    };
    
    if (managedWarehouses) {
      updateData.managedWarehouses = managedWarehouses;
    }

    const [user] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async checkUserPermission(userId: number, permission: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.permissions) return false;
    
    // Los admins tienen todos los permisos
    if (user.role === 'admin') return true;
    
    return user.permissions.includes(permission);
  }

  async getProjectManagers(): Promise<User[]> {
    return await db.select().from(users)
      .where(and(eq(users.role, 'project_manager'), eq(users.isActive, true)))
      .orderBy(asc(users.username));
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.update(users)
      .set({ isActive: false })
      .where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
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
    console.log("📦 updateWarehouse ID:", id);
    console.log("📦 updateWarehouse updateData:", JSON.stringify(updateData, null, 2));
    console.log("📦 updateData keys:", Object.keys(updateData));
    console.log("📦 updateData values:", Object.values(updateData));
    
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

  async getProductByBarcode(barcode: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.barcode, barcode));
    return product || undefined;
  }

  async getAllProducts(): Promise<ProductWithCurrentPrice[]> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const result = await db.select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      barcode: products.barcode,
      description: products.description,
      productType: products.productType,
      requiresSerial: products.requiresSerial,
      unitId: products.unitId,
      categoryId: products.categoryId,
      brandId: products.brandId,
      hasWarranty: products.hasWarranty,
      warrantyMonths: products.warrantyMonths,
      minStock: products.minStock,
      maxStock: products.maxStock,
      isActive: products.isActive,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      priceId: productPrices.id,
      priceProductId: productPrices.productId,
      priceYear: productPrices.year,
      priceMonth: productPrices.month,
      price: productPrices.price,
      priceCreatedAt: productPrices.createdAt,
    })
    .from(products)
    .leftJoin(productPrices, and(
      eq(products.id, productPrices.productId),
      eq(productPrices.year, currentYear),
      eq(productPrices.month, currentMonth)
    ))
    .where(eq(products.isActive, true))
    .orderBy(asc(products.name));

    return result.map(row => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      barcode: row.barcode,
      description: row.description,
      productType: row.productType,
      requiresSerial: row.requiresSerial,
      unitId: row.unitId,
      categoryId: row.categoryId,
      brandId: row.brandId,
      hasWarranty: row.hasWarranty,
      warrantyMonths: row.warrantyMonths,
      minStock: row.minStock,
      maxStock: row.maxStock,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      currentPrice: row.priceId ? {
        id: row.priceId,
        productId: row.priceProductId!,
        year: row.priceYear!,
        month: row.priceMonth!,
        price: row.price!,
        createdAt: row.priceCreatedAt!,
      } : undefined,
    }));
  }

  async createProduct(insertProduct: InsertProduct, currentPrice?: number): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct).returning();
    
    // Si se proporciona un precio actual, crearlo
    if (currentPrice !== undefined) {
      const now = new Date();
      await this.setProductPrice(product.id, now.getFullYear(), now.getMonth() + 1, currentPrice);
    }
    
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
      appliedPrice: inventoryMovements.appliedPrice,
      barcodeScanned: inventoryMovements.barcodeScanned,
      reason: inventoryMovements.reason,
      userId: inventoryMovements.userId,
      transferOrderId: inventoryMovements.transferOrderId,
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
      appliedPrice: inventoryMovements.appliedPrice,
      barcodeScanned: inventoryMovements.barcodeScanned,
      reason: inventoryMovements.reason,
      userId: inventoryMovements.userId,
      transferOrderId: inventoryMovements.transferOrderId,
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

    // Para el valor total del inventario, necesitamos usar precios actuales
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    const [inventoryValue] = await db.select({ 
      total: sql<number>`coalesce(sum(${inventory.quantity} * ${productPrices.price}::numeric), 0)` 
    })
    .from(inventory)
    .leftJoin(products, eq(inventory.productId, products.id))
    .leftJoin(productPrices, and(
      eq(productPrices.productId, products.id),
      eq(productPrices.year, currentYear),
      eq(productPrices.month, currentMonth)
    ))
    .where(eq(products.isActive, true));

    return {
      totalProducts: totalProducts.count,
      activeWarehouses: activeWarehouses.count,
      lowStockCount: lowStock.length,
      totalInventoryValue: Number(inventoryValue.total) || 0,
    };
  }

  // Product Prices
  async getProductPrice(productId: number, year: number, month: number): Promise<ProductPrice | undefined> {
    const [price] = await db.select().from(productPrices)
      .where(and(
        eq(productPrices.productId, productId),
        eq(productPrices.year, year),
        eq(productPrices.month, month)
      ));
    return price || undefined;
  }

  async getCurrentProductPrice(productId: number): Promise<ProductPrice | undefined> {
    const now = new Date();
    return await this.getProductPrice(productId, now.getFullYear(), now.getMonth() + 1);
  }

  async setProductPrice(productId: number, year: number, month: number, price: number): Promise<ProductPrice> {
    // Verificar si ya existe un precio para este mes/año
    const existingPrice = await this.getProductPrice(productId, year, month);
    
    if (existingPrice) {
      // Actualizar precio existente
      const [updatedPrice] = await db.update(productPrices)
        .set({ price: price.toString() })
        .where(and(
          eq(productPrices.productId, productId),
          eq(productPrices.year, year),
          eq(productPrices.month, month)
        ))
        .returning();
      return updatedPrice;
    } else {
      // Crear nuevo precio
      const [newPrice] = await db.insert(productPrices)
        .values({
          productId,
          year,
          month,
          price: price.toString(),
        })
        .returning();
      return newPrice;
    }
  }

  async getProductPriceHistory(productId: number): Promise<ProductPrice[]> {
    return await db.select().from(productPrices)
      .where(eq(productPrices.productId, productId))
      .orderBy(desc(productPrices.year), desc(productPrices.month));
  }

  // Product Serials
  async createProductSerial(serial: InsertProductSerial): Promise<ProductSerial> {
    const [newSerial] = await db.insert(productSerials).values(serial).returning();
    return newSerial;
  }

  async getProductSerials(productId: number, warehouseId: number): Promise<ProductSerial[]> {
    return await db.select().from(productSerials)
      .where(and(
        eq(productSerials.productId, productId),
        eq(productSerials.warehouseId, warehouseId),
        eq(productSerials.status, 'active')
      ))
      .orderBy(asc(productSerials.createdAt));
  }

  async validateSerialNumber(productId: number, serialNumber: string): Promise<boolean> {
    const [existing] = await db.select().from(productSerials)
      .where(and(
        eq(productSerials.productId, productId),
        eq(productSerials.serialNumber, serialNumber)
      ));
    return !existing; // Retorna true si NO existe (es válido)
  }

  async updateSerialStatus(serialId: number, status: string): Promise<ProductSerial | undefined> {
    const [updatedSerial] = await db.update(productSerials)
      .set({ status })
      .where(eq(productSerials.id, serialId))
      .returning();
    return updatedSerial || undefined;
  }

  async createCostCenter(costCenter: string, location?: string): Promise<Warehouse[]> {
    try {
      // Create main warehouse
      const [mainWarehouse] = await db
        .insert(warehouses)
        .values({
          name: `Bodega Principal ${costCenter}`,
          location: location || `Ubicación Central ${costCenter}`,
          costCenter: costCenter,
          parentWarehouseId: null,
          warehouseType: 'main',
          subWarehouseType: null,
          isActive: true,
        })
        .returning();

      // Create sub-warehouses
      const subWarehouseTypes = ['um2', 'plataforma', 'pem', 'integrador'];
      const subWarehouseNames = ['UM2', 'Plataforma', 'PEM', 'Integrador'];
      
      const subWarehouses = await db
        .insert(warehouses)
        .values(
          subWarehouseTypes.map((type, index) => ({
            name: `Bodega ${subWarehouseNames[index]} ${costCenter}`,
            location: `Área ${subWarehouseNames[index]} - ${costCenter}`,
            costCenter: costCenter,
            parentWarehouseId: mainWarehouse.id,
            warehouseType: 'sub',
            subWarehouseType: type,
            isActive: true,
          }))
        )
        .returning();

      return [mainWarehouse, ...subWarehouses];
    } catch (error) {
      throw new Error(`Failed to create cost center: ${error}`);
    }
  }

  // Transfer Orders operations
  async createTransferOrder(order: InsertTransferOrder): Promise<TransferOrder> {
    const [newOrder] = await db.insert(transferOrders).values(order).returning();
    return newOrder;
  }

  async getTransferOrders(userId?: number, role?: string, costCenter?: string): Promise<TransferOrderWithDetails[]> {
    // Basic implementation to get app running
    const orders = await db.select().from(transferOrders).orderBy(desc(transferOrders.createdAt));
    
    // Create mock data structure for now
    return orders.map(order => ({
      ...order,
      product: { id: 1, name: "Mock Product", sku: "MOCK-001", barcode: null, description: null, minStock: 10, productType: "PHYSICAL", requiresSerial: false, isActive: true, createdAt: new Date() },
      sourceWarehouse: { id: 1, name: "Mock Warehouse", location: "Mock Location", costCenter: "PRINCIPAL", parentWarehouseId: null, warehouseType: "PRINCIPAL", subWarehouseType: null, isActive: true, createdAt: new Date() },
      destinationWarehouse: { id: 1, name: "Mock Warehouse", location: "Mock Location", costCenter: "PRINCIPAL", parentWarehouseId: null, warehouseType: "PRINCIPAL", subWarehouseType: null, isActive: true, createdAt: new Date() },
      requester: { id: 1, username: "mock_user", password: "", role: "user", isActive: true, createdAt: new Date() },
      projectManager: undefined
    })) as TransferOrderWithDetails[];
  }

  async getTransferOrder(id: number): Promise<TransferOrderWithDetails | undefined> {
    const [result] = await db.select().from(transferOrders).where(eq(transferOrders.id, id));

    if (!result) return undefined;

    return {
      ...result,
      product: { id: 1, name: "Mock Product", sku: "MOCK-001", barcode: null, description: null, minStock: 10, productType: "PHYSICAL", requiresSerial: false, isActive: true, createdAt: new Date() },
      sourceWarehouse: { id: 1, name: "Mock Warehouse", location: "Mock Location", costCenter: "PRINCIPAL", parentWarehouseId: null, warehouseType: "PRINCIPAL", subWarehouseType: null, isActive: true, createdAt: new Date() },
      destinationWarehouse: { id: 1, name: "Mock Warehouse", location: "Mock Location", costCenter: "PRINCIPAL", parentWarehouseId: null, warehouseType: "PRINCIPAL", subWarehouseType: null, isActive: true, createdAt: new Date() },
      requester: { id: 1, username: "mock_user", password: "", role: "user", isActive: true, createdAt: new Date() },
      projectManager: undefined
    } as TransferOrderWithDetails;
  }

  async updateTransferOrderStatus(id: number, status: string, projectManagerId?: number): Promise<TransferOrder | undefined> {
    const [updatedOrder] = await db.update(transferOrders)
      .set({ 
        status,
        projectManagerId,
        updatedAt: new Date()
      })
      .where(eq(transferOrders.id, id))
      .returning();

    // If approved, execute the transfer
    if (status === 'approved' && updatedOrder) {
      const order = await this.getTransferOrder(id);
      if (order) {
        // Create inventory movements for the transfer
        await this.createInventoryMovement({
          productId: order.productId,
          warehouseId: order.sourceWarehouseId,
          movementType: 'out',
          quantity: order.quantity,
          transferOrderId: id,
          reason: `Traspaso salida - Orden ${order.orderNumber}`,
          userId: projectManagerId || 1,
        });

        await this.createInventoryMovement({
          productId: order.productId,
          warehouseId: order.destinationWarehouseId,
          movementType: 'in',
          quantity: order.quantity,
          transferOrderId: id,
          reason: `Traspaso entrada - Orden ${order.orderNumber}`,
          userId: projectManagerId || 1,
        });

        // Update inventory quantities
        await this.updateInventory(order.productId, order.sourceWarehouseId, -order.quantity);
        await this.updateInventory(order.productId, order.destinationWarehouseId, order.quantity);
      }
    }

    return updatedOrder || undefined;
  }

  async generateOrderNumber(): Promise<string> {
    // Get the latest order number for today
    const today = new Date().toISOString().split('T')[0];
    const [latestOrder] = await db.select({ orderNumber: transferOrders.orderNumber })
      .from(transferOrders)
      .where(sql`DATE(${transferOrders.createdAt}) = ${today}`)
      .orderBy(desc(transferOrders.id))
      .limit(1);

    if (latestOrder) {
      const currentNumber = parseInt(latestOrder.orderNumber.split('-')[1]);
      return `OT-${(currentNumber + 1).toString().padStart(3, '0')}`;
    }

    return 'OT-001';
  }

  // Principal warehouse operations
  async getPrincipalWarehouse(costCenter: string): Promise<Warehouse | undefined> {
    const [warehouse] = await db.select().from(warehouses)
      .where(and(
        eq(warehouses.costCenter, costCenter),
        eq(warehouses.warehouseType, 'main')
      ));
    return warehouse || undefined;
  }

  async createPrincipalWarehouse(costCenter: string, location?: string): Promise<Warehouse> {
    const [newWarehouse] = await db.insert(warehouses)
      .values({
        name: `Bodega Principal ${costCenter}`,
        location: location || `Ubicación Central ${costCenter}`,
        costCenter,
        parentWarehouseId: null,
        warehouseType: 'main',
        subWarehouseType: null,
        isActive: true,
      })
      .returning();
    return newWarehouse;
  }

  // Units operations
  async getUnit(id: number): Promise<Unit | undefined> {
    const [unit] = await db.select().from(units).where(eq(units.id, id));
    return unit || undefined;
  }

  async getAllUnits(): Promise<Unit[]> {
    return await db.select().from(units).where(eq(units.isActive, true)).orderBy(asc(units.name));
  }

  async createUnit(insertUnit: InsertUnit): Promise<Unit> {
    const [unit] = await db.insert(units).values(insertUnit).returning();
    return unit;
  }

  async updateUnit(id: number, updateData: Partial<InsertUnit>): Promise<Unit | undefined> {
    const [unit] = await db.update(units)
      .set(updateData)
      .where(eq(units.id, id))
      .returning();
    return unit || undefined;
  }

  async deleteUnit(id: number): Promise<boolean> {
    const result = await db.update(units)
      .set({ isActive: false })
      .where(eq(units.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Categories operations
  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async getAllCategories(): Promise<Category[]> {
    return await db.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.name));
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(insertCategory).returning();
    return category;
  }

  async updateCategory(id: number, updateData: Partial<InsertCategory>): Promise<Category | undefined> {
    const [category] = await db.update(categories)
      .set(updateData)
      .where(eq(categories.id, id))
      .returning();
    return category || undefined;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const result = await db.update(categories)
      .set({ isActive: false })
      .where(eq(categories.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Brands operations
  async getBrand(id: number): Promise<Brand | undefined> {
    const [brand] = await db.select().from(brands).where(eq(brands.id, id));
    return brand || undefined;
  }

  async getAllBrands(): Promise<Brand[]> {
    return await db.select().from(brands).where(eq(brands.isActive, true)).orderBy(asc(brands.name));
  }

  async createBrand(insertBrand: InsertBrand): Promise<Brand> {
    const [brand] = await db.insert(brands).values(insertBrand).returning();
    return brand;
  }

  async updateBrand(id: number, updateData: Partial<InsertBrand>): Promise<Brand | undefined> {
    const [brand] = await db.update(brands)
      .set(updateData)
      .where(eq(brands.id, id))
      .returning();
    return brand || undefined;
  }

  async deleteBrand(id: number): Promise<boolean> {
    const result = await db.update(brands)
      .set({ isActive: false })
      .where(eq(brands.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Enhanced product operations
  async getAllProductsWithDetails(): Promise<ProductWithDetails[]> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const result = await db.select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      barcode: products.barcode,
      description: products.description,
      productType: products.productType,
      requiresSerial: products.requiresSerial,
      unitId: products.unitId,
      categoryId: products.categoryId,
      brandId: products.brandId,
      hasWarranty: products.hasWarranty,
      warrantyMonths: products.warrantyMonths,
      minStock: products.minStock,
      maxStock: products.maxStock,
      isActive: products.isActive,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      unit: units,
      category: categories,
      brand: brands,
      priceId: productPrices.id,
      priceProductId: productPrices.productId,
      priceYear: productPrices.year,
      priceMonth: productPrices.month,
      price: productPrices.price,
      priceCreatedAt: productPrices.createdAt,
    })
    .from(products)
    .innerJoin(units, eq(products.unitId, units.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .innerJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(productPrices, and(
      eq(products.id, productPrices.productId),
      eq(productPrices.year, currentYear),
      eq(productPrices.month, currentMonth)
    ))
    .where(eq(products.isActive, true))
    .orderBy(asc(products.name));

    return result.map(row => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      barcode: row.barcode,
      description: row.description,
      productType: row.productType,
      requiresSerial: row.requiresSerial,
      unitId: row.unitId,
      categoryId: row.categoryId,
      brandId: row.brandId,
      hasWarranty: row.hasWarranty,
      warrantyMonths: row.warrantyMonths,
      minStock: row.minStock,
      maxStock: row.maxStock,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      unit: row.unit,
      category: row.category,
      brand: row.brand,
      currentPrice: row.priceId ? {
        id: row.priceId,
        productId: row.priceProductId!,
        year: row.priceYear!,
        month: row.priceMonth!,
        price: row.price!,
        createdAt: row.priceCreatedAt!,
      } : undefined,
    }));
  }
}

export const storage = new DatabaseStorage();
