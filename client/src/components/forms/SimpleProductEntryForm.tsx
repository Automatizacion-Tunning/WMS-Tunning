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
import { productEntrySchema, type Product } from "@shared/schema";
import { z } from "zod";
import { Plus, X, Package, Building2 } from "lucide-react";

type ProductEntryData = z.infer<typeof productEntrySchema>;

interface SimpleProductEntryFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function SimpleProductEntryForm({ onSuccess, onCancel }: SimpleProductEntryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [serialNumbers, setSerialNumbers] = useState<string[]>([]);
  const [serialInput, setSerialInput] = useState("");

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Centros de costo predefinidos
  const costCenters = ["CC252130", "CC252131", "CC252132", "CC252133"];

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

  // Mutación para el ingreso de producto
  const entryMutation = useMutation({
    mutationFn: async (data: ProductEntryData) => {
      const response = await fetch("/api/product-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Error al ingresar producto");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ingreso exitoso",
        description: "El producto se ha ingresado correctamente a la bodega principal.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
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

  const onSubmit = async (data: ProductEntryData) => {
    const finalData = {
      ...data,
      serialNumbers: serialNumbers.length > 0 ? serialNumbers : undefined,
    };

    entryMutation.mutate(finalData);
  };

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

  return (
    <div className="space-y-6">
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
                  <div className="space-y-2">
                    {costCenters.length > 0 && (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar centro de costo existente" />
                        </SelectTrigger>
                        <SelectContent>
                          {costCenters.map((center) => (
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
                </FormControl>
                <FormDescription>
                  Selecciona un centro de costo existente o crea uno nuevo
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campo de ubicación (opcional) */}
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

          {/* Selector de Producto */}
          <FormField
            control={form.control}
            name="productId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Producto
                </FormLabel>
                <FormControl>
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
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
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
                  Precio específico para este ingreso en pesos chilenos
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
              disabled={entryMutation.isPending}
            >
              {entryMutation.isPending ? "Procesando..." : "Ingresar Producto"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}