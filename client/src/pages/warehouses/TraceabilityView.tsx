import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Building2, ChevronRight, ChevronDown, Package, FileText, Hash,
  Warehouse, MapPin, Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";

// Types
interface CostCenterItem {
  costCenter: string;
  warehouseCount: number;
}

interface WarehouseItem {
  id: number;
  name: string;
  warehouseType: string;
  subWarehouseType: string | null;
  location: string | null;
  costCenter: string;
  totalProducts: number;
  totalUnits: number;
}

interface ProductInventoryItem {
  id: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    sku: string;
    barcode: string | null;
    requiresSerial: boolean;
    erpProductCode: string | null;
  };
  purchaseOrderReceipts: {
    id: number;
    purchaseOrderNumber: string;
    purchaseOrderLine: number;
    codprod: string | null;
    orderedQuantity: string;
    receivedQuantity: string;
    unitPrice: string | null;
    costCenter: string | null;
  }[];
}

interface ProductSerial {
  id: number;
  serialNumber: string;
  status: string;
  createdAt: string;
}

// ---- Level 4: Product detail (OC + Serials) ----
function ProductDetail({ item, warehouseId }: { item: ProductInventoryItem; warehouseId: number }) {
  const { data: serials, isLoading: loadingSerials } = useQuery<ProductSerial[]>({
    queryKey: [`/api/product-serials/${item.productId}/warehouse/${warehouseId}`],
    queryFn: () => apiRequest(`/api/product-serials/${item.productId}/warehouse/${warehouseId}`),
    enabled: item.product.requiresSerial,
  });

  const receipts = item.purchaseOrderReceipts || [];

  return (
    <div className="pl-8 pb-4 space-y-4">
      {/* Purchase Orders */}
      <div>
        <h4 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-1">
          <FileText className="w-4 h-4" /> Órdenes de Compra enlazadas ({receipts.length})
        </h4>
        {receipts.length === 0 ? (
          <p className="text-xs text-muted-foreground pl-5">Sin órdenes de compra enlazadas</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">N° OC</TableHead>
                <TableHead className="text-xs">Línea</TableHead>
                <TableHead className="text-xs">Cod. ERP</TableHead>
                <TableHead className="text-xs text-right">Ordenado</TableHead>
                <TableHead className="text-xs text-right">Recibido</TableHead>
                <TableHead className="text-xs text-right">Pendiente</TableHead>
                <TableHead className="text-xs text-right">Precio Unit.</TableHead>
                <TableHead className="text-xs">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((r) => {
                const ordered = parseFloat(r.orderedQuantity || "0");
                const received = parseFloat(r.receivedQuantity || "0");
                const pending = Math.max(0, ordered - received);
                const status = pending === 0 ? "Completo" : received > 0 ? "Parcial" : "Pendiente";
                const statusColor = status === "Completo" ? "default" : status === "Parcial" ? "secondary" : "outline";

                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs font-mono">{r.purchaseOrderNumber}</TableCell>
                    <TableCell className="text-xs text-center">{r.purchaseOrderLine}</TableCell>
                    <TableCell className="text-xs font-mono">{r.codprod || "—"}</TableCell>
                    <TableCell className="text-xs text-right">{ordered}</TableCell>
                    <TableCell className="text-xs text-right">{received}</TableCell>
                    <TableCell className="text-xs text-right">{pending}</TableCell>
                    <TableCell className="text-xs text-right">
                      {r.unitPrice ? `$${parseFloat(r.unitPrice).toLocaleString("es-CL")}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColor} className="text-xs">{status}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Serials */}
      {item.product.requiresSerial && (
        <div>
          <h4 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-1">
            <Hash className="w-4 h-4" /> Números de Serie
          </h4>
          {loadingSerials ? (
            <Skeleton className="h-6 w-48" />
          ) : serials && serials.length > 0 ? (
            <div className="flex flex-wrap gap-2 pl-5">
              {serials.map((s) => (
                <Badge key={s.id} variant="outline" className="font-mono text-xs">
                  {s.serialNumber}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground pl-5">Sin números de serie activos</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Level 3: Products in a warehouse ----
function WarehouseProducts({ warehouseId }: { warehouseId: number }) {
  const { data: items, isLoading } = useQuery<ProductInventoryItem[]>({
    queryKey: [`/api/inventory/warehouse/${warehouseId}/details`],
    queryFn: () => apiRequest(`/api/inventory/warehouse/${warehouseId}/details`),
  });

  if (isLoading) {
    return (
      <div className="space-y-2 pl-6">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return <p className="text-sm text-muted-foreground pl-6 py-2">Sin productos en esta bodega</p>;
  }

  return (
    <div className="pl-4">
      {items.map((item) => (
        <ProductRow key={item.id} item={item} warehouseId={warehouseId} />
      ))}
    </div>
  );
}

function ProductRow({ item, warehouseId }: { item: ProductInventoryItem; warehouseId: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasOc = item.purchaseOrderReceipts && item.purchaseOrderReceipts.length > 0;

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-3 py-2 px-3 hover:bg-muted/50 rounded-md transition-colors cursor-pointer">
          {expanded ? <ChevronDown className="w-4 h-4 text-amber-400" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <Package className="w-4 h-4 text-amber-400" />
          <span className="font-medium text-sm flex-1 text-left">{item.product.name}</span>
          <span className="text-xs text-muted-foreground font-mono">{item.product.sku}</span>
          {item.product.barcode && (
            <span className="text-xs text-muted-foreground font-mono hidden md:inline">{item.product.barcode}</span>
          )}
          <Badge variant="outline" className="text-xs">Stock: {item.quantity}</Badge>
          {item.product.erpProductCode && (
            <Badge variant="secondary" className="text-xs font-mono hidden lg:inline-flex">ERP: {item.product.erpProductCode}</Badge>
          )}
          {hasOc && <Badge className="text-xs bg-amber-600">OC</Badge>}
          {item.product.requiresSerial && <Badge variant="outline" className="text-xs border-amber-400 text-amber-400">Serial</Badge>}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {expanded && <ProductDetail item={item} warehouseId={warehouseId} />}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---- Level 2: Warehouses in a cost center ----
function CostCenterWarehouses({ costCenter }: { costCenter: string }) {
  const { data: warehouseList, isLoading } = useQuery<WarehouseItem[]>({
    queryKey: [`/api/warehouses/by-cost-center/${costCenter}`],
    queryFn: () => apiRequest(`/api/warehouses/by-cost-center/${encodeURIComponent(costCenter)}`),
  });

  if (isLoading) {
    return (
      <div className="space-y-2 pl-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (!warehouseList || warehouseList.length === 0) {
    return <p className="text-sm text-muted-foreground pl-4 py-2">Sin bodegas en este centro de costo</p>;
  }

  return (
    <div className="pl-2 space-y-1">
      {warehouseList.map((wh) => (
        <WarehouseRow key={wh.id} warehouse={wh} />
      ))}
    </div>
  );
}

function WarehouseRow({ warehouse }: { warehouse: WarehouseItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-3 py-2 px-3 hover:bg-muted/50 rounded-md transition-colors cursor-pointer">
          {expanded ? <ChevronDown className="w-4 h-4 text-amber-400" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          {warehouse.warehouseType === "main" ? (
            <Warehouse className="w-4 h-4 text-amber-400" />
          ) : (
            <MapPin className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="font-medium text-sm flex-1 text-left">{warehouse.name}</span>
          <Badge variant={warehouse.warehouseType === "main" ? "default" : "secondary"} className="text-xs">
            {warehouse.warehouseType === "main" ? "Principal" : warehouse.subWarehouseType?.toUpperCase() || "Sub"}
          </Badge>
          <span className="text-xs text-muted-foreground">{warehouse.totalProducts} productos</span>
          <span className="text-xs text-muted-foreground">{warehouse.totalUnits} unidades</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {expanded && <WarehouseProducts warehouseId={warehouse.id} />}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---- Level 1: Cost Centers ----
export default function TraceabilityView() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: costCenters, isLoading } = useQuery<CostCenterItem[]>({
    queryKey: ["/api/cost-centers"],
    queryFn: () => apiRequest("/api/cost-centers"),
  });

  const filtered = costCenters?.filter((cc) =>
    cc.costCenter.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-80" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trazabilidad</h1>
        <p className="text-muted-foreground">
          Vista jerárquica: Centro de Costo → Bodegas → Productos → OC + Series
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar centro de costo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Sin centros de costo</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "No se encontraron resultados para la búsqueda" : "No hay centros de costo disponibles para su rol"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((cc) => (
            <CostCenterCard key={cc.costCenter} costCenter={cc} />
          ))}
        </div>
      )}
    </div>
  );
}

function CostCenterCard({ costCenter }: { costCenter: CostCenterItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-base">
              {expanded ? <ChevronDown className="w-5 h-5 text-amber-400" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
              <Building2 className="w-5 h-5 text-amber-400" />
              <span className="flex-1">Centro de Costo: {costCenter.costCenter}</span>
              <Badge variant="outline" className="ml-2">
                {costCenter.warehouseCount} bodegas
              </Badge>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {expanded && <CostCenterWarehouses costCenter={costCenter.costCenter} />}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
