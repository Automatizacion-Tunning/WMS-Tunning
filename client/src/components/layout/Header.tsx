import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Bell, Sun, Moon } from "lucide-react";
import { MobileSidebarTrigger } from "./Sidebar";
import { useTheme } from "@/hooks/useTheme";

const pageNames: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Resumen general del inventario" },
  "/warehouses": { title: "Gestión de Bodegas", subtitle: "Bodegas con productos por centro de costo" },
  "/products": { title: "Productos", subtitle: "Gestión de productos" },
  "/products/movements": { title: "Traspaso de Bodega", subtitle: "Mover productos entre bodegas" },
  "/inventory/stock-entry": { title: "Ingreso de Productos", subtitle: "Gestión de productos por centro de costo" },
  "/users": { title: "Usuarios", subtitle: "Gestión de usuarios" },
  "/users/permissions": { title: "Permisos", subtitle: "Control de permisos" },
  "/cost-centers": { title: "Centros de Costo", subtitle: "Gestión de centros de costo" },
  "/orders/purchase-order": { title: "Órdenes de Compra", subtitle: "Recepción de productos por OC" },
  "/orders/transfer-orders": { title: "Órdenes de Traspaso", subtitle: "Gestión de traspasos entre bodegas" },
  "/roles": { title: "Roles y Permisos", subtitle: "Gestión de roles del sistema" },
  "/traceability": { title: "Trazabilidad", subtitle: "CC → Bodegas → Productos → OC + Series" },
  "/products/management": { title: "Gestión de Productos", subtitle: "Administración del catálogo" },
};

export default function Header() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

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
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            className="w-8 h-8"
            onClick={toggleTheme}
            title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
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
