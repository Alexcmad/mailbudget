import { useState, useEffect } from 'react';
import { updateCategory } from '../services/firestore.ts';
import { useAuth } from '../hooks/useAuth.ts';
import type { Category } from '../types/index.ts';
import { ModalOverlay, ModalHeader, ModalBody, ModalFooter, InputGroup, StyledInput } from './ModalComponents';

interface EditCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  category: Category | null;
}

export default function EditCategoryModal({ isOpen, onClose, onDelete, category }: EditCategoryModalProps) {
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uid = useAuth();

  useEffect(() => {
    if (category) {
      setName(category.name);
      setGroup(category.group);
    }
  }, [category]);

  if (!isOpen || !category) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

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
      await updateCategory(uid, category.id, {
        name: name.trim(),
        group: group.trim(),
      });

      onClose();
    } catch (err) {
      console.error('Error updating category:', err);
      setError('Failed to update category. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (category.activity !== 0) {
      setError('Cannot delete a category with activity. Remove or reassign transactions first.');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to delete "${category.name}"?\n\nThis will also remove any assigned money (${formatCurrency(category.assigned)}).`
    );

    if (confirmed) {
      onDelete();
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
      <ModalHeader title={`Edit ${category.name}`} onClose={handleClose} />
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
              disabled={loading}
              required
            />
          </InputGroup>

          <InputGroup label="Assigned Amount">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Assigned:</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(category.assigned)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Activity:</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(category.activity)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Available:</span>
                  <span className={`font-semibold ${category.available < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(category.available)}
                  </span>
                </div>
              </div>
            </div>
          </InputGroup>
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Delete
          </button>
          <div className="flex-1 flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </ModalFooter>
      </form>
    </ModalOverlay>
  );
}
