import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check, Clock, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatDateShort, formatMoney } from "@/lib/formatters";
import CompoundFilter, { type FilterField } from "@/components/filters/CompoundFilter";
import { useUrlFilters } from "@/hooks/useUrlFilters";

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

const filterDefaults = {
  search: "",
  filterTipo: "suministros",
  filterCC: "all",
  filterEstado: "all",
  filterProveedor: "all",
  fechaOcDesde: "",
  fechaOcHasta: "",
  fechaEntDesde: "",
  fechaEntHasta: "",
  filterRecepcion: "all",
};

export default function PurchaseOrders() {
  const {
    filters, setFilter, resetFilters, page, setPage, activeCount,
  } = useUrlFilters("/orders/purchase-order", filterDefaults, {
    paramMap: {
      filterCC: "costCenter",
      filterEstado: "estado",
      filterTipo: "tipoCategoria",
      filterProveedor: "proveedor",
      filterRecepcion: "recepcion",
    },
  });

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 400);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Advanced toggle (local state)
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Build query params for API
  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filters.filterCC !== "all") params.set("costCenter", filters.filterCC);
    if (filters.filterEstado !== "all") params.set("estado", filters.filterEstado);
    if (filters.filterTipo !== "all") params.set("tipoCategoria", filters.filterTipo);
    if (filters.filterProveedor !== "all") params.set("proveedor", filters.filterProveedor);
    if (filters.fechaOcDesde) params.set("fechaOcDesde", filters.fechaOcDesde);
    if (filters.fechaOcHasta) params.set("fechaOcHasta", filters.fechaOcHasta);
    if (filters.fechaEntDesde) params.set("fechaEntDesde", filters.fechaEntDesde);
    if (filters.fechaEntHasta) params.set("fechaEntHasta", filters.fechaEntHasta);
    return params.toString();
  }, [page, debouncedSearch, filters]);

  const { data, isLoading, isFetching } = useQuery<OrdenesResponse>({
    queryKey: ["/api/ordenes-compra", page, debouncedSearch, filters.filterCC, filters.filterEstado, filters.filterTipo, filters.filterProveedor, filters.fechaOcDesde, filters.fechaOcHasta, filters.fechaEntDesde, filters.fechaEntHasta],
    queryFn: async () => {
      return apiRequest(`/api/ordenes-compra?${buildParams()}`);
    },
  });

  const { data: costCenters = [] } = useQuery<string[]>({
    queryKey: ["/api/ordenes-compra/cost-centers"],
  });

  const { data: providers = [] } = useQuery<Array<{codaux: string, nomaux: string}>>({
    queryKey: ["/api/ordenes-compra/providers"],
  });

  const ordenes = data?.rows || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Apply local reception filter
  const ordenesFiltered = filters.filterRecepcion === "all"
    ? ordenes
    : ordenes.filter(o => {
        const localReceived = o.localReceivedQuantity || 0;
        const isComplete = o.isFullyReceived || false;
        const isPartial = localReceived > 0 && !isComplete;
        if (filters.filterRecepcion === "completo") return isComplete;
        if (filters.filterRecepcion === "parcial") return isPartial;
        if (filters.filterRecepcion === "pendiente") return !isComplete && !isPartial;
        return true;
      });

  // Filter field definitions
  const filterFields: FilterField[] = useMemo(() => [
    { key: "search", label: "Buscar", type: "text", placeholder: "Buscar por OC, proveedor, producto, CC...", colSpan: 2 },
    { key: "filterTipo", label: "Tipo", type: "select", options: [
      { value: "all", label: "Todos los tipos" },
      { value: "suministros", label: "Suministros" },
      { value: "servicios", label: "Servicios" },
    ]},
    { key: "filterCC", label: "Centro de Costo", type: "select", options: [
      { value: "all", label: "Todos los CC" },
      ...costCenters.map(cc => ({ value: cc, label: cc })),
    ]},
    { key: "filterEstado", label: "Estado", type: "select", options: [
      { value: "all", label: "Todos los estados" },
      { value: "Activo", label: "Activo" },
      { value: "Inactivo", label: "Inactivo" },
    ]},
    // Advanced:
    { key: "filterProveedor", label: "Proveedor", type: "select", advanced: true, options: [
      { value: "all", label: "Todos los proveedores" },
      ...providers.map(p => ({ value: p.codaux, label: `${p.nomaux} (${p.codaux})` })),
    ]},
    { key: "fechaOc", label: "Fecha OC", type: "daterange", advanced: true, labelDesde: "Fecha OC desde", labelHasta: "Fecha OC hasta" },
    { key: "fechaEnt", label: "Fecha Entrega", type: "daterange", advanced: true, labelDesde: "Fecha Entrega desde", labelHasta: "Fecha Entrega hasta" },
    { key: "filterRecepcion", label: "Recepcion", type: "select", advanced: true, options: [
      { value: "all", label: "Todos (recepcion)" },
      { value: "completo", label: "Completo" },
      { value: "parcial", label: "Parcial" },
      { value: "pendiente", label: "Pendiente" },
    ]},
  ], [costCenters, providers]);

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
      <CompoundFilter
        fields={filterFields}
        values={filters}
        onChange={setFilter}
        onClear={resetFilters}
        showAdvanced={showAdvanced}
        onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
        activeCount={activeCount}
      />

      {/* Resumen */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Mostrando {ordenesFiltered.length} de {total.toLocaleString("es-CL")} registros
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
                  <th className="text-right p-3 font-medium bg-primary/10">Recibido Local</th>
                  <th className="text-right p-3 font-medium bg-primary/10">Pendiente</th>
                  <th className="text-center p-3 font-medium bg-primary/10">Recepcion</th>
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
                ) : ordenesFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="p-8 text-center text-muted-foreground">
                      No se encontraron registros
                    </td>
                  </tr>
                ) : (
                  ordenesFiltered.map((o, idx) => {
                    const localReceived = o.localReceivedQuantity || 0;
                    const pending = o.pendingQuantity ?? parseFloat(o.cantidad || "0");
                    const isComplete = o.isFullyReceived || false;
                    const isPartial = localReceived > 0 && !isComplete;

                    return (
                      <tr key={`${o.numoc}-${o.numlinea}-${idx}`}
                        className={`border-b hover:bg-muted/30 ${isComplete ? 'bg-green-500/10' : ''}`}>
                        <td className="p-3 font-mono font-medium">{o.numoc}</td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className="text-xs">{o.tipo || "-"}</Badge>
                        </td>
                        <td className="p-3 text-center">{o.numlinea}</td>
                        <td className="p-3 whitespace-nowrap">{formatDateShort(o.fechaoc)}</td>
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
                        <td className="p-3 text-right font-mono bg-primary/5 font-semibold">
                          {localReceived > 0 ? localReceived.toLocaleString("es-CL") : "-"}
                        </td>
                        <td className="p-3 text-right font-mono bg-primary/5">
                          {pending.toLocaleString("es-CL")}
                        </td>
                        <td className="p-3 text-center bg-primary/5">
                          {isComplete ? (
                            <Badge variant="default" className="bg-green-500/20 text-green-500 dark:text-green-400 text-xs border-green-500/30">
                              <Check className="w-3 h-3 mr-0.5" />Completo
                            </Badge>
                          ) : isPartial ? (
                            <Badge variant="secondary" className="bg-amber-500/20 text-amber-500 dark:text-amber-400 text-xs border-amber-500/30">
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
                        <td className="p-3 whitespace-nowrap">{formatDateShort(o.fechaent)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Aviso filtro de recepcion local */}
      {filters.filterRecepcion !== "all" && (
        <div className="text-sm text-muted-foreground bg-muted/50 rounded-md px-4 py-2">
          Filtro de recepcion aplicado localmente -- {ordenesFiltered.length} de {ordenes.length} registros en esta pagina.
        </div>
      )}

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
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1 || isFetching}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
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
