import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PERMISSIONS, type User, type Warehouse } from "@shared/schema";

interface UserPermissionsModalProps {
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserPermissionsModal({ user, onClose, onSuccess }: UserPermissionsModalProps) {
  const { toast } = useToast();
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedWarehouses, setSelectedWarehouses] = useState<number[]>([]);

  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });

  useEffect(() => {
    if (user) {
      setSelectedPermissions(user.permissions || []);
      setSelectedWarehouses(user.managedWarehouses || []);
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      
      return await apiRequest(`/api/users/${user.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permissions: selectedPermissions,
          managedWarehouses: selectedWarehouses,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Permisos actualizados",
        description: "Los permisos del usuario han sido actualizados correctamente.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudieron actualizar los permisos.",
        variant: "destructive",
      });
    },
  });

  const permissionGroups = {
    "Gestión de Usuarios": [
      { key: PERMISSIONS.MANAGE_USERS, label: "Gestionar usuarios" },
      { key: PERMISSIONS.VIEW_USERS, label: "Ver usuarios" },
    ],
    "Gestión de Productos": [
      { key: PERMISSIONS.CREATE_PRODUCTS, label: "Crear productos" },
      { key: PERMISSIONS.EDIT_PRODUCTS, label: "Editar productos" },
      { key: PERMISSIONS.DELETE_PRODUCTS, label: "Eliminar productos" },
      { key: PERMISSIONS.VIEW_PRODUCTS, label: "Ver productos" },
    ],
    "Gestión de Inventario": [
      { key: PERMISSIONS.CREATE_INVENTORY, label: "Crear inventario" },
      { key: PERMISSIONS.EDIT_INVENTORY, label: "Editar inventario" },
      { key: PERMISSIONS.VIEW_INVENTORY, label: "Ver inventario" },
    ],
    "Gestión de Bodegas": [
      { key: PERMISSIONS.CREATE_WAREHOUSES, label: "Crear bodegas" },
      { key: PERMISSIONS.EDIT_WAREHOUSES, label: "Editar bodegas" },
      { key: PERMISSIONS.DELETE_WAREHOUSES, label: "Eliminar bodegas" },
      { key: PERMISSIONS.VIEW_WAREHOUSES, label: "Ver bodegas" },
    ],
    "Órdenes de Transferencia": [
      { key: PERMISSIONS.CREATE_TRANSFER_ORDERS, label: "Crear órdenes" },
      { key: PERMISSIONS.APPROVE_TRANSFER_ORDERS, label: "Aprobar órdenes" },
      { key: PERMISSIONS.VIEW_TRANSFER_ORDERS, label: "Ver órdenes" },
    ],
    "Dashboard y Reportes": [
      { key: PERMISSIONS.VIEW_DASHBOARD, label: "Ver dashboard" },
      { key: PERMISSIONS.VIEW_REPORTS, label: "Ver reportes" },
    ],
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permission) 
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const toggleWarehouse = (warehouseId: number) => {
    setSelectedWarehouses(prev => 
      prev.includes(warehouseId) 
        ? prev.filter(w => w !== warehouseId)
        : [...prev, warehouseId]
    );
  };

  if (!user) return null;

  return (
    <Dialog open={!!user} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Permisos de Usuario - {user.firstName} {user.lastName} (@{user.username})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del usuario */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Usuario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Badge variant="outline">{user.role}</Badge>
                {user.costCenter && (
                  <Badge variant="secondary">{user.costCenter}</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Permisos por categoría */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(permissionGroups).map(([groupName, permissions]) => (
              <Card key={groupName}>
                <CardHeader>
                  <CardTitle className="text-lg">{groupName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {permissions.map(({ key, label }) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={selectedPermissions.includes(key)}
                        onCheckedChange={() => togglePermission(key)}
                      />
                      <label htmlFor={key} className="text-sm cursor-pointer">
                        {label}
                      </label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bodegas gestionadas */}
          {user.role === 'project_manager' && (
            <Card>
              <CardHeader>
                <CardTitle>Bodegas Gestionadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {warehouses.map((warehouse) => (
                    <div key={warehouse.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`warehouse-${warehouse.id}`}
                        checked={selectedWarehouses.includes(warehouse.id)}
                        onCheckedChange={() => toggleWarehouse(warehouse.id)}
                      />
                      <label 
                        htmlFor={`warehouse-${warehouse.id}`} 
                        className="text-sm cursor-pointer"
                      >
                        {warehouse.name}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Guardando..." : "Guardar Permisos"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}