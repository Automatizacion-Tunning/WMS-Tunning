import { storage } from "./storage";

/**
 * Centros de costo permitidos para un usuario.
 *  - admin           => undefined  (sentinel: sin filtro, ve todos)
 *  - project_manager
 *    warehouse_operator
 *    viewer          => string[]   (CCs derivados de managedWarehouses o user.costCenter)
 *  - sin permisos    => []         (no ve ninguno)
 *
 * Mantiene la firma usada en server/routes.ts antes del refactor.
 */
export async function getAllowedCostCenters(
  userId: number
): Promise<string[] | undefined> {
  const user = await storage.getUser(userId);
  if (!user) return [];
  if (user.role === "admin") return undefined;

  if (user.managedWarehouses?.length) {
    return await storage.getCostCentersByWarehouses(user.managedWarehouses);
  }
  if (user.costCenter) return [user.costCenter];
  return [];
}

/**
 * Devuelve true si el usuario tiene acceso al CC indicado.
 * Centraliza la regla "admin pasa siempre, otros deben tenerlo en allowed".
 */
export function userCanAccessCostCenter(
  allowed: string[] | undefined,
  costCenter: string
): boolean {
  if (allowed === undefined) return true;
  return allowed.includes(costCenter);
}
