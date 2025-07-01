import { useState } from "react";
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
import { stockEntrySchema, type Product } from "@shared/schema";
import { z } from "zod";
import { Plus, X } from "lucide-react";

type StockEntryData = z.infer<typeof stockEntrySchema>;

interface StockEntryFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function StockEntryForm({ onSuccess, onCancel }: StockEntryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [serialNumbers, setSerialNumbers] = useState<string[]>([]);
  const [serialInput, setSerialInput] = useState("");

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const form = useForm<StockEntryData>({
    resolver: zodResolver(stockEntrySchema),
    defaultValues: {
      productId: 0,
      quantity: 1,
      serialNumbers: [],
      reason: "",
    },
  });

  const selectedProductId = form.watch("productId");
  const quantity = form.watch("quantity");
  
  const selectedProduct = products.find(p => p.id === selectedProductId);
  const requiresSerial = selectedProduct?.requiresSerial || false;

  const stockEntryMutation = useMutation({
    mutationFn: async (data: StockEntryData) => {
      const response = await apiRequest("POST", "/api/stock-entry", {
        ...data,
        serialNumbers: requiresSerial ? serialNumbers : undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Stock ingresado",
        description: "El stock se ha ingresado exitosamente a la bodega principal.",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo ingresar el stock. Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  const addSerialNumber = () => {
    if (serialInput.trim() && !serialNumbers.includes(serialInput.trim())) {
      setSerialNumbers([...serialNumbers, serialInput.trim()]);
      setSerialInput("");
    }
  };

  const removeSerialNumber = (index: number) => {
    setSerialNumbers(serialNumbers.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: StockEntryData) => {
    // Validate serial numbers if required
    if (requiresSerial && serialNumbers.length !== quantity) {
      toast({
        title: "Error de validación",
        description: `Este producto requiere números de serie. Debes agregar exactamente ${quantity} números de serie.`,
        variant: "destructive",
      });
      return;
    }

    await stockEntryMutation.mutateAsync(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Ingreso de Stock Inicial</h3>
          <p className="text-sm text-muted-foreground">
            El stock se ingresará automáticamente a la bodega principal del centro de costos.
          </p>
        </div>

        <FormField
          control={form.control}
          name="productId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Producto</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(parseInt(value));
                  // Reset serial numbers when product changes
                  setSerialNumbers([]);
                }}
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
                        {product.requiresSerial && (
                          <Badge variant="secondary" className="text-xs">
                            Requiere Serie
                          </Badge>
                        )}
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
                  placeholder="1"
                  {...field}
                  onChange={(e) => {
                    field.onChange(parseInt(e.target.value) || 1);
                    // Reset serial numbers when quantity changes
                    setSerialNumbers([]);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {requiresSerial && selectedProductId > 0 && (
          <div className="space-y-2">
            <FormLabel>Números de Serie</FormLabel>
            <FormDescription>
              Este producto requiere números de serie. Agrega {quantity} números únicos.
            </FormDescription>
            
            <div className="flex gap-2">
              <Input
                placeholder="Ingresa número de serie"
                value={serialInput}
                onChange={(e) => setSerialInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSerialNumber();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addSerialNumber}
                disabled={!serialInput.trim() || serialNumbers.length >= quantity}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {serialNumbers.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {serialNumbers.map((serial, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {serial}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeSerialNumber(index)}
                      />
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {serialNumbers.length} de {quantity} números de serie agregados
                </p>
              </div>
            )}
          </div>
        )}

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motivo (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Descripción del ingreso de stock" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={stockEntryMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={stockEntryMutation.isPending}
          >
            {stockEntryMutation.isPending ? "Ingresando..." : "Ingresar Stock"}
          </Button>
        </div>
      </form>
    </Form>
  );
}