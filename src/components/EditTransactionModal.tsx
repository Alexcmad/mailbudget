import { useState, useEffect } from 'react';
import { Calendar, Trash2 } from 'lucide-react';
import { updateTransaction, deleteTransaction } from '../services/firestore.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { useStore } from '../store/useStore.ts';
import type { Transaction } from '../types/index.ts';
import { ModalOverlay, ModalHeader, ModalBody, ModalFooter, InputGroup, StyledInput, StyledSelect, StyledTextarea, StyledDateInput } from './ModalComponents';

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export default function EditTransactionModal({ isOpen, onClose, transaction }: EditTransactionModalProps) {
  const [date, setDate] = useState('');
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [status, setStatus] = useState<'cleared' | 'uncleared' | 'reconciled'>('uncleared');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uid = useAuth();
  const { categories, accounts } = useStore();

  useEffect(() => {
    if (transaction) {
      setDate(transaction.date);
      setPayee(transaction.payee);
      setAmount(transaction.amount.toString());
      setCategoryId(transaction.category_id || '');
      setAccountId(transaction.account_id || '');
      setStatus(transaction.status);
      setNotes(transaction.notes || '');
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uid) {
      setError('You must be logged in');
      return;
    }

    if (!payee.trim() || !amount) {
      setError('Payee and amount are required');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await updateTransaction(uid, transaction.id, {
        date,
        payee: payee.trim(),
        amount: amountNum,
        category_id: categoryId || null,
        account_id: accountId || undefined,
        status,
        notes: notes.trim() || undefined,
      });

      onClose();
    } catch (err) {
      console.error('Error updating transaction:', err);
      setError('Failed to update transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!uid) return;

    const confirmed = confirm('Are you sure you want to delete this transaction?');
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      await deleteTransaction(uid, transaction.id);
      onClose();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setError('Failed to delete transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  return (
    <ModalOverlay onClose={handleClose}>
      <ModalHeader title="Edit Transaction" onClose={handleClose} />
      <form onSubmit={handleSubmit}>
        <ModalBody>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <InputGroup label="Date">
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
              <StyledDateInput
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={loading}
                className="pl-12"
                required
              />
            </div>
          </InputGroup>

          <InputGroup label="Payee">
            <StyledInput
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              placeholder="e.g., Starbucks, Amazon"
              disabled={loading}
              required
            />
          </InputGroup>

          <InputGroup label="Amount (negative for expense, positive for income)">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium z-10">$</span>
              <StyledInput
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="-25.00"
                step="0.01"
                disabled={loading}
                className="pl-11"
                required
              />
            </div>
          </InputGroup>

          <InputGroup label="Account">
            <StyledSelect
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={loading}
            >
              <option value="">Select an account...</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </StyledSelect>
          </InputGroup>

          <InputGroup label="Category (optional)">
            <StyledSelect
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={loading}
            >
              <option value="">Uncategorized</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.group} - {category.name}
                </option>
              ))}
            </StyledSelect>
          </InputGroup>

          <InputGroup label="Status">
            <StyledSelect
              value={status}
              onChange={(e) => setStatus(e.target.value as 'cleared' | 'uncleared' | 'reconciled')}
              disabled={loading}
            >
              <option value="uncleared">Uncleared</option>
              <option value="cleared">Cleared</option>
              <option value="reconciled">Reconciled</option>
            </StyledSelect>
          </InputGroup>

          <InputGroup label="Notes (optional)">
            <StyledTextarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes..."
              rows={3}
              disabled={loading}
            />
          </InputGroup>
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-red-300 text-red-600 font-semibold hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </ModalFooter>
      </form>
    </ModalOverlay>
  );
}
