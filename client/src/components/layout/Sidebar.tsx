import { Link, useLocation } from "wouter";
import {
  ChartPie,
  Settings,
  FileText,
  PlusCircle,
  Users,
  Shield,
  Warehouse,
  User,
  LogOut,
  Building2,
  Package,
  ArrowUpCircle,
  RefreshCcw,
  Menu,
  ShieldAlert,
  GitBranch,
  Truck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

interface NavItem {
  name: string;
  href: string;
  icon: any;
}

// Contenido del sidebar (compartido entre desktop y móvil)
function SidebarContent() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { can, canAny, isAdmin, roleName, isLoading: permissionsLoading } = usePermissions();

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  const handleLogout = async () => {
    await logout();
  };

  // Determinar si el usuario no tiene permisos
  const hasNoPermissions = !permissionsLoading && !canAny([
    "dashboard.view", "warehouses.view", "products.view", "inventory.view",
    "orders.view_purchase", "orders.view_transfers", "users.view", "roles.view"
  ]);

  // Construir navegacion filtrada por permisos
  const dashboardNav: NavItem[] = can("dashboard.view") ? [
    { name: "Dashboard", href: "/", icon: ChartPie },
  ] : [];

  const warehouseNav: NavItem[] = [];
  if (can("cost_centers.view")) warehouseNav.push({ name: "Centros de Costos", href: "/cost-centers", icon: Building2 });
  if (can("warehouses.view")) warehouseNav.push({ name: "Administración", href: "/warehouses", icon: Settings });
  if (canAny(["warehouses.view", "inventory.view"])) warehouseNav.push({ name: "Trazabilidad", href: "/traceability", icon: GitBranch });

  const productNav: NavItem[] = [];
  if (can("products.view")) productNav.push({ name: "Gestión", href: "/products", icon: Package });
  if (can("products.view")) productNav.push({ name: "Traspaso de Bodega", href: "/products/movements", icon: PlusCircle });

  const inventoryNav: NavItem[] = [];
  if (can("inventory.entry")) inventoryNav.push({ name: "Ingreso de Productos", href: "/inventory/stock-entry", icon: ArrowUpCircle });
  if (isAdmin) inventoryNav.push({ name: "Despacho", href: "/despacho", icon: Truck });

  const ordersNav: NavItem[] = [];
  if (canAny(["orders.view_purchase", "orders.entry_oc"])) ordersNav.push({ name: "Ingreso Orden de Compra", href: "/orders/purchase-order", icon: FileText });
  if (canAny(["orders.view_transfers", "orders.create_transfers"])) ordersNav.push({ name: "Órdenes de Traspaso", href: "/orders/transfer-orders", icon: RefreshCcw });

  const adminNav: NavItem[] = [];
  if (canAny(["users.view", "users.manage"])) adminNav.push({ name: "Gestión de Usuarios", href: "/users", icon: Users });
  if (canAny(["roles.view", "roles.manage"])) adminNav.push({ name: "Gestión de Roles", href: "/roles", icon: Shield });

  const renderSection = (title: string, items: NavItem[], extraPt = true) => {
    if (items.length === 0) return null;
    return (
      <div className={cn("space-y-1", extraPt && "pt-6")}>
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </div>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href}>
              <div className={cn(
                "sidebar-item",
                isActive(item.href) && "sidebar-item-active"
              )}>
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Logo Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <Warehouse className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">WMS TUNNING</h1>
            <p className="text-xs text-muted-foreground">Control de Inventario</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {hasNoPermissions ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <ShieldAlert className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Sin permisos asignados</p>
            <p className="text-xs text-muted-foreground mt-1">
              Contacte al administrador para obtener acceso al sistema.
            </p>
          </div>
        ) : (
          <>
            {/* Dashboard */}
            {dashboardNav.length > 0 && (
              <div className="mb-6">
                {dashboardNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.name} href={item.href}>
                      <div className={cn(
                        "sidebar-item",
                        isActive(item.href) && "sidebar-item-active"
                      )}>
                        <Icon className="w-5 h-5 mr-3" />
                        {item.name}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {renderSection("Bodegas", warehouseNav, false)}
            {renderSection("Productos", productNav)}
            {renderSection("Inventario", inventoryNav)}
            {renderSection("Órdenes", ordersNav)}
            {renderSection("Administración", adminNav)}
          </>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.username || 'Usuario'}
            </p>
            <p className="text-xs text-muted-foreground">
              {roleName || 'Sin rol'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-sidebar-foreground transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Botón para móvil
export function MobileSidebarTrigger() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <SidebarContent />
      </SheetContent>
    </Sheet>
  );
}

// Sidebar principal para desktop
export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-60 bg-sidebar border-r border-sidebar-border">
      <SidebarContent />
    </aside>
  );
}
