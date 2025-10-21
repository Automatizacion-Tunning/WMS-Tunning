import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Package, TrendingUp, AlertTriangle, Building2, Scan } from "lucide-react";
import SimpleProductEntryForm from "@/components/forms/SimpleProductEntryForm";

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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ingreso de Producto</DialogTitle>
            </DialogHeader>
            <SimpleProductEntryForm onSuccess={() => setIsEntryModalOpen(false)} />
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
        <CardHeader className="flex flex-row items-center gap-2">
          <Scan className="w-5 h-5 text-blue-600" />
          <div>
            <CardTitle>¿Cómo usar el botón "📱 Código"?</CardTitle>
            <CardDescription>
              Instructivo paso a paso del escáner de códigos de barras
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="font-medium text-purple-800 mb-3 flex items-center gap-2">
                <span className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                Presiona el botón "📱 Código"
              </h4>
              <p className="text-sm text-purple-700">
                Al hacer clic, se abrirá la cámara de tu dispositivo para escanear códigos de barras.
                Asegúrate de permitir el acceso a la cámara cuando el navegador lo solicite.
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                Escanea el código de barras del producto
              </h4>
              <p className="text-sm text-blue-700 mb-2">
                Apunta la cámara hacia el código de barras y espera a que se detecte automáticamente.
                El sistema buscará el producto en la base de datos.
              </p>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-3 flex items-center gap-2">
                <span className="bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                Si el producto existe
              </h4>
              <p className="text-sm text-green-700">
                El producto se seleccionará automáticamente en el formulario y podrás ver toda su información 
                (SKU, tipo, si requiere serie, etc.). Solo completa la cantidad y precio para continuar.
              </p>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="font-medium text-amber-800 mb-3 flex items-center gap-2">
                <span className="bg-amber-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
                Si el producto NO existe
              </h4>
              <p className="text-sm text-amber-700 mb-2">
                Aparecerá un mensaje con dos opciones:
              </p>
              <ul className="space-y-2 text-sm text-amber-700 ml-4">
                <li><strong>• Crear Producto Nuevo:</strong> Se abrirá un formulario completo para registrar el nuevo producto con el código escaneado.</li>
                <li><strong>• Asociar a Producto Existente:</strong> Si el producto ya existe pero no tiene código de barras, podrás buscarlo y asociarle el código escaneado.</li>
              </ul>
            </div>

            <div className="p-4 bg-gray-100 border border-gray-300 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">💡 Consejos útiles</h4>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• Mantén buena iluminación para un escaneo más rápido</li>
                <li>• Si la cámara no abre, verifica los permisos del navegador</li>
                <li>• Puedes cancelar el escaneo en cualquier momento presionando "Cancelar"</li>
                <li>• Los códigos escaneados se guardan automáticamente en el producto</li>
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
              <p className="text-sm text-blue-700 mb-2">
                Al ingresar un producto nuevo, debes seleccionar un <strong>Centro de Costo</strong> (PRINCIPAL, UM2, PLATAFORMA, PEM o INTEGRADOR).
              </p>
              <p className="text-sm text-blue-700">
                El producto se guardará automáticamente en la <strong>Bodega Principal</strong> de ese centro. 
                Si es la primera vez que usas ese centro de costo, el sistema creará automáticamente la bodega principal 
                y sus 4 sub-bodegas (UM2, Plataforma, PEM, Integrador).
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