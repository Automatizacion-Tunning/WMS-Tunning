import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Package, TrendingUp, AlertTriangle, Building2 } from "lucide-react";
import ProductEntryForm from "@/components/forms/ProductEntryForm";

export default function StockEntry() {
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ingreso de Productos</h1>
          <p className="text-muted-foreground">
            Gestiona el ingreso de productos por centro de costo
          </p>
        </div>
        
        <Dialog open={isEntryModalOpen} onOpenChange={setIsEntryModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Ingresar Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ingreso de Producto</DialogTitle>
            </DialogHeader>
            <ProductEntryForm onSuccess={() => setIsEntryModalOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Centro de Costo
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Requerido</div>
            <p className="text-xs text-muted-foreground">
              Se asigna automáticamente a bodega principal del centro
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Precio Aplicado
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">Por Ingreso</div>
            <p className="text-xs text-muted-foreground">
              Se captura precio específico para cada ingreso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Validación de Series
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">Obligatoria</div>
            <p className="text-xs text-muted-foreground">
              Para productos que requieren número de serie
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instrucciones de Uso</CardTitle>
          <CardDescription>
            Sigue estos pasos para ingresar stock correctamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-medium text-green-700">✓ Proceso Correcto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Selecciona o crea un centro de costo</li>
                <li>• Selecciona el producto desde el catálogo</li>
                <li>• Especifica la cantidad a ingresar</li>
                <li>• Ingresa el precio específico para este movimiento</li>
                <li>• Agrega números de serie si es requerido</li>
                <li>• El sistema crea bodegas automáticamente si no existen</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-red-700">✗ Puntos Importantes</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• El centro de costo es obligatorio</li>
                <li>• Se crean bodegas automáticamente si no existen</li>
                <li>• Los números de serie deben ser únicos</li>
                <li>• La cantidad debe ser mayor a 0</li>
                <li>• El precio es obligatorio para cada ingreso</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Política de Bodegas</CardTitle>
          <CardDescription>
            Comprende el flujo de trabajo de gestión de inventario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">1. Ingreso Inicial</h4>
              <p className="text-sm text-blue-700">
                Todo producto debe ingresar especificando un <strong>Centro de Costo</strong>. 
                El sistema asigna automáticamente la <strong>Bodega Principal</strong> del centro y crea las bodegas si no existen.
              </p>
            </div>
            
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">2. Traspaso Entre Bodegas</h4>
              <p className="text-sm text-green-700">
                Para mover stock entre bodegas, debes crear una <strong>Orden de Traspaso</strong> que requiere 
                aprobación del Jefe de Proyectos del centro de costos.
              </p>
            </div>
            
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="font-medium text-amber-800 mb-2">3. Control de Precios</h4>
              <p className="text-sm text-amber-700">
                Los precios se aplican automáticamente según el mes actual. Cada movimiento queda registrado 
                con el precio vigente en ese momento para mantener la trazabilidad.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}