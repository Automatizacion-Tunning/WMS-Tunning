import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import WarehouseManagement from "@/pages/warehouses/WarehouseManagement";
import WarehouseDetails from "@/pages/warehouses/WarehouseDetails";
import CostCenterManagement from "@/pages/warehouses/CostCenterManagement";
import ProductDetails from "@/pages/products/ProductDetails";
import ProductMovements from "@/pages/products/ProductMovements";
import ProductManagement from "@/pages/products/ProductManagement";
import UserList from "@/pages/users/UserList";
import UserPermissions from "@/pages/users/UserPermissions";
import StockEntry from "@/pages/inventory/StockEntry";
import TransferOrders from "@/pages/orders/TransferOrders";
import TestBarcode from "@/pages/TestBarcode";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/warehouses" component={WarehouseManagement} />
        <Route path="/warehouses/:id" component={WarehouseDetails} />
        <Route path="/cost-centers" component={CostCenterManagement} />
        <Route path="/products" component={ProductDetails} />
        <Route path="/products/management" component={ProductManagement} />
        <Route path="/products/movements" component={ProductMovements} />
        <Route path="/inventory/stock-entry" component={StockEntry} />
        <Route path="/orders/transfer-orders" component={TransferOrders} />
        <Route path="/users" component={UserList} />
        <Route path="/users/permissions" component={UserPermissions} />
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
