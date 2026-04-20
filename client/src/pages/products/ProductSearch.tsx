import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Package, ChevronLeft, ChevronRight, Warehouse, X as XIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import CompoundFilter, { type FilterField } from "@/components/filters/CompoundFilter";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { apiRequest } from "@/lib/queryClient";

interface ProductWithDetails {
  id: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  productType: string | null;
  requiresSerial: boolean | null;
  hasWarranty: boolean;
  isActive: boolean | null;
  category?: { id: number; name: string } | null;
  brand?: { id: number; name: string } | null;
  unit?: { id: number; name: string; abbreviation: string } | null;
}

interface WarehouseInfo {
  id: number;
  name: string;
  costCenter: string;
  warehouseType: string;
}

interface InventoryEntry {
  warehouseId: number;
  quantity: number;
  warehouse?: WarehouseInfo | null;
}

interface SearchResult extends ProductWithDetails {
  inventory?: InventoryEntry[];
  totalStock?: number;
  warehouseCount?: number;
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

  // Extract unique cost centers from warehouses
  const costCenters = useMemo(() => {
    const unique = Array.from(new Set(warehouses.map(w => w.costCenter).filter(Boolean)));
    return unique.sort();
  }, [warehouses]);

  // Fetch all products with details
  const { data: allProducts = [], isLoading } = useQuery<SearchResult[]>({
    queryKey: ["/api/products/with-details"],
    queryFn: async () => {
      const products = await apiRequest("/api/products/with-details");
      return products;
    },
  });

  // Fetch inventory for stock info
  const { data: inventoryData = [] } = useQuery<Array<{ productId: number; warehouseId: number; quantity: number; warehouse?: WarehouseInfo | null }>>({
    queryKey: ["/api/inventory"],
  });

  // Merge inventory into products
  const productsWithStock = useMemo(() => {
    const inventoryByProduct = new Map<number, InventoryEntry[]>();
    for (const inv of inventoryData) {
      if (!inventoryByProduct.has(inv.productId)) {
        inventoryByProduct.set(inv.productId, []);
      }
      inventoryByProduct.get(inv.productId)!.push(inv);
    }

    return allProducts.map(p => {
      const inv = inventoryByProduct.get(p.id) || [];
      const totalStock = inv.reduce((sum, i) => sum + (i.quantity || 0), 0);
      return {
        ...p,
        inventory: inv,
        totalStock,
        warehouseCount: inv.filter(i => i.quantity > 0).length,
      };
    });
  }, [allProducts, inventoryData]);

  // Client-side filtering
  const filteredProducts = useMemo(() => {
    let result = productsWithStock;

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }

    if (filters.categoryId !== "all") {
      result = result.filter(p => p.category?.id === parseInt(filters.categoryId));
    }
    if (filters.brandId !== "all") {
      result = result.filter(p => p.brand?.id === parseInt(filters.brandId));
    }
    if (filters.unitId !== "all") {
      result = result.filter(p => p.unit?.id === parseInt(filters.unitId));
    }
    if (filters.productType !== "all") {
      result = result.filter(p => p.productType === filters.productType);
    }
    if (filters.requiresSerial !== "all") {
      const val = filters.requiresSerial === "true";
      result = result.filter(p => p.requiresSerial === val);
    }
    if (filters.hasWarranty !== "all") {
      const val = filters.hasWarranty === "true";
      result = result.filter(p => p.hasWarranty === val);
    }
    if (filters.isActive !== "all") {
      const val = filters.isActive === "true";
      result = result.filter(p => p.isActive === val);
    }
    if (filters.warehouseId !== "all") {
      const wId = parseInt(filters.warehouseId);
      result = result.filter(p => p.inventory?.some(i => i.warehouseId === wId && i.quantity > 0));
    }
    if (filters.costCenter !== "all") {
      result = result.filter(p =>
        p.inventory?.some(i => i.warehouse?.costCenter === filters.costCenter && i.quantity > 0)
      );
    }
    if (filters.hasStock !== "all") {
      if (filters.hasStock === "true") {
        result = result.filter(p => (p.totalStock || 0) > 0);
      } else {
        result = result.filter(p => (p.totalStock || 0) === 0);
      }
    }

    return result;
  }, [productsWithStock, debouncedSearch, filters]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const paginatedProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Filter fields
  const filterFields: FilterField[] = useMemo(() => [
    { key: "search", label: "Buscar", type: "text", placeholder: "Buscar por nombre, SKU, barcode...", colSpan: 2 },
    { key: "categoryId", label: "Categoria", type: "select", options: [
      { value: "all", label: "Todas las categorias" },
      ...categories.map(c => ({ value: String(c.id), label: c.name })),
    ]},
    { key: "brandId", label: "Marca", type: "select", options: [
      { value: "all", label: "Todas las marcas" },
      ...brands.map(b => ({ value: String(b.id), label: b.name })),
    ]},
    { key: "unitId", label: "Unidad", type: "select", options: [
      { value: "all", label: "Todas las unidades" },
      ...units.map(u => ({ value: String(u.id), label: `${u.name} (${u.abbreviation})` })),
    ]},
    // Advanced
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
    { key: "warehouseId", label: "Bodega", type: "select", advanced: true, options: [
      { value: "all", label: "Todas las bodegas" },
      ...warehouses.map(w => ({ value: String(w.id), label: w.name })),
    ]},
    { key: "costCenter", label: "Centro de Costo", type: "select", advanced: true, options: [
      { value: "all", label: "Todos los CC" },
      ...costCenters.map(cc => ({ value: cc, label: cc })),
    ]},
    { key: "hasStock", label: "Stock", type: "select", advanced: true, options: [
      { value: "all", label: "Todos" },
      { value: "true", label: "Con stock" },
      { value: "false", label: "Sin stock" },
    ]},
  ], [categories, brands, units, warehouses, costCenters]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6" />
          Buscar Productos
        </h2>
        <p className="text-muted-foreground">
          {filteredProducts.length} productos encontrados
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
                  <th className="text-right p-3 font-medium">Bodegas</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                      Cargando productos...
                    </td>
                  </tr>
                ) : paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No se encontraron productos
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b hover:bg-muted/30 cursor-pointer"
                      onClick={() => setSelectedProduct(p)}
                    >
                      <td className="p-3">
                        <div className="font-medium">{p.name}</div>
                        <span className="text-xs text-muted-foreground font-mono">{p.sku || "Sin SKU"}</span>
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
                      <td className="p-3 text-right">
                        {(p.warehouseCount || 0) > 0 ? (
                          <Badge variant="outline" className="text-xs">
                            <Warehouse className="w-3 h-3 mr-1" />
                            {p.warehouseCount}
                          </Badge>
                        ) : "-"}
                      </td>
                    </tr>
                  ))
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
                  {(!selectedProduct.inventory || selectedProduct.inventory.length === 0) ? (
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
                          {selectedProduct.inventory
                            .filter(i => i.quantity > 0)
                            .map((inv, idx) => (
                            <tr key={idx} className="border-b border-muted">
                              <td className="py-2 px-2">{inv.warehouse?.name || "-"}</td>
                              <td className="py-2 px-2">
                                <Badge variant="outline" className="text-xs font-mono">
                                  {inv.warehouse?.costCenter || "-"}
                                </Badge>
                              </td>
                              <td className="py-2 px-2 text-right font-bold">{inv.quantity}</td>
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
