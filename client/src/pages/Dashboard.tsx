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
    <div className="p-6 space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="metric-card">
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <MetricCard
              title="Total Productos"
              value={metrics?.totalProducts || 0}
              subtitle="productos activos"
              icon={Package}
              iconClassName="text-primary"
            />
            <MetricCard
              title="Bodegas Activas"
              value={metrics?.activeWarehouses || 0}
              subtitle="100% operativas"
              icon={Warehouse}
              iconClassName="text-green-600"
            />
            <MetricCard
              title="Stock Bajo"
              value={metrics?.lowStockCount || 0}
              subtitle="productos críticos"
              icon={AlertTriangle}
              iconClassName="text-red-600"
            />
            <MetricCard
              title="Valor Inventario"
              value={formatCurrency(metrics?.totalInventoryValue || 0)}
              subtitle="valor total"
              icon={DollarSign}
              iconClassName="text-purple-600"
            />
          </>
        )}
      </div>

      {/* Charts and Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Inventory */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Inventario Reciente</CardTitle>
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
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
                <div className="overflow-x-auto">
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
                      {recentInventory?.map((item: InventoryWithDetails) => {
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
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Alerts */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" size="lg">
                <Plus className="w-5 h-5 mr-3 text-primary" />
                Agregar Producto
              </Button>
              <Button variant="outline" className="w-full justify-start" size="lg">
                <Warehouse className="w-5 h-5 mr-3 text-green-600" />
                Nueva Bodega
              </Button>
              <Button variant="outline" className="w-full justify-start" size="lg">
                <BarChart3 className="w-5 h-5 mr-3 text-purple-600" />
                Generar Reporte
              </Button>
              <Button variant="outline" className="w-full justify-start" size="lg">
                <Download className="w-5 h-5 mr-3 text-muted-foreground" />
                Exportar Datos
              </Button>
            </CardContent>
          </Card>

          {/* System Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Alertas del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lowStockLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  {lowStockItems && lowStockItems.length > 0 && (
                    <div className="flex items-start space-x-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-destructive">Stock Crítico</p>
                        <p className="text-sm text-destructive/80 mt-1">
                          {lowStockItems.length} productos con stock por debajo del mínimo
                        </p>
                        <p className="text-xs text-destructive/60 mt-1">Revisar inmediatamente</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <InfoIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-400">Sistema Actualizado</p>
                      <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                        Todas las funciones operando correctamente
                      </p>
                      <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">Hace 30 minutos</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800 dark:text-green-400">Sincronización Completa</p>
                      <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                        Todos los sistemas funcionando correctamente
                      </p>
                      <p className="text-xs text-green-500 dark:text-green-400 mt-1">Hace 1 hora</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
