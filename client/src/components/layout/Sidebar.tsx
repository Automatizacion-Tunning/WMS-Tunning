import { Link, useLocation } from "wouter";
import { 
  ChartPie, 
  Settings, 
  FileText, 
  ClipboardList, 
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
  Menu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Dashboard", href: "/", icon: ChartPie },
];

const warehouseNavigation = [
  { name: "Centros de Costos", href: "/cost-centers", icon: Building2 },
  { name: "Administración", href: "/warehouses", icon: Settings },
];

const productNavigation = [
  { name: "Gestión", href: "/products/management", icon: Package },
  { name: "Ficha", href: "/products", icon: ClipboardList },
  { name: "Alta/Baja", href: "/products/movements", icon: PlusCircle },
];

const inventoryNavigation = [
  { name: "Ingreso de Productos", href: "/inventory/stock-entry", icon: ArrowUpCircle },
  { name: "Ingreso Completo", href: "/inventory/complete-entry", icon: PlusCircle },
];

const ordersNavigation = [
  { name: "Órdenes de Traspaso", href: "/orders/transfer-orders", icon: RefreshCcw },
];

const userNavigation = [
  { name: "Gestión de Usuarios", href: "/users", icon: Users },
];

// Contenido del sidebar (compartido entre desktop y móvil)
function SidebarContent() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  const handleLogout = async () => {
    await logout();
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
            <h1 className="text-lg font-semibold text-sidebar-foreground">WMS</h1>
            <p className="text-xs text-muted-foreground">Control de Inventario</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {/* Dashboard */}
        <div className="mb-6">
          {navigation.map((item) => {
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

        {/* Bodegas Section */}
        <div className="space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Bodegas
          </div>
          {warehouseNavigation.map((item) => {
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

        {/* Productos Section */}
        <div className="space-y-1 pt-6">
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Productos
          </div>
          {productNavigation.map((item) => {
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

        {/* Inventario Section */}
        <div className="space-y-1 pt-6">
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Inventario
          </div>
          {inventoryNavigation.map((item) => {
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

        {/* Órdenes Section */}
        <div className="space-y-1 pt-6">
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Órdenes
          </div>
          {ordersNavigation.map((item) => {
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

        {/* Usuarios Section */}
        <div className="space-y-1 pt-6">
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Usuarios
          </div>
          {userNavigation.map((item) => {
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
              {user?.role === 'admin' ? 'Administrador' : 
               user?.role === 'project_manager' ? 'Jefe de Proyecto' :
               user?.role === 'warehouse_operator' ? 'Operador' : 'Usuario'}
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