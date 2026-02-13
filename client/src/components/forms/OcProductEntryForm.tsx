import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Product } from "@shared/schema";
import {
  Search, ChevronLeft, ChevronRight, Package, Building2, FileText,
  Check, Clock, AlertCircle, Plus, X, ArrowLeft,
} from "lucide-react";

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

type Step = "search" | "cost-center" | "line-select" | "confirm";

interface OcProductEntryFormProps {
  onSuccess?: () => void;
}

export default function OcProductEntryForm({ onSuccess }: OcProductEntryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Step state
  const [step, setStep] = useState<Step>("search");

  // Search state
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Selections
  const [selectedOC, setSelectedOC] = useState<string>("");
  const [selectedCC, setSelectedCC] = useState<string>("");
  const [selectedLine, setSelectedLine] = useState<EnrichedOcLine | null>(null);
  const [selectedOCInfo, setSelectedOCInfo] = useState<OcSearchResult | null>(null);

  // Form fields for step 4
  const [productId, setProductId] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);
  const [reason, setReason] = useState<string>("");
  const [serialNumbers, setSerialNumbers] = useState<string[]>([]);
  const [serialInput, setSerialInput] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Search OCs
  const { data: searchResults = [], isFetching: isSearching } = useQuery<OcSearchResult[]>({
    queryKey: ["/api/ordenes-compra/search", debouncedSearch],
    queryFn: () => apiRequest(`/api/ordenes-compra/search?q=${encodeURIComponent(debouncedSearch)}`),
    enabled: debouncedSearch.length >= 2,
  });

  // Get cost centers for selected OC
  const { data: ocCostCenters = [], isFetching: isLoadingCC } = useQuery<string[]>({
    queryKey: ["/api/ordenes-compra", selectedOC, "cost-centers"],
    queryFn: () => apiRequest(`/api/ordenes-compra/${encodeURIComponent(selectedOC)}/cost-centers`),
    enabled: !!selectedOC && step === "cost-center",
  });

  // Get lines for selected OC + CC
  const { data: ocLines = [], isFetching: isLoadingLines } = useQuery<EnrichedOcLine[]>({
    queryKey: ["/api/ordenes-compra", selectedOC, "lines", selectedCC],
    queryFn: () => {
      const url = selectedCC
        ? `/api/ordenes-compra/${encodeURIComponent(selectedOC)}/lines?cc=${encodeURIComponent(selectedCC)}`
        : `/api/ordenes-compra/${encodeURIComponent(selectedOC)}/lines`;
      return apiRequest(url);
    },
    enabled: !!selectedOC && (step === "line-select" || step === "confirm"),
  });

  // Products for matching
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Auto-advance from cost-center step
  useEffect(() => {
    if (step === "cost-center" && ocCostCenters.length === 1 && !isLoadingCC) {
      setSelectedCC(ocCostCenters[0]);
      setStep("line-select");
    }
  }, [step, ocCostCenters, isLoadingCC]);

  // Entry mutation
  const entryMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/product-entry-oc", {
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

      // Reset to line selection for batch processing
      setSelectedLine(null);
      setProductId(0);
      setQuantity(1);
      setPrice(0);
      setReason("");
      setSerialNumbers([]);
      setStep("line-select");
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error al ingresar producto",
        description: error.message || "Ocurrio un error inesperado",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleSelectOC = (oc: OcSearchResult) => {
    setSelectedOC(oc.numoc);
    setSelectedOCInfo(oc);
    setSelectedCC("");
    setSelectedLine(null);
    setStep("cost-center");
  };

  const handleSelectCC = (cc: string) => {
    setSelectedCC(cc);
    setSelectedLine(null);
    setStep("line-select");
  };

  const handleSelectLine = (line: EnrichedOcLine) => {
    if (line.isFullyReceived) return;
    setSelectedLine(line);

    // Auto-fill fields
    if (line.localProductId) {
      setProductId(line.localProductId);
    } else {
      setProductId(0);
    }
    setQuantity(Math.min(1, line.pendingQuantity));
    setPrice(line.calculatedUnitPrice);
    setReason(`Recepcion OC ${line.numoc} linea ${line.numlinea}`);
    setSerialNumbers([]);
    setStep("confirm");
  };

  const handleSubmit = () => {
    if (!selectedLine || !productId) return;

    entryMutation.mutate({
      purchaseOrderNumber: selectedOC,
      purchaseOrderLine: selectedLine.numlinea,
      costCenter: selectedCC || selectedLine.codicc,
      productId,
      quantity,
      price,
      serialNumbers: serialNumbers.length > 0 ? serialNumbers : undefined,
      reason: reason || undefined,
    });
  };

  const handleBack = () => {
    if (step === "confirm") setStep("line-select");
    else if (step === "line-select") setStep("cost-center");
    else if (step === "cost-center") {
      setSelectedOC("");
      setSelectedOCInfo(null);
      setStep("search");
    }
  };

  const handleReset = () => {
    setStep("search");
    setSearchText("");
    setDebouncedSearch("");
    setSelectedOC("");
    setSelectedOCInfo(null);
    setSelectedCC("");
    setSelectedLine(null);
    setProductId(0);
    setQuantity(1);
    setPrice(0);
    setReason("");
    setSerialNumbers([]);
  };

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

  const selectedProduct = products.find(p => p.id === productId);

  // Step indicator
  const steps = [
    { key: "search", label: "Buscar OC", icon: Search },
    { key: "cost-center", label: "Centro Costo", icon: Building2 },
    { key: "line-select", label: "Seleccionar Item", icon: FileText },
    { key: "confirm", label: "Confirmar", icon: Check },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === currentStepIndex;
          const isDone = i < currentStepIndex;
          return (
            <div key={s.key} className="flex items-center gap-2">
              {i > 0 && <div className={`h-px w-8 ${isDone ? 'bg-blue-500' : 'bg-gray-300'}`} />}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                ${isActive ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                  isDone ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* OC info bar */}
      {selectedOC && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <span className="font-semibold text-blue-900">OC: {selectedOC}</span>
                {selectedOCInfo?.nomaux && (
                  <span className="text-blue-700">Proveedor: {selectedOCInfo.nomaux}</span>
                )}
                {selectedCC && (
                  <Badge variant="secondary" className="font-mono">{selectedCC}</Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-blue-700">
                Cambiar OC
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 1: Search OC */}
      {step === "search" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Buscar Orden de Compra
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Escriba el numero de OC..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            {isSearching && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                Buscando...
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
                {searchResults.map((oc) => (
                  <button
                    key={oc.numoc}
                    onClick={() => handleSelectOC(oc)}
                    className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-semibold text-blue-700">{oc.numoc}</span>
                        {oc.nomaux && (
                          <span className="ml-3 text-sm text-muted-foreground">{oc.nomaux}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{formatDate(oc.fechaoc)}</span>
                        <Badge variant="outline">{oc.lineCount} items</Badge>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {debouncedSearch.length >= 2 && !isSearching && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No se encontraron ordenes de compra
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Select Cost Center */}
      {step === "cost-center" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Seleccionar Centro de Costo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingCC ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                Cargando centros de costo...
              </div>
            ) : ocCostCenters.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Esta OC no tiene centros de costo asignados
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Esta OC tiene {ocCostCenters.length} centro(s) de costo. Seleccione uno:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ocCostCenters.map((cc) => (
                    <button
                      key={cc}
                      onClick={() => handleSelectCC(cc)}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        <span className="font-mono font-semibold">{cc}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </>
            )}
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Select Line Item */}
      {step === "line-select" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Items de la Orden de Compra
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingLines ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                Cargando items...
              </div>
            ) : ocLines.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No se encontraron items para esta OC
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 font-medium">Linea</th>
                      <th className="text-left p-2 font-medium">Cod.Producto</th>
                      <th className="text-left p-2 font-medium">Descripcion</th>
                      <th className="text-right p-2 font-medium">Ordenado</th>
                      <th className="text-right p-2 font-medium">Recibido</th>
                      <th className="text-right p-2 font-medium">Pendiente</th>
                      <th className="text-right p-2 font-medium">Precio Unit.</th>
                      <th className="text-center p-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ocLines.map((line) => {
                      const ordenada = parseFloat(line.cantidad || "0");
                      return (
                        <tr
                          key={`${line.numoc}-${line.numlinea}`}
                          onClick={() => handleSelectLine(line)}
                          className={`border-b transition-colors ${
                            line.isFullyReceived
                              ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                              : 'hover:bg-blue-50 cursor-pointer'
                          }`}
                        >
                          <td className="p-2 font-mono">{line.numlinea}</td>
                          <td className="p-2 font-mono text-xs">{line.codprod || "-"}</td>
                          <td className="p-2">
                            <div className="max-w-[250px] truncate" title={line.desprod || ""}>
                              {line.desprod || "-"}
                            </div>
                          </td>
                          <td className="p-2 text-right font-mono">{ordenada.toLocaleString("es-CL")}</td>
                          <td className="p-2 text-right font-mono">{line.localReceivedQuantity.toLocaleString("es-CL")}</td>
                          <td className="p-2 text-right font-mono font-semibold">
                            {line.pendingQuantity.toLocaleString("es-CL")}
                          </td>
                          <td className="p-2 text-right font-mono">{formatMoney(line.calculatedUnitPrice)}</td>
                          <td className="p-2 text-center">
                            {line.isFullyReceived ? (
                              <Badge variant="default" className="bg-green-100 text-green-700">
                                <Check className="w-3 h-3 mr-1" />Completo
                              </Badge>
                            ) : line.localReceivedQuantity > 0 ? (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                <Clock className="w-3 h-3 mr-1" />Parcial
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <AlertCircle className="w-3 h-3 mr-1" />Pendiente
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: Confirm and Fill Details */}
      {step === "confirm" && selectedLine && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              Confirmar Ingreso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">OC:</span> <strong>{selectedOC}</strong></div>
                <div><span className="text-muted-foreground">Linea:</span> <strong>{selectedLine.numlinea}</strong></div>
                <div><span className="text-muted-foreground">Cod. Producto:</span> <strong className="font-mono">{selectedLine.codprod || "-"}</strong></div>
                <div><span className="text-muted-foreground">CC:</span> <Badge variant="secondary" className="font-mono">{selectedCC || selectedLine.codicc}</Badge></div>
              </div>
              <div><span className="text-muted-foreground">Descripcion:</span> {selectedLine.desprod || "-"}</div>
              <div className="flex gap-4 pt-1">
                <span>Ordenado: <strong>{parseFloat(selectedLine.cantidad || "0").toLocaleString("es-CL")}</strong></span>
                <span>Recibido: <strong>{selectedLine.localReceivedQuantity.toLocaleString("es-CL")}</strong></span>
                <span className="text-blue-700">Pendiente: <strong>{selectedLine.pendingQuantity.toLocaleString("es-CL")}</strong></span>
              </div>
            </div>

            {/* Product selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Package className="w-4 h-4" />
                Producto Local
              </label>
              {selectedLine.localProductId && selectedLine.matchedProductName ? (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-100 text-green-700">Auto-vinculado</Badge>
                  <span className="text-sm">{selectedLine.matchedProductName}</span>
                </div>
              ) : null}
              <Select
                value={productId?.toString() || ""}
                onValueChange={(val) => setProductId(parseInt(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto local" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.name} ({p.sku || "Sin SKU"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!productId && (
                <p className="text-xs text-amber-600">
                  No se encontro producto local para codprod "{selectedLine.codprod}". Seleccione uno manualmente.
                </p>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Cantidad</label>
              <Input
                type="number"
                inputMode="numeric"
                min="1"
                max={selectedLine.pendingQuantity}
                value={quantity}
                onChange={(e) => setQuantity(Math.min(parseInt(e.target.value) || 0, selectedLine.pendingQuantity))}
              />
              <p className="text-xs text-muted-foreground">
                Maximo permitido: {selectedLine.pendingQuantity.toLocaleString("es-CL")} (Ordenado: {parseFloat(selectedLine.cantidad || "0").toLocaleString("es-CL")}, Recibido: {selectedLine.localReceivedQuantity.toLocaleString("es-CL")})
              </p>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Precio Unitario (CLP)</label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Calculado desde OC: {formatMoney(selectedLine.calculatedUnitPrice)} - puede modificarse
              </p>
            </div>

            {/* Serial Numbers */}
            {selectedProduct?.requiresSerial && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Numeros de Serie</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ingrese numero de serie"
                    value={serialInput}
                    onChange={(e) => setSerialInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addSerialNumber(); }
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
                        <button type="button" onClick={() => removeSerialNumber(index)}
                          className="ml-1 text-muted-foreground hover:text-foreground">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Este producto requiere {quantity} numeros de serie unicos
                </p>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Razon (Opcional)</label>
              <Textarea
                placeholder="Descripcion del motivo del ingreso..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a items
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!productId || quantity < 1 || entryMutation.isPending}
              >
                {entryMutation.isPending ? "Procesando..." : "Confirmar Ingreso"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
