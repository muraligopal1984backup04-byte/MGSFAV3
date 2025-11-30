import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Package, ShoppingCart, DollarSign, TrendingUp } from 'lucide-react';

interface Stats {
  customers: number;
  products: number;
  orders: number;
  collections: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    customers: 0,
    products: 0,
    orders: 0,
    collections: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [customers, products, orders, collections] = await Promise.all([
        supabase.from('customer_master_tbl').select('id', { count: 'exact', head: true }),
        supabase.from('product_master_tbl').select('id', { count: 'exact', head: true }),
        supabase.from('sale_order_header_tbl').select('id', { count: 'exact', head: true }),
        supabase.from('collection_detail_tbl').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        customers: customers.count || 0,
        products: products.count || 0,
        orders: orders.count || 0,
        collections: collections.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      icon: Users,
      label: 'Total Customers',
      value: stats.customers,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Package,
      label: 'Total Products',
      value: stats.products,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
    },
    {
      icon: ShoppingCart,
      label: 'Sales Orders',
      value: stats.orders,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
    },
    {
      icon: DollarSign,
      label: 'Collections',
      value: stats.collections,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Dashboard</h1>
        <p className="text-slate-600">Welcome to your sales management dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${card.bgColor} p-3 rounded-lg`}>
                <card.icon className={`w-6 h-6 ${card.color.replace('bg-', 'text-')}`} />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-1">{card.value}</h3>
            <p className="text-sm text-slate-600">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h2>
          <p className="text-slate-600">Activity tracking coming soon...</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition">
              Create New Order
            </button>
            <button className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition">
              Add Customer
            </button>
            <button className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition">
              Record Collection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
