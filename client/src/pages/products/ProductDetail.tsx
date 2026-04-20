import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, Package, ArrowLeft, Warehouse, ArrowRightLeft, Hash, FileText, Calendar, User } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { printLabels } from "@/components/modals/QRPrintController";
import { formatDate, formatDateShort, getUserName } from "@/lib/formatters";

interface ProductWithDetails {
  id: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  productType: string | null;
  requiresSerial: boolean | null;
  erpProductCode: string | null;
  hasWarranty: boolean;
  warrantyMonths: number | null;
  isActive: boolean | null;
  createdAt: string | Date;
  updatedAt: string | Date | null;
  category?: { id: number; name: string } | null;
  brand?: { id: number; name: string } | null;
  unit?: { id: number; name: string; abbreviation: string } | null;
}

interface InventoryRecord {
  id: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  updatedAt: string | Date | null;
  warehouse?: { id: number; name: string; costCenter: string; warehouseType: string; subWarehouseType?: string | null } | null;
}

interface MovementRecord {
  id: number;
  productId: number;
  warehouseId: number;
  movementType: string;
  quantity: number;
  appliedPrice: string | null;
  reason: string | null;
  createdAt: string | Date;
  purchaseOrderNumber: string | null;
  transferOrderId: number | null;
  serialNumber?: string | null;
  dispatchGuideNumber?: string | null;
  user?: { firstName: string | null; lastName: string | null; username: string } | null;
  warehouse?: { id: number; name: string; costCenter: string } | null;
}

interface SerialRecord {
  id: number;
  productId: number;
  warehouseId: number;
  serialNumber: string;
  status: string;
  createdAt: string | Date;
  movementId: number | null;
  warehouse?: { id: number; name: string; costCenter: string } | null;
}

interface ProductVida {
  product: ProductWithDetails;
  inventory: InventoryRecord[];
  movements: MovementRecord[];
  serials: SerialRecord[];
}

