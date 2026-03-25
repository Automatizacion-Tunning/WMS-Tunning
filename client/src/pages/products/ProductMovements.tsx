import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, ArrowRightLeft, Package, TrendingUp, TrendingDown, Warehouse, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { InventoryMovementWithDetails, InventoryWithDetails } from "@shared/schema";

export default function ProductMovements() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [productId, setProductId] = useState(0);
  const [sourceWarehouseId, setSourceWarehouseId] = useState(0);
  const [sameCostCenter, setSameCostCenter] = useState(true);
  const [destinationWarehouseId, setDestinationWarehouseId] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");

  const { data: inventoryData = [], isLoading: inventoryLoading } = useQuery<InventoryWithDetails[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: warehouses = [], isLoading: warehousesLoading } = useQuery<any[]>({
    queryKey: ["/api/warehouses"],
  });

  const { data: movements = [], isLoading: movementsLoading } = useQuery<InventoryMovementWithDetails[]>({
    queryKey: ["/api/inventory-movements"],
  });

  // Productos que tienen stock en al menos una bodega
  const productsWithStock = useMemo(() => {
    const map = new Map<number, { id: number; name: string; sku: string | null }>();
    inventoryData.filter(inv => inv.quantity > 0).forEach(inv => {
      if (!map.has(inv.productId)) {
        map.set(inv.productId, { id: inv.product.id, name: inv.product.name, sku: inv.product.sku });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [inventoryData]);

  // Bodegas donde el producto seleccionado tiene stock (para origen)
  const sourceBodegas = useMemo(() => {
    if (!productId) return [];
    return inventoryData
      .filter(inv => inv.productId === productId && inv.quantity > 0)
      .map(inv => ({
        id: inv.warehouse.id,
        name: inv.warehouse.name,
        costCenter: (inv.warehouse as any).costCenter,
        stock: inv.quantity,
      }));
  }, [productId, inventoryData]);

  // Centro de costo de la bodega origen
  const sourceCostCenter = useMemo(() => {
    return sourceBodegas.find(b => b.id === sourceWarehouseId)?.costCenter || "";
  }, [sourceWarehouseId, sourceBodegas]);

  // Bodegas destino filtradas por mismo/distinto CC
  const destinationBodegas = useMemo(() => {
    if (!sourceWarehouseId) return [];
    return (warehouses as any[])
      .filter((w: any) => {
        if (w.id === sourceWarehouseId) return false;
        if (w.isActive === false) return false;
        if (sameCostCenter) {
          return w.costCenter === sourceCostCenter;
        } else {
          return w.costCenter !== sourceCostCenter;
        }
      })
      .map((w: any) => ({
        id: w.id,
        name: w.name,
        costCenter: w.costCenter,
      }));
  }, [sourceWarehouseId, warehouses, sameCostCenter, sourceCostCenter]);

  // Stock disponible en bodega origen
  const availableStock = useMemo(() => {
    const inv = sourceBodegas.find(b => b.id === sourceWarehouseId);
    return inv?.stock || 0;
  }, [sourceWarehouseId, sourceBodegas]);

  // Detectar si destino es integrador (salida sin entrada)
  const isDestinationIntegrador = useMemo(() => {
    if (!destinationWarehouseId) return false;
    const dest = (warehouses as any[]).find((w: any) => w.id === destinationWarehouseId);
    return dest?.subWarehouseType === 'integrador';
  }, [destinationWarehouseId, warehouses]);

  // Reset cascading fields
  const handleProductChange = (val: string) => {
    setProductId(parseInt(val));
    setSourceWarehouseId(0);
    setSameCostCenter(true);
    setDestinationWarehouseId(0);
    setQuantity(1);
  };

  const handleSourceChange = (val: string) => {
    setSourceWarehouseId(parseInt(val));
    setSameCostCenter(true);
    setDestinationWarehouseId(0);
    setQuantity(1);
  };

  const handleToggleCostCenter = (same: boolean) => {
    setSameCostCenter(same);
    setDestinationWarehouseId(0);
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
        description: result.type === 'dispatch'
          ? `Se despacharon ${result.transferred} unidades a integrador.`
          : `Se trasladaron ${result.transferred} unidades exitosamente.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      // Reset form
      setProductId(0);
      setSourceWarehouseId(0);
      setSameCostCenter(true);
      setDestinationWarehouseId(0);
      setQuantity(1);
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
    if (!productId || !sourceWarehouseId || !destinationWarehouseId || quantity < 1) return;
    transferMutation.mutate({
      productId,
      sourceWarehouseId,
      destinationWarehouseId,
      quantity,
      reason: reason || undefined,
    });
  };

  const canSubmit = productId && sourceWarehouseId && destinationWarehouseId && quantity >= 1 && quantity <= availableStock && !transferMutation.isPending;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Traspaso de Productos</h1>
        <p className="text-muted-foreground">Mueve productos entre bodegas y centros de costo</p>
      </div>

      <div className="space-y-6">
        {/* Transfer Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5" />
                Nuevo Traspaso
              </CardTitle>
              <CardDescription>Selecciona producto, origen y destino</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Producto */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Producto
                  </label>
                  <Select value={productId ? productId.toString() : ""} onValueChange={handleProductChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {productsWithStock.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name} {p.sku ? `(${p.sku})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Solo productos con stock disponible</p>
                </div>

                {/* Bodega Origen */}
                {productId > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Warehouse className="w-4 h-4" />
                      Bodega Origen
                    </label>
                    <Select value={sourceWarehouseId ? sourceWarehouseId.toString() : ""} onValueChange={handleSourceChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar bodega origen" />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceBodegas.map((b) => (
                          <SelectItem key={b.id} value={b.id.toString()}>
                            {b.name} — {b.costCenter} ({b.stock} uds)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Toggle mismo CC / otro CC */}
                {sourceWarehouseId > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Destino del traspaso
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
                    <p className="text-xs text-muted-foreground">
                      {sameCostCenter
                        ? `Bodegas dentro de ${sourceCostCenter}`
                        : `Bodegas fuera de ${sourceCostCenter}`}
                    </p>
                  </div>
                )}

                {/* Bodega Destino */}
                {sourceWarehouseId > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <ArrowRight className="w-4 h-4" />
                      Bodega Destino
                    </label>
                    <Select value={destinationWarehouseId ? destinationWarehouseId.toString() : ""} onValueChange={(val) => setDestinationWarehouseId(parseInt(val))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar bodega destino" />
                      </SelectTrigger>
                      <SelectContent>
                        {destinationBodegas.map((b) => (
                          <SelectItem key={b.id} value={b.id.toString()}>
                            {b.name} — {b.costCenter}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                </div>
                {/* Resumen visual del traspaso */}
                {sourceWarehouseId > 0 && destinationWarehouseId > 0 && (
                  isDestinationIntegrador ? (
                    <div className="p-3 bg-amber-950/40 border border-amber-800 rounded-lg">
                      <div className="flex items-center gap-2 text-xs">
                        <TrendingDown className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-amber-200 font-medium">Salida a Integrador</span>
                      </div>
                      <p className="text-xs text-amber-400/80 mt-1">
                        El producto saldra del inventario de <strong>{sourceCostCenter}</strong>. No se registrara entrada en integrador.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-blue-950/50 border border-blue-800 rounded-lg text-xs">
                      <Badge className="font-mono shrink-0 bg-blue-800 text-blue-100 border-blue-700">
                        {sourceBodegas.find(b => b.id === sourceWarehouseId)?.costCenter}
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-blue-400 shrink-0" />
                      <Badge className="font-mono shrink-0 bg-blue-800 text-blue-100 border-blue-700">
                        {destinationBodegas.find(b => b.id === destinationWarehouseId)?.costCenter}
                      </Badge>
                    </div>
                  )
                )}

                {/* Cantidad, Motivo y Botón en fila */}
                {destinationWarehouseId > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_auto] gap-4 items-end">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Cantidad</label>
                      <Input
                        type="number"
                        min="1"
                        max={availableStock}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.min(parseInt(e.target.value) || 0, availableStock))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Disponible: <strong>{availableStock}</strong>
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Motivo (Opcional)</label>
                      <Input
                        placeholder="Descripcion del traspaso..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={!canSubmit}
                      className="min-w-[160px]"
                    >
                      {transferMutation.isPending
                        ? "Procesando..."
                        : isDestinationIntegrador
                          ? "Registrar Salida"
                          : "Realizar Traspaso"}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Movement History */}
        <div>
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
                          <TableCell className="text-sm">
                            {movement.warehouse.name}
                          </TableCell>
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
                          <TableCell className="text-right font-mono">
                            {movement.quantity}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                            <div className="truncate" title={movement.reason || ""}>
                              {movement.reason || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(movement.createdAt).toLocaleDateString('es-CL', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
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
      </div>
    </div>
  );
}
