import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { MobileSidebarTrigger } from "./Sidebar";

const pageNames: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Resumen general del inventario" },
  "/warehouses": { title: "Gestión de Bodegas", subtitle: "Bodegas con productos por centro de costo" },
  "/products": { title: "Productos", subtitle: "Gestión de productos" },
  "/products/movements": { title: "Movimientos", subtitle: "Alta y baja de productos" },
  "/inventory/stock-entry": { title: "Ingreso de Productos", subtitle: "Gestión de productos por centro de costo" },
  "/users": { title: "Usuarios", subtitle: "Gestión de usuarios" },
  "/users/permissions": { title: "Permisos", subtitle: "Control de permisos" },
};

export default function Header() {
  const [location] = useLocation();
  
  const pageInfo = pageNames[location] || { title: "Página", subtitle: "" };

  return (
    <header className="bg-card border-b border-border px-4 md:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <MobileSidebarTrigger />
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-foreground">{pageInfo.title}</h2>
            {pageInfo.subtitle && (
              <p className="text-sm text-muted-foreground mt-1 hidden sm:block">{pageInfo.subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4">
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
