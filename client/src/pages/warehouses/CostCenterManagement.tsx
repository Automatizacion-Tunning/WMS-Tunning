import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Building2, MapPin, ChevronRight, ChevronDown, Package, FileText, Loader2, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import type { Warehouse } from "@shared/schema";

const costCenterFormSchema = z.object({
  costCenter: z.string().min(1, "Centro de costos es requerido"),
  location: z.string().optional(),
});

type CostCenterFormData = z.infer<typeof costCenterFormSchema>;

// ── Product Detail Modal ──

function ProductDetailModal({
  costCenter,
  productId,
  open,
  onClose,
}: {
  costCenter: string;
  productId: number;
  open: boolean;
  onClose: () => void;
}) {
  const [serialFilter, setSerialFilter] = useState("");

  const { data, isLoading } = useQuery<any>({
    queryKey: [`/api/cost-centers/${costCenter}/products/${productId}/detail`],
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-zinc-950 border-amber-400/20">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          </div>
        ) : data ? (
          <>
            {/* Header */}
            <DialogHeader>
              <DialogTitle className="text-lg text-amber-400 flex items-center gap-2">
                <Package className="w-5 h-5" />
                {data.name}
              </DialogTitle>
              <div className="text-sm text-muted-foreground space-y-1 pt-1">
                <div className="flex flex-wrap gap-3">
                  {data.sku && <span>SKU: {data.sku}</span>}
                  {data.barcode && <span>Barcode: {data.barcode}</span>}
                  {data.erpProductCode && <span>ERP: {data.erpProductCode}</span>}
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                  <Badge variant="outline" className={`text-xs ${data.requiresSerial ? "border-blue-400 text-blue-400" : "border-zinc-500 text-zinc-400"}`}>
                    {data.requiresSerial ? "Serial" : "Cantidad"}
                  </Badge>
                  {data.currentPrice != null && (
                    <span className="text-amber-400 font-medium">${Number(data.currentPrice).toLocaleString()}</span>
                  )}
                  {data.lastReceptionDate && (
                    <span>Ult. Recepcion: {new Date(data.lastReceptionDate).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </DialogHeader>

            {/* Warehouse Distribution */}
            {data.warehouseDistribution?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-amber-400 mb-2">Distribucion por Bodega</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bodega</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.warehouseDistribution.map((wh: any) => (
                      <TableRow key={wh.warehouseId}>
                        <TableCell>{wh.warehouseName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{wh.warehouseType}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{wh.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Purchase Orders */}
            {data.purchaseOrders?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-amber-400 mb-2">Ordenes de Compra</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° OC</TableHead>
                      <TableHead>N° Item</TableHead>
                      <TableHead>Cod ERP</TableHead>
                      <TableHead className="text-right">Ordenado</TableHead>
                      <TableHead className="text-right">Recibido</TableHead>
                      <TableHead className="text-right">Pendiente</TableHead>
                      <TableHead className="text-right">Precio Unit.</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.purchaseOrders.map((po: any, idx: number) => {
                      const pending = po.orderedQuantity - po.receivedQuantity;
                      return (
                        <TableRow key={idx}>
                          <TableCell className="text-amber-400">{po.purchaseOrderNumber}</TableCell>
                          <TableCell>{po.purchaseOrderLine}</TableCell>
                          <TableCell className="text-muted-foreground">{po.codprod || "-"}</TableCell>
                          <TableCell className="text-right">{po.orderedQuantity}</TableCell>
                          <TableCell className="text-right">{po.receivedQuantity}</TableCell>
                          <TableCell className="text-right">{Math.max(0, pending)}</TableCell>
                          <TableCell className="text-right">
                            {po.unitPrice != null ? `$${Number(po.unitPrice).toLocaleString()}` : "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {po.updatedAt ? new Date(po.updatedAt).toLocaleDateString() : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Serial Traceability (only if requiresSerial) */}
            {data.requiresSerial && data.serials && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-amber-400">Detalle por Unidad</h4>
                  <div className="relative w-60">
                    <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar serial..."
                      value={serialFilter}
                      onChange={(e) => setSerialFilter(e.target.value)}
                      className="pl-8 h-8 text-sm bg-zinc-900 border-amber-400/20"
                    />
                  </div>
                </div>
                {data.serials.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serial</TableHead>
                        <TableHead>Bodega</TableHead>
                        <TableHead>OC Origen</TableHead>
                        <TableHead>Fecha Ingreso</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.serials
                        .filter((s: any) => !serialFilter || s.serialNumber.toLowerCase().includes(serialFilter.toLowerCase()))
                        .map((s: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-amber-400">{s.serialNumber}</TableCell>
                            <TableCell>{s.warehouseName}</TableCell>
                            <TableCell>{s.purchaseOrderNumber || "-"}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {s.dateIngress ? new Date(s.dateIngress).toLocaleDateString() : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs border-green-500 text-green-500">
                                {s.status === "active" ? "Activo" : s.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-sm">No hay seriales registrados.</p>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-muted-foreground py-4">Producto no encontrado.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Sub-component: Tabs for OC and Products within a CC ──

function CostCenterTabs({ costCenter, onProductClick }: { costCenter: string; onProductClick: (productId: number) => void }) {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  return (
    <div className="mt-4 border-t border-amber-400/20 pt-4">
      <Tabs value={activeTab || ""} onValueChange={(v) => setActiveTab(v)}>
        <TabsList className="bg-zinc-900 border border-amber-400/20">
          <TabsTrigger
            value="purchase-orders"
            className="data-[state=active]:bg-amber-400/20 data-[state=active]:text-amber-400"
          >
            <FileText className="w-4 h-4 mr-2" />
            Por Orden de Compra
          </TabsTrigger>
          <TabsTrigger
            value="products"
            className="data-[state=active]:bg-amber-400/20 data-[state=active]:text-amber-400"
          >
            <Package className="w-4 h-4 mr-2" />
            Por Producto
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchase-orders">
          {activeTab === "purchase-orders" && (
            <PurchaseOrdersTab costCenter={costCenter} onProductClick={onProductClick} />
          )}
        </TabsContent>

        <TabsContent value="products">
          {activeTab === "products" && (
            <ProductsTab costCenter={costCenter} onProductClick={onProductClick} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Tab 1: Purchase Orders ──

function PurchaseOrdersTab({ costCenter, onProductClick }: { costCenter: string; onProductClick: (productId: number) => void }) {
  const { data, isLoading } = useQuery<any[]>({
    queryKey: [`/api/cost-centers/${costCenter}/purchase-orders`],
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando ordenes de compra...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-sm">
        No hay ordenes de compra con recepciones en este centro de costo.
      </p>
    );
  }

  return (
    <div className="space-y-2 mt-2">
      {data.map((oc: any) => (
        <OcBlock key={oc.purchaseOrderNumber} oc={oc} onProductClick={onProductClick} />
      ))}
    </div>
  );
}

function OcBlock({ oc, onProductClick }: { oc: any; onProductClick: (productId: number) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-amber-400/10 text-left">
        {open ? <ChevronDown className="w-4 h-4 text-amber-400" /> : <ChevronRight className="w-4 h-4 text-amber-400" />}
        <FileText className="w-4 h-4 text-amber-400" />
        <span className="font-medium text-amber-400">OC {oc.purchaseOrderNumber}</span>
        <Badge variant="outline" className="ml-auto text-xs">
          {oc.products.length} producto{oc.products.length !== 1 ? "s" : ""}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-6 mt-1 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Codigo ERP</TableHead>
                <TableHead className="text-right">Ordenado</TableHead>
                <TableHead className="text-right">Recibido</TableHead>
                <TableHead className="text-right">Pendiente</TableHead>
                <TableHead className="text-right">Precio Unit.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Tipo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {oc.products.map((prod: any, idx: number) => {
                const pending = prod.orderedQuantity - prod.receivedQuantity;
                const isComplete = pending <= 0;
                const isPending = prod.receivedQuantity === 0;
                return (
                  <TableRow
                    key={idx}
                    className="cursor-pointer hover:bg-zinc-800"
                    onClick={() => prod.productId && onProductClick(prod.productId)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Search className="w-3 h-3 text-amber-400 shrink-0" />
                        {prod.name || "Sin producto"}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{prod.sku || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{prod.erpProductCode || "-"}</TableCell>
                    <TableCell className="text-right">{prod.orderedQuantity}</TableCell>
                    <TableCell className="text-right">{prod.receivedQuantity}</TableCell>
                    <TableCell className="text-right">{Math.max(0, pending)}</TableCell>
                    <TableCell className="text-right">
                      {prod.unitPrice != null ? `$${Number(prod.unitPrice).toLocaleString()}` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isComplete ? "default" : "secondary"}
                        className={isComplete ? "bg-green-600" : isPending ? "bg-red-600" : "bg-yellow-600"}
                      >
                        {isComplete ? "Completo" : isPending ? "Pendiente" : "Parcial"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${prod.requiresSerial ? "border-blue-400 text-blue-400" : "border-zinc-500 text-zinc-400"}`}>
                        {prod.requiresSerial ? "Serial" : "Cantidad"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Tab 2: Products ──

function ProductsTab({ costCenter, onProductClick }: { costCenter: string; onProductClick: (productId: number) => void }) {
  const { data, isLoading } = useQuery<any[]>({
    queryKey: [`/api/cost-centers/${costCenter}/products`],
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando productos...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-sm">
        No hay productos con stock y OC enlazada en este centro de costo.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto mt-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Stock Total</TableHead>
            <TableHead className="text-right">Bodegas</TableHead>
            <TableHead className="text-right">OCs</TableHead>
            <TableHead className="text-right">Precio Actual</TableHead>
            <TableHead>Ult. Recepcion</TableHead>
            <TableHead>Tipo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((product: any) => (
            <TableRow
              key={product.productId}
              className="cursor-pointer hover:bg-zinc-800"
              onClick={() => onProductClick(product.productId)}
            >
              <TableCell>
                <div className="flex items-center gap-1">
                  <Search className="w-3 h-3 text-amber-400 shrink-0" />
                  {product.name}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{product.sku || "-"}</TableCell>
              <TableCell className="text-right font-medium">{product.totalStock}</TableCell>
              <TableCell className="text-right">{product.warehouseCount}</TableCell>
              <TableCell className="text-right">{product.ocCount}</TableCell>
              <TableCell className="text-right">
                {product.currentPrice != null ? `$${Number(product.currentPrice).toLocaleString()}` : "-"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {product.lastReceptionDate ? new Date(product.lastReceptionDate).toLocaleDateString() : "-"}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`text-xs ${product.requiresSerial ? "border-blue-400 text-blue-400" : "border-zinc-500 text-zinc-400"}`}>
                  {product.requiresSerial ? "Serial" : "Cantidad"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Sub-component: Products panel inside a warehouse row ──

function WarehouseProductsPanel({ warehouseId, onProductClick }: { warehouseId: number; onProductClick: (productId: number) => void }) {
  const [filter, setFilter] = useState("");

  const { data, isLoading } = useQuery<any[]>({
    queryKey: [`/api/inventory/warehouse/${warehouseId}/details`],
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando productos...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-muted-foreground py-3 text-sm">
        No hay productos en esta bodega.
      </p>
    );
  }

  const filtered = data.filter((item: any) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      item.product?.name?.toLowerCase().includes(q) ||
      item.product?.sku?.toLowerCase().includes(q) ||
      item.product?.barcode?.toLowerCase().includes(q) ||
      item.product?.erpProductCode?.toLowerCase().includes(q) ||
      item.purchaseOrderReceipts?.some((r: any) => r.purchaseOrderNumber?.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filtrar por nombre, SKU, codigo ERP, N° OC..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-8 h-9 bg-zinc-900 border-amber-400/20 text-sm"
        />
      </div>
      <div className="text-xs text-muted-foreground mb-1">
        {filtered.length} de {data.length} producto{data.length !== 1 ? "s" : ""}
      </div>
      <div className="space-y-1">
        {filtered.map((item: any) => (
          <div
            key={item.id}
            className="flex items-center gap-2 w-full px-3 py-1.5 rounded bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 text-sm cursor-pointer"
            onClick={(e) => { e.stopPropagation(); item.product?.id && onProductClick(item.product.id); }}
          >
            <Search className="w-3 h-3 text-amber-400 shrink-0" />
            <Package className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="font-medium truncate">{item.product?.name}</span>
            {item.product?.sku && <span className="text-muted-foreground text-xs shrink-0">({item.product.sku})</span>}
            {item.product?.requiresSerial ? (
              <Badge variant="outline" className="text-xs border-blue-400 text-blue-400 shrink-0">Serial</Badge>
            ) : (
              <Badge variant="outline" className="text-xs border-zinc-500 text-zinc-400 shrink-0">Cantidad</Badge>
            )}
            <Badge variant="outline" className="ml-auto text-xs border-amber-400/30 text-amber-400 shrink-0">
              Stock: {item.quantity}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ──

export default function CostCenterManagement() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [expandedCCs, setExpandedCCs] = useState<Set<string>>(new Set());
  const [expandedWarehouses, setExpandedWarehouses] = useState<Set<number>>(new Set());
  const [ccFilter, setCcFilter] = useState("");
  const [modalProduct, setModalProduct] = useState<{ costCenter: string; productId: number } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: warehouses, isLoading } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });

  // Warehouse values (current month prices)
  const { data: warehouseValues = [] } = useQuery<{ warehouseId: number; warehouseValue: number }[]>({
    queryKey: ["/api/warehouse-values"],
  });

  const form = useForm<CostCenterFormData>({
    resolver: zodResolver(costCenterFormSchema),
    defaultValues: {
      costCenter: "",
      location: "",
    },
  });

  const createCostCenterMutation = useMutation({
    mutationFn: async (data: CostCenterFormData) => {
      return await apiRequest("/api/cost-centers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Centro de costos creado",
        description: "Se han creado todas las bodegas del centro de costos exitosamente.",
      });
      setIsCreateModalOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el centro de costos.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CostCenterFormData) => {
    createCostCenterMutation.mutate(data);
  };

  const toggleCC = (cc: string) => {
    setExpandedCCs(prev => {
      const next = new Set(prev);
      if (next.has(cc)) next.delete(cc);
      else next.add(cc);
      return next;
    });
  };

  const toggleWarehouse = (id: number) => {
    setExpandedWarehouses(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Group warehouses by cost center
  const warehousesByCostCenter = warehouses?.reduce((acc, warehouse) => {
    const costCenter = warehouse.costCenter;
    if (!acc[costCenter]) {
      acc[costCenter] = [];
    }
    acc[costCenter].push(warehouse);
    return acc;
  }, {} as Record<string, Warehouse[]>) || {};

  const valueMap = new Map(warehouseValues.map(v => [v.warehouseId, v.warehouseValue]));
  const formatCLP = (value: number) => `$${value.toLocaleString("es-CL", { maximumFractionDigits: 0 })}`;

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
          <h1 className="text-2xl font-bold">Centros de Costos</h1>
          <p className="text-muted-foreground">Gestiona los centros de costos y sus bodegas</p>
        </div>

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Centro de Costos
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Centro de Costos</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="costCenter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Centro de Costos</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. CC252130" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ubicación (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ubicación general del centro de costos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                  <p className="font-medium mb-1">Se crearán automáticamente:</p>
                  <ul className="space-y-1">
                    <li>• 1 Bodega Principal</li>
                    <li>• 4 Sub-bodegas: UM2, Plataforma, PEM, Integrador</li>
                  </ul>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={createCostCenterMutation.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCostCenterMutation.isPending}
                  >
                    {createCostCenterMutation.isPending ? "Creando..." : "Crear Centro de Costos"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar centro de costo..."
          value={ccFilter}
          onChange={(e) => setCcFilter(e.target.value)}
          className="pl-9 bg-zinc-900 border-amber-400/20"
        />
      </div>

      <div className="space-y-6">
        {Object.entries(warehousesByCostCenter)
          .filter(([cc]) => !ccFilter || cc.toLowerCase().includes(ccFilter.toLowerCase()))
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([costCenter, costCenterWarehouses]) => {
          const isExpanded = expandedCCs.has(costCenter);
          return (
          <Card key={costCenter}>
            <CardHeader
              className="cursor-pointer"
              onClick={() => toggleCC(costCenter)}
            >
              <CardTitle className="flex items-center gap-2">
                {isExpanded ? <ChevronDown className="w-5 h-5 text-amber-400" /> : <ChevronRight className="w-5 h-5 text-amber-400" />}
                <Building2 className="w-5 h-5" />
                Centro de Costos: {costCenter}
                <Badge variant="outline" className="ml-2">
                  {costCenterWarehouses.length} bodegas
                </Badge>
                <span className="ml-auto text-sm font-semibold text-amber-400">
                  {formatCLP(Number(costCenterWarehouses.find(w => w.warehouseType === "main")?.totalValue || 0))}
                </span>
              </CardTitle>
            </CardHeader>
            {isExpanded && (
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costCenterWarehouses
                      .sort((a, b) => {
                        if (a.warehouseType === 'main' && b.warehouseType === 'sub') return -1;
                        if (a.warehouseType === 'sub' && b.warehouseType === 'main') return 1;
                        return a.name.localeCompare(b.name);
                      })
                      .map((warehouse) => {
                      const isWhExpanded = expandedWarehouses.has(warehouse.id);
                      return (
                      <React.Fragment key={warehouse.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-zinc-800/50"
                        onClick={() => toggleWarehouse(warehouse.id)}
                      >
                        <TableCell>
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                              {warehouse.warehouseType === 'main' ?
                                <Building2 className="w-4 h-4 text-primary" /> :
                                <MapPin className="w-4 h-4 text-primary" />
                              }
                            </div>
                            <div className="flex items-center gap-1">
                              {isWhExpanded ?
                                <ChevronDown className="w-3 h-3 text-amber-400" /> :
                                <ChevronRight className="w-3 h-3 text-amber-400" />
                              }
                              <p className="font-medium">
                                {warehouse.name}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={warehouse.warehouseType === 'main' ? "default" : "secondary"}>
                            {warehouse.warehouseType === 'main' ? 'Principal' :
                             warehouse.subWarehouseType?.toUpperCase() || 'Sub-bodega'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {warehouse.location || "No especificada"}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-semibold text-amber-400">
                            {formatCLP(valueMap.get(warehouse.id) || 0)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={warehouse.isActive ? "default" : "secondary"}>
                            {warehouse.isActive ? "Activa" : "Inactiva"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      {isWhExpanded && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-zinc-900/30 p-3">
                            <WarehouseProductsPanel warehouseId={warehouse.id} onProductClick={(productId) => setModalProduct({ costCenter, productId })} />
                          </TableCell>
                        </TableRow>
                      )}
                      </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Sub-sections: OC and Products tabs */}
              <CostCenterTabs costCenter={costCenter} onProductClick={(productId) => setModalProduct({ costCenter, productId })} />
            </CardContent>
            )}
          </Card>
          );
        })}

        {Object.keys(warehousesByCostCenter).length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay centros de costos</h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primer centro de costos para comenzar a gestionar bodegas
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Centro de Costos
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {modalProduct && (
        <ProductDetailModal
          costCenter={modalProduct.costCenter}
          productId={modalProduct.productId}
          open={true}
          onClose={() => setModalProduct(null)}
        />
      )}
    </div>
  );
}
