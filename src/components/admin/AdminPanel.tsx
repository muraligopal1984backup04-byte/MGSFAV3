import { useState } from 'react';
import { Building2, MapPin as Branch, Users, Tag } from 'lucide-react';
import CompanyManagement from './CompanyManagement';
import BranchManagement from './BranchManagement';
import UserManagement from './UserManagement';
import BrandManagement from './BrandManagement';

type TabType = 'companies' | 'branches' | 'users' | 'brands';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('companies');

  const tabs = [
    { id: 'companies' as TabType, label: 'Companies', icon: Building2 },
    { id: 'branches' as TabType, label: 'Branches', icon: Branch },
    { id: 'users' as TabType, label: 'Users', icon: Users },
    { id: 'brands' as TabType, label: 'Brands', icon: Tag },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Admin Panel</h1>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex space-x-1 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition
                  ${activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50'
                  }
                `}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'companies' && <CompanyManagement />}
          {activeTab === 'branches' && <BranchManagement />}
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'brands' && <BrandManagement />}
        </div>
      </div>
    </div>
  );
}
