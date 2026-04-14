import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, ArrowRightLeft, Package, TrendingUp, TrendingDown, Warehouse, Building2, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { apiRequest } from "@/lib/queryClient";
import type { InventoryMovementWithDetails, InventoryWithDetails } from "@shared/schema";

interface TransferItem {
  id: number; // UI key
  productId: number;
  quantity: number;
}

let nextItemId = 1;

export default function ProductMovements() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = usePermissions();

  // Form state
  const [selectedCC, setSelectedCC] = useState("");
  const [sourceWarehouseId, setSourceWarehouseId] = useState(0);
  const [sameCostCenter, setSameCostCenter] = useState(true);
  const [destinationWarehouseId, setDestinationWarehouseId] = useState(0);
  const [items, setItems] = useState<TransferItem[]>([]);
  const [reason, setReason] = useState("");

  const { data: inventoryData = [] } = useQuery<InventoryWithDetails[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ["/api/warehouses"],
  });

  const { data: movements = [], isLoading: movementsLoading } = useQuery<InventoryMovementWithDetails[]>({
    queryKey: ["/api/inventory-movements"],
  });

  // Cost centers that have warehouses with stock
  const costCentersWithStock = useMemo(() => {
    const ccSet = new Set<string>();
    inventoryData.filter(inv => inv.quantity > 0).forEach(inv => {
      const cc = (inv.warehouse as any).costCenter;
      if (cc) ccSet.add(cc);
    });
    return [...ccSet].sort();
  }, [inventoryData]);

  // Bodegas con stock (para origen), filtradas por CC seleccionado
  const sourceBodegas = useMemo(() => {
    const map = new Map<number, { id: number; name: string; costCenter: string; productCount: number }>();
    inventoryData.filter(inv => inv.quantity > 0).forEach(inv => {
      const cc = (inv.warehouse as any).costCenter;
      if (selectedCC && cc !== selectedCC) return;
      const existing = map.get(inv.warehouseId);
      if (existing) {
        existing.productCount++;
      } else {
        map.set(inv.warehouseId, {
          id: inv.warehouse.id,
          name: inv.warehouse.name,
          costCenter: cc,
          productCount: 1,
        });
      }
    });
    return Array.from(map.values());
  }, [inventoryData, selectedCC]);

  // CC de la bodega origen
  const sourceCostCenter = useMemo(() => {
    return sourceBodegas.find(b => b.id === sourceWarehouseId)?.costCenter || "";
  }, [sourceWarehouseId, sourceBodegas]);

  // Bodegas destino filtradas
  const destinationBodegas = useMemo(() => {
    if (!sourceWarehouseId) return [];
    return (warehouses as any[])
      .filter((w: any) => {
        if (w.id === sourceWarehouseId) return false;
        if (w.isActive === false) return false;
        // Despacho solo visible para admin
        if (w.subWarehouseType === 'despacho' && !isAdmin) return false;
        return sameCostCenter ? w.costCenter === sourceCostCenter : w.costCenter !== sourceCostCenter;
      })
      .map((w: any) => ({ id: w.id, name: w.name, costCenter: w.costCenter, subWarehouseType: w.subWarehouseType }));
  }, [sourceWarehouseId, warehouses, sameCostCenter, sourceCostCenter, isAdmin]);

  // Productos con stock en la bodega origen
  const productsInSource = useMemo(() => {
    if (!sourceWarehouseId) return [];
    return inventoryData
      .filter(inv => inv.warehouseId === sourceWarehouseId && inv.quantity > 0)
      .map(inv => ({
        productId: inv.product.id,
        name: inv.product.name,
        sku: inv.product.sku,
        stock: inv.quantity,
      }));
  }, [sourceWarehouseId, inventoryData]);

  // Productos ya seleccionados (para excluirlos del select)
  const selectedProductIds = useMemo(() => new Set(items.map(i => i.productId)), [items]);

  // Productos disponibles para agregar (no seleccionados aún)
  const availableProducts = useMemo(() => {
    return productsInSource.filter(p => !selectedProductIds.has(p.productId));
  }, [productsInSource, selectedProductIds]);

  // Destino es tipo especial?
  const destinationSubType = useMemo(() => {
    if (!destinationWarehouseId) return null;
    const dest = (warehouses as any[]).find((w: any) => w.id === destinationWarehouseId);
    return dest?.subWarehouseType || null;
  }, [destinationWarehouseId, warehouses]);
  const isDestinationIntegrador = destinationSubType === 'integrador';
  const isDestinationGarantia = destinationSubType === 'garantia';
  const isDestinationDespacho = destinationSubType === 'despacho';

  // Handlers
  const handleCCChange = (val: string) => {
    setSelectedCC(val === "all" ? "" : val);
    setSourceWarehouseId(0);
    setSameCostCenter(true);
    setDestinationWarehouseId(0);
    setItems([]);
    setReason("");
  };

  const handleSourceChange = (val: string) => {
    setSourceWarehouseId(parseInt(val));
    setSameCostCenter(true);
    setDestinationWarehouseId(0);
    setItems([]);
    setReason("");
  };

  const handleToggleCostCenter = (same: boolean) => {
    setSameCostCenter(same);
    setDestinationWarehouseId(0);
  };

  const handleDestinationChange = (val: string) => {
    setDestinationWarehouseId(parseInt(val));
    setItems([]);
  };

  const handleAddItem = () => {
    setItems([...items, { id: nextItemId++, productId: 0, quantity: 1 }]);
  };

  const handleRemoveItem = (id: number) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleItemProductChange = (id: number, productId: number) => {
    setItems(items.map(i => i.id === id ? { ...i, productId, quantity: 1 } : i));
  };

  const handleItemQuantityChange = (id: number, quantity: number, max: number) => {
    setItems(items.map(i => i.id === id ? { ...i, quantity: Math.min(Math.max(1, quantity), max) } : i));
  };

  // Mutation
  const transferMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/inventory-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: (result: any) => {
      toast({
        title: result.type === 'dispatch' ? "Salida registrada" : "Traspaso realizado",
        description: `${result.totalItems} producto(s) movido(s) exitosamente.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setSourceWarehouseId(0);
      setSameCostCenter(true);
      setDestinationWarehouseId(0);
      setItems([]);
      setReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Error en traspaso",
        description: error.message || "No se pudo realizar el traspaso.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(i => i.productId && i.quantity >= 1);
    if (!sourceWarehouseId || !destinationWarehouseId || validItems.length === 0) return;
    transferMutation.mutate({
      sourceWarehouseId,
      destinationWarehouseId,
      items: validItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
      reason: reason || undefined,
    });
  };

  const validItems = items.filter(i => i.productId && i.quantity >= 1);
  const canSubmit = sourceWarehouseId && destinationWarehouseId && validItems.length > 0 && !transferMutation.isPending;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Traspaso de Bodega</h1>
        <p className="text-muted-foreground">Mueve productos entre bodegas y centros de costo</p>
      </div>

      {/* Transfer Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            Nuevo Traspaso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Fila 1: CC, Origen, Toggle CC, Destino */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Centro de Costo */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Centro de Costo
                </label>
                <Select value={selectedCC || "all"} onValueChange={handleCCChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los CC" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los centros</SelectItem>
                    {costCentersWithStock.map((cc) => (
                      <SelectItem key={cc} value={cc}>{cc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bodega Origen */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Warehouse className="w-4 h-4" />
                  Bodega Origen
                </label>
                <Select value={sourceWarehouseId ? sourceWarehouseId.toString() : ""} onValueChange={handleSourceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar bodega" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceBodegas.map((b) => (
                      <SelectItem key={b.id} value={b.id.toString()}>
                        {b.name} {!selectedCC && `— ${b.costCenter}`} ({b.productCount} prod.)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Toggle CC */}
              {sourceWarehouseId > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Destino
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleCostCenter(true)}
                      className={`p-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        sameCostCenter
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      Mismo CC
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleCostCenter(false)}
                      className={`p-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        !sameCostCenter
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      Otro CC
                    </button>
                  </div>
                </div>
              )}

              {/* Bodega Destino */}
              {sourceWarehouseId > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" />
                    Bodega Destino
                  </label>
                  <Select value={destinationWarehouseId ? destinationWarehouseId.toString() : ""} onValueChange={handleDestinationChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinationBodegas.map((b) => (
                        <SelectItem key={b.id} value={b.id.toString()}>
                          <span className="flex items-center gap-2">
                            {b.name} — {b.costCenter}
                            {b.subWarehouseType === 'garantia' && <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 px-1 py-0">Garantía</Badge>}
                            {b.subWarehouseType === 'despacho' && <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-800 px-1 py-0">Despacho</Badge>}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Motivo */}
              {destinationWarehouseId > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Motivo (Opcional)</label>
                  <Input
                    placeholder="Descripcion del traspaso..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Indicador integrador */}
            {destinationWarehouseId > 0 && isDestinationIntegrador && (
              <div className="p-3 bg-amber-950/40 border border-amber-800 rounded-lg">
                <div className="flex items-center gap-2 text-xs">
                  <TrendingDown className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-amber-200 font-medium">Salida a Integrador</span>
                  <span className="text-amber-400/80">— Los productos saldran del inventario de {sourceCostCenter}</span>
                </div>
              </div>
            )}

            {/* Indicador garantía */}
            {destinationWarehouseId > 0 && isDestinationGarantia && (
              <div className="p-3 bg-amber-950/40 border border-amber-700 rounded-lg">
                <div className="flex items-center gap-2 text-xs">
                  <TrendingDown className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="text-amber-200 font-medium">Envío a Garantía</span>
                  <span className="text-amber-400/80">— Los productos quedarán en revisión por garantía y no estarán disponibles</span>
                </div>
              </div>
            )}

            {/* Indicador despacho */}
            {destinationWarehouseId > 0 && isDestinationDespacho && (
              <div className="p-3 bg-blue-950/40 border border-blue-700 rounded-lg">
                <div className="flex items-center gap-2 text-xs">
                  <TrendingDown className="w-4 h-4 text-blue-300 shrink-0" />
                  <span className="text-blue-200 font-medium">Despacho a Cliente</span>
                  <span className="text-blue-400/80">— Los productos se registrarán como entregados al cliente</span>
                </div>
              </div>
            )}

            {/* Tabla de productos */}
            {destinationWarehouseId > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Productos a traspasar
                  </label>
                  {availableProducts.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar producto
                    </Button>
                  )}
                </div>

                {items.length === 0 ? (
                  <div className="border border-dashed rounded-lg p-6 text-center">
                    <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground mb-3">No hay productos agregados</p>
                    {availableProducts.length > 0 ? (
                      <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                        <Plus className="w-4 h-4 mr-1" />
                        Agregar producto
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">No hay productos con stock en esta bodega</p>
                    )}
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">Producto</th>
                          <th className="text-right p-3 font-medium w-[120px]">Stock</th>
                          <th className="text-right p-3 font-medium w-[140px]">Cantidad</th>
                          <th className="text-center p-3 font-medium w-[50px]"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => {
                          const productInfo = productsInSource.find(p => p.productId === item.productId);
                          const maxQty = productInfo?.stock || 0;
                          // Available products for this row: unselected + current selection
                          const rowProducts = productsInSource.filter(
                            p => !selectedProductIds.has(p.productId) || p.productId === item.productId
                          );
                          return (
                            <tr key={item.id} className="border-b last:border-b-0">
                              <td className="p-2">
                                <Select
                                  value={item.productId ? item.productId.toString() : ""}
                                  onValueChange={(val) => handleItemProductChange(item.id, parseInt(val))}
                                >
                                  <SelectTrigger className="border-0 bg-transparent shadow-none">
                                    <SelectValue placeholder="Seleccionar producto..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {rowProducts.map((p) => (
                                      <SelectItem key={p.productId} value={p.productId.toString()}>
                                        {p.name} {p.sku ? `(${p.sku})` : ""}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-2 text-right font-mono text-muted-foreground">
                                {productInfo ? productInfo.stock : "-"}
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="1"
                                  max={maxQty}
                                  value={item.quantity}
                                  onChange={(e) => handleItemQuantityChange(item.id, parseInt(e.target.value) || 0, maxQty)}
                                  className="text-right w-full"
                                  disabled={!item.productId}
                                />
                              </td>
                              <td className="p-2 text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {availableProducts.length > 0 && (
                      <div className="border-t p-2">
                        <Button type="button" variant="ghost" size="sm" onClick={handleAddItem} className="w-full text-muted-foreground">
                          <Plus className="w-4 h-4 mr-1" />
                          Agregar otro producto
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Resumen y botón */}
                {validItems.length > 0 && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">
                      {validItems.length} producto(s) — {validItems.reduce((sum, i) => sum + i.quantity, 0)} unidades total
                    </p>
                    <Button type="submit" disabled={!canSubmit} className="min-w-[180px]">
                      {transferMutation.isPending
                        ? "Procesando..."
                        : isDestinationIntegrador
                          ? `Registrar Salida (${validItems.length})`
                          : isDestinationGarantia
                            ? `Enviar a Garantía (${validItems.length})`
                            : isDestinationDespacho
                              ? `Registrar Despacho (${validItems.length})`
                              : `Realizar Traspaso (${validItems.length})`}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Movement History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Movimientos</CardTitle>
          <CardDescription>Ultimos movimientos de inventario</CardDescription>
        </CardHeader>
        <CardContent>
          {movementsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ArrowRightLeft className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No hay movimientos registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Bodega</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement: InventoryMovementWithDetails) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center mr-3">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{movement.product.name}</p>
                            <p className="text-xs text-muted-foreground">{movement.product.sku}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{movement.warehouse.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={movement.movementType === "in" ? "default" : "destructive"}
                          className="gap-1"
                        >
                          {movement.movementType === "in" ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {movement.movementType === "in" ? "Entrada" : "Salida"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{movement.quantity}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                        <div className="truncate" title={movement.reason || ""}>{movement.reason || "-"}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(movement.createdAt).toLocaleDateString('es-CL', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
