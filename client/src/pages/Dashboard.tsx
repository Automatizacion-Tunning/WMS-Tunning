import { useQuery } from "@tanstack/react-query";
import { 
  Package, 
  Warehouse, 
  AlertTriangle, 
  DollarSign,
  TrendingUp,
  CheckCircle,
  Edit,
  Trash2,
  Plus,
  BarChart3,
  Download,
  InfoIcon
} from "lucide-react";
import MetricCard from "@/components/ui/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { InventoryWithDetails } from "@shared/schema";

export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: recentInventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ["/api/dashboard/recent-inventory"],
  });

  const { data: lowStockItems, isLoading: lowStockLoading } = useQuery({
    queryKey: ["/api/dashboard/low-stock"],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(value);
  };

  const getStockStatus = (item: InventoryWithDetails) => {
    if (item.quantity === 0) return { label: "Sin Stock", variant: "destructive" as const };
    if (item.quantity <= item.product.minStock) return { label: "Stock Bajo", variant: "secondary" as const };
    return { label: "Disponible", variant: "default" as const };
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {metricsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="metric-card">
              <CardContent className="p-4 md:p-6">
                <Skeleton className="h-16 md:h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <MetricCard
              title="Total Productos"
              value={(metrics as any)?.totalProducts || 0}
              subtitle="productos activos"
              icon={Package}
              iconClassName="text-primary"
            />
            <MetricCard
              title="Bodegas Activas"
              value={(metrics as any)?.activeWarehouses || 0}
              subtitle="100% operativas"
              icon={Warehouse}
              iconClassName="text-green-600"
            />
            <MetricCard
              title="Stock Bajo"
              value={(metrics as any)?.lowStockCount || 0}
              subtitle="productos críticos"
              icon={AlertTriangle}
              iconClassName="text-red-600"
            />
            <MetricCard
              title="Valor Inventario"
              value={formatCurrency((metrics as any)?.totalInventoryValue || 0)}
              subtitle="valor total"
              icon={DollarSign}
              iconClassName="text-purple-600"
            />
          </>
        )}
      </div>

      {/* Charts and Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Recent Inventory */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Inventario Reciente</CardTitle>
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hidden md:inline-flex">
                  Ver todos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {inventoryLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  {/* Vista Desktop - Tabla */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Bodega</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(recentInventory as InventoryWithDetails[])?.map((item: InventoryWithDetails) => {
                          const status = getStockStatus(item);
                          return (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center mr-3">
                                    <Package className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{item.product.name}</p>
                                    <p className="text-xs text-muted-foreground">SKU: {item.product.sku}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{item.warehouse.name}</TableCell>
                              <TableCell className="text-sm">{item.quantity} unidades</TableCell>
                              <TableCell>
                                <Badge variant={status.variant} className="status-badge">
                                  {status.label}
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
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Vista Móvil - Tarjetas */}
                  <div className="md:hidden space-y-3">
                    {(recentInventory as InventoryWithDetails[])?.map((item: InventoryWithDetails) => {
                      const status = getStockStatus(item);
                      return (
                        <Card key={item.id} className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center mr-3">
                                <Package className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{item.product.name}</p>
                                <p className="text-xs text-muted-foreground">SKU: {item.product.sku}</p>
                              </div>
                            </div>
                            <Badge variant={status.variant} className="status-badge text-xs">
                              {status.label}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">
                              {item.warehouse.name}
                            </span>
                            <span className="font-medium">
                              {item.quantity} unidades
                            </span>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Low Stock */}
        <div className="space-y-4 md:space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Plus className="w-4 h-4 mr-2 text-primary" />
                Agregar Producto
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Warehouse className="w-4 h-4 mr-2 text-green-600" />
                Nueva Bodega
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <BarChart3 className="w-4 h-4 mr-2 text-purple-600" />
                Generar Reporte
              </Button>
            </CardContent>
          </Card>

          {/* Low Stock Alert */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
                Stock Bajo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (lowStockItems as InventoryWithDetails[])?.length > 0 ? (
                <div className="space-y-3">
                  {(lowStockItems as InventoryWithDetails[]).slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">{item.warehouse.name}</p>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        {item.quantity}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Todos los productos tienen stock suficiente
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}