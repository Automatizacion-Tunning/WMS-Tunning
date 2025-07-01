import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Clock, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import SimpleProductForm from "@/components/forms/SimpleProductForm";
import { type ProductWithCurrentPrice } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function ProductManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithCurrentPrice | null>(null);

  const { data: products = [], isLoading } = useQuery<ProductWithCurrentPrice[]>({
    queryKey: ["/api/products"],
  });



  const formatPrice = (price: string | undefined) => {
    if (!price) return "Sin precio";
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(Number(price));
  };

  const getProductTypeLabel = (type: string) => {
    return type === "tangible" ? "Tangible" : "Intangible";
  };

  const getProductTypeBadge = (type: string) => {
    return type === "tangible" ? "default" : "secondary";
  };

  const handleCreateProduct = () => {
    setIsCreateDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestión de Productos</h1>
            <p className="text-muted-foreground">Administre el catálogo de productos y precios mensuales</p>
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Productos</h1>
          <p className="text-muted-foreground">
            Administre el catálogo de productos con precios mensuales y números de serie
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Producto</DialogTitle>
              <DialogDescription>
                Complete la información del producto y establezca el precio inicial
              </DialogDescription>
            </DialogHeader>
            <SimpleProductForm 
              onSuccess={handleCreateProduct}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {products.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Package className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay productos</h3>
              <p className="text-muted-foreground text-center mb-4">
                Comience creando su primer producto en el sistema
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Primer Producto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {product.sku}
                        </Badge>
                        <Badge variant={getProductTypeBadge(product.productType)}>
                          {getProductTypeLabel(product.productType)}
                        </Badge>
                        {product.requiresSerial && (
                          <Badge variant="secondary">
                            Requiere Serial
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Clock className="w-4 h-4 mr-2" />
                        Historial
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Descripción</p>
                      <p className="text-sm">{product.description || "Sin descripción"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Precio Actual</p>
                      <p className="text-lg font-semibold text-green-600">
                        {formatPrice(product.currentPrice?.price)}
                      </p>
                      {product.currentPrice && (
                        <p className="text-xs text-muted-foreground">
                          {new Date().toLocaleDateString('es-CL', { 
                            year: 'numeric', 
                            month: 'long' 
                          })}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Stock Mínimo</p>
                      <p className="text-sm">{product.minStock} unidades</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}