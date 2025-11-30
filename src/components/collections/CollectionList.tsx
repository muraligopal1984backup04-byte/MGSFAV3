import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Save, Upload, Plus, X } from 'lucide-react';

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
}

interface CollectionLine {
  id: string;
  invoice_no: string;
  invoice_date: string;
  invoice_amount: number;
  received_amount: number;
  balance_amount: number;
}

export default function CollectionList() {
  const { user, isCustomer } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [selectedBranch, setSelectedBranch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerRoute, setCustomerRoute] = useState('');
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [bankName, setBankName] = useState('');
  const [deductionRemarks, setDeductionRemarks] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const [collectionLines, setCollectionLines] = useState<CollectionLine[]>([{
    id: crypto.randomUUID(),
    invoice_no: '',
    invoice_date: new Date().toISOString().split('T')[0],
    invoice_amount: 0,
    received_amount: 0,
    balance_amount: 0
  }]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadBranches();
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
        .select('id, customer_code, customer_name, mobile_no')
        .eq('id', user.customer_id)
        .maybeSingle();

      if (data) {
        setSelectedCustomer(data);
        const { data: routeData } = await supabase
          .from('route_customer_mapping_tbl')
          .select('route_master_tbl(route_code, route_name)')
          .eq('customer_id', user.customer_id)
          .maybeSingle();

        if (routeData) {
          const route = routeData.route_master_tbl as any;
          setCustomerRoute(`${route?.route_code || ''} - ${route?.route_name || ''}`);
        }
      }
    }
  };

  const searchCustomers = async (search: string) => {
    const { data } = await supabase
      .from('customer_master_tbl')
      .select('id, customer_code, customer_name, mobile_no')
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

  const addNewLine = () => {
    const newLine: CollectionLine = {
      id: crypto.randomUUID(),
      invoice_no: '',
      invoice_date: new Date().toISOString().split('T')[0],
      invoice_amount: 0,
      received_amount: 0,
      balance_amount: 0
    };
    setCollectionLines([...collectionLines, newLine]);
  };

  const updateCollectionLine = (id: string, field: keyof CollectionLine, value: any) => {
    setCollectionLines(collectionLines.map(line => {
      if (line.id === id) {
        const updated = { ...line, [field]: value };
        if (field === 'invoice_amount' || field === 'received_amount') {
          updated.balance_amount = Number(updated.invoice_amount) - Number(updated.received_amount);
        }
        return updated;
      }
      return line;
    }));
  };

  const removeCollectionLine = (id: string) => {
    if (collectionLines.length > 1) {
      setCollectionLines(collectionLines.filter(line => line.id !== id));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `collection-receipts/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('payments')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('payments')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const saveCollection = async () => {
    if (!selectedCustomer) {
      setMessage('Please select a customer');
      return;
    }

    if (amount <= 0) {
      setMessage('Please enter a valid amount');
      return;
    }

    const validLines = collectionLines.filter(line => line.invoice_no.trim() !== '');
    if (validLines.length === 0) {
      setMessage('Please enter at least one collection detail');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const collectionNo = `COL-${Date.now()}`;
      let imageUrl = null;

      if (imageFile) {
        imageUrl = await uploadImage();
      }

      const { data: routeMapping } = await supabase
        .from('route_customer_mapping_tbl')
        .select('route_id')
        .eq('customer_id', selectedCustomer.id)
        .eq('is_active', true)
        .maybeSingle();

      const collectionHeader = {
        collection_no: collectionNo,
        collection_date: collectionDate,
        customer_id: selectedCustomer.id,
        branch_id: selectedBranch || null,
        route_id: routeMapping?.route_id || null,
        field_staff_id: user?.id,
        amount: amount,
        payment_mode: paymentMode.toLowerCase(),
        payment_reference: paymentReference || null,
        cheque_no: chequeNo || null,
        cheque_date: chequeDate || null,
        bank_name: bankName || null,
        collection_status: 'pending',
        notes: deductionRemarks || null,
        collected_by: user?.id,
        image_url: imageUrl,
        image_uploaded_at: imageUrl ? new Date().toISOString() : null
      };

      const { data: collectionData, error: collectionError } = await supabase
        .from('collection_detail_tbl')
        .insert([collectionHeader])
        .select()
        .single();

      if (collectionError) throw collectionError;

      const collectionDetailLines = validLines.map(line => ({
        collection_id: collectionData.id,
        invoice_no: line.invoice_no,
        invoice_date: line.invoice_date,
        invoice_amount: line.invoice_amount,
        paid_amount: line.received_amount,
        balance_amount: line.balance_amount,
        operation: 'subtract',
        remarks: null
      }));

      const { error: detailError } = await supabase
        .from('collection_detail_line_tbl')
        .insert(collectionDetailLines);

      if (detailError) throw detailError;

      setMessage(`Collection ${collectionNo} saved successfully!`);

      setSelectedCustomer(null);
      setCustomerSearch('');
      setCustomerRoute('');
      setAmount(0);
      setPaymentMode('Cash');
      setPaymentReference('');
      setChequeNo('');
      setChequeDate('');
      setBankName('');
      setDeductionRemarks('');
      setImageFile(null);
      setImagePreview('');
      setCollectionLines([{
        id: crypto.randomUUID(),
        invoice_no: '',
        invoice_date: new Date().toISOString().split('T')[0],
        invoice_amount: 0,
        received_amount: 0,
        balance_amount: 0
      }]);

    } catch (error) {
      console.error('Error saving collection:', error);
      setMessage('Error saving collection. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const totalReceived = collectionLines.reduce((sum, line) => sum + line.received_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Collection Entry</h1>
        <button
          onClick={saveCollection}
          disabled={saving || !selectedCustomer}
          className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Collection'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.includes('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Collection Header</h2>

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
                      {customer.mobile_no}
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
              Collection Date *
            </label>
            <input
              type="date"
              value={collectionDate}
              onChange={(e) => setCollectionDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Amount *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Payment Mode *
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option>Cash</option>
              <option>Cheque</option>
              <option>UPI</option>
              <option>NEFT</option>
            </select>
          </div>

          {paymentMode !== 'Cash' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Payment Reference
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Transaction ID / Reference"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          )}

          {paymentMode === 'Cheque' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cheque Number
                </label>
                <input
                  type="text"
                  value={chequeNo}
                  onChange={(e) => setChequeNo(e.target.value)}
                  placeholder="Cheque No"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cheque Date
                </label>
                <input
                  type="date"
                  value={chequeDate}
                  onChange={(e) => setChequeDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Bank Name"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </>
          )}

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Deduction Details / Remarks
            </label>
            <textarea
              value={deductionRemarks}
              onChange={(e) => setDeductionRemarks(e.target.value)}
              placeholder="Enter any deduction details or remarks..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Payment Proof
            </label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition cursor-pointer">
                <Upload className="w-5 h-5" />
                <span>Upload Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="h-12 w-12 rounded object-cover" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Collection Details</h2>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="text-slate-600">Total Amount: <span className="font-semibold text-slate-800">₹{amount.toFixed(2)}</span></span>
              <span className="text-slate-600">Total Received: <span className="font-semibold text-blue-600">₹{totalReceived.toFixed(2)}</span></span>
            </div>
          </div>
          <button
            onClick={addNewLine}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Add Row
          </button>
        </div>

        {collectionLines.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No collection details added yet. Click "Add Row" to add details.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-2 text-sm font-semibold text-slate-700">SI No</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-slate-700">Invoice No</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-slate-700">Invoice Amount</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-slate-700">Received Amount</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-slate-700">Balance</th>
                  <th className="py-3 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {collectionLines.map((line, index) => (
                  <tr key={line.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-2 text-sm text-slate-600">{index + 1}</td>
                    <td className="py-3 px-2">
                      <input
                        type="date"
                        value={line.invoice_date}
                        onChange={(e) => updateCollectionLine(line.id, 'invoice_date', e.target.value)}
                        className="w-36 px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="text"
                        value={line.invoice_no}
                        onChange={(e) => updateCollectionLine(line.id, 'invoice_no', e.target.value)}
                        placeholder="Invoice No"
                        className="w-36 px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.invoice_amount || ''}
                        onChange={(e) => updateCollectionLine(line.id, 'invoice_amount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-32 px-2 py-1 text-right border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.received_amount || ''}
                        onChange={(e) => updateCollectionLine(line.id, 'received_amount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-32 px-2 py-1 text-right border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </td>
                    <td className="py-3 px-2 text-right text-sm font-semibold text-slate-800">
                      ₹{line.balance_amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-2">
                      <button
                        onClick={() => removeCollectionLine(line.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                        title="Remove line"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 font-semibold">
                  <td colSpan={4} className="py-3 px-2 text-right text-slate-700">Totals:</td>
                  <td className="py-3 px-2 text-right text-blue-600">
                    ₹{totalReceived.toFixed(2)}
                  </td>
                  <td className="py-3 px-2 text-right text-slate-800">
                    ₹{collectionLines.reduce((sum, line) => sum + line.balance_amount, 0).toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
