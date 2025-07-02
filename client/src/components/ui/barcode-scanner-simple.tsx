import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Camera, CameraOff, X } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  description?: string;
}

export default function BarcodeScannerSimple({
  isOpen,
  onClose,
  onScan,
  title = "Escanear Código de Barras",
  description = "Apunta la cámara hacia el código de barras del producto"
}: BarcodeScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsScanning(true);
      
      // Crear el escáner
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          defaultZoomValueIfSupported: 2,
        },
        false
      );

      scannerRef.current = scanner;

      // Iniciar el escáner
      scanner.render(
        (decodedText, decodedResult) => {
          console.log('✅ Código detectado:', decodedText);
          
          // Detener el escáner
          scanner.clear();
          scannerRef.current = null;
          
          // Llamar al callback con el código
          onScan(decodedText);
        },
        (errorMessage) => {
          // Error silencioso - normal durante el escaneo
          if (!errorMessage.includes("NotFoundException")) {
            console.warn('Error de escaneo:', errorMessage);
          }
        }
      );
    }

    return () => {
      // Limpiar al cerrar
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [isOpen, onScan]);

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
    onClose();
  };

  const handleManualInput = () => {
    const input = prompt("Ingrese el código de barras manualmente:");
    if (input && input.trim()) {
      onScan(input.trim());
      handleClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div id="qr-reader" className="w-full"></div>
          
          {error && (
            <div className="text-center p-4 space-y-4">
              <CameraOff className="w-12 h-12 mx-auto text-destructive" />
              <div>
                <p className="text-sm text-destructive">{error}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Puede usar la entrada manual como alternativa.
                </p>
              </div>
            </div>
          )}
          
          <div className="text-center">
            <Button onClick={handleManualInput} variant="outline" size="sm">
              Ingresar Código Manualmente
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}