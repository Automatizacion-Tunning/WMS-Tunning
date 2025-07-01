import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Bell, Plus } from "lucide-react";
import { useState } from "react";
import SimpleProductForm from "@/components/forms/SimpleProductForm";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

const pageNames: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Resumen general del inventario" },
  "/warehouses": { title: "Bodegas", subtitle: "Administración de bodegas" },
  "/products": { title: "Productos", subtitle: "Gestión de productos" },
  "/products/movements": { title: "Movimientos", subtitle: "Alta y baja de productos" },
  "/users": { title: "Usuarios", subtitle: "Gestión de usuarios" },
  "/users/permissions": { title: "Permisos", subtitle: "Control de permisos" },
};

export default function Header() {
  const [location] = useLocation();
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  
  const pageInfo = pageNames[location] || { title: "Página", subtitle: "" };

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{pageInfo.title}</h2>
          {pageInfo.subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{pageInfo.subtitle}</p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <SimpleProductForm onSuccess={() => setIsProductModalOpen(false)} />
            </DialogContent>
          </Dialog>
          
          <div className="relative">
            <Button variant="outline" size="icon" className="w-8 h-8">
              <Bell className="w-4 h-4" />
            </Button>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></div>
          </div>
        </div>
      </div>
    </header>
  );
}
