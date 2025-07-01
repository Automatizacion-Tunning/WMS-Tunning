import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Trash2, MapPin, Building2, ChevronRight } from "lucide-react";
import WarehouseForm from "@/components/forms/WarehouseForm";
import type { Warehouse } from "@shared/schema";

export default function WarehouseManagement() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: warehouses, isLoading } = useQuery({
    queryKey: ["/api/warehouses"],
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Administración de Bodegas</h1>
          <p className="text-muted-foreground">Gestiona las bodegas del sistema</p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Bodega
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <WarehouseForm onSuccess={() => setIsCreateModalOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bodegas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Centro de Costos</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses
                  ?.sort((a: Warehouse, b: Warehouse) => {
                    // Mostrar bodega principal primero, luego sub-bodegas por centro de costos
                    if (a.warehouseType === 'main' && b.warehouseType === 'sub') return -1;
                    if (a.warehouseType === 'sub' && b.warehouseType === 'main') return 1;
                    return a.costCenter.localeCompare(b.costCenter);
                  })
                  .map((warehouse: Warehouse) => (
                  <TableRow key={warehouse.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                          {warehouse.warehouseType === 'main' ? 
                            <Building2 className="w-4 h-4 text-primary" /> : 
                            <MapPin className="w-4 h-4 text-primary" />
                          }
                        </div>
                        <div>
                          <p className="font-medium">
                            {warehouse.warehouseType === 'sub' && <ChevronRight className="w-3 h-3 inline mr-1" />}
                            {warehouse.name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {warehouse.costCenter}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={warehouse.warehouseType === 'main' ? "default" : "secondary"}>
                        {warehouse.warehouseType === 'main' ? 'Principal' : 'Sub-bodega'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {warehouse.location || "No especificada"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={warehouse.isActive ? "default" : "secondary"}>
                        {warehouse.isActive ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
