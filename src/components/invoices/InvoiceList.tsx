export default function InvoiceList() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Invoices</h1>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🧾</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Invoice Management</h2>
          <p className="text-slate-600 mb-6">
            Generate invoices from orders, bulk upload via CSV, and manage invoice lifecycle.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Order Conversion</h3>
              <p className="text-sm text-blue-700">Convert sales orders to invoices automatically</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Bulk Upload</h3>
              <p className="text-sm text-green-700">Upload multiple invoices via CSV file</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">Tax Compliance</h3>
              <p className="text-sm text-purple-700">GST-compliant invoice generation</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
