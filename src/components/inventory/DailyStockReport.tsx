import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Filter, DollarSign, Calendar } from 'lucide-react';

interface StockRecord {
  id: string;
  quantity: number;
  uploaded_date: string;
  branch_name: string;
  product_code: string;
  product_name: string;
  category: string;
  unit_of_measure: string;
  hsn_code: string;
  gst_rate: number;
  brand_name: string;
  price: number | null;
}

interface Branch {
  id: string;
  branch_name: string;
}

interface Brand {
  id: string;
  brand_name: string;
}

export default function DailyStockReport() {
  const [stockRecords, setStockRecords] = useState<StockRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<StockRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUploadDate, setLastUploadDate] = useState<string>('');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const [branchFilter, setBranchFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [productCodeFilter, setProductCodeFilter] = useState('');
  const [productNameFilter, setProductNameFilter] = useState('');

  const [fetchingPrice, setFetchingPrice] = useState<string | null>(null);

  useEffect(() => {
    fetchFilters();
    fetchStockRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [stockRecords, branchFilter, brandFilter, productCodeFilter, productNameFilter]);

  const fetchFilters = async () => {
    const [branchesData, brandsData] = await Promise.all([
      supabase.from('branch_master_tbl').select('id, branch_name').eq('is_active', true).order('branch_name'),
      supabase.from('brand_master_tbl').select('id, brand_name').eq('is_active', true).order('brand_name'),
    ]);

    if (branchesData.data) setBranches(branchesData.data);
    if (brandsData.data) setBrands(brandsData.data);
  };

  const fetchStockRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_stock_tbl')
        .select(`
          id,
          quantity,
          uploaded_date,
          branch_master_tbl!daily_stock_tbl_branch_id_fkey (branch_name),
          product_master_tbl!daily_stock_tbl_product_id_fkey (
            product_code,
            product_name,
            category,
            unit_of_measure,
            hsn_code,
            gst_rate,
            brand_master_tbl (brand_name)
          )
        `)
        .order('uploaded_date', { ascending: false });

      if (error) throw error;

      const formatted = data?.map((record: any) => ({
        id: record.id,
        quantity: record.quantity,
        uploaded_date: record.uploaded_date,
        branch_name: record.branch_master_tbl?.branch_name || '-',
        product_code: record.product_master_tbl?.product_code || '-',
        product_name: record.product_master_tbl?.product_name || '-',
        category: record.product_master_tbl?.category || '-',
        unit_of_measure: record.product_master_tbl?.unit_of_measure || '-',
        hsn_code: record.product_master_tbl?.hsn_code || '-',
        gst_rate: record.product_master_tbl?.gst_rate || 0,
        brand_name: record.product_master_tbl?.brand_master_tbl?.brand_name || '-',
        price: null,
      })) || [];

      setStockRecords(formatted);

      if (data && data.length > 0) {
        setLastUploadDate(data[0].uploaded_date);
      }
    } catch (error) {
      console.error('Error fetching stock records:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = [...stockRecords];

    if (branchFilter !== 'all') {
      const branch = branches.find(b => b.id === branchFilter);
      if (branch) {
        filtered = filtered.filter(r => r.branch_name === branch.branch_name);
      }
    }

    if (brandFilter !== 'all') {
      const brand = brands.find(b => b.id === brandFilter);
      if (brand) {
        filtered = filtered.filter(r => r.brand_name === brand.brand_name);
      }
    }

    if (productCodeFilter) {
      const search = productCodeFilter.toLowerCase();
      filtered = filtered.filter(r => r.product_code.toLowerCase().includes(search));
    }

    if (productNameFilter) {
      const search = productNameFilter.toLowerCase();
      filtered = filtered.filter(r => r.product_name.toLowerCase().includes(search));
    }

    setFilteredRecords(filtered);
  };

  const fetchPrice = async (recordId: string, productCode: string) => {
    setFetchingPrice(recordId);

    try {
      const { data: productData } = await supabase
        .from('product_master_tbl')
        .select('id')
        .eq('product_code', productCode)
        .maybeSingle();

      if (!productData) {
        alert('Product not found');
        return;
      }

      const { data: priceData } = await supabase
        .from('product_price_tbl')
        .select('price')
        .eq('product_id', productData.id)
        .eq('is_active', true)
        .maybeSingle();

      if (priceData) {
        setStockRecords(prev =>
          prev.map(r => (r.id === recordId ? { ...r, price: priceData.price } : r))
        );
      } else {
        alert('No active price found for this product');
      }
    } catch (error) {
      console.error('Error fetching price:', error);
      alert('Error fetching price');
    } finally {
      setFetchingPrice(null);
    }
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
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Daily Stock Report</h1>
        <p className="text-slate-600">View and filter daily stock records</p>
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
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Brands</option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>{brand.brand_name}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Product Code"
                value={productCodeFilter}
                onChange={(e) => setProductCodeFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Product Name"
                value={productNameFilter}
                onChange={(e) => setProductNameFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="text-sm text-slate-600 mb-4">
            Showing {filteredRecords.length} of {stockRecords.length} records
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Branch</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Brand</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Product Code</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Product Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Category</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">HSN</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Qty</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">UOM</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">GST%</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Price</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-600">{record.branch_name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{record.brand_name}</td>
                    <td className="py-3 px-4 text-sm font-mono text-slate-700">{record.product_code}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{record.product_name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{record.category}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{record.hsn_code}</td>
                    <td className="py-3 px-4 text-sm text-right text-slate-600">{record.quantity}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{record.unit_of_measure}</td>
                    <td className="py-3 px-4 text-sm text-right text-slate-600">{record.gst_rate}%</td>
                    <td className="py-3 px-4 text-sm text-right">
                      {record.price !== null ? (
                        <span className="font-medium text-slate-700">₹{record.price.toFixed(2)}</span>
                      ) : (
                        <button
                          onClick={() => fetchPrice(record.id, record.product_code)}
                          disabled={fetchingPrice === record.id}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition disabled:opacity-50"
                        >
                          <DollarSign className="w-3 h-3" />
                          {fetchingPrice === record.id ? 'Loading...' : 'Get Price'}
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {new Date(record.uploaded_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredRecords.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <p className="text-lg font-medium">No records found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>

        {lastUploadDate && (
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="w-4 h-4" />
              <span>Last uploaded: {new Date(lastUploadDate).toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
