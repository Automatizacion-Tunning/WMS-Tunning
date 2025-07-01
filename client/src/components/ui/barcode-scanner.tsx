import { useEffect, useRef, useState, useCallback } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Camera, CameraOff, X } from "lucide-react";

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  description?: string;
}

export default function BarcodeScanner({
  isOpen,
  onClose,
  onScan,
  title = "Escanear Código de Barras",
  description = "Apunta la cámara hacia el código de barras del producto"
}: BarcodeScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState(true);

  const handleScanSuccess = useCallback((decodedText: string) => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
    onScan(decodedText);
    onClose();
  }, [onScan, onClose]);

  const handleScanError = useCallback((errorMessage: string) => {
    // Silenciar errores menores de escaneo continuo
    if (!errorMessage.includes("No QR code found")) {
      console.warn("Scan error:", errorMessage);
    }
  }, []);

  const initializeScanner = useCallback(() => {
    if (!isOpen || scannerRef.current) return;

    try {
      const scanner = new Html5QrcodeScanner(
        "barcode-scanner-container",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE
          ],
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
        },
        false
      );

      scanner.render(handleScanSuccess, handleScanError);
      scannerRef.current = scanner;
      setIsScanning(true);
      setError(null);
    } catch (err) {
      console.error("Error initializing scanner:", err);
      setError("No se pudo acceder a la cámara. Verifique los permisos.");
      setHasCamera(false);
    }
  }, [isOpen, handleScanSuccess, handleScanError]);

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (err) {
        console.warn("Error clearing scanner:", err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setError(null);
  }, []);

  // Verificar soporte de cámara
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => setHasCamera(true))
        .catch(() => setHasCamera(false));
    } else {
      setHasCamera(false);
    }
  }, []);

  // Inicializar scanner cuando se abre el diálogo
  useEffect(() => {
    if (isOpen && hasCamera) {
      // Pequeño delay para asegurar que el DOM esté listo
      const timer = setTimeout(initializeScanner, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, hasCamera, initializeScanner]);

  // Limpiar scanner al cerrar
  useEffect(() => {
    if (!isOpen) {
      stopScanner();
    }
  }, [isOpen, stopScanner]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const handleClose = () => {
    stopScanner();
    onClose();
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
          {!hasCamera ? (
            <div className="text-center p-8 space-y-4">
              <CameraOff className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Cámara no disponible. Puede ingresar el código manualmente.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center p-8 space-y-4">
              <CameraOff className="w-12 h-12 mx-auto text-destructive" />
              <div>
                <p className="text-sm text-destructive">{error}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Asegúrese de permitir el acceso a la cámara en su navegador.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div
                id="barcode-scanner-container"
                className="w-full"
                style={{ minHeight: "300px" }}
              />
              {isScanning && (
                <p className="text-sm text-muted-foreground text-center mt-2">
                  Escaneando... Mantenga el código de barras dentro del marco.
                </p>
              )}
            </div>
          )}
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