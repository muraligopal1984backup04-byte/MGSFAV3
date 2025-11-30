import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  FileText,
  DollarSign,
  MapPin,
  Link2,
  UserCog,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  FolderOpen,
  Receipt,
  PieChart,
  ShieldCheck,
  Upload,
  Clock,
  Warehouse,
  Activity,
  Award,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

interface MenuItem {
  icon: any;
  label: string;
  path: string;
}

interface MenuGroup {
  icon: any;
  label: string;
  items: MenuItem[];
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout, isAdmin, isCustomer, isBackendUser } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>('Masters');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const masterItems: MenuItem[] = [
    { icon: Package, label: 'Products', path: '/products' },
    { icon: Users, label: 'Customers', path: '/customers' },
    { icon: MapPin, label: 'Route Master', path: '/routes' },
    { icon: Link2, label: 'Route-Customer Link', path: '/route-customer-mapping' },
    { icon: UserCog, label: 'Route-User Link', path: '/route-user-mapping' },
  ];

  const transactionItems: MenuItem[] = [
    { icon: ShoppingCart, label: 'Orders', path: '/orders' },
    { icon: FileText, label: 'Invoices', path: '/invoices' },
    { icon: Upload, label: 'Invoice Upload', path: '/invoice-upload' },
    { icon: DollarSign, label: 'Collections', path: '/collections' },
  ];

  const reportItems: MenuItem[] = [
    { icon: BarChart3, label: 'Reports Dashboard', path: '/reports' },
    { icon: FileText, label: 'Sale Order Report', path: '/sale-order-report' },
    { icon: Receipt, label: 'Sales Invoice Report', path: '/sales-invoice-report' },
    { icon: MapPin, label: 'Route-Wise Sales', path: '/route-wise-sales' },
    { icon: Users, label: 'Field Staff Sales', path: '/field-staff-sales' },
    { icon: Award, label: 'Brand-Wise Insights', path: '/brand-wise-insights' },
    { icon: Activity, label: 'Customer Purchase Pattern', path: '/customer-purchase-pattern' },
    { icon: Clock, label: 'Age-Wise Outstanding', path: '/age-wise-outstanding' },
  ];

  const inventoryItems: MenuItem[] = [
    { icon: Upload, label: 'Daily Stock Upload', path: '/daily-stock-upload' },
    { icon: Warehouse, label: 'Daily Stock Report', path: '/daily-stock-report' },
  ];

  const adminItems: MenuItem[] = [
    { icon: Settings, label: 'Admin Panel', path: '/admin' },
  ];

  let menuGroups: MenuGroup[] = [];

  if (isCustomer()) {
    menuGroups = [
      { icon: LayoutDashboard, label: 'Dashboard', items: [{ icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' }] },
      { icon: Receipt, label: 'Transactions', items: [
        { icon: ShoppingCart, label: 'Orders', path: '/orders' },
        { icon: DollarSign, label: 'Collections', path: '/collections' },
      ]},
      { icon: PieChart, label: 'Reports', items: reportItems },
    ];
  } else if (isBackendUser()) {
    menuGroups = [
      { icon: LayoutDashboard, label: 'Dashboard', items: [{ icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' }] },
      { icon: FolderOpen, label: 'Masters', items: masterItems },
      { icon: Receipt, label: 'Transactions', items: transactionItems },
      { icon: Warehouse, label: 'Inventory', items: inventoryItems },
      { icon: PieChart, label: 'Reports', items: reportItems },
    ];
  } else {
    menuGroups = [
      { icon: LayoutDashboard, label: 'Dashboard', items: [{ icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' }] },
      { icon: FolderOpen, label: 'Masters', items: masterItems },
      { icon: Receipt, label: 'Transactions', items: transactionItems },
      { icon: Warehouse, label: 'Inventory', items: inventoryItems },
      { icon: PieChart, label: 'Reports', items: reportItems },
    ];

    if (isAdmin()) {
      menuGroups.push({ icon: ShieldCheck, label: 'Admin', items: adminItems });
    }
  }

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroup(expandedGroup === groupLabel ? null : groupLabel);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow-sm border-b border-slate-200 fixed w-full top-0 z-50">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="text-xl font-bold text-slate-800">Sales Management</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-800">{user?.full_name}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 pt-16 lg:pt-0 z-40
            w-64 bg-white border-r border-slate-200 transition-transform duration-300
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav className="p-4 space-y-2 h-full overflow-y-auto">
            {menuGroups.map((group) => (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={`
                    w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition
                    ${expandedGroup === group.label
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <group.icon className="w-5 h-5" />
                    <span>{group.label}</span>
                  </div>
                  <span className={`transform transition-transform ${expandedGroup === group.label ? 'rotate-90' : ''}`}>
                    ›
                  </span>
                </button>

                {expandedGroup === group.label && (
                  <div className="mt-1 ml-4 space-y-1">
                    {group.items.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path);
                          setSidebarOpen(false);
                        }}
                        className={`
                          w-full flex items-center gap-3 px-4 py-2 rounded-lg transition text-sm
                          ${window.location.pathname === item.path
                            ? 'bg-blue-100 text-blue-700 font-medium'
                            : 'text-slate-600 hover:bg-slate-50'
                          }
                        `}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-30 pt-16"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
