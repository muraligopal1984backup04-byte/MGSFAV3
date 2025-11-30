import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import Layout from './components/shared/Layout';
import Dashboard from './components/shared/Dashboard';
import AdminPanel from './components/admin/AdminPanel';
import CustomerList from './components/crm/CustomerList';
import ProductList from './components/products/ProductList';
import OrderList from './components/orders/OrderList';
import InvoiceList from './components/invoices/InvoiceList';
import InvoiceUpload from './components/invoices/InvoiceUpload';
import CollectionList from './components/collections/CollectionList';
import RouteMaster from './components/routes/RouteMaster';
import RouteCustomerMapping from './components/routes/RouteCustomerMapping';
import RouteUserMapping from './components/routes/RouteUserMapping';
import ReportsDashboard from './components/reports/ReportsDashboard';
import SaleOrderReport from './components/reports/SaleOrderReport';
import AgeWiseOutstanding from './components/reports/AgeWiseOutstanding';
import DailyStockUpload from './components/inventory/DailyStockUpload';
import DailyStockReport from './components/inventory/DailyStockReport';
import SalesInvoiceReport from './components/reports/SalesInvoiceReport';
import RouteWiseSales from './components/reports/RouteWiseSales';
import FieldStaffSales from './components/reports/FieldStaffSales';
import BrandWiseInsights from './components/reports/BrandWiseInsights';
import CustomerPurchasePattern from './components/reports/CustomerPurchasePattern';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth();

  if (!user || !isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <CustomerList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <ProductList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <OrderList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices"
        element={
          <ProtectedRoute>
            <InvoiceList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoice-upload"
        element={
          <ProtectedRoute>
            <InvoiceUpload />
          </ProtectedRoute>
        }
      />
      <Route
        path="/collections"
        element={
          <ProtectedRoute>
            <CollectionList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/routes"
        element={
          <ProtectedRoute>
            <RouteMaster />
          </ProtectedRoute>
        }
      />
      <Route
        path="/route-customer-mapping"
        element={
          <ProtectedRoute>
            <RouteCustomerMapping />
          </ProtectedRoute>
        }
      />
      <Route
        path="/route-user-mapping"
        element={
          <ProtectedRoute>
            <RouteUserMapping />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sale-order-report"
        element={
          <ProtectedRoute>
            <SaleOrderReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/age-wise-outstanding"
        element={
          <ProtectedRoute>
            <AgeWiseOutstanding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/daily-stock-upload"
        element={
          <ProtectedRoute>
            <DailyStockUpload />
          </ProtectedRoute>
        }
      />
      <Route
        path="/daily-stock-report"
        element={
          <ProtectedRoute>
            <DailyStockReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales-invoice-report"
        element={
          <ProtectedRoute>
            <SalesInvoiceReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/route-wise-sales"
        element={
          <ProtectedRoute>
            <RouteWiseSales />
          </ProtectedRoute>
        }
      />
      <Route
        path="/field-staff-sales"
        element={
          <ProtectedRoute>
            <FieldStaffSales />
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand-wise-insights"
        element={
          <ProtectedRoute>
            <BrandWiseInsights />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer-purchase-pattern"
        element={
          <ProtectedRoute>
            <CustomerPurchasePattern />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPanel />
          </AdminRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
