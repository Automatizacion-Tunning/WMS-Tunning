import { useEffect, useRef, useState, useCallback } from "react";
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

export default function BarcodeScannerNative({
  isOpen,
  onClose,
  onScan,
  title = "Escanear Código de Barras",
  description = "Apunta la cámara hacia el código de barras del producto"
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState(true);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      
      // Solicitar acceso a la cámara trasera si está disponible
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // Cámara trasera
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsScanning(true);
        setHasCamera(true);
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setHasCamera(false);
      
      if (err.name === 'NotAllowedError') {
        setError("Acceso a la cámara denegado. Por favor, permita el acceso a la cámara y recargue la página.");
      } else if (err.name === 'NotFoundError') {
        setError("No se encontró ninguna cámara en el dispositivo.");
      } else if (err.name === 'NotSupportedError') {
        setError("El navegador no soporta el acceso a la cámara.");
      } else {
        setError(`Error al acceder a la cámara: ${err.message || 'Error desconocido'}`);
      }
    }
  }, []);

  // Simulación básica de detección de código de barras
  // En una implementación real, usarías una librería como ZXing o QuaggaJS
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Aquí normalmente procesarías la imagen para detectar códigos de barras
    // Por ahora, simularemos con un botón manual
  }, [isScanning]);

  // Verificar soporte de cámara
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setHasCamera(true);
    } else {
      setHasCamera(false);
      setError("Su navegador no soporta el acceso a la cámara.");
    }
  }, []);

  // Iniciar cámara cuando se abre el diálogo
  useEffect(() => {
    if (isOpen && hasCamera) {
      startCamera();
    }
    return () => {
      if (!isOpen) {
        stopCamera();
      }
    };
  }, [isOpen, hasCamera, startCamera, stopCamera]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleClose = () => {
    stopCamera();
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
          {!hasCamera ? (
            <div className="text-center p-8 space-y-4">
              <CameraOff className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Cámara no disponible en este dispositivo.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Puede usar la entrada manual como alternativa.
                </p>
              </div>
              <Button onClick={handleManualInput} variant="outline">
                Ingresar Código Manualmente
              </Button>
            </div>
          ) : error ? (
            <div className="text-center p-8 space-y-4">
              <CameraOff className="w-12 h-12 mx-auto text-destructive" />
              <div>
                <p className="text-sm text-destructive">{error}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Intente recargar la página o use la entrada manual.
                </p>
              </div>
              <Button onClick={handleManualInput} variant="outline">
                Ingresar Código Manualmente
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-64 object-cover"
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                {/* Overlay para guía de escaneo */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-white border-dashed w-48 h-32 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                      Coloque el código aquí
                    </span>
                  </div>
                </div>
              </div>
              
              {isScanning && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Cámara activa. Mantenga el código de barras dentro del marco.
                  </p>
                  <div className="flex gap-2 mt-2 justify-center">
                    <Button onClick={handleManualInput} variant="outline" size="sm">
                      Ingresar Manualmente
                    </Button>
                  </div>
                </div>
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