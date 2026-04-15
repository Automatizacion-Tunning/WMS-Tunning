import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Login from "@/pages/auth/Login";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import WarehouseManagement from "@/pages/warehouses/WarehouseManagement";
import WarehouseDetails from "@/pages/warehouses/WarehouseDetails";
import CostCenterManagement from "@/pages/warehouses/CostCenterManagement";
import TraceabilityView from "@/pages/warehouses/TraceabilityView";
import ProductMovements from "@/pages/products/ProductMovements";
import ProductManagement from "@/pages/products/ProductManagement";
import UserManagement from "@/pages/users/UserManagement";
import RolesManagement from "@/pages/admin/RolesManagement";
import StockEntry from "@/pages/inventory/StockEntry";
import TransferOrders from "@/pages/orders/TransferOrders";
import PurchaseOrders from "@/pages/orders/PurchaseOrders";
import TestBarcode from "@/pages/TestBarcode";
import DispatchPage from "@/pages/dispatch/DispatchPage";
import ProductDetail from "@/pages/products/ProductDetail";

function Router() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [location, navigate] = useLocation();

  // Guardar la URL intentada antes del login para redirigir después
  const intendedPath = !isAuthenticated && location !== "/" ? location : "/";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={(user) => { login(user); navigate(intendedPath); }} />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/warehouses" component={WarehouseManagement} />
        <Route path="/cost-centers" component={CostCenterManagement} />
        <Route path="/traceability" component={TraceabilityView} />
        <Route path="/products" component={ProductManagement} />
        <Route path="/products/management" component={ProductManagement} />
        <Route path="/products/movements" component={ProductMovements} />
        <Route path="/inventory/stock-entry" component={StockEntry} />
        <Route path="/orders/purchase-order" component={PurchaseOrders} />
        <Route path="/orders/transfer-orders" component={TransferOrders} />
        <Route path="/users" component={UserManagement} />
        <Route path="/roles" component={RolesManagement} />
        <Route path="/despacho" component={DispatchPage} />
        <Route path="/producto/:id" component={ProductDetail} />
        <Route path="/test-barcode" component={TestBarcode} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
