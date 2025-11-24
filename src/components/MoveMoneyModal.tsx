import { useState } from 'react';
import type { Category } from '../types';
import { useStore } from '../store/useStore';
import { moveMoney } from '../services/firestore';
import { auth } from '../config/firebase';
import { ModalOverlay, ModalHeader, ModalBody, ModalFooter, InputGroup, StyledInput, StyledSelect } from './ModalComponents';

interface MoveMoneyModalProps {
  category: Category;
  onClose: () => void;
}

export default function MoveMoneyModal({ category, onClose }: MoveMoneyModalProps) {
  const { categories } = useStore();
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetCategoryId) {
      setError('Please select a target category');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const amountNum = parseFloat(amount);
    const uid = auth.currentUser?.uid;

    if (!uid) {
      setError('User not authenticated');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await moveMoney(uid, category.id, targetCategoryId, amountNum);

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to move money');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title="Move Money" onClose={onClose} />
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <p className="text-gray-600 text-sm bg-blue-50 p-3 rounded-lg border border-blue-100">
            Moving money from <strong className="text-blue-700">{category.name}</strong>
            <br />
            <span className="text-xs text-gray-500">Available: {formatCurrency(category.available)}</span>
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <InputGroup label="Amount">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
              <StyledInput
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0.01"
                max={category.available}
                placeholder="0.00"
                className="pl-8"
                required
              />
            </div>
          </InputGroup>

          <InputGroup label="To Category">
            <StyledSelect
              value={targetCategoryId}
              onChange={(e) => setTargetCategoryId(e.target.value)}
              required
            >
              <option value="">Select a category...</option>
              {categories
                .filter((c) => c.id !== category.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {formatCurrency(c.available)}
                  </option>
                ))}
            </StyledSelect>
          </InputGroup>
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Moving...' : 'Move Money'}
          </button>
        </ModalFooter>
      </form>
    </ModalOverlay>
  );
}
