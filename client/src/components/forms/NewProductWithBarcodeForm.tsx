import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Package, Barcode } from "lucide-react";
import { productFormSchema, Product } from "@shared/schema";
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

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      sku: "",
      barcode: barcode, // Pre-llenar con el código escaneado
      minStock: 10,
      productType: "MATERIAL",
      requiresSerial: false,
      isActive: true,
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
                    <SelectItem value="MATERIAL">Material</SelectItem>
                    <SelectItem value="HERRAMIENTA">Herramienta</SelectItem>
                    <SelectItem value="EQUIPO">Equipo</SelectItem>
                    <SelectItem value="CONSUMIBLE">Consumible</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minStock">Stock mínimo</Label>
                <Input
                  id="minStock"
                  type="number"
                  {...form.register("minStock", { valueAsNumber: true })}
                  placeholder="10"
                />
                {form.formState.errors.minStock && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.minStock.message}
                  </p>
                )}
              </div>
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