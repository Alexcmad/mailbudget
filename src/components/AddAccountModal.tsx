import { useState } from 'react';
import { addAccount } from '../services/firestore.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { ModalOverlay, ModalHeader, ModalBody, ModalFooter, InputGroup, StyledInput, StyledSelect } from './ModalComponents';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddAccountModal({ isOpen, onClose }: AddAccountModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'checking' | 'savings' | 'credit'>('checking');
  const [balance, setBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uid = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uid) {
      setError('You must be logged in');
      return;
    }

    if (!name.trim()) {
      setError('Account name is required');
      return;
    }

    const balanceNum = parseFloat(balance) || 0;

    setLoading(true);
    setError(null);

    try {
      await addAccount(uid, {
        name: name.trim(),
        type,
        cleared_balance: balanceNum,
      });

      // Reset form and close
      setName('');
      setType('checking');
      setBalance('');
      onClose();
    } catch (err) {
      console.error('Error adding account:', err);
      setError('Failed to add account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName('');
      setType('checking');
      setBalance('');
      setError(null);
      onClose();
    }
  };

  return (
    <ModalOverlay onClose={handleClose}>
      <ModalHeader title="Add Account" onClose={handleClose} />
      <form onSubmit={handleSubmit}>
        <ModalBody>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <InputGroup label="Account Name">
            <StyledInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Chase Checking, Amex Blue"
              disabled={loading}
              required
            />
          </InputGroup>

          <InputGroup label="Account Type">
            <StyledSelect
              value={type}
              onChange={(e) => setType(e.target.value as 'checking' | 'savings' | 'credit')}
              disabled={loading}
            >
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="credit">Credit Card</option>
            </StyledSelect>
          </InputGroup>

          <InputGroup label="Current Balance">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium z-10">$</span>
              <StyledInput
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
                step="0.01"
                disabled={loading}
                className="pl-11"
              />
            </div>
          </InputGroup>
        </ModalBody>
        <ModalFooter>
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
            className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Account'}
          </button>
        </ModalFooter>
      </form>
    </ModalOverlay>
  );
}
