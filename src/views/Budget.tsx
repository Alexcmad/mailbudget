import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, ShoppingBag, Car, Home, CreditCard, Coffee, Zap, Smartphone, TrendingUp, ChevronDown, ChevronRight, Mail } from 'lucide-react';
import MoveMoneyModal from '../components/MoveMoneyModal';
import AddCategoryModal from '../components/AddCategoryModal';
import EditCategoryModal from '../components/EditCategoryModal';
import EmailParserWizard from '../components/EmailParserWizard';
import { deleteCategory } from '../services/firestore.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { useLongPress } from '../hooks/useLongPress.ts';
import type { Category } from '../types/index.ts';

// Helper to get icons based on category name (for visual flair)
const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  if (name.includes('groc') || name.includes('shop')) return <ShoppingBag className="w-5 h-5" />;
  if (name.includes('car') || name.includes('gas') || name.includes('transport')) return <Car className="w-5 h-5" />;
  if (name.includes('rent') || name.includes('mortgage') || name.includes('home')) return <Home className="w-5 h-5" />;
  if (name.includes('credit') || name.includes('debt') || name.includes('loan')) return <CreditCard className="w-5 h-5" />;
  if (name.includes('coffee') || name.includes('dining') || name.includes('eat')) return <Coffee className="w-5 h-5" />;
  if (name.includes('electric') || name.includes('util')) return <Zap className="w-5 h-5" />;
  if (name.includes('phone') || name.includes('internet')) return <Smartphone className="w-5 h-5" />;
  return <TrendingUp className="w-5 h-5" />;
};

interface CategoryCardProps {
  category: Category;
  onMoveClick: (category: Category) => void;
  onEditClick: (category: Category) => void;
  formatCurrency: (amount: number) => string;
}

function CategoryCard({ category, onMoveClick, onEditClick, formatCurrency }: CategoryCardProps) {
  // Calculate progress percentage for visual bar
  const total = Math.max(category.assigned, 0);
  const spent = Math.abs(category.activity);
  const progress = total > 0 ? Math.min((spent / total) * 100, 100) : (spent > 0 ? 100 : 0);

  // Determine colors
  const isOverspent = category.available < 0;
  const isZero = category.available === 0;

  let availableBadgeClass = "bg-green-100 text-green-700";
  let progressBarClass = "bg-green-500";

  if (isOverspent) {
    availableBadgeClass = "bg-red-100 text-red-700 animate-pulse";
    progressBarClass = "bg-red-500";
  } else if (isZero) {
    availableBadgeClass = "bg-gray-100 text-gray-500";
    progressBarClass = "bg-gray-300";
  }

  // Long press hooks
  const longPressProps = useLongPress({
    onLongPress: () => {
      if (navigator.vibrate) navigator.vibrate(50);
      onEditClick(category);
    },
    onClick: () => onMoveClick(category),
    delay: 500,
  });

  return (
    <div
      {...longPressProps}
      className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group active:scale-[0.98] transition-transform duration-200 select-none cursor-pointer touch-pan-y"
    >
      {/* Top Row: Icon & Name + Available Badge */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isOverspent ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
            {getCategoryIcon(category.name)}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-800 truncate text-base">{category.name}</h3>
            <p className="text-xs text-gray-400 truncate">Tap to move • Hold to edit</p>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Available</span>
          <div className={`px-3 py-1.5 rounded-full text-sm font-bold tabular-nums ${availableBadgeClass}`}>
            {formatCurrency(category.available)}
          </div>
        </div>
      </div>

      {/* Middle: Progress Bar */}
      <div className="mb-3">
        <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${progressBarClass}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Bottom: Details */}
      <div className="flex justify-between text-xs font-medium text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-200"></div>
          <span>Assigned: <span className="text-gray-700">{formatCurrency(category.assigned)}</span></span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-orange-200"></div>
          <span>Activity: <span className="text-gray-700">{formatCurrency(category.activity)}</span></span>
        </div>
      </div>
    </div>
  );
}

