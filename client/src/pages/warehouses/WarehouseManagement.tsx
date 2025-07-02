import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, MapPin, Search, Filter, Eye, X } from "lucide-react";
import { Warehouse, InventoryWithDetails } from "@shared/schema";

interface WarehouseWithInventory extends Warehouse {
  inventoryCount: number;
  totalValue: number;
  inventory: InventoryWithDetails[];
}

export default function WarehouseManagement() {
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>("all");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWarehouseDetail, setSelectedWarehouseDetail] = useState<WarehouseWithInventory | null>(null);

  // Obtener todas las bodegas
  const { data: warehouses = [], isLoading: warehousesLoading } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });

  // Obtener todo el inventario con detalles
  const { data: allInventory = [], isLoading: inventoryLoading } = useQuery<InventoryWithDetails[]>({
    queryKey: ["/api/inventory"],
  });

  // Procesar datos para mostrar bodegas con inventario
  const warehousesWithInventory: WarehouseWithInventory[] = warehouses.map(warehouse => {
    const warehouseInventory = allInventory.filter(inv => inv.warehouseId === warehouse.id);
    const totalValue = warehouseInventory.reduce((sum, inv) => {
      // El precio será 0 por ahora ya que los precios son por movimiento, no globales
      const recentPrice = 0;
      return sum + (inv.quantity * recentPrice);
    }, 0);

    return {
      ...warehouse,
      inventoryCount: warehouseInventory.length,
      totalValue,
      inventory: warehouseInventory,
    };
  });

  // Obtener centros de costo únicos
  const costCenters = Array.from(new Set(warehouses.map(w => w.costCenter))).filter(Boolean);

  // Filtrar bodegas
  const filteredWarehouses = warehousesWithInventory.filter(warehouse => {
    const matchesCostCenter = selectedCostCenter === "all" || warehouse.costCenter === selectedCostCenter;
    const matchesWarehouse = selectedWarehouse === "all" || warehouse.id.toString() === selectedWarehouse;
    const matchesSearch = searchTerm === "" || 
      warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.costCenter?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCostCenter && matchesWarehouse && matchesSearch;
  });

  // Obtener bodegas filtradas por centro de costo para el segundo filtro
  const warehousesForSecondFilter = selectedCostCenter === "all" 
    ? warehouses 
    : warehouses.filter(w => w.costCenter === selectedCostCenter);

  const isLoading = warehousesLoading || inventoryLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Gestión de Bodegas</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Bodegas</h1>
          <p className="text-muted-foreground">
            Administra bodegas, productos y filtros por centro de costo
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar bodega..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro por Centro de Costo */}
            <Select value={selectedCostCenter} onValueChange={setSelectedCostCenter}>
              <SelectTrigger>
                <SelectValue placeholder="Centro de Costo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Centros</SelectItem>
                {costCenters.map(costCenter => (
                  <SelectItem key={costCenter} value={costCenter}>
                    {costCenter}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por Bodega */}
            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
              <SelectTrigger>
                <SelectValue placeholder="Bodega Específica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Bodegas</SelectItem>
                {warehousesForSecondFilter.map(warehouse => (
                  <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Resumen de resultados */}
            <div className="flex items-center justify-center">
              <Badge variant="outline" className="text-sm">
                {filteredWarehouses.length} bodega(s) encontrada(s)
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Bodegas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWarehouses.map(warehouse => (
          <Card 
            key={warehouse.id} 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedWarehouseDetail(warehouse)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {warehouse.name}
                </span>
                <Badge variant={warehouse.warehouseType === "main" ? "default" : "secondary"}>
                  {warehouse.warehouseType === "main" ? "PRINCIPAL" : warehouse.subWarehouseType?.toUpperCase() || "SUB"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Información básica */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {warehouse.location || "Sin ubicación"}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Centro de Costo:</span> {warehouse.costCenter}
                </div>
              </div>

              {/* Métricas */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {warehouse.inventoryCount}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Productos
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ${warehouse.totalValue.toLocaleString('es-CL')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Valor Total (CLP)
                  </div>
                </div>
              </div>

              {/* Lista de productos (los primeros 3) */}
              {warehouse.inventory.length > 0 && (
                <div className="pt-4 border-t">
                  <div className="text-sm font-medium mb-2 flex items-center justify-between">
                    Productos:
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    {warehouse.inventory.slice(0, 3).map(inv => (
                      <div key={inv.id} className="flex justify-between text-xs">
                        <span className="truncate flex-1 mr-2">
                          {inv.product.name}
                        </span>
                        <span className="font-medium">
                          {inv.quantity}
                        </span>
                      </div>
                    ))}
                    {warehouse.inventory.length > 3 && (
                      <div className="text-xs text-blue-600 font-medium">
                        Clic para ver {warehouse.inventory.length - 3} productos más
                      </div>
                    )}
                  </div>
                </div>
              )}

              {warehouse.inventory.length === 0 && (
                <div className="pt-4 border-t text-center text-muted-foreground text-sm">
                  Sin productos en inventario
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredWarehouses.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No se encontraron bodegas</h3>
            <p className="text-muted-foreground">
              Ajusta los filtros para encontrar las bodegas que buscas.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal de Detalle de Bodega */}
      <Dialog open={!!selectedWarehouseDetail} onOpenChange={() => setSelectedWarehouseDetail(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-6 w-6" />
                Detalle de {selectedWarehouseDetail?.name}
              </div>
              <Badge variant={selectedWarehouseDetail?.warehouseType === "main" ? "default" : "secondary"}>
                {selectedWarehouseDetail?.warehouseType === "main" ? "PRINCIPAL" : selectedWarehouseDetail?.subWarehouseType?.toUpperCase() || "SUB"}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedWarehouseDetail && (
            <div className="space-y-6">
              {/* Información general */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedWarehouseDetail.inventoryCount}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Productos Diferentes
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedWarehouseDetail.inventory.reduce((sum, inv) => sum + inv.quantity, 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Unidades
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Centro de Costo</div>
                      <div className="font-bold">{selectedWarehouseDetail.costCenter}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {selectedWarehouseDetail.location || "Sin ubicación"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabla de productos */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Productos en Inventario</h3>
                {selectedWarehouseDetail.inventory.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Esta bodega no tiene productos en inventario</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Código de Barras</TableHead>
                          <TableHead className="text-center">Cantidad</TableHead>
                          <TableHead className="text-center">Stock Mínimo</TableHead>
                          <TableHead className="text-center">Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedWarehouseDetail.inventory.map(inv => (
                          <TableRow key={inv.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{inv.product.name}</div>
                                {inv.product.description && (
                                  <div className="text-sm text-muted-foreground truncate max-w-xs">
                                    {inv.product.description}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {inv.product.sku}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {inv.product.barcode || "Sin código"}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-bold">{inv.quantity}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              {inv.product.minStock}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                variant={inv.quantity <= inv.product.minStock ? "destructive" : "default"}
                              >
                                {inv.quantity <= inv.product.minStock ? "Stock Bajo" : "Normal"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}