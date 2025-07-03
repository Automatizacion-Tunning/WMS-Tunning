import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Package, Barcode } from "lucide-react";
import { productFormSchema, Product, type Unit, type Category, type Brand } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

type ProductFormData = z.infer<typeof productFormSchema>;

interface NewProductWithBarcodeFormProps {
  isOpen: boolean;
  onClose: () => void;
  barcode: string;
  onSuccess: (product: Product) => void;
}

export default function NewProductWithBarcodeForm({
  isOpen,
  onClose,
  barcode,
  onSuccess
}: NewProductWithBarcodeFormProps) {
  const { toast } = useToast();

  // Cargar datos necesarios para los selectores
  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      sku: "",
      barcode: barcode, // Pre-llenar con el código escaneado
      productType: "tangible",
      requiresSerial: false,
      isActive: true,
      unitId: 0,
      categoryId: 0,
      brandId: 0,
      hasWarranty: false,
      warrantyMonths: 0,
      currentPrice: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const response = await fetch("/api/products", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al crear producto');
      }
      
      return response.json();
    },
    onSuccess: (product) => {
      toast({
        title: "Producto creado exitosamente",
        description: `${product.name} ha sido creado con código ${barcode}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      onSuccess(product);
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear producto",
        description: error.message || "No se pudo crear el producto",
        variant: "destructive",
      });
    }
  });

  const onSubmit = async (data: ProductFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Crear nuevo producto
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Código de barras (solo lectura) */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Barcode className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm text-muted-foreground">
                Código de barras (escaneado)
              </Label>
            </div>
            <p className="font-mono font-semibold text-lg">{barcode}</p>
          </div>

          <Separator />

          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="font-medium">Información del producto</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Nombre del producto"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  {...form.register("sku")}
                  placeholder="Código SKU único"
                />
                {form.formState.errors.sku && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.sku.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Descripción detallada del producto"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productType">Tipo de producto</Label>
                <Select
                  value={form.watch("productType")}
                  onValueChange={(value) => form.setValue("productType", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tangible">Tangible</SelectItem>
                    <SelectItem value="intangible">Intangible</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentPrice">Precio actual (CLP) *</Label>
                <Input
                  id="currentPrice"
                  type="number"
                  {...form.register("currentPrice", { valueAsNumber: true })}
                  placeholder="0"
                />
                {form.formState.errors.currentPrice && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.currentPrice.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Categoría *</Label>
                <Select
                  value={form.watch("categoryId")?.toString()}
                  onValueChange={(value) => form.setValue("categoryId", parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.categoryId && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.categoryId.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="brandId">Marca *</Label>
                <Select
                  value={form.watch("brandId")?.toString()}
                  onValueChange={(value) => form.setValue("brandId", parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar marca" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id.toString()}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.brandId && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.brandId.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitId">Unidad de medida *</Label>
                <Select
                  value={form.watch("unitId")?.toString()}
                  onValueChange={(value) => form.setValue("unitId", parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id.toString()}>
                        {unit.name} ({unit.abbreviation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.unitId && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.unitId.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="hasWarranty"
                  checked={form.watch("hasWarranty")}
                  onCheckedChange={(checked) => form.setValue("hasWarranty", checked)}
                />
                <Label htmlFor="hasWarranty">Tiene garantía</Label>
              </div>

              {form.watch("hasWarranty") && (
                <div className="space-y-2">
                  <Label htmlFor="warrantyMonths">Meses de garantía</Label>
                  <Input
                    id="warrantyMonths"
                    type="number"
                    {...form.register("warrantyMonths", { valueAsNumber: true })}
                    placeholder="12"
                  />
                  {form.formState.errors.warrantyMonths && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.warrantyMonths.message}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="requiresSerial"
                checked={form.watch("requiresSerial")}
                onCheckedChange={(checked) => form.setValue("requiresSerial", checked)}
              />
              <Label htmlFor="requiresSerial">Requiere número de serie</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={form.watch("isActive")}
                onCheckedChange={(checked) => form.setValue("isActive", checked)}
              />
              <Label htmlFor="isActive">Producto activo</Label>
            </div>
          </div>

          <Separator />

          {/* Botones */}
          <div className="flex gap-2">
            <Button 
              type="button"
              variant="outline" 
              onClick={onClose}
              className="flex-1"
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              className="flex-1"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creando..." : "Crear producto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}