export default function Budget() {
  const { categories } = useStore();
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmailWizard, setShowEmailWizard] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const uid = useAuth();

  // Group categories by group name
  const groupedCategories = categories.reduce((acc, category) => {
    if (!acc[category.group]) {
      acc[category.group] = [];
    }
    acc[category.group].push(category);
    return acc;
  }, {} as Record<string, Category[]>);

  // Calculate group totals
  const getGroupTotals = (groupCategories: Category[]) => {
    return groupCategories.reduce(
      (acc, cat) => ({
        assigned: acc.assigned + cat.assigned,
        activity: acc.activity + cat.activity,
        available: acc.available + cat.available,
      }),
      { assigned: 0, activity: 0, available: 0 }
    );
  };

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  const handleMoveClick = (category: Category) => {
    setSelectedCategory(category);
    setShowMoveModal(true);
  };

  const handleEditClick = (category: Category) => {
    setSelectedCategory(category);
    setShowEditModal(true);
  };

  const handleDelete = async () => {
    if (!uid || !selectedCategory) return;
    try {
      await deleteCategory(uid, selectedCategory.id);
      setShowEditModal(false);
      setSelectedCategory(null);
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (categories.length === 0) {
    return (
      <div className="p-6 min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Categories Yet</h2>
          <p className="text-gray-500 mb-6">Create your first budget category to start taking control of your money.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors text-white py-3 rounded-xl flex items-center justify-center font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Category
          </button>
        </div>
        <AddCategoryModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
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
              <h2 className="text-2xl font-extrabold text-gray-900">Budget</h2>
              <p className="text-sm text-gray-500 hidden sm:block">
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEmailWizard(true)}
                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center shadow-sm transition-all active:scale-95"
              >
                <Mail className="w-4 h-4 mr-2 text-blue-500" />
                <span className="hidden sm:inline">Scan Inbox</span>
                <span className="sm:hidden">Scan</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center shadow-sm shadow-blue-200 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Category
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-4 space-y-4">
        {Object.entries(groupedCategories).map(([groupName, groupCategories]) => {
          const isCollapsed = collapsedGroups.has(groupName);
          const totals = getGroupTotals(groupCategories);

          return (
            <div key={groupName} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Collapsible Group Header */}
              <div
                onClick={() => toggleGroup(groupName)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-200 mb-3 select-none active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  {/* Left: Group name with chevron */}
                  <div className="flex items-center gap-3">
                    <div className="text-blue-600 transition-transform duration-200" style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(0deg)' }}>
                      {isCollapsed ? (
                        <ChevronRight className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                        {groupName}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {groupCategories.length} {groupCategories.length === 1 ? 'category' : 'categories'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Group totals */}
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Assigned</p>
                      <p className="text-sm font-bold text-gray-700 tabular-nums">{formatCurrency(totals.assigned)}</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Activity</p>
                      <p className="text-sm font-bold text-gray-700 tabular-nums">{formatCurrency(totals.activity)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Available</p>
                      <div className={`text-base font-bold tabular-nums ${
                        totals.available < 0 ? 'text-red-600' : totals.available === 0 ? 'text-gray-500' : 'text-green-600'
                      }`}>
                        {formatCurrency(totals.available)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Responsive Grid Layout - Only show if not collapsed */}
              {!isCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupCategories.map((category) => (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      onMoveClick={handleMoveClick}
                      onEditClick={handleEditClick}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {showMoveModal && selectedCategory && (
        <MoveMoneyModal
          category={selectedCategory}
          onClose={() => {
            setShowMoveModal(false);
            setSelectedCategory(null);
          }}
        />
      )}

      <AddCategoryModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />

      <EditCategoryModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedCategory(null);
        }}
        onDelete={handleDelete}
        category={selectedCategory}
      />

      <EmailParserWizard
        isOpen={showEmailWizard}
        onClose={() => setShowEmailWizard(false)}
      />
    </div>
  );
}
