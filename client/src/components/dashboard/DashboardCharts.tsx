import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PackageOpen, Warehouse, SlidersHorizontal, RefreshCw, BarChart3, PieChartIcon, TrendingUp, AlertCircle, X, Filter, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardOcStatus, DashboardWarehouseDistribution } from "@shared/schema";

const ocChartConfig = {
  totalReceived: {
    label: "Recibido",
    color: "hsl(142, 76%, 36%)",
  },
  totalPending: {
    label: "Pendiente",
    color: "hsl(25, 95%, 53%)",
  },
} satisfies ChartConfig;

const WAREHOUSE_COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(142, 76%, 36%)",
  "hsl(25, 95%, 53%)",
  "hsl(262, 83%, 58%)",
  "hsl(0, 84%, 60%)",
  "hsl(47, 96%, 53%)",
  "hsl(186, 72%, 44%)",
  "hsl(330, 81%, 60%)",
];

function OcStatusChart({ costCenter }: { costCenter?: string }) {
  const queryParams = costCenter ? `?costCenter=${encodeURIComponent(costCenter)}` : "";
  const { data, isLoading } = useQuery<DashboardOcStatus[]>({
    queryKey: ["/api/dashboard/oc-status", { costCenter }],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/oc-status${queryParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-3">
          <Skeleton className="h-16 w-1/3 rounded-lg" />
          <Skeleton className="h-16 w-1/3 rounded-lg" />
          <Skeleton className="h-16 w-1/3 rounded-lg" />
        </div>
        <Skeleton className="h-[260px] w-full rounded-lg" />
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground border border-dashed rounded-lg">
        <PackageOpen className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">Sin datos de ordenes de compra</p>
        <p className="text-xs mt-1 opacity-70">No hay recepciones registradas para este filtro</p>
      </div>
    );
  }

  const totalReceived = data.reduce((s, d) => s + d.totalReceived, 0);
  const totalPending = data.reduce((s, d) => s + d.totalPending, 0);
  const totalLines = data.reduce((s, d) => s + d.lineCount, 0);
  const pctReceived = totalReceived + totalPending > 0
    ? Math.round((totalReceived / (totalReceived + totalPending)) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* KPI mini-cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-green-700 dark:text-green-400 font-medium">Recibido</p>
          <p className="text-lg font-bold text-green-800 dark:text-green-300">{totalReceived.toLocaleString()}</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-orange-700 dark:text-orange-400 font-medium">Pendiente</p>
          <p className="text-lg font-bold text-orange-800 dark:text-orange-300">{totalPending.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Cumplimiento</p>
          <p className="text-lg font-bold text-blue-800 dark:text-blue-300">{pctReceived}%</p>
        </div>
      </div>

      {/* Chart */}
      <ChartContainer config={ocChartConfig} className="h-[260px] w-full">
        <BarChart data={data} accessibilityLayer>
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="opacity-50" />
          <XAxis
            dataKey="costCenter"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value) => value.length > 12 ? value.slice(0, 12) + "..." : value}
            className="text-xs"
          />
          <YAxis tickLine={false} axisLine={false} className="text-xs" />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name, item) => (
                  <span>
                    {ocChartConfig[name as keyof typeof ocChartConfig]?.label}: {Number(value).toLocaleString()}
                    {name === "totalPending" && item?.payload?.lineCount && (
                      <span className="text-muted-foreground ml-1">({item.payload.lineCount} lineas)</span>
                    )}
                  </span>
                )}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="totalReceived" stackId="a" fill="var(--color-totalReceived)" radius={[0, 0, 4, 4]} />
          <Bar dataKey="totalPending" stackId="a" fill="var(--color-totalPending)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
        <span className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          {data.length} centro{data.length !== 1 ? "s" : ""} de costo
        </span>
        <span>{totalLines} linea{totalLines !== 1 ? "s" : ""} de OC</span>
      </div>
    </div>
  );
}

