import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit, Users, X, Save, Trash2, Search, MapPin, Upload, FileUp, Download } from 'lucide-react';

interface Customer {
  id: string;
  customer_code: string;
  customer_name: string;
  shop_name?: string;
  owner_name?: string;
  billing_address_1?: string;
  billing_address_2?: string;
  billing_address_3?: string;
  billing_city?: string;
  district?: string;
  mobile_no?: string;
  phone_no_2?: string;
  gst_no?: string;
  image_url_1?: string;
  image_url_2?: string;
  image_url_3?: string;
  latitude?: number;
  longitude?: number;
  route_code?: string;
  field_staff_name?: string;
  is_active: boolean;
  created_at: string;
}

interface CustomerFormData {
  customer_code: string;
  customer_name: string;
  shop_name: string;
  owner_name: string;
  billing_address_1: string;
  billing_address_2: string;
  billing_address_3: string;
  billing_city: string;
  district: string;
  mobile_no: string;
  phone_no_2: string;
  gst_no: string;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
}

interface Route {
  id: string;
  route_code: string;
  route_name: string;
}

export default function CustomerList() {
  const { user, isCustomer } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState<CustomerFormData>({
    customer_code: '',
    customer_name: '',
    shop_name: '',
    owner_name: '',
    billing_address_1: '',
    billing_address_2: '',
    billing_address_3: '',
    billing_city: '',
    district: '',
    mobile_no: '',
    phone_no_2: '',
    gst_no: '',
    latitude: null,
    longitude: null,
    is_active: true,
  });

  const [images, setImages] = useState<{
    image1: File | null;
    image2: File | null;
    image3: File | null;
  }>({
    image1: null,
    image2: null,
    image3: null,
  });

  const [imagePreviews, setImagePreviews] = useState<{
    image1: string;
    image2: string;
    image3: string;
  }>({
    image1: '',
    image2: '',
    image3: '',
  });

  const [selectedRoute, setSelectedRoute] = useState('');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchRoutes();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm, filterStatus]);

  const fetchCustomers = async () => {
    try {
      let query = supabase
        .from('customer_master_tbl')
        .select('*');

      if (isCustomer() && user?.customer_id) {
        query = query.eq('id', user.customer_id);
      }

      const { data, error } = await query.order('customer_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
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

      if (data) {
        setRoutes(data);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  };

  const filterCustomers = () => {
    let filtered = customers;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.customer_name.toLowerCase().includes(search) ||
          c.customer_code.toLowerCase().includes(search) ||
          c.mobile_no?.toLowerCase().includes(search) ||
          c.shop_name?.toLowerCase().includes(search)
      );
    }

    if (filterStatus === 'active') {
      filtered = filtered.filter((c) => c.is_active);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter((c) => !c.is_active);
    }

    setFilteredCustomers(filtered);
  };

  const getCurrentLocation = () => {
    setGettingLocation(true);

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to retrieve your location');
        setGettingLocation(false);
      }
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, imageNumber: 1 | 2 | 3) => {
    const file = e.target.files?.[0];
    if (file) {
      setImages({ ...images, [`image${imageNumber}`]: file });

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews({ ...imagePreviews, [`image${imageNumber}`]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File, path: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('customers')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('customers')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const openModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        customer_code: customer.customer_code,
        customer_name: customer.customer_name,
        shop_name: customer.shop_name || '',
        owner_name: customer.owner_name || '',
        billing_address_1: customer.billing_address_1 || '',
        billing_address_2: customer.billing_address_2 || '',
        billing_address_3: customer.billing_address_3 || '',
        billing_city: customer.billing_city || '',
        district: customer.district || '',
        mobile_no: customer.mobile_no || '',
        phone_no_2: customer.phone_no_2 || '',
        gst_no: customer.gst_no || '',
        latitude: customer.latitude || null,
        longitude: customer.longitude || null,
        is_active: customer.is_active,
      });

      setImagePreviews({
        image1: customer.image_url_1 || '',
        image2: customer.image_url_2 || '',
        image3: customer.image_url_3 || '',
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        customer_code: '',
        customer_name: '',
        shop_name: '',
        owner_name: '',
        billing_address_1: '',
        billing_address_2: '',
        billing_address_3: '',
        billing_city: '',
        district: '',
        mobile_no: '',
        phone_no_2: '',
        gst_no: '',
        latitude: null,
        longitude: null,
        is_active: true,
      });

      setImages({ image1: null, image2: null, image3: null });
      setImagePreviews({ image1: '', image2: '', image3: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setSelectedRoute('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let imageUrl1 = editingCustomer?.image_url_1 || null;
      let imageUrl2 = editingCustomer?.image_url_2 || null;
      let imageUrl3 = editingCustomer?.image_url_3 || null;

      if (images.image1) {
        imageUrl1 = await uploadImage(images.image1, 'customer-images');
      }
      if (images.image2) {
        imageUrl2 = await uploadImage(images.image2, 'customer-images');
      }
      if (images.image3) {
        imageUrl3 = await uploadImage(images.image3, 'customer-images');
      }

      const customerData = {
        ...formData,
        image_url_1: imageUrl1,
        image_url_2: imageUrl2,
        image_url_3: imageUrl3,
        created_by: user?.id,
      };

      if (editingCustomer) {
        const { error } = await supabase
          .from('customer_master_tbl')
          .update(customerData)
          .eq('id', editingCustomer.id);

        if (error) throw error;
      } else {
        const { data: newCustomer, error } = await supabase
          .from('customer_master_tbl')
          .insert([customerData])
          .select()
          .single();

        if (error) throw error;

        if (newCustomer && formData.mobile_no) {
          const defaultPassword = 'customer123';
          const passwordHash = btoa(defaultPassword);

          await supabase
            .from('user_master_tbl')
            .insert([{
              mobile_no: formData.mobile_no,
              full_name: formData.customer_name,
              email: null,
              password_hash: passwordHash,
              role: 'customer',
              is_active: false,
              created_by: user?.id,
            }]);
        }

        if (selectedRoute && newCustomer) {
          await supabase
            .from('route_customer_mapping_tbl')
            .insert([{
              route_id: selectedRoute,
              customer_id: newCustomer.id,
              is_active: true,
            }]);
        }
      }

      await fetchCustomers();
      closeModal();
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Error saving customer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      const { error } = await supabase
        .from('customer_master_tbl')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Error deleting customer. Please try again.');
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'customer_code',
      'customer_name',
      'shop_name',
      'owner_name',
      'billing_address_1',
      'billing_address_2',
      'billing_address_3',
      'billing_city',
      'district',
      'mobile_no',
      'phone_no_2',
      'gst_no',
      'route_code',
    ];

    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer_bulk_upload_template.csv';
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
      const headers = lines[0].split(',').map(h => h.trim());

      const customers = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = lines[i].split(',').map(v => v.trim());
        const customer: any = {};

        headers.forEach((header, index) => {
          customer[header] = values[index] || null;
        });

        customer.created_by = user?.id;
        customer.is_active = true;

        customers.push(customer);
      }

      if (customers.length > 0) {
        const { data: insertedCustomers, error: insertError } = await supabase
          .from('customer_master_tbl')
          .insert(customers)
          .select();

        if (insertError) throw insertError;

        if (insertedCustomers) {
          const routeMappings = [];

          for (let i = 0; i < insertedCustomers.length; i++) {
            const routeCode = customers[i].route_code;

            if (routeCode) {
              const { data: route } = await supabase
                .from('route_master_tbl')
                .select('id')
                .eq('route_code', routeCode)
                .maybeSingle();

              if (route) {
                routeMappings.push({
                  route_id: route.id,
                  customer_id: insertedCustomers[i].id,
                  is_active: true,
                });
              }
            }
          }

          if (routeMappings.length > 0) {
            await supabase
              .from('route_customer_mapping_tbl')
              .insert(routeMappings);
          }
        }

        alert(`Successfully uploaded ${customers.length} customers`);
        setShowBulkUpload(false);
        setBulkFile(null);
        await fetchCustomers();
      }
    } catch (error) {
      console.error('Error uploading customers:', error);
      alert('Error uploading customers. Please check your file format.');
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
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Customer Management</h1>
        <p className="text-slate-600">Manage your customer database with complete details</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search customers by name, code, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              {!isCustomer() && (
                <>
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
                    <span className="hidden sm:inline">Add Customer</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="text-sm text-slate-600 mb-4">
            Showing {filteredCustomers.length} of {customers.length} customers
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Code</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Customer Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Shop Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Contact</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">City</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm font-mono text-slate-700">{customer.customer_code}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{customer.customer_name}</div>
                      {customer.owner_name && (
                        <div className="text-xs text-slate-500">{customer.owner_name}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{customer.shop_name || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{customer.mobile_no || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{customer.billing_city || '-'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          customer.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {customer.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {!isCustomer() && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openModal(customer)}
                            className="p-1 hover:bg-blue-50 text-blue-600 rounded transition"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="p-1 hover:bg-red-50 text-red-600 rounded transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredCustomers.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-lg font-medium">No customers found</p>
                <p className="text-sm mt-1">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-800">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Customer Code *
                      </label>
                      <input
                        type="text"
                        value={formData.customer_code}
                        onChange={(e) => setFormData({ ...formData, customer_code: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Customer Name *
                      </label>
                      <input
                        type="text"
                        value={formData.customer_name}
                        onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Shop Name
                      </label>
                      <input
                        type="text"
                        value={formData.shop_name}
                        onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Owner Name
                      </label>
                      <input
                        type="text"
                        value={formData.owner_name}
                        onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Mobile No *
                      </label>
                      <input
                        type="tel"
                        value={formData.mobile_no}
                        onChange={(e) => setFormData({ ...formData, mobile_no: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Phone No 2
                      </label>
                      <input
                        type="tel"
                        value={formData.phone_no_2}
                        onChange={(e) => setFormData({ ...formData, phone_no_2: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        GST No
                      </label>
                      <input
                        type="text"
                        value={formData.gst_no}
                        onChange={(e) => setFormData({ ...formData, gst_no: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {!editingCustomer && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Route
                        </label>
                        <select
                          value={selectedRoute}
                          onChange={(e) => setSelectedRoute(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select Route</option>
                          {routes.map(route => (
                            <option key={route.id} value={route.id}>
                              {route.route_code} - {route.route_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Billing Address</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Address Line 1
                      </label>
                      <input
                        type="text"
                        value={formData.billing_address_1}
                        onChange={(e) => setFormData({ ...formData, billing_address_1: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Address Line 2
                      </label>
                      <input
                        type="text"
                        value={formData.billing_address_2}
                        onChange={(e) => setFormData({ ...formData, billing_address_2: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Address Line 3
                      </label>
                      <input
                        type="text"
                        value={formData.billing_address_3}
                        onChange={(e) => setFormData({ ...formData, billing_address_3: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={formData.billing_city}
                        onChange={(e) => setFormData({ ...formData, billing_city: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        District
                      </label>
                      <input
                        type="text"
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Geolocation</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.latitude || ''}
                        onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || null })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        readOnly
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.longitude || ''}
                        onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || null })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        readOnly
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        &nbsp;
                      </label>
                      <button
                        type="button"
                        onClick={getCurrentLocation}
                        disabled={gettingLocation}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition disabled:opacity-50"
                      >
                        <MapPin className="w-4 h-4" />
                        {gettingLocation ? 'Getting Location...' : 'Get Location'}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Images</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((num) => (
                      <div key={num}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Image {num}
                        </label>
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition cursor-pointer">
                            <Upload className="w-4 h-4" />
                            <span>Upload</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageChange(e, num as 1 | 2 | 3)}
                              className="hidden"
                            />
                          </label>
                          {imagePreviews[`image${num}` as keyof typeof imagePreviews] && (
                            <img
                              src={imagePreviews[`image${num}` as keyof typeof imagePreviews]}
                              alt={`Preview ${num}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
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
                  {saving ? 'Saving...' : 'Save Customer'}
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
              <h3 className="text-xl font-semibold text-slate-800">Bulk Upload Customers</h3>
              <button onClick={() => setShowBulkUpload(false)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Instructions:</h4>
                <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                  <li>Download the CSV template</li>
                  <li>Fill in customer details</li>
                  <li>Upload the completed CSV file</li>
                  <li>Route will be automatically assigned based on route_code column</li>
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
