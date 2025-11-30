import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Download, Filter, Award, TrendingUp, Package } from 'lucide-react';

interface BrandSales {
  brand_id: string;
  brand_name: string;
  total_quantity: number;
  total_amount: number;
  product_count: number;
  avg_price: number;
}

interface Branch {
  id: string;
  branch_name: string;
}

export default function BrandWiseInsights() {
  const [, setBrandSales] = useState<BrandSales[]>([]);
  const [filteredSales, setFilteredSales] = useState<BrandSales[]>([]);
  const [loading, setLoading] = useState(true);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchBranches();
    fetchBrandSales();
  }, [branchFilter, dateFrom, dateTo]);

  const fetchBranches = async () => {
    const { data } = await supabase
      .from('branch_master_tbl')
      .select('id, branch_name')
      .eq('is_active', true)
      .order('branch_name');

    if (data) setBranches(data);
  };

  const fetchBrandSales = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('invoice_detail_tbl')
        .select(`
          quantity,
          unit_price,
          line_total,
          brand_id,
          product_id,
          brand_master_tbl!invoice_detail_tbl_brand_id_fkey (brand_name),
          invoice_header_tbl!invoice_detail_tbl_invoice_id_fkey (invoice_date, branch_id)
        `);

      const { data } = await query;

      if (data) {
        const filteredData = data.filter((item: any) => {
          const invoiceDate = item.invoice_header_tbl?.invoice_date;
          const branchId = item.invoice_header_tbl?.branch_id;

          if (branchFilter !== 'all' && branchId !== branchFilter) {
            return false;
          }

          if (dateFrom && invoiceDate < dateFrom) {
            return false;
          }

          if (dateTo && invoiceDate > dateTo) {
            return false;
          }

          return true;
        });

        const brandMap = new Map<string, any>();

        filteredData.forEach((detail: any) => {
          const brandId = detail.brand_id;
          if (!brandId) return;

          if (!brandMap.has(brandId)) {
            brandMap.set(brandId, {
              brand_id: brandId,
              brand_name: detail.brand_master_tbl?.brand_name || '-',
              total_quantity: 0,
              total_amount: 0,
              products: new Set(),
              prices: [],
            });
          }

          const brand = brandMap.get(brandId);
          brand.total_quantity += detail.quantity || 0;
          brand.total_amount += detail.line_total || 0;
          brand.products.add(detail.product_id);
          brand.prices.push(detail.unit_price || 0);
        });

        const salesData = Array.from(brandMap.values()).map(b => ({
          brand_id: b.brand_id,
          brand_name: b.brand_name,
          total_quantity: b.total_quantity,
          total_amount: b.total_amount,
          product_count: b.products.size,
          avg_price: b.prices.length > 0 ? b.prices.reduce((a: number, b: number) => a + b, 0) / b.prices.length : 0,
        }));

        salesData.sort((a, b) => b.total_amount - a.total_amount);

        setBrandSales(salesData);
        setFilteredSales(salesData);
      }
    } catch (error) {
      console.error('Error fetching brand sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Brand Name', 'Products', 'Total Quantity', 'Total Sales', 'Avg Price'
    ];

    const rows = filteredSales.map(brand => [
      brand.brand_name,
      brand.product_count,
      brand.total_quantity,
      brand.total_amount.toFixed(2),
      brand.avg_price.toFixed(2),
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brand_wise_insights_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totals = {
    totalQuantity: filteredSales.reduce((sum, b) => sum + b.total_quantity, 0),
    totalAmount: filteredSales.reduce((sum, b) => sum + b.total_amount, 0),
    totalProducts: filteredSales.reduce((sum, b) => sum + b.product_count, 0),
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
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Brand-Wise Insights</h1>
          <p className="text-slate-600">Performance analytics across product brands</p>
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
            <p className="text-blue-100 text-sm">Total Brands</p>
            <Award className="w-5 h-5 text-blue-200" />
          </div>
          <p className="text-3xl font-bold">{filteredSales.length}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-green-100 text-sm">Total Products</p>
            <Package className="w-5 h-5 text-green-200" />
          </div>
          <p className="text-3xl font-bold">{totals.totalProducts}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-purple-100 text-sm">Units Sold</p>
            <TrendingUp className="w-5 h-5 text-purple-200" />
          </div>
          <p className="text-3xl font-bold">{totals.totalQuantity.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-orange-100 text-sm">Total Revenue</p>
          </div>
          <p className="text-3xl font-bold">₹{(totals.totalAmount / 1000).toFixed(1)}K</p>
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
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Rank</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Brand Name</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Products</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Quantity Sold</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Total Sales</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Avg Price</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Market Share</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((brand, index) => {
                  const marketShare = (brand.total_amount / totals.totalAmount) * 100;

                  return (
                    <tr key={brand.brand_id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-600">#{index + 1}</td>
                      <td className="py-3 px-4 text-sm font-medium text-slate-700">{brand.brand_name}</td>
                      <td className="py-3 px-4 text-sm text-right text-slate-600">{brand.product_count}</td>
                      <td className="py-3 px-4 text-sm text-right text-slate-600">{brand.total_quantity.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-slate-700">
                        ₹{brand.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-slate-600">
                        ₹{brand.avg_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${marketShare}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium text-slate-600">{marketShare.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredSales.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <p className="text-lg font-medium">No brand data found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
