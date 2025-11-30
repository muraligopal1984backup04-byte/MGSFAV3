export default function ReportsDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Reports & Analytics</h1>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Business Intelligence</h2>
          <p className="text-slate-600 mb-6">
            Comprehensive reports with date filters, drill-downs, and CSV exports for data analysis.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Route-wise Sales</h3>
              <p className="text-sm text-blue-700">Sales performance by route</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Field Staff Reports</h3>
              <p className="text-sm text-green-700">Individual performance tracking</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">Brand Analysis</h3>
              <p className="text-sm text-purple-700">Brand-wise sales insights</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <h3 className="font-semibold text-orange-900 mb-2">Customer Reports</h3>
              <p className="text-sm text-orange-700">Purchase patterns and trends</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
