import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, Edit, Trash2, Shield, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { USER_ROLES, PERMISSIONS, type User } from "@shared/schema";
import UserForm from "@/components/forms/UserForm";
import UserPermissionsModal from "@/components/modals/UserPermissionsModal";

export default function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<User | null>(null);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest(`/api/users/${userId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido desactivado correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el usuario.",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === "" || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case USER_ROLES.ADMIN:
        return "bg-red-100 text-red-800";
      case USER_ROLES.PROJECT_MANAGER:
        return "bg-blue-100 text-blue-800";
      case USER_ROLES.WAREHOUSE_OPERATOR:
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case USER_ROLES.ADMIN:
        return "Administrador";
      case USER_ROLES.PROJECT_MANAGER:
        return "Jefe de Proyecto";
      case USER_ROLES.WAREHOUSE_OPERATOR:
        return "Operador de Bodega";
      default:
        return "Usuario";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            </DialogHeader>
            <UserForm
              onSuccess={() => {
                setIsCreateModalOpen(false);
                queryClient.invalidateQueries({ queryKey: ["/api/users"] });
              }}
              onCancel={() => setIsCreateModalOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nombre de usuario, nombre o apellido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2 border rounded-md"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="">Todos los roles</option>
              <option value={USER_ROLES.ADMIN}>Administrador</option>
              <option value={USER_ROLES.PROJECT_MANAGER}>Jefe de Proyecto</option>
              <option value={USER_ROLES.WAREHOUSE_OPERATOR}>Operador de Bodega</option>
              <option value={USER_ROLES.USER}>Usuario</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuarios */}
      <div className="grid gap-4">
        {isLoading ? (
          <div>Cargando usuarios...</div>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {user.firstName && user.lastName ? 
                          `${user.firstName} ${user.lastName}` : 
                          user.username
                        }
                      </h3>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                      {user.email && (
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      )}
                      {user.costCenter && (
                        <div className="flex items-center gap-1 mt-1">
                          <Building2 className="w-3 h-3" />
                          <span className="text-xs text-muted-foreground">{user.costCenter}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {getRoleDisplayName(user.role)}
                    </Badge>
                    
                    {!user.isActive && (
                      <Badge variant="destructive">Inactivo</Badge>
                    )}
                    
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPermissionsUser(user)}
                      >
                        <Shield className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(user.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de edición */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <UserForm
              user={editingUser}
              onSuccess={() => {
                setEditingUser(null);
                queryClient.invalidateQueries({ queryKey: ["/api/users"] });
              }}
              onCancel={() => setEditingUser(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de permisos */}
      <UserPermissionsModal
        user={permissionsUser}
        onClose={() => setPermissionsUser(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
          setPermissionsUser(null);
        }}
      />
    </div>
  );
}