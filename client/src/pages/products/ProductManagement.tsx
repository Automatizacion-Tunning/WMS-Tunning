import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Package, Tags, Award, Ruler, Clock, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import SimpleProductForm from "@/components/forms/SimpleProductForm";
import EditProductForm from "@/components/forms/EditProductForm";
import CategoryManagement from "./CategoryManagement";
import BrandManagement from "./BrandManagement";
import UnitManagement from "./UnitManagement";
import { type ProductWithCurrentPrice } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function ProductManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
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

  const handleEditProduct = (product: ProductWithCurrentPrice) => {
    setSelectedProduct(product);
    setIsEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setSelectedProduct(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Productos</h1>
          <p className="text-muted-foreground">
            Sistema completo de administración de productos, categorías, marcas y unidades
          </p>
        </div>
      </div>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Productos
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Tags className="h-4 w-4" />
            Categorías
          </TabsTrigger>
          <TabsTrigger value="brands" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Marcas
          </TabsTrigger>
          <TabsTrigger value="units" className="flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            Unidades
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Lista de Productos</h2>
              <p className="text-muted-foreground">
                Administre el catálogo de productos y precios mensuales
              </p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Producto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Producto</DialogTitle>
                  <DialogDescription>
                    Complete los detalles del nuevo producto. Todos los campos marcados con * son obligatorios.
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[calc(85vh-120px)] pr-4">
                  <SimpleProductForm onSuccess={handleCreateProduct} />
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-lg"></div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              {products.map((product) => (
                <Card key={product.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {product.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <strong>SKU:</strong> {product.sku || "Sin SKU"}
                        </span>
                        {product.barcode && (
                          <span className="flex items-center gap-1">
                            <strong>Código:</strong> {product.barcode}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getProductTypeBadge(product.productType || "tangible") as any}>
                        {getProductTypeLabel(product.productType || "tangible")}
                      </Badge>
                      {product.requiresSerial && (
                        <Badge variant="outline">Requiere N° Serie</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          {product.description || "Sin descripción"}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <strong>Precio Actual:</strong> {formatPrice(product.currentPrice?.price)}
                          </span>
                          <span className="flex items-center gap-1">
                            <strong>Stock Min/Max:</strong> {product.minStock || 0}/{product.maxStock || 0}
                          </span>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditProduct(product)}
                      >
                        Editar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories">
          <CategoryManagement />
        </TabsContent>

        <TabsContent value="brands">
          <BrandManagement />
        </TabsContent>

        <TabsContent value="units">
          <UnitManagement />
        </TabsContent>
      </Tabs>

      {/* Diálogo de Edición */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Editar Producto</DialogTitle>
            <DialogDescription>
              Modifique los detalles del producto. Todos los campos marcados con * son obligatorios.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(85vh-120px)] pr-4">
            {selectedProduct && (
              <EditProductForm 
                product={selectedProduct}
                onSuccess={handleEditSuccess}
                onCancel={() => setIsEditDialogOpen(false)}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}