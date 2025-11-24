import { useState } from 'react';
import { addCategory } from '../services/firestore.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { ModalOverlay, ModalHeader, ModalBody, ModalFooter, InputGroup, StyledInput, StyledSelect } from './ModalComponents';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddCategoryModal({ isOpen, onClose }: AddCategoryModalProps) {
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
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

    if (!name.trim() || !group.trim()) {
      setError('Name and group are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await addCategory(uid, {
        name: name.trim(),
        group: group.trim(),
        assigned: 0,
        activity: 0,
        available: 0,
      });

      // Reset form and close
      setName('');
      setGroup('');
      onClose();
    } catch (err) {
      console.error('Error adding category:', err);
      setError('Failed to add category. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName('');
      setGroup('');
      setError(null);
      onClose();
    }
  };

  return (
    <ModalOverlay onClose={handleClose}>
      <ModalHeader title="New Category" onClose={handleClose} />
      <form onSubmit={handleSubmit}>
        <ModalBody>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <InputGroup label="Category Name">
            <StyledInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Groceries, Rent, Savings"
              disabled={loading}
              autoFocus
              required
            />
          </InputGroup>

          <InputGroup label="Group">
            <StyledInput
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="e.g., Daily Living, Housing, Debt"
              disabled={loading}
              required
            />
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
            {loading ? 'Adding...' : 'Add Category'}
          </button>
        </ModalFooter>
      </form>
    </ModalOverlay>
  );
}
