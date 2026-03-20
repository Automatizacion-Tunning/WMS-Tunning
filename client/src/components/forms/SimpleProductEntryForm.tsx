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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { productEntrySchema, type Product } from "@shared/schema";
import { z } from "zod";
import {
  Plus, X, Package, Building2, Scan, Search, FileText,
  Check, Clock, AlertCircle, ChevronDown, ChevronUp, XCircle,
} from "lucide-react";
import { useBarcodeFlow } from "@/hooks/useBarcodeFlow";
import BarcodeScannerNative from "@/components/ui/barcode-scanner-native";
import ProductNotFoundModal from "@/components/modals/ProductNotFoundModal";
import AssociateProductModal from "@/components/modals/AssociateProductModal";
import NewProductWithBarcodeForm from "@/components/forms/NewProductWithBarcodeForm";

type ProductEntryData = z.infer<typeof productEntrySchema>;

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
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function SimpleProductEntryForm({ onSuccess, onCancel }: SimpleProductEntryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [serialNumbers, setSerialNumbers] = useState<string[]>([]);
  const [serialInput, setSerialInput] = useState("");

  // OC state
  const [ocExpanded, setOcExpanded] = useState(false);
  const [ocSearch, setOcSearch] = useState("");
  const [debouncedOcSearch, setDebouncedOcSearch] = useState("");
  const [selectedOC, setSelectedOC] = useState<string>("");
  const [selectedOCInfo, setSelectedOCInfo] = useState<OcSearchResult | null>(null);
  const [selectedLine, setSelectedLine] = useState<EnrichedOcLine | null>(null);
  const [showOcResults, setShowOcResults] = useState(false);
  const [ocCostCenter, setOcCostCenter] = useState("");

  // Hook para manejo de códigos de barras
  const barcodeFlow = useBarcodeFlow();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Obtener centros de costo dinámicamente
  const { data: warehouses = [] } = useQuery({
    queryKey: ["/api/warehouses"],
  });

  // Extraer centros de costo únicos de las bodegas
  const costCenters = (warehouses as any[])
    .map((w: any) => w.costCenter)
    .filter(Boolean)
    .reduce((unique: string[], center: string) => {
      return unique.includes(center) ? unique : [...unique, center];
    }, []);

  const form = useForm<ProductEntryData>({
    resolver: zodResolver(productEntrySchema),
    defaultValues: {
      productId: 0,
      costCenter: "",
      quantity: 1,
      price: 0,
      serialNumbers: [],
      reason: "",
      location: "",
    },
  });

  const selectedProduct = products.find(p => p.id === form.watch("productId"));
  const isOcMode = !!selectedOC;

  // ========================
  // OC Search Logic
  // ========================

  // Debounce OC search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedOcSearch(ocSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [ocSearch]);

  // Search OCs
  const { data: ocSearchResults = [], isFetching: isSearchingOC } = useQuery<OcSearchResult[]>({
    queryKey: ["/api/ordenes-compra/search", debouncedOcSearch],
    queryFn: () => apiRequest(`/api/ordenes-compra/search?q=${encodeURIComponent(debouncedOcSearch)}`),
    enabled: debouncedOcSearch.length >= 2 && !selectedOC,
  });

  // Get cost centers for selected OC
  const { data: ocCostCenters = [] } = useQuery<string[]>({
    queryKey: ["/api/ordenes-compra", selectedOC, "cost-centers"],
    queryFn: () => apiRequest(`/api/ordenes-compra/${encodeURIComponent(selectedOC)}/cost-centers`),
    enabled: !!selectedOC,
  });

  // Get lines for selected OC + CC
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

  // OC Handlers
  const handleSelectOC = (oc: OcSearchResult) => {
    setSelectedOC(oc.numoc);
    setSelectedOCInfo(oc);
    setOcSearch(oc.numoc);
    setShowOcResults(false);
    setOcCostCenter("");
    setSelectedLine(null);
    form.setValue("costCenter", "");
  };

  const handleClearOC = () => {
    setSelectedOC("");
    setSelectedOCInfo(null);
    setOcSearch("");
    setDebouncedOcSearch("");
    setShowOcResults(false);
    setSelectedLine(null);
    setOcCostCenter("");
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
  };

  const handleSelectLine = (line: EnrichedOcLine) => {
    if (line.isFullyReceived) return;
    setSelectedLine(line);

    // Auto-fill form fields from OC line
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
    form.setValue("productId", 0);
    form.setValue("quantity", 1);
    form.setValue("price", 0);
    form.setValue("reason", "");
    setSerialNumbers([]);
  };

  // ========================
  // Mutations
  // ========================

  const entryMutation = useMutation({
    mutationFn: async (data: ProductEntryData) => {
      return await apiRequest("/api/product-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Ingreso exitoso",
        description: "El producto se ha ingresado correctamente a la bodega principal.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      form.reset();
      setSerialNumbers([]);
      handleClearOC();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error al ingresar producto",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    },
  });

  const ocEntryMutation = useMutation({
    mutationFn: async (data: any) => {
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
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ordenes-compra", selectedOC, "lines"] });

      // Reset line selection but keep OC for batch processing
      setSelectedLine(null);
      form.setValue("productId", 0);
      form.setValue("quantity", 1);
      form.setValue("price", 0);
      form.setValue("reason", "");
      setSerialNumbers([]);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error al ingresar producto",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    },
  });

  // Mutación para crear centro de costo
  const createCostCenterMutation = useMutation({
    mutationFn: async (data: { costCenter: string; location?: string }) => {
      return await apiRequest("/api/cost-centers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
  });

  const onSubmit = async (data: ProductEntryData) => {
    const serials = serialNumbers.length > 0 ? serialNumbers : undefined;

    if (isOcMode && selectedLine) {
      // Submit via OC endpoint
      ocEntryMutation.mutate({
        purchaseOrderNumber: selectedOC,
        purchaseOrderLine: selectedLine.numlinea,
        costCenter: data.costCenter,
        productId: data.productId,
        quantity: data.quantity,
        price: data.price,
        serialNumbers: serials,
        reason: data.reason || undefined,
      });
    } else {
      // Manual entry - create cost center if needed
      if (!costCenters.includes(data.costCenter)) {
        try {
          await createCostCenterMutation.mutateAsync({
            costCenter: data.costCenter,
            location: data.location || undefined,
          });
          toast({
            title: "Centro de costo creado",
            description: `Se creó el centro de costo "${data.costCenter}" con sus bodegas correspondientes.`,
          });
        } catch (error: any) {
          toast({
            title: "Error al crear centro de costo",
            description: error.message || "No se pudo crear el centro de costo",
            variant: "destructive",
          });
          return;
        }
      }

      entryMutation.mutate({
        ...data,
        serialNumbers: serials,
      });
    }
  };

  // Cuando se encuentra un producto por código de barras
  useEffect(() => {
    if (barcodeFlow.state === "product-found" && barcodeFlow.product) {
      form.setValue("productId", barcodeFlow.product.id);
      barcodeFlow.reset();
    }
  }, [barcodeFlow.state, barcodeFlow.product, form]);

  // Agregar número de serie
  const addSerialNumber = () => {
    if (serialInput.trim() && !serialNumbers.includes(serialInput.trim())) {
      setSerialNumbers([...serialNumbers, serialInput.trim()]);
      setSerialInput("");
    }
  };

  // Remover número de serie
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

  const isPending = entryMutation.isPending || ocEntryMutation.isPending || createCostCenterMutation.isPending;
  const maxQuantity = selectedLine ? selectedLine.pendingQuantity : undefined;

  return (
    <div className="space-y-6">
      {/* ======================== */}
      {/* Sección OC (Colapsable) */}
      {/* ======================== */}
      <div className="border rounded-lg">
        <button
          type="button"
          onClick={() => setOcExpanded(!ocExpanded)}
          className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="w-4 h-4" />
            Vincular con Orden de Compra (Opcional)
            {selectedOC && (
              <Badge variant="default" className="bg-blue-100 text-blue-700 ml-2">
                OC {selectedOC}
              </Badge>
            )}
          </div>
          {ocExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {ocExpanded && (
          <div className="px-3 pb-3 space-y-3 border-t">
            {/* OC Search or OC Info */}
            {selectedOC ? (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mt-3">
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
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por número de OC..."
                  value={ocSearch}
                  onChange={(e) => { setOcSearch(e.target.value); setShowOcResults(true); }}
                  onFocus={() => setShowOcResults(true)}
                  className="pl-10"
                />
                {showOcResults && debouncedOcSearch.length >= 2 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
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

            {/* OC Cost Center selector */}
            {selectedOC && ocCostCenters.length > 1 && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Centro de Costo de la OC</label>
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
              </div>
            )}

            {/* OC Lines Table */}
            {selectedOC && ocCostCenter && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Items de la OC</label>
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
                ) : ocLines.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No se encontraron items</p>
                ) : (
                  <div className="border rounded-lg overflow-x-auto max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0">
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2 font-medium">Linea</th>
                          <th className="text-left p-2 font-medium">Cod.Prod</th>
                          <th className="text-left p-2 font-medium">Descripcion</th>
                          <th className="text-right p-2 font-medium">Ordenado</th>
                          <th className="text-right p-2 font-medium">Recibido</th>
                          <th className="text-right p-2 font-medium">Pendiente</th>
                          <th className="text-center p-2 font-medium">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ocLines.map((line) => {
                          const isSelected = selectedLine?.numlinea === line.numlinea;
                          return (
                            <tr
                              key={`${line.numoc}-${line.numlinea}`}
                              onClick={() => handleSelectLine(line)}
                              className={`border-b transition-colors ${
                                line.isFullyReceived
                                  ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                  : isSelected
                                    ? 'bg-blue-100 border-blue-300'
                                    : 'hover:bg-blue-50 cursor-pointer'
                              }`}
                            >
                              <td className="p-2 font-mono">{line.numlinea}</td>
                              <td className="p-2 font-mono text-xs">{line.codprod || "-"}</td>
                              <td className="p-2">
                                <div className="max-w-[200px] truncate" title={line.desprod || ""}>{line.desprod || "-"}</div>
                              </td>
                              <td className="p-2 text-right font-mono">{parseFloat(line.cantidad || "0").toLocaleString("es-CL")}</td>
                              <td className="p-2 text-right font-mono">{line.localReceivedQuantity.toLocaleString("es-CL")}</td>
                              <td className="p-2 text-right font-mono font-semibold">{line.pendingQuantity.toLocaleString("es-CL")}</td>
                              <td className="p-2 text-center">
                                {line.isFullyReceived ? (
                                  <Badge variant="default" className="bg-green-100 text-green-700 text-xs"><Check className="w-3 h-3 mr-0.5" />Completo</Badge>
                                ) : line.localReceivedQuantity > 0 ? (
                                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs"><Clock className="w-3 h-3 mr-0.5" />Parcial</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs"><AlertCircle className="w-3 h-3 mr-0.5" />Pendiente</Badge>
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
        )}
      </div>

      {/* ======================== */}
      {/* Formulario Principal */}
      {/* ======================== */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Selector de Centro de Costo */}
          <FormField
            control={form.control}
            name="costCenter"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Centro de Costo
                </FormLabel>
                <FormControl>
                  {isOcMode ? (
                    <Select value={field.value} onValueChange={(val) => { field.onChange(val); handleSelectOcCostCenter(val); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar centro de costo de la OC" />
                      </SelectTrigger>
                      <SelectContent>
                        {ocCostCenters.map((cc) => (
                          <SelectItem key={cc} value={cc}>{cc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="space-y-2">
                      {costCenters.length > 0 && (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar centro de costo existente" />
                          </SelectTrigger>
                          <SelectContent>
                            {costCenters.map((center: string) => (
                              <SelectItem key={center} value={center}>
                                {center}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Input
                        placeholder="O escribir nuevo centro de costo"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </div>
                  )}
                </FormControl>
                <FormDescription>
                  {isOcMode
                    ? "Centro de costo obtenido de la Orden de Compra"
                    : "Selecciona un centro de costo existente o crea uno nuevo"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campo de ubicación (solo manual) */}
          {!isOcMode && (
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ubicación (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Oficina Central, Planta Norte..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Ubicación física del centro de costo (solo para centros nuevos)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Selector de Producto con Código de Barras */}
          <FormField
            control={form.control}
            name="productId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Producto
                </FormLabel>
                {isOcMode && selectedLine?.localProductId && selectedLine.matchedProductName && (
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="default" className="bg-green-100 text-green-700">Auto-vinculado</Badge>
                    <span className="text-muted-foreground">{selectedLine.matchedProductName}</span>
                  </div>
                )}
                <div className="flex gap-2 w-full items-center">
                  <FormControl className="flex-1">
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name} ({product.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>

                  <Button
                    type="button"
                    size="default"
                    onClick={barcodeFlow.startScanning}
                    title="Escanear código de barras"
                    className="bg-red-500 hover:bg-red-600 text-white font-bold border-2 border-red-700 min-w-[120px]"
                  >
                    📱 SCANNER
                  </Button>
                </div>
                {isOcMode && selectedLine && !field.value && (
                  <p className="text-xs text-amber-600">
                    No se encontró producto local para codprod "{selectedLine.codprod}". Seleccione uno manualmente.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

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
                    Máximo permitido: {maxQuantity.toLocaleString("es-CL")} (pendiente de OC)
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
                  {isOcMode && selectedLine
                    ? `Calculado desde OC: ${formatMoney(selectedLine.calculatedUnitPrice)} - puede modificarse`
                    : "Precio específico para este ingreso en pesos chilenos"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Números de Serie (si es requerido) */}
          {selectedProduct?.requiresSerial && (
            <div className="space-y-3">
              <FormLabel>Números de Serie</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="Ingrese número de serie"
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
                Este producto requiere {form.watch("quantity")} números de serie únicos
              </FormDescription>
            </div>
          )}

          {/* Razón */}
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Razón (Opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descripción del motivo del ingreso..."
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

      {/* Escáner de códigos de barras */}
      <BarcodeScannerNative
        isOpen={barcodeFlow.state === "scanning"}
        onClose={barcodeFlow.handleCancel}
        onScan={barcodeFlow.handleBarcodeScanned}
        title="Escanear Código de Barras"
        description="Apunta la cámara hacia el código de barras del producto"
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
            ✅ Producto encontrado: <strong>{barcodeFlow.product.name}</strong> (SKU: {barcodeFlow.product.sku})
          </p>
        </div>
      )}
    </div>
  );
}
