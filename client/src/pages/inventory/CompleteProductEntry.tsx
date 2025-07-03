import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Package, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CompleteProductEntryForm from "@/components/forms/CompleteProductEntryForm";
import { useToast } from "@/hooks/use-toast";

export default function CompleteProductEntry() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleSuccess = () => {
    setIsDialogOpen(false);
    toast({
      title: "¡Ingreso exitoso!",
      description: "El producto ha sido ingresado al inventario correctamente.",
    });
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Ingreso Completo de Productos</h1>
          <p className="text-muted-foreground">
            Sistema avanzado de ingreso con todas las opciones de productos disponibles
          </p>
        </div>
      </div>

      {/* Información del sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Sistema de Ingreso Completo
          </CardTitle>
          <CardDescription>
            Este formulario permite el ingreso completo de productos con todas las opciones disponibles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Características principales */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Características Principales:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Escaneo de códigos de barras integrado</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Selección de productos existentes</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Creación de productos nuevos con todas las opciones</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Configuración completa de categorías, marcas y unidades</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Gestión de garantías y números de serie</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Control de precios y stock mínimo</span>
                </li>
              </ul>
            </div>

            {/* Opciones de productos incluidas */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Opciones de Productos Incluidas:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span><strong>Información básica:</strong> Nombre, SKU, código de barras, descripción</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span><strong>Categorización:</strong> Unidad de medida, categoría, marca</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span><strong>Tipo de producto:</strong> Tangible o intangible</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span><strong>Números de serie:</strong> Activar/desactivar seguimiento</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span><strong>Garantía:</strong> Configurar con meses específicos</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span><strong>Control de stock:</strong> Stock mínimo</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span><strong>Estado:</strong> Producto activo/inactivo</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span><strong>Precios:</strong> Precio inicial en CLP</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Botón de acceso */}
          <div className="mt-6 pt-6 border-t">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="w-full md:w-auto">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Iniciar Ingreso Completo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Formulario de Ingreso Completo</DialogTitle>
                </DialogHeader>
                <CompleteProductEntryForm
                  onSuccess={handleSuccess}
                  onCancel={handleCancel}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Información adicional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Centro de costo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Centros de Costo Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="font-medium">CC252130</span>
                <span className="text-muted-foreground">Centro Principal</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="font-medium">CC252131</span>
                <span className="text-muted-foreground">Centro Secundario</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="font-medium">CC252132</span>
                <span className="text-muted-foreground">Centro de Apoyo</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="font-medium">CC252133</span>
                <span className="text-muted-foreground">Centro Especial</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Destino automático */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuración de Destino</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-semibold">Bodega Destino:</span>
                </div>
                <p className="text-green-700">PRINCIPAL</p>
                <p className="text-xs text-green-600 mt-1">
                  Todos los ingresos se registran automáticamente en la bodega principal
                </p>
              </div>
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="font-semibold">Ubicación:</span>
                </div>
                <p className="text-blue-700">Configurable por usuario</p>
                <p className="text-xs text-blue-600 mt-1">
                  Puede especificar una ubicación específica dentro de la bodega
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}