export default function ProductDetail() {
  const [, params] = useRoute("/producto/:id");
  const { can, isLoading: permLoading } = usePermissions();

  const productId = params?.id ? parseInt(params.id) : null;

  const { data, isLoading, error } = useQuery<ProductVida>({
    queryKey: [`/api/products/${productId}/vida`],
    enabled: !!productId,
  });

  if (permLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!can("products.view")) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg text-muted-foreground">No tienes permisos para ver este producto.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data?.product) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg text-muted-foreground">Producto no encontrado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { product, inventory, movements, serials } = data;

  const getWarrantyExpiry = () => {
    if (!product.hasWarranty || !product.warrantyMonths) return "\u2014";
    const expiry = new Date(product.createdAt);
    expiry.setMonth(expiry.getMonth() + product.warrantyMonths);
    return expiry.toLocaleDateString("es-CL", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  const getSerialCostCenter = (serial: SerialRecord) => {
    return serial.warehouse?.costCenter || "\u2014";
  };

  const handlePrintProductQR = () => {
    const cc = inventory.length > 0 ? (inventory[0].warehouse?.costCenter || "\u2014") : "\u2014";
    printLabels([{
      id: product.id,
      name: product.name,
      sku: product.sku,
      costCenter: cc,
      warrantyExpiry: getWarrantyExpiry(),
    }]);
  };

  const handlePrintSerialQR = (serial: SerialRecord) => {
    printLabels([{
      id: product.id,
      name: product.name,
      sku: serial.serialNumber,
      serialNumber: serial.serialNumber,
      costCenter: getSerialCostCenter(serial),
      warrantyExpiry: getWarrantyExpiry(),
    }]);
  };

  const handlePrintAllSerialsQR = () => {
    printLabels(serials.map((s: SerialRecord) => ({
      id: product.id,
      name: product.name,
      sku: s.serialNumber,
      serialNumber: s.serialNumber,
      costCenter: getSerialCostCenter(s),
      warrantyExpiry: getWarrantyExpiry(),
    })));
  };

  const totalStock = inventory.reduce((sum: number, inv: InventoryRecord) => sum + (inv.quantity || 0), 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Package className="h-8 w-8" />
              Hoja de Vida -- {product.name}
            </h1>
            <p className="text-muted-foreground">
              SKU: {product.sku || "Sin SKU"} | Codigo: {product.barcode || "Sin codigo"}
            </p>
          </div>
        </div>
      </div>

      {/* Informacion General + Clasificacion */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> Informacion General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="Nombre" value={product.name} />
            <InfoRow label="SKU" value={product.sku || "\u2014"} />
            <InfoRow label="Codigo de Barras" value={product.barcode || "\u2014"} />
            <InfoRow label="Codigo ERP" value={product.erpProductCode || "\u2014"} />
            <InfoRow label="Descripcion" value={product.description || "Sin descripcion"} />
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">Tipo</span>
              <Badge variant={product.productType === "tangible" ? "default" : "secondary"}>
                {product.productType === "tangible" ? "Tangible" : "Intangible"}
              </Badge>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">Estado</span>
              <Badge variant={product.isActive ? "default" : "destructive"}>
                {product.isActive ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Clasificacion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="Unidad" value={product.unit ? `${product.unit.name} (${product.unit.abbreviation})` : "\u2014"} />
            <InfoRow label="Categoria" value={product.category?.name || "\u2014"} />
            <InfoRow label="Marca" value={product.brand?.name || "\u2014"} />
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">Requiere Serie</span>
              <Badge variant={product.requiresSerial ? "default" : "outline"}>
                {product.requiresSerial ? "Si" : "No"}
              </Badge>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">Garantia</span>
              <Badge variant={product.hasWarranty ? "default" : "outline"}>
                {product.hasWarranty ? `${product.warrantyMonths || 0} meses` : "No"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Registro y Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="Fecha Creacion" value={formatDateShort(product.createdAt)} />
            <InfoRow label="Ultima Actualizacion" value={formatDateShort(product.updatedAt)} />
            <InfoRow label="Stock Total" value={`${totalStock} unidades`} />
            <InfoRow label="Movimientos" value={`${movements.length} registros`} />
            {product.requiresSerial && (
              <InfoRow label="Series Registradas" value={`${serials.length}`} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ubicacion en Bodegas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5" /> Ubicacion en Bodegas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inventory.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin stock en ninguna bodega.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Bodega</th>
                    <th className="text-left py-2 px-3">Centro de Costo</th>
                    <th className="text-left py-2 px-3">Tipo</th>
                    <th className="text-right py-2 px-3">Cantidad</th>
                    <th className="text-right py-2 px-3">Ultima Actualizacion</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((inv: InventoryRecord) => (
                    <tr key={inv.id} className="border-b border-muted">
                      <td className="py-2 px-3 font-medium">{inv.warehouse?.name || "\u2014"}</td>
                      <td className="py-2 px-3">{inv.warehouse?.costCenter || "\u2014"}</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-xs">
                          {inv.warehouse?.subWarehouseType || inv.warehouse?.warehouseType || "\u2014"}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-right font-bold">{inv.quantity}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{formatDateShort(inv.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Numeros de Serie */}
      {product.requiresSerial && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Hash className="h-5 w-5" /> Numeros de Serie ({serials.length})
              </span>
              {serials.length > 0 && (
                <Button variant="outline" size="sm" onClick={handlePrintAllSerialsQR}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir Todas las Etiquetas
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {serials.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin numeros de serie registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">N Serie</th>
                      <th className="text-left py-2 px-3">Bodega Actual</th>
                      <th className="text-left py-2 px-3">Estado</th>
                      <th className="text-left py-2 px-3">Fecha Ingreso</th>
                      <th className="text-center py-2 px-3">QR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serials.map((serial: SerialRecord) => (
                      <tr key={serial.id} className="border-b border-muted">
                        <td className="py-2 px-3 font-mono font-bold">{serial.serialNumber}</td>
                        <td className="py-2 px-3">{serial.warehouse?.name || "\u2014"}</td>
                        <td className="py-2 px-3">
                          <Badge variant={
                            serial.status === "active" ? "default" :
                            serial.status === "damaged" ? "destructive" : "secondary"
                          }>
                            {serial.status === "active" ? "Activo" :
                             serial.status === "sold" ? "Vendido" :
                             serial.status === "damaged" ? "Danado" : serial.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{formatDateShort(serial.createdAt)}</td>
                        <td className="py-2 px-3 text-center">
                          <Button variant="outline" size="sm" onClick={() => handlePrintSerialQR(serial)}>
                            <Printer className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Historial de Movimientos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" /> Historial de Movimientos ({movements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin movimientos registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Fecha</th>
                    <th className="text-left py-2 px-3">Tipo</th>
                    <th className="text-left py-2 px-3">Bodega</th>
                    <th className="text-right py-2 px-3">Cantidad</th>
                    <th className="text-left py-2 px-3">Razon</th>
                    <th className="text-left py-2 px-3">OC</th>
                    <th className="text-left py-2 px-3">Guia Despacho</th>
                    <th className="text-left py-2 px-3">Realizado por</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((mov: MovementRecord) => (
                    <tr key={mov.id} className="border-b border-muted">
                      <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">{formatDate(mov.createdAt)}</td>
                      <td className="py-2 px-3">
                        <Badge variant={mov.movementType === "in" ? "default" : "destructive"} className="text-xs">
                          {mov.movementType === "in" ? "Entrada" : "Salida"}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">{mov.warehouse?.name || "\u2014"}</td>
                      <td className="py-2 px-3 text-right font-bold">{mov.quantity}</td>
                      <td className="py-2 px-3 max-w-[200px] truncate" title={mov.reason || ""}>
                        {mov.reason || "\u2014"}
                      </td>
                      <td className="py-2 px-3">
                        {mov.purchaseOrderNumber ? (
                          <span className="font-mono text-xs">{mov.purchaseOrderNumber}</span>
                        ) : "\u2014"}
                      </td>
                      <td className="py-2 px-3">
                        {mov.dispatchGuideNumber ? (
                          <span className="font-mono text-xs">{mov.dispatchGuideNumber}</span>
                        ) : "\u2014"}
                      </td>
                      <td className="py-2 px-3 flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {getUserName(mov)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}
