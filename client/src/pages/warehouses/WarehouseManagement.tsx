import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Package, MapPin, Search, Filter, Eye, X, ChevronDown, ChevronRight, Building2 } from "lucide-react";
import { Warehouse, InventoryWithDetails } from "@shared/schema";

interface WarehouseWithInventory extends Warehouse {
  inventoryCount: number;
  totalValue: number;
  inventory: InventoryWithDetails[];
}

interface CostCenterGroup {
  costCenter: string;
  mainWarehouse: WarehouseWithInventory;
  subWarehouses: WarehouseWithInventory[];
}

export default function WarehouseManagement() {
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>("all");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWarehouseDetail, setSelectedWarehouseDetail] = useState<WarehouseWithInventory | null>(null);
  const [expandedCostCenters, setExpandedCostCenters] = useState<Set<string>>(new Set());

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

  // Agrupar bodegas por centro de costo
  const costCenterGroups: CostCenterGroup[] = [];
  const processedCostCenters = new Set<string>();

  warehousesWithInventory.forEach(warehouse => {
    if (!processedCostCenters.has(warehouse.costCenter)) {
      processedCostCenters.add(warehouse.costCenter);
      
      const mainWarehouse = warehousesWithInventory.find(w => 
        w.costCenter === warehouse.costCenter && w.warehouseType === "main"
      );
      
      const subWarehouses = warehousesWithInventory.filter(w => 
        w.costCenter === warehouse.costCenter && w.warehouseType === "sub"
      );

      if (mainWarehouse) {
        costCenterGroups.push({
          costCenter: warehouse.costCenter,
          mainWarehouse,
          subWarehouses,
        });
      }
    }
  });

  // Función para alternar expansión de centro de costo
  const toggleCostCenter = (costCenter: string) => {
    const newExpanded = new Set(expandedCostCenters);
    if (newExpanded.has(costCenter)) {
      newExpanded.delete(costCenter);
    } else {
      newExpanded.add(costCenter);
    }
    setExpandedCostCenters(newExpanded);
  };

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

      {/* Vista Jerárquica por Centro de Costo */}
      <div className="space-y-4">
        {costCenterGroups.map(group => (
          <Card key={group.costCenter}>
            <Collapsible 
              open={expandedCostCenters.has(group.costCenter)}
              onOpenChange={() => toggleCostCenter(group.costCenter)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-6 w-6 text-blue-600" />
                      <div>
                        <div className="text-lg font-semibold">
                          Centro de Costo: {group.costCenter}
                        </div>
                        <div className="text-sm text-muted-foreground font-normal">
                          {group.subWarehouses.length + 1} bodegas • 
                          {" "}{group.mainWarehouse.inventoryCount + group.subWarehouses.reduce((sum, w) => sum + w.inventoryCount, 0)} productos únicos
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {group.subWarehouses.length + 1} bodegas
                      </Badge>
                      {expandedCostCenters.has(group.costCenter) ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Bodega Principal */}
                    <Card 
                      className="border-blue-200 bg-blue-50/50 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedWarehouseDetail(group.mainWarehouse)}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between text-base">
                          <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-blue-600" />
                            {group.mainWarehouse.name}
                          </div>
                          <Badge>PRINCIPAL</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {group.mainWarehouse.location || "Sin ubicación"}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-xl font-bold text-blue-600">
                              {group.mainWarehouse.inventoryCount}
                            </div>
                            <div className="text-xs text-muted-foreground">Productos</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-green-600">
                              {group.mainWarehouse.inventory.reduce((sum, inv) => sum + inv.quantity, 0)}
                            </div>
                            <div className="text-xs text-muted-foreground">Unidades</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Sub-bodegas */}
                    {group.subWarehouses.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                        {group.subWarehouses.map(subWarehouse => (
                          <Card 
                            key={subWarehouse.id}
                            className="border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => setSelectedWarehouseDetail(subWarehouse)}
                          >
                            <CardHeader className="pb-2">
                              <CardTitle className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-gray-500" />
                                  {subWarehouse.name}
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {subWarehouse.subWarehouseType?.toUpperCase() || "SUB"}
                                </Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <div className="text-xs text-muted-foreground">
                                {subWarehouse.location || "Sin ubicación"}
                              </div>
                              <div className="flex justify-between text-xs">
                                <span>{subWarehouse.inventoryCount} productos</span>
                                <span className="font-medium">
                                  {subWarehouse.inventory.reduce((sum, inv) => sum + inv.quantity, 0)} unidades
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {costCenterGroups.length === 0 && (
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
            <DialogDescription>
              Información completa del inventario y productos de la bodega {selectedWarehouseDetail?.name}
            </DialogDescription>
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
                              {inv.product.minStock || "N/A"}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                variant={inv.quantity <= (inv.product.minStock ?? 0) ? "destructive" : "default"}
                              >
                                {inv.quantity <= (inv.product.minStock ?? 0) ? "Stock Bajo" : "Normal"}
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