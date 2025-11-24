import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, TrendingUp, Calendar, Tag, CheckCircle2, Clock, Mail, Loader } from 'lucide-react';
import AddTransactionModal from '../components/AddTransactionModal';
import EditTransactionModal from '../components/EditTransactionModal';
import TransactionApprovalModal from '../components/TransactionApprovalModal';
import type { Transaction } from '../types/index.ts';
import { fetchRecentEmails, fetchEmailsFromDomain, markEmailAsRead } from '../services/gmailService';
import { processEmailTransaction, findAccountByEmailDomain, type EmailData } from '../services/emailParser';
import { parseEmailWithGemini, type ParsedTransaction } from '../services/gemini';
import { useAuth } from '../hooks/useAuth';

export default function Transactions() {
  const { transactions, categories, accounts } = useStore();
  const uid = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [scanningInbox, setScanningInbox] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [pendingTransactions, setPendingTransactions] = useState<Array<{
    email: EmailData;
    parsed: ParsedTransaction;
    accountName: string;
  }>>([]);
  const [processingApprovals, setProcessingApprovals] = useState(false);
  const [approvedIndices, setApprovedIndices] = useState<Set<number>>(new Set());

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowEditModal(true);
  };

  const handleCloseEdit = () => {
    setShowEditModal(false);
    setSelectedTransaction(null);
  };

  const handleScanInbox = async () => {
    if (!uid) {
      setScanResult({ success: false, message: 'You must be logged in' });
      return;
    }

    setScanningInbox(true);
    setScanResult(null);

    try {
      // Get all linked domains from accounts
      const linkedDomains = accounts
        .map(account => account.email_domain)
        .filter((domain): domain is string => !!domain);

      if (linkedDomains.length === 0) {
        setScanResult({
          success: false,
          message: 'No email domains linked to accounts. Please link at least one domain in Settings first.',
        });
        setScanningInbox(false);
        return;
      }

      console.log(`📧 Starting email sync from ${linkedDomains.length} linked domain(s): ${JSON.stringify(linkedDomains)}`);

      // Fetch emails from all linked domains
      const emailPromises = linkedDomains.map(domain =>
        fetchEmailsFromDomain(domain, 50)
      );

      const emailArrays = await Promise.all(emailPromises);
      const emails = emailArrays.flat();

      if (emails.length === 0) {
        setScanResult({ success: true, message: 'No unread emails found from linked domains' });
        setScanningInbox(false);
        return;
      }

      console.log(`📧 Found ${emails.length} unread email(s) from linked domains. Parsing...`);

      // Parse all emails first (without importing)
      const pending: Array<{
        email: EmailData;
        parsed: ParsedTransaction;
        accountName: string;
      }> = [];

      for (const email of emails) {
        console.log(`\n📧 Parsing email from "${email.from}"`);
        console.log(`   Subject: "${email.subject}"`);

        // Find matching account
        const account = findAccountByEmailDomain(accounts, email.from);
        if (!account) {
          console.log(`   ⚠️ SKIPPED: No account linked to email domain`);
          continue;
        }

        // Parse email content
        try {
          const emailContent = email.htmlContent || email.textContent || '';
          const parsed = await parseEmailWithGemini(emailContent, email.subject);

          if (!parsed) {
            console.log(`   ⚠️ SKIPPED: Failed to parse transaction details`);
            continue;
          }

          pending.push({
            email,
            parsed,
            accountName: account.name,
          });

          console.log(`   ✅ Parsed: ${parsed.payee} - ${parsed.amount >= 0 ? '+' : ''}${parsed.amount}`);
        } catch (err) {
          console.error(`   ❌ Error parsing email:`, err);
        }
      }

      if (pending.length === 0) {
        setScanResult({
          success: true,
          message: 'No parseable transactions found in emails',
        });
        setScanningInbox(false);
        return;
      }

      // Show approval modal
      setPendingTransactions(pending);
      setApprovedIndices(new Set());
      setShowApprovalModal(true);
      setScanningInbox(false);
    } catch (error) {
      console.error('❌ Email sync failed:', error);
      setScanResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to scan inbox',
      });
      setScanningInbox(false);
    }
  };

  const handleApproveTransaction = (index: number) => {
    const newApproved = new Set(approvedIndices);
    newApproved.add(index);
    setApprovedIndices(newApproved);
  };

  const handleDenyTransaction = (index: number) => {
    const newApproved = new Set(approvedIndices);
    newApproved.delete(index);
    setApprovedIndices(newApproved);
  };

  const handleApproveAll = () => {
    const allIndices = new Set(pendingTransactions.map((_, i) => i));
    setApprovedIndices(allIndices);
  };

  const handleDenyAll = () => {
    setApprovedIndices(new Set());
  };

  const handleProcessApprovals = async () => {
    if (!uid || approvedIndices.size === 0) {
      setShowApprovalModal(false);
      return;
    }

    setProcessingApprovals(true);

    try {
      let imported = 0;
      let skipped = 0;

      // Process approved transactions
      for (const index of approvedIndices) {
        const pending = pendingTransactions[index];
        if (!pending) continue;

        const result = await processEmailTransaction(uid, pending.email, accounts);

        if (result.success) {
          imported++;
          console.log(`   ✅ Imported: ${pending.parsed.payee} (ID: ${result.transactionId})`);

          // Mark email as read after successful import
          if (pending.email.messageId) {
            try {
              await markEmailAsRead(pending.email.messageId);
              console.log(`   📬 Marked as read`);
            } catch (err) {
              console.warn(`   ⚠️ Failed to mark as read:`, err);
            }
          }
        } else {
          skipped++;
          console.log(`   ❌ Failed to import: ${result.error}`);
        }
      }

      setScanResult({
        success: true,
        message: `Imported ${imported} transaction(s)${skipped > 0 ? `, ${skipped} failed` : ''}`,
      });

      setShowApprovalModal(false);
      setPendingTransactions([]);
      setApprovedIndices(new Set());
    } catch (error) {
      console.error('❌ Failed to process approvals:', error);
      setScanResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to import transactions',
      });
    } finally {
      setProcessingApprovals(false);
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="p-6 min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Transactions Yet</h2>
          <p className="text-gray-500 mb-6">Transactions will appear here as emails are parsed, or you can add them manually.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors text-white py-3 rounded-xl flex items-center justify-center font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Transaction
          </button>
        </div>
        <AddTransactionModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
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
              <h2 className="text-2xl font-extrabold text-gray-900">Transactions</h2>
              <p className="text-sm text-gray-500 hidden sm:block">
                All your financial activity
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleScanInbox}
                disabled={scanningInbox}
                className="p-3 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-200"
                title="Scan inbox for new bank emails"
              >
                {scanningInbox ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Mail className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center shadow-sm shadow-blue-200 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Transaction
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-4">
        {/* Scan Result Notification */}
        {scanResult && (
          <div className={`mb-4 p-4 rounded-xl border ${
            scanResult.success
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <p className={`text-sm font-medium ${
              scanResult.success ? 'text-green-900' : 'text-red-900'
            }`}>
              {scanResult.message}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.99] select-none"
              onClick={() => handleTransactionClick(transaction)}
            >
              <div className="flex items-center justify-between">
                {/* Left side: Transaction details */}
                <div className="flex-1 min-w-0">
                  {/* Top row: Date and Status */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(transaction.date)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {transaction.status === 'cleared' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-yellow-600" />
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          transaction.status === 'cleared'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {transaction.status}
                      </span>
                    </div>
                  </div>

                  {/* Payee name */}
                  <div className="font-bold text-gray-800 truncate mb-1 text-base">
                    {transaction.payee}
                  </div>

                  {/* Category */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Tag className="w-3.5 h-3.5" />
                    <span className="truncate">{getCategoryName(transaction.category_id)}</span>
                  </div>
                </div>

                {/* Right side: Amount */}
                <div className="ml-4 text-right flex-shrink-0">
                  <div
                    className={`text-xl font-bold tabular-nums ${
                      transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {transaction.amount >= 0 ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-0.5">
                    {transaction.amount >= 0 ? 'Income' : 'Expense'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AddTransactionModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      <EditTransactionModal
        isOpen={showEditModal}
        onClose={handleCloseEdit}
        transaction={selectedTransaction}
      />
      <TransactionApprovalModal
        isOpen={showApprovalModal}
        pendingTransactions={pendingTransactions}
        approvedIndices={approvedIndices}
        onApprove={handleApproveTransaction}
        onDeny={handleDenyTransaction}
        onApproveAll={handleApproveAll}
        onDenyAll={handleDenyAll}
        onClose={handleProcessApprovals}
        processing={processingApprovals}
      />
    </div>
  );
}
