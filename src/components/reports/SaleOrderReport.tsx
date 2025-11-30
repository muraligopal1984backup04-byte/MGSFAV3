import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Edit, Printer, Trash2, X, Save, Calendar, Filter } from 'lucide-react';

interface OrderHeader {
  id: string;
  order_no: string;
  order_date: string;
  customer_id: string;
  customer_name?: string;
  branch_name?: string;
  route_name?: string;
  payment_terms: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  order_status: string;
  created_at: string;
}

interface OrderDetail {
  id: string;
  line_no: number;
  product_id: string;
  product_code: string;
  product_name: string;
  brand_name: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  discount_amount: number;
  tax_percentage: number;
  tax_amount: number;
  line_total: number;
}

interface Customer {
  id: string;
  customer_code: string;
  customer_name: string;
}

export default function SaleOrderReport() {
  const { user, isCustomer } = useAuth();
  const [orders, setOrders] = useState<OrderHeader[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');

  const [editingOrder, setEditingOrder] = useState<OrderHeader | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printOrder, setPrintOrder] = useState<OrderHeader | null>(null);
  const [printDetails, setPrintDetails] = useState<OrderDetail[]>([]);

  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, dateFrom, dateTo, statusFilter, customerFilter]);

  const fetchCustomers = async () => {
    try {
      const { data } = await supabase
        .from('customer_master_tbl')
        .select('id, customer_code, customer_name')
        .eq('is_active', true)
        .order('customer_name');

      if (data) {
        setAllCustomers(data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      let query = supabase
        .from('sale_order_header_tbl')
        .select(`
          id,
          order_no,
          order_date,
          customer_id,
          payment_terms,
          total_amount,
          discount_amount,
          tax_amount,
          net_amount,
          order_status,
          branch_id,
          route_id,
          created_at,
          customer_master_tbl!sale_order_header_tbl_customer_id_fkey (customer_name),
          branch_master_tbl!sale_order_header_tbl_branch_id_fkey (branch_name),
          route_master_tbl!sale_order_header_tbl_route_id_fkey (route_name)
        `);

      if (isCustomer() && user?.customer_id) {
        query = query.eq('customer_id', user.customer_id);
      }

      const { data, error } = await query.order('order_date', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      const formattedOrders = data?.map((order: any) => ({
        id: order.id,
        order_no: order.order_no,
        order_date: order.order_date,
        customer_id: order.customer_id,
        customer_name: order.customer_master_tbl?.customer_name || 'Unknown',
        branch_name: order.branch_master_tbl?.branch_name || '-',
        route_name: order.route_master_tbl?.route_name || '-',
        payment_terms: order.payment_terms || '-',
        total_amount: order.total_amount || 0,
        discount_amount: order.discount_amount || 0,
        tax_amount: order.tax_amount || 0,
        net_amount: order.net_amount || 0,
        order_status: order.order_status,
        created_at: order.created_at,
      })) || [];

      setOrders(formattedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.order_no.toLowerCase().includes(search) ||
          o.customer_name?.toLowerCase().includes(search) ||
          o.branch_name?.toLowerCase().includes(search)
      );
    }

    if (customerFilter !== 'all') {
      filtered = filtered.filter((o) => o.customer_id === customerFilter);
    }

    if (dateFrom) {
      filtered = filtered.filter((o) => o.order_date >= dateFrom);
    }

    if (dateTo) {
      filtered = filtered.filter((o) => o.order_date <= dateTo);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((o) => o.order_status === statusFilter);
    }

    setFilteredOrders(filtered);
  };

  const fetchOrderDetails = async (orderId: string) => {
    const { data } = await supabase
      .from('sale_order_detail_tbl')
      .select(`
        id,
        line_no,
        product_id,
        quantity,
        unit_price,
        discount_percentage,
        discount_amount,
        tax_percentage,
        tax_amount,
        line_total,
        product_master_tbl!sale_order_detail_tbl_product_id_fkey (product_code, product_name),
        brand_master_tbl!sale_order_detail_tbl_brand_id_fkey (brand_name)
      `)
      .eq('order_id', orderId)
      .order('line_no');

    if (data) {
      return data.map((detail: any) => ({
        id: detail.id,
        line_no: detail.line_no,
        product_id: detail.product_id,
        product_code: detail.product_master_tbl?.product_code || '',
        product_name: detail.product_master_tbl?.product_name || '',
        brand_name: detail.brand_master_tbl?.brand_name || '',
        quantity: detail.quantity,
        unit_price: detail.unit_price,
        discount_percentage: detail.discount_percentage,
        discount_amount: detail.discount_amount,
        tax_percentage: detail.tax_percentage,
        tax_amount: detail.tax_amount,
        line_total: detail.line_total,
      }));
    }
    return [];
  };

  const handleEdit = async (order: OrderHeader) => {
    setEditingOrder(order);
    const details = await fetchOrderDetails(order.id);
    setOrderDetails(details);

    const { data: customerData } = await supabase
      .from('customer_master_tbl')
      .select('id, customer_code, customer_name')
      .eq('id', order.customer_id)
      .maybeSingle();

    if (customerData) {
      setSelectedCustomer(customerData);
    }

    setShowEditModal(true);
  };

  const handlePrint = async (order: OrderHeader) => {
    setPrintOrder(order);
    const details = await fetchOrderDetails(order.id);
    setPrintDetails(details);
    setShowPrintModal(true);
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order? This will also delete all order details.')) {
      return;
    }

    try {
      await supabase.from('sale_order_detail_tbl').delete().eq('order_id', orderId);
      await supabase.from('sale_order_header_tbl').delete().eq('id', orderId);

      alert('Order deleted successfully');
      await fetchOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Error deleting order. Please try again.');
    }
  };

  const updateOrderLine = (index: number, field: string, value: any) => {
    const updated = [...orderDetails];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'quantity' || field === 'unit_price' || field === 'discount_percentage') {
      const line = updated[index];
      const subtotal = line.quantity * line.unit_price;
      line.discount_amount = (subtotal * line.discount_percentage) / 100;
      const afterDiscount = subtotal - line.discount_amount;
      line.tax_amount = (afterDiscount * line.tax_percentage) / 100;
      line.line_total = afterDiscount + line.tax_amount;
    }

    setOrderDetails(updated);
  };

  const removeOrderLine = (index: number) => {
    setOrderDetails(orderDetails.filter((_, i) => i !== index));
  };

  const handleSaveEdit = async () => {
    if (!editingOrder || !selectedCustomer) {
      alert('Please select a customer');
      return;
    }

    setSaving(true);

    try {
      const totalAmount = orderDetails.reduce((sum, line) => sum + (line.quantity * line.unit_price), 0);
      const discountAmount = orderDetails.reduce((sum, line) => sum + line.discount_amount, 0);
      const taxAmount = orderDetails.reduce((sum, line) => sum + line.tax_amount, 0);
      const netAmount = totalAmount - discountAmount + taxAmount;

      await supabase
        .from('sale_order_header_tbl')
        .update({
          customer_id: selectedCustomer.id,
          total_amount: totalAmount,
          discount_amount: discountAmount,
          tax_amount: taxAmount,
          net_amount: netAmount,
        })
        .eq('id', editingOrder.id);

      await supabase.from('sale_order_detail_tbl').delete().eq('order_id', editingOrder.id);

      const detailsToInsert = orderDetails.map((line, index) => ({
        order_id: editingOrder.id,
        line_no: index + 1,
        product_id: line.product_id,
        quantity: line.quantity,
        unit_price: line.unit_price,
        discount_percentage: line.discount_percentage,
        discount_amount: line.discount_amount,
        tax_percentage: line.tax_percentage,
        tax_amount: line.tax_amount,
        line_total: line.line_total,
      }));

      if (detailsToInsert.length > 0) {
        await supabase.from('sale_order_detail_tbl').insert(detailsToInsert);
      }

      alert('Order updated successfully');
      setShowEditModal(false);
      await fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Error updating order. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const printOrderDocument = () => {
    window.print();
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Sale Order Report</h1>
        <p className="text-slate-600">View, edit, print, and manage sale orders</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="p-4 border-b border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Customers</option>
                {allCustomers.map(customer => (
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

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="text-sm text-slate-600 mb-4">
            Showing {filteredOrders.length} of {orders.length} orders
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Order No</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Customer</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Branch</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Payment Terms</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Net Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm font-mono text-slate-700">{order.order_no}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {new Date(order.order_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{order.customer_name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{order.branch_name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{order.payment_terms}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 text-right font-medium">
                      ₹{order.net_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          order.order_status === 'confirmed'
                            ? 'bg-green-100 text-green-700'
                            : order.order_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {order.order_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        {!isCustomer() && (
                          <button
                            onClick={() => handleEdit(order)}
                            className="p-1 hover:bg-blue-50 text-blue-600 rounded transition"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handlePrint(order)}
                          className="p-1 hover:bg-green-50 text-green-600 rounded transition"
                          title="Print"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {!isCustomer() && (
                          <button
                            onClick={() => handleDelete(order.id)}
                            className="p-1 hover:bg-red-50 text-red-600 rounded transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredOrders.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <p className="text-lg font-medium">No orders found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showEditModal && editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-800">Edit Order: {editingOrder.order_no}</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Order No</label>
                  <input
                    type="text"
                    value={editingOrder.order_no}
                    disabled
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Order Date</label>
                  <input
                    type="date"
                    value={editingOrder.order_date}
                    disabled
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
                  <input
                    type="text"
                    value={selectedCustomer?.customer_name || ''}
                    disabled
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-slate-800 mb-3">Order Details</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-2 text-sm font-semibold text-slate-700">Product</th>
                        <th className="text-right py-2 px-2 text-sm font-semibold text-slate-700">Qty</th>
                        <th className="text-right py-2 px-2 text-sm font-semibold text-slate-700">Price</th>
                        <th className="text-right py-2 px-2 text-sm font-semibold text-slate-700">Disc %</th>
                        <th className="text-right py-2 px-2 text-sm font-semibold text-slate-700">Tax %</th>
                        <th className="text-right py-2 px-2 text-sm font-semibold text-slate-700">Total</th>
                        <th className="text-center py-2 px-2 text-sm font-semibold text-slate-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderDetails.map((line, index) => (
                        <tr key={index} className="border-b border-slate-100">
                          <td className="py-2 px-2 text-sm">{line.product_name}</td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              value={line.quantity}
                              onChange={(e) => updateOrderLine(index, 'quantity', parseFloat(e.target.value))}
                              className="w-20 px-2 py-1 border border-slate-300 rounded text-right text-sm"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              step="0.01"
                              value={line.unit_price}
                              onChange={(e) => updateOrderLine(index, 'unit_price', parseFloat(e.target.value))}
                              className="w-24 px-2 py-1 border border-slate-300 rounded text-right text-sm"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              step="0.01"
                              value={line.discount_percentage}
                              onChange={(e) => updateOrderLine(index, 'discount_percentage', parseFloat(e.target.value))}
                              className="w-20 px-2 py-1 border border-slate-300 rounded text-right text-sm"
                            />
                          </td>
                          <td className="py-2 px-2 text-right text-sm">{line.tax_percentage}%</td>
                          <td className="py-2 px-2 text-right text-sm font-medium">
                            ₹{line.line_total.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              onClick={() => removeOrderLine(index)}
                              className="p-1 hover:bg-red-50 text-red-600 rounded transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPrintModal && printOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between print:hidden">
              <h3 className="text-xl font-semibold text-slate-800">Print Order</h3>
              <div className="flex gap-2">
                <button
                  onClick={printOrderDocument}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8" id="print-content">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">SALE ORDER</h2>
                <p className="text-slate-600">Order No: {printOrder.order_no}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-slate-600">Order Date:</p>
                  <p className="font-medium">{new Date(printOrder.order_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Customer:</p>
                  <p className="font-medium">{printOrder.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Branch:</p>
                  <p className="font-medium">{printOrder.branch_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Payment Terms:</p>
                  <p className="font-medium">{printOrder.payment_terms}</p>
                </div>
              </div>

              <table className="w-full mb-6">
                <thead>
                  <tr className="border-b-2 border-slate-300">
                    <th className="text-left py-2 px-2 text-sm font-semibold">Product</th>
                    <th className="text-center py-2 px-2 text-sm font-semibold">Qty</th>
                    <th className="text-right py-2 px-2 text-sm font-semibold">Price</th>
                    <th className="text-right py-2 px-2 text-sm font-semibold">Discount</th>
                    <th className="text-right py-2 px-2 text-sm font-semibold">Tax</th>
                    <th className="text-right py-2 px-2 text-sm font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {printDetails.map((line) => (
                    <tr key={line.id} className="border-b border-slate-200">
                      <td className="py-2 px-2 text-sm">{line.product_name}</td>
                      <td className="py-2 px-2 text-sm text-center">{line.quantity}</td>
                      <td className="py-2 px-2 text-sm text-right">₹{line.unit_price.toFixed(2)}</td>
                      <td className="py-2 px-2 text-sm text-right">₹{line.discount_amount.toFixed(2)}</td>
                      <td className="py-2 px-2 text-sm text-right">₹{line.tax_amount.toFixed(2)}</td>
                      <td className="py-2 px-2 text-sm text-right font-medium">₹{line.line_total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-sm text-slate-600">Subtotal:</span>
                    <span className="font-medium">₹{printOrder.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-sm text-slate-600">Discount:</span>
                    <span className="font-medium">₹{printOrder.discount_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-sm text-slate-600">Tax:</span>
                    <span className="font-medium">₹{printOrder.tax_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-3 border-t-2 border-slate-300">
                    <span className="text-lg font-bold">Net Amount:</span>
                    <span className="text-lg font-bold">₹{printOrder.net_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-content, #print-content * {
            visibility: visible;
          }
          #print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
