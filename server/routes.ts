import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertWarehouseSchema, insertProductSchema, 
  insertInventoryMovementSchema, insertTransferOrderSchema,
  transferRequestSchema, stockEntrySchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard routes
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  app.get("/api/dashboard/recent-inventory", async (req, res) => {
    try {
      const recentInventory = await storage.getAllInventory();
      res.json(recentInventory.slice(0, 10));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent inventory" });
    }
  });

  app.get("/api/dashboard/low-stock", async (req, res) => {
    try {
      const lowStockItems = await storage.getLowStockItems();
      res.json(lowStockItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch low stock items" });
    }
  });

  // Warehouse routes
  app.get("/api/warehouses", async (req, res) => {
    try {
      const warehouses = await storage.getAllWarehouses();
      res.json(warehouses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch warehouses" });
    }
  });

  app.get("/api/warehouses/:id", async (req, res) => {
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

  app.post("/api/warehouses", async (req, res) => {
    try {
      const validatedData = insertWarehouseSchema.parse(req.body);
      const warehouse = await storage.createWarehouse(validatedData);
      res.status(201).json(warehouse);
    } catch (error) {
      res.status(400).json({ message: "Invalid warehouse data", error });
    }
  });

  app.put("/api/warehouses/:id", async (req, res) => {
    try {
      const validatedData = insertWarehouseSchema.partial().parse(req.body);
      const warehouse = await storage.updateWarehouse(parseInt(req.params.id), validatedData);
      if (!warehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }
      res.json(warehouse);
    } catch (error) {
      res.status(400).json({ message: "Invalid warehouse data", error });
    }
  });

  app.delete("/api/warehouses/:id", async (req, res) => {
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
  app.post("/api/cost-centers", async (req, res) => {
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

  // Product routes
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
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

  app.post("/api/products", async (req, res) => {
    try {
      const validatedData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ message: "Invalid product data", error });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const validatedData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(parseInt(req.params.id), validatedData);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(400).json({ message: "Invalid product data", error });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
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

  // Search product by barcode
  app.get("/api/products/barcode/:barcode", async (req, res) => {
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

  // Inventory routes
  app.get("/api/inventory", async (req, res) => {
    try {
      const inventory = await storage.getAllInventory();
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  app.get("/api/inventory/warehouse/:warehouseId", async (req, res) => {
    try {
      const inventory = await storage.getInventoryByWarehouse(parseInt(req.params.warehouseId));
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch warehouse inventory" });
    }
  });

  app.get("/api/inventory/product/:productId", async (req, res) => {
    try {
      const inventory = await storage.getInventoryByProduct(parseInt(req.params.productId));
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product inventory" });
    }
  });

  // Inventory movement routes
  app.get("/api/inventory-movements", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const movements = await storage.getInventoryMovements(limit);
      res.json(movements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory movements" });
    }
  });

  app.post("/api/inventory-movements", async (req, res) => {
    try {
      const validatedData = insertInventoryMovementSchema.parse(req.body);
      const movement = await storage.createInventoryMovement(validatedData);
      res.status(201).json(movement);
    } catch (error) {
      res.status(400).json({ message: "Invalid movement data", error });
    }
  });

  app.get("/api/inventory-movements/product/:productId", async (req, res) => {
    try {
      const movements = await storage.getInventoryMovementsByProduct(parseInt(req.params.productId));
      res.json(movements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product movements" });
    }
  });

  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data", error });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const validatedData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(parseInt(req.params.id), validatedData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data", error });
    }
  });

  // Transfer Orders routes
  app.get("/api/transfer-orders", async (req, res) => {
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

  app.get("/api/transfer-orders/:id", async (req, res) => {
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

  app.post("/api/transfer-orders", async (req, res) => {
    try {
      const validatedData = transferRequestSchema.parse(req.body);
      
      // Generate order number
      const orderNumber = await storage.generateOrderNumber();
      
      // Find project manager for the cost center (for now, use first user)
      const users = await storage.getAllUsers();
      const projectManager = users.find(u => u.role === 'project_manager') || users[0];
      
      const orderData = {
        orderNumber,
        productId: validatedData.productId,
        quantity: validatedData.quantity,
        sourceWarehouseId: validatedData.sourceWarehouseId,
        destinationWarehouseId: validatedData.destinationWarehouseId,
        costCenter: validatedData.costCenter,
        requesterId: 1, // TODO: Get from auth context
        projectManagerId: projectManager?.id,
        status: 'pending' as const,
        notes: validatedData.notes,
      };

      const order = await storage.createTransferOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      res.status(400).json({ message: "Invalid transfer order data", error });
    }
  });

  app.patch("/api/transfer-orders/:id/status", async (req, res) => {
    try {
      const { status, projectManagerId } = req.body;
      
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'approved' or 'rejected'" });
      }

      const order = await storage.updateTransferOrderStatus(
        parseInt(req.params.id), 
        status, 
        projectManagerId
      );
      
      if (!order) {
        return res.status(404).json({ message: "Transfer order not found" });
      }
      
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to update transfer order status" });
    }
  });

  // Stock Entry routes (for initial product stock to principal warehouse)
  app.post("/api/stock-entry", async (req, res) => {
    try {
      const validatedData = stockEntrySchema.parse(req.body);
      
      // Get the product to check if it requires serial numbers
      const product = await storage.getProduct(validatedData.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Validate serial numbers if required
      if (product.requiresSerial && (!validatedData.serialNumbers || validatedData.serialNumbers.length !== validatedData.quantity)) {
        return res.status(400).json({ 
          message: `This product requires serial numbers. Please provide ${validatedData.quantity} serial numbers.` 
        });
      }

      // Get the principal warehouse for the product's cost center
      // For now, use the first warehouse marked as 'main'
      const warehouses = await storage.getAllWarehouses();
      const principalWarehouse = warehouses.find(w => w.warehouseType === 'main');
      
      if (!principalWarehouse) {
        return res.status(400).json({ message: "No principal warehouse found" });
      }

      // Get current price for the product
      const currentDate = new Date();
      const currentPrice = await storage.getCurrentProductPrice(validatedData.productId);
      const appliedPrice = currentPrice?.price ? parseFloat(currentPrice.price) : 0;

      // Create inventory movement
      const movement = await storage.createInventoryMovement({
        productId: validatedData.productId,
        warehouseId: principalWarehouse.id,
        movementType: 'in',
        quantity: validatedData.quantity,
        appliedPrice: appliedPrice.toString(),
        reason: validatedData.reason || 'Ingreso inicial a bodega principal',
        userId: 1, // TODO: Get from auth context
      });

      // Create serial numbers if required
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
      res.status(400).json({ message: "Invalid stock entry data", error });
    }
  });

  // Principal warehouse routes
  app.get("/api/principal-warehouse/:costCenter", async (req, res) => {
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

  app.post("/api/principal-warehouse", async (req, res) => {
    try {
      const { costCenter, location } = req.body;
      if (!costCenter) {
        return res.status(400).json({ message: "Cost center is required" });
      }
      
      const warehouse = await storage.createPrincipalWarehouse(costCenter, location);
      res.status(201).json(warehouse);
    } catch (error) {
      res.status(400).json({ message: "Failed to create principal warehouse", error });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
