import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Shield,
  Plus,
  Save,
  Trash2,
  Users,
  Lock,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { apiRequest } from "@/lib/queryClient";
import type { Role, Permission, RoleWithPermissions, User } from "@shared/schema";

// Category display order for the permissions panel
const CATEGORY_ORDER = [
  "Dashboard",
  "Productos",
  "Inventario",
  "Bodegas",
  "Centros de Costo",
  "Ordenes",
  "Administracion",
];

export default function RolesManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canManageRoles = can("roles.manage");

  // --- State ---
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [pendingPermissions, setPendingPermissions] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [createForm, setCreateForm] = useState({
    code: "",
    name: "",
    description: "",
    hierarchy: 10,
  });

  // --- Queries ---
  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const { data: allPermissions = [], isLoading: permissionsLoading } = useQuery<Permission[]>({
    queryKey: ["/api/permissions"],
  });

  const { data: selectedRoleDetail, isLoading: roleDetailLoading } = useQuery<RoleWithPermissions>({
    queryKey: [`/api/roles/${selectedRoleId}`],
    enabled: selectedRoleId !== null,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // --- Derived data ---
  const userCountByRoleCode = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((user) => {
      const roleCode = user.role || "";
      counts[roleCode] = (counts[roleCode] || 0) + 1;
    });
    return counts;
  }, [users]);

  const permissionsByCategory = useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    allPermissions.forEach((perm) => {
      const cat = perm.category || "Otros";
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(perm);
    });
    // Sort categories according to predefined order, putting unknown categories at the end
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      const idxA = CATEGORY_ORDER.indexOf(a);
      const idxB = CATEGORY_ORDER.indexOf(b);
      const posA = idxA === -1 ? 999 : idxA;
      const posB = idxB === -1 ? 999 : idxB;
      return posA - posB;
    });
    const sorted: Record<string, Permission[]> = {};
    sortedKeys.forEach((key) => {
      sorted[key] = grouped[key];
    });
    return sorted;
  }, [allPermissions]);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? null,
    [roles, selectedRoleId]
  );

  // --- Sync pending permissions when role detail loads ---
  useEffect(() => {
    if (selectedRoleDetail) {
      const keys = new Set(selectedRoleDetail.permissions.map((p) => p.key));
      setPendingPermissions(keys);
      setHasChanges(false);
    }
  }, [selectedRoleDetail]);

  // --- Mutations ---
  const createRoleMutation = useMutation({
    mutationFn: async (data: { code: string; name: string; description?: string; hierarchy: number }) => {
      return await apiRequest("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({ title: "Rol creado", description: "El rol ha sido creado correctamente." });
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setIsCreateDialogOpen(false);
      setCreateForm({ code: "", name: "", description: "", hierarchy: 10 });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear rol",
        description: error.message || "No se pudo crear el rol.",
        variant: "destructive",
      });
    },
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissionKeys }: { roleId: number; permissionKeys: string[] }) => {
      return await apiRequest(`/api/roles/${roleId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionKeys }),
      });
    },
    onSuccess: () => {
      toast({ title: "Permisos actualizados", description: "Los permisos del rol han sido guardados." });
      if (selectedRoleId) {
        queryClient.invalidateQueries({ queryKey: [`/api/roles/${selectedRoleId}`] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al guardar permisos",
        description: error.message || "No se pudieron actualizar los permisos.",
        variant: "destructive",
      });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      return await apiRequest(`/api/roles/${roleId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: "Rol eliminado", description: "El rol ha sido eliminado correctamente." });
      if (selectedRoleId === deleteTarget?.id) {
        setSelectedRoleId(null);
        setPendingPermissions(new Set());
        setHasChanges(false);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setDeleteTarget(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar rol",
        description: error.message || "No se pudo eliminar el rol.",
        variant: "destructive",
      });
      setDeleteTarget(null);
    },
  });

  // --- Handlers ---
  const handleTogglePermission = (permKey: string) => {
    setPendingPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permKey)) {
        next.delete(permKey);
      } else {
        next.add(permKey);
      }
      return next;
    });
    setHasChanges(true);
  };

  const handleToggleCategory = (category: string, checked: boolean) => {
    const categoryPerms = permissionsByCategory[category] || [];
    setPendingPermissions((prev) => {
      const next = new Set(prev);
      categoryPerms.forEach((p) => {
        if (checked) {
          next.add(p.key);
        } else {
          next.delete(p.key);
        }
      });
      return next;
    });
    setHasChanges(true);
  };

  const isCategoryFullySelected = (category: string): boolean => {
    const categoryPerms = permissionsByCategory[category] || [];
    if (categoryPerms.length === 0) return false;
    return categoryPerms.every((p) => pendingPermissions.has(p.key));
  };

  const isCategoryPartiallySelected = (category: string): boolean => {
    const categoryPerms = permissionsByCategory[category] || [];
    if (categoryPerms.length === 0) return false;
    const selectedCount = categoryPerms.filter((p) => pendingPermissions.has(p.key)).length;
    return selectedCount > 0 && selectedCount < categoryPerms.length;
  };

  const handleSavePermissions = () => {
    if (!selectedRoleId) return;
    updatePermissionsMutation.mutate({
      roleId: selectedRoleId,
      permissionKeys: Array.from(pendingPermissions),
    });
  };

  const handleCreateRole = () => {
    const payload: { code: string; name: string; description?: string; hierarchy: number } = {
      code: createForm.code.trim(),
      name: createForm.name.trim(),
      hierarchy: createForm.hierarchy,
    };
    if (createForm.description.trim()) {
      payload.description = createForm.description.trim();
    }
    createRoleMutation.mutate(payload);
  };

  const handleSelectRole = (roleId: number) => {
    if (hasChanges && selectedRoleId !== null) {
      // Discard unsaved changes silently when switching roles
    }
    setSelectedRoleId(roleId);
    setHasChanges(false);
  };

  const canDeleteRole = (role: Role): boolean => {
    if (role.isSystem) return false;
    const count = userCountByRoleCode[role.code] || 0;
    return count === 0;
  };

  const getHierarchyColor = (hierarchy: number): string => {
    if (hierarchy <= 3) return "bg-red-100 text-red-700 border-red-200";
    if (hierarchy <= 6) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-blue-100 text-blue-700 border-blue-200";
  };

  // --- Loading state ---
  if (rolesLoading || permissionsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Gestion de Roles</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Gestion de Roles</h1>
        </div>
        {canManageRoles && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Crear Rol
          </Button>
        )}
      </div>

      {/* 2-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT PANEL - Roles list */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Roles ({roles.length})
          </h2>
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="space-y-2 pr-3">
              {roles
                .sort((a, b) => a.hierarchy - b.hierarchy)
                .map((role) => {
                  const userCount = userCountByRoleCode[role.code] || 0;
                  const isSelected = selectedRoleId === role.id;
                  return (
                    <Card
                      key={role.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isSelected
                          ? "ring-2 ring-primary shadow-md"
                          : "hover:border-primary/30"
                      }`}
                      onClick={() => handleSelectRole(role.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm truncate">
                                {role.name}
                              </span>
                              {isSelected && (
                                <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground font-mono">
                              {role.code}
                            </p>
                            {role.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {role.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getHierarchyColor(role.hierarchy)}`}
                          >
                            Nivel {role.hierarchy}
                          </Badge>
                          {role.isSystem && (
                            <Badge variant="secondary" className="text-xs">
                              <Lock className="w-3 h-3 mr-1" />
                              Sistema
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            {userCount} {userCount === 1 ? "usuario" : "usuarios"}
                          </Badge>
                        </div>
                        {canManageRoles && canDeleteRole(role) && (
                          <div className="mt-3 pt-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(role);
                              }}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Eliminar
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </ScrollArea>
        </div>

        {/* RIGHT PANEL - Permissions */}
        <div className="lg:col-span-2">
          {selectedRoleId === null ? (
            <Card className="h-[calc(100vh-220px)] flex items-center justify-center">
              <CardContent className="text-center py-16">
                <Shield className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  Selecciona un rol
                </h3>
                <p className="text-sm text-muted-foreground/70 max-w-sm">
                  Haz clic en un rol del panel izquierdo para ver y editar sus permisos asignados.
                </p>
              </CardContent>
            </Card>
          ) : roleDetailLoading ? (
            <Card className="h-[calc(100vh-220px)]">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <div className="grid grid-cols-2 gap-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[calc(100vh-220px)] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Permisos de &quot;{selectedRole?.name}&quot;
                    </CardTitle>
                    {selectedRole?.isSystem && (
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Este es un rol de sistema. Los permisos son de solo lectura.
                      </p>
                    )}
                  </div>
                  {hasChanges && !selectedRole?.isSystem && canManageRoles && (
                    <Button
                      onClick={handleSavePermissions}
                      disabled={updatePermissionsMutation.isPending}
                    >
                      {updatePermissionsMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Guardar cambios
                    </Button>
                  )}
                </div>
              </CardHeader>
              <ScrollArea className="flex-1">
                <CardContent className="space-y-6 pb-6">
                  {Object.entries(permissionsByCategory).map(([category, perms]) => {
                    const allSelected = isCategoryFullySelected(category);
                    const partiallySelected = isCategoryPartiallySelected(category);
                    const isDisabled = !!selectedRole?.isSystem || !canManageRoles;

                    return (
                      <div key={category}>
                        <div className="flex items-center gap-3 mb-3">
                          <Checkbox
                            id={`cat-${category}`}
                            checked={allSelected ? true : partiallySelected ? "indeterminate" : false}
                            onCheckedChange={(checked) => {
                              handleToggleCategory(category, !!checked);
                            }}
                            disabled={isDisabled}
                          />
                          <Label
                            htmlFor={`cat-${category}`}
                            className="text-sm font-semibold cursor-pointer select-none"
                          >
                            {category}
                          </Label>
                          <span className="text-xs text-muted-foreground">
                            ({perms.filter((p) => pendingPermissions.has(p.key)).length}/{perms.length})
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            Seleccionar todos
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-7">
                          {perms.map((perm) => (
                            <div
                              key={perm.id}
                              className={`flex items-center gap-2 rounded-md border px-3 py-2 transition-colors ${
                                pendingPermissions.has(perm.key)
                                  ? "bg-primary/5 border-primary/20"
                                  : "bg-transparent border-border"
                              }`}
                            >
                              <Checkbox
                                id={`perm-${perm.key}`}
                                checked={pendingPermissions.has(perm.key)}
                                onCheckedChange={() => handleTogglePermission(perm.key)}
                                disabled={isDisabled}
                              />
                              <Label
                                htmlFor={`perm-${perm.key}`}
                                className="text-sm cursor-pointer select-none flex-1"
                              >
                                {perm.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                        <Separator className="mt-4" />
                      </div>
                    );
                  })}

                  {Object.keys(permissionsByCategory).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay permisos definidos en el sistema.
                    </div>
                  )}
                </CardContent>
              </ScrollArea>
            </Card>
          )}
        </div>
      </div>

      {/* Create Role Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Rol</DialogTitle>
            <DialogDescription>
              Define un nuevo rol para asignar permisos a los usuarios del sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="role-code">Codigo</Label>
              <Input
                id="role-code"
                placeholder="ej: supervisor_bodega"
                value={createForm.code}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Solo minusculas, numeros y guion bajo.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-name">Nombre</Label>
              <Input
                id="role-name"
                placeholder="ej: Supervisor de Bodega"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-description">Descripcion</Label>
              <Textarea
                id="role-description"
                placeholder="Descripcion opcional del rol..."
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-hierarchy">Nivel de jerarquia</Label>
              <Input
                id="role-hierarchy"
                type="number"
                min={0}
                max={99}
                value={createForm.hierarchy}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    hierarchy: parseInt(e.target.value, 10) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Menor numero = mayor jerarquia. Rango: 0-99.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={createRoleMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateRole}
              disabled={
                createRoleMutation.isPending ||
                !createForm.code.trim() ||
                !createForm.name.trim()
              }
            >
              {createRoleMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {createRoleMutation.isPending ? "Creando..." : "Crear Rol"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar rol &quot;{deleteTarget?.name}&quot;</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. El rol sera eliminado permanentemente del sistema.
              Solo se pueden eliminar roles que no sean de sistema y que no tengan usuarios asignados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRoleMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteRoleMutation.mutate(deleteTarget.id);
                }
              }}
              disabled={deleteRoleMutation.isPending}
            >
              {deleteRoleMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
