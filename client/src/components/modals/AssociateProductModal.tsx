import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2, Search, Package } from "lucide-react";
import { Product, ProductWithCurrentPrice } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AssociateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  barcode: string;
  onSuccess: (product: Product) => void;
}

export default function AssociateProductModal({
  isOpen,
  onClose,
  barcode,
  onSuccess
}: AssociateProductModalProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Debug logs para verificar el código recibido
  console.log("🔗 Modal recibió código:", barcode);
  console.log("🔗 Tipo de código:", typeof barcode);
  console.log("🔗 Longitud código:", barcode?.length);
  console.log("🔗 Código vacío?:", !barcode || barcode.trim() === "");

  // Obtener productos sin código de barras
  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ["/api/products"],
    enabled: isOpen,
  });

  // Filtrar productos sin barcode y que coincidan con la búsqueda
  const availableProducts = (allProducts as ProductWithCurrentPrice[]).filter(product => 
    !product.barcode && 
    (product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const associateMutation = useMutation({
    mutationFn: async (productId: number) => {
      console.log("🔗 Asociando código:", barcode, "a producto:", productId);
      console.log("🔍 Tipo de barcode:", typeof barcode, "valor:", barcode);
      
      // Verificar que el código no esté vacío
      if (!barcode || barcode.trim() === "") {
        throw new Error("Código de barras requerido para asociar");
      }
      
      const requestBody = { barcode: barcode.trim() };
      console.log("📤 Enviando:", requestBody);
      
      const response = await fetch(`/api/products/${productId}/barcode`, {
        method: "PUT",
        body: JSON.stringify(requestBody),
        headers: { "Content-Type": "application/json" }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al asociar código');
      }
      
      return response.json();
    },
    onSuccess: (product) => {
      toast({
        title: "Código asociado exitosamente",
        description: `El código ${barcode} ha sido asociado al producto ${product.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      onSuccess(product);
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error al asociar código",
        description: error.message || "No se pudo asociar el código de barras",
        variant: "destructive",
      });
    }
  });

  const handleAssociate = () => {
    if (!selectedProductId) {
      toast({
        title: "Seleccione un producto",
        description: "Debe seleccionar un producto para asociar el código",
        variant: "destructive",
      });
      return;
    }
    associateMutation.mutate(parseInt(selectedProductId));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Asociar código a producto existente
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Código a asociar:</p>
            <p className="font-mono font-semibold text-lg">{barcode}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="search">Buscar producto</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Buscar por nombre o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="product">Producto sin código de barras</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un producto..." />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    Cargando productos...
                  </div>
                ) : availableProducts.length === 0 ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    {searchTerm 
                      ? "No se encontraron productos que coincidan" 
                      : "No hay productos sin código de barras"
                    }
                  </div>
                ) : (
                  availableProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-muted-foreground">
                            SKU: {product.sku}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
              disabled={associateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleAssociate}
              className="flex-1"
              disabled={!selectedProductId || associateMutation.isPending}
            >
              {associateMutation.isPending ? "Asociando..." : "Asociar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}