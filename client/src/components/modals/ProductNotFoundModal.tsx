import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Package, Link2, Scan } from "lucide-react";
import { Product } from "@shared/schema";

interface ProductNotFoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  barcode: string;
  onCreateNew: (barcode: string) => void;
  onAssociateExisting: (barcode: string) => void;
}

export default function ProductNotFoundModal({
  isOpen,
  onClose,
  barcode,
  onCreateNew,
  onAssociateExisting
}: ProductNotFoundModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5" />
            Producto no encontrado
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Código escaneado:</p>
            <p className="font-mono font-semibold text-lg">{barcode}</p>
          </div>
          
          <p className="text-sm text-muted-foreground">
            No se encontró ningún producto con este código de barras. 
            ¿Qué desea hacer?
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={() => onCreateNew(barcode)}
              className="w-full justify-start gap-3 h-auto p-4"
              variant="outline"
            >
              <div className="bg-primary/10 p-2 rounded-md">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <div className="font-medium">Crear nuevo producto</div>
                <div className="text-xs text-muted-foreground">
                  Abrir formulario con el código pre-llenado
                </div>
              </div>
            </Button>
            
            <Button 
              onClick={() => onAssociateExisting(barcode)}
              className="w-full justify-start gap-3 h-auto p-4"
              variant="outline"
            >
              <div className="bg-secondary/10 p-2 rounded-md">
                <Link2 className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div className="text-left">
                <div className="font-medium">Asociar a producto existente</div>
                <div className="text-xs text-muted-foreground">
                  Vincular código a un producto sin barcode
                </div>
              </div>
            </Button>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}