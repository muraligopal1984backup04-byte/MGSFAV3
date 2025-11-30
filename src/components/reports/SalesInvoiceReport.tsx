import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Filter, Calendar, Download, ChevronRight, ChevronDown, TrendingUp } from 'lucide-react';

interface InvoiceSummary {
  id: string;
  invoice_no: string;
  invoice_date: string;
  customer_name: string;
  branch_name: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  payment_status: string;
}

interface InvoiceDetail {
  product_name: string;
  product_code: string;
  brand_name: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
}

interface Branch {
  id: string;
  branch_name: string;
}

interface Customer {
  id: string;
  customer_name: string;
}

export default function SalesInvoiceReport() {
  const { user, isCustomer } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [invoiceDetails, setInvoiceDetails] = useState<{ [key: string]: InvoiceDetail[] }>({});

  useEffect(() => {
    fetchFilters();
    fetchInvoices();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [invoices, searchTerm, branchFilter, customerFilter, dateFrom, dateTo, statusFilter]);

  const fetchFilters = async () => {
    const [branchesData, customersData] = await Promise.all([
      supabase.from('branch_master_tbl').select('id, branch_name').eq('is_active', true).order('branch_name'),
      supabase.from('customer_master_tbl').select('id, customer_name').eq('is_active', true).order('customer_name'),
    ]);

    if (branchesData.data) setBranches(branchesData.data);
    if (customersData.data) setCustomers(customersData.data);
  };

  const fetchInvoices = async () => {
    try {
      let query = supabase
        .from('invoice_header_tbl')
        .select(`
          id,
          invoice_no,
          invoice_date,
          customer_id,
          total_amount,
          discount_amount,
          tax_amount,
          net_amount,
          payment_status,
          customer_master_tbl!invoice_header_tbl_customer_id_fkey (customer_name),
          branch_master_tbl!invoice_header_tbl_branch_id_fkey (branch_name)
        `)
        .order('invoice_date', { ascending: false });

      if (isCustomer() && user?.customer_id) {
        query = query.eq('customer_id', user.customer_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formatted = data?.map((inv: any) => ({
        id: inv.id,
        invoice_no: inv.invoice_no,
        invoice_date: inv.invoice_date,
        customer_name: inv.customer_master_tbl?.customer_name || '-',
        branch_name: inv.branch_master_tbl?.branch_name || '-',
        total_amount: inv.total_amount || 0,
        discount_amount: inv.discount_amount || 0,
        tax_amount: inv.tax_amount || 0,
        net_amount: inv.net_amount || 0,
        payment_status: inv.payment_status || 'pending',
      })) || [];

      setInvoices(formatted);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterInvoices = () => {
    let filtered = [...invoices];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.invoice_no.toLowerCase().includes(search) ||
          i.customer_name.toLowerCase().includes(search)
      );
    }

    if (branchFilter !== 'all') {
      const branch = branches.find(b => b.id === branchFilter);
      if (branch) {
        filtered = filtered.filter(i => i.branch_name === branch.branch_name);
      }
    }

    if (customerFilter !== 'all') {
      const customer = customers.find(c => c.id === customerFilter);
      if (customer) {
        filtered = filtered.filter(i => i.customer_name === customer.customer_name);
      }
    }

    if (dateFrom) {
      filtered = filtered.filter(i => i.invoice_date >= dateFrom);
    }

    if (dateTo) {
      filtered = filtered.filter(i => i.invoice_date <= dateTo);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(i => i.payment_status === statusFilter);
    }

    setFilteredInvoices(filtered);
  };

  const fetchInvoiceDetails = async (invoiceId: string) => {
    if (invoiceDetails[invoiceId]) {
      return;
    }

    const { data } = await supabase
      .from('invoice_detail_tbl')
      .select(`
        quantity,
        unit_price,
        discount_amount,
        tax_amount,
        line_total,
        product_master_tbl!invoice_detail_tbl_product_id_fkey (product_code, product_name),
        brand_master_tbl!invoice_detail_tbl_brand_id_fkey (brand_name)
      `)
      .eq('invoice_id', invoiceId)
      .order('line_no');

    if (data) {
      const details = data.map((d: any) => ({
        product_name: d.product_master_tbl?.product_name || '-',
        product_code: d.product_master_tbl?.product_code || '-',
        brand_name: d.brand_master_tbl?.brand_name || '-',
        quantity: d.quantity,
        unit_price: d.unit_price,
        discount_amount: d.discount_amount,
        tax_amount: d.tax_amount,
        line_total: d.line_total,
      }));

      setInvoiceDetails(prev => ({ ...prev, [invoiceId]: details }));
    }
  };

  const toggleInvoiceExpand = async (invoiceId: string) => {
    if (expandedInvoice === invoiceId) {
      setExpandedInvoice(null);
    } else {
      setExpandedInvoice(invoiceId);
      await fetchInvoiceDetails(invoiceId);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Invoice No', 'Date', 'Customer', 'Branch', 'Total Amount',
      'Discount', 'Tax', 'Net Amount', 'Payment Status'
    ];

    const rows = filteredInvoices.map(inv => [
      inv.invoice_no,
      new Date(inv.invoice_date).toLocaleDateString(),
      inv.customer_name,
      inv.branch_name,
      inv.total_amount.toFixed(2),
      inv.discount_amount.toFixed(2),
      inv.tax_amount.toFixed(2),
      inv.net_amount.toFixed(2),
      inv.payment_status,
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_invoice_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totals = {
    totalAmount: filteredInvoices.reduce((sum, inv) => sum + inv.total_amount, 0),
    discountAmount: filteredInvoices.reduce((sum, inv) => sum + inv.discount_amount, 0),
    taxAmount: filteredInvoices.reduce((sum, inv) => sum + inv.tax_amount, 0),
    netAmount: filteredInvoices.reduce((sum, inv) => sum + inv.net_amount, 0),
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
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Sales Invoice Report</h1>
          <p className="text-slate-600">Comprehensive invoice analytics with drill-down details</p>
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
            <p className="text-blue-100 text-sm">Total Sales</p>
            <TrendingUp className="w-5 h-5 text-blue-200" />
          </div>
          <p className="text-3xl font-bold">₹{totals.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          <p className="text-blue-100 text-sm mt-1">{filteredInvoices.length} invoices</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-green-100 text-sm">Net Amount</p>
            <TrendingUp className="w-5 h-5 text-green-200" />
          </div>
          <p className="text-3xl font-bold">₹{totals.netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-orange-100 text-sm">Discount Given</p>
          </div>
          <p className="text-3xl font-bold">₹{totals.discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-purple-100 text-sm">Tax Collected</p>
          </div>
          <p className="text-3xl font-bold">₹{totals.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="p-4 border-b border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

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
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Customers</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>{customer.customer_name}</option>
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
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Invoice No</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Customer</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Branch</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Total</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Discount</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Tax</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Net Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <>
                    <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm font-mono text-slate-700">{invoice.invoice_no}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">{invoice.customer_name}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{invoice.branch_name}</td>
                      <td className="py-3 px-4 text-sm text-right text-slate-600">
                        ₹{invoice.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-slate-600">
                        ₹{invoice.discount_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-slate-600">
                        ₹{invoice.tax_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-slate-700">
                        ₹{invoice.net_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            invoice.payment_status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : invoice.payment_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {invoice.payment_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleInvoiceExpand(invoice.id)}
                          className="p-1 hover:bg-blue-50 text-blue-600 rounded transition"
                        >
                          {expandedInvoice === invoice.id ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedInvoice === invoice.id && invoiceDetails[invoice.id] && (
                      <tr>
                        <td colSpan={10} className="bg-slate-50 p-4">
                          <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <h4 className="text-sm font-semibold text-slate-800 mb-3">Invoice Line Items</h4>
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="text-left py-2 px-2 text-xs font-semibold text-slate-700">Product</th>
                                  <th className="text-left py-2 px-2 text-xs font-semibold text-slate-700">Brand</th>
                                  <th className="text-right py-2 px-2 text-xs font-semibold text-slate-700">Qty</th>
                                  <th className="text-right py-2 px-2 text-xs font-semibold text-slate-700">Price</th>
                                  <th className="text-right py-2 px-2 text-xs font-semibold text-slate-700">Discount</th>
                                  <th className="text-right py-2 px-2 text-xs font-semibold text-slate-700">Tax</th>
                                  <th className="text-right py-2 px-2 text-xs font-semibold text-slate-700">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {invoiceDetails[invoice.id].map((detail, idx) => (
                                  <tr key={idx} className="border-b border-slate-100">
                                    <td className="py-2 px-2 text-xs text-slate-600">{detail.product_name}</td>
                                    <td className="py-2 px-2 text-xs text-slate-600">{detail.brand_name}</td>
                                    <td className="py-2 px-2 text-xs text-right text-slate-600">{detail.quantity}</td>
                                    <td className="py-2 px-2 text-xs text-right text-slate-600">₹{detail.unit_price.toFixed(2)}</td>
                                    <td className="py-2 px-2 text-xs text-right text-slate-600">₹{detail.discount_amount.toFixed(2)}</td>
                                    <td className="py-2 px-2 text-xs text-right text-slate-600">₹{detail.tax_amount.toFixed(2)}</td>
                                    <td className="py-2 px-2 text-xs text-right font-medium text-slate-700">₹{detail.line_total.toFixed(2)}</td>
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

            {filteredInvoices.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <p className="text-lg font-medium">No invoices found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
