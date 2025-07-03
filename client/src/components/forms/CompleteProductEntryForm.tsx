import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { productEntrySchema, type Product, type Unit, type Category, type Brand } from "@shared/schema";
import { z } from "zod";
import { Plus, X, Package, Building2, Scan, Barcode, ShoppingCart, Settings, Info } from "lucide-react";
import { useBarcodeFlow } from "@/hooks/useBarcodeFlow";
import BarcodeScanner from "@/components/ui/barcode-scanner-native";
import ProductNotFoundModal from "@/components/modals/ProductNotFoundModal";
import AssociateProductModal from "@/components/modals/AssociateProductModal";
import NewProductWithBarcodeForm from "@/components/forms/NewProductWithBarcodeForm";
import { apiRequest } from "@/lib/queryClient";

// Esquema extendido para el formulario completo de ingreso
const completeProductEntrySchema = productEntrySchema.extend({
  // Información del producto si no existe
  newProductName: z.string().optional(),
  newProductSku: z.string().optional(),
  newProductDescription: z.string().optional(),
  newProductType: z.enum(["tangible", "intangible"]).default("tangible"),
  newProductRequiresSerial: z.boolean().default(false),
  newProductUnitId: z.number().optional(),
  newProductCategoryId: z.number().optional(),
  newProductBrandId: z.number().optional(),
  newProductHasWarranty: z.boolean().default(false),
  newProductWarrantyMonths: z.number().default(0),
  newProductMinStock: z.number().default(0),
  newProductIsActive: z.boolean().default(true),
  // Precio inicial
  initialPrice: z.number().min(0, "El precio debe ser mayor a 0"),
  // Código de barras
  scannedBarcode: z.string().optional(),
});

type CompleteProductEntryData = z.infer<typeof completeProductEntrySchema>;

