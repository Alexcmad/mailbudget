import { useStore } from '../store/useStore';
import { TrendingUp, Wallet, AlertCircle, CheckCircle2, Clock, ArrowRight, CreditCard } from 'lucide-react';
import type { Category, Account, Transaction } from '../types/index.ts';

export default function Home() {
  const { categories, accounts, transactions } = useStore();

  // Calculate total balance across all accounts
  const totalBalance = accounts.reduce((sum, account) => sum + account.cleared_balance, 0);

  // Get recent transactions (last 5 on mobile, 10 on desktop)
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  // Calculate monthly totals
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthTransactions = transactions.filter(t => {
    const txDate = new Date(t.date);
    return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
  });
  const thisMonthTotal = thisMonthTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Budget insights
  const overbudgetCategories = categories.filter(cat => cat.available < 0);
  const warningCategories = categories.filter(cat => {
    const percentUsed = cat.assigned > 0 ? (Math.abs(cat.activity) / cat.assigned) * 100 : 0;
    return cat.available >= 0 && percentUsed >= 80 && percentUsed < 100;
  });
  const healthyCategories = categories.filter(cat => {
    const percentUsed = cat.assigned > 0 ? (Math.abs(cat.activity) / cat.assigned) * 100 : 0;
    return cat.available > 0 && percentUsed < 80;
  });

  // Calculate total assigned and total activity
  const totalAssigned = categories.reduce((sum, cat) => sum + cat.assigned, 0);
  const totalActivity = categories.reduce((sum, cat) => sum + Math.abs(cat.activity), 0);
  const totalAvailable = categories.reduce((sum, cat) => sum + cat.available, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-6">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-white text-2xl font-extrabold mb-1">Welcome Back</h1>
              <p className="text-blue-100 text-sm">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <button className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Total Balance Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
            <p className="text-blue-100 text-sm font-medium mb-2">Total Balance</p>
            <div className="mb-4">
              <h2 className={`text-4xl font-extrabold tabular-nums ${
                totalBalance >= 0 ? 'text-white' : 'text-red-200'
              }`}>
                {formatCurrency(totalBalance)}
              </h2>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-200" />
                <span className="text-blue-100">{accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-200" />
                <span className="text-blue-100">{transactions.length} transactions</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Responsive Grid */}
      <div className="max-w-7xl mx-auto px-4 mt-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Budget Insights (Full width on mobile, 2 columns on desktop) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Budget Insights */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">Budget Insights</h3>

              {/* Overbudget Categories */}
              {overbudgetCategories.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
                  <div className="bg-red-50 px-4 py-3 flex items-center gap-2 border-b border-red-100">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <h4 className="font-bold text-red-900">Overbudget ({overbudgetCategories.length})</h4>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {overbudgetCategories.map((cat) => (
                      <div key={cat.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0 mr-4">
                          <p className="font-medium text-gray-800 truncate">{cat.name}</p>
                          <p className="text-xs text-gray-500 truncate">{cat.group}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-red-600 tabular-nums">{formatCurrency(cat.available)}</p>
                          <p className="text-xs text-gray-500 whitespace-nowrap">
                            {formatCurrency(Math.abs(cat.activity))} spent
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning Categories */}
              {warningCategories.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-yellow-100 overflow-hidden">
                  <div className="bg-yellow-50 px-4 py-3 flex items-center gap-2 border-b border-yellow-100">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                    <h4 className="font-bold text-yellow-900">Almost There ({warningCategories.length})</h4>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {warningCategories.map((cat) => {
                      const percentUsed = cat.assigned > 0 ? (Math.abs(cat.activity) / cat.assigned) * 100 : 0;
                      return (
                        <div key={cat.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex-1 min-w-0 mr-4">
                              <p className="font-medium text-gray-800 truncate">{cat.name}</p>
                              <p className="text-xs text-gray-500 truncate">{cat.group}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-bold text-yellow-600 tabular-nums">{formatCurrency(cat.available)}</p>
                              <p className="text-xs text-gray-500 whitespace-nowrap">{Math.round(percentUsed)}% used</p>
                            </div>
                          </div>
                          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(percentUsed, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Healthy Categories Summary */}
              {healthyCategories.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <h4 className="font-bold text-green-900">Looking Good</h4>
                        <p className="text-sm text-gray-600 truncate">{healthyCategories.length} {healthyCategories.length === 1 ? 'category is' : 'categories are'} on track</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500 mb-1">Available</p>
                      <p className="text-lg font-bold text-green-600 tabular-nums">
                        {formatCurrency(healthyCategories.reduce((sum, cat) => sum + cat.available, 0))}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* No Categories Message */}
              {categories.length === 0 && (
                <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 text-center">
                  <AlertCircle className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2 text-sm md:text-base">No budget categories yet</p>
                  <p className="text-xs md:text-sm text-gray-500">Head to the Budget tab to create your first category</p>
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
                {transactions.length > 5 && (
                  <button className="text-xs md:text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    View All
                    <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                )}
              </div>

              {recentTransactions.length === 0 ? (
                <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 text-center">
                  <Clock className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2 text-sm md:text-base">No transactions yet</p>
                  <p className="text-xs md:text-sm text-gray-500">Transactions will appear here as you add them</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
                  {/* Show 5 on mobile, 10 on desktop */}
                  <div className="lg:hidden">
                    {recentTransactions.slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="px-4 py-2.5 md:py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-gray-800 text-sm md:text-base truncate">{transaction.payee}</p>
                            <span
                              className={`text-xs px-1.5 md:px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                                transaction.status === 'cleared'
                                  ? 'bg-green-100 text-green-700'
                                  : transaction.status === 'reconciled'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {transaction.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 md:gap-2 text-xs text-gray-500">
                            <span>{formatDate(transaction.date)}</span>
                            <span>•</span>
                            <span className="truncate">{getCategoryName(transaction.category_id)}</span>
                          </div>
                        </div>
                        <div className="ml-3 text-right flex-shrink-0">
                          <p
                            className={`text-sm md:text-base font-bold tabular-nums ${
                              transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {transaction.amount >= 0 ? '+' : ''}
                            {formatCurrency(Math.abs(transaction.amount))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="hidden lg:block">
                    {recentTransactions.slice(0, 10).map((transaction) => (
                      <div key={transaction.id} className="px-4 py-2.5 md:py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-gray-800 text-sm md:text-base truncate">{transaction.payee}</p>
                            <span
                              className={`text-xs px-1.5 md:px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                                transaction.status === 'cleared'
                                  ? 'bg-green-100 text-green-700'
                                  : transaction.status === 'reconciled'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {transaction.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 md:gap-2 text-xs text-gray-500">
                            <span>{formatDate(transaction.date)}</span>
                            <span>•</span>
                            <span className="truncate">{getCategoryName(transaction.category_id)}</span>
                          </div>
                        </div>
                        <div className="ml-3 text-right flex-shrink-0">
                          <p
                            className={`text-sm md:text-base font-bold tabular-nums ${
                              transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {transaction.amount >= 0 ? '+' : ''}
                            {formatCurrency(Math.abs(transaction.amount))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Stats & Summary (Desktop only, shows below on mobile) */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Categories</p>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-2">{categories.length}</p>
                {overbudgetCategories.length > 0 && (
                  <p className="text-xs text-red-600 font-medium">{overbudgetCategories.length} overbudget</p>
                )}
                {overbudgetCategories.length === 0 && categories.length > 0 && (
                  <p className="text-xs text-green-600 font-medium">All on track</p>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">This Month</p>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-2">{thisMonthTransactions.length}</p>
                <p className="text-xs text-gray-500 mb-1">transactions</p>
                <p className="text-xs text-gray-400">{formatCurrency(thisMonthTotal)} total</p>
              </div>
            </div>

            {/* Budget Summary Card - Desktop Only */}
            <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h4 className="text-sm font-bold text-gray-900 mb-4">Budget Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Assigned</span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(totalAssigned)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Activity</span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(totalActivity)}</span>
                </div>
                <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900">Available</span>
                  <span className={`text-sm font-bold tabular-nums ${
                    totalAvailable >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(totalAvailable)}
                  </span>
                </div>
              </div>
            </div>

            {/* Account Summary - Desktop Only */}
            {accounts.length > 0 && (
              <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h4 className="text-sm font-bold text-gray-900 mb-4">Accounts</h4>
                <div className="space-y-2">
                  {accounts.slice(0, 3).map((account) => (
                    <div key={account.id} className="flex justify-between items-center py-2">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 truncate">{account.name}</span>
                      </div>
                      <span className={`text-sm font-semibold tabular-nums ${
                        account.cleared_balance >= 0 ? 'text-gray-900' : 'text-red-600'
                      }`}>
                        {formatCurrency(account.cleared_balance)}
                      </span>
                    </div>
                  ))}
                  {accounts.length > 3 && (
                    <p className="text-xs text-gray-500 text-center pt-2">+{accounts.length - 3} more</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
