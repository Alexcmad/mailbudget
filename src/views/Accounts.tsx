import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Wallet, PiggyBank, CreditCard, TrendingUp } from 'lucide-react';
import AddAccountModal from '../components/AddAccountModal';

export default function Accounts() {
  const { accounts } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'checking':
        return 'Checking';
      case 'savings':
        return 'Savings';
      case 'credit':
        return 'Credit Card';
      default:
        return type;
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'checking':
        return <Wallet className="w-5 h-5" />;
      case 'savings':
        return <PiggyBank className="w-5 h-5" />;
      case 'credit':
        return <CreditCard className="w-5 h-5" />;
      default:
        return <Wallet className="w-5 h-5" />;
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="p-6 min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Accounts Yet</h2>
          <p className="text-gray-500 mb-6">Add your first account to start tracking your finances.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors text-white py-3 rounded-xl flex items-center justify-center font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Account
          </button>
        </div>
        <AddAccountModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-6">
      {/* Header Section */}
      <div className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-md px-4 py-4 border-b border-gray-200 md:border-none md:static md:bg-transparent">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900">Accounts</h2>
              <p className="text-sm text-gray-500 hidden sm:block">
                Track all your financial accounts
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center shadow-sm shadow-blue-200 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Account
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 group"
            >
              {/* Top Row: Icon & Name + Balance Badge */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    account.cleared_balance >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-500'
                  }`}>
                    {getAccountIcon(account.type)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-800 truncate text-base">{account.name}</h3>
                    <p className="text-xs text-gray-400 truncate">{getAccountTypeLabel(account.type)}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Balance</span>
                  <div className={`px-3 py-1.5 rounded-full text-sm font-bold tabular-nums ${
                    account.cleared_balance >= 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {formatCurrency(account.cleared_balance)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AddAccountModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}
