import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Download, Filter, MapPin, TrendingUp, ChevronRight, ChevronDown } from 'lucide-react';

interface RouteSales {
  route_id: string;
  route_name: string;
  route_code: string;
  total_invoices: number;
  total_sales: number;
  total_discount: number;
  total_tax: number;
  net_sales: number;
  customer_count: number;
}

interface RouteCustomerDetail {
  customer_name: string;
  customer_code: string;
  invoice_count: number;
  total_amount: number;
  net_amount: number;
}

interface Branch {
  id: string;
  branch_name: string;
}

export default function RouteWiseSales() {
  const [, setRouteSales] = useState<RouteSales[]>([]);
  const [filteredSales, setFilteredSales] = useState<RouteSales[]>([]);
  const [loading, setLoading] = useState(true);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const [routeDetails, setRouteDetails] = useState<{ [key: string]: RouteCustomerDetail[] }>({});

  useEffect(() => {
    fetchBranches();
    fetchRouteSales();
  }, [branchFilter, dateFrom, dateTo]);

  const fetchBranches = async () => {
    const { data } = await supabase
      .from('branch_master_tbl')
      .select('id, branch_name')
      .eq('is_active', true)
      .order('branch_name');

    if (data) setBranches(data);
  };

  const fetchRouteSales = async () => {
    setLoading(true);
    try {
      let query = supabase.rpc('get_route_wise_sales', {
        p_branch_id: branchFilter === 'all' ? null : branchFilter,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null,
      });

      const { data, error } = await query;

      if (error) {
        console.error('RPC not found, using fallback query');
        await fetchRouteSalesFallback();
        return;
      }

      if (data) {
        setRouteSales(data);
        setFilteredSales(data);
      }
    } catch (error) {
      console.error('Error fetching route sales:', error);
      await fetchRouteSalesFallback();
    } finally {
      setLoading(false);
    }
  };

  const fetchRouteSalesFallback = async () => {
    try {
      let query = supabase
        .from('invoice_header_tbl')
        .select(`
          route_id,
          total_amount,
          discount_amount,
          tax_amount,
          net_amount,
          customer_id,
          route_master_tbl!invoice_header_tbl_route_id_fkey (route_name, route_code)
        `);

      if (branchFilter !== 'all') {
        query = query.eq('branch_id', branchFilter);
      }

      if (dateFrom) {
        query = query.gte('invoice_date', dateFrom);
      }

      if (dateTo) {
        query = query.lte('invoice_date', dateTo);
      }

      const { data } = await query;

      if (data) {
        const routeMap = new Map<string, any>();

        data.forEach((inv: any) => {
          const routeId = inv.route_id;
          if (!routeId) return;

          if (!routeMap.has(routeId)) {
            routeMap.set(routeId, {
              route_id: routeId,
              route_name: inv.route_master_tbl?.route_name || '-',
              route_code: inv.route_master_tbl?.route_code || '-',
              total_invoices: 0,
              total_sales: 0,
              total_discount: 0,
              total_tax: 0,
              net_sales: 0,
              customers: new Set(),
            });
          }

          const route = routeMap.get(routeId);
          route.total_invoices++;
          route.total_sales += inv.total_amount || 0;
          route.total_discount += inv.discount_amount || 0;
          route.total_tax += inv.tax_amount || 0;
          route.net_sales += inv.net_amount || 0;
          route.customers.add(inv.customer_id);
        });

        const salesData = Array.from(routeMap.values()).map(r => ({
          ...r,
          customer_count: r.customers.size,
        }));

        setRouteSales(salesData);
        setFilteredSales(salesData);
      }
    } catch (error) {
      console.error('Error in fallback query:', error);
    }
  };

  const fetchRouteDetails = async (routeId: string) => {
    if (routeDetails[routeId]) return;

    try {
      let query = supabase
        .from('invoice_header_tbl')
        .select(`
          net_amount,
          total_amount,
          customer_master_tbl!invoice_header_tbl_customer_id_fkey (customer_name, customer_code)
        `)
        .eq('route_id', routeId);

      if (dateFrom) query = query.gte('invoice_date', dateFrom);
      if (dateTo) query = query.lte('invoice_date', dateTo);

      const { data } = await query;

      if (data) {
        const customerMap = new Map<string, any>();

        data.forEach((inv: any) => {
          const customerName = inv.customer_master_tbl?.customer_name || '-';
          const customerCode = inv.customer_master_tbl?.customer_code || '-';

          if (!customerMap.has(customerName)) {
            customerMap.set(customerName, {
              customer_name: customerName,
              customer_code: customerCode,
              invoice_count: 0,
              total_amount: 0,
              net_amount: 0,
            });
          }

          const customer = customerMap.get(customerName);
          customer.invoice_count++;
          customer.total_amount += inv.total_amount || 0;
          customer.net_amount += inv.net_amount || 0;
        });

        const details = Array.from(customerMap.values());
        setRouteDetails(prev => ({ ...prev, [routeId]: details }));
      }
    } catch (error) {
      console.error('Error fetching route details:', error);
    }
  };

  const toggleRouteExpand = async (routeId: string) => {
    if (expandedRoute === routeId) {
      setExpandedRoute(null);
    } else {
      setExpandedRoute(routeId);
      await fetchRouteDetails(routeId);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Route Code', 'Route Name', 'Total Invoices', 'Customers',
      'Total Sales', 'Discount', 'Tax', 'Net Sales'
    ];

    const rows = filteredSales.map(route => [
      route.route_code,
      route.route_name,
      route.total_invoices,
      route.customer_count,
      route.total_sales.toFixed(2),
      route.total_discount.toFixed(2),
      route.total_tax.toFixed(2),
      route.net_sales.toFixed(2),
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `route_wise_sales_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totals = {
    totalInvoices: filteredSales.reduce((sum, r) => sum + r.total_invoices, 0),
    totalSales: filteredSales.reduce((sum, r) => sum + r.total_sales, 0),
    totalDiscount: filteredSales.reduce((sum, r) => sum + r.total_discount, 0),
    netSales: filteredSales.reduce((sum, r) => sum + r.net_sales, 0),
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
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Route-Wise Sales Report</h1>
          <p className="text-slate-600">Sales performance analysis by delivery routes</p>
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
            <p className="text-blue-100 text-sm">Total Routes</p>
            <MapPin className="w-5 h-5 text-blue-200" />
          </div>
          <p className="text-3xl font-bold">{filteredSales.length}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-green-100 text-sm">Total Invoices</p>
            <TrendingUp className="w-5 h-5 text-green-200" />
          </div>
          <p className="text-3xl font-bold">{totals.totalInvoices}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-purple-100 text-sm">Gross Sales</p>
          </div>
          <p className="text-3xl font-bold">₹{(totals.totalSales / 1000).toFixed(1)}K</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-orange-100 text-sm">Net Sales</p>
          </div>
          <p className="text-3xl font-bold">₹{(totals.netSales / 1000).toFixed(1)}K</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="p-4 border-b border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                placeholder="From Date"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="To Date"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Route Code</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Route Name</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Invoices</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Customers</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Gross Sales</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Discount</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Tax</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Net Sales</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((route) => (
                  <>
                    <tr key={route.route_id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm font-mono text-slate-700">{route.route_code}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{route.route_name}</td>
                      <td className="py-3 px-4 text-sm text-right text-slate-600">{route.total_invoices}</td>
                      <td className="py-3 px-4 text-sm text-right text-slate-600">{route.customer_count}</td>
                      <td className="py-3 px-4 text-sm text-right text-slate-600">
                        ₹{route.total_sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-slate-600">
                        ₹{route.total_discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-slate-600">
                        ₹{route.total_tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-slate-700">
                        ₹{route.net_sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleRouteExpand(route.route_id)}
                          className="p-1 hover:bg-blue-50 text-blue-600 rounded transition"
                        >
                          {expandedRoute === route.route_id ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedRoute === route.route_id && routeDetails[route.route_id] && (
                      <tr>
                        <td colSpan={9} className="bg-slate-50 p-4">
                          <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <h4 className="text-sm font-semibold text-slate-800 mb-3">Customer-wise Sales in Route</h4>
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="text-left py-2 px-2 text-xs font-semibold text-slate-700">Customer Code</th>
                                  <th className="text-left py-2 px-2 text-xs font-semibold text-slate-700">Customer Name</th>
                                  <th className="text-right py-2 px-2 text-xs font-semibold text-slate-700">Invoices</th>
                                  <th className="text-right py-2 px-2 text-xs font-semibold text-slate-700">Total Amount</th>
                                  <th className="text-right py-2 px-2 text-xs font-semibold text-slate-700">Net Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {routeDetails[route.route_id].map((customer, idx) => (
                                  <tr key={idx} className="border-b border-slate-100">
                                    <td className="py-2 px-2 text-xs font-mono text-slate-600">{customer.customer_code}</td>
                                    <td className="py-2 px-2 text-xs text-slate-600">{customer.customer_name}</td>
                                    <td className="py-2 px-2 text-xs text-right text-slate-600">{customer.invoice_count}</td>
                                    <td className="py-2 px-2 text-xs text-right text-slate-600">
                                      ₹{customer.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2 px-2 text-xs text-right font-medium text-slate-700">
                                      ₹{customer.net_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>

            {filteredSales.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <p className="text-lg font-medium">No route sales data found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
