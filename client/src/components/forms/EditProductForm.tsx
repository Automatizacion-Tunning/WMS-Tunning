import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { insertProductSchema } from "@shared/schema";
import BarcodeScannerNative from "@/components/ui/barcode-scanner-native";
import { z } from "zod";
import { Scan } from "lucide-react";
import type { Product } from "@shared/schema";

const productFormSchema = insertProductSchema.extend({
  currentPrice: z.number().min(0, "El precio debe ser mayor a 0"),
});

type ProductFormData = z.infer<typeof productFormSchema>;

interface EditProductFormProps {
  product: Product;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function EditProductForm({ product, onSuccess, onCancel }: EditProductFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || "",
      description: product.description || "",
      minStock: product.minStock,
      productType: product.productType,
      requiresSerial: product.requiresSerial,
      isActive: product.isActive,
      currentPrice: 0, // Will be set from current price API
    },
  });

  // Funciones para el escáner de código de barras
  const handleBarcodeScanned = async (barcode: string) => {
    // Verificar si el código ya existe en otro producto
    try {
      const response = await fetch(`/api/products?barcode=${encodeURIComponent(barcode)}`);
      if (response.ok) {
        const existingProduct = await response.json();
        if (existingProduct.id !== product.id) {
          toast({
            title: "Código de barras duplicado",
            description: `Este código ya está asignado al producto "${existingProduct.name}" (SKU: ${existingProduct.sku})`,
            variant: "destructive",
          });
          setIsBarcodeScannerOpen(false);
          return;
        }
      }
    } catch (error) {
      // Si hay error en la verificación, continuar (probablemente el código no existe)
    }

    form.setValue("barcode", barcode);
    setIsBarcodeScannerOpen(false);
    toast({
      title: "Código escaneado",
      description: `Código ${barcode} agregado al producto`,
    });
  };

  // Validar código de barras cuando se escribe manualmente
  const validateBarcode = async (barcode: string) => {
    if (!barcode || barcode === product.barcode) return; // No validar si está vacío o es el mismo código actual
    
    try {
      const response = await fetch(`/api/products?barcode=${encodeURIComponent(barcode)}`);
      if (response.ok) {
        const existingProduct = await response.json();
        if (existingProduct.id !== product.id) {
          form.setError("barcode", {
            type: "manual",
            message: `Este código ya está asignado al producto "${existingProduct.name}" (SKU: ${existingProduct.sku})`
          });
          toast({
            title: "Código de barras duplicado",
            description: `Este código ya está asignado al producto "${existingProduct.name}"`,
            variant: "destructive",
          });
        }
      } else {
        // Si la respuesta es 404, el código no existe (válido)
        form.clearErrors("barcode");
      }
    } catch (error) {
      // Error en la verificación, no hacer nada
    }
  };

  const updateProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const { currentPrice, ...productData } = data;
      
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || "Error al actualizar el producto");
        (error as any).status = response.status;
        (error as any).data = errorData;
        throw error;
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Producto actualizado",
        description: "Los cambios se han guardado exitosamente.",
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      if (error.status === 409) {
        // Error de código de barras duplicado
        const errorData = error.data || {};
        const existingProduct = errorData.existingProduct;
        
        if (existingProduct) {
          form.setError("barcode", {
            type: "manual",
            message: `Este código ya está asignado al producto "${existingProduct.name}" (SKU: ${existingProduct.sku})`
          });
        }
        
        toast({
          title: "Código de barras duplicado",
          description: existingProduct 
            ? `Este código ya está asignado al producto "${existingProduct.name}"`
            : "Este código de barras ya está en uso",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo actualizar el producto. Intenta nuevamente.",
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = async (data: ProductFormData) => {
    updateProductMutation.mutate(data);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar Producto</DialogTitle>
      </DialogHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Producto</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Laptop Dell XPS" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: LAPTOP-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="barcode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código de Barras</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input 
                      placeholder="Ej: 123456789012" 
                      {...field} 
                      value={field.value || ""}
                      onBlur={(e) => {
                        field.onBlur();
                        validateBarcode(e.target.value);
                      }}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsBarcodeScannerOpen(true)}
                    title="Escanear código de barras"
                  >
                    <Scan className="w-4 h-4" />
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Descripción detallada del producto..." 
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minStock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stock Mínimo</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0"
                    step="1"
                    placeholder="10" 
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
                      if (!isNaN(numValue) && numValue >= 0 && Number.isInteger(numValue)) {
                        field.onChange(numValue);
                      }
                    }}
                    onBlur={(e) => {
                      if (!e.target.value) {
                        field.onChange(0);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="productType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Producto</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tipo" />
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
            name="requiresSerial"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Requiere Número de Serie
                  </FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Activar si el producto necesita números de serie únicos
                  </div>
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
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Producto Activo
                  </FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Desactivar para ocultar el producto del sistema
                  </div>
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={updateProductMutation.isPending}
            >
              {updateProductMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </Form>

      {/* Escáner de códigos de barras */}
      <BarcodeScannerNative
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title="Escanear Código de Barras"
        description="Apunta la cámara hacia el código de barras del producto"
      />
    </>
  );
}