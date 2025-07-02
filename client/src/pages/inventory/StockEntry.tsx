import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Package, TrendingUp, AlertTriangle } from "lucide-react";
import StockEntryForm from "@/components/forms/StockEntryForm";

export default function StockEntry() {
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ingreso de Stock</h1>
          <p className="text-muted-foreground">
            Gestiona el ingreso inicial de productos a la bodega principal
          </p>
        </div>
        
        <Dialog open={isEntryModalOpen} onOpenChange={setIsEntryModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Ingresar Stock
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ingreso de Stock Inicial</DialogTitle>
            </DialogHeader>
            <StockEntryForm onSuccess={() => setIsEntryModalOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Proceso de Ingreso
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Automatizado</div>
            <p className="text-xs text-muted-foreground">
              Stock se ingresa automáticamente a bodega principal
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
                <li>• Selecciona el producto desde el catálogo</li>
                <li>• Especifica la cantidad a ingresar</li>
                <li>• Agrega números de serie si es requerido</li>
                <li>• El sistema asigna automáticamente la bodega principal</li>
                <li>• Ingresa el precio específico para este movimiento</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-red-700">✗ Puntos Importantes</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• No se puede seleccionar bodega manualmente</li>
                <li>• Los números de serie deben ser únicos</li>
                <li>• La cantidad debe ser mayor a 0</li>
                <li>• Productos tangibles requieren gestión física</li>
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
                Todo producto nuevo debe ingresar primero a la <strong>Bodega Principal</strong> del centro de costos correspondiente.
                No es posible ingresar stock directamente a bodegas secundarias.
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