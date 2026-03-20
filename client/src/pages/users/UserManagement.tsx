import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Pencil, Trash2, Shield, Building2, RefreshCw, UserPlus, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type User, type Role } from "@shared/schema";
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
  const [isGenerateConfirmOpen, setIsGenerateConfirmOpen] = useState(false);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleCode }: { userId: number; roleCode: string }) => {
      return await apiRequest(`/api/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleCode }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Rol asignado",
        description: "El rol del usuario ha sido actualizado.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo asignar el rol.",
        variant: "destructive",
      });
    },
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

  const generateAllMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/users/generate-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    },
    onSuccess: (data: any) => {
      setIsGenerateConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuarios generados",
        description: data.message || `Se crearon ${data.created} usuarios. ${data.skipped} ya existían.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudieron generar los usuarios.",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.ficha?.includes(searchTerm);
    const matchesRole = selectedRole === "" || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (roleCode: string) => {
    const role = roles.find((r) => r.code === roleCode);
    const h = role?.hierarchy ?? 0;
    if (h >= 100) return "bg-red-100 text-red-800";
    if (h >= 50) return "bg-blue-100 text-blue-800";
    if (h >= 30) return "bg-green-100 text-green-800";
    if (h >= 15) return "bg-amber-100 text-amber-800";
    return "bg-gray-100 text-gray-800";
  };

  const getRoleDisplayName = (roleCode: string) => {
    const role = roles.find((r) => r.code === roleCode);
    return role?.name ?? roleCode;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Gestion de Usuarios</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsGenerateConfirmOpen(true)}
            disabled={generateAllMutation.isPending}
          >
            {generateAllMutation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4 mr-2" />
            )}
            {generateAllMutation.isPending ? "Generando..." : "Generar Todos los Usuarios"}
          </Button>
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
                placeholder="Buscar por nombre, usuario, ficha..."
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
              {roles.map((r) => (
                <option key={r.code} value={r.code}>{r.name}</option>
              ))}
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
                      <p className="font-semibold">
                        {user.firstName && user.lastName ?
                          `${user.firstName} ${user.lastName}` :
                          user.username
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                      {user.email && (
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        {user.ficha && (
                          <div className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            <span className="text-xs text-muted-foreground">Ficha: {user.ficha}</span>
                          </div>
                        )}
                        {user.costCenter && (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            <span className="text-xs text-muted-foreground">{user.costCenter}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={user.role}
                      onValueChange={(val) => assignRoleMutation.mutate({ userId: user.id, roleCode: val })}
                    >
                      <SelectTrigger className="w-[180px]">
                        <div className="flex items-center gap-2">
                          <Badge className={`${getRoleBadgeColor(user.role)} text-xs`}>
                            {getRoleDisplayName(user.role)}
                          </Badge>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r.code} value={r.code}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {!user.isActive && (
                      <Badge variant="destructive">Inactivo</Badge>
                    )}

                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                        title="Editar usuario"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (window.confirm("¿Está seguro que desea eliminar este usuario?")) {
                            deleteMutation.mutate(user.id);
                          }
                        }}
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

      {/* Modal de edicion */}
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

      {/* Modal de confirmacion para generar usuarios */}
      <Dialog open={isGenerateConfirmOpen} onOpenChange={setIsGenerateConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar Todos los Usuarios</DialogTitle>
            <DialogDescription>
              Se crearan cuentas de usuario para todos los trabajadores activos registrados en la base de datos de Tunning.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <p className="font-semibold mb-2">Configuracion por defecto:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Username: primera letra del nombre + apellido + ficha (ej: jperez_12345)</li>
                <li>Contrasena: los 4 primeros digitos de la ficha</li>
                <li>Rol: Usuario (sin permisos)</li>
                <li>Los usuarios que ya existen seran omitidos</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => generateAllMutation.mutate()}
              disabled={generateAllMutation.isPending}
            >
              {generateAllMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Generar Usuarios
                </>
              )}
            </Button>
          </DialogFooter>
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
