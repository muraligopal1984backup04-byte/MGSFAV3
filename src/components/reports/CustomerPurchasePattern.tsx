import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Download, Filter, Users, TrendingUp, Activity } from 'lucide-react';

interface CustomerPattern {
  customer_id: string;
  customer_name: string;
  customer_code: string;
  first_purchase: string;
  last_purchase: string;
  total_orders: number;
  total_invoices: number;
  total_spent: number;
  avg_order_value: number;
  purchase_frequency: number;
}

interface Branch {
  id: string;
  branch_name: string;
}

export default function CustomerPurchasePattern() {
  const [patterns, setPatterns] = useState<CustomerPattern[]>([]);
  const [filteredPatterns, setFilteredPatterns] = useState<CustomerPattern[]>([]);
  const [loading, setLoading] = useState(true);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'spent' | 'frequency' | 'recent'>('spent');

  useEffect(() => {
    fetchBranches();
    fetchPatterns();
  }, [branchFilter, dateFrom, dateTo]);

  useEffect(() => {
    sortPatterns();
  }, [patterns, sortBy]);

  const fetchBranches = async () => {
    const { data } = await supabase
      .from('branch_master_tbl')
      .select('id, branch_name')
      .eq('is_active', true)
      .order('branch_name');

    if (data) setBranches(data);
  };

  const fetchPatterns = async () => {
    setLoading(true);
    try {
      let orderQuery = supabase
        .from('sale_order_header_tbl')
        .select(`
          customer_id,
          order_date,
          net_amount,
          customer_master_tbl!sale_order_header_tbl_customer_id_fkey (customer_name, customer_code)
        `);

      if (branchFilter !== 'all') {
        orderQuery = orderQuery.eq('branch_id', branchFilter);
      }

      if (dateFrom) {
        orderQuery = orderQuery.gte('order_date', dateFrom);
      }

      if (dateTo) {
        orderQuery = orderQuery.lte('order_date', dateTo);
      }

      const { data: orderData } = await orderQuery;

      let invoiceQuery = supabase
        .from('invoice_header_tbl')
        .select(`
          customer_id,
          invoice_date,
          net_amount
        `);

      if (branchFilter !== 'all') {
        invoiceQuery = invoiceQuery.eq('branch_id', branchFilter);
      }

      if (dateFrom) {
        invoiceQuery = invoiceQuery.gte('invoice_date', dateFrom);
      }

      if (dateTo) {
        invoiceQuery = invoiceQuery.lte('invoice_date', dateTo);
      }

      const { data: invoiceData } = await invoiceQuery;

      const customerMap = new Map<string, any>();

      orderData?.forEach((order: any) => {
        const customerId = order.customer_id;
        if (!customerId) return;

        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            customer_id: customerId,
            customer_name: order.customer_master_tbl?.customer_name || '-',
            customer_code: order.customer_master_tbl?.customer_code || '-',
            first_purchase: order.order_date,
            last_purchase: order.order_date,
            total_orders: 0,
            total_invoices: 0,
            total_spent: 0,
            order_dates: [],
          });
        }

        const customer = customerMap.get(customerId);
        customer.total_orders++;
        customer.total_spent += order.net_amount || 0;
        customer.order_dates.push(new Date(order.order_date).getTime());

        if (order.order_date < customer.first_purchase) {
          customer.first_purchase = order.order_date;
        }
        if (order.order_date > customer.last_purchase) {
          customer.last_purchase = order.order_date;
        }
      });

      invoiceData?.forEach((invoice: any) => {
        const customerId = invoice.customer_id;
        if (!customerId) return;

        if (customerMap.has(customerId)) {
          const customer = customerMap.get(customerId);
          customer.total_invoices++;
          customer.total_spent += invoice.net_amount || 0;
        }
      });

      const patternsData = Array.from(customerMap.values()).map(c => {
        const daysSinceFirst = c.order_dates.length > 1
          ? (Math.max(...c.order_dates) - Math.min(...c.order_dates)) / (1000 * 60 * 60 * 24)
          : 0;

        return {
          customer_id: c.customer_id,
          customer_name: c.customer_name,
          customer_code: c.customer_code,
          first_purchase: c.first_purchase,
          last_purchase: c.last_purchase,
          total_orders: c.total_orders,
          total_invoices: c.total_invoices,
          total_spent: c.total_spent,
          avg_order_value: c.total_orders > 0 ? c.total_spent / c.total_orders : 0,
          purchase_frequency: daysSinceFirst > 0 ? c.total_orders / (daysSinceFirst / 30) : 0,
        };
      });

      setPatterns(patternsData);
    } catch (error) {
      console.error('Error fetching patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortPatterns = () => {
    const sorted = [...patterns];

    switch (sortBy) {
      case 'spent':
        sorted.sort((a, b) => b.total_spent - a.total_spent);
        break;
      case 'frequency':
        sorted.sort((a, b) => b.purchase_frequency - a.purchase_frequency);
        break;
      case 'recent':
        sorted.sort((a, b) => new Date(b.last_purchase).getTime() - new Date(a.last_purchase).getTime());
        break;
    }

    setFilteredPatterns(sorted);
  };

  const exportToCSV = () => {
    const headers = [
      'Customer Code', 'Customer Name', 'First Purchase', 'Last Purchase',
      'Total Orders', 'Total Invoices', 'Total Spent', 'Avg Order Value', 'Purchase Frequency'
    ];

    const rows = filteredPatterns.map(pattern => [
      pattern.customer_code,
      pattern.customer_name,
      new Date(pattern.first_purchase).toLocaleDateString(),
      new Date(pattern.last_purchase).toLocaleDateString(),
      pattern.total_orders,
      pattern.total_invoices,
      pattern.total_spent.toFixed(2),
      pattern.avg_order_value.toFixed(2),
      pattern.purchase_frequency.toFixed(2),
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer_purchase_pattern_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totals = {
    totalCustomers: filteredPatterns.length,
    totalOrders: filteredPatterns.reduce((sum, p) => sum + p.total_orders, 0),
    totalSpent: filteredPatterns.reduce((sum, p) => sum + p.total_spent, 0),
    avgOrderValue: filteredPatterns.length > 0
      ? filteredPatterns.reduce((sum, p) => sum + p.avg_order_value, 0) / filteredPatterns.length
      : 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Customer Purchase Pattern & Trends</h1>
          <p className="text-slate-600">Behavioral insights and purchasing trends analysis</p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-100 text-sm">Total Customers</p>
            <Users className="w-5 h-5 text-blue-200" />
          </div>
          <p className="text-3xl font-bold">{totals.totalCustomers}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-green-100 text-sm">Total Orders</p>
            <Activity className="w-5 h-5 text-green-200" />
          </div>
          <p className="text-3xl font-bold">{totals.totalOrders}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-purple-100 text-sm">Total Revenue</p>
            <TrendingUp className="w-5 h-5 text-purple-200" />
          </div>
          <p className="text-3xl font-bold">₹{(totals.totalSpent / 1000).toFixed(1)}K</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-orange-100 text-sm">Avg Order Value</p>
          </div>
          <p className="text-3xl font-bold">₹{totals.avgOrderValue.toFixed(0)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="p-4 border-b border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Branches</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.branch_name}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="spent">Sort by Total Spent</option>
                <option value="frequency">Sort by Frequency</option>
                <option value="recent">Sort by Recent</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Customer</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">First Purchase</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Last Purchase</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Orders</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Invoices</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Total Spent</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Avg Order</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Frequency</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatterns.map((pattern) => (
                  <tr key={pattern.customer_id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{pattern.customer_name}</p>
                        <p className="text-xs text-slate-500">{pattern.customer_code}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {new Date(pattern.first_purchase).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {new Date(pattern.last_purchase).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-slate-600">{pattern.total_orders}</td>
                    <td className="py-3 px-4 text-sm text-right text-slate-600">{pattern.total_invoices}</td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-slate-700">
                      ₹{pattern.total_spent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-slate-600">
                      ₹{pattern.avg_order_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        pattern.purchase_frequency > 4
                          ? 'bg-green-100 text-green-700'
                          : pattern.purchase_frequency > 2
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {pattern.purchase_frequency.toFixed(1)}/mo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredPatterns.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <p className="text-lg font-medium">No customer data found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
