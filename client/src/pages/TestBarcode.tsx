import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BarcodeScannerNative from "@/components/ui/barcode-scanner-native";
import ProductNotFoundModal from "@/components/modals/ProductNotFoundModal";
import AssociateProductModal from "@/components/modals/AssociateProductModal";
import NewProductWithBarcodeForm from "@/components/forms/NewProductWithBarcodeForm";
import { useBarcodeFlow } from "@/hooks/useBarcodeFlow";
import { useToast } from "@/hooks/use-toast";
import { Scan, Package } from "lucide-react";
import type { Product } from "@shared/schema";

export default function TestBarcode() {
  const { toast } = useToast();
  const barcodeFlow = useBarcodeFlow();

  const handleBarcodeScanned = (barcode: string) => {
    console.log("🔍 Código escaneado:", barcode);
    barcodeFlow.handleBarcodeScanned(barcode);
  };

  const handleProductFound = (product: Product) => {
    console.log("✅ Producto encontrado:", product);
    toast({
      title: "Producto encontrado",
      description: `${product.name} - SKU: ${product.sku}`,
    });
    barcodeFlow.reset();
  };

  const handleCreateNewProduct = () => {
    console.log("📝 Crear nuevo producto con código:", barcodeFlow.barcode);
    barcodeFlow.handleCreateNew();
  };

  const handleAssociateProduct = () => {
    console.log("🔗 Asociar código a producto existente:", barcodeFlow.barcode);
    barcodeFlow.handleAssociateExisting();
  };

  const handleProductCreatedOrAssociated = (product: Product) => {
    console.log("✅ Producto creado/asociado:", product);
    handleProductFound(product);
  };

  // Auto-manejar cuando se encuentra un producto (usando useEffect para evitar setState durante render)
  useEffect(() => {
    if (barcodeFlow.state === "product-found" && barcodeFlow.product) {
      handleProductFound(barcodeFlow.product);
    }
  }, [barcodeFlow.state, barcodeFlow.product, handleProductFound]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5" />
            Prueba del Escáner de Códigos de Barras
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Esta página te permite probar el flujo completo del escáner de códigos de barras.
            </p>
            
            <Button 
              onClick={barcodeFlow.startScanning}
              className="w-full md:w-auto"
            >
              <Scan className="w-4 h-4 mr-2" />
              Escanear Código de Barras
            </Button>
          </div>

          {/* Estado actual del flujo */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Estado Actual del Flujo:</h4>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Estado:</strong> <code>{barcodeFlow.state}</code>
              </div>
              {barcodeFlow.barcode && (
                <div>
                  <strong>Código:</strong> <code className="font-mono">{barcodeFlow.barcode}</code>
                </div>
              )}
              {barcodeFlow.product && (
                <div>
                  <strong>Producto:</strong> {barcodeFlow.product.name} (SKU: {barcodeFlow.product.sku})
                </div>
              )}
              {barcodeFlow.isLoading && (
                <div className="text-blue-600">🔄 Buscando producto...</div>
              )}
              {barcodeFlow.error && (
                <div className="text-red-600">❌ Error: {barcodeFlow.error}</div>
              )}
            </div>
          </div>

          {/* Botones de prueba manual */}
          <div className="space-y-2">
            <h4 className="font-medium">Pruebas Manuales:</h4>
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleBarcodeScanned("123456789")}
              >
                Simular código existente
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleBarcodeScanned("999999999")}
              >
                Simular código no existente
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={barcodeFlow.reset}
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Escáner de códigos de barras */}
      <BarcodeScannerNative
        isOpen={barcodeFlow.state === "scanning"}
        onClose={barcodeFlow.handleCancel}
        onScan={handleBarcodeScanned}
        title="Escanear Código de Prueba"
        description="Apunta la cámara hacia cualquier código de barras para probar el flujo"
      />

      {/* Modal cuando no se encuentra el producto */}
      <ProductNotFoundModal
        isOpen={barcodeFlow.state === "product-not-found"}
        onClose={barcodeFlow.handleCancel}
        barcode={barcodeFlow.barcode || ""}
        onCreateNew={handleCreateNewProduct}
        onAssociateExisting={handleAssociateProduct}
      />

      {/* Modal para crear nuevo producto */}
      <NewProductWithBarcodeForm
        isOpen={barcodeFlow.state === "creating-new"}
        onClose={barcodeFlow.handleCancel}
        barcode={barcodeFlow.barcode || ""}
        onSuccess={handleProductCreatedOrAssociated}
      />

      {/* Modal para asociar producto existente */}
      <AssociateProductModal
        isOpen={barcodeFlow.state === "associating-existing" && !!barcodeFlow.barcode}
        onClose={barcodeFlow.handleCancel}
        barcode={barcodeFlow.barcode || ""}
        onSuccess={handleProductCreatedOrAssociated}
      />
    </div>
  );
}