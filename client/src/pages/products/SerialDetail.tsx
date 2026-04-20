import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, ArrowLeft, Warehouse, ArrowRightLeft, Hash, FileText, User, Printer } from "lucide-react";
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
  purchaseOrderNumber?: string | null;
  costCenter?: string | null;
  warehouse?: { id: number; name: string; costCenter: string; warehouseType?: string; subWarehouseType?: string | null } | null;
}

interface SerialVida {
  serial: SerialRecord;
  product: ProductWithDetails;
  movements: MovementRecord[];
}

export default function SerialDetail() {
  const [, params] = useRoute("/serie/:productId/:serialNumber");
  const { can, isAdmin, isLoading: permLoading } = usePermissions();

  const productId = params?.productId ? parseInt(params.productId) : null;
  const serialNumber = params?.serialNumber ? decodeURIComponent(params.serialNumber) : null;

  const { data, isLoading, error } = useQuery<SerialVida>({
    queryKey: [`/api/serials/${productId}/${serialNumber}/vida`],
    enabled: !!productId && !!serialNumber,
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

  if (error || !data?.serial || !data?.product) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg text-muted-foreground">Numero de serie no encontrado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { serial, product, movements } = data;

  const getWarrantyExpiry = () => {
    if (!product.hasWarranty || !product.warrantyMonths) return "\u2014";
    const baseDate = serial.createdAt ? new Date(serial.createdAt) : new Date(product.createdAt);
    baseDate.setMonth(baseDate.getMonth() + product.warrantyMonths);
    return baseDate.toLocaleDateString("es-CL", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  const handlePrintQR = () => {
    printLabels([{
      id: product.id,
      name: product.name,
      sku: serial.serialNumber,
      serialNumber: serial.serialNumber,
      costCenter: serial.costCenter || serial.warehouse?.costCenter || "\u2014",
      purchaseOrder: serial.purchaseOrderNumber || "\u2014",
      warrantyExpiry: getWarrantyExpiry(),
    }]);
  };

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
              <Hash className="h-8 w-8" />
              Hoja de Vida -- S/N: {serial.serialNumber}
            </h1>
            <p className="text-muted-foreground">
              {product.name} | SKU: {product.sku || "Sin SKU"}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button onClick={handlePrintQR}>
            <Printer className="h-4 w-4 mr-2" />
            Reimprimir QR
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Info del Serial */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Hash className="h-4 w-4" /> Numero de Serie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="N Serie" value={serial.serialNumber} />
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">Estado</span>
              <Badge variant={
                serial.status === "active" ? "default" :
                serial.status === "damaged" ? "destructive" : "secondary"
              }>
                {serial.status === "active" ? "Activo" :
                 serial.status === "sold" ? "Vendido" :
                 serial.status === "damaged" ? "Danado" : serial.status}
              </Badge>
            </div>
            <InfoRow label="Fecha Ingreso" value={formatDateShort(serial.createdAt)} />
          </CardContent>
        </Card>

        {/* Ubicacion */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Warehouse className="h-4 w-4" /> Ubicacion Actual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="Bodega" value={serial.warehouse?.name || "\u2014"} />
            <InfoRow label="Centro de Costo" value={serial.costCenter || serial.warehouse?.costCenter || "\u2014"} />
            <InfoRow label="Tipo Bodega" value={serial.warehouse?.subWarehouseType || serial.warehouse?.warehouseType || "\u2014"} />
          </CardContent>
        </Card>

        {/* Trazabilidad */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Trazabilidad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="Orden de Compra" value={serial.purchaseOrderNumber || "\u2014"} />
            <InfoRow label="Garantia" value={product.hasWarranty ? `${product.warrantyMonths} meses` : "Sin garantia"} />
            {product.hasWarranty && (
              <InfoRow label="Vence" value={getWarrantyExpiry()} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info del Producto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> Producto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-sm">
            <InfoRow label="Nombre" value={product.name} />
            <InfoRow label="SKU" value={product.sku || "\u2014"} />
            <InfoRow label="Codigo de Barras" value={product.barcode || "\u2014"} />
            <InfoRow label="Codigo ERP" value={product.erpProductCode || "\u2014"} />
            <InfoRow label="Unidad" value={product.unit ? `${product.unit.name} (${product.unit.abbreviation})` : "\u2014"} />
            <InfoRow label="Categoria" value={product.category?.name || "\u2014"} />
            <InfoRow label="Marca" value={product.brand?.name || "\u2014"} />
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">Tipo</span>
              <Badge variant={product.productType === "tangible" ? "default" : "secondary"}>
                {product.productType === "tangible" ? "Tangible" : "Intangible"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historial de Movimientos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" /> Historial de Movimientos ({movements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin movimientos registrados para este serial.</p>
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
