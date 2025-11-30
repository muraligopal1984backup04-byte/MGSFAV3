import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FileUp, Download, Upload, AlertCircle } from 'lucide-react';

export default function InvoiceUpload() {
  const { user } = useAuth();
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: number;
    failed: number;
    reference: string;
    errors: string[];
  } | null>(null);

  const downloadTemplate = () => {
    const headers = [
      'invoice_no',
      'invoice_date',
      'order_no',
      'branch_name',
      'customer_name',
      'product_name',
      'quantity',
      'unit_rate',
      'disc_percentage',
      'taxable_value',
      'gst_rate',
      'inclusive_tax_amt'
    ];
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invoice_upload_template.csv';
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
    setUploadResult(null);

    try {
      const text = await bulkFile.text();
      const lines = text.split('\n');

      const bulkRef = generateBulkUploadRef();
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      const invoiceGroups: { [key: string]: any[] } = {};

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = lines[i].split(',').map(v => v.trim());
        const [
          invoiceNo,
          invoiceDate,
          orderNo,
          branchName,
          customerName,
          productName,
          quantity,
          unitRate,
          discPercentage,
          taxableValue,
          gstRate,
          inclusiveTaxAmt
        ] = values;

        if (!invoiceNo || !customerName || !productName) {
          errors.push(`Line ${i + 1}: Missing required fields (invoice_no, customer_name, or product_name)`);
          failedCount++;
          continue;
        }

        if (!invoiceGroups[invoiceNo]) {
          invoiceGroups[invoiceNo] = [];
        }

        invoiceGroups[invoiceNo].push({
          invoiceDate,
          orderNo,
          branchName,
          customerName,
          productName,
          quantity: parseFloat(quantity) || 0,
          unitRate: parseFloat(unitRate) || 0,
          discPercentage: parseFloat(discPercentage) || 0,
          taxableValue: parseFloat(taxableValue) || 0,
          gstRate: parseFloat(gstRate) || 0,
          inclusiveTaxAmt: parseFloat(inclusiveTaxAmt) || 0,
        });
      }

      for (const [invoiceNo, items] of Object.entries(invoiceGroups)) {
        try {
          const firstItem = items[0];

          const { data: customerData } = await supabase
            .from('customer_master_tbl')
            .select('id')
            .ilike('customer_name', firstItem.customerName)
            .maybeSingle();

          if (!customerData) {
            errors.push(`Invoice ${invoiceNo}: Customer "${firstItem.customerName}" not found`);
            failedCount += items.length;
            continue;
          }

          let branchId = null;
          if (firstItem.branchName) {
            const { data: branchData } = await supabase
              .from('branch_master_tbl')
              .select('id')
              .ilike('branch_name', firstItem.branchName)
              .maybeSingle();

            if (branchData) {
              branchId = branchData.id;
            }
          }

          let orderId = null;
          let fieldStaffId = null;
          let routeId = null;

          if (firstItem.orderNo) {
            const { data: orderData } = await supabase
              .from('sale_order_header_tbl')
              .select('id, created_by, route_id, field_staff_id')
              .eq('order_no', firstItem.orderNo)
              .maybeSingle();

            if (orderData) {
              orderId = orderData.id;
              fieldStaffId = orderData.field_staff_id || orderData.created_by;
              routeId = orderData.route_id;
            }
          }

          const totalAmount = items.reduce((sum, item) => sum + item.taxableValue, 0);
          const taxAmount = items.reduce((sum, item) => sum + item.inclusiveTaxAmt, 0);
          const netAmount = totalAmount + taxAmount;

          const { data: invoiceHeader, error: headerError } = await supabase
            .from('sales_inv_hdr_tbl')
            .insert([{
              invoice_no: invoiceNo,
              invoice_date: firstItem.invoiceDate || new Date().toISOString().split('T')[0],
              order_id: orderId,
              order_no: firstItem.orderNo || null,
              customer_id: customerData.id,
              branch_id: branchId,
              invoice_status: 'confirmed',
              total_amount: totalAmount,
              discount_amount: 0,
              tax_amount: taxAmount,
              net_amount: netAmount,
              created_by: user?.id,
              route_id: routeId,
              field_staff_id: fieldStaffId,
            }])
            .select()
            .single();

          if (headerError) throw headerError;

          const detailLines = [];
          for (let lineNo = 0; lineNo < items.length; lineNo++) {
            const item = items[lineNo];

            const { data: productData } = await supabase
              .from('product_master_tbl')
              .select('id, brand_id, gst_rate')
              .ilike('product_name', item.productName)
              .maybeSingle();

            if (!productData) {
              errors.push(`Invoice ${invoiceNo}, Line ${lineNo + 1}: Product "${item.productName}" not found`);
              continue;
            }

            const lineTotal = item.taxableValue + item.inclusiveTaxAmt;

            detailLines.push({
              invoice_id: invoiceHeader.id,
              line_no: lineNo + 1,
              product_id: productData.id,
              brand_id: productData.brand_id,
              quantity: item.quantity,
              unit_price: item.unitRate,
              discount_percentage: item.discPercentage,
              discount_amount: (item.unitRate * item.quantity * item.discPercentage) / 100,
              tax_percentage: item.gstRate || productData.gst_rate,
              tax_amount: item.inclusiveTaxAmt,
              line_total: lineTotal,
            });
          }

          if (detailLines.length > 0) {
            const { error: detailError } = await supabase
              .from('sales_inv_dtl_tbl')
              .insert(detailLines);

            if (detailError) throw detailError;
          }

          successCount += items.length;
        } catch (error: any) {
          console.error(`Error processing invoice ${invoiceNo}:`, error);
          errors.push(`Invoice ${invoiceNo}: ${error.message}`);
          failedCount += items.length;
        }
      }

      await supabase.from('bulk_upload_ref_tbl').insert([{
        reference_no: bulkRef,
        upload_type: 'invoices',
        total_records: successCount + failedCount,
        success_records: successCount,
        failed_records: failedCount,
        uploaded_by: user?.id,
        file_name: bulkFile.name,
        status: 'active',
      }]);

      setUploadResult({
        success: successCount,
        failed: failedCount,
        reference: bulkRef,
        errors,
      });
    } catch (error) {
      console.error('Error uploading invoices:', error);
      alert('Error uploading invoices. Please check your file format.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Invoice Bulk Upload</h1>
        <p className="text-slate-600">Upload multiple invoices from CSV file</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Upload Invoice Data</h2>
              <p className="text-sm text-slate-600">Import invoices via CSV file</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">CSV Format:</h4>
              <p className="text-xs text-blue-800 font-mono mb-2">
                invoice_no, invoice_date, order_no, branch_name, customer_name, product_name, quantity, unit_rate, disc_percentage, taxable_value, gst_rate, inclusive_tax_amt
              </p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Field staff will be fetched from the order if order_no is provided</li>
                <li>• All invoices get a unique reference number for tracking</li>
                <li>• Invoice date format: YYYY-MM-DD</li>
                <li>• taxable_value = (qty × unit_rate) - discount</li>
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
              {uploading ? 'Uploading...' : 'Upload Invoices'}
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
              <p className="text-slate-600">Processing invoices...</p>
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

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-sm text-slate-700 font-medium mb-1">Reference Number:</p>
                <p className="text-lg font-mono font-bold text-slate-900">{uploadResult.reference}</p>
                <p className="text-xs text-slate-500 mt-1">Use this reference to track or delete this upload batch</p>
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
