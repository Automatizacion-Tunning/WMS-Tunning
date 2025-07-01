import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertWarehouseSchema, insertProductSchema, 
  insertInventoryMovementSchema 
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

  const httpServer = createServer(app);
  return httpServer;
}
