import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, Check, Clock, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface OrdenCompra {
  codaux: string;
  nomaux: string | null;
  numoc: string;
  numinteroc: number | null;
  fechaoc: string | null;
  numlinea: number;
  codprod: string | null;
  desprod: string | null;
  desprod2: string | null;
  fechaent: string | null;
  cantidad: string | null;
  recibido: string | null;
  codicc: string | null;
  equivmonoc: string | null;
  subtotaloc: string | null;
  subtotalmb: string | null;
  valortotoc: string | null;
  valortotmb: string | null;
  estado_registro: string | null;
  fecha_sincronizacion: string | null;
  fecha_creacion: string | null;
  fecha_modificacion: string | null;
  fecultact: string | null;
  tipo: string | null;
  // Tracking local
  localReceivedQuantity?: number;
  pendingQuantity?: number;
  isFullyReceived?: boolean;
}

interface OrdenesResponse {
  rows: OrdenCompra[];
  total: number;
}

const PAGE_SIZE = 50;

export default function PurchaseOrders() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCC, setFilterCC] = useState("all");
  const [filterEstado, setFilterEstado] = useState("all");
  const [filterTipo, setFilterTipo] = useState("all");
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Build query params
  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filterCC !== "all") params.set("costCenter", filterCC);
    if (filterEstado !== "all") params.set("estado", filterEstado);
    if (filterTipo !== "all") params.set("tipoCategoria", filterTipo);
    return params.toString();
  }, [page, debouncedSearch, filterCC, filterEstado, filterTipo]);

  const { data, isLoading, isFetching } = useQuery<OrdenesResponse>({
    queryKey: ["/api/ordenes-compra", page, debouncedSearch, filterCC, filterEstado, filterTipo],
    queryFn: async () => {
      return apiRequest(`/api/ordenes-compra?${buildParams()}`);
    },
  });

  const { data: costCenters = [] } = useQuery<string[]>({
    queryKey: ["/api/ordenes-compra/cost-centers"],
  });

  const ordenes = data?.rows || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleFilterCC = (val: string) => { setFilterCC(val); setPage(1); };
  const handleFilterEstado = (val: string) => { setFilterEstado(val); setPage(1); };
  const handleFilterTipo = (val: string) => { setFilterTipo(val); setPage(1); };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("es-CL");
    } catch {
      return dateStr;
    }
  };

  const formatMoney = (val: string | null) => {
    if (!val) return "-";
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return "$" + num.toLocaleString("es-CL", { minimumFractionDigits: 0 });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ordenes de Compra</h2>
          <p className="text-muted-foreground">
            Datos de pav_inn_ordencom - {total.toLocaleString("es-CL")} registros totales
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por OC, proveedor, producto, CC..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterTipo} onValueChange={handleFilterTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="suministros">Suministros</SelectItem>
                <SelectItem value="servicios">Servicios</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCC} onValueChange={handleFilterCC}>
              <SelectTrigger>
                <SelectValue placeholder="Centro de Costo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los CC</SelectItem>
                {costCenters.map((cc) => (
                  <SelectItem key={cc} value={cc}>{cc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEstado} onValueChange={handleFilterEstado}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="Activo">Activo</SelectItem>
                <SelectItem value="Inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Mostrando {ordenes.length} de {total.toLocaleString("es-CL")} registros
          {(isLoading || isFetching) && (
            <span className="ml-2 inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></span>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          Pagina {page} de {totalPages.toLocaleString("es-CL")}
        </div>
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">N OC</th>
                  <th className="text-center p-3 font-medium">Tipo</th>
                  <th className="text-left p-3 font-medium">Linea</th>
                  <th className="text-left p-3 font-medium">Fecha OC</th>
                  <th className="text-left p-3 font-medium">Proveedor</th>
                  <th className="text-left p-3 font-medium">Producto</th>
                  <th className="text-left p-3 font-medium">Descripcion</th>
                  <th className="text-right p-3 font-medium">Cantidad</th>
                  <th className="text-right p-3 font-medium">Recibido ERP</th>
                  <th className="text-right p-3 font-medium bg-blue-50">Recibido Local</th>
                  <th className="text-right p-3 font-medium bg-blue-50">Pendiente</th>
                  <th className="text-center p-3 font-medium bg-blue-50">Recepcion</th>
                  <th className="text-left p-3 font-medium">Centro Costo</th>
                  <th className="text-right p-3 font-medium">Subtotal MB</th>
                  <th className="text-left p-3 font-medium">Estado</th>
                  <th className="text-left p-3 font-medium">Fecha Entrega</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={16} className="p-8 text-center text-muted-foreground">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      Cargando ordenes de compra...
                    </td>
                  </tr>
                ) : ordenes.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="p-8 text-center text-muted-foreground">
                      No se encontraron registros
                    </td>
                  </tr>
                ) : (
                  ordenes.map((o, idx) => {
                    const localReceived = o.localReceivedQuantity || 0;
                    const pending = o.pendingQuantity ?? parseFloat(o.cantidad || "0");
                    const isComplete = o.isFullyReceived || false;
                    const isPartial = localReceived > 0 && !isComplete;

                    return (
                      <tr key={`${o.numoc}-${o.numlinea}-${idx}`}
                        className={`border-b hover:bg-muted/30 ${isComplete ? 'bg-green-50/30' : ''}`}>
                        <td className="p-3 font-mono font-medium">{o.numoc}</td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className="text-xs">{o.tipo || "-"}</Badge>
                        </td>
                        <td className="p-3 text-center">{o.numlinea}</td>
                        <td className="p-3 whitespace-nowrap">{formatDate(o.fechaoc)}</td>
                        <td className="p-3">
                          <div className="max-w-[180px] truncate" title={o.nomaux || o.codaux}>
                            {o.nomaux || o.codaux}
                          </div>
                          <span className="text-xs text-muted-foreground">{o.codaux}</span>
                        </td>
                        <td className="p-3 font-mono text-xs">{o.codprod || "-"}</td>
                        <td className="p-3">
                          <div className="max-w-[200px] truncate" title={o.desprod || ""}>
                            {o.desprod || "-"}
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono">{o.cantidad ? parseFloat(o.cantidad).toLocaleString("es-CL") : "-"}</td>
                        <td className="p-3 text-right font-mono">{o.recibido ? parseFloat(o.recibido).toLocaleString("es-CL") : "-"}</td>
                        {/* Tracking local columns */}
                        <td className="p-3 text-right font-mono bg-blue-50/30 font-semibold">
                          {localReceived > 0 ? localReceived.toLocaleString("es-CL") : "-"}
                        </td>
                        <td className="p-3 text-right font-mono bg-blue-50/30">
                          {pending.toLocaleString("es-CL")}
                        </td>
                        <td className="p-3 text-center bg-blue-50/30">
                          {isComplete ? (
                            <Badge variant="default" className="bg-green-100 text-green-700 text-xs">
                              <Check className="w-3 h-3 mr-0.5" />Completo
                            </Badge>
                          ) : isPartial ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                              <Clock className="w-3 h-3 mr-0.5" />Parcial
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <AlertCircle className="w-3 h-3 mr-0.5" />Pendiente
                            </Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary" className="font-mono text-xs">
                            {o.codicc || "Sin CC"}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-mono whitespace-nowrap">{formatMoney(o.subtotalmb)}</td>
                        <td className="p-3">
                          <Badge variant={o.estado_registro === "Activo" ? "default" : "outline"}>
                            {o.estado_registro || "-"}
                          </Badge>
                        </td>
                        <td className="p-3 whitespace-nowrap">{formatDate(o.fechaent)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Paginacion */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {page} de {totalPages.toLocaleString("es-CL")}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isFetching}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isFetching}
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
