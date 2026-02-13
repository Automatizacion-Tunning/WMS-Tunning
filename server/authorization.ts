import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { users, roles, permissions, rolePermissions } from "@shared/schema";
import type { Request, Response, NextFunction } from "express";

// ============================================================
// AuthContext interface
// ============================================================

export interface AuthContext {
  userId: number;
  roleCode: string;
  roleName: string;
  isAdmin: boolean;
  permissions: string[];
  hierarchy: number;
}

// ============================================================
// In-memory cache with 5-minute TTL
// ============================================================

interface CacheEntry {
  context: AuthContext;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const permissionCache = new Map<number, CacheEntry>();

// ============================================================
// getUserPermissions
// ============================================================

export const getUserPermissions = async (userId: number): Promise<AuthContext> => {
  // Check cache first
  const cached = permissionCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.context;
  }

  // Query user's role code from users table
  const [user] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    const emptyContext: AuthContext = {
      userId,
      roleCode: "sin_acceso",
      roleName: "Sin Acceso",
      isAdmin: false,
      permissions: [],
      hierarchy: 0,
    };
    setCacheEntry(userId, emptyContext);
    return emptyContext;
  }

  const roleCode = user.role;

  // Admin shortcut: full permissions
  if (roleCode === "admin") {
    const adminContext: AuthContext = {
      userId,
      roleCode: "admin",
      roleName: "Administrador",
      isAdmin: true,
      permissions: ["*"],
      hierarchy: 100,
    };
    setCacheEntry(userId, adminContext);
    return adminContext;
  }

  // Look up the role in the roles table
  const [roleRow] = await db
    .select({
      id: roles.id,
      code: roles.code,
      name: roles.name,
      hierarchy: roles.hierarchy,
    })
    .from(roles)
    .where(eq(roles.code, roleCode))
    .limit(1);

  if (!roleRow) {
    // Role not found in roles table -> sin_acceso behavior
    const noRoleContext: AuthContext = {
      userId,
      roleCode,
      roleName: roleCode,
      isAdmin: false,
      permissions: [],
      hierarchy: 0,
    };
    setCacheEntry(userId, noRoleContext);
    return noRoleContext;
  }

  // Join role_permissions -> permissions to get permission keys
  const permissionRows = await db
    .select({ key: permissions.key })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleRow.id));

  const permissionKeys = permissionRows.map((r) => r.key);

  const context: AuthContext = {
    userId,
    roleCode: roleRow.code,
    roleName: roleRow.name,
    isAdmin: false,
    permissions: permissionKeys,
    hierarchy: roleRow.hierarchy,
  };

  setCacheEntry(userId, context);
  return context;
};

// ============================================================
// Cache helpers
// ============================================================

const setCacheEntry = (userId: number, context: AuthContext): void => {
  permissionCache.set(userId, {
    context,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
};

export const clearUserCache = (userId: number): void => {
  permissionCache.delete(userId);
};

export const clearAllCache = (): void => {
  permissionCache.clear();
};

// ============================================================
// Middleware: requirePermission (ANY of the listed permissions)
// ============================================================

export const requirePermission = (...permissionKeys: string[]) => {
  return async (req: any, res: Response, next: NextFunction) => {
    const userId = req.session?.userId as number | undefined;
    if (!userId) {
      return res.status(401).json({ message: "No autenticado" });
    }

    try {
      const authCtx = await getUserPermissions(userId);

      // Admins pass through
      if (authCtx.isAdmin) {
        (req as any).authContext = authCtx;
        return next();
      }

      // Check if user has ANY of the required permissions
      const hasPermission = permissionKeys.some((key) =>
        authCtx.permissions.includes(key)
      );

      if (!hasPermission) {
        return res.status(403).json({
          message: "No tiene permisos para realizar esta accion",
          required: permissionKeys,
          current: authCtx.permissions,
        });
      }

      (req as any).authContext = authCtx;
      return next();
    } catch (error) {
      console.error("Error en requirePermission:", error);
      return res.status(500).json({ message: "Error verificando permisos" });
    }
  };
};

// ============================================================
// Middleware: requireAllPermissions (ALL of the listed permissions)
// ============================================================

export const requireAllPermissions = (...permissionKeys: string[]) => {
  return async (req: any, res: Response, next: NextFunction) => {
    const userId = req.session?.userId as number | undefined;
    if (!userId) {
      return res.status(401).json({ message: "No autenticado" });
    }

    try {
      const authCtx = await getUserPermissions(userId);

      // Admins pass through
      if (authCtx.isAdmin) {
        (req as any).authContext = authCtx;
        return next();
      }

      // Check if user has ALL of the required permissions
      const hasAll = permissionKeys.every((key) =>
        authCtx.permissions.includes(key)
      );

      if (!hasAll) {
        const missing = permissionKeys.filter(
          (key) => !authCtx.permissions.includes(key)
        );
        return res.status(403).json({
          message: "No tiene todos los permisos requeridos",
          required: permissionKeys,
          missing,
          current: authCtx.permissions,
        });
      }

      (req as any).authContext = authCtx;
      return next();
    } catch (error) {
      console.error("Error en requireAllPermissions:", error);
      return res.status(500).json({ message: "Error verificando permisos" });
    }
  };
};

// ============================================================
// Middleware: requireAdmin (only admin role)
// ============================================================

export const requireAdmin = () => {
  return async (req: any, res: Response, next: NextFunction) => {
    const userId = req.session?.userId as number | undefined;
    if (!userId) {
      return res.status(401).json({ message: "No autenticado" });
    }

    try {
      const authCtx = await getUserPermissions(userId);

      if (!authCtx.isAdmin) {
        return res.status(403).json({
          message: "Se requiere rol de administrador",
        });
      }

      (req as any).authContext = authCtx;
      return next();
    } catch (error) {
      console.error("Error en requireAdmin:", error);
      return res.status(500).json({ message: "Error verificando permisos" });
    }
  };
};
