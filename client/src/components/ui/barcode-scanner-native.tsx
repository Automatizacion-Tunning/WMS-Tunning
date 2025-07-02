import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Camera, CameraOff, X } from "lucide-react";
import { BrowserMultiFormatReader } from '@zxing/library';

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
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [scanningDevice, setScanningDevice] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setScanningDevice(null);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      console.log('🎥 Iniciando cámara...');
      
      // Limpiar cualquier instancia previa
      if (readerRef.current) {
        readerRef.current.reset();
      }
      
      // Verificar soporte del navegador
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Su navegador no soporta el acceso a la cámara');
      }

      // Solicitar acceso a la cámara primero
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Preferir cámara trasera
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 }
        } 
      });
      
      streamRef.current = stream;
      
      // Asignar el stream al video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      console.log('✅ Cámara iniciada correctamente');
      
      // Inicializar el lector ZXing
      const codeReader = new BrowserMultiFormatReader();
      readerRef.current = codeReader;

      // Iniciar el escaneo continuo desde el video element
      await codeReader.decodeFromVideoElement(
        videoRef.current!,
        (result, err) => {
          if (result) {
            // Código detectado exitosamente
            const detectedCode = result.getText();
            console.log('✅ Código detectado:', detectedCode);
            
            if (detectedCode && detectedCode.trim()) {
              // Llamar onScan con el código detectado
              onScan(detectedCode.trim());
              
              // Detener la cámara después de detectar el código
              stopCamera();
            }
          }
          if (err && !(err.name === 'NotFoundException')) {
            // Solo mostrar errores que no sean "código no encontrado"
            console.warn('Error de escaneo:', err);
          }
        }
      );

      setIsScanning(true);
      setHasCamera(true);
      
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setHasCamera(false);
      
      if (err.name === 'NotAllowedError') {
        setError("Acceso a la cámara denegado. Por favor, permita el acceso a la cámara en su navegador.");
      } else if (err.name === 'NotFoundError') {
        setError("No se encontró ninguna cámara en el dispositivo.");
      } else if (err.name === 'NotSupportedError') {
        setError("El navegador no soporta el acceso a la cámara.");
      } else if (err.message?.includes('no soporta')) {
        setError("Su navegador no soporta el acceso a la cámara.");
      } else {
        setError(`Error al acceder a la cámara: ${err.message || 'Error desconocido'}`);
      }
    }
  }, [onScan, stopCamera]);



  // Verificar soporte de cámara
  useEffect(() => {
    const checkCameraSupport = async () => {
      try {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setHasCamera(false);
          setError("Su navegador no soporta el acceso a la cámara.");
          return;
        }

        // Verificar permisos de cámara
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (videoDevices.length === 0) {
          setHasCamera(false);
          setError("No se encontró ninguna cámara en el dispositivo.");
        } else {
          setHasCamera(true);
        }
      } catch (err) {
        console.error('Error verificando soporte de cámara:', err);
        setHasCamera(false);
        setError("Error al verificar el acceso a la cámara.");
      }
    };

    checkCameraSupport();
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