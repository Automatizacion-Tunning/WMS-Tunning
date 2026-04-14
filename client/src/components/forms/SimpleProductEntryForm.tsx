import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ocProductEntrySchema, type Product } from "@shared/schema";
import { z } from "zod";
import {
  Plus, X, Package, Building2, Search, FileText,
  Check, Clock, AlertCircle, XCircle, ShieldCheck,
} from "lucide-react";
import { useBarcodeFlow } from "@/hooks/useBarcodeFlow";
import BarcodeScannerNative from "@/components/ui/barcode-scanner-native";
import ProductNotFoundModal from "@/components/modals/ProductNotFoundModal";
import AssociateProductModal from "@/components/modals/AssociateProductModal";
import NewProductWithBarcodeForm from "@/components/forms/NewProductWithBarcodeForm";

type OcProductEntryData = z.infer<typeof ocProductEntrySchema>;

interface OcSearchResult {
  numoc: string;
  nomaux: string | null;
  fechaoc: string | null;
  lineCount: number;
}

interface EnrichedOcLine {
  numoc: string;
  numlinea: number;
  codprod: string | null;
  desprod: string | null;
  desprod2: string | null;
  cantidad: string | null;
  recibido: string | null;
  codicc: string | null;
  subtotalmb: string | null;
  nomaux: string | null;
  fechaoc: string | null;
  fechaent: string | null;
  localReceivedQuantity: number;
  pendingQuantity: number;
  localProductId: number | null;
  matchedProductName: string | null;
  calculatedUnitPrice: number;
  isFullyReceived: boolean;
}

interface SimpleProductEntryFormProps {
  onSuccess?: (printData?: { productId: number; productName: string; sku: string | null; serialNumbers?: string[] }) => void;
  onCancel?: () => void;
}

