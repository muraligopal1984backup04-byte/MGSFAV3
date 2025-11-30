import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, X, Save, Trash2, Search, Users, FileUp, Download, Upload } from 'lucide-react';

interface Route {
  id: string;
  route_code: string;
  route_name: string;
}

interface User {
  id: string;
  mobile_no: string;
  full_name: string;
  email?: string;
}

interface RouteUserMapping {
  id: string;
  route_id: string;
  user_id: string;
  is_active: boolean;
  route_code: string;
  route_name: string;
  user_mobile: string;
  user_name: string;
}

export default function RouteUserMapping() {
  useAuth();
  const [mappings, setMappings] = useState<RouteUserMapping[]>([]);
  const [filteredMappings, setFilteredMappings] = useState<RouteUserMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [routes, setRoutes] = useState<Route[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchMappings();
    fetchRoutes();
    fetchUsers();
  }, []);

  useEffect(() => {
    filterMappings();
  }, [mappings, searchTerm, filterStatus]);

  const fetchMappings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_route_mapping_tbl')
        .select(`
          id,
          route_id,
          user_id,
          is_active,
          route_master_tbl (route_code, route_name),
          user_master_tbl (mobile_no, full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((item: any) => ({
        id: item.id,
        route_id: item.route_id,
        user_id: item.user_id,
        is_active: item.is_active,
        route_code: item.route_master_tbl?.route_code || '',
        route_name: item.route_master_tbl?.route_name || '',
        user_mobile: item.user_master_tbl?.mobile_no || '',
        user_name: item.user_master_tbl?.full_name || '',
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

  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from('user_master_tbl')
        .select('id, mobile_no, full_name, email')
        .eq('is_active', true)
        .order('full_name');

      if (data) setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
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
          m.user_mobile.toLowerCase().includes(search) ||
          m.user_name.toLowerCase().includes(search)
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
    setSelectedUsers([]);
    setIsActive(true);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleUserSelection = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const mappingsToInsert = selectedUsers.map(userId => ({
        route_id: selectedRoute,
        user_id: userId,
        is_active: isActive,
      }));

      const { error } = await supabase
        .from('user_route_mapping_tbl')
        .insert(mappingsToInsert);

      if (error) throw error;

      await fetchMappings();
      closeModal();
    } catch (error) {
      console.error('Error saving mappings:', error);
      alert('Error saving mappings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mapping?')) return;

    try {
      const { error } = await supabase
        .from('user_route_mapping_tbl')
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
    const headers = ['user_mobile', 'route_name'];
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'route_user_mapping_template.csv';
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
        const userMobile = values[0];
        const routeName = values[1];

        if (!userMobile || !routeName) continue;

        const { data: userRecord } = await supabase
          .from('user_master_tbl')
          .select('id')
          .ilike('mobile_no', userMobile)
          .maybeSingle();

        const { data: route } = await supabase
          .from('route_master_tbl')
          .select('id')
          .ilike('route_name', routeName)
          .maybeSingle();

        if (userRecord && route) {
          const { data: existing } = await supabase
            .from('user_route_mapping_tbl')
            .select('id')
            .eq('user_id', userRecord.id)
            .eq('route_id', route.id)
            .maybeSingle();

          if (!existing) {
            mappingsToInsert.push({
              route_id: route.id,
              user_id: userRecord.id,
              is_active: true,
            });
          }
        }
      }

      if (mappingsToInsert.length > 0) {
        const { error } = await supabase
          .from('user_route_mapping_tbl')
          .insert(mappingsToInsert);

        if (error) throw error;
      }

      alert(`Successfully created ${mappingsToInsert.length} new mappings`);
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
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Route-User/Field Staff Mapping</h1>
        <p className="text-slate-600">Assign multiple field staff to routes</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by route or user..."
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
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">User Mobile</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">User Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMappings.map((mapping) => (
                  <tr key={mapping.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm font-mono text-slate-700">{mapping.route_code}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{mapping.route_name}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">{mapping.user_mobile}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{mapping.user_name}</td>
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
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-lg font-medium">No mappings found</p>
                <p className="text-sm mt-1">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-800">Add Route-User Mapping</h3>
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Users/Field Staff * (Select multiple)
                  </label>
                  <div className="border border-slate-300 rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
                    {users.map(user => (
                      <label key={user.id} className="flex items-center gap-2 hover:bg-slate-50 p-2 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleUserSelection(user.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">
                          {user.full_name} ({user.mobile_no})
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedUsers.length} user(s) selected
                  </p>
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
                  disabled={saving || selectedUsers.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : `Save ${selectedUsers.length} Mapping(s)`}
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
              <h3 className="text-xl font-semibold text-slate-800">Bulk Upload Route-User Mappings</h3>
              <button onClick={() => setShowBulkUpload(false)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Instructions:</h4>
                <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                  <li>Download the CSV template</li>
                  <li>Fill in user_mobile and route_name columns</li>
                  <li>Upload the completed CSV file</li>
                  <li>Multiple users can be assigned to the same route</li>
                  <li>Duplicate mappings will be skipped automatically</li>
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
