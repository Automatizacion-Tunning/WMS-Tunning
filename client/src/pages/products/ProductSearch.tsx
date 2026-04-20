import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Package, ChevronLeft, ChevronRight, Warehouse, Building2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import CompoundFilter, { type FilterField } from "@/components/filters/CompoundFilter";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { apiRequest } from "@/lib/queryClient";

interface WarehouseDistribution {
  warehouseId: number;
  warehouseName: string;
  costCenter: string;
  quantity: number;
}

interface SearchResult {
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
  category?: { id: number; name: string } | null;
  brand?: { id: number; name: string } | null;
  unit?: { id: number; name: string; abbreviation: string } | null;
  totalStock: number;
  warehouseDistribution: WarehouseDistribution[];
}

interface SearchResponse {
  rows: SearchResult[];
  total: number;
}

interface WarehouseInfo {
  id: number;
  name: string;
  costCenter: string;
  warehouseType: string;
}

const PAGE_SIZE = 20;

const filterDefaults = {
  search: "",
  categoryId: "all",
  brandId: "all",
  unitId: "all",
  productType: "all",
  requiresSerial: "all",
  hasWarranty: "all",
  isActive: "all",
  warehouseId: "all",
  costCenter: "all",
  hasStock: "all",
};

export default function ProductSearch() {
  const [, navigate] = useLocation();

  const {
    filters, setFilter, resetFilters, page, setPage, activeCount,
  } = useUrlFilters("/products/search", filterDefaults);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  const [selectedProduct, setSelectedProduct] = useState<SearchResult | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 400);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Load filter options
  const { data: categories = [] } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ["/api/categories"],
  });
  const { data: brands = [] } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ["/api/brands"],
  });
  const { data: units = [] } = useQuery<Array<{ id: number; name: string; abbreviation: string }>>({
    queryKey: ["/api/units"],
  });
  const { data: warehouses = [] } = useQuery<WarehouseInfo[]>({
    queryKey: ["/api/warehouses"],
  });

  // Centros de costo únicos
  const costCenters = useMemo(() => {
    const unique = Array.from(new Set(warehouses.map(w => w.costCenter).filter(Boolean)));
    return unique.sort();
  }, [warehouses]);

  // Build query params para el endpoint backend
  const buildParams = () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filters.categoryId !== "all") params.set("categoryId", filters.categoryId);
    if (filters.brandId !== "all") params.set("brandId", filters.brandId);
    if (filters.unitId !== "all") params.set("unitId", filters.unitId);
    if (filters.productType !== "all") params.set("productType", filters.productType);
    if (filters.requiresSerial !== "all") params.set("requiresSerial", filters.requiresSerial);
    if (filters.hasWarranty !== "all") params.set("hasWarranty", filters.hasWarranty);
    if (filters.isActive !== "all") params.set("isActive", filters.isActive);
    if (filters.warehouseId !== "all") params.set("warehouseId", filters.warehouseId);
    if (filters.costCenter !== "all") params.set("costCenter", filters.costCenter);
    if (filters.hasStock !== "all") params.set("hasStock", filters.hasStock);
    return params.toString();
  };

  // Consulta al endpoint server-side (rápida, paginada)
  const { data, isLoading, isFetching } = useQuery<SearchResponse>({
    queryKey: [
      "/api/products/search",
      page, debouncedSearch,
      filters.categoryId, filters.brandId, filters.unitId,
      filters.productType, filters.requiresSerial, filters.hasWarranty,
      filters.isActive, filters.warehouseId, filters.costCenter, filters.hasStock,
    ],
    queryFn: async () => apiRequest(`/api/products/search?${buildParams()}`),
  });

  const products = data?.rows || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Filter fields
  const filterFields: FilterField[] = useMemo(() => [
    { key: "search", label: "Buscar", type: "text", placeholder: "Buscar por nombre, SKU, barcode, codigo ERP...", colSpan: 2 },
    { key: "costCenter", label: "Centro de Costo", type: "select", options: [
      { value: "all", label: "Todos los CC" },
      ...costCenters.map(cc => ({ value: cc, label: cc })),
    ]},
    { key: "hasStock", label: "Stock", type: "select", options: [
      { value: "all", label: "Todos" },
      { value: "true", label: "Con stock" },
      { value: "false", label: "Sin stock" },
    ]},
    // Advanced
    { key: "categoryId", label: "Categoria", type: "select", advanced: true, options: [
      { value: "all", label: "Todas las categorias" },
      ...categories.map(c => ({ value: String(c.id), label: c.name })),
    ]},
    { key: "brandId", label: "Marca", type: "select", advanced: true, options: [
      { value: "all", label: "Todas las marcas" },
      ...brands.map(b => ({ value: String(b.id), label: b.name })),
    ]},
    { key: "unitId", label: "Unidad", type: "select", advanced: true, options: [
      { value: "all", label: "Todas las unidades" },
      ...units.map(u => ({ value: String(u.id), label: `${u.name} (${u.abbreviation})` })),
    ]},
    { key: "warehouseId", label: "Bodega", type: "select", advanced: true, options: [
      { value: "all", label: "Todas las bodegas" },
      ...warehouses.map(w => ({ value: String(w.id), label: w.name })),
    ]},
    { key: "productType", label: "Tipo", type: "select", advanced: true, options: [
      { value: "all", label: "Todos" },
      { value: "tangible", label: "Tangible" },
      { value: "intangible", label: "Intangible" },
    ]},
    { key: "requiresSerial", label: "Requiere Serie", type: "select", advanced: true, options: [
      { value: "all", label: "Todos" },
      { value: "true", label: "Si" },
      { value: "false", label: "No" },
    ]},
    { key: "hasWarranty", label: "Garantia", type: "select", advanced: true, options: [
      { value: "all", label: "Todos" },
      { value: "true", label: "Si" },
      { value: "false", label: "No" },
    ]},
    { key: "isActive", label: "Estado", type: "select", advanced: true, options: [
      { value: "all", label: "Todos" },
      { value: "true", label: "Activo" },
      { value: "false", label: "Inactivo" },
    ]},
  ], [categories, brands, units, warehouses, costCenters]);

  // Helper: obtener CCs únicos de un producto
  const getProductCCs = (product: SearchResult): string[] => {
    const set = new Set<string>();
    for (const w of product.warehouseDistribution || []) {
      if (w.quantity > 0 && w.costCenter) set.add(w.costCenter);
    }
    return Array.from(set).sort();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6" />
          Buscar Productos
        </h2>
        <p className="text-muted-foreground">
          {total.toLocaleString("es-CL")} productos encontrados
          {isFetching && (
            <span className="ml-2 inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></span>
          )}
        </p>
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

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Producto</th>
                  <th className="text-left p-3 font-medium">Categoria</th>
                  <th className="text-left p-3 font-medium">Marca</th>
                  <th className="text-center p-3 font-medium">Tipo</th>
                  <th className="text-right p-3 font-medium">Stock Total</th>
                  <th className="text-left p-3 font-medium">Centros de Costo</th>
                  <th className="text-right p-3 font-medium">Bodegas</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                      Cargando productos...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No se encontraron productos
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const ccs = getProductCCs(p);
                    const warehouseCount = (p.warehouseDistribution || []).filter(w => w.quantity > 0).length;
                    return (
                      <tr
                        key={p.id}
                        className="border-b hover:bg-muted/30 cursor-pointer"
                        onClick={() => setSelectedProduct(p)}
                      >
                        <td className="p-3">
                          <div className="font-medium">{p.name}</div>
                          <span className="text-xs text-muted-foreground font-mono">
                            {p.sku || p.erpProductCode || "Sin SKU"}
                          </span>
                        </td>
                        <td className="p-3">{p.category?.name || "-"}</td>
                        <td className="p-3">{p.brand?.name || "-"}</td>
                        <td className="p-3 text-center">
                          <Badge variant={p.productType === "tangible" ? "default" : "secondary"} className="text-xs">
                            {p.productType === "tangible" ? "Tangible" : "Intangible"}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-mono font-semibold">
                          {(p.totalStock || 0) > 0 ? (
                            <span className="text-green-500">{p.totalStock}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="p-3">
                          {ccs.length === 0 ? (
                            <span className="text-muted-foreground text-xs">Sin stock</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {ccs.slice(0, 3).map((cc) => (
                                <Badge key={cc} variant="outline" className="text-xs font-mono">
                                  <Building2 className="w-3 h-3 mr-1" />
                                  {cc}
                                </Badge>
                              ))}
                              {ccs.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{ccs.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {warehouseCount > 0 ? (
                            <Badge variant="outline" className="text-xs">
                              <Warehouse className="w-3 h-3 mr-1" />
                              {warehouseCount}
                            </Badge>
                          ) : "-"}
                        </td>
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
            Pagina {page} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Drawer (Sheet) de detalle */}
      <Sheet open={!!selectedProduct} onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedProduct && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {selectedProduct.name}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-4 mt-4">
                {/* Info basica */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SKU</span>
                    <span className="font-mono">{selectedProduct.sku || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Codigo ERP</span>
                    <span className="font-mono">{selectedProduct.erpProductCode || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Categoria</span>
                    <span>{selectedProduct.category?.name || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Marca</span>
                    <span>{selectedProduct.brand?.name || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo</span>
                    <Badge variant={selectedProduct.productType === "tangible" ? "default" : "secondary"} className="text-xs">
                      {selectedProduct.productType === "tangible" ? "Tangible" : "Intangible"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stock Total</span>
                    <span className="font-bold">{selectedProduct.totalStock || 0}</span>
                  </div>
                </div>

                {/* Distribucion por bodega */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Warehouse className="h-4 w-4" />
                    Distribucion por Bodega
                  </h4>
                  {(selectedProduct.warehouseDistribution?.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin stock en bodegas.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2">Bodega</th>
                            <th className="text-left py-2 px-2">CC</th>
                            <th className="text-right py-2 px-2">Cantidad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProduct.warehouseDistribution
                            .filter(w => w.quantity > 0)
                            .map((w, idx) => (
                            <tr key={idx} className="border-b border-muted">
                              <td className="py-2 px-2">{w.warehouseName || "-"}</td>
                              <td className="py-2 px-2">
                                <Badge variant="outline" className="text-xs font-mono">
                                  <Building2 className="w-3 h-3 mr-1" />
                                  {w.costCenter || "-"}
                                </Badge>
                              </td>
                              <td className="py-2 px-2 text-right font-bold">{w.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Link a hoja de vida */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/producto/${selectedProduct.id}`)}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Ver Hoja de Vida
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
