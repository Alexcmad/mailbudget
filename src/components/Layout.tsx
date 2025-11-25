import { useState, useEffect } from 'react';
import { Home as HomeIcon, Wallet, CreditCard, List, Settings as SettingsIcon, AlertTriangle } from 'lucide-react';
import Home from '../views/Home';
import Budget from '../views/Budget';
import Accounts from '../views/Accounts';
import Transactions from '../views/Transactions';
import Settings from '../views/Settings';
import FlaggedTransactionsModal from './FlaggedTransactionsModal';
import { useStore } from '../store/useStore';
import { hasUnresolvedFlags } from '../services/transactionFlags';

type Tab = 'home' | 'budget' | 'accounts' | 'transactions' | 'settings';

export default function Layout() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showFlaggedModal, setShowFlaggedModal] = useState(false);
  const { transactions } = useStore();

  // Check for flagged transactions on mount and when transactions change
  useEffect(() => {
    const flaggedCount = transactions.filter(hasUnresolvedFlags).length;
    if (flaggedCount > 0) {
      // Show modal automatically when user logs in and there are flagged transactions
      // Only show once per session (you might want to track this in localStorage)
      const hasShownThisSession = sessionStorage.getItem('flaggedModalShown');
      if (!hasShownThisSession) {
        setShowFlaggedModal(true);
        sessionStorage.setItem('flaggedModalShown', 'true');
      }
    }
  }, [transactions]);

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

  const flaggedCount = transactions.filter(hasUnresolvedFlags).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Flagged Transactions Badge */}
      {flaggedCount > 0 && (
        <div className="fixed top-4 right-4 z-40">
          <button
            onClick={() => setShowFlaggedModal(true)}
            className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full p-3 shadow-lg flex items-center gap-2 transition-all hover:scale-105"
            title={`${flaggedCount} flagged transaction${flaggedCount !== 1 ? 's' : ''}`}
          >
            <AlertTriangle className="w-5 h-5" />
            {flaggedCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {flaggedCount > 9 ? '9+' : flaggedCount}
              </span>
            )}
          </button>
        </div>
      )}

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
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors relative ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs mt-1 font-medium">{tab.label}</span>
                {/* Show badge on Transactions tab if there are flagged transactions */}
                {tab.id === 'transactions' && flaggedCount > 0 && (
                  <span className="absolute top-0 right-1/4 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {flaggedCount > 9 ? '9+' : flaggedCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <FlaggedTransactionsModal
        isOpen={showFlaggedModal}
        onClose={() => setShowFlaggedModal(false)}
      />
    </div>
  );
}