export default function SimpleProductEntryForm({ onSuccess, onCancel }: SimpleProductEntryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [serialNumbers, setSerialNumbers] = useState<string[]>([]);
  const [serialInput, setSerialInput] = useState("");

  // OC state
  const [ocSearch, setOcSearch] = useState("");
  const [debouncedOcSearch, setDebouncedOcSearch] = useState("");
  const [selectedOC, setSelectedOC] = useState<string>("");
  const [selectedOCInfo, setSelectedOCInfo] = useState<OcSearchResult | null>(null);
  const [selectedLine, setSelectedLine] = useState<EnrichedOcLine | null>(null);
  const [showOcResults, setShowOcResults] = useState(false);
  const [ocCostCenter, setOcCostCenter] = useState("");

  // New product creation state
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductRequiresSerial, setNewProductRequiresSerial] = useState(false);
  const [newProductHasWarranty, setNewProductHasWarranty] = useState(false);
  const [newProductWarrantyMonths, setNewProductWarrantyMonths] = useState(12);
  const [newProductUnitId, setNewProductUnitId] = useState(0);
  const [newProductCategoryId, setNewProductCategoryId] = useState(0);
  const [newProductBrandId, setNewProductBrandId] = useState(0);

  // Hook para manejo de códigos de barras
  const barcodeFlow = useBarcodeFlow();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Queries para catálogos (necesarios para crear producto)
  const { data: units = [] } = useQuery<any[]>({
    queryKey: ["/api/units"],
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  const { data: brands = [] } = useQuery<any[]>({
    queryKey: ["/api/brands"],
  });

  const form = useForm<OcProductEntryData>({
    resolver: zodResolver(ocProductEntrySchema),
    defaultValues: {
      purchaseOrderNumber: "",
      purchaseOrderLine: 0,
      costCenter: "",
      productId: 0,
      quantity: 1,
      price: 0,
      serialNumbers: [],
      reason: "",
    },
  });

  const selectedProduct = products.find(p => p.id === form.watch("productId"));
  const maxQuantity = selectedLine ? selectedLine.pendingQuantity : undefined;

  // ========================
  // OC Search Logic
  // ========================

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedOcSearch(ocSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [ocSearch]);

  const { data: ocSearchResults = [], isFetching: isSearchingOC } = useQuery<OcSearchResult[]>({
    queryKey: ["/api/ordenes-compra/search", debouncedOcSearch],
    queryFn: () => apiRequest(`/api/ordenes-compra/search?q=${encodeURIComponent(debouncedOcSearch)}`),
    enabled: debouncedOcSearch.length >= 2 && !selectedOC,
  });

  const { data: ocCostCenters = [] } = useQuery<string[]>({
    queryKey: ["/api/ordenes-compra", selectedOC, "cost-centers"],
    queryFn: () => apiRequest(`/api/ordenes-compra/${encodeURIComponent(selectedOC)}/cost-centers`),
    enabled: !!selectedOC,
  });

  const { data: ocLines = [], isFetching: isLoadingLines } = useQuery<EnrichedOcLine[]>({
    queryKey: ["/api/ordenes-compra", selectedOC, "lines", ocCostCenter],
    queryFn: () => {
      const url = ocCostCenter
        ? `/api/ordenes-compra/${encodeURIComponent(selectedOC)}/lines?cc=${encodeURIComponent(ocCostCenter)}`
        : `/api/ordenes-compra/${encodeURIComponent(selectedOC)}/lines`;
      return apiRequest(url);
    },
    enabled: !!selectedOC && !!ocCostCenter,
  });

  // Auto-select CC when OC has only one
  useEffect(() => {
    if (selectedOC && ocCostCenters.length === 1 && !ocCostCenter) {
      setOcCostCenter(ocCostCenters[0]);
      form.setValue("costCenter", ocCostCenters[0]);
    }
  }, [selectedOC, ocCostCenters, ocCostCenter, form]);

  // Sincronizar selectedLine cuando ocLines se actualiza (ej. después de crear producto)
  useEffect(() => {
    if (selectedLine && ocLines.length > 0) {
      const updated = ocLines.find((l) => l.numlinea === selectedLine.numlinea);
      if (updated && updated.localProductId !== selectedLine.localProductId) {
        setSelectedLine(updated);
        if (updated.localProductId) {
          form.setValue("productId", updated.localProductId);
          setShowCreateProduct(false);
        }
      }
    }
  }, [ocLines, selectedLine, form]);

  // OC Handlers
  const handleSelectOC = (oc: OcSearchResult) => {
    setSelectedOC(oc.numoc);
    setSelectedOCInfo(oc);
    setOcSearch(oc.numoc);
    setShowOcResults(false);
    setOcCostCenter("");
    setSelectedLine(null);
    setShowCreateProduct(false);
    form.setValue("purchaseOrderNumber", oc.numoc);
    form.setValue("costCenter", "");
    form.setValue("purchaseOrderLine", 0);
  };

  const handleClearOC = () => {
    setSelectedOC("");
    setSelectedOCInfo(null);
    setOcSearch("");
    setDebouncedOcSearch("");
    setShowOcResults(false);
    setSelectedLine(null);
    setOcCostCenter("");
    setShowCreateProduct(false);
    form.setValue("purchaseOrderNumber", "");
    form.setValue("purchaseOrderLine", 0);
    form.setValue("costCenter", "");
    form.setValue("productId", 0);
    form.setValue("quantity", 1);
    form.setValue("price", 0);
    form.setValue("reason", "");
  };

  const handleSelectOcCostCenter = (cc: string) => {
    setOcCostCenter(cc);
    form.setValue("costCenter", cc);
    setSelectedLine(null);
    setShowCreateProduct(false);
    form.setValue("purchaseOrderLine", 0);
  };

  const handleSelectLine = (line: EnrichedOcLine) => {
    if (line.isFullyReceived) return;
    setSelectedLine(line);
    setShowCreateProduct(false);

    form.setValue("purchaseOrderLine", line.numlinea);
    if (line.localProductId) {
      form.setValue("productId", line.localProductId);
    } else {
      form.setValue("productId", 0);
    }
    form.setValue("quantity", Math.min(1, line.pendingQuantity));
    form.setValue("price", line.calculatedUnitPrice);
    form.setValue("reason", `Recepcion OC ${line.numoc} linea ${line.numlinea}`);
    setSerialNumbers([]);
  };

  const handleDeselectLine = () => {
    setSelectedLine(null);
    setShowCreateProduct(false);
    form.setValue("purchaseOrderLine", 0);
    form.setValue("productId", 0);
    form.setValue("quantity", 1);
    form.setValue("price", 0);
    form.setValue("reason", "");
    setSerialNumbers([]);
  };

  // ========================
  // New Product Creation
  // ========================

  const handleStartCreateProduct = () => {
    if (!selectedLine) return;
    setNewProductName(selectedLine.desprod || "");
    setNewProductRequiresSerial(false);
    setNewProductHasWarranty(false);
    setNewProductWarrantyMonths(12);
    setNewProductUnitId(0);
    setNewProductCategoryId(0);
    setNewProductBrandId(0);
    setShowCreateProduct(true);
  };

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: (newProduct: any) => {
      toast({
        title: "Producto creado",
        description: `"${newProduct.name}" se ha creado y vinculado con codprod "${selectedLine?.codprod}".`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      // Invalidar líneas de OC para que el match se actualice con el nuevo erpProductCode
      queryClient.invalidateQueries({ queryKey: ["/api/ordenes-compra", selectedOC, "lines"] });
      form.setValue("productId", newProduct.id);
      setShowCreateProduct(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear producto",
        description: error.message || "Ocurrio un error inesperado",
        variant: "destructive",
      });
    },
  });

  const handleCreateProduct = () => {
    if (!selectedLine || !newProductName.trim() || !newProductUnitId || !newProductCategoryId || !newProductBrandId) {
      toast({
        title: "Campos requeridos",
        description: "Complete nombre, unidad, categoria y marca para crear el producto.",
        variant: "destructive",
      });
      return;
    }

    createProductMutation.mutate({
      name: newProductName.trim(),
      erpProductCode: selectedLine.codprod || undefined,
      requiresSerial: newProductRequiresSerial,
      hasWarranty: newProductHasWarranty,
      warrantyMonths: newProductHasWarranty ? newProductWarrantyMonths : null,
      unitId: newProductUnitId,
      categoryId: newProductCategoryId,
      brandId: newProductBrandId,
      productType: "tangible",
      isActive: true,
      currentPrice: selectedLine.calculatedUnitPrice || 0,
    });
  };

  // ========================
  // OC Entry Mutation
  // ========================

  const ocEntryMutation = useMutation({
    mutationFn: async (data: OcProductEntryData) => {
      return await apiRequest("/api/product-entry-oc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: (result: any) => {
      const r = result.receipt;
      toast({
        title: "Ingreso exitoso",
        description: `Recibidas ${r.thisEntry} unidades. Quedan ${r.remaining} pendientes de ${r.ordered} ordenadas.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ordenes-compra", selectedOC, "lines"] });

      // Reset line selection but keep OC for batch processing
      setSelectedLine(null);
      setShowCreateProduct(false);
      form.setValue("purchaseOrderLine", 0);
      form.setValue("productId", 0);
      form.setValue("quantity", 1);
      form.setValue("price", 0);
      form.setValue("reason", "");
      // Preparar datos para impresión QR
      const printData = selectedProduct ? {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        sku: selectedProduct.sku || null,
        serialNumbers: serialNumbers.length > 0 ? [...serialNumbers] : undefined,
      } : undefined;

      setSerialNumbers([]);
      onSuccess?.(printData);
    },
    onError: (error: any) => {
      toast({
        title: "Error al ingresar producto",
        description: error.message || "Ocurrio un error inesperado",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: OcProductEntryData) => {
    const serials = serialNumbers.length > 0 ? serialNumbers : undefined;
    ocEntryMutation.mutate({
      ...data,
      serialNumbers: serials,
    });
  };

  // Cuando se encuentra un producto por código de barras
  useEffect(() => {
    if (barcodeFlow.state === "product-found" && barcodeFlow.product) {
      form.setValue("productId", barcodeFlow.product.id);
      barcodeFlow.reset();
    }
  }, [barcodeFlow.state, barcodeFlow.product, form]);

  const addSerialNumber = () => {
    if (serialInput.trim() && !serialNumbers.includes(serialInput.trim())) {
      setSerialNumbers([...serialNumbers, serialInput.trim()]);
      setSerialInput("");
    }
  };

  const removeSerialNumber = (index: number) => {
    setSerialNumbers(serialNumbers.filter((_, i) => i !== index));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try { return new Date(dateStr).toLocaleDateString("es-CL"); } catch { return dateStr; }
  };

  const formatMoney = (val: number) => {
    return "$" + val.toLocaleString("es-CL", { minimumFractionDigits: 0 });
  };

  const isPending = ocEntryMutation.isPending;

  return (
    <div className="space-y-6">
      {/* ======================== */}
      {/* Sección OC (Obligatoria) */}
      {/* ======================== */}
      <div className="space-y-3">
        {/* OC Search or OC Selected */}
        <div className="space-y-1">
          <label className="text-sm font-medium flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Orden de Compra
          </label>
          {selectedOC ? (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="font-mono font-semibold text-blue-800">{selectedOC}</span>
              {selectedOCInfo?.nomaux && (
                <span className="text-sm text-blue-700">- {selectedOCInfo.nomaux}</span>
              )}
              {selectedOCInfo?.fechaoc && (
                <span className="text-xs text-blue-500">{formatDate(selectedOCInfo.fechaoc)}</span>
              )}
              <Button variant="ghost" size="sm" onClick={handleClearOC} className="ml-auto h-7 w-7 p-0">
                <XCircle className="w-4 h-4 text-blue-500" />
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por numero de OC..."
                value={ocSearch}
                onChange={(e) => { setOcSearch(e.target.value); setShowOcResults(true); }}
                onFocus={() => setShowOcResults(true)}
                className="pl-10"
                autoFocus
              />
              {showOcResults && debouncedOcSearch.length >= 2 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {isSearchingOC ? (
                    <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                      Buscando...
                    </div>
                  ) : ocSearchResults.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No se encontraron OCs</div>
                  ) : (
                    ocSearchResults.map((oc) => (
                      <button
                        key={oc.numoc}
                        type="button"
                        onClick={() => handleSelectOC(oc)}
                        className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono font-semibold text-blue-700">{oc.numoc}</span>
                            {oc.nomaux && <span className="ml-2 text-sm text-muted-foreground">{oc.nomaux}</span>}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatDate(oc.fechaoc)}</span>
                            <Badge variant="outline" className="text-xs">{oc.lineCount} items</Badge>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Busca y selecciona la orden de compra asociada al ingreso
          </p>
        </div>

        {/* OC Cost Center selector */}
        {selectedOC && (
          <div className="space-y-1">
            <label className="text-sm font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Centro de Costo
            </label>
            <Select value={ocCostCenter} onValueChange={handleSelectOcCostCenter}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar centro de costo de la OC" />
              </SelectTrigger>
              <SelectContent>
                {ocCostCenters.map((cc) => (
                  <SelectItem key={cc} value={cc}>{cc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Centro de costo obtenido de la Orden de Compra
            </p>
          </div>
        )}

        {/* OC Lines Table */}
        {selectedOC && ocCostCenter && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Items de la OC</label>
              {selectedLine && (
                <Badge variant="default" className="bg-blue-600 text-xs">
                  Linea {selectedLine.numlinea} seleccionada
                  <button type="button" onClick={handleDeselectLine} className="ml-1"><X className="w-3 h-3" /></button>
                </Badge>
              )}
            </div>
            {isLoadingLines ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                Cargando items...
              </div>
            ) : ocLines.filter(l => !l.isFullyReceived).length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Check className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-700">Todas las lineas de esta OC han sido recibidas completamente.</p>
              </div>
            ) : (
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0">
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-1.5 font-medium">#</th>
                      <th className="text-left p-1.5 font-medium">Cod.Prod</th>
                      <th className="text-left p-1.5 font-medium">Descripcion</th>
                      <th className="text-right p-1.5 font-medium">Pend.</th>
                      <th className="text-center p-1.5 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ocLines.filter((line) => !line.isFullyReceived).map((line) => {
                      const isSelected = selectedLine?.numlinea === line.numlinea;
                      return (
                        <tr
                          key={`${line.numoc}-${line.numlinea}`}
                          onClick={() => handleSelectLine(line)}
                          className={`border-b transition-colors ${
                            isSelected
                              ? 'bg-blue-200 border-blue-400 text-blue-900'
                              : 'hover:bg-blue-50 cursor-pointer'
                          }`}
                        >
                          <td className="p-1.5 font-mono">{line.numlinea}</td>
                          <td className="p-1.5 font-mono">{line.codprod || "-"}</td>
                          <td className="p-1.5">
                            <div className="max-w-[180px] truncate" title={line.desprod || ""}>{line.desprod || "-"}</div>
                          </td>
                          <td className="p-1.5 text-right font-mono font-semibold">{line.pendingQuantity.toLocaleString("es-CL")}</td>
                          <td className="p-1.5 text-center">
                            {line.localReceivedQuantity > 0 ? (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px] px-1.5"><Clock className="w-2.5 h-2.5 mr-0.5" />Parcial</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] px-1.5"><AlertCircle className="w-2.5 h-2.5 mr-0.5" />Pendiente</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================== */}
      {/* Formulario Principal (aparece después de seleccionar línea) */}
      {/* ======================== */}
      {selectedLine && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Producto */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Package className="w-4 h-4" />
                Producto
              </label>

              {/* Caso 1: Producto auto-vinculado (match codprod ↔ erpProductCode) */}
              {selectedLine.localProductId && selectedLine.matchedProductName ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Check className="w-4 h-4 text-green-600 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-100 text-green-700 text-xs">Auto-vinculado</Badge>
                      <span className="text-sm font-medium">{selectedLine.matchedProductName}</span>
                    </div>
                    <p className="text-xs text-green-600 mt-0.5">
                      Codigo ERP <strong className="font-mono">{selectedLine.codprod}</strong> vinculado al producto local
                    </p>
                  </div>
                </div>
              ) : form.watch("productId") ? (
                /* Caso 2: Producto recién creado y vinculado */
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Check className="w-4 h-4 text-green-600 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-100 text-green-700 text-xs">Producto creado</Badge>
                      <span className="text-sm font-medium">
                        {products.find(p => p.id === form.watch("productId"))?.name || "Producto seleccionado"}
                      </span>
                    </div>
                    <p className="text-xs text-green-600 mt-0.5">
                      Vinculado con codprod <strong className="font-mono">{selectedLine.codprod}</strong>
                    </p>
                  </div>
                </div>
              ) : !showCreateProduct ? (
                /* Caso 3: Sin match - mostrar alerta y botón crear */
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-700 font-medium">
                      Producto no encontrado
                    </p>
                    <p className="text-xs text-amber-600">
                      No existe producto local con codprod <strong className="font-mono">"{selectedLine.codprod}"</strong>. Debe crearlo para continuar.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleStartCreateProduct}
                    className="shrink-0"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Crear Producto
                  </Button>
                </div>
              ) : null}
            </div>

            {/* ======================== */}
            {/* Mini-formulario para crear producto nuevo desde OC */}
            {/* ======================== */}
            {showCreateProduct && selectedLine && (
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Nuevo Producto desde OC
                  </h4>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateProduct(false)} className="h-7 w-7 p-0">
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Código ERP (read-only) */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Codigo ERP (codprod)</label>
                  <Input value={selectedLine.codprod || "-"} disabled className="font-mono bg-muted/50" />
                </div>

                {/* Nombre del producto */}
                <div className="space-y-1">
                  <label className="text-xs font-medium">Nombre del Producto</label>
                  <Input
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="Nombre del producto"
                  />
                </div>

                {/* Unidad, Categoría, Marca en grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Unidad</label>
                    <Select value={newProductUnitId ? newProductUnitId.toString() : ""} onValueChange={(v) => setNewProductUnitId(parseInt(v))}>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.filter((u: any) => u.isActive !== false).map((u: any) => (
                          <SelectItem key={u.id} value={u.id.toString()}>
                            {u.name} ({u.abbreviation})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Categoria</label>
                    <Select value={newProductCategoryId ? newProductCategoryId.toString() : ""} onValueChange={(v) => setNewProductCategoryId(parseInt(v))}>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.filter((c: any) => c.isActive !== false).map((c: any) => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Marca</label>
                    <Select value={newProductBrandId ? newProductBrandId.toString() : ""} onValueChange={(v) => setNewProductBrandId(parseInt(v))}>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.filter((b: any) => b.isActive !== false).map((b: any) => (
                          <SelectItem key={b.id} value={b.id.toString()}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Checkboxes: Serie y Garantía */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="newProductRequiresSerial"
                      checked={newProductRequiresSerial}
                      onCheckedChange={(checked) => setNewProductRequiresSerial(checked === true)}
                    />
                    <label htmlFor="newProductRequiresSerial" className="text-sm cursor-pointer">
                      Requiere numero de serie
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="newProductHasWarranty"
                      checked={newProductHasWarranty}
                      onCheckedChange={(checked) => setNewProductHasWarranty(checked === true)}
                    />
                    <label htmlFor="newProductHasWarranty" className="text-sm cursor-pointer flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Tiene garantia
                    </label>
                  </div>

                  {newProductHasWarranty && (
                    <div className="ml-6 space-y-1">
                      <label className="text-xs font-medium">Meses de garantia</label>
                      <Input
                        type="number"
                        min="1"
                        max="120"
                        value={newProductWarrantyMonths}
                        onChange={(e) => setNewProductWarrantyMonths(parseInt(e.target.value) || 12)}
                        className="w-32"
                      />
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={handleCreateProduct}
                  disabled={createProductMutation.isPending || !newProductName.trim() || !newProductUnitId || !newProductCategoryId || !newProductBrandId}
                  className="w-full"
                >
                  {createProductMutation.isPending ? "Creando..." : "Crear y Vincular Producto"}
                </Button>
              </div>
            )}

            {/* Cantidad */}
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="1"
                      max={maxQuantity}
                      {...field}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        field.onChange(maxQuantity ? Math.min(val, maxQuantity) : val);
                      }}
                    />
                  </FormControl>
                  {maxQuantity && (
                    <FormDescription>
                      Maximo permitido: {maxQuantity.toLocaleString("es-CL")} (pendiente de OC)
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Precio */}
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio (CLP)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Calculado desde OC: {formatMoney(selectedLine.calculatedUnitPrice)} - puede modificarse
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Numeros de Serie (si es requerido) */}
            {selectedProduct?.requiresSerial && (
              <div className="space-y-3">
                <FormLabel>Numeros de Serie</FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ingrese numero de serie"
                    value={serialInput}
                    onChange={(e) => setSerialInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSerialNumber();
                      }
                    }}
                  />
                  <Button type="button" onClick={addSerialNumber} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {serialNumbers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {serialNumbers.map((serial, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {serial}
                        <button
                          type="button"
                          onClick={() => removeSerialNumber(index)}
                          className="ml-1 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <FormDescription>
                  Este producto requiere {form.watch("quantity")} numeros de serie unicos
                </FormDescription>
              </div>
            )}

            {/* Razon */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razon (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripcion del motivo del ingreso..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancelar
                </Button>
              )}
              <Button
                type="submit"
                disabled={isPending}
              >
                {isPending ? "Procesando..." : "Ingresar Producto"}
              </Button>
            </div>
          </form>
        </Form>
      )}

      {/* Mensaje cuando no hay línea seleccionada pero sí OC+CC */}
      {selectedOC && ocCostCenter && !selectedLine && ocLines.length > 0 && !isLoadingLines && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Seleccione un item de la tabla para continuar con el ingreso
        </p>
      )}

      {/* Escáner de códigos de barras */}
      <BarcodeScannerNative
        isOpen={barcodeFlow.state === "scanning"}
        onClose={barcodeFlow.handleCancel}
        onScan={barcodeFlow.handleBarcodeScanned}
        title="Escanear Codigo de Barras"
        description="Apunta la camara hacia el codigo de barras del producto"
      />

      {/* Modales del flujo completo de códigos de barras */}
      <ProductNotFoundModal
        isOpen={barcodeFlow.state === "product-not-found"}
        onClose={barcodeFlow.handleCancel}
        barcode={barcodeFlow.barcode || ""}
        onCreateNew={barcodeFlow.handleCreateNew}
        onAssociateExisting={barcodeFlow.handleAssociateExisting}
      />

      <AssociateProductModal
        isOpen={barcodeFlow.state === "associating-existing"}
        onClose={barcodeFlow.handleCancel}
        barcode={barcodeFlow.barcode || ""}
        onSuccess={barcodeFlow.handleProductAssociated}
      />

      <NewProductWithBarcodeForm
        isOpen={barcodeFlow.state === "creating-new"}
        onClose={barcodeFlow.handleCancel}
        barcode={barcodeFlow.barcode || ""}
        onSuccess={barcodeFlow.handleProductCreated}
      />

      {/* Notificación cuando producto es encontrado */}
      {barcodeFlow.state === "product-found" && barcodeFlow.product && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">
            Producto encontrado: <strong>{barcodeFlow.product.name}</strong> (SKU: {barcodeFlow.product.sku})
          </p>
        </div>
      )}
    </div>
  );
}
