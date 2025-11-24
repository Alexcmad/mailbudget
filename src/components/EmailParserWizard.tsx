import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Sparkles, Mail, ChevronDown } from 'lucide-react';
import { ModalOverlay, ModalHeader, ModalBody, ModalFooter, StyledSelect } from './ModalComponents';
import { addTransaction } from '../services/firestore.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { useStore } from '../store/useStore.ts';
import type { Category } from '../types/index.ts';

interface EmailParserWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedTransaction {
  id: string;
  payee: string;
  amount: number;
  date: string;
  categoryId: string;
  originalEmailId: string;
  note?: string;
}

export default function EmailParserWizard({ isOpen, onClose }: EmailParserWizardProps) {
  const [step, setStep] = useState<'scanning' | 'review'>('scanning');
  const [foundTransactions, setFoundTransactions] = useState<ParsedTransaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uid = useAuth();
  const { categories, accounts } = useStore();

  // Generate AI Note based on payee and amount
  const generateAINote = (payee: string, amount: number): string => {
    const lowerPayee = payee.toLowerCase();
    if (lowerPayee.includes('uber') || lowerPayee.includes('lyft')) {
      return '🚗 Ride-share detected. Likely a commute or travel expense.';
    }
    if (lowerPayee.includes('total') || lowerPayee.includes('petrol') || lowerPayee.includes('gas')) {
      return '⛽ Gas station purchase identified. Auto-categorized as Transportation.';
    }
    if (lowerPayee.includes('price smart') || lowerPayee.includes('supermarket') || lowerPayee.includes('grocery')) {
      return '🛒 Bulk shopping detected. This looks like a Grocery run.';
    }
    if (amount > 10000) {
      return '💰 High-value transaction detected. Please verify if this should be split.';
    }
    return '✨ Analyzed merchant pattern. Standard purchase detected.';
  };

  // Parse email body for transaction data
  const parseEmailBody = (emailBody: string): ParsedTransaction | null => {
    // Regex pattern for Scotiabank format: "purchase for $X,XXX.XX at PAYEE NAME on"
    const match = emailBody.match(/purchase for \$([\d,]+\.\d{2}) at (.*?) on/i);
    
    if (!match) return null;

    const amountStr = match[1].replace(/,/g, '');
    const payee = match[2].trim();
    const amount = parseFloat(amountStr);

    if (isNaN(amount)) return null;

    // Auto-categorization logic
    let suggestedCategoryId = '';
    const payeeLower = payee.toLowerCase();

    if (payeeLower.includes('uber') || payeeLower.includes('lyft') || payeeLower.includes('total') || payeeLower.includes('gas')) {
      // Find Transportation category
      const transportCat = categories.find(c => 
        c.name.toLowerCase().includes('transport') || 
        c.name.toLowerCase().includes('car') ||
        c.group.toLowerCase().includes('transport')
      );
      suggestedCategoryId = transportCat?.id || '';
    } else if (payeeLower.includes('price smart') || payeeLower.includes('supermarket') || payeeLower.includes('grocery')) {
      // Find Groceries category
      const groceryCat = categories.find(c => 
        c.name.toLowerCase().includes('groc') || 
        c.name.toLowerCase().includes('food')
      );
      suggestedCategoryId = groceryCat?.id || '';
    }

    const aiNote = generateAINote(payee, amount);

    return {
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      payee,
      amount: -Math.abs(amount), // Always negative for expenses
      date: new Date().toISOString().split('T')[0],
      categoryId: suggestedCategoryId,
      originalEmailId: `email_${Date.now()}`,
      note: aiNote,
    };
  };

  // Mock function to fetch emails (replace with actual Gmail API call later)
  const fetchEmails = async (): Promise<string[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock email bodies - in real app, this would call Gmail API
    const mockEmails = [
      'There was a purchase for $5,000.00 at TOTAL-LIGUANEA-COSTAL on your Scotiabank Debit Card at 01:50 pm EST.',
      'There was a purchase for $2,500.00 at UBER TRIP HELP.UBER.COM on your Scotiabank Debit Card at 09:15 am EST.',
      'There was a purchase for $15,000.00 at PRICE SMART KINGSTON on your Scotiabank Debit Card at 06:30 pm EST.',
    ];

    return mockEmails;
  };

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setStep('scanning');
      setFoundTransactions([]);
      setSelectedIds(new Set());
      setError(null);

      // Fetch and parse emails
      fetchEmails()
        .then((emailBodies) => {
          const parsed = emailBodies
            .map((body) => parseEmailBody(body))
            .filter((t): t is ParsedTransaction => t !== null);

          setFoundTransactions(parsed);
          // Default select all
          setSelectedIds(new Set(parsed.map(t => t.id)));
          setStep('review');
        })
        .catch((err) => {
          console.error('Error fetching emails:', err);
          setError('Failed to fetch emails. Please try again.');
          setStep('review');
        });
    }
  }, [isOpen, categories]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const updateTransactionCategory = (id: string, newCatId: string) => {
    setFoundTransactions(prev => prev.map(t => 
      t.id === id ? { ...t, categoryId: newCatId } : t
    ));
  };

  const handleImport = async () => {
    if (!uid) {
      setError('You must be logged in');
      return;
    }

    const toImport = foundTransactions.filter(t => selectedIds.has(t.id));
    
    if (toImport.length === 0) {
      setError('Please select at least one transaction');
      return;
    }

    if (accounts.length === 0) {
      setError('Please create an account first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Import each transaction
      for (const tx of toImport) {
        await addTransaction(uid, {
          date: tx.date,
          payee: tx.payee,
          amount: tx.amount,
          category_id: tx.categoryId || null,
          account_id: accounts[0].id, // Use first account as default
          status: 'uncleared',
          original_email_id: tx.originalEmailId,
          notes: tx.note,
        });
      }

      onClose();
    } catch (err: any) {
      console.error('Error importing transactions:', err);
      setError(err.message || 'Failed to import transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title="Import Transactions" onClose={onClose} />
      
      {step === 'scanning' && (
        <ModalBody className="flex flex-col items-center justify-center py-12">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
            <div className="relative bg-blue-50 p-4 rounded-full">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Scanning Inbox...</h3>
          <p className="text-gray-500 text-center text-sm max-w-xs">
            Connecting to mail server and looking for recent transaction alerts.
          </p>
        </ModalBody>
      )}

      {step === 'review' && (
        <>
          <ModalBody className="max-h-[60vh] overflow-y-auto bg-gray-50/50">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Found {foundTransactions.length} Transaction{foundTransactions.length !== 1 ? 's' : ''}
              </span>
              {foundTransactions.length > 0 && (
                <button 
                  onClick={() => setSelectedIds(new Set(foundTransactions.map(t => t.id)))}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  Select All
                </button>
              )}
            </div>

            {foundTransactions.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No recent transaction emails found.</p>
                <p className="text-gray-400 text-sm mt-1">Try checking your email filters or inbox settings.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {foundTransactions.map((tx) => (
                  <div 
                    key={tx.id} 
                    className={`bg-white p-4 rounded-xl border-2 transition-all duration-200 ${
                      selectedIds.has(tx.id) 
                        ? 'border-blue-500 shadow-md shadow-blue-100' 
                        : 'border-transparent shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        onClick={() => toggleSelection(tx.id)}
                        className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer flex-shrink-0 transition-colors ${
                          selectedIds.has(tx.id) 
                            ? 'bg-blue-500 border-blue-500' 
                            : 'border-gray-300 bg-white hover:border-blue-400'
                        }`}
                      >
                        {selectedIds.has(tx.id) && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 text-sm truncate pr-2">{tx.payee}</h4>
                            <p className="text-xs text-gray-500">{tx.date}</p>
                          </div>
                          <span className="font-bold text-red-600 text-sm tabular-nums">
                            ${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        
                        {/* AI Note Section */}
                        {tx.note && (
                          <div className="mb-3 bg-indigo-50/50 rounded-lg p-2.5 border border-indigo-100 flex gap-2 items-start">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-indigo-800 font-medium italic leading-relaxed">
                              {tx.note}
                            </p>
                          </div>
                        )}

                        {/* Category Selector */}
                        <div className="relative">
                          <StyledSelect
                            value={tx.categoryId}
                            onChange={(e) => updateTransactionCategory(tx.id, e.target.value)}
                          >
                            <option value="">Select Category...</option>
                            {categories.map(cat => (
                              <option key={cat.id} value={cat.id}>
                                {cat.group} - {cat.name}
                              </option>
                            ))}
                          </StyledSelect>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ModalBody>

          <ModalFooter>
            <button 
              onClick={onClose} 
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-gray-500 font-semibold hover:bg-gray-100 transition-colors text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <div className="flex-1"></div>
            <button 
              onClick={handleImport} 
              disabled={selectedIds.size === 0 || loading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Import {selectedIds.size > 0 ? selectedIds.size : ''} Transaction{selectedIds.size !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </ModalFooter>
        </>
      )}
    </ModalOverlay>
  );
}


