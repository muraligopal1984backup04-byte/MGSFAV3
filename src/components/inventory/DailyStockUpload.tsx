import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Upload, Download, FileUp, AlertCircle } from 'lucide-react';

interface Branch {
  id: string;
  branch_name: string;
}

export default function DailyStockUpload() {
  const { user } = useAuth();
  const [, setBranches] = useState<Branch[]>([]);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    const { data } = await supabase
      .from('branch_master_tbl')
      .select('id, branch_name')
      .eq('is_active', true)
      .order('branch_name');

    if (data) {
      setBranches(data);
    }
  };

  const downloadTemplate = () => {
    const headers = ['branch_name', 'product_code', 'quantity', 'uploaded_date'];
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'daily_stock_upload_template.csv';
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

      const stockRecords = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = lines[i].split(',').map(v => v.trim());
        const [branchName, productCode, quantity, uploadedDate] = values;

        if (!branchName || !productCode || !quantity) {
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

        const { data: productData } = await supabase
          .from('product_master_tbl')
          .select('id')
          .ilike('product_code', productCode)
          .maybeSingle();

        if (!productData) {
          errors.push(`Line ${i + 1}: Product "${productCode}" not found`);
          failedCount++;
          continue;
        }

        stockRecords.push({
          branch_id: branchData.id,
          product_id: productData.id,
          quantity: parseFloat(quantity),
          uploaded_date: uploadedDate || new Date().toISOString().split('T')[0],
          uploaded_by: user?.id,
        });
      }

      if (stockRecords.length > 0) {
        const { error } = await supabase
          .from('daily_stock_tbl')
          .insert(stockRecords);

        if (error) {
          errors.push(`Database error: ${error.message}`);
          failedCount += stockRecords.length;
        } else {
          successCount = stockRecords.length;
        }
      }

      setUploadResult({
        success: successCount,
        failed: failedCount,
        errors,
      });
    } catch (error) {
      console.error('Error uploading stock:', error);
      alert('Error uploading stock. Please check your file format.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Daily Stock Upload</h1>
        <p className="text-slate-600">Upload daily stock quantities by branch and product</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Upload Stock Data</h2>
              <p className="text-sm text-slate-600">Import stock via CSV file</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">CSV Format:</h4>
              <p className="text-xs text-blue-800 font-mono mb-2">
                branch_name, product_code, quantity, uploaded_date
              </p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• uploaded_date format: YYYY-MM-DD (optional, defaults to today)</li>
                <li>• Branch and product must exist in the system</li>
                <li>• Quantity should be numeric</li>
              </ul>
            </div>

            <button
              onClick={downloadTemplate}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
            >
              <Download className="w-5 h-5" />
              Download CSV Template
            </button>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select CSV File *
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {bulkFile && (
                <p className="text-sm text-slate-600 mt-2">
                  Selected: {bulkFile.name}
                </p>
              )}
            </div>

            <button
              onClick={handleBulkUpload}
              disabled={!bulkFile || uploading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-5 h-5" />
              {uploading ? 'Uploading...' : 'Upload Stock Data'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Upload Results</h2>

          {!uploadResult && !uploading && (
            <div className="text-center py-12 text-slate-400">
              <AlertCircle className="w-16 h-16 mx-auto mb-4" />
              <p>No upload performed yet</p>
              <p className="text-sm mt-1">Results will appear here after upload</p>
            </div>
          )}

          {uploading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Processing stock data...</p>
            </div>
          )}

          {uploadResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-700 font-medium">Successful</p>
                  <p className="text-3xl font-bold text-green-600">{uploadResult.success}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700 font-medium">Failed</p>
                  <p className="text-3xl font-bold text-red-600">{uploadResult.failed}</p>
                </div>
              </div>

              {uploadResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto">
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
  );
}
