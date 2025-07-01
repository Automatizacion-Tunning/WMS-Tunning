import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Shield, Eye, Edit, Trash2 } from "lucide-react";
import type { User as UserType } from "@shared/schema";

const permissions = [
  { key: "read_products", label: "Ver Productos", icon: Eye },
  { key: "edit_products", label: "Editar Productos", icon: Edit },
  { key: "delete_products", label: "Eliminar Productos", icon: Trash2 },
  { key: "read_warehouses", label: "Ver Bodegas", icon: Eye },
  { key: "edit_warehouses", label: "Editar Bodegas", icon: Edit },
  { key: "delete_warehouses", label: "Eliminar Bodegas", icon: Trash2 },
  { key: "manage_users", label: "Gestionar Usuarios", icon: User },
  { key: "view_reports", label: "Ver Reportes", icon: Eye },
];

export default function UserPermissions() {
  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Card>
            <CardContent className="p-6">
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getRolePermissions = (role: string) => {
    switch (role) {
      case "admin":
        return permissions.map(p => p.key);
      case "manager":
        return ["read_products", "edit_products", "read_warehouses", "edit_warehouses", "view_reports"];
      default:
        return ["read_products", "read_warehouses"];
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "manager":
        return "Gerente";
      case "user":
        return "Usuario";
      default:
        return role;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Permisos de Usuario</h1>
        <p className="text-muted-foreground">Configura los permisos del sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Usuarios por Rol</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user: UserType) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <p className="font-medium">{user.username}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Permissions Matrix */}
        <Card>
          <CardHeader>
            <CardTitle>Matriz de Permisos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground">
                <div>Permiso</div>
                <div className="text-center">Admin</div>
                <div className="text-center">Gerente</div>
                <div className="text-center">Usuario</div>
              </div>
              
              {permissions.map((permission) => {
                const Icon = permission.icon;
                return (
                  <div key={permission.key} className="grid grid-cols-4 gap-4 items-center py-2 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{permission.label}</span>
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={getRolePermissions("admin").includes(permission.key)}
                        disabled
                      />
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={getRolePermissions("manager").includes(permission.key)}
                        disabled
                      />
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={getRolePermissions("user").includes(permission.key)}
                        disabled
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roles Description */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Administrador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Acceso completo al sistema. Puede gestionar usuarios, productos, bodegas y generar reportes.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-green-600" />
              Gerente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Puede gestionar productos y bodegas, y generar reportes. No puede gestionar usuarios.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Usuario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Solo lectura. Puede ver productos y bodegas, pero no puede realizar modificaciones.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
