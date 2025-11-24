import { useState } from 'react';
import { Home as HomeIcon, Wallet, CreditCard, List, Settings as SettingsIcon } from 'lucide-react';
import Home from '../views/Home';
import Budget from '../views/Budget';
import Accounts from '../views/Accounts';
import Transactions from '../views/Transactions';
import Settings from '../views/Settings';

type Tab = 'home' | 'budget' | 'accounts' | 'transactions' | 'settings';

export default function Layout() {
  const [activeTab, setActiveTab] = useState<Tab>('home');

  const tabs = [
    { id: 'home' as Tab, label: 'Home', icon: HomeIcon },
    { id: 'budget' as Tab, label: 'Budget', icon: Wallet },
    { id: 'accounts' as Tab, label: 'Accounts', icon: CreditCard },
    { id: 'transactions' as Tab, label: 'Transactions', icon: List },
    { id: 'settings' as Tab, label: 'Settings', icon: SettingsIcon },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Home />;
      case 'budget':
        return <Budget />;
      case 'accounts':
        return <Accounts />;
      case 'transactions':
        return <Transactions />;
      case 'settings':
        return <Settings />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Main Content Area with safe-area padding */}
      <main className="h-full overflow-y-auto">
        {renderContent()}
      </main>

      {/* Bottom Navigation Bar - Fixed */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom">
        <div className="flex justify-around items-center h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs mt-1 font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
