import { CheckCircle2, XCircle, Mail, Calendar, DollarSign, User, Loader } from 'lucide-react';
import { ModalOverlay, ModalHeader, ModalBody, ModalFooter } from './ModalComponents';
import type { EmailData } from '../services/emailParser';
import type { ParsedTransaction } from '../services/gemini';

interface PendingTransaction {
  email: EmailData;
  parsed: ParsedTransaction;
  accountName: string;
}

interface TransactionApprovalModalProps {
  isOpen: boolean;
  pendingTransactions: PendingTransaction[];
  approvedIndices: Set<number>;
  onApprove: (index: number) => void;
  onDeny: (index: number) => void;
  onApproveAll: () => void;
  onDenyAll: () => void;
  onClose: () => void;
  processing: boolean;
}

export default function TransactionApprovalModal({
  isOpen,
  pendingTransactions,
  approvedIndices,
  onApprove,
  onDeny,
  onApproveAll,
  onDenyAll,
  onClose,
  processing,
}: TransactionApprovalModalProps) {
  // Calculate denied indices (all indices not in approved)
  const deniedIndices = new Set(
    pendingTransactions.map((_, i) => i).filter(i => !approvedIndices.has(i))
  );

  if (!isOpen) return null;

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

  const handleApprove = (index: number) => {
    onApprove(index);
  };

  const handleDeny = (index: number) => {
    onDeny(index);
  };

  const handleApproveAll = () => {
    onApproveAll();
  };

  const handleDenyAll = () => {
    onDenyAll();
  };

  const approvedCount = approvedIndices.size;
  const deniedCount = deniedIndices.size;
  const remainingCount = pendingTransactions.length - approvedCount - deniedCount;

  return (
    <ModalOverlay onClose={processing ? () => {} : onClose}>
      <ModalHeader 
        title={`Review Transactions (${pendingTransactions.length})`}
        onClose={processing ? () => {} : onClose}
      />
      <ModalBody>
        {/* Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-green-700 font-semibold">{approvedCount} Approved</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-red-700 font-semibold">{deniedCount} Denied</span>
              </div>
              {remainingCount > 0 && (
                <span className="text-gray-600">{remainingCount} Pending</span>
              )}
            </div>
            {remainingCount > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleApproveAll}
                  disabled={processing}
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Approve All
                </button>
                <button
                  onClick={handleDenyAll}
                  disabled={processing}
                  className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Deny All
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Transaction List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {pendingTransactions.map((pending, index) => {
            const isApproved = approvedIndices.has(index);
            const isDenied = deniedIndices.has(index);
            const { email, parsed, accountName } = pending;

            return (
              <div
                key={index}
                className={`border-2 rounded-xl p-4 transition-all ${
                  isApproved
                    ? 'border-green-300 bg-green-50'
                    : isDenied
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {/* Email Info */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-semibold text-gray-700">{email.from}</span>
                    </div>
                    <p className="text-xs text-gray-600 ml-6">{email.subject}</p>
                  </div>
                  <div className="flex gap-2">
                    {!isApproved && !isDenied && (
                      <>
                        <button
                          onClick={() => handleApprove(index)}
                          disabled={processing}
                          className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                          title="Approve"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeny(index)}
                          disabled={processing}
                          className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                          title="Deny"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {isApproved && (
                      <div className="flex items-center gap-1 text-green-700">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-sm font-semibold">Approved</span>
                      </div>
                    )}
                    {isDenied && (
                      <div className="flex items-center gap-1 text-red-700">
                        <XCircle className="w-5 h-5" />
                        <span className="text-sm font-semibold">Denied</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Parsed Transaction Details */}
                <div className="bg-white rounded-lg p-3 space-y-2 border border-gray-200">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Date:</span>
                      <span className="font-semibold text-gray-900">{formatDate(parsed.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Amount:</span>
                      <span className={`font-bold ${parsed.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {parsed.amount >= 0 ? '+' : '-'}{formatCurrency(parsed.amount)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Payee:</span>
                    <span className="font-semibold text-gray-900">{parsed.payee}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Account: <span className="font-medium">{accountName}</span>
                    {' • '}
                    Type: <span className="font-medium capitalize">{parsed.transactionType}</span>
                    {' • '}
                    Confidence: <span className={`font-medium ${
                      parsed.confidence === 'high' ? 'text-green-600' :
                      parsed.confidence === 'medium' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {parsed.confidence}
                    </span>
                  </div>
                  {parsed.notes && (
                    <div className="text-xs text-gray-600 italic mt-1">
                      Note: {parsed.notes}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          onClick={onClose}
          disabled={processing}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Import Approved ({approvedCount})
            </>
          )}
        </button>
      </ModalFooter>
    </ModalOverlay>
  );
}

