import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hashPassword, comparePassword, isPlaintextPassword } from "./auth";
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
      } else {
        // Contraseña ya hasheada: comparar con hash
        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
          return res.status(401).json({ message: "Invalid credentials" });
        }
      }

      // Crear sesión
      req.session.userId = user.id;
      const { password: _, ...userWithoutPassword } = user;
      req.session.user = userWithoutPassword;

      res.json({
        message: "Login successful",
        user: userWithoutPassword
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      req.session.destroy((err: any) => {
        if (err) {
          return res.status(500).json({ message: "Could not log out" });
        }
        res.clearCookie('connect.sid');
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

  app.get("/api/dashboard/metrics", requireAuth, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  app.get("/api/dashboard/recent-inventory", requireAuth, async (req, res) => {
    try {
      const recentInventory = await storage.getAllInventory();
      res.json(recentInventory.slice(0, 10));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent inventory" });
    }
  });

  // ============================================================
  // WAREHOUSE ROUTES (requiere autenticación)
  // ============================================================

  app.get("/api/warehouses", requireAuth, async (req, res) => {
    try {
      const warehouses = await storage.getAllWarehouses();
      res.json(warehouses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch warehouses" });
    }
  });

  app.get("/api/warehouses/:id", requireAuth, async (req, res) => {
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
  // PRODUCT ROUTES (requiere autenticación)
  // ============================================================

  app.get("/api/products", requireAuth, async (req, res) => {
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

  app.get("/api/products/with-details", requireAuth, async (req, res) => {
    try {
      const products = await storage.getAllProductsWithDetails();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products with details" });
    }
  });

  app.get("/api/products/:id", requireAuth, async (req, res) => {
    try {
      const product = await storage.getProduct(parseInt(req.params.id));
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

  app.get("/api/products/barcode/:barcode", requireAuth, async (req, res) => {
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

  app.get("/api/inventory", requireAuth, async (req, res) => {
    try {
      const inventory = await storage.getAllInventory();
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  app.get("/api/inventory/warehouse/:warehouseId", requireAuth, async (req, res) => {
    try {
      const inventory = await storage.getInventoryByWarehouse(parseInt(req.params.warehouseId));
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch warehouse inventory" });
    }
  });

  app.get("/api/inventory/product/:productId", requireAuth, async (req, res) => {
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

  app.get("/api/inventory-movements", requireAuth, async (req, res) => {
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
      const movement = await storage.createInventoryMovement(validatedData);
      res.status(201).json(movement);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid movement data" });
      }
      res.status(500).json({ message: "Failed to create inventory movement" });
    }
  });

  app.get("/api/inventory-movements/product/:productId", requireAuth, async (req, res) => {
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

  app.get("/api/transfer-orders", requireAuth, async (req, res) => {
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

  app.get("/api/transfer-orders/:id", requireAuth, async (req, res) => {
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

  app.post("/api/transfer-orders", requireAuth, async (req: any, res) => {
    try {
      const validatedData = transferRequestSchema.parse(req.body);

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

      const warehouses = await storage.getAllWarehouses();
      const principalWarehouse = warehouses.find(w => w.warehouseType === 'main');

      if (!principalWarehouse) {
        return res.status(400).json({ message: "No principal warehouse found" });
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
        return res.status(400).json({ message: "Invalid stock entry data" });
      }
      res.status(500).json({ message: "Failed to create stock entry" });
    }
  });

  // ============================================================
  // PRINCIPAL WAREHOUSE ROUTES (requiere autenticación)
  // ============================================================

  app.get("/api/principal-warehouse/:costCenter", requireAuth, async (req, res) => {
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

  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(user => ({ ...user, password: undefined })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", requireAuth, async (req, res) => {
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
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
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
      res.json({ ...user, password: undefined });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid user data" });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", requirePermission("users.manage"), async (req, res) => {
    try {
      const success = await storage.deleteUser(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.get("/api/users/role/:role", requireAuth, async (req, res) => {
    try {
      const users = await storage.getUsersByRole(req.params.role);
      res.json(users.map(user => ({ ...user, password: undefined })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users by role" });
    }
  });

  app.get("/api/project-managers", requireAuth, async (req, res) => {
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
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ message: "Failed to assign permissions" });
    }
  });

  app.get("/api/users/:id/permissions/:permission", requireAuth, async (req, res) => {
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
            role: "user",
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

  app.get("/api/ordenes-compra", requireAuth, async (req, res) => {
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

  app.get("/api/ordenes-compra/cost-centers", requireAuth, async (req, res) => {
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
  app.get("/api/ordenes-compra/search", requireAuth, async (req, res) => {
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
  app.get("/api/ordenes-compra/:numoc/cost-centers", requireAuth, async (req, res) => {
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
  app.get("/api/ordenes-compra/:numoc/lines", requireAuth, async (req, res) => {
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

  app.get("/api/units", requireAuth, async (req, res) => {
    try {
      const units = await storage.getAllUnits();
      res.json(units);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch units" });
    }
  });

  app.get("/api/units/:id", requireAuth, async (req, res) => {
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
      const unit = await storage.createUnit(validatedData);
      res.status(201).json(unit);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid unit data" });
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

  app.get("/api/categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.get("/api/categories/:id", requireAuth, async (req, res) => {
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
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid category data" });
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

  app.get("/api/brands", requireAuth, async (req, res) => {
    try {
      const brands = await storage.getAllBrands();
      res.json(brands);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch brands" });
    }
  });

  app.get("/api/brands/:id", requireAuth, async (req, res) => {
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
      const brand = await storage.createBrand(validatedData);
      res.status(201).json(brand);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid brand data" });
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

  app.get("/api/roles", requireAuth, async (req, res) => {
    try {
      const allRoles = await storage.getAllRoles();
      res.json(allRoles);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener roles" });
    }
  });

  app.get("/api/permissions", requireAuth, async (req, res) => {
    try {
      const allPermissions = await storage.getAllPermissions();
      res.json(allPermissions);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener permisos" });
    }
  });

  app.get("/api/roles/:id", requireAuth, async (req, res) => {
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
      await storage.updateRolePermissions(parseInt(req.params.id), validatedData.permissions);
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
