import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit, Package, X, Save, Trash2, Search, FileUp, Download, Upload } from 'lucide-react';

interface Product {
  id: string;
  product_code: string;
  product_name: string;
  description?: string;
  brand_id?: string;
  category?: string;
  unit_of_measure?: string;
  hsn_code?: string;
  gst_rate: number;
  qty_in_ltr?: number;
  is_active: boolean;
  bulk_upload_ref?: string;
  brand?: { brand_name: string };
}

interface Brand {
  id: string;
  brand_name: string;
}

interface ProductFormData {
  product_code: string;
  product_name: string;
  description: string;
  brand_id: string;
  category: string;
  unit_of_measure: string;
  hsn_code: string;
  gst_rate: number;
  qty_in_ltr: number;
  is_active: boolean;
}

export default function ProductList() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<ProductFormData>({
    product_code: '',
    product_name: '',
    description: '',
    brand_id: '',
    category: '',
    unit_of_measure: 'pcs',
    hsn_code: '',
    gst_rate: 18,
    qty_in_ltr: 0,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm]);

  const fetchData = async () => {
    try {
      const [productsData, brandsData] = await Promise.all([
        supabase
          .from('product_master_tbl')
          .select(`
            id,
            product_code,
            product_name,
            description,
            brand_id,
            category,
            unit_of_measure,
            hsn_code,
            gst_rate,
            qty_in_ltr,
            is_active,
            bulk_upload_ref,
            brand_master_tbl (brand_name)
          `)
          .order('product_name'),
        supabase
          .from('brand_master_tbl')
          .select('id, brand_name')
          .eq('is_active', true)
          .order('brand_name')
      ]);

      if (productsData.data) {
        const formattedProducts = productsData.data.map((p: any) => ({
          ...p,
          brand: p.brand_master_tbl
        }));
        setProducts(formattedProducts);
      }

      if (brandsData.data) {
        setBrands(brandsData.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    if (!searchTerm) {
      setFilteredProducts(products);
      return;
    }

    const search = searchTerm.toLowerCase();
    const filtered = products.filter(
      (p) =>
        p.product_code.toLowerCase().includes(search) ||
        p.product_name.toLowerCase().includes(search) ||
        p.brand?.brand_name?.toLowerCase().includes(search) ||
        p.category?.toLowerCase().includes(search)
    );
    setFilteredProducts(filtered);
  };

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        product_code: product.product_code,
        product_name: product.product_name,
        description: product.description || '',
        brand_id: product.brand_id || '',
        category: product.category || '',
        unit_of_measure: product.unit_of_measure || 'pcs',
        hsn_code: product.hsn_code || '',
        gst_rate: product.gst_rate || 18,
        qty_in_ltr: product.qty_in_ltr || 0,
        is_active: product.is_active,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        product_code: '',
        product_name: '',
        description: '',
        brand_id: '',
        category: '',
        unit_of_measure: 'pcs',
        hsn_code: '',
        gst_rate: 18,
        qty_in_ltr: 0,
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('product_master_tbl')
          .update(formData)
          .eq('id', editingProduct.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('product_master_tbl')
          .insert([formData]);

        if (error) throw error;
      }

      await fetchData();
      closeModal();
    } catch (error: any) {
      console.error('Error saving product:', error);
      if (error.code === '23505') {
        alert('A product with this code already exists');
      } else {
        alert('Error saving product. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('product_master_tbl')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product. Please try again.');
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'product_code',
      'product_name',
      'brand_name',
      'category',
      'unit_of_measure',
      'hsn_code',
      'gst_rate',
      'qty_in_ltr',
      'description'
    ];
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_upload_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateBulkUploadRef = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `BU-${dateStr}-${randomNum}`;
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      alert('Please select a CSV file');
      return;
    }

    setUploading(true);

    try {
      const text = await bulkFile.text();
      const lines = text.split('\n');

      const bulkRef = generateBulkUploadRef();
      let successCount = 0;
      let failedCount = 0;

      const productsToInsert = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = lines[i].split(',').map(v => v.trim());
        const [productCode, productName, brandName, category, unitOfMeasure, hsnCode, gstRate, qtyInLtr, description] = values;

        if (!productCode || !productName) {
          failedCount++;
          continue;
        }

        let brandId = null;
        if (brandName) {
          const { data: brandData } = await supabase
            .from('brand_master_tbl')
            .select('id')
            .ilike('brand_name', brandName)
            .maybeSingle();

          if (brandData) {
            brandId = brandData.id;
          }
        }

        productsToInsert.push({
          product_code: productCode,
          product_name: productName,
          brand_id: brandId,
          category: category || null,
          unit_of_measure: unitOfMeasure || 'pcs',
          hsn_code: hsnCode || null,
          gst_rate: parseFloat(gstRate) || 18,
          qty_in_ltr: parseFloat(qtyInLtr) || 0,
          description: description || null,
          bulk_upload_ref: bulkRef,
          is_active: true,
        });
      }

      if (productsToInsert.length > 0) {
        const { data, error } = await supabase
          .from('product_master_tbl')
          .insert(productsToInsert)
          .select();

        if (error) {
          failedCount = productsToInsert.length;
        } else {
          successCount = data?.length || 0;
        }
      }

      await supabase.from('bulk_upload_ref_tbl').insert([{
        reference_no: bulkRef,
        upload_type: 'products',
        total_records: productsToInsert.length,
        success_records: successCount,
        failed_records: failedCount,
        uploaded_by: user?.id,
        file_name: bulkFile.name,
        status: 'active',
      }]);

      alert(`Upload completed!\nSuccess: ${successCount}\nFailed: ${failedCount}\nReference: ${bulkRef}`);
      setShowBulkUpload(false);
      setBulkFile(null);
      await fetchData();
    } catch (error) {
      console.error('Error uploading products:', error);
      alert('Error uploading products. Please check your file format.');
    } finally {
      setUploading(false);
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
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Product Management</h1>
        <p className="text-slate-600">Manage your product catalog</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products by code, name, brand..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkUpload(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <FileUp className="w-4 h-4" />
                <span className="hidden sm:inline">Bulk Upload</span>
              </button>
              <button
                onClick={() => openModal()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Product</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="text-sm text-slate-600 mb-4">
            Showing {filteredProducts.length} of {products.length} products
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Code</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Product Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Brand</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">HSN Code</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">GST %</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">UOM</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Qty (Ltr)</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm font-mono text-slate-700">{product.product_code}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{product.product_name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{product.brand?.brand_name || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{product.hsn_code || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{product.gst_rate}%</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{product.unit_of_measure || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{product.qty_in_ltr || '-'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          product.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openModal(product)}
                          className="p-1 hover:bg-blue-50 text-blue-600 rounded transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-1 hover:bg-red-50 text-red-600 rounded transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-lg font-medium">No products found</p>
                <p className="text-sm mt-1">Try adjusting your search</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-800">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Product Code *</label>
                  <input
                    type="text"
                    value={formData.product_code}
                    onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
                  <select
                    value={formData.brand_id}
                    onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Brand</option>
                    {brands.map(brand => (
                      <option key={brand.id} value={brand.id}>{brand.brand_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={formData.hsn_code}
                    onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">GST Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.gst_rate}
                    onChange={(e) => setFormData({ ...formData, gst_rate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unit of Measurement</label>
                  <select
                    value={formData.unit_of_measure}
                    onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="ltr">Liter (ltr)</option>
                    <option value="box">Box</option>
                    <option value="carton">Carton</option>
                    <option value="dozen">Dozen</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Qty in Liters (for Oil)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.qty_in_ltr}
                    onChange={(e) => setFormData({ ...formData, qty_in_ltr: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                  Active
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Product'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-800">Bulk Upload Products</h3>
              <button onClick={() => setShowBulkUpload(false)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">CSV Format:</h4>
                <p className="text-sm text-blue-800 mb-2">product_code, product_name, brand_name, category, unit_of_measure, hsn_code, gst_rate, qty_in_ltr, description</p>
                <p className="text-xs text-blue-700">All records will be assigned a unique reference number for tracking.</p>
              </div>

              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Upload CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleBulkUpload}
                  disabled={!bulkFile || uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  onClick={() => setShowBulkUpload(false)}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
