import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Search, X, Save } from 'lucide-react';

interface Branch {
  id: string;
  branch_code: string;
  branch_name: string;
}

interface Customer {
  id: string;
  customer_code: string;
  customer_name: string;
  mobile_no: string;
  customer_type: string;
}

interface Product {
  id: string;
  product_code: string;
  product_name: string;
  brand_id: string;
  brand_name?: string;
  gst_rate: number;
}

interface OrderLine {
  id: string;
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
  notes: string;
}

export default function OrderList() {
  const { user, isCustomer } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [selectedBranch, setSelectedBranch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerRoute, setCustomerRoute] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderType, setOrderType] = useState('Visit Order');
  const [paymentType, setPaymentType] = useState('Cash on Delivery');
  const [modeOfTransport, setModeOfTransport] = useState('Own Vehicle');

  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadBranches();
    loadProducts();
    if (isCustomer() && user?.customer_id) {
      loadCustomerData();
    }
  }, []);

  useEffect(() => {
    if (customerSearch.length >= 2) {
      searchCustomers(customerSearch);
    } else {
      setCustomers([]);
    }
  }, [customerSearch]);

  useEffect(() => {
    if (productSearch.length >= 2) {
      filterProducts(productSearch);
    } else {
      setFilteredProducts([]);
    }
  }, [productSearch]);

  const loadBranches = async () => {
    const { data } = await supabase
      .from('branch_master_tbl')
      .select('id, branch_code, branch_name')
      .eq('is_active', true)
      .order('branch_name');

    if (data) {
      setBranches(data);
      if (data.length > 0) {
        setSelectedBranch(data[0].id);
      }
    }
  };

  const loadCustomerData = async () => {
    if (user?.customer_id) {
      const { data } = await supabase
        .from('customer_master_tbl')
        .select('id, customer_code, customer_name, mobile_no, customer_type')
        .eq('id', user.customer_id)
        .maybeSingle();

      if (data) {
        setSelectedCustomer(data);
      }
    }
  };

  const loadProducts = async () => {
    const { data } = await supabase
      .from('product_master_tbl')
      .select(`
        id,
        product_code,
        product_name,
        gst_rate,
        brand_id,
        brand_master_tbl (brand_name)
      `)
      .eq('is_active', true)
      .order('product_name');

    if (data) {
      const productsWithBrand = data.map(p => ({
        id: p.id,
        product_code: p.product_code,
        product_name: p.product_name,
        brand_id: p.brand_id,
        brand_name: (p.brand_master_tbl as any)?.brand_name || '',
        gst_rate: p.gst_rate || 0
      }));
      setProducts(productsWithBrand);
    }
  };

  const searchCustomers = async (search: string) => {
    const { data } = await supabase
      .from('customer_master_tbl')
      .select('id, customer_code, customer_name, mobile_no, customer_type')
      .eq('is_active', true)
      .or(`customer_code.ilike.%${search}%,customer_name.ilike.%${search}%`)
      .limit(10);

    if (data) {
      setCustomers(data);
    }
  };

  const selectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(`${customer.customer_code} - ${customer.customer_name}`);
    setCustomers([]);

    const { data } = await supabase
      .from('route_customer_mapping_tbl')
      .select(`
        route_id,
        route_master_tbl (route_code, route_name)
      `)
      .eq('customer_id', customer.id)
      .eq('is_active', true)
      .maybeSingle();

    if (data && data.route_master_tbl) {
      const route = data.route_master_tbl as any;
      setCustomerRoute(`${route.route_code} - ${route.route_name}`);
    } else {
      setCustomerRoute('No route assigned');
    }
  };

  const filterProducts = (search: string) => {
    const filtered = products.filter(p =>
      p.product_code.toLowerCase().includes(search.toLowerCase()) ||
      p.product_name.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredProducts(filtered.slice(0, 10));
  };

  const addProductLine = async (product: Product) => {
    const { data: priceData } = await supabase
      .from('product_price_tbl')
      .select('price, discount_percentage')
      .eq('product_id', product.id)
      .eq('customer_type', selectedCustomer?.customer_type || 'retail')
      .eq('is_active', true)
      .lte('effective_from', orderDate)
      .or(`effective_to.is.null,effective_to.gte.${orderDate}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    const price = priceData?.price || 0;
    const discountPct = priceData?.discount_percentage || 0;

    const newLine: OrderLine = {
      id: crypto.randomUUID(),
      product_id: product.id,
      product_code: product.product_code,
      product_name: product.product_name,
      brand_name: product.brand_name || '',
      quantity: 1,
      unit_price: price,
      discount_percentage: discountPct,
      discount_amount: 0,
      tax_percentage: product.gst_rate,
      tax_amount: 0,
      line_total: 0,
      notes: ''
    };

    calculateLineTotal(newLine);
    setOrderLines([...orderLines, newLine]);
    setProductSearch('');
    setShowProductSearch(false);
    setFilteredProducts([]);
  };

  const calculateLineTotal = (line: OrderLine) => {
    const baseAmount = line.quantity * line.unit_price;
    line.discount_amount = (baseAmount * line.discount_percentage) / 100;
    const afterDiscount = baseAmount - line.discount_amount;
    line.tax_amount = (afterDiscount * line.tax_percentage) / 100;
    line.line_total = afterDiscount + line.tax_amount;
  };

  const updateOrderLine = (id: string, field: keyof OrderLine, value: any) => {
    setOrderLines(orderLines.map(line => {
      if (line.id === id) {
        const updated = { ...line, [field]: value };
        calculateLineTotal(updated);
        return updated;
      }
      return line;
    }));
  };

  const removeOrderLine = (id: string) => {
    setOrderLines(orderLines.filter(line => line.id !== id));
  };

  const calculateTotals = () => {
    const totalBeforeGst = orderLines.reduce((sum, line) => {
      const baseAmount = line.quantity * line.unit_price;
      return sum + (baseAmount - line.discount_amount);
    }, 0);

    const totalGst = orderLines.reduce((sum, line) => sum + line.tax_amount, 0);
    const grandTotal = orderLines.reduce((sum, line) => sum + line.line_total, 0);

    return { totalBeforeGst, totalGst, grandTotal };
  };

  const saveOrder = async () => {
    if (!selectedCustomer) {
      setMessage('Please select a customer');
      return;
    }

    if (orderLines.length === 0) {
      setMessage('Please add at least one product');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const totals = calculateTotals();
      const orderNo = `ORD-${Date.now()}`;

      const { data: routeMapping } = await supabase
        .from('route_customer_mapping_tbl')
        .select('route_id')
        .eq('customer_id', selectedCustomer.id)
        .eq('is_active', true)
        .maybeSingle();

      const orderHeader = {
        order_no: orderNo,
        order_date: orderDate,
        customer_id: selectedCustomer.id,
        branch_id: selectedBranch || null,
        route_id: routeMapping?.route_id || null,
        field_staff_id: user?.id,
        order_status: 'confirmed',
        total_amount: totals.totalBeforeGst + totals.totalGst,
        discount_amount: orderLines.reduce((sum, line) => sum + line.discount_amount, 0),
        tax_amount: totals.totalGst,
        net_amount: totals.grandTotal,
        payment_terms: paymentType,
        notes: `Order Type: ${orderType}, Transport: ${modeOfTransport}`,
        created_by: user?.id
      };

      const { data: orderData, error: orderError } = await supabase
        .from('sale_order_header_tbl')
        .insert([orderHeader])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderDetails = orderLines.map((line, index) => ({
        order_id: orderData.id,
        line_no: index + 1,
        product_id: line.product_id,
        brand_id: products.find(p => p.id === line.product_id)?.brand_id,
        quantity: line.quantity,
        unit_price: line.unit_price,
        discount_percentage: line.discount_percentage,
        discount_amount: line.discount_amount,
        tax_percentage: line.tax_percentage,
        tax_amount: line.tax_amount,
        line_total: line.line_total,
        notes: line.notes
      }));

      const { error: detailError } = await supabase
        .from('sale_order_detail_tbl')
        .insert(orderDetails);

      if (detailError) throw detailError;

      setMessage(`Order ${orderNo} saved successfully!`);

      setSelectedCustomer(null);
      setCustomerSearch('');
      setCustomerRoute('');
      setOrderLines([]);
      setOrderType('Visit Order');
      setPaymentType('Cash on Delivery');
      setModeOfTransport('Own Vehicle');

    } catch (error) {
      console.error('Error saving order:', error);
      setMessage('Error saving order. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Create Sales Order</h1>
        <button
          onClick={saveOrder}
          disabled={saving || !selectedCustomer || orderLines.length === 0}
          className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Order'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.includes('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Order Header</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Branch *
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Select Branch</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.branch_code} - {branch.branch_name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Customer * (Search by Code or Name)
            </label>
            <div className="relative">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Type to search customer..."
                className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <Search className="absolute right-3 top-2.5 w-5 h-5 text-slate-400" />
            </div>
            {customers.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {customers.map(customer => (
                  <button
                    key={customer.id}
                    onClick={() => selectCustomer(customer)}
                    className="w-full px-3 py-2 text-left hover:bg-blue-50 transition"
                  >
                    <div className="font-medium text-slate-800">
                      {customer.customer_code} - {customer.customer_name}
                    </div>
                    <div className="text-sm text-slate-600">
                      {customer.mobile_no} | {customer.customer_type}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Field Staff
            </label>
            <input
              type="text"
              value={user?.full_name || ''}
              disabled
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Customer Route
            </label>
            <input
              type="text"
              value={customerRoute}
              disabled
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Order Date *
            </label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Order Type *
            </label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option>Phone Order</option>
              <option>Visit Order</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Payment Type *
            </label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option>Payment Against Proforma</option>
              <option>Cash on Delivery</option>
              <option>CD Payment</option>
              <option>Credit</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mode of Transport *
            </label>
            <select
              value={modeOfTransport}
              onChange={(e) => setModeOfTransport(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option>Cargo</option>
              <option>Courier</option>
              <option>Own Vehicle</option>
              <option>Customer will Come and Pick</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Order Details</h2>
          <div className="relative">
            <button
              onClick={() => setShowProductSearch(!showProductSearch)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              Add Product
            </button>

            {showProductSearch && (
              <div className="absolute right-0 mt-2 w-96 bg-white border border-slate-300 rounded-lg shadow-lg p-4 z-10">
                <div className="relative mb-2">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search by product code or name..."
                    className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    autoFocus
                  />
                  <Search className="absolute right-3 top-2.5 w-5 h-5 text-slate-400" />
                </div>

                {filteredProducts.length > 0 && (
                  <div className="max-h-64 overflow-y-auto">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => addProductLine(product)}
                        className="w-full px-3 py-2 text-left hover:bg-blue-50 rounded transition"
                      >
                        <div className="font-medium text-slate-800">
                          {product.product_code} - {product.product_name}
                        </div>
                        <div className="text-sm text-slate-600">
                          Brand: {product.brand_name}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {orderLines.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No products added yet. Click "Add Product" to start adding items.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-2 text-sm font-semibold text-slate-700">Product</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-slate-700">Brand</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-slate-700">Qty</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-slate-700">Rate</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-slate-700">Disc %</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-slate-700">Disc Amt</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-slate-700">Tax %</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-slate-700">Tax Amt</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-slate-700">Total</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-slate-700">Notes</th>
                  <th className="py-3 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {orderLines.map((line) => (
                  <tr key={line.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-2">
                      <div className="text-sm font-medium text-slate-800">{line.product_code}</div>
                      <div className="text-xs text-slate-600">{line.product_name}</div>
                    </td>
                    <td className="py-3 px-2 text-sm text-slate-600">{line.brand_name}</td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.quantity}
                        onChange={(e) => updateOrderLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-right border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unit_price}
                        onChange={(e) => updateOrderLine(line.id, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 text-right border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={line.discount_percentage}
                        onChange={(e) => updateOrderLine(line.id, 'discount_percentage', parseFloat(e.target.value) || 0)}
                        className="w-16 px-2 py-1 text-right border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </td>
                    <td className="py-3 px-2 text-right text-sm text-slate-600">
                      {line.discount_amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-2 text-right text-sm text-slate-600">
                      {line.tax_percentage.toFixed(2)}
                    </td>
                    <td className="py-3 px-2 text-right text-sm text-slate-600">
                      {line.tax_amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-2 text-right text-sm font-semibold text-slate-800">
                      {line.line_total.toFixed(2)}
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="text"
                        value={line.notes}
                        onChange={(e) => updateOrderLine(line.id, 'notes', e.target.value)}
                        placeholder="Notes..."
                        className="w-32 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <button
                        onClick={() => removeOrderLine(line.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                        title="Remove line"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {orderLines.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Order Summary</h2>

          <div className="max-w-md ml-auto space-y-2">
            <div className="flex justify-between py-2 border-b border-slate-200">
              <span className="text-slate-600">Total Before GST:</span>
              <span className="font-semibold text-slate-800">₹{totals.totalBeforeGst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-200">
              <span className="text-slate-600">GST Amount:</span>
              <span className="font-semibold text-slate-800">₹{totals.totalGst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-3 border-t-2 border-slate-300">
              <span className="text-lg font-semibold text-slate-800">Grand Total:</span>
              <span className="text-xl font-bold text-green-600">₹{totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
