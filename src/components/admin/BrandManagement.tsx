import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit, Tag, X, Save, Trash2 } from 'lucide-react';

interface Brand {
  id: string;
  brand_code: string;
  brand_name: string;
  description?: string;
  is_active: boolean;
}

interface BrandFormData {
  brand_code: string;
  brand_name: string;
  description: string;
  is_active: boolean;
}

export default function BrandManagement() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [formData, setFormData] = useState<BrandFormData>({
    brand_code: '',
    brand_name: '',
    description: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brand_master_tbl')
        .select('*')
        .order('brand_name');

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (brand?: Brand) => {
    if (brand) {
      setEditingBrand(brand);
      setFormData({
        brand_code: brand.brand_code,
        brand_name: brand.brand_name,
        description: brand.description || '',
        is_active: brand.is_active,
      });
    } else {
      setEditingBrand(null);
      setFormData({
        brand_code: '',
        brand_name: '',
        description: '',
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBrand(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingBrand) {
        const { error } = await supabase
          .from('brand_master_tbl')
          .update(formData)
          .eq('id', editingBrand.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('brand_master_tbl')
          .insert([formData]);

        if (error) throw error;
      }

      await fetchBrands();
      closeModal();
    } catch (error) {
      console.error('Error saving brand:', error);
      alert('Error saving brand. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this brand?')) return;

    try {
      const { error } = await supabase
        .from('brand_master_tbl')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchBrands();
    } catch (error) {
      console.error('Error deleting brand:', error);
      alert('Error deleting brand. Please try again.');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading brands...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Tag className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-slate-800">Brands</h2>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Add Brand
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Code</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Name</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Description</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => (
              <tr key={brand.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4 text-sm text-slate-700">{brand.brand_code}</td>
                <td className="py-3 px-4 text-sm font-medium text-slate-800">{brand.brand_name}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{brand.description || '-'}</td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      brand.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {brand.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openModal(brand)}
                      className="p-1 hover:bg-blue-50 text-blue-600 rounded transition"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(brand.id)}
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

        {brands.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No brands found. Add your first brand to get started.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-800">
                {editingBrand ? 'Edit Brand' : 'Add New Brand'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Brand Code *
                </label>
                <input
                  type="text"
                  value={formData.brand_code}
                  onChange={(e) => setFormData({ ...formData, brand_code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Brand Name *
                </label>
                <input
                  type="text"
                  value={formData.brand_name}
                  onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
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
                  {saving ? 'Saving...' : 'Save Brand'}
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
    </div>
  );
}
