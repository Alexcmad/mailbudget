import { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { updateTransaction } from '../services/firestore';
import { useAuth } from '../hooks/useAuth';
import { hasUnresolvedFlags } from '../services/transactionFlags';
import { ModalOverlay, ModalHeader, ModalBody, ModalFooter } from './ModalComponents';

interface FlaggedTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FlaggedTransactionsModal({ isOpen, onClose }: FlaggedTransactionsModalProps) {
  const { transactions } = useStore();
  const uid = useAuth();
  const [resolving, setResolving] = useState<string | null>(null);

  // Get all transactions with unresolved flags
  const flaggedTransactions = transactions.filter(hasUnresolvedFlags);

  const handleResolveFlag = async (transactionId: string, flagIndex: number) => {
    if (!uid) return;

    setResolving(transactionId);
    try {
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction || !transaction.flags) return;

      const updatedFlags = [...transaction.flags];
      updatedFlags[flagIndex] = { ...updatedFlags[flagIndex], resolved: true };

      await updateTransaction(uid, transactionId, {
        flags: updatedFlags,
      });
    } catch (error) {
      console.error('Error resolving flag:', error);
      alert('Failed to resolve flag. Please try again.');
    } finally {
      setResolving(null);
    }
  };

  const handleResolveAllFlags = async (transactionId: string) => {
    if (!uid) return;

    setResolving(transactionId);
    try {
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction || !transaction.flags) return;

      const updatedFlags = transaction.flags.map(flag => ({
        ...flag,
        resolved: true,
      }));

      await updateTransaction(uid, transactionId, {
        flags: updatedFlags,
      });
    } catch (error) {
      console.error('Error resolving flags:', error);
      alert('Failed to resolve flags. Please try again.');
    } finally {
      setResolving(null);
    }
  };

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
      year: 'numeric',
    }).format(date);
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title="Flagged Transactions" onClose={onClose} />
      <ModalBody>
        {flaggedTransactions.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No flagged transactions</p>
            <p className="text-sm text-gray-500 mt-2">All transactions have been reviewed.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              {flaggedTransactions.length} transaction{flaggedTransactions.length !== 1 ? 's' : ''} need{flaggedTransactions.length === 1 ? 's' : ''} your attention.
            </p>

            {flaggedTransactions.map((transaction) => {
              const unresolvedFlags = transaction.flags?.filter(f => !f.resolved) || [];
              
              return (
                <div
                  key={transaction.id}
                  className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-3"
                >
                  {/* Transaction Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        <h4 className="font-bold text-gray-900">{transaction.payee}</h4>
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(transaction.date)} • {formatCurrency(transaction.amount)}
                      </div>
                    </div>
                  </div>

                  {/* Flags */}
                  <div className="space-y-2">
                    {unresolvedFlags.map((flag, flagIndex) => (
                      <div
                        key={flagIndex}
                        className="bg-white rounded-lg p-3 border border-yellow-100"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 mb-1">
                              {flag.reason === 'currency_mismatch' && '💱 Currency Mismatch'}
                              {flag.reason === 'low_confidence' && '⚠️ Low Confidence'}
                              {flag.reason === 'missing_category' && '📁 Missing Category'}
                              {flag.reason === 'unusual_amount' && '💰 Unusual Amount'}
                              {!['currency_mismatch', 'low_confidence', 'missing_category', 'unusual_amount'].includes(flag.reason) && '⚠️ Flag'}
                            </p>
                            <p className="text-xs text-gray-600">{flag.message}</p>
                          </div>
                          <button
                            onClick={() => handleResolveFlag(transaction.id, flagIndex)}
                            disabled={resolving === transaction.id}
                            className="flex-shrink-0 p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Mark as resolved"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Resolve All Button */}
                  {unresolvedFlags.length > 1 && (
                    <button
                      onClick={() => handleResolveAllFlags(transaction.id)}
                      disabled={resolving === transaction.id}
                      className="w-full px-3 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {resolving === transaction.id ? 'Resolving...' : 'Resolve All Flags'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
        >
          Close
        </button>
      </ModalFooter>
    </ModalOverlay>
  );
}

