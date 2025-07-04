import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package } from "lucide-react";
import type { InventoryWithDetails } from "@shared/schema";

export default function WarehouseDetails() {
  const { id } = useParams();
  const warehouseId = id ? parseInt(id) : null;

  const { data: warehouse, isLoading: warehouseLoading } = useQuery({
    queryKey: [`/api/warehouses/${warehouseId}`],
    enabled: !!warehouseId,
  });

  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: [`/api/inventory/warehouse/${warehouseId}`],
    enabled: !!warehouseId,
  });

  if (warehouseLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Bodega no encontrada</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStockStatus = (item: InventoryWithDetails) => {
    if (item.quantity === 0) return { label: "Sin Stock", variant: "destructive" as const };
    return { label: "Disponible", variant: "default" as const };
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{warehouse.name}</h1>
        <p className="text-muted-foreground">Detalles de la bodega</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={warehouse.isActive ? "default" : "secondary"}>
              {warehouse.isActive ? "Activa" : "Inactiva"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ubicación</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{warehouse.location || "No especificada"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{inventory?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventario</CardTitle>
        </CardHeader>
        <CardContent>
          {inventoryLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Stock Actual</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory?.map((item: InventoryWithDetails) => {
                    const status = getStockStatus(item);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center mr-3">
                              <Package className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{item.product.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.product.sku}
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.quantity} unidades
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
