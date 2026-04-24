import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  FileSpreadsheet,
  FileText,
  Package,
  Building2,
  History,
  Truck,
  Loader2,
  ShieldAlert,
  Download,
  ChartBar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type { ProjectReport } from "@shared/contracts/reports";

const moneyFmt = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const intFmt = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("es-CL", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const fmtMoney = (v: number | null | undefined) => (v == null ? "—" : moneyFmt.format(v));
const fmtInt = (v: number | null | undefined) => (v == null ? "—" : intFmt.format(v));
const fmtDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : "—");

export default function ProjectReportPage() {
  const { can, isLoading: permsLoading } = usePermissions();
  const canView = can("reports.view");
  const { toast } = useToast();

  const [selectedCc, setSelectedCc] = useState<string>("");
  const [downloading, setDownloading] = useState<"xlsx" | "pdf" | null>(null);

  const { data: ccList = [], isLoading: loadingCcs } = useQuery<string[]>({
    queryKey: ["/api/dashboard/available-cost-centers"],
    enabled: canView,
  });

  const { data: report, isLoading: loadingReport, refetch, error } = useQuery<ProjectReport>({
    queryKey: [`/api/informes/proyecto/${selectedCc}`],
    enabled: canView && !!selectedCc,
    staleTime: 60_000,
  });

  const downloadFile = async (format: "xlsx" | "pdf") => {
    if (!selectedCc) return;
    setDownloading(format);
    try {
      const res = await fetch(`/api/informes/proyecto/${selectedCc}/export?format=${format}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${await res.text()}`);
      }
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") ?? "";
      const filenameMatch = /filename="([^"]+)"/.exec(cd);
      const filename = filenameMatch?.[1] ?? `informe-${selectedCc}.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Descarga lista", description: filename });
    } catch (err: any) {
      toast({
        title: "No se pudo descargar",
        description: err?.message ?? "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  // Acceso bloqueado por permiso
  if (!permsLoading && !canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <ShieldAlert className="w-12 h-12 text-amber-400 mb-3" />
        <h2 className="text-lg font-semibold text-zinc-100">Sin acceso a Informes</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Tu rol actual no incluye el permiso <code className="text-amber-400">reports.view</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-amber-400 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Informes por Proyecto
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vista consolidada del estado de un centro de costo (productos, stock, OC, series, movimientos).
          </p>
        </div>
      </div>

      {/* Selector */}
      <Card className="bg-zinc-950 border-amber-400/20">
        <CardHeader>
          <CardTitle className="text-amber-400 text-base flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Selecciona el proyecto
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1 max-w-md">
            <Select value={selectedCc} onValueChange={setSelectedCc} disabled={loadingCcs}>
              <SelectTrigger>
                <SelectValue placeholder={loadingCcs ? "Cargando..." : "Seleccionar centro de costo"} />
              </SelectTrigger>
              <SelectContent>
                {ccList.map((cc) => (
                  <SelectItem key={cc} value={cc}>
                    {cc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => refetch()}
              disabled={!selectedCc || loadingReport}
            >
              {loadingReport ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Refrescar
            </Button>
            <Button
              variant="outline"
              className="border-amber-400/40 text-amber-400 hover:bg-amber-400/10"
              onClick={() => downloadFile("xlsx")}
              disabled={!report || downloading !== null}
            >
              {downloading === "xlsx" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 mr-2" />
              )}
              Excel
            </Button>
            <Button
              variant="outline"
              className="border-amber-400/40 text-amber-400 hover:bg-amber-400/10"
              onClick={() => downloadFile("pdf")}
              disabled={!report || downloading !== null}
            >
              {downloading === "pdf" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estados */}
      {!selectedCc && (
        <Card className="bg-zinc-950 border-amber-400/10">
          <CardContent className="py-12 text-center text-muted-foreground">
            Selecciona un centro de costo para generar el informe.
          </CardContent>
        </Card>
      )}

      {selectedCc && loadingReport && (
        <Card className="bg-zinc-950 border-amber-400/10">
          <CardContent className="py-6 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      )}

      {selectedCc && error && !loadingReport && (
        <Card className="bg-zinc-950 border-red-500/40">
          <CardContent className="py-6 text-red-400 text-sm">
            No se pudo cargar el informe: {(error as Error).message}
          </CardContent>
        </Card>
      )}

      {report && !loadingReport && <ReportView report={report} />}
    </div>
  );
}

function ReportView({ report }: { report: ProjectReport }) {
  const productsSorted = useMemo(
    () => [...report.products].sort((a, b) => b.pricing.totalValue - a.pricing.totalValue),
    [report.products]
  );

  return (
    <Tabs defaultValue="resumen" className="space-y-3">
      <TabsList className="bg-zinc-900 border border-amber-400/10">
        <TabsTrigger value="resumen">Resumen</TabsTrigger>
        <TabsTrigger value="productos">Productos</TabsTrigger>
        <TabsTrigger value="bodegas">Bodegas</TabsTrigger>
        <TabsTrigger value="oc">OC</TabsTrigger>
        <TabsTrigger value="auditoria">Auditoría</TabsTrigger>
      </TabsList>

      {/* RESUMEN */}
      <TabsContent value="resumen">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <SummaryCard label="Productos" value={fmtInt(report.summary.totalProducts)} icon={<Package className="w-4 h-4" />} />
          <SummaryCard label="Cantidad total" value={fmtInt(report.summary.totalQuantity)} />
          <SummaryCard label="Valor total" value={fmtMoney(report.summary.totalValue)} accent />
          <SummaryCard label="Con stock" value={fmtInt(report.summary.productsWithStock)} />
          <SummaryCard label="Despachados" value={fmtInt(report.summary.productsDispatched)} />
          <SummaryCard label="Solo histórico" value={fmtInt(report.summary.productsOnlyHistoric)} icon={<History className="w-4 h-4" />} />
        </div>
      </TabsContent>

      {/* PRODUCTOS */}
      <TabsContent value="productos">
        <Card className="bg-zinc-950 border-amber-400/10">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Despacho</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Últ. mov.</TableHead>
                  <TableHead>Series A/V/D</TableHead>
                  <TableHead>Flags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsSorted.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <Link href={`/producto/${p.id}`} className="hover:text-amber-400">
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell>{p.sku ?? "—"}</TableCell>
                    <TableCell>{p.category ?? "—"}</TableCell>
                    <TableCell className="text-right">{fmtInt(p.stock.total)}</TableCell>
                    <TableCell className="text-right">{fmtInt(p.stock.dispatched)}</TableCell>
                    <TableCell className="text-right">{fmtMoney(p.pricing.currentPrice)}</TableCell>
                    <TableCell className="text-right text-amber-400">{fmtMoney(p.pricing.totalValue)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.movements.lastInDate || p.movements.lastOutDate
                        ? `↓ ${fmtDate(p.movements.lastInDate)} | ↑ ${fmtDate(p.movements.lastOutDate)}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.serials.active}/{p.serials.sold}/{p.serials.damaged}
                    </TableCell>
                    <TableCell className="space-x-1">
                      {p.flags.onlyHistoric && (
                        <Badge variant="outline" className="border-zinc-500 text-zinc-300">
                          Histórico
                        </Badge>
                      )}
                      {p.flags.inTransit && (
                        <Badge variant="outline" className="border-blue-400 text-blue-400">
                          <Truck className="w-3 h-3 mr-1" /> Tránsito
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* BODEGAS */}
      <TabsContent value="bodegas">
        <Card className="bg-zinc-950 border-amber-400/10">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Bodega</TableHead>
                  <TableHead>Sub-bodega</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.products.flatMap((p) => {
                  const rows = p.stock.byWarehouse.map((s, i) => (
                    <TableRow key={`${p.id}-w-${s.warehouseId}-${i}`}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{s.warehouseName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.subWarehouseType ?? "principal"}
                      </TableCell>
                      <TableCell className="text-right">{fmtInt(s.quantity)}</TableCell>
                    </TableRow>
                  ));
                  if (p.stock.dispatched > 0) {
                    rows.push(
                      <TableRow key={`${p.id}-disp`}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="italic text-muted-foreground">(Despacho)</TableCell>
                        <TableCell className="text-xs text-muted-foreground">despacho</TableCell>
                        <TableCell className="text-right">{fmtInt(p.stock.dispatched)}</TableCell>
                      </TableRow>
                    );
                  }
                  return rows;
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* OC */}
      <TabsContent value="oc">
        <Card className="bg-zinc-950 border-amber-400/10">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>OC</TableHead>
                  <TableHead className="text-right">Línea</TableHead>
                  <TableHead className="text-right">Ordenada</TableHead>
                  <TableHead className="text-right">Recibida</TableHead>
                  <TableHead className="text-right">% Recep.</TableHead>
                  <TableHead className="text-right">Precio U.</TableHead>
                  <TableHead>Recep. bodega</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.products.flatMap((p) =>
                  p.purchaseOrders.map((oc, i) => (
                    <TableRow key={`${p.id}-oc-${oc.purchaseOrderNumber}-${i}`}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="font-mono text-xs">{oc.purchaseOrderNumber}</TableCell>
                      <TableCell className="text-right">{oc.purchaseOrderLine}</TableCell>
                      <TableCell className="text-right">{fmtInt(oc.orderedQuantity)}</TableCell>
                      <TableCell className="text-right">{fmtInt(oc.receivedQuantity)}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            oc.receptionPercentage >= 100
                              ? "border-green-500 text-green-400"
                              : "border-amber-400 text-amber-400"
                          }
                        >
                          {oc.receptionPercentage}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{fmtMoney(oc.unitPrice)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtDate(oc.warehouseReceptionDate)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* AUDITORÍA */}
      <TabsContent value="auditoria">
        <Card className="bg-zinc-950 border-amber-400/10">
          <CardContent className="py-6 space-y-2 text-sm">
            <Field label="Centro de costo" value={report.costCenter} />
            <Field label="Generado" value={fmtDate(report.generatedAt)} />
            <Field
              label="Generado por"
              value={`${report.generatedBy.fullName ?? report.generatedBy.username} (#${report.generatedBy.id})`}
            />
            <Field label="Versión informe" value={report.reportVersion} />
            <Field label="Bodegas incluidas" value={String(report.warehouses.length)} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function SummaryCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="bg-zinc-950 border-amber-400/10">
      <CardContent className="py-5">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
          <span>{label}</span>
          {icon ?? <ChartBar className="w-4 h-4" />}
        </div>
        <div className={`mt-2 text-2xl font-semibold ${accent ? "text-amber-400" : "text-zinc-100"}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-amber-400/10 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-zinc-100">{value}</span>
    </div>
  );
}
