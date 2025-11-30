import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Upload, Download, Filter, FileUp, AlertCircle } from 'lucide-react';

interface OutstandingRecord {
  id: string;
  as_on_date: string;
  branch_name: string;
  customer_name: string;
  customer_code: string;
  dr_amount: number;
  cr_amount: number;
  balance: number;
  less_than_45: number;
  greater_than_45: number;
  greater_than_60: number;
  greater_than_90: number;
  greater_than_120: number;
}

interface Branch {
  id: string;
  branch_name: string;
}

interface Customer {
  id: string;
  customer_name: string;
}

export default function AgeWiseOutstanding() {
  const { user } = useAuth();
  const [records, setRecords] = useState<OutstandingRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<OutstandingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [branchFilter, setBranchFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [ageFilter, setAgeFilter] = useState('all');

  const [showUpload, setShowUpload] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  useEffect(() => {
    fetchFilters();
    fetchRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [records, branchFilter, customerFilter, ageFilter]);

  const fetchFilters = async () => {
    const [branchesData, customersData] = await Promise.all([
      supabase.from('branch_master_tbl').select('id, branch_name').eq('is_active', true).order('branch_name'),
      supabase.from('customer_master_tbl').select('id, customer_name').eq('is_active', true).order('customer_name'),
    ]);

    if (branchesData.data) setBranches(branchesData.data);
    if (customersData.data) setCustomers(customersData.data);
  };

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('age_wise_outstanding_tbl')
        .select(`
          id,
          as_on_date,
          dr_amount,
          cr_amount,
          balance,
          less_than_45,
          greater_than_45,
          greater_than_60,
          greater_than_90,
          greater_than_120,
          branch_master_tbl!age_wise_outstanding_tbl_branch_id_fkey (branch_name),
          customer_master_tbl!age_wise_outstanding_tbl_customer_id_fkey (customer_name, customer_code)
        `)
        .order('as_on_date', { ascending: false });

      if (error) throw error;

      const formatted = data?.map((record: any) => ({
        id: record.id,
        as_on_date: record.as_on_date,
        branch_name: record.branch_master_tbl?.branch_name || '-',
        customer_name: record.customer_master_tbl?.customer_name || '-',
        customer_code: record.customer_master_tbl?.customer_code || '-',
        dr_amount: record.dr_amount,
        cr_amount: record.cr_amount,
        balance: record.balance,
        less_than_45: record.less_than_45,
        greater_than_45: record.greater_than_45,
        greater_than_60: record.greater_than_60,
        greater_than_90: record.greater_than_90,
        greater_than_120: record.greater_than_120,
      })) || [];

      setRecords(formatted);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = [...records];

    if (branchFilter !== 'all') {
      const branch = branches.find(b => b.id === branchFilter);
      if (branch) {
        filtered = filtered.filter(r => r.branch_name === branch.branch_name);
      }
    }

    if (customerFilter !== 'all') {
      const customer = customers.find(c => c.id === customerFilter);
      if (customer) {
        filtered = filtered.filter(r => r.customer_name === customer.customer_name);
      }
    }

    if (ageFilter !== 'all') {
      filtered = filtered.filter(r => {
        switch (ageFilter) {
          case 'less_than_45':
            return r.less_than_45 > 0;
          case 'greater_than_45':
            return r.greater_than_45 > 0;
          case 'greater_than_60':
            return r.greater_than_60 > 0;
          case 'greater_than_90':
            return r.greater_than_90 > 0;
          case 'greater_than_120':
            return r.greater_than_120 > 0;
          default:
            return true;
        }
      });
    }

    setFilteredRecords(filtered);
  };

  const downloadTemplate = () => {
    const headers = [
      'as_on_date',
      'branch_name',
      'customer_name',
      'dr_amount',
      'cr_amount',
      'balance',
      'less_than_45',
      'greater_than_45',
      'greater_than_60',
      'greater_than_90',
      'greater_than_120'
    ];
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'age_wise_outstanding_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      alert('Please select a CSV file');
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const text = await bulkFile.text();
      const lines = text.split('\n');

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      const outstandingRecords = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = lines[i].split(',').map(v => v.trim());
        const [asOnDate, branchName, customerName, dr, cr, bal, lt45, gt45, gt60, gt90, gt120] = values;

        if (!asOnDate || !branchName || !customerName) {
          errors.push(`Line ${i + 1}: Missing required fields`);
          failedCount++;
          continue;
        }

        const { data: branchData } = await supabase
          .from('branch_master_tbl')
          .select('id')
          .ilike('branch_name', branchName)
          .maybeSingle();

        if (!branchData) {
          errors.push(`Line ${i + 1}: Branch "${branchName}" not found`);
          failedCount++;
          continue;
        }

        const { data: customerData } = await supabase
          .from('customer_master_tbl')
          .select('id')
          .ilike('customer_name', customerName)
          .maybeSingle();

        if (!customerData) {
          errors.push(`Line ${i + 1}: Customer "${customerName}" not found`);
          failedCount++;
          continue;
        }

        outstandingRecords.push({
          as_on_date: asOnDate,
          branch_id: branchData.id,
          customer_id: customerData.id,
          dr_amount: parseFloat(dr) || 0,
          cr_amount: parseFloat(cr) || 0,
          balance: parseFloat(bal) || 0,
          less_than_45: parseFloat(lt45) || 0,
          greater_than_45: parseFloat(gt45) || 0,
          greater_than_60: parseFloat(gt60) || 0,
          greater_than_90: parseFloat(gt90) || 0,
          greater_than_120: parseFloat(gt120) || 0,
          uploaded_by: user?.id,
        });
      }

      if (outstandingRecords.length > 0) {
        const { error } = await supabase
          .from('age_wise_outstanding_tbl')
          .insert(outstandingRecords);

        if (error) {
          errors.push(`Database error: ${error.message}`);
          failedCount += outstandingRecords.length;
        } else {
          successCount = outstandingRecords.length;
        }
      }

      setUploadResult({
        success: successCount,
        failed: failedCount,
        errors,
      });

      if (successCount > 0) {
        await fetchRecords();
      }
    } catch (error) {
      console.error('Error uploading outstanding:', error);
      alert('Error uploading data. Please check your file format.');
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Age-Wise Outstanding Report</h1>
          <p className="text-slate-600">View and manage age-wise outstanding receivables</p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <FileUp className="w-4 h-4" />
          {showUpload ? 'Hide Upload' : 'Upload Data'}
        </button>
      </div>

      {showUpload && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Upload Outstanding Data</h3>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">CSV Format:</h4>
                  <p className="text-xs text-blue-800 font-mono mb-2">
                    as_on_date, branch_name, customer_name, dr_amount, cr_amount, balance, less_than_45, greater_than_45, greater_than_60, greater_than_90, greater_than_120
                  </p>
                </div>

                <button
                  onClick={downloadTemplate}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>

                <div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <button
                  onClick={handleBulkUpload}
                  disabled={!bulkFile || uploading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Upload Results</h3>
              {!uploadResult && !uploading && (
                <div className="text-center py-12 text-slate-400">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm">No upload performed yet</p>
                </div>
              )}

              {uploading && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              )}

              {uploadResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-700 font-medium">Success</p>
                      <p className="text-2xl font-bold text-green-600">{uploadResult.success}</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-700 font-medium">Failed</p>
                      <p className="text-2xl font-bold text-red-600">{uploadResult.failed}</p>
                    </div>
                  </div>

                  {uploadResult.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                      <p className="text-sm text-red-700 font-medium mb-2">Errors:</p>
                      <ul className="text-xs text-red-600 space-y-1">
                        {uploadResult.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Customers</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>{customer.customer_name}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <select
                value={ageFilter}
                onChange={(e) => setAgeFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Ages</option>
                <option value="less_than_45">Less Than 45 Days</option>
                <option value="greater_than_45">45-60 Days</option>
                <option value="greater_than_60">60-90 Days</option>
                <option value="greater_than_90">90-120 Days</option>
                <option value="greater_than_120">Greater Than 120 Days</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="text-sm text-slate-600 mb-4">
            Showing {filteredRecords.length} of {records.length} records
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">As On Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Branch</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Customer</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Dr</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Cr</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Balance</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">&lt; 45</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">45-60</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">60-90</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">90-120</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">&gt; 120</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {new Date(record.as_on_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{record.branch_name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{record.customer_name}</td>
                    <td className="py-3 px-4 text-sm text-right text-slate-600">
                      ₹{record.dr_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-slate-600">
                      ₹{record.cr_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-slate-700">
                      ₹{record.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-slate-600">
                      ₹{record.less_than_45.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-slate-600">
                      ₹{record.greater_than_45.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-slate-600">
                      ₹{record.greater_than_60.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-slate-600">
                      ₹{record.greater_than_90.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-slate-600">
                      ₹{record.greater_than_120.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
      </div>
    </div>
  );
}
