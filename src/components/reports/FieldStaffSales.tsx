import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Download, Filter, Users, TrendingUp, ChevronRight, ChevronDown } from 'lucide-react';

interface StaffSales {
  staff_id: string;
  staff_name: string;
  staff_email: string;
  total_orders: number;
  total_invoices: number;
  total_sales: number;
  net_sales: number;
  customer_count: number;
}

interface StaffOrderDetail {
  order_no: string;
  order_date: string;
  customer_name: string;
  net_amount: number;
}

interface Branch {
  id: string;
  branch_name: string;
}

export default function FieldStaffSales() {
  const [, setStaffSales] = useState<StaffSales[]>([]);
  const [filteredSales, setFilteredSales] = useState<StaffSales[]>([]);
  const [loading, setLoading] = useState(true);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
  const [staffDetails, setStaffDetails] = useState<{ [key: string]: StaffOrderDetail[] }>({});

  useEffect(() => {
    fetchBranches();
    fetchStaffSales();
  }, [branchFilter, dateFrom, dateTo]);

  const fetchBranches = async () => {
    const { data } = await supabase
      .from('branch_master_tbl')
      .select('id, branch_name')
      .eq('is_active', true)
      .order('branch_name');

    if (data) setBranches(data);
  };

  const fetchStaffSales = async () => {
    setLoading(true);
    try {
      let orderQuery = supabase
        .from('sale_order_header_tbl')
        .select(`
          field_staff_id,
          net_amount,
          customer_id,
          user_master_tbl!sale_order_header_tbl_field_staff_id_fkey (id, full_name, email)
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
          field_staff_id,
          total_amount,
          net_amount,
          user_master_tbl!invoice_header_tbl_field_staff_id_fkey (id, full_name, email)
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

      const staffMap = new Map<string, any>();

      orderData?.forEach((order: any) => {
        const staffId = order.field_staff_id;
        if (!staffId) return;

        if (!staffMap.has(staffId)) {
          staffMap.set(staffId, {
            staff_id: staffId,
            staff_name: order.user_master_tbl?.full_name || '-',
            staff_email: order.user_master_tbl?.email || '-',
            total_orders: 0,
            total_invoices: 0,
            total_sales: 0,
            net_sales: 0,
            customers: new Set(),
          });
        }

        const staff = staffMap.get(staffId);
        staff.total_orders++;
        staff.net_sales += order.net_amount || 0;
        staff.customers.add(order.customer_id);
      });

      invoiceData?.forEach((invoice: any) => {
        const staffId = invoice.field_staff_id;
        if (!staffId) return;

        if (!staffMap.has(staffId)) {
          staffMap.set(staffId, {
            staff_id: staffId,
            staff_name: invoice.user_master_tbl?.full_name || '-',
            staff_email: invoice.user_master_tbl?.email || '-',
            total_orders: 0,
            total_invoices: 0,
            total_sales: 0,
            net_sales: 0,
            customers: new Set(),
          });
        }

        const staff = staffMap.get(staffId);
        staff.total_invoices++;
        staff.total_sales += invoice.total_amount || 0;
        staff.net_sales += invoice.net_amount || 0;
      });

      const salesData = Array.from(staffMap.values()).map(s => ({
        ...s,
        customer_count: s.customers.size,
      }));

      setStaffSales(salesData);
      setFilteredSales(salesData);
    } catch (error) {
      console.error('Error fetching staff sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffDetails = async (staffId: string) => {
    if (staffDetails[staffId]) return;

    try {
      let query = supabase
        .from('sale_order_header_tbl')
        .select(`
          order_no,
          order_date,
          net_amount,
          customer_master_tbl!sale_order_header_tbl_customer_id_fkey (customer_name)
        `)
        .eq('field_staff_id', staffId);

      if (dateFrom) query = query.gte('order_date', dateFrom);
      if (dateTo) query = query.lte('order_date', dateTo);

      const { data } = await query.order('order_date', { ascending: false }).limit(10);

      if (data) {
        const details = data.map((order: any) => ({
          order_no: order.order_no,
          order_date: order.order_date,
          customer_name: order.customer_master_tbl?.customer_name || '-',
          net_amount: order.net_amount,
        }));

        setStaffDetails(prev => ({ ...prev, [staffId]: details }));
      }
    } catch (error) {
      console.error('Error fetching staff details:', error);
    }
  };

  const toggleStaffExpand = async (staffId: string) => {
    if (expandedStaff === staffId) {
      setExpandedStaff(null);
    } else {
      setExpandedStaff(staffId);
      await fetchStaffDetails(staffId);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Staff Name', 'Email', 'Total Orders', 'Total Invoices',
      'Customers', 'Total Sales', 'Net Sales'
    ];

    const rows = filteredSales.map(staff => [
      staff.staff_name,
      staff.staff_email,
      staff.total_orders,
      staff.total_invoices,
      staff.customer_count,
      staff.total_sales.toFixed(2),
      staff.net_sales.toFixed(2),
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `field_staff_sales_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totals = {
    totalOrders: filteredSales.reduce((sum, s) => sum + s.total_orders, 0),
    totalInvoices: filteredSales.reduce((sum, s) => sum + s.total_invoices, 0),
    totalSales: filteredSales.reduce((sum, s) => sum + s.total_sales, 0),
    netSales: filteredSales.reduce((sum, s) => sum + s.net_sales, 0),
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
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Field Staff Sales Report</h1>
          <p className="text-slate-600">Performance metrics for field sales team</p>
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
            <p className="text-blue-100 text-sm">Active Staff</p>
            <Users className="w-5 h-5 text-blue-200" />
          </div>
          <p className="text-3xl font-bold">{filteredSales.length}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-green-100 text-sm">Total Orders</p>
            <TrendingUp className="w-5 h-5 text-green-200" />
          </div>
          <p className="text-3xl font-bold">{totals.totalOrders}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-purple-100 text-sm">Total Invoices</p>
          </div>
          <p className="text-3xl font-bold">{totals.totalInvoices}</p>
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
          </div>
        </div>

        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Staff Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Email</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Orders</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Invoices</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Customers</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Total Sales</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Net Sales</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((staff) => (
                  <>
                    <tr key={staff.staff_id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-700">{staff.staff_name}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{staff.staff_email}</td>
                      <td className="py-3 px-4 text-sm text-right text-slate-600">{staff.total_orders}</td>
                      <td className="py-3 px-4 text-sm text-right text-slate-600">{staff.total_invoices}</td>
                      <td className="py-3 px-4 text-sm text-right text-slate-600">{staff.customer_count}</td>
                      <td className="py-3 px-4 text-sm text-right text-slate-600">
                        ₹{staff.total_sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-slate-700">
                        ₹{staff.net_sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleStaffExpand(staff.staff_id)}
                          className="p-1 hover:bg-blue-50 text-blue-600 rounded transition"
                        >
                          {expandedStaff === staff.staff_id ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedStaff === staff.staff_id && staffDetails[staff.staff_id] && (
                      <tr>
                        <td colSpan={8} className="bg-slate-50 p-4">
                          <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <h4 className="text-sm font-semibold text-slate-800 mb-3">Recent Orders (Last 10)</h4>
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="text-left py-2 px-2 text-xs font-semibold text-slate-700">Order No</th>
                                  <th className="text-left py-2 px-2 text-xs font-semibold text-slate-700">Date</th>
                                  <th className="text-left py-2 px-2 text-xs font-semibold text-slate-700">Customer</th>
                                  <th className="text-right py-2 px-2 text-xs font-semibold text-slate-700">Net Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {staffDetails[staff.staff_id].map((order, idx) => (
                                  <tr key={idx} className="border-b border-slate-100">
                                    <td className="py-2 px-2 text-xs font-mono text-slate-600">{order.order_no}</td>
                                    <td className="py-2 px-2 text-xs text-slate-600">
                                      {new Date(order.order_date).toLocaleDateString()}
                                    </td>
                                    <td className="py-2 px-2 text-xs text-slate-600">{order.customer_name}</td>
                                    <td className="py-2 px-2 text-xs text-right font-medium text-slate-700">
                                      ₹{order.net_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                <p className="text-lg font-medium">No staff sales data found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
