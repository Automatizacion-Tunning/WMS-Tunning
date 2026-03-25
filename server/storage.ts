import {
  users, warehouses, products, inventory, inventoryMovements, productPrices, productSerials, transferOrders,
  units, categories, brands, purchaseOrderReceipts,
  roles, permissions, rolePermissions,
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
  type PurchaseOrderReceipt,
  type InventoryWithDetails, type InventoryMovementWithDetails,
  type ProductWithCurrentPrice, type ProductWithDetails, type TransferOrderWithDetails,
  type Role, type InsertRole, type Permission, type RoleWithPermissions,
  type DashboardOcStatus, type DashboardWarehouseDistribution
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, inArray, count } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByFicha(ficha: string): Promise<User | undefined>;
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

  // Inventory Movements
  createInventoryMovement(movement: InsertInventoryMovement): Promise<InventoryMovement>;
  getInventoryMovements(limit?: number): Promise<InventoryMovementWithDetails[]>;
  getInventoryMovementsByProduct(productId: number): Promise<InventoryMovementWithDetails[]>;

  // Dashboard metrics
  getDashboardMetrics(): Promise<{
    totalProducts: number;
    activeWarehouses: number;
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

  // Purchase Order Receipt tracking
  getReceiptsByOC(purchaseOrderNumber: string): Promise<PurchaseOrderReceipt[]>;
  getOrCreateReceipt(purchaseOrderNumber: string, line: number, ocLine: any): Promise<PurchaseOrderReceipt>;
  updateReceiptQuantity(id: number, newQuantity: number, productId: number, movementId: number): Promise<PurchaseOrderReceipt>;
  getProductByErpCode(erpCode: string): Promise<Product | undefined>;

  // RBAC - Roles
  getAllRoles(): Promise<Role[]>;
  getRoleById(id: number): Promise<RoleWithPermissions | undefined>;
  getRoleByCode(code: string): Promise<Role | undefined>;
  createRole(data: Omit<InsertRole, "isSystem">): Promise<Role>;
  updateRole(id: number, data: { name?: string; description?: string; hierarchy?: number }): Promise<Role | undefined>;
  deleteRole(id: number): Promise<boolean>;

  // RBAC - Permissions
  getRolePermissions(roleId: number): Promise<string[]>;
  updateRolePermissions(roleId: number, permissionKeys: string[]): Promise<void>;
  getAllPermissions(): Promise<Permission[]>;

  // RBAC - User-Role
  getUsersCountByRole(roleCode: string): Promise<number>;
  assignUserRole(userId: number, roleCode: string): Promise<User | undefined>;

  // Dashboard Charts
  getCostCentersByWarehouses(warehouseIds: number[]): Promise<string[]>;
  getAllActiveCostCenters(): Promise<string[]>;
  getDashboardOcStatus(costCenters?: string[]): Promise<DashboardOcStatus[]>;
  getDashboardWarehouseDistribution(costCenters?: string[]): Promise<DashboardWarehouseDistribution[]>;
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

  async getUserByFicha(ficha: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.ficha, ficha));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users)
      .where(eq(users.isActive, true))
      .orderBy(asc(users.username));
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
      erpProductCode: products.erpProductCode,
      hasWarranty: products.hasWarranty,
      warrantyMonths: products.warrantyMonths,

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
      erpProductCode: row.erpProductCode,
      unitId: row.unitId,
      categoryId: row.categoryId,
      brandId: row.brandId,
      hasWarranty: row.hasWarranty,
      warrantyMonths: row.warrantyMonths,

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
      .set({ ...updateData, updatedAt: new Date() })
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



  // Inventory Movements
  async createInventoryMovement(movement: InsertInventoryMovement): Promise<InventoryMovement> {
    // Validate sufficient stock for outbound movements
    const currentInventory = await this.getInventory(movement.productId, movement.warehouseId);
    const currentQuantity = currentInventory?.quantity || 0;

    if (movement.movementType === 'out' && currentQuantity < movement.quantity) {
      throw new Error(`Stock insuficiente: disponible ${currentQuantity}, solicitado ${movement.quantity}`);
    }

    const [created] = await db.insert(inventoryMovements).values(movement).returning();

    // Update inventory quantity
    const newQuantity = movement.movementType === 'in'
      ? currentQuantity + movement.quantity
      : currentQuantity - movement.quantity;

    await this.updateInventory(movement.productId, movement.warehouseId, newQuantity);

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
      purchaseOrderNumber: inventoryMovements.purchaseOrderNumber,
      purchaseOrderLine: inventoryMovements.purchaseOrderLine,
      purchaseOrderCodprod: inventoryMovements.purchaseOrderCodprod,
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
      purchaseOrderNumber: inventoryMovements.purchaseOrderNumber,
      purchaseOrderLine: inventoryMovements.purchaseOrderLine,
      purchaseOrderCodprod: inventoryMovements.purchaseOrderCodprod,
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
    const [newSerial] = await db.insert(productSerials)
      .values({ ...serial, serialNumber: serial.serialNumber.trim() })
      .returning();
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
    const trimmed = serialNumber.trim();
    const [existing] = await db.select().from(productSerials)
      .where(and(
        eq(productSerials.productId, productId),
        eq(productSerials.serialNumber, trimmed)
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
    const results = await db
      .select()
      .from(transferOrders)
      .orderBy(desc(transferOrders.createdAt));

    // Enrich with real data
    const enriched = await Promise.all(results.map(async (order) => {
      const product = await this.getProduct(order.productId);
      const sourceWarehouse = await this.getWarehouse(order.sourceWarehouseId);
      const destinationWarehouse = await this.getWarehouse(order.destinationWarehouseId);
      const requester = await this.getUser(order.requesterId);

      return {
        ...order,
        product: product || { id: order.productId, name: 'Producto no encontrado' },
        sourceWarehouse: sourceWarehouse || { id: order.sourceWarehouseId, name: 'Bodega no encontrada' },
        destinationWarehouse: destinationWarehouse || { id: order.destinationWarehouseId, name: 'Bodega no encontrada' },
        requester: requester ? { id: requester.id, username: requester.username, firstName: requester.firstName, lastName: requester.lastName } : { id: order.requesterId, username: 'Usuario no encontrado' },
      };
    }));

    return enriched as TransferOrderWithDetails[];
  }

  async getTransferOrder(id: number): Promise<TransferOrderWithDetails | undefined> {
    const [result] = await db.select().from(transferOrders).where(eq(transferOrders.id, id));

    if (!result) return undefined;

    const product = await this.getProduct(result.productId);
    const sourceWarehouse = await this.getWarehouse(result.sourceWarehouseId);
    const destinationWarehouse = await this.getWarehouse(result.destinationWarehouseId);
    const requester = await this.getUser(result.requesterId);

    return {
      ...result,
      product: product || { id: result.productId, name: 'Producto no encontrado' },
      sourceWarehouse: sourceWarehouse || { id: result.sourceWarehouseId, name: 'Bodega no encontrada' },
      destinationWarehouse: destinationWarehouse || { id: result.destinationWarehouseId, name: 'Bodega no encontrada' },
      requester: requester ? { id: requester.id, username: requester.username, firstName: requester.firstName, lastName: requester.lastName } : { id: result.requesterId, username: 'Usuario no encontrado' },
    } as TransferOrderWithDetails;
  }

  async updateTransferOrderStatus(id: number, status: string, projectManagerId?: number): Promise<TransferOrder | undefined> {
    // If approved, execute the transfer with error recovery
    if (status === 'approved') {
      const [updatedOrder] = await db.update(transferOrders)
        .set({
          status,
          projectManagerId,
          updatedAt: new Date()
        })
        .where(eq(transferOrders.id, id))
        .returning();

      if (updatedOrder) {
        const order = await this.getTransferOrder(id);
        if (order) {
          try {
            // Create OUT movement from source
            await this.createInventoryMovement({
              productId: order.productId,
              warehouseId: order.sourceWarehouseId,
              movementType: 'out',
              quantity: order.quantity,
              transferOrderId: id,
              reason: `Traspaso salida - Orden ${order.orderNumber}`,
              userId: projectManagerId || 1,
            });

            // Create IN movement to destination
            await this.createInventoryMovement({
              productId: order.productId,
              warehouseId: order.destinationWarehouseId,
              movementType: 'in',
              quantity: order.quantity,
              transferOrderId: id,
              reason: `Traspaso entrada - Orden ${order.orderNumber}`,
              userId: projectManagerId || 1,
            });

            // Update serial numbers to new warehouse
            await db.update(productSerials)
              .set({ warehouseId: order.destinationWarehouseId })
              .where(
                and(
                  eq(productSerials.productId, order.productId),
                  eq(productSerials.warehouseId, order.sourceWarehouseId),
                  eq(productSerials.status, 'active')
                )
              );
          } catch (error) {
            // Revert status on failure
            await db.update(transferOrders)
              .set({ status: 'pending', updatedAt: new Date() })
              .where(eq(transferOrders.id, id));
            throw error;
          }
        }
      }

      return updatedOrder || undefined;
    }

    // Non-approved status updates (rejected, cancelled, etc.)
    const [updatedOrder] = await db.update(transferOrders)
      .set({
        status,
        projectManagerId,
        updatedAt: new Date()
      })
      .where(eq(transferOrders.id, id))
      .returning();

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
      const lastNum = latestOrder.orderNumber
        ? parseInt(latestOrder.orderNumber.split('-')[1]) || 0
        : 0;
      return `OT-${(lastNum + 1).toString().padStart(3, '0')}`;
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
    const productsUsingUnit = await db.select({ count: count() })
      .from(products)
      .where(and(eq(products.unitId, id), eq(products.isActive, true)));
    if (productsUsingUnit[0].count > 0) {
      throw new Error("No se puede eliminar: hay productos activos usando esta unidad");
    }
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
    const productsUsingCategory = await db.select({ count: count() })
      .from(products)
      .where(and(eq(products.categoryId, id), eq(products.isActive, true)));
    if (productsUsingCategory[0].count > 0) {
      throw new Error("No se puede eliminar: hay productos activos usando esta categoría");
    }
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
    const productsUsingBrand = await db.select({ count: count() })
      .from(products)
      .where(and(eq(products.brandId, id), eq(products.isActive, true)));
    if (productsUsingBrand[0].count > 0) {
      throw new Error("No se puede eliminar: hay productos activos usando esta marca");
    }
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
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      unit: row.unit,
      category: row.category,
      brand: row.brand,
      currentPrice: row.price ? row.price : null,
    }));
  }

  // Purchase Order Receipt tracking
  async getReceiptsByOC(purchaseOrderNumber: string): Promise<PurchaseOrderReceipt[]> {
    return await db.select().from(purchaseOrderReceipts)
      .where(eq(purchaseOrderReceipts.purchaseOrderNumber, purchaseOrderNumber));
  }

  async getOrCreateReceipt(purchaseOrderNumber: string, line: number, ocLine: any): Promise<PurchaseOrderReceipt> {
    const [existing] = await db.select().from(purchaseOrderReceipts)
      .where(and(
        eq(purchaseOrderReceipts.purchaseOrderNumber, purchaseOrderNumber),
        eq(purchaseOrderReceipts.purchaseOrderLine, line)
      ));

    if (existing) return existing;

    // Calcular precio unitario: subtotalmb / cantidad
    const cantidad = parseFloat(ocLine.cantidad || "0");
    const subtotal = parseFloat(ocLine.subtotalmb || "0");
    const unitPrice = cantidad > 0 ? subtotal / cantidad : 0;

    const [created] = await db.insert(purchaseOrderReceipts).values({
      purchaseOrderNumber,
      purchaseOrderLine: line,
      codprod: ocLine.codprod,
      orderedQuantity: ocLine.cantidad || "0",
      receivedQuantity: "0",
      unitPrice: unitPrice.toFixed(2),
      costCenter: ocLine.codicc,
    }).returning();

    return created;
  }

  async updateReceiptQuantity(id: number, newQuantity: number, productId: number, movementId: number): Promise<PurchaseOrderReceipt> {
    const [updated] = await db.update(purchaseOrderReceipts)
      .set({
        receivedQuantity: newQuantity.toString(),
        productId,
        lastMovementId: movementId,
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrderReceipts.id, id))
      .returning();
    return updated;
  }

  async getProductByErpCode(erpCode: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products)
      .where(eq(products.erpProductCode, erpCode));
    return product || undefined;
  }

  // =====================
  // RBAC - Roles
  // =====================

  async getAllRoles(): Promise<Role[]> {
    return await db.select().from(roles)
      .where(eq(roles.isActive, true))
      .orderBy(desc(roles.hierarchy));
  }

  async getRoleById(id: number): Promise<RoleWithPermissions | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    if (!role) return undefined;

    const perms = await db.select({
      id: permissions.id,
      key: permissions.key,
      name: permissions.name,
      module: permissions.module,
      category: permissions.category,
      createdAt: permissions.createdAt,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, id));

    return { ...role, permissions: perms };
  }

  async getRoleByCode(code: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.code, code));
    return role || undefined;
  }

  async createRole(data: Omit<InsertRole, "isSystem">): Promise<Role> {
    const [role] = await db.insert(roles).values({
      ...data,
      isSystem: false,
    }).returning();
    return role;
  }

  async updateRole(id: number, data: { name?: string; description?: string; hierarchy?: number }): Promise<Role | undefined> {
    const [role] = await db.update(roles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(roles.id, id))
      .returning();
    return role || undefined;
  }

  async deleteRole(id: number): Promise<boolean> {
    // Check if role is a system role
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    if (!role) return false;
    if (role.isSystem) {
      throw new Error("No se puede eliminar un rol de sistema");
    }

    // Check if any users are using this role
    const [usersWithRole] = await db.select({ value: count() }).from(users)
      .where(eq(users.role, role.code));
    if (usersWithRole.value > 0) {
      throw new Error("No se puede eliminar un rol asignado a usuarios");
    }

    // Delete associated permissions first, then the role
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
    const result = await db.delete(roles).where(eq(roles.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // =====================
  // RBAC - Permissions
  // =====================

  async getRolePermissions(roleId: number): Promise<string[]> {
    const perms = await db.select({
      key: permissions.key,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId));

    return perms.map((p) => p.key);
  }

  async updateRolePermissions(roleId: number, permissionKeys: string[]): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete all existing permissions for this role
      await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

      if (permissionKeys.length > 0) {
        // Find permission IDs by keys
        const perms = await tx.select().from(permissions)
          .where(inArray(permissions.key, permissionKeys));

        if (perms.length > 0) {
          // Insert new role-permission associations
          await tx.insert(rolePermissions).values(
            perms.map((p) => ({
              roleId,
              permissionId: p.id,
            }))
          );
        }
      }
    });
  }

  async getAllPermissions(): Promise<Permission[]> {
    return await db.select().from(permissions)
      .orderBy(asc(permissions.category), asc(permissions.module));
  }

  // =====================
  // RBAC - User-Role
  // =====================

  async getUsersCountByRole(roleCode: string): Promise<number> {
    const [result] = await db.select({ value: count() }).from(users)
      .where(and(eq(users.role, roleCode), eq(users.isActive, true)));
    return result.value;
  }

  async assignUserRole(userId: number, roleCode: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ role: roleCode, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  // =====================
  // Dashboard Charts
  // =====================

  async getCostCentersByWarehouses(warehouseIds: number[]): Promise<string[]> {
    if (!warehouseIds.length) return [];
    const results = await db.selectDistinct({ costCenter: warehouses.costCenter })
      .from(warehouses)
      .where(inArray(warehouses.id, warehouseIds));
    return results.map(r => r.costCenter).filter(Boolean);
  }

  async getAllActiveCostCenters(): Promise<string[]> {
    const results = await db.selectDistinct({ costCenter: warehouses.costCenter })
      .from(warehouses)
      .where(eq(warehouses.isActive, true))
      .orderBy(asc(warehouses.costCenter));
    return results.map(r => r.costCenter).filter(Boolean);
  }

  async getDashboardOcStatus(costCenters?: string[]): Promise<DashboardOcStatus[]> {
    const conditions = costCenters?.length
      ? [inArray(purchaseOrderReceipts.costCenter, costCenters)]
      : [];

    const results = await db.select({
      costCenter: purchaseOrderReceipts.costCenter,
      totalOrdered: sql<number>`coalesce(sum(${purchaseOrderReceipts.orderedQuantity}::numeric), 0)`,
      totalReceived: sql<number>`coalesce(sum(${purchaseOrderReceipts.receivedQuantity}::numeric), 0)`,
      totalPending: sql<number>`coalesce(sum(${purchaseOrderReceipts.orderedQuantity}::numeric - ${purchaseOrderReceipts.receivedQuantity}::numeric), 0)`,
      lineCount: sql<number>`count(distinct ${purchaseOrderReceipts.id})`,
    })
    .from(purchaseOrderReceipts)
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(purchaseOrderReceipts.costCenter);

    return results.map(r => ({
      costCenter: r.costCenter || 'Sin CC',
      totalOrdered: Number(r.totalOrdered),
      totalReceived: Number(r.totalReceived),
      totalPending: Number(r.totalPending),
      lineCount: Number(r.lineCount),
    }));
  }

  async getDashboardWarehouseDistribution(costCenters?: string[]): Promise<DashboardWarehouseDistribution[]> {
    const conditions = [eq(warehouses.isActive, true)];
    if (costCenters?.length) {
      conditions.push(inArray(warehouses.costCenter, costCenters));
    }

    const results = await db.select({
      costCenter: warehouses.costCenter,
      warehouseName: warehouses.name,
      warehouseType: warehouses.warehouseType,
      subWarehouseType: warehouses.subWarehouseType,
      totalStock: sql<number>`coalesce(sum(${inventory.quantity}), 0)`,
      productCount: sql<number>`count(distinct ${inventory.productId})`,
    })
    .from(inventory)
    .innerJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
    .where(and(...conditions))
    .groupBy(warehouses.costCenter, warehouses.name, warehouses.warehouseType, warehouses.subWarehouseType);

    return results.map(r => ({
      costCenter: r.costCenter,
      warehouseName: r.warehouseName,
      warehouseType: r.warehouseType,
      subWarehouseType: r.subWarehouseType,
      totalStock: Number(r.totalStock),
      productCount: Number(r.productCount),
    }));
  }
}

export const storage = new DatabaseStorage();
