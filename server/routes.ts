import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hashPassword, comparePassword, isPlaintextPassword, isSha256Hash } from "./auth";
import { requirePermission, getUserPermissions, clearUserCache, clearAllCache } from "./authorization";
import {
  insertUserSchema, insertWarehouseSchema, insertProductSchema,
  insertInventoryMovementSchema, insertTransferOrderSchema,
  insertUnitSchema, insertCategorySchema, insertBrandSchema,
  transferRequestSchema, stockEntrySchema, warehouseEntrySchema, productEntrySchema,
  ocProductEntrySchema,
  userFormSchema,
  createRoleSchema, updateRoleSchema, updateRolePermissionsSchema, assignRoleSchema,
  type InsertUser
} from "@shared/schema";
import { ZodError } from "zod";

// --- Middleware de autenticación ---
function requireAuth(req: any, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {

  // ============================================================
  // AUTHENTICATION ROUTES (sin requireAuth)
  // ============================================================

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Si la contraseña almacenada es texto plano, migrarla a hash automáticamente
      if (isPlaintextPassword(user.password)) {
        if (user.password === password) {
          // Contraseña correcta en texto plano: migrar a hash
          const hashedPassword = await hashPassword(password);
          await storage.updateUser(user.id, { password: hashedPassword });
        } else {
          return res.status(401).json({ message: "Invalid credentials" });
        }
      } else if (isSha256Hash(user.password)) {
        // Migrar SHA256 legacy a scrypt si corresponde
        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
          return res.status(401).json({ message: "Invalid credentials" });
        }
        const newHash = await hashPassword(password);
        await storage.updateUser(user.id, { password: newHash });
      } else {
        // Contraseña ya hasheada (scrypt): comparar con hash
        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
          return res.status(401).json({ message: "Invalid credentials" });
        }
      }

      // Crear sesión con regenerate para prevenir session fixation
      const { password: _, ...userWithoutPassword } = user;
      const sessionData = { userId: user.id, user: userWithoutPassword };
      req.session.regenerate((err) => {
        if (err) return res.status(500).json({ message: "Session error" });
        req.session.userId = sessionData.userId;
        req.session.user = sessionData.user;
        res.json({ message: "Login successful", user: userWithoutPassword });
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    try {
      req.session.destroy((err: any) => {
        if (err) {
          return res.status(500).json({ message: "Could not log out" });
        }
        res.clearCookie('wms.sid', {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax' as const
        });
        res.json({ message: "Logout successful" });
      });
    } catch (error) {
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "User not found or inactive" });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user info" });
    }
  });

  // ============================================================
  // DASHBOARD ROUTES (requiere autenticación)
  // ============================================================

  app.get("/api/dashboard/metrics", requirePermission("dashboard.view"), async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Helper: obtener CCs permitidos segun rol del usuario
  async function getAllowedCostCenters(userId: number): Promise<string[] | undefined> {
    const user = await storage.getUser(userId);
    if (!user) return [];
    // Admin: sin filtro (undefined = todos)
    if (user.role === 'admin') return undefined;
    // PM, operator, viewer: derivar de managedWarehouses o fallback a costCenter
    if (user.managedWarehouses?.length) {
      return await storage.getCostCentersByWarehouses(user.managedWarehouses);
    }
    if (user.costCenter) return [user.costCenter];
    return [];
  }

  app.get("/api/dashboard/available-cost-centers", requirePermission("dashboard.view"), async (req: any, res) => {
    try {
      const allowed = await getAllowedCostCenters(req.session.userId);
      if (allowed !== undefined) {
        return res.json(allowed);
      }
      // Admin: todos los CCs activos
      const all = await storage.getAllActiveCostCenters();
      res.json(all);
    } catch (error) {
      console.error("[dashboard/available-cost-centers] Error:", error);
      res.status(500).json({ message: "Failed to fetch available cost centers" });
    }
  });

  app.get("/api/dashboard/oc-status", requirePermission("dashboard.view"), async (req: any, res) => {
    try {
      const allowed = await getAllowedCostCenters(req.session.userId);
      if (Array.isArray(allowed) && allowed.length === 0) return res.json([]);

      const queryCc = req.query.costCenter as string | undefined;
      let costCenters: string[] | undefined = allowed;

      if (queryCc) {
        // Validar que el CC solicitado este dentro de los permitidos
        if (allowed !== undefined && !allowed.includes(queryCc)) {
          return res.status(403).json({ message: "No tiene acceso a este centro de costo" });
        }
        costCenters = [queryCc];
      }

      const data = await storage.getDashboardOcStatus(costCenters);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch OC status" });
    }
  });

  app.get("/api/dashboard/warehouse-distribution", requirePermission("dashboard.view"), async (req: any, res) => {
    try {
      const allowed = await getAllowedCostCenters(req.session.userId);
      if (Array.isArray(allowed) && allowed.length === 0) return res.json([]);

      const queryCc = req.query.costCenter as string | undefined;
      let costCenters: string[] | undefined = allowed;

      if (queryCc) {
        if (allowed !== undefined && !allowed.includes(queryCc)) {
          return res.status(403).json({ message: "No tiene acceso a este centro de costo" });
        }
        costCenters = [queryCc];
      }

      const data = await storage.getDashboardWarehouseDistribution(costCenters);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch warehouse distribution" });
    }
  });

  app.get("/api/dashboard/recent-inventory", requirePermission("dashboard.view"), async (req, res) => {
    try {
      // TODO: Optimizar con storage.getRecentInventory(10) usando SQL LIMIT en vez de traer todo
      const allInventory = await storage.getAllInventory();
      const recentInventory = allInventory.slice(0, 10);
      res.json(recentInventory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent inventory" });
    }
  });

  // ============================================================
  // WAREHOUSE ROUTES (requiere autenticación)
  // ============================================================

  app.get("/api/warehouses", requirePermission("warehouses.view"), async (req, res) => {
    try {
      const warehouses = await storage.getAllWarehouses();
      res.json(warehouses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch warehouses" });
    }
  });

  // GET /api/warehouse-values — value of each warehouse based on current month prices
  app.get("/api/warehouse-values", requirePermission("warehouses.view"), async (req: any, res) => {
    try {
      const values = await storage.getWarehouseValues();
      res.json(values);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch warehouse values" });
    }
  });

  // POST /api/warehouse-values/recalculate — recalculate all cost center total values
  app.post("/api/warehouse-values/recalculate", requirePermission("warehouses.view"), async (req: any, res) => {
    try {
      const allWarehouses = await storage.getAllWarehouses();
      const mainWarehouses = allWarehouses.filter(w => w.warehouseType === "main");
      for (const wh of mainWarehouses) {
        await storage.updateCostCenterTotalValue(wh.id);
      }
      res.json({ message: "Recalculated", count: mainWarehouses.length });
    } catch (error) {
      res.status(500).json({ message: "Failed to recalculate" });
    }
  });

  app.get("/api/warehouses/:id", requirePermission("warehouses.view"), async (req, res) => {
    try {
      const warehouse = await storage.getWarehouse(parseInt(req.params.id));
      if (!warehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }
      res.json(warehouse);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch warehouse" });
    }
  });

  app.post("/api/warehouses", requirePermission("warehouses.create"), async (req, res) => {
    try {
      const validatedData = insertWarehouseSchema.parse(req.body);
      const warehouse = await storage.createWarehouse(validatedData);
      res.status(201).json(warehouse);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid warehouse data" });
      }
      res.status(500).json({ message: "Failed to create warehouse" });
    }
  });

  app.put("/api/warehouses/:id", requirePermission("warehouses.edit"), async (req, res) => {
    try {
      const validatedData = insertWarehouseSchema.partial().parse(req.body);
      const warehouse = await storage.updateWarehouse(parseInt(req.params.id), validatedData);
      if (!warehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }
      res.json(warehouse);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid warehouse data" });
      }
      res.status(500).json({ message: "Failed to update warehouse" });
    }
  });

  app.delete("/api/warehouses/:id", requirePermission("warehouses.delete"), async (req, res) => {
    try {
      const success = await storage.deleteWarehouse(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Warehouse not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete warehouse" });
    }
  });

  // Create complete cost center with all warehouses
  app.post("/api/cost-centers", requirePermission("cost_centers.create"), async (req, res) => {
    try {
      const { costCenter, location } = req.body;

      if (!costCenter) {
        return res.status(400).json({ message: "Cost center is required" });
      }

      const warehouses = await storage.createCostCenter(costCenter, location);
      res.status(201).json(warehouses);
    } catch (error) {
      res.status(500).json({ message: "Failed to create cost center" });
    }
  });

  // ============================================================
  // TRACEABILITY ROUTES (read-only, drill-down CC → Bodegas → Productos → OC + Series)
  // ============================================================

  // GET /api/cost-centers — list cost centers with warehouse count, RBAC-filtered
  app.get("/api/cost-centers", requirePermission("warehouses.view"), async (req: any, res) => {
    try {
      const allowed = await getAllowedCostCenters(req.session.userId);
      if (Array.isArray(allowed) && allowed.length === 0) return res.json([]);
      const costCenters = await storage.getAllCostCentersWithCount(
        allowed === undefined ? undefined : allowed
      );
      res.json(costCenters);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cost centers" });
    }
  });

  // GET /api/warehouses/by-cost-center/:costCenter — warehouses of a CC with inventory summary
  app.get("/api/warehouses/by-cost-center/:costCenter", requirePermission("warehouses.view"), async (req: any, res) => {
    try {
      const { costCenter } = req.params;
      const allowed = await getAllowedCostCenters(req.session.userId);
      if (Array.isArray(allowed) && !allowed.includes(costCenter)) {
        return res.status(403).json({ message: "No tiene acceso a este centro de costo" });
      }
      const warehousesData = await storage.getWarehousesByCostCenter(costCenter);
      res.json(warehousesData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch warehouses by cost center" });
    }
  });

  // GET /api/inventory/warehouse/:warehouseId/details — inventory with linked OC receipts
  app.get("/api/inventory/warehouse/:warehouseId/details", requirePermission("inventory.view"), async (req: any, res) => {
    try {
      const warehouseId = parseInt(req.params.warehouseId);
      if (isNaN(warehouseId)) return res.status(400).json({ message: "Invalid warehouse ID" });

      // Validate user access to this warehouse's cost center
      const warehouse = await storage.getWarehouse(warehouseId);
      if (!warehouse) return res.status(404).json({ message: "Warehouse not found" });

      const allowed = await getAllowedCostCenters(req.session.userId);
      if (Array.isArray(allowed) && !allowed.includes(warehouse.costCenter)) {
        return res.status(403).json({ message: "No tiene acceso a esta bodega" });
      }

      const inventoryDetails = await storage.getInventoryWithOcByWarehouse(warehouseId);
      res.json(inventoryDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory details" });
    }
  });

  // GET /api/product-serials/:productId/warehouse/:warehouseId — active serials
  app.get("/api/product-serials/:productId/warehouse/:warehouseId", requirePermission("inventory.view"), async (req: any, res) => {
    try {
      const productId = parseInt(req.params.productId);
      const warehouseId = parseInt(req.params.warehouseId);
      if (isNaN(productId) || isNaN(warehouseId)) {
        return res.status(400).json({ message: "Invalid product or warehouse ID" });
      }

      // Validate user access
      const warehouse = await storage.getWarehouse(warehouseId);
      if (!warehouse) return res.status(404).json({ message: "Warehouse not found" });

      const allowed = await getAllowedCostCenters(req.session.userId);
      if (Array.isArray(allowed) && !allowed.includes(warehouse.costCenter)) {
        return res.status(403).json({ message: "No tiene acceso a esta bodega" });
      }

      const serials = await storage.getProductSerials(productId, warehouseId);
      res.json(serials);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product serials" });
    }
  });

  // GET /api/cost-centers/:costCenter/purchase-orders — OCs with receipts in this CC
  app.get("/api/cost-centers/:costCenter/purchase-orders", requirePermission("warehouses.view"), async (req: any, res) => {
    try {
      const { costCenter } = req.params;
      const allowed = await getAllowedCostCenters(req.session.userId);
      if (Array.isArray(allowed) && !allowed.includes(costCenter)) {
        return res.status(403).json({ message: "No tiene acceso a este centro de costo" });
      }
      const data = await storage.getPurchaseOrdersByCostCenter(costCenter);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch purchase orders by cost center" });
    }
  });

  // GET /api/cost-centers/:costCenter/products — Products with stock and linked OC in this CC
  app.get("/api/cost-centers/:costCenter/products", requirePermission("warehouses.view"), async (req: any, res) => {
    try {
      const { costCenter } = req.params;
      const allowed = await getAllowedCostCenters(req.session.userId);
      if (Array.isArray(allowed) && !allowed.includes(costCenter)) {
        return res.status(403).json({ message: "No tiene acceso a este centro de costo" });
      }
      const data = await storage.getProductsByCostCenter(costCenter);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products by cost center" });
    }
  });

  // GET /api/cost-centers/:costCenter/products/:productId/detail — Full product detail with traceability
  app.get("/api/cost-centers/:costCenter/products/:productId/detail", requirePermission("warehouses.view"), async (req: any, res) => {
    try {
      const { costCenter, productId } = req.params;
      const pid = parseInt(productId);
      if (isNaN(pid)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      const allowed = await getAllowedCostCenters(req.session.userId);
      if (Array.isArray(allowed) && !allowed.includes(costCenter)) {
        return res.status(403).json({ message: "No tiene acceso a este centro de costo" });
      }
      const data = await storage.getProductDetailByCostCenter(costCenter, pid);
      if (!data) {
        return res.status(404).json({ message: "Product not found in this cost center" });
      }
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product detail" });
    }
  });

  // ============================================================
  // PRODUCT ROUTES (requiere autenticación)
  // ============================================================

  app.get("/api/products", requirePermission("products.view"), async (req, res) => {
    try {
      if (req.query.barcode) {
        const product = await storage.getProductByBarcode(req.query.barcode as string);
        if (!product) {
          return res.status(404).json({ message: "Product not found with this barcode" });
        }
        return res.json(product);
      }

      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/with-details", requirePermission("products.view"), async (req, res) => {
    try {
      const products = await storage.getAllProductsWithDetails();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products with details" });
    }
  });

  app.get("/api/products/:id", requirePermission("products.view"), async (req, res) => {
    try {
      const product = await storage.getProductWithDetails(parseInt(req.params.id));
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post("/api/products", requirePermission("products.create"), async (req, res) => {
    try {
      const { currentPrice, ...productData } = req.body;
      const validatedData = insertProductSchema.parse(productData);

      if (validatedData.barcode && validatedData.barcode.trim() !== "") {
        const existingProduct = await storage.getProductByBarcode(validatedData.barcode);
        if (existingProduct) {
          return res.status(409).json({
            message: "Barcode already associated with another product",
            existingProduct: {
              id: existingProduct.id,
              name: existingProduct.name,
              sku: existingProduct.sku
            }
          });
        }
      }

      const product = await storage.createProduct(validatedData, currentPrice || 0);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid product data" });
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put("/api/products/:id", requirePermission("products.edit"), async (req, res) => {
    try {
      const validatedData = insertProductSchema.partial().parse(req.body);

      if (typeof validatedData.barcode === "string" && validatedData.barcode.trim() === "") {
        validatedData.barcode = null;
      }

      if (validatedData.barcode && validatedData.barcode.trim() !== "") {
        const existingProduct = await storage.getProductByBarcode(validatedData.barcode);
        if (existingProduct && existingProduct.id !== parseInt(req.params.id)) {
          return res.status(409).json({
            message: "Barcode already associated with another product",
            existingProduct: {
              id: existingProduct.id,
              name: existingProduct.name,
              sku: existingProduct.sku
            }
          });
        }
      }

      const product = await storage.updateProduct(parseInt(req.params.id), validatedData);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid product data" });
      }
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.put("/api/products/:id/barcode", requirePermission("products.edit"), async (req, res) => {
    try {
      const { barcode } = req.body;
      if (!barcode) {
        return res.status(400).json({ message: "Barcode is required" });
      }

      const existingProduct = await storage.getProductByBarcode(barcode);
      if (existingProduct && existingProduct.id !== parseInt(req.params.id)) {
        return res.status(409).json({ message: "Barcode already associated with another product" });
      }

      const product = await storage.updateProduct(parseInt(req.params.id), { barcode });
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to associate barcode" });
    }
  });

  app.delete("/api/products/:id", requirePermission("products.delete"), async (req, res) => {
    try {
      const success = await storage.deleteProduct(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  app.get("/api/products/barcode/:barcode", requirePermission("products.view"), async (req, res) => {
    try {
      const product = await storage.getProductByBarcode(req.params.barcode);
      if (!product) {
        return res.status(404).json({ message: "Product not found with this barcode" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to search product by barcode" });
    }
  });

  // ============================================================
  // INVENTORY ROUTES (requiere autenticación)
  // ============================================================

  app.get("/api/inventory", requirePermission("inventory.view"), async (req, res) => {
    try {
      const excludeSpecial = req.query.excludeSpecial === 'true';
      let inventoryData = await storage.getAllInventory();
      if (excludeSpecial) {
        const specialTypes = ['garantia', 'despacho'];
        inventoryData = inventoryData.filter(
          (item: any) => !specialTypes.includes(item.warehouse?.subWarehouseType)
        );
      }
      res.json(inventoryData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  app.get("/api/inventory/warehouse/:warehouseId", requirePermission("inventory.view"), async (req, res) => {
    try {
      const inventory = await storage.getInventoryByWarehouse(parseInt(req.params.warehouseId));
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch warehouse inventory" });
    }
  });

  app.get("/api/inventory/product/:productId", requirePermission("inventory.view"), async (req, res) => {
    try {
      const inventory = await storage.getInventoryByProduct(parseInt(req.params.productId));
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product inventory" });
    }
  });

  // ============================================================
  // INVENTORY MOVEMENT ROUTES (requiere autenticación)
  // ============================================================

  app.get("/api/inventory-movements", requirePermission("inventory.view"), async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const movements = await storage.getInventoryMovements(limit);
      res.json(movements);
    } catch (error) {
      console.error("Error fetching inventory movements:", error);
      res.status(500).json({ message: "Failed to fetch inventory movements" });
    }
  });

  app.post("/api/inventory-movements", requirePermission("inventory.movements"), async (req: any, res) => {
    try {
      const validatedData = insertInventoryMovementSchema.parse(req.body);
      const movementData = { ...validatedData, userId: req.session.userId! };

      if (!['in', 'out'].includes(movementData.movementType)) {
        return res.status(400).json({ message: "Tipo de movimiento debe ser 'in' o 'out'" });
      }
      if (movementData.quantity <= 0) {
        return res.status(400).json({ message: "La cantidad debe ser mayor a 0" });
      }

      const movement = await storage.createInventoryMovement(movementData);
      res.status(201).json(movement);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid movement data" });
      }
      if (error?.message?.includes('Stock insuficiente')) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create inventory movement" });
    }
  });

  // Traspaso directo entre bodegas — acepta múltiples productos
  app.post("/api/inventory-transfers", requirePermission("inventory.movements"), async (req: any, res) => {
    try {
      const { sourceWarehouseId, destinationWarehouseId, items, reason, dispatchGuideNumber } = req.body;

      if (!sourceWarehouseId || !destinationWarehouseId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Faltan campos requeridos" });
      }
      if (sourceWarehouseId === destinationWarehouseId) {
        return res.status(400).json({ message: "La bodega origen y destino no pueden ser la misma" });
      }

      // Validar todos los items antes de ejecutar
      for (const item of items) {
        if (!item.productId || !item.quantity || item.quantity <= 0) {
          return res.status(400).json({ message: "Cada item debe tener productId y cantidad mayor a 0" });
        }
        const inv = await storage.getInventory(item.productId, sourceWarehouseId);
        const available = inv?.quantity || 0;
        if (available < item.quantity) {
          return res.status(400).json({
            message: `Stock insuficiente para producto ID ${item.productId}: disponible ${available}, solicitado ${item.quantity}`
          });
        }
      }

      // Determinar tipo de destino
      const destWarehouse = await storage.getWarehouse(destinationWarehouseId);
      if (!destWarehouse) {
        return res.status(404).json({ message: "Bodega destino no encontrada" });
      }
      const sourceWarehouse = await storage.getWarehouse(sourceWarehouseId);
      const isIntegrador = destWarehouse.subWarehouseType === 'integrador';
      const isGarantia = destWarehouse.subWarehouseType === 'garantia';
      const isDespacho = destWarehouse.subWarehouseType === 'despacho';
      const isCrossCostCenter = sourceWarehouse && destWarehouse.costCenter !== sourceWarehouse.costCenter;

      // Verificar si origen es bodega especial (garantia/despacho)
      const sourceIsGarantia = sourceWarehouse?.subWarehouseType === 'garantia';
      const sourceIsDespacho = sourceWarehouse?.subWarehouseType === 'despacho';

      // Restricción admin-only para movimientos hacia/desde bodega Despacho
      if (isDespacho || sourceIsDespacho) {
        const authCtx = await getUserPermissions(req.session.userId!);
        if (!authCtx.isAdmin) {
          return res.status(403).json({ message: "Solo administradores pueden mover productos hacia/desde la bodega Despacho" });
        }
      }

      // Guía de despacho obligatoria cuando destino es bodega despacho
      if (isDespacho && (!dispatchGuideNumber || !dispatchGuideNumber.trim())) {
        return res.status(400).json({ message: "El número de guía de despacho es obligatorio para movimientos a bodega de despacho" });
      }

      // Ejecutar movimientos por cada item
      const results = [];
      for (const item of items) {
        // Determinar razón automática según tipo de bodega destino
        let outReason: string;
        if (isDespacho) {
          outReason = reason || `Despacho a cliente - ${destWarehouse.name}`;
        } else if (isGarantia) {
          outReason = reason || `Envío a revisión por garantía - ${destWarehouse.name}`;
        } else if (isIntegrador) {
          outReason = reason || `Salida a integrador - ${destWarehouse.name}`;
        } else if (sourceIsDespacho) {
          outReason = reason || `Retorno desde despacho - ${sourceWarehouse?.name}`;
        } else if (sourceIsGarantia) {
          outReason = reason || `Retorno desde garantía - ${sourceWarehouse?.name}`;
        } else if (isCrossCostCenter) {
          outReason = reason || `Salida traspaso a CC ${destWarehouse.costCenter}`;
        } else {
          outReason = reason || `Traspaso a ${destWarehouse.name}`;
        }

        const outMovement = await storage.createInventoryMovement({
          productId: item.productId,
          warehouseId: sourceWarehouseId,
          movementType: 'out',
          quantity: item.quantity,
          reason: outReason,
          userId: req.session.userId!,
          ...(isDespacho && dispatchGuideNumber ? { dispatchGuideNumber: dispatchGuideNumber.trim() } : {}),
        });

        let inMovement = null;
        // Integrador: solo OUT (sin IN). Garantía y Despacho: ambos movimientos (IN + OUT)
        if (!isIntegrador) {
          let inReason: string;
          if (isDespacho) {
            inReason = reason || `Despacho a cliente`;
          } else if (isGarantia) {
            inReason = reason || `Envío a revisión por garantía`;
          } else if (sourceIsDespacho) {
            inReason = reason || `Retorno desde despacho`;
          } else if (sourceIsGarantia) {
            inReason = reason || `Retorno desde garantía`;
          } else if (isCrossCostCenter) {
            inReason = reason || `Entrada traspaso desde CC ${sourceWarehouse?.costCenter}`;
          } else {
            inReason = reason || `Traspaso desde ${sourceWarehouse?.name}`;
          }

          inMovement = await storage.createInventoryMovement({
            productId: item.productId,
            warehouseId: destinationWarehouseId,
            movementType: 'in',
            quantity: item.quantity,
            reason: inReason,
            userId: req.session.userId!,
            ...(isDespacho && dispatchGuideNumber ? { dispatchGuideNumber: dispatchGuideNumber.trim() } : {}),
          });
        }

        results.push({ productId: item.productId, quantity: item.quantity, outMovement, inMovement });
      }

      // Determinar tipo de respuesta
      let transferType = 'transfer';
      let message = 'Traspaso realizado exitosamente';
      if (isIntegrador) {
        transferType = 'dispatch';
        message = 'Salida a integrador registrada exitosamente';
      } else if (isDespacho) {
        transferType = 'dispatch_client';
        message = 'Despacho a cliente registrado exitosamente';
      } else if (isGarantia) {
        transferType = 'warranty';
        message = 'Envío a garantía registrado exitosamente';
      }

      res.status(201).json({
        message,
        results,
        totalItems: items.length,
        type: transferType,
      });
    } catch (error: any) {
      if (error?.message?.includes('Stock insuficiente')) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Error en traspaso:", error);
      res.status(500).json({ message: "Error al realizar el traspaso" });
    }
  });

  // Hoja de Vida del producto — todos los datos consolidados
  app.get("/api/products/:id/vida", requirePermission("products.view"), async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getProductWithDetails(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Obtener datos en paralelo
      const [inventory, movements, allSerials] = await Promise.all([
        storage.getInventoryByProduct(productId),
        storage.getInventoryMovementsByProduct(productId),
        storage.getAllProductSerials(productId),
      ]);

      res.json({
        product,
        inventory,
        movements,
        serials: allSerials,
      });
    } catch (error) {
      console.error("Error fetching product vida:", error);
      res.status(500).json({ message: "Failed to fetch product life sheet" });
    }
  });

  app.get("/api/inventory-movements/product/:productId", requirePermission("inventory.view"), async (req, res) => {
    try {
      const movements = await storage.getInventoryMovementsByProduct(parseInt(req.params.productId));
      res.json(movements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product movements" });
    }
  });

  // ============================================================
  // TRANSFER ORDER ROUTES (requiere autenticación)
  // ============================================================

  app.get("/api/transfer-orders", requirePermission("orders.view_transfers"), async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const role = req.query.role as string;
      const costCenter = req.query.costCenter as string;

      const orders = await storage.getTransferOrders(userId, role, costCenter);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transfer orders" });
    }
  });

  app.get("/api/transfer-orders/:id", requirePermission("orders.view_transfers"), async (req, res) => {
    try {
      const order = await storage.getTransferOrder(parseInt(req.params.id));
      if (!order) {
        return res.status(404).json({ message: "Transfer order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transfer order" });
    }
  });

  app.post("/api/transfer-orders", requirePermission("orders.create_transfers"), async (req: any, res) => {
    try {
      const validatedData = transferRequestSchema.parse(req.body);

      if (validatedData.sourceWarehouseId === validatedData.destinationWarehouseId) {
        return res.status(400).json({ message: "La bodega de origen y destino no pueden ser la misma" });
      }

      // Verificar restricción admin para bodegas Despacho
      const destWh = await storage.getWarehouse(validatedData.destinationWarehouseId);
      const srcWh = await storage.getWarehouse(validatedData.sourceWarehouseId);
      if (destWh?.subWarehouseType === 'despacho' || srcWh?.subWarehouseType === 'despacho') {
        const authCtx = await getUserPermissions(req.session.userId!);
        if (!authCtx.isAdmin) {
          return res.status(403).json({ message: "Solo administradores pueden crear traspasos hacia/desde la bodega Despacho" });
        }
      }

      const orderNumber = await storage.generateOrderNumber();

      const users = await storage.getAllUsers();
      const projectManager = users.find(u => u.role === 'project_manager') || users[0];

      const orderData = {
        orderNumber,
        productId: validatedData.productId,
        quantity: validatedData.quantity,
        sourceWarehouseId: validatedData.sourceWarehouseId,
        destinationWarehouseId: validatedData.destinationWarehouseId,
        costCenter: validatedData.costCenter,
        requesterId: req.session.userId,
        projectManagerId: projectManager?.id,
        status: 'pending' as const,
        notes: validatedData.notes,
      };

      const order = await storage.createTransferOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid transfer order data" });
      }
      res.status(500).json({ message: "Failed to create transfer order" });
    }
  });

  app.patch("/api/transfer-orders/:id/status", requirePermission("orders.approve_transfers"), async (req: any, res) => {
    try {
      const { status } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'approved' or 'rejected'" });
      }

      const currentOrder = await storage.getTransferOrder(parseInt(req.params.id));
      if (!currentOrder) {
        return res.status(404).json({ message: "Transfer order not found" });
      }
      if (currentOrder.status !== 'pending') {
        return res.status(400).json({ message: "Solo se pueden modificar órdenes en estado pendiente" });
      }

      const order = await storage.updateTransferOrderStatus(
        parseInt(req.params.id),
        status,
        req.session.userId
      );

      if (!order) {
        return res.status(404).json({ message: "Transfer order not found" });
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to update transfer order status" });
    }
  });

  // ============================================================
  // PRODUCT ENTRY & STOCK ENTRY ROUTES (requiere autenticación)
  // ============================================================

  app.post("/api/product-entry", requirePermission("inventory.entry"), async (req: any, res) => {
    try {
      const validatedData = productEntrySchema.parse(req.body);

      let principalWarehouse = await storage.getPrincipalWarehouse(validatedData.costCenter);

      if (!principalWarehouse) {
        await storage.createCostCenter(validatedData.costCenter, validatedData.location);
        principalWarehouse = await storage.getPrincipalWarehouse(validatedData.costCenter);

        if (!principalWarehouse) {
          return res.status(500).json({ message: "Failed to create principal warehouse" });
        }
      }

      const product = await storage.getProduct(validatedData.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (product.requiresSerial && (!validatedData.serialNumbers || validatedData.serialNumbers.length !== validatedData.quantity)) {
        return res.status(400).json({
          message: `This product requires serial numbers. Please provide ${validatedData.quantity} serial numbers.`
        });
      }

      // Validar unicidad de números de serie antes de insertar
      if (product.requiresSerial && validatedData.serialNumbers) {
        for (const serialNumber of validatedData.serialNumbers) {
          const isValid = await storage.validateSerialNumber(validatedData.productId, serialNumber);
          if (!isValid) {
            return res.status(409).json({
              message: `El número de serie '${serialNumber}' ya existe para este producto.`
            });
          }
        }
      }

      const movement = await storage.createInventoryMovement({
        productId: validatedData.productId,
        warehouseId: principalWarehouse.id,
        movementType: 'in',
        quantity: validatedData.quantity,
        appliedPrice: validatedData.price.toString(),
        reason: validatedData.reason || `Ingreso de producto al centro de costo ${validatedData.costCenter}`,
        userId: req.session.userId,
      });

      if (product.requiresSerial && validatedData.serialNumbers) {
        for (const serialNumber of validatedData.serialNumbers) {
          await storage.createProductSerial({
            productId: validatedData.productId,
            warehouseId: principalWarehouse.id,
            serialNumber,
            movementId: movement.id,
            status: 'active',
          });
        }
      }

      res.status(201).json(movement);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid product entry data" });
      }
      res.status(500).json({ message: "Failed to create product entry" });
    }
  });

  app.post("/api/stock-entry", requirePermission("inventory.entry"), async (req: any, res) => {
    try {
      const validatedData = warehouseEntrySchema.parse(req.body);

      const product = await storage.getProduct(validatedData.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (product.requiresSerial && (!validatedData.serialNumbers || validatedData.serialNumbers.length !== validatedData.quantity)) {
        return res.status(400).json({
          message: `This product requires serial numbers. Please provide ${validatedData.quantity} serial numbers.`
        });
      }

      // Validar unicidad de números de serie antes de insertar
      if (product.requiresSerial && validatedData.serialNumbers) {
        for (const serialNumber of validatedData.serialNumbers) {
          const isValid = await storage.validateSerialNumber(validatedData.productId, serialNumber);
          if (!isValid) {
            return res.status(409).json({
              message: `El número de serie '${serialNumber}' ya existe para este producto.`
            });
          }
        }
      }

      const appliedPrice = validatedData.price;

      const movement = await storage.createInventoryMovement({
        productId: validatedData.productId,
        warehouseId: validatedData.warehouseId,
        movementType: 'in',
        quantity: validatedData.quantity,
        appliedPrice: appliedPrice.toString(),
        reason: validatedData.reason || 'Ingreso de stock',
        userId: req.session.userId,
      });

      if (product.requiresSerial && validatedData.serialNumbers) {
        for (const serialNumber of validatedData.serialNumbers) {
          await storage.createProductSerial({
            productId: validatedData.productId,
            warehouseId: validatedData.warehouseId,
            serialNumber,
            movementId: movement.id,
            status: 'active',
          });
        }
      }

      res.status(201).json(movement);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid stock entry data" });
      }
      res.status(500).json({ message: "Failed to create stock entry" });
    }
  });

  // ============================================================
  // PRINCIPAL WAREHOUSE ROUTES (requiere autenticación)
  // ============================================================

  app.get("/api/principal-warehouse/:costCenter", requirePermission("warehouses.view"), async (req, res) => {
    try {
      const warehouse = await storage.getPrincipalWarehouse(req.params.costCenter);
      if (!warehouse) {
        return res.status(404).json({ message: "Principal warehouse not found for this cost center" });
      }
      res.json(warehouse);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch principal warehouse" });
    }
  });

  app.post("/api/principal-warehouse", requirePermission("warehouses.create"), async (req, res) => {
    try {
      const { costCenter, location } = req.body;
      if (!costCenter) {
        return res.status(400).json({ message: "Cost center is required" });
      }

      const warehouse = await storage.createPrincipalWarehouse(costCenter, location);
      res.status(201).json(warehouse);
    } catch (error) {
      res.status(500).json({ message: "Failed to create principal warehouse" });
    }
  });

  // ============================================================
  // USER MANAGEMENT ROUTES (requiere admin)
  // ============================================================

  app.get("/api/users", requirePermission("users.view"), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(user => ({ ...user, password: undefined })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", requirePermission("users.view"), async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", requirePermission("users.manage"), async (req, res) => {
    try {
      const validatedData = userFormSchema.parse(req.body);

      if (validatedData.costCenter === "sin_asignar") {
        validatedData.costCenter = undefined;
      }

      if (!validatedData.password) {
        return res.status(400).json({ message: "Password is required" });
      }

      validatedData.password = await hashPassword(validatedData.password);

      const user = await storage.createUser(validatedData as InsertUser);
      res.status(201).json({ ...user, password: undefined });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      if (error?.code === '23505') {
        return res.status(409).json({ message: "El nombre de usuario ya existe" });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", requirePermission("users.manage"), async (req, res) => {
    try {
      const bodyData = { ...req.body };
      if (bodyData.costCenter === "sin_asignar") {
        bodyData.costCenter = null;
      }

      // Si se envía una nueva contraseña, hashearla
      if (bodyData.password && typeof bodyData.password === 'string' && bodyData.password.trim() !== '') {
        bodyData.password = await hashPassword(bodyData.password);
      } else {
        delete bodyData.password;
      }

      const validatedData = insertUserSchema.partial().parse(bodyData);
      const user = await storage.updateUser(parseInt(req.params.id), validatedData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      clearUserCache(parseInt(req.params.id));
      res.json({ ...user, password: undefined });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid user data" });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", requirePermission("users.manage"), async (req: any, res) => {
    try {
      if (parseInt(req.params.id) === req.session.userId) {
        return res.status(400).json({ message: "No puede eliminar su propia cuenta" });
      }
      const success = await storage.deleteUser(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      clearUserCache(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.get("/api/users/role/:role", requirePermission("users.view"), async (req, res) => {
    try {
      const users = await storage.getUsersByRole(req.params.role);
      res.json(users.map(user => ({ ...user, password: undefined })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users by role" });
    }
  });

  app.get("/api/project-managers", requirePermission("users.view"), async (req, res) => {
    try {
      const managers = await storage.getProjectManagers();
      res.json(managers.map(user => ({ ...user, password: undefined })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project managers" });
    }
  });

  app.put("/api/users/:id/permissions", requirePermission("users.manage"), async (req, res) => {
    try {
      const { permissions, managedWarehouses } = req.body;
      const user = await storage.assignPermissions(
        parseInt(req.params.id),
        permissions,
        managedWarehouses
      );
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      clearUserCache(parseInt(req.params.id));
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ message: "Failed to assign permissions" });
    }
  });

  app.get("/api/users/:id/permissions/:permission", requirePermission("users.view"), async (req, res) => {
    try {
      const hasPermission = await storage.checkUserPermission(
        parseInt(req.params.id),
        req.params.permission
      );
      res.json({ hasPermission });
    } catch (error) {
      res.status(500).json({ message: "Failed to check permission" });
    }
  });

  // POST /api/users/generate-all - Generar todos los usuarios desde la DB de Tunning
  app.post("/api/users/generate-all", requirePermission("users.manage"), async (req, res) => {
    try {
      const { getAllPavUsersBasic } = await import('./tunning-db');
      const pavUsers = await getAllPavUsersBasic();

      if (!pavUsers || pavUsers.length === 0) {
        return res.json({
          success: true,
          created: 0,
          skipped: 0,
          total: 0,
          message: "No se encontraron usuarios en la base de datos de Tunning",
        });
      }

      // Obtener todos los usuarios existentes para evitar duplicados
      const existingUsers = await storage.getAllUsers();
      const existingUsernames = new Set(existingUsers.map(u => u.username.toLowerCase()));
      const existingFichas = new Set(existingUsers.filter(u => u.ficha).map(u => u.ficha!));

      let created = 0;
      let skipped = 0;
      const errors: string[] = [];

      // Funcion para quitar acentos y caracteres especiales
      const normalizeText = (text: string): string => {
        return text
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9]/g, "")
          .toLowerCase();
      };

      for (const pavUser of pavUsers) {
        const ficha = pavUser.ficha?.trim();
        if (!ficha) {
          skipped++;
          continue;
        }

        // Si la ficha ya existe en nuestra DB, saltarlo
        if (existingFichas.has(ficha)) {
          skipped++;
          continue;
        }

        // Generar username: primera letra del nombre + apellido + _ + ficha
        const firstName = normalizeText(pavUser.nombre || "");
        const lastName = normalizeText(pavUser.appaterno || "");
        let username = "";

        if (firstName && lastName) {
          username = `${firstName.charAt(0)}${lastName}_${ficha}`;
        } else if (pavUser.nombre_completo) {
          username = `${normalizeText(pavUser.nombre_completo).substring(0, 8)}_${ficha}`;
        } else {
          username = `user_${ficha}`;
        }

        // Si el username ya existe, saltarlo
        if (existingUsernames.has(username.toLowerCase())) {
          skipped++;
          continue;
        }

        try {
          // Password: primeros 4 digitos de la ficha, hasheada
          const rawPassword = ficha.substring(0, 4);
          const hashedPassword = await hashPassword(rawPassword);

          await storage.createUser({
            username,
            password: hashedPassword,
            firstName: pavUser.nombre || null,
            lastName: pavUser.appaterno || null,
            email: pavUser.email_tunning || null,
            ficha,
            role: "sin_acceso",
            permissions: [],
            managedWarehouses: [],
            isActive: true,
          });

          existingUsernames.add(username.toLowerCase());
          existingFichas.add(ficha);
          created++;
        } catch (err: any) {
          // Si es error de duplicado, saltarlo
          if (err.code === '23505') {
            skipped++;
          } else {
            errors.push(`Error con ficha ${ficha}: ${err.message}`);
          }
        }
      }

      res.json({
        success: true,
        created,
        skipped,
        total: pavUsers.length,
        message: `Se crearon ${created} usuarios. ${skipped} ya existían o fueron omitidos.`,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      });
    } catch (error: any) {
      console.error("Error al generar usuarios:", error);
      res.status(500).json({ message: "Error al generar usuarios desde Tunning DB" });
    }
  });

  // ============================================================
  // ORDENES DE COMPRA ROUTES (datos desde Tunning DB)
  // ============================================================

  app.get("/api/ordenes-compra", requirePermission("orders.view_purchase"), async (req, res) => {
    try {
      const { getOrdenesCompra } = await import("./tunning-db");
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = Math.min(parseInt(req.query.pageSize as string) || 50, 200);
      const search = (req.query.search as string) || undefined;
      const costCenter = (req.query.costCenter as string) || undefined;
      const estado = (req.query.estado as string) || undefined;
      const tipoCategoria = (req.query.tipoCategoria as string) || undefined;

      const result = await getOrdenesCompra({ page, pageSize, search, costCenter, estado, tipoCategoria });

      // Enriquecer con datos locales de recepcion
      if (result.rows.length > 0) {
        const uniqueOCs = [...new Set(result.rows.map((r: any) => r.numoc))];
        const allReceipts: any[] = [];
        for (const oc of uniqueOCs) {
          const receipts = await storage.getReceiptsByOC(oc);
          allReceipts.push(...receipts);
        }
        const receiptMap = new Map(allReceipts.map((r: any) => [`${r.purchaseOrderNumber}-${r.purchaseOrderLine}`, r]));

        result.rows = result.rows.map((row: any) => {
          const receipt = receiptMap.get(`${row.numoc}-${row.numlinea}`);
          const ordenada = parseFloat(row.cantidad || "0");
          const recibidoLocal = receipt ? parseFloat(receipt.receivedQuantity) : 0;
          const pendiente = Math.max(0, ordenada - recibidoLocal);
          return {
            ...row,
            localReceivedQuantity: recibidoLocal,
            pendingQuantity: pendiente,
            isFullyReceived: pendiente <= 0,
          };
        });
      }

      res.json(result);
    } catch (error: any) {
      console.error("Error al obtener ordenes de compra:", error);
      res.status(500).json({ message: "Error al obtener órdenes de compra" });
    }
  });

  app.get("/api/ordenes-compra/cost-centers", requirePermission("orders.view_purchase"), async (req, res) => {
    try {
      const { getOrdenesCompraCostCenters } = await import("./tunning-db");
      const costCenters = await getOrdenesCompraCostCenters();
      res.json(costCenters);
    } catch (error: any) {
      console.error("Error al obtener centros de costo:", error);
      res.status(500).json({ message: "Error al obtener centros de costo" });
    }
  });

  // Buscar OCs por numero (autocomplete)
  app.get("/api/ordenes-compra/search", requirePermission("orders.view_purchase"), async (req, res) => {
    try {
      const { searchOrdenesCompraNumbers } = await import("./tunning-db");
      const q = (req.query.q as string) || "";
      if (q.length < 2) return res.json([]);
      const results = await searchOrdenesCompraNumbers(q);
      res.json(results);
    } catch (error: any) {
      console.error("Error al buscar ordenes de compra:", error);
      res.status(500).json({ message: "Error al buscar ordenes de compra" });
    }
  });

  // Obtener CCs de una OC especifica
  app.get("/api/ordenes-compra/:numoc/cost-centers", requirePermission("orders.view_purchase"), async (req, res) => {
    try {
      const { getOrdenCompraCostCentersByOC } = await import("./tunning-db");
      const costCenters = await getOrdenCompraCostCentersByOC(req.params.numoc);
      res.json(costCenters);
    } catch (error: any) {
      console.error("Error al obtener CCs de OC:", error);
      res.status(500).json({ message: "Error al obtener centros de costo de OC" });
    }
  });

  // Obtener lineas de OC por CC, enriquecidas con datos locales de recepcion
  app.get("/api/ordenes-compra/:numoc/lines", requirePermission("orders.view_purchase"), async (req, res) => {
    try {
      const { getOrdenCompraByNumber } = await import("./tunning-db");
      const numoc = req.params.numoc;
      const cc = (req.query.cc as string) || undefined;

      let ocLines;
      if (cc) {
        const { getOrdenCompraLinesByOCandCC } = await import("./tunning-db");
        ocLines = await getOrdenCompraLinesByOCandCC(numoc, cc);
      } else {
        ocLines = await getOrdenCompraByNumber(numoc);
      }

      // Obtener receipts locales
      const localReceipts = await storage.getReceiptsByOC(numoc);
      const receiptMap = new Map(localReceipts.map((r: any) => [`${r.purchaseOrderNumber}-${r.purchaseOrderLine}`, r]));

      // Obtener productos locales para matching
      const allProducts = await storage.getAllProducts();
      const productByErpCode = new Map(
        allProducts.filter((p: any) => p.erpProductCode).map((p: any) => [p.erpProductCode!, p])
      );

      const enrichedLines = ocLines.map((line: any) => {
        const receipt = receiptMap.get(`${line.numoc}-${line.numlinea}`);
        const ordenada = parseFloat(line.cantidad || "0");
        const recibidoLocal = receipt ? parseFloat(receipt.receivedQuantity) : 0;
        const pendiente = Math.max(0, ordenada - recibidoLocal);
        const matchedProduct = line.codprod ? productByErpCode.get(line.codprod) : null;

        // Precio unitario: subtotalmb / cantidad
        const subtotal = parseFloat(line.subtotalmb || "0");
        const unitPrice = ordenada > 0 ? subtotal / ordenada : 0;

        return {
          ...line,
          localReceivedQuantity: recibidoLocal,
          pendingQuantity: pendiente,
          localProductId: receipt?.productId || matchedProduct?.id || null,
          matchedProductName: matchedProduct?.name || null,
          calculatedUnitPrice: Math.round(unitPrice * 100) / 100,
          isFullyReceived: pendiente <= 0,
        };
      });

      res.json(enrichedLines);
    } catch (error: any) {
      console.error("Error al obtener lineas de OC:", error);
      res.status(500).json({ message: "Error al obtener lineas de OC" });
    }
  });

  // Ingreso de producto basado en Orden de Compra
  app.post("/api/product-entry-oc", requirePermission("orders.entry_oc"), async (req: any, res) => {
    try {
      const validatedData = ocProductEntrySchema.parse(req.body);

      // 1. Verificar que la linea OC existe
      const { getOrdenCompraByNumber } = await import("./tunning-db");
      const ocLines = await getOrdenCompraByNumber(validatedData.purchaseOrderNumber);
      const ocLine = ocLines.find((l: any) => l.numlinea === validatedData.purchaseOrderLine);

      if (!ocLine) {
        return res.status(404).json({ message: "Linea de OC no encontrada" });
      }

      // 2. Validar cantidad contra pendiente
      const receipt = await storage.getOrCreateReceipt(
        validatedData.purchaseOrderNumber,
        validatedData.purchaseOrderLine,
        ocLine
      );

      const ordered = parseFloat(ocLine.cantidad || "0");
      const alreadyReceived = parseFloat(receipt.receivedQuantity);
      const pending = ordered - alreadyReceived;

      if (validatedData.quantity > pending) {
        return res.status(400).json({
          message: `La cantidad (${validatedData.quantity}) excede lo pendiente (${pending}). Ordenado: ${ordered}, Recibido: ${alreadyReceived}.`
        });
      }

      // 3. Encontrar/crear bodega principal del CC
      let principalWarehouse = await storage.getPrincipalWarehouse(validatedData.costCenter);
      if (!principalWarehouse) {
        await storage.createCostCenter(validatedData.costCenter);
        principalWarehouse = await storage.getPrincipalWarehouse(validatedData.costCenter);
        if (!principalWarehouse) {
          return res.status(500).json({ message: "Error al crear bodega principal" });
        }
      }

      // 4. Validar producto
      const product = await storage.getProduct(validatedData.productId);
      if (!product) {
        return res.status(404).json({ message: "Producto no encontrado" });
      }

      // 5. Validar series si aplica
      if (product.requiresSerial && (!validatedData.serialNumbers || validatedData.serialNumbers.length !== validatedData.quantity)) {
        return res.status(400).json({
          message: `Este producto requiere ${validatedData.quantity} numeros de serie.`
        });
      }

      // 5.1 Validar unicidad de números de serie antes de insertar
      if (product.requiresSerial && validatedData.serialNumbers) {
        for (const serialNumber of validatedData.serialNumbers) {
          const isValid = await storage.validateSerialNumber(validatedData.productId, serialNumber);
          if (!isValid) {
            return res.status(409).json({
              message: `El número de serie '${serialNumber}' ya existe para este producto.`
            });
          }
        }
      }

      // 6. Crear movimiento de inventario con referencia OC
      const movement = await storage.createInventoryMovement({
        productId: validatedData.productId,
        warehouseId: principalWarehouse.id,
        movementType: 'in',
        quantity: validatedData.quantity,
        appliedPrice: validatedData.price.toString(),
        purchaseOrderNumber: validatedData.purchaseOrderNumber,
        purchaseOrderLine: validatedData.purchaseOrderLine,
        purchaseOrderCodprod: ocLine.codprod,
        reason: validatedData.reason || `Recepcion OC ${validatedData.purchaseOrderNumber} linea ${validatedData.purchaseOrderLine}`,
        userId: req.session.userId,
      });

      // 7. Actualizar receipt tracker
      await storage.updateReceiptQuantity(
        receipt.id,
        alreadyReceived + validatedData.quantity,
        validatedData.productId,
        movement.id
      );

      // 8. Crear series si aplica
      if (product.requiresSerial && validatedData.serialNumbers) {
        for (const serialNumber of validatedData.serialNumbers) {
          await storage.createProductSerial({
            productId: validatedData.productId,
            warehouseId: principalWarehouse.id,
            serialNumber,
            movementId: movement.id,
            status: 'active',
          });
        }
      }

      // 9. Vincular producto con codigo ERP si no esta vinculado
      if (ocLine.codprod && !product.erpProductCode) {
        await storage.updateProduct(product.id, { erpProductCode: ocLine.codprod });
      }

      res.status(201).json({
        movement,
        receipt: {
          ordered,
          previouslyReceived: alreadyReceived,
          thisEntry: validatedData.quantity,
          newTotal: alreadyReceived + validatedData.quantity,
          remaining: ordered - (alreadyReceived + validatedData.quantity),
        }
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Datos invalidos", errors: error.errors });
      }
      console.error("Error en product-entry-oc:", error);
      res.status(500).json({ message: "Error al procesar ingreso con OC" });
    }
  });

  // ============================================================
  // UNITS ROUTES (requiere autenticación)
  // ============================================================

  app.get("/api/units", requirePermission("products.view"), async (req, res) => {
    try {
      const units = await storage.getAllUnits();
      res.json(units);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch units" });
    }
  });

  app.get("/api/units/:id", requirePermission("products.view"), async (req, res) => {
    try {
      const unit = await storage.getUnit(parseInt(req.params.id));
      if (!unit) {
        return res.status(404).json({ message: "Unit not found" });
      }
      res.json(unit);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unit" });
    }
  });

  app.post("/api/units", requirePermission("products.edit"), async (req, res) => {
    try {
      const validatedData = insertUnitSchema.parse(req.body);
      if (!validatedData.name || !validatedData.name.trim()) {
        return res.status(400).json({ message: "El nombre de la unidad es requerido" });
      }
      const unit = await storage.createUnit(validatedData);
      res.status(201).json(unit);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid unit data", errors: error.errors });
      }
      if (error?.code === '23505') {
        return res.status(409).json({ message: "Ya existe una unidad con ese nombre" });
      }
      res.status(500).json({ message: "Failed to create unit" });
    }
  });

  app.put("/api/units/:id", requirePermission("products.edit"), async (req, res) => {
    try {
      const validatedData = insertUnitSchema.partial().parse(req.body);
      const unit = await storage.updateUnit(parseInt(req.params.id), validatedData);
      if (!unit) {
        return res.status(404).json({ message: "Unit not found" });
      }
      res.json(unit);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid unit data" });
      }
      res.status(500).json({ message: "Failed to update unit" });
    }
  });

  app.delete("/api/units/:id", requirePermission("products.delete"), async (req, res) => {
    try {
      const success = await storage.deleteUnit(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Unit not found" });
      }
      res.json({ message: "Unit deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete unit" });
    }
  });

  // ============================================================
  // CATEGORIES ROUTES (requiere autenticación)
  // ============================================================

  app.get("/api/categories", requirePermission("products.view"), async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.get("/api/categories/:id", requirePermission("products.view"), async (req, res) => {
    try {
      const category = await storage.getCategory(parseInt(req.params.id));
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  app.post("/api/categories", requirePermission("products.edit"), async (req, res) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      if (!validatedData.name || !validatedData.name.trim()) {
        return res.status(400).json({ message: "El nombre de la categoría es requerido" });
      }
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      if (error?.code === '23505') {
        return res.status(409).json({ message: "Ya existe una categoría con ese nombre" });
      }
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.put("/api/categories/:id", requirePermission("products.edit"), async (req, res) => {
    try {
      const validatedData = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(parseInt(req.params.id), validatedData);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid category data" });
      }
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", requirePermission("products.delete"), async (req, res) => {
    try {
      const success = await storage.deleteCategory(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // ============================================================
  // BRANDS ROUTES (requiere autenticación)
  // ============================================================

  app.get("/api/brands", requirePermission("products.view"), async (req, res) => {
    try {
      const brands = await storage.getAllBrands();
      res.json(brands);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch brands" });
    }
  });

  app.get("/api/brands/:id", requirePermission("products.view"), async (req, res) => {
    try {
      const brand = await storage.getBrand(parseInt(req.params.id));
      if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      res.json(brand);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch brand" });
    }
  });

  app.post("/api/brands", requirePermission("products.edit"), async (req, res) => {
    try {
      const validatedData = insertBrandSchema.parse(req.body);
      if (!validatedData.name || !validatedData.name.trim()) {
        return res.status(400).json({ message: "El nombre de la marca es requerido" });
      }
      const brand = await storage.createBrand(validatedData);
      res.status(201).json(brand);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid brand data", errors: error.errors });
      }
      if (error?.code === '23505') {
        return res.status(409).json({ message: "Ya existe una marca con ese nombre" });
      }
      res.status(500).json({ message: "Failed to create brand" });
    }
  });

  app.put("/api/brands/:id", requirePermission("products.edit"), async (req, res) => {
    try {
      const validatedData = insertBrandSchema.partial().parse(req.body);
      const brand = await storage.updateBrand(parseInt(req.params.id), validatedData);
      if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      res.json(brand);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid brand data" });
      }
      res.status(500).json({ message: "Failed to update brand" });
    }
  });

  app.delete("/api/brands/:id", requirePermission("products.delete"), async (req, res) => {
    try {
      const success = await storage.deleteBrand(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Brand not found" });
      }
      res.json({ message: "Brand deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete brand" });
    }
  });

  // ============================================================
  // AUTH PERMISSIONS (retorna permisos del usuario autenticado)
  // ============================================================

  app.get("/api/auth/permissions", requireAuth, async (req: any, res) => {
    try {
      const authCtx = await getUserPermissions(req.session.userId!);
      res.json(authCtx);
    } catch (error) {
      console.error("Error al obtener permisos:", error);
      res.status(500).json({ message: "Error al obtener permisos" });
    }
  });

  // ============================================================
  // RBAC - ROLES MANAGEMENT
  // ============================================================

  app.get("/api/roles", requirePermission("roles.view"), async (req, res) => {
    try {
      const allRoles = await storage.getAllRoles();
      res.json(allRoles);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener roles" });
    }
  });

  app.get("/api/permissions", requirePermission("roles.view"), async (req, res) => {
    try {
      const allPermissions = await storage.getAllPermissions();
      res.json(allPermissions);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener permisos" });
    }
  });

  app.get("/api/roles/:id", requirePermission("roles.view"), async (req, res) => {
    try {
      const role = await storage.getRoleById(parseInt(req.params.id));
      if (!role) {
        return res.status(404).json({ message: "Rol no encontrado" });
      }
      res.json(role);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener rol" });
    }
  });

  app.post("/api/roles", requirePermission("roles.manage"), async (req, res) => {
    try {
      const validatedData = createRoleSchema.parse(req.body);
      const role = await storage.createRole(validatedData);
      res.status(201).json(role);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Datos de rol invalidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error al crear rol" });
    }
  });

  app.put("/api/roles/:id", requirePermission("roles.manage"), async (req, res) => {
    try {
      const validatedData = updateRoleSchema.parse(req.body);
      const role = await storage.updateRole(parseInt(req.params.id), validatedData);
      if (!role) {
        return res.status(404).json({ message: "Rol no encontrado" });
      }
      clearAllCache();
      res.json(role);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Datos de rol invalidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error al actualizar rol" });
    }
  });

  app.put("/api/roles/:id/permissions", requirePermission("roles.manage"), async (req, res) => {
    try {
      const validatedData = updateRolePermissionsSchema.parse(req.body);
      await storage.updateRolePermissions(parseInt(req.params.id), validatedData.permissionKeys);
      clearAllCache();
      const updated = await storage.getRoleById(parseInt(req.params.id));
      res.json(updated);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Datos invalidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error al actualizar permisos del rol" });
    }
  });

  app.delete("/api/roles/:id", requirePermission("roles.manage"), async (req, res) => {
    try {
      const success = await storage.deleteRole(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Rol no encontrado" });
      }
      clearAllCache();
      res.json({ message: "Rol eliminado exitosamente" });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Error al eliminar rol" });
    }
  });

  // Asignar rol a usuario
  app.put("/api/users/:id/role", requirePermission("users.manage"), async (req, res) => {
    try {
      const validatedData = assignRoleSchema.parse(req.body);
      const user = await storage.assignUserRole(parseInt(req.params.id), validatedData.roleCode);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      clearUserCache(parseInt(req.params.id));
      res.json({ ...user, password: undefined });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Datos invalidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error al asignar rol" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
