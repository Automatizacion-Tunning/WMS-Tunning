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
import { transferRequestSchema, type Product, type Warehouse, type InventoryWithDetails } from "@shared/schema";
import { z } from "zod";

type TransferRequestData = z.infer<typeof transferRequestSchema>;

interface TransferRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function TransferRequestForm({ onSuccess, onCancel }: TransferRequestFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });

  const { data: inventory = [] } = useQuery<InventoryWithDetails[]>({
    queryKey: ["/api/inventory"],
  });

  const form = useForm<TransferRequestData>({
    resolver: zodResolver(transferRequestSchema),
    defaultValues: {
      productId: 0,
      quantity: 1,
      sourceWarehouseId: 0,
      destinationWarehouseId: 0,
      costCenter: "",
      notes: "",
    },
  });

  const selectedProductId = form.watch("productId");
  const selectedSourceWarehouseId = form.watch("sourceWarehouseId");
  
  // Filter warehouses by type and availability
  const sourceWarehouses = warehouses.filter(w => w.isActive);
  const destinationWarehouses = warehouses.filter(w => 
    w.isActive && w.id !== selectedSourceWarehouseId
  );

  // Get available stock for selected product in selected warehouse
  const availableStock = inventory.find(
    inv => inv.productId === selectedProductId && inv.warehouseId === selectedSourceWarehouseId
  )?.quantity || 0;

  // Get cost centers from warehouses
  const costCenters = [...new Set(warehouses.map(w => w.costCenter))];

  const transferRequestMutation = useMutation({
    mutationFn: async (data: TransferRequestData) => {
      const response = await apiRequest("POST", "/api/transfer-orders", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transfer-orders"] });
      toast({
        title: "Solicitud de traspaso creada",
        description: "La solicitud ha sido enviada al jefe de proyectos para su aprobación.",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la solicitud. Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: TransferRequestData) => {
    if (data.quantity > availableStock) {
      toast({
        title: "Error de validación",
        description: `No hay suficiente stock disponible. Stock disponible: ${availableStock}`,
        variant: "destructive",
      });
      return;
    }

    await transferRequestMutation.mutateAsync(data);
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const selectedSourceWarehouse = warehouses.find(w => w.id === selectedSourceWarehouseId);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Solicitud de Traspaso</h3>
          <p className="text-sm text-muted-foreground">
            Solicita el traspaso de productos entre bodegas. Requiere aprobación del jefe de proyectos.
          </p>
        </div>

        <FormField
          control={form.control}
          name="productId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Producto</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span>{product.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {product.sku}
                        </Badge>
                      </div>
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
          name="sourceWarehouseId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bodega Origen</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar bodega origen" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {sourceWarehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span>{warehouse.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {warehouse.costCenter}
                        </Badge>
                      </div>
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
          name="destinationWarehouseId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bodega Destino</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar bodega destino" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {destinationWarehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span>{warehouse.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {warehouse.costCenter}
                        </Badge>
                      </div>
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
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cantidad</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  max={availableStock}
                  step="1"
                  placeholder="1"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  {...field}
                  value={field.value || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      field.onChange("");
                      return;
                    }
                    
                    const numValue = Number(value);
                    if (!isNaN(numValue) && numValue > 0 && numValue <= availableStock && Number.isInteger(numValue)) {
                      field.onChange(numValue);
                    }
                  }}
                  onBlur={(e) => {
                    if (!e.target.value || Number(e.target.value) < 1) {
                      field.onChange(1);
                    }
                  }}
                />
              </FormControl>
              {selectedProductId > 0 && selectedSourceWarehouseId > 0 && (
                <FormDescription>
                  Stock disponible en {selectedSourceWarehouse?.name}: {availableStock} unidades
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="costCenter"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Centro de Costos</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar centro de costos" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {costCenters.map((costCenter) => (
                    <SelectItem key={costCenter} value={costCenter}>
                      {costCenter}
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
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Motivo del traspaso o información adicional" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedProduct && (
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-2">Resumen del Producto</h4>
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Producto:</span> {selectedProduct.name}</p>
              <p><span className="font-medium">SKU:</span> {selectedProduct.sku}</p>
              <p><span className="font-medium">Tipo:</span> {selectedProduct.productType === 'tangible' ? 'Tangible' : 'Intangible'}</p>
              {selectedProduct.requiresSerial && (
                <p className="text-amber-600">
                  <span className="font-medium">⚠️ Requiere números de serie</span>
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={transferRequestMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={transferRequestMutation.isPending}
          >
            {transferRequestMutation.isPending ? "Enviando..." : "Solicitar Traspaso"}
          </Button>
        </div>
      </form>
    </Form>
  );
}