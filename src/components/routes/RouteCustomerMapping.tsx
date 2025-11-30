import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, X, Save, Trash2, Search, Link2, FileUp, Download, Upload } from 'lucide-react';

interface Route {
  id: string;
  route_code: string;
  route_name: string;
}

interface Customer {
  id: string;
  customer_code: string;
  customer_name: string;
}

interface RouteCustomerMapping {
  id: string;
  route_id: string;
  customer_id: string;
  is_active: boolean;
  route_code: string;
  route_name: string;
  customer_code: string;
  customer_name: string;
}

export default function RouteCustomerMapping() {
  useAuth();
  const [mappings, setMappings] = useState<RouteCustomerMapping[]>([]);
  const [filteredMappings, setFilteredMappings] = useState<RouteCustomerMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [routes, setRoutes] = useState<Route[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchMappings();
    fetchRoutes();
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterMappings();
  }, [mappings, searchTerm, filterStatus]);

  const fetchMappings = async () => {
    try {
      const { data, error } = await supabase
        .from('route_customer_mapping_tbl')
        .select(`
          id,
          route_id,
          customer_id,
          is_active,
          route_master_tbl (route_code, route_name),
          customer_master_tbl (customer_code, customer_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((item: any) => ({
        id: item.id,
        route_id: item.route_id,
        customer_id: item.customer_id,
        is_active: item.is_active,
        route_code: item.route_master_tbl?.route_code || '',
        route_name: item.route_master_tbl?.route_name || '',
        customer_code: item.customer_master_tbl?.customer_code || '',
        customer_name: item.customer_master_tbl?.customer_name || '',
      })) || [];

      setMappings(formattedData);
    } catch (error) {
      console.error('Error fetching mappings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutes = async () => {
    try {
      const { data } = await supabase
        .from('route_master_tbl')
        .select('id, route_code, route_name')
        .eq('is_active', true)
        .order('route_name');

      if (data) setRoutes(data);
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data } = await supabase
        .from('customer_master_tbl')
        .select('id, customer_code, customer_name')
        .eq('is_active', true)
        .order('customer_name');

      if (data) setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const filterMappings = () => {
    let filtered = mappings;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.route_name.toLowerCase().includes(search) ||
          m.route_code.toLowerCase().includes(search) ||
          m.customer_name.toLowerCase().includes(search) ||
          m.customer_code.toLowerCase().includes(search)
      );
    }

    if (filterStatus === 'active') {
      filtered = filtered.filter((m) => m.is_active);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter((m) => !m.is_active);
    }

    setFilteredMappings(filtered);
  };

  const openModal = () => {
    setSelectedRoute('');
    setSelectedCustomer('');
    setIsActive(true);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const existingMapping = await supabase
        .from('route_customer_mapping_tbl')
        .select('id')
        .eq('customer_id', selectedCustomer)
        .maybeSingle();

      if (existingMapping.data) {
        const { error } = await supabase
          .from('route_customer_mapping_tbl')
          .update({
            route_id: selectedRoute,
            is_active: isActive,
          })
          .eq('id', existingMapping.data.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('route_customer_mapping_tbl')
          .insert([{
            route_id: selectedRoute,
            customer_id: selectedCustomer,
            is_active: isActive,
          }]);

        if (error) throw error;
      }

      await fetchMappings();
      closeModal();
    } catch (error) {
      console.error('Error saving mapping:', error);
      alert('Error saving mapping. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mapping?')) return;

    try {
      const { error } = await supabase
        .from('route_customer_mapping_tbl')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchMappings();
    } catch (error) {
      console.error('Error deleting mapping:', error);
      alert('Error deleting mapping. Please try again.');
    }
  };

  const downloadTemplate = () => {
    const headers = ['customer_name', 'route_name'];
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'route_customer_mapping_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
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

      const mappingsToInsert = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = lines[i].split(',').map(v => v.trim());
        const customerName = values[0];
        const routeName = values[1];

        if (!customerName || !routeName) continue;

        const { data: customer } = await supabase
          .from('customer_master_tbl')
          .select('id')
          .ilike('customer_name', customerName)
          .maybeSingle();

        const { data: route } = await supabase
          .from('route_master_tbl')
          .select('id')
          .ilike('route_name', routeName)
          .maybeSingle();

        if (customer && route) {
          const { data: existing } = await supabase
            .from('route_customer_mapping_tbl')
            .select('id')
            .eq('customer_id', customer.id)
            .maybeSingle();

          if (existing) {
            await supabase
              .from('route_customer_mapping_tbl')
              .update({ route_id: route.id, is_active: true })
              .eq('id', existing.id);
          } else {
            mappingsToInsert.push({
              route_id: route.id,
              customer_id: customer.id,
              is_active: true,
            });
          }
        }
      }

      if (mappingsToInsert.length > 0) {
        const { error } = await supabase
          .from('route_customer_mapping_tbl')
          .insert(mappingsToInsert);

        if (error) throw error;
      }

      alert(`Successfully processed ${lines.length - 1} mappings`);
      setShowBulkUpload(false);
      setBulkFile(null);
      await fetchMappings();
    } catch (error) {
      console.error('Error uploading mappings:', error);
      alert('Error uploading mappings. Please check your file format.');
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
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Route-Customer Mapping</h1>
        <p className="text-slate-600">Link customers to routes (one customer per route)</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by route or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
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
                <span className="hidden sm:inline">Add Mapping</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="text-sm text-slate-600 mb-4">
            Showing {filteredMappings.length} of {mappings.length} mappings
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Route Code</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Route Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Customer Code</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Customer Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMappings.map((mapping) => (
                  <tr key={mapping.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm font-mono text-slate-700">{mapping.route_code}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{mapping.route_name}</td>
                    <td className="py-3 px-4 text-sm font-mono text-slate-700">{mapping.customer_code}</td>
                    <td className="py-3 px-4 text-sm text-slate-800">{mapping.customer_name}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          mapping.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {mapping.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleDelete(mapping.id)}
                        className="p-1 hover:bg-red-50 text-red-600 rounded transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredMappings.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Link2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-lg font-medium">No mappings found</p>
                <p className="text-sm mt-1">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-800">Add Route-Customer Mapping</h3>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Route *
                  </label>
                  <select
                    value={selectedRoute}
                    onChange={(e) => setSelectedRoute(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Route</option>
                    {routes.map(route => (
                      <option key={route.id} value={route.id}>
                        {route.route_code} - {route.route_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Customer *
                  </label>
                  <select
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.customer_code} - {customer.customer_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                    Active
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Mapping'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
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
              <h3 className="text-xl font-semibold text-slate-800">Bulk Upload Route-Customer Mappings</h3>
              <button onClick={() => setShowBulkUpload(false)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Instructions:</h4>
                <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                  <li>Download the CSV template</li>
                  <li>Fill in customer_name and route_name columns</li>
                  <li>Upload the completed CSV file</li>
                  <li>If a customer already has a route, it will be updated</li>
                </ul>
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
