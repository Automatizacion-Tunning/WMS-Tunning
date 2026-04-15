import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Package, ArrowUpCircle, Scan, Info, FileText } from "lucide-react";
import SimpleProductEntryForm from "@/components/forms/SimpleProductEntryForm";
import { printLabels } from "@/components/modals/QRLabelModal";
import type { InventoryMovementWithDetails } from "@shared/schema";

export default function StockEntry() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Obtener movimientos de inventario recientes (ingresos)
  const { data: movements = [], isLoading } = useQuery<InventoryMovementWithDetails[]>({
    queryKey: ["/api/inventory-movements"],
  });

  // Filtrar solo ingresos (movementType === 'in')
  const entries = movements.filter(m => m.movementType === "in");

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const formatMoney = (val: string | null) => {
    if (!val) return "-";
    const num = parseFloat(val);
    return "$" + num.toLocaleString("es-CL", { minimumFractionDigits: 0 });
  };

  const handleEntrySuccess = (printData?: any) => {
    setIsCreateDialogOpen(false);

    if (printData) {
      // Calcular fecha de vencimiento de garantía
      let warrantyExpiry = "—";
      if (printData.hasWarranty && printData.warrantyMonths) {
        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + printData.warrantyMonths);
        warrantyExpiry = expiry.toLocaleDateString("es-CL", { year: "numeric", month: "2-digit", day: "2-digit" });
      }

      const baseData = {
        costCenter: printData.costCenter || "—",
        purchaseOrder: printData.purchaseOrder || "—",
        warrantyExpiry,
      };

      // Solo imprimir QR si tiene números de serie
      if (printData.serialNumbers && printData.serialNumbers.length > 0) {
        printLabels(printData.serialNumbers.map((sn: string) => ({
          id: printData.productId,
          name: printData.productName,
          sku: sn,
          serialNumber: sn,
          ...baseData,
        })));
      }
      // Productos sin serial NO generan QR
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header con botón */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ingreso de Productos</h1>
          <p className="text-muted-foreground">
            Gestión de ingreso de productos por centro de costo
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Ingreso
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Ingreso de Producto
              </DialogTitle>
              <DialogDescription>
                Ingresa un producto al inventario. Selecciona el centro de costo,
                el producto y la cantidad a ingresar. Puedes escanear el código
                de barras con el botón SCANNER para buscar el producto automáticamente.
              </DialogDescription>
            </DialogHeader>
            <SimpleProductEntryForm
              onSuccess={handleEntrySuccess}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Guía de uso */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Info className="w-5 h-5 text-blue-600" />
            ¿Cómo funciona el ingreso de productos?
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <ArrowUpCircle className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Nuevo Ingreso</p>
                <p className="text-xs text-blue-700">Haz clic en el botón para abrir el formulario de ingreso.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <Scan className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Scanner</p>
                <p className="text-xs text-blue-700">Usa el botón SCANNER para buscar productos por código de barras.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Centro de Costo</p>
                <p className="text-xs text-blue-700">Selecciona el centro de costo destino y el producto a ingresar.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Bodega Principal</p>
                <p className="text-xs text-blue-700">El producto se ingresa automáticamente a la bodega principal del CC.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de ingresos recientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5" />
            Ingresos Recientes
          </CardTitle>
          <CardDescription>
            Historial de los últimos ingresos de productos al inventario
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay ingresos registrados</h3>
              <p className="text-muted-foreground mb-4">
                Haz clic en "Nuevo Ingreso" para registrar el primer ingreso de producto.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Ingreso
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Bodega / CC</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Precio Unit.</TableHead>
                    <TableHead>Razón</TableHead>
                    <TableHead>Usuario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(entry.createdAt as string)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{entry.product?.name || "-"}</div>
                        <div className="text-xs text-muted-foreground">
                          {entry.product?.sku || "Sin SKU"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{entry.warehouse?.name || "-"}</div>
                        <Badge variant="outline" className="text-xs font-mono">
                          {entry.warehouse?.costCenter || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {entry.quantity}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatMoney(entry.appliedPrice)}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate text-sm text-muted-foreground" title={entry.reason || ""}>
                          {entry.reason || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.user?.firstName || entry.user?.username || "-"}
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
