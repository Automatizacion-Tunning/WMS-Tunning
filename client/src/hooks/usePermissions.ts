import { useQuery } from "@tanstack/react-query";
import type { AuthPermissions } from "@shared/schema";

export function usePermissions() {
  const { data, isLoading } = useQuery<AuthPermissions>({
    queryKey: ["/api/auth/permissions"],
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: false,
  });

  const can = (permissionKey: string): boolean => {
    if (!data) return false;
    if (data.isAdmin) return true;
    return data.permissions.includes(permissionKey);
  };

  const canAny = (permissionKeys: string[]): boolean => {
    if (!data) return false;
    if (data.isAdmin) return true;
    return permissionKeys.some((key) => data.permissions.includes(key));
  };

  return {
    can,
    canAny,
    isAdmin: data?.isAdmin ?? false,
    roleCode: data?.roleCode ?? "",
    roleName: data?.roleName ?? "",
    permissions: data?.permissions ?? [],
    hierarchy: data?.hierarchy ?? 0,
    isLoading,
  };
}
