import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { productFormSchema } from "@shared/schema";
import { z } from "zod";

type ProductFormData = z.infer<typeof productFormSchema>;

interface NewProductFormProps {
  onSuccess?: (data: ProductFormData) => void;
  onCancel?: () => void;
}

export default function NewProductForm({ onSuccess, onCancel }: NewProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      productType: "tangible",
      requiresSerial: false,
      currentPrice: 0,
    },
  });

  const onSubmit = async (data: ProductFormData) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      onSuccess?.(data);
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const productType = form.watch("productType");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Información básica */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Producto *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Laptop Dell XPS 13" {...field} />
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
                  <FormLabel>SKU (Código) *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: LAP-DELL-XPS13-001" {...field} />
                  </FormControl>
                  <FormDescription>
                    Identificador único del producto
                  </FormDescription>
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
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />


          </div>

          {/* Configuración del producto */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="productType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Producto *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="tangible">Tangible</SelectItem>
                      <SelectItem value="intangible">Intangible</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {productType === "tangible" 
                      ? "Producto físico con existencia en bodega"
                      : "Producto digital o servicio sin existencia física"
                    }
                  </FormDescription>
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
                    <FormLabel className="text-base">¿Requiere Número de Serie?</FormLabel>
                    <FormDescription>
                      Activar si cada unidad necesita un número de serie único
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
              name="currentPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Inicial (CLP) *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Precio para el mes actual (se puede cambiar mensualmente)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creando..." : "Crear Producto"}
          </Button>
        </div>
      </form>
    </Form>
  );
}