function WarehouseDistributionChart({ costCenter }: { costCenter?: string }) {
  const queryParams = costCenter ? `?costCenter=${encodeURIComponent(costCenter)}` : "";
  const { data, isLoading } = useQuery<DashboardWarehouseDistribution[]>({
    queryKey: ["/api/dashboard/warehouse-distribution", { costCenter }],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/warehouse-distribution${queryParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-3">
          <Skeleton className="h-16 w-1/2 rounded-lg" />
          <Skeleton className="h-16 w-1/2 rounded-lg" />
        </div>
        <Skeleton className="h-[260px] w-full rounded-lg" />
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground border border-dashed rounded-lg">
        <Warehouse className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">Sin datos de distribucion en bodegas</p>
        <p className="text-xs mt-1 opacity-70">No hay inventario registrado para este filtro</p>
      </div>
    );
  }

  const totalStock = data.reduce((s, d) => s + d.totalStock, 0);
  const totalProducts = data.reduce((s, d) => s + d.productCount, 0);
  const usePie = data.length <= 6;

  return (
    <div className="space-y-4">
      {/* KPI mini-cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-indigo-700 dark:text-indigo-400 font-medium">Stock Total</p>
          <p className="text-lg font-bold text-indigo-800 dark:text-indigo-300">{totalStock.toLocaleString()}</p>
        </div>
        <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-violet-700 dark:text-violet-400 font-medium">Productos</p>
          <p className="text-lg font-bold text-violet-800 dark:text-violet-300">{totalProducts.toLocaleString()}</p>
        </div>
      </div>

      {/* Chart */}
      {usePie ? (
        <PieChartView data={data} />
      ) : (
        <BarChartView data={data} />
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
        <span className="flex items-center gap-1">
          {usePie ? <PieChartIcon className="w-3 h-3" /> : <BarChart3 className="w-3 h-3" />}
          {data.length} bodega{data.length !== 1 ? "s" : ""}
        </span>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
          {usePie ? "Circular" : "Barras"}
        </Badge>
      </div>
    </div>
  );
}

function PieChartView({ data }: { data: DashboardWarehouseDistribution[] }) {
  const pieConfig: ChartConfig = {};
  data.forEach((item, i) => {
    pieConfig[item.warehouseName] = {
      label: item.warehouseName,
      color: WAREHOUSE_COLORS[i % WAREHOUSE_COLORS.length],
    };
  });

  return (
    <ChartContainer config={pieConfig} className="h-[260px] w-full">
      <PieChart accessibilityLayer>
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name, item) => (
                <span>
                  {name}: {Number(value).toLocaleString()} unidades
                  {item?.payload?.productCount && (
                    <span className="text-muted-foreground ml-1">({item.payload.productCount} productos)</span>
                  )}
                </span>
              )}
            />
          }
        />
        <Pie
          data={data}
          dataKey="totalStock"
          nameKey="warehouseName"
          cx="50%"
          cy="50%"
          outerRadius={95}
          innerRadius={45}
          paddingAngle={2}
          label={({ warehouseName, totalStock }) =>
            `${warehouseName.length > 10 ? warehouseName.slice(0, 10) + "..." : warehouseName}: ${totalStock}`
          }
        >
          {data.map((_, i) => (
            <Cell key={i} fill={WAREHOUSE_COLORS[i % WAREHOUSE_COLORS.length]} strokeWidth={1} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent />} />
      </PieChart>
    </ChartContainer>
  );
}

function BarChartView({ data }: { data: DashboardWarehouseDistribution[] }) {
  const barConfig: ChartConfig = {
    totalStock: {
      label: "Stock Total",
      color: "hsl(221, 83%, 53%)",
    },
  };

  return (
    <ChartContainer config={barConfig} className="h-[260px] w-full">
      <BarChart data={data} accessibilityLayer layout="vertical">
        <CartesianGrid horizontal={false} strokeDasharray="3 3" className="opacity-50" />
        <XAxis type="number" tickLine={false} axisLine={false} className="text-xs" />
        <YAxis
          type="category"
          dataKey="warehouseName"
          tickLine={false}
          axisLine={false}
          width={120}
          tickFormatter={(value) => value.length > 15 ? value.slice(0, 15) + "..." : value}
          className="text-xs"
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, _name, item) => (
                <span>
                  Stock: {Number(value).toLocaleString()} unidades
                  {item?.payload?.productCount && (
                    <span className="text-muted-foreground ml-1">({item.payload.productCount} productos)</span>
                  )}
                  {item?.payload?.costCenter && (
                    <span className="text-muted-foreground ml-1">- CC: {item.payload.costCenter}</span>
                  )}
                </span>
              )}
            />
          }
        />
        <Bar dataKey="totalStock" fill="var(--color-totalStock)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function DashboardChartsSection() {
  const [selectedCc, setSelectedCc] = useState<string>("__all__");

  const { data: costCenters, isLoading: ccLoading, error: ccError, refetch: refetchCc } = useQuery<string[]>({
    queryKey: ["/api/dashboard/available-cost-centers"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/available-cost-centers", { credentials: "include" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json();
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  const filterCc = selectedCc === "__all__" ? undefined : selectedCc;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Graficos de Suministros
            </CardTitle>
            <CardDescription className="mt-1">
              Resumen de ordenes de compra y distribucion de inventario
            </CardDescription>
          </div>

          {/* Filtro mejorado */}
          <div className="flex items-center gap-2">
            {ccLoading ? (
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-[300px] rounded-xl" />
              </div>
            ) : ccError ? (
              <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5 shadow-sm">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-destructive">Error al cargar filtros</span>
                  <span className="text-xs text-destructive/70">No se pudieron obtener los centros de costo</span>
                </div>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 ml-2 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => refetchCc()}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reintentar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-muted/40 border border-border/50 rounded-xl px-3 py-1.5 shadow-sm transition-all hover:shadow-md hover:border-border">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex flex-col mr-1">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-none mb-0.5">Centro de costo</span>
                  <Select value={selectedCc} onValueChange={setSelectedCc}>
                    <SelectTrigger className="w-[200px] border-0 bg-transparent shadow-none h-6 p-0 focus:ring-0 focus:ring-offset-0 text-sm font-medium">
                      <SelectValue placeholder="Seleccionar filtro" />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="__all__">
                        <div className="flex items-center gap-2">
                          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Todos los centros</span>
                        </div>
                      </SelectItem>
                      {costCenters?.map((cc) => (
                        <SelectItem key={cc} value={cc}>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{cc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedCc !== "__all__" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 rounded-full hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setSelectedCc("__all__")}
                    title="Limpiar filtro"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Badge de filtro activo mejorado */}
        {selectedCc !== "__all__" && (
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-medium gap-1.5 py-1 px-2.5 rounded-lg bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
              <Filter className="w-3 h-3" />
              Filtrando: {selectedCc}
              <button
                onClick={() => setSelectedCc("__all__")}
                className="ml-1 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
            <span className="text-xs text-muted-foreground">
              {costCenters?.length ?? 0} centro{(costCenters?.length ?? 0) !== 1 ? "s" : ""} disponible{(costCenters?.length ?? 0) !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* OC Status */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-primary rounded-full" />
              <h3 className="text-sm font-semibold">Estado Ordenes de Compra</h3>
            </div>
            <OcStatusChart costCenter={filterCc} />
          </div>

          {/* Warehouse Distribution */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-primary rounded-full" />
              <h3 className="text-sm font-semibold">Distribucion por Bodega</h3>
            </div>
            <WarehouseDistributionChart costCenter={filterCc} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