interface CompleteProductEntryFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CompleteProductEntryForm({ onSuccess, onCancel }: CompleteProductEntryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [serialNumbers, setSerialNumbers] = useState<string[]>([]);
  const [serialInput, setSerialInput] = useState("");
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Cargar datos necesarios
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["/api/warehouses"],
  });

  // Centros de costo predefinidos
  const costCenters = ["CC252130", "CC252131", "CC252132", "CC252133"];

  const form = useForm<CompleteProductEntryData>({
    resolver: zodResolver(completeProductEntrySchema),
    defaultValues: {
      productId: 0,
      costCenter: "",
      quantity: 1,
      price: 0,
      serialNumbers: [],
      reason: "Ingreso inicial",
      location: "",
      scannedBarcode: "",
      // Datos del nuevo producto
      newProductName: "",
      newProductSku: "",
      newProductDescription: "",
      newProductType: "tangible",
      newProductRequiresSerial: false,
      newProductUnitId: 0,
      newProductCategoryId: 0,
      newProductBrandId: 0,
      newProductHasWarranty: false,
      newProductWarrantyMonths: 0,
      newProductMinStock: 0,
      newProductIsActive: true,
      initialPrice: 0,
    },
  });

  // Hook para manejo de códigos de barras
  const {
    scanState,
    scannedCode,
    handleStartScan,
    handleStopScan,
    handleCodeScanned,
    handleProductFound,
    handleProductNotFound,
    handleAssociateProduct,
    handleCreateNewProduct,
    modalStates,
    closeModal,
  } = useBarcodeFlow({
    onProductSelected: (product: Product) => {
      setSelectedProduct(product);
      form.setValue("productId", product.id);
      form.setValue("scannedBarcode", product.barcode || "");
      setIsNewProduct(false);
    },
    onNewProductNeeded: (barcode: string) => {
      form.setValue("scannedBarcode", barcode);
      setIsNewProduct(true);
      setSelectedProduct(null);
    },
  });

  // Efecto para actualizar el campo barcode cuando se selecciona un producto
  useEffect(() => {
    if (selectedProduct) {
      form.setValue("productId", selectedProduct.id);
    }
  }, [selectedProduct, form]);

  // Función para manejar números de serie
  const addSerialNumber = () => {
    if (serialInput.trim() && !serialNumbers.includes(serialInput.trim())) {
      const newSerials = [...serialNumbers, serialInput.trim()];
      setSerialNumbers(newSerials);
      form.setValue("serialNumbers", newSerials);
      setSerialInput("");
    }
  };

  const removeSerialNumber = (index: number) => {
    const newSerials = serialNumbers.filter((_, i) => i !== index);
    setSerialNumbers(newSerials);
    form.setValue("serialNumbers", newSerials);
  };

  // Mutación para crear el producto si es necesario
  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      const response = await apiRequest("/api/products", {
        method: "POST",
        body: JSON.stringify({
          ...productData,
          currentPrice: productData.initialPrice || 0,
        }),
      });
      return response.json();
    },
  });

  // Mutación para crear el movimiento de inventario
  const createInventoryMutation = useMutation({
    mutationFn: async (data: CompleteProductEntryData) => {
      let productToUse = selectedProduct;

      // Si es un producto nuevo, créalo primero
      if (isNewProduct && data.newProductName) {
        const newProductData = {
          name: data.newProductName,
          sku: data.newProductSku || "",
          barcode: data.scannedBarcode || "",
          description: data.newProductDescription || "",
          productType: data.newProductType,
          requiresSerial: data.newProductRequiresSerial,
          unitId: data.newProductUnitId,
          categoryId: data.newProductCategoryId,
          brandId: data.newProductBrandId,
          hasWarranty: data.newProductHasWarranty,
          warrantyMonths: data.newProductHasWarranty ? data.newProductWarrantyMonths : 0,
          minStock: data.newProductMinStock,
          isActive: data.newProductIsActive,
        };

        productToUse = await createProductMutation.mutateAsync(newProductData);
      }

      if (!productToUse) {
        throw new Error("No se pudo determinar el producto para el ingreso");
      }

      // Buscar bodega principal
      const mainWarehouse = warehouses.find((w: any) => w.name === "PRINCIPAL");
      if (!mainWarehouse) {
        throw new Error("No se encontró la bodega principal");
      }

      const response = await apiRequest("/api/inventory/entries", {
        method: "POST",
        body: JSON.stringify({
          productId: productToUse.id,
          warehouseId: mainWarehouse.id,
          quantity: data.quantity,
          price: data.price,
          reason: data.reason || "Ingreso inicial",
          location: data.location || "PRINCIPAL",
          serialNumbers: data.serialNumbers,
          costCenter: data.costCenter,
        }),
      });

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ingreso exitoso",
        description: "El producto ha sido ingresado al inventario correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      form.reset();
      setSerialNumbers([]);
      setSelectedProduct(null);
      setIsNewProduct(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo completar el ingreso",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: CompleteProductEntryData) => {
    if (!isNewProduct && !selectedProduct) {
      toast({
        title: "Error",
        description: "Debe seleccionar un producto o crear uno nuevo",
        variant: "destructive",
      });
      return;
    }

    if (isNewProduct && (!data.newProductName || !data.newProductUnitId || !data.newProductCategoryId || !data.newProductBrandId)) {
      toast({
        title: "Error",
        description: "Complete todos los campos requeridos para el nuevo producto",
        variant: "destructive",
      });
      return;
    }

    createInventoryMutation.mutate(data);
  };

  const isLoading = createInventoryMutation.isPending || createProductMutation.isPending;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <ShoppingCart className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Ingreso Completo de Productos</h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Sección de Selección/Creación de Producto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Selección de Producto
              </CardTitle>
              <CardDescription>
                Escanee un código de barras, seleccione un producto existente o cree uno nuevo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Scanner de códigos de barras */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={scanState === "idle" ? handleStartScan : handleStopScan}
                  className="flex items-center gap-2"
                >
                  <Scan className="h-4 w-4" />
                  {scanState === "idle" ? "Escanear Código" : "Detener Escáner"}
                </Button>
                {scannedCode && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Barcode className="h-3 w-3" />
                    {scannedCode}
                  </Badge>
                )}
              </div>

              {scanState === "scanning" && (
                <BarcodeScanner
                  onCodeScanned={handleCodeScanned}
                  onError={(error) => {
                    console.error("Error escaneando código:", error);
                    handleStopScan();
                  }}
                />
              )}

              {/* Selector de producto existente o nuevo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Producto Existente</FormLabel>
                      <Select
                        disabled={isNewProduct}
                        value={field.value?.toString() || ""}
                        onValueChange={(value) => {
                          const productId = parseInt(value);
                          field.onChange(productId);
                          const product = products.find(p => p.id === productId);
                          setSelectedProduct(product || null);
                          setIsNewProduct(false);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar producto existente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name} {product.sku && `(${product.sku})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    checked={isNewProduct}
                    onCheckedChange={(checked) => {
                      setIsNewProduct(checked);
                      if (checked) {
                        setSelectedProduct(null);
                        form.setValue("productId", 0);
                      }
                    }}
                  />
                  <label className="text-sm font-medium">Crear producto nuevo</label>
                </div>
              </div>

              {/* Información del producto seleccionado */}
              {selectedProduct && !isNewProduct && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Producto Seleccionado:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>Nombre:</strong> {selectedProduct.name}</div>
                    <div><strong>SKU:</strong> {selectedProduct.sku || "N/A"}</div>
                    <div><strong>Código:</strong> {selectedProduct.barcode || "N/A"}</div>
                    <div><strong>Tipo:</strong> {selectedProduct.productType}</div>
                    <div><strong>Requiere Serie:</strong> {selectedProduct.requiresSerial ? "Sí" : "No"}</div>
                    <div><strong>Garantía:</strong> {selectedProduct.hasWarranty ? `${selectedProduct.warrantyMonths} meses` : "No"}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sección de Nuevo Producto (si aplica) */}
          {isNewProduct && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Datos del Nuevo Producto
                </CardTitle>
                <CardDescription>
                  Complete toda la información del producto a crear
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Información básica */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="newProductName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del Producto *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre del producto" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="newProductSku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input placeholder="Código SKU" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="newProductDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descripción detallada del producto"
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Categorización */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="newProductUnitId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidad de Medida *</FormLabel>
                        <Select
                          value={field.value?.toString() || ""}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar unidad" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {units.map((unit) => (
                              <SelectItem key={unit.id} value={unit.id.toString()}>
                                {unit.name} ({unit.symbol})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="newProductCategoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría *</FormLabel>
                        <Select
                          value={field.value?.toString() || ""}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar categoría" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="newProductBrandId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marca *</FormLabel>
                        <Select
                          value={field.value?.toString() || ""}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar marca" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {brands.map((brand) => (
                              <SelectItem key={brand.id} value={brand.id.toString()}>
                                {brand.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Configuraciones */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="newProductType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Producto</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="tangible">Tangible</SelectItem>
                            <SelectItem value="intangible">Intangible</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="newProductMinStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock Mínimo</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Switches */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="newProductRequiresSerial"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Requiere Serie</FormLabel>
                          <FormDescription>
                            Activar si el producto requiere números de serie
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="newProductHasWarranty"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Tiene Garantía</FormLabel>
                          <FormDescription>
                            Activar si el producto tiene garantía
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="newProductIsActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Producto Activo</FormLabel>
                          <FormDescription>
                            Desactivar si el producto no se debe usar
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Garantía (condicional) */}
                {form.watch("newProductHasWarranty") && (
                  <FormField
                    control={form.control}
                    name="newProductWarrantyMonths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meses de Garantía</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            placeholder="12"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Número de meses de garantía del producto
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Precio inicial */}
                <FormField
                  control={form.control}
                  name="initialPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio Inicial (CLP) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          step="0.01"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Precio de compra o valor inicial del producto
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Sección de Ingreso */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Información del Ingreso
              </CardTitle>
              <CardDescription>
                Configure los detalles del ingreso a inventario
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="costCenter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Centro de Costo *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar centro de costo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {costCenters.map((center) => (
                            <SelectItem key={center} value={center}>
                              {center}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ubicación</FormLabel>
                      <FormControl>
                        <Input placeholder="Ubicación específica" {...field} />
                      </FormControl>
                      <FormDescription>
                        Ubicación específica dentro de la bodega
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1"
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio Unitario (CLP) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Precio de compra por unidad
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo del Ingreso</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Ingreso inicial de inventario"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Números de serie (si el producto los requiere) */}
              {(selectedProduct?.requiresSerial || form.watch("newProductRequiresSerial")) && (
                <div className="space-y-2">
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
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {serialNumbers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {serialNumbers.map((serial, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {serial}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => removeSerialNumber(index)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                  <FormDescription>
                    Se requieren {form.watch("quantity")} números de serie
                  </FormDescription>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botones de acción */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Procesando..." : "Completar Ingreso"}
            </Button>
          </div>
        </form>
      </Form>

      {/* Modales */}
      <ProductNotFoundModal
        isOpen={modalStates.productNotFound}
        onClose={closeModal}
        barcode={scannedCode}
        onAssociate={() => handleAssociateProduct(scannedCode)}
        onCreateNew={() => handleCreateNewProduct(scannedCode)}
      />

      <AssociateProductModal
        isOpen={modalStates.associateProduct}
        onClose={closeModal}
        barcode={scannedCode}
        products={products}
        onAssociate={handleProductFound}
      />

      <NewProductWithBarcodeForm
        isOpen={modalStates.createNewProduct}
        onClose={closeModal}
        barcode={scannedCode}
        onSuccess={handleProductFound}
      />
    </div>
  );
}