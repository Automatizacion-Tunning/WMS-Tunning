import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Unit, type Category, type Brand, type ProductWithCurrentPrice } from "@shared/schema";
import { z } from "zod";

// Esquema para edición de productos
const editProductFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  productType: z.enum(["tangible", "intangible"]).default("tangible"),
  requiresSerial: z.boolean().default(false),
  isActive: z.boolean().default(true),
  maxStock: z.number().min(0).default(0),
  unitId: z.number().min(1, "Debe seleccionar una unidad"),
  categoryId: z.number().min(1, "Debe seleccionar una categoría"),
  brandId: z.number().min(1, "Debe seleccionar una marca"),
  hasWarranty: z.boolean().default(false),
  warrantyMonths: z.number().min(0, "La garantía debe ser mayor o igual a 0").default(0),
  currentPrice: z.number().min(0, "El precio debe ser mayor a 0"),
});

type EditProductFormData = z.infer<typeof editProductFormSchema>;

interface EditProductFormProps {
  product: ProductWithCurrentPrice;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function EditProductForm({ product, onSuccess, onCancel }: EditProductFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Obtener opciones para los selectores
  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const form = useForm<EditProductFormData>({
    resolver: zodResolver(editProductFormSchema),
    defaultValues: {
      name: product.name,
      sku: product.sku || "",
      barcode: product.barcode || "",
      description: product.description || "",
      productType: product.productType || "tangible",
      requiresSerial: product.requiresSerial || false,
      isActive: product.isActive ?? true,
      maxStock: product.maxStock || 0,
      unitId: product.unitId || 0,
      categoryId: product.categoryId || 0,
      brandId: product.brandId || 0,
      hasWarranty: product.hasWarranty || false,
      warrantyMonths: product.warrantyMonths || 0,
      currentPrice: parseFloat(product.currentPrice?.price || "0"),
    },
  });

  const onSubmit = async (data: EditProductFormData) => {
    try {
      setIsSubmitting(true);
      
      // Separar precio del resto de datos
      const { currentPrice, ...productData } = data;
      
      // Actualizar el producto
      const response = await apiRequest(`/api/products/${product.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...productData,
          currentPrice: currentPrice || 0,
        }),
      });

      if (response.ok) {
        toast({
          title: "Producto actualizado",
          description: "El producto ha sido actualizado exitosamente",
        });
        
        // Invalidar cache
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        
        // Callback de éxito
        onSuccess?.();
      } else {
        throw new Error("Error al actualizar el producto");
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el producto. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-16">
        {/* Nombre del Producto */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Producto *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ingrese el nombre del producto" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* SKU */}
        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SKU</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} placeholder="Código SKU del producto" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Código de Barras */}
        <FormField
          control={form.control}
          name="barcode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código de Barras</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} placeholder="Ej: 1234567890123" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Descripción */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value || ""} placeholder="Descripción del producto" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Categoría */}
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría *</FormLabel>
              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una categoría" />
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

        {/* Marca */}
        <FormField
          control={form.control}
          name="brandId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Marca *</FormLabel>
              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una marca" />
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

        {/* Unidad de Medida */}
        <FormField
          control={form.control}
          name="unitId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unidad de Medida *</FormLabel>
              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una unidad" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id.toString()}>
                      {unit.name} ({unit.abbreviation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Precio Actual */}
        <FormField
          control={form.control}
          name="currentPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Precio Actual (CLP) *</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  {...field} 
                  value={field.value || 0}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  placeholder="0" 
                  min="0"
                  step="0.01"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Garantía */}
        <FormField
          control={form.control}
          name="hasWarranty"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Tiene Garantía
                </FormLabel>
                <p className="text-sm text-muted-foreground">
                  Activar si el producto incluye garantía
                </p>
              </div>
            </FormItem>
          )}
        />

        {/* Meses de Garantía - Solo si tiene garantía */}
        {form.watch("hasWarranty") && (
          <FormField
            control={form.control}
            name="warrantyMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meses de Garantía *</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    value={field.value || 0}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    placeholder="Ej: 12, 24, 36" 
                    min="1"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Stock Máximo */}
        <FormField
          control={form.control}
          name="maxStock"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stock Máximo</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  {...field} 
                  value={field.value || 0}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  placeholder="0" 
                  min="0"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tipo de Producto */}
        <FormField
          control={form.control}
          name="productType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Producto</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
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
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Requiere Número de Serie */}
        <FormField
          control={form.control}
          name="requiresSerial"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Requiere Número de Serie
                </FormLabel>
                <p className="text-sm text-muted-foreground">
                  Activar si el producto necesita números de serie únicos
                </p>
              </div>
            </FormItem>
          )}
        />

        {/* Producto Activo */}
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Producto Activo
                </FormLabel>
                <p className="text-sm text-muted-foreground">
                  Desactivar para ocultar el producto del sistema
                </p>
              </div>
            </FormItem>
          )}
        />

        {/* Botones */}
        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </Form>
  );
}