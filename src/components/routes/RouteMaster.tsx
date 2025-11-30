import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit, X, Save, Trash2, Search, MapPin } from 'lucide-react';

interface Route {
  id: string;
  route_code: string;
  route_name: string;
  route_description?: string;
  is_active: boolean;
  created_at: string;
}

interface RouteFormData {
  route_code: string;
  route_name: string;
  route_description: string;
  is_active: boolean;
}

export default function RouteMaster() {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState<RouteFormData>({
    route_code: '',
    route_name: '',
    route_description: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRoutes();
  }, []);

  useEffect(() => {
    filterRoutes();
  }, [routes, searchTerm, filterStatus]);

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('route_master_tbl')
        .select('*')
        .order('route_name');

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error('Error fetching routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterRoutes = () => {
    let filtered = routes;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.route_name.toLowerCase().includes(search) ||
          r.route_code.toLowerCase().includes(search)
      );
    }

    if (filterStatus === 'active') {
      filtered = filtered.filter((r) => r.is_active);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter((r) => !r.is_active);
    }

    setFilteredRoutes(filtered);
  };

  const openModal = (route?: Route) => {
    if (route) {
      setEditingRoute(route);
      setFormData({
        route_code: route.route_code,
        route_name: route.route_name,
        route_description: route.route_description || '',
        is_active: route.is_active,
      });
    } else {
      setEditingRoute(null);
      setFormData({
        route_code: '',
        route_name: '',
        route_description: '',
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRoute(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const routeData = {
        ...formData,
        created_by: user?.id,
      };

      if (editingRoute) {
        const { error } = await supabase
          .from('route_master_tbl')
          .update(routeData)
          .eq('id', editingRoute.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('route_master_tbl')
          .insert([routeData]);

        if (error) throw error;
      }

      await fetchRoutes();
      closeModal();
    } catch (error) {
      console.error('Error saving route:', error);
      alert('Error saving route. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this route?')) return;

    try {
      const { error } = await supabase
        .from('route_master_tbl')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchRoutes();
    } catch (error) {
      console.error('Error deleting route:', error);
      alert('Error deleting route. Please try again.');
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
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Route Master</h1>
        <p className="text-slate-600">Manage delivery and sales routes</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search routes by name or code..."
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
                onClick={() => openModal()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Route</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="text-sm text-slate-600 mb-4">
            Showing {filteredRoutes.length} of {routes.length} routes
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Route Code</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Route Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Description</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutes.map((route) => (
                  <tr key={route.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm font-mono text-slate-700">{route.route_code}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{route.route_name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{route.route_description || '-'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          route.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {route.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openModal(route)}
                          className="p-1 hover:bg-blue-50 text-blue-600 rounded transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(route.id)}
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

            {filteredRoutes.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <MapPin className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-lg font-medium">No routes found</p>
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
              <h3 className="text-xl font-semibold text-slate-800">
                {editingRoute ? 'Edit Route' : 'Add New Route'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Route Code *
                  </label>
                  <input
                    type="text"
                    value={formData.route_code}
                    onChange={(e) => setFormData({ ...formData, route_code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Route Name *
                  </label>
                  <input
                    type="text"
                    value={formData.route_name}
                    onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.route_description}
                    onChange={(e) => setFormData({ ...formData, route_description: e.target.value })}
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
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Route'}
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
    </div>
  );
}
