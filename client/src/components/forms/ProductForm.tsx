import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { productFormSchema } from "@shared/schema";
import { z } from "zod";

type ProductFormData = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  onSuccess?: (data: ProductFormData) => void;
  onCancel?: () => void;
}

export default function ProductForm({ onSuccess, onCancel }: ProductFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      minStock: 0,
      productType: "tangible",
      requiresSerial: false,
      currentPrice: 0,
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const { warehouseId, initialStock, ...productData } = data;
      
      // Create product
      const productResponse = await apiRequest("POST", "/api/products", productData);
      const product = await productResponse.json();
      
      // Create initial inventory movement if stock > 0
      if (initialStock > 0) {
        await apiRequest("POST", "/api/inventory-movements", {
          productId: product.id,
          warehouseId,
          movementType: "in",
          quantity: initialStock,
          reason: "Stock inicial",
          userId: 1, // TODO: Get from auth context
        });
      }
      
      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Producto creado",
        description: "El producto se ha creado exitosamente.",
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear el producto. Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      await createProductMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Nuevo Producto</DialogTitle>
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
                  <Input placeholder="Ej. Laptop Dell XPS 13" {...field} />
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
                  <Input placeholder="Ej. LAP-DEL-001" {...field} />
                </FormControl>
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
                  <Textarea placeholder="Descripción del producto" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
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
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="warehouseId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bodega</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar bodega" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {warehouses?.map((warehouse: any) => (
                      <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                        {warehouse.name}
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
            name="initialStock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stock Inicial</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onSuccess?.()}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || warehousesLoading}
            >
              {isSubmitting ? "Creando..." : "Crear Producto"}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
