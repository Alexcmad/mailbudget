import { create } from 'zustand';
import type { Category, Transaction, Account } from '../types/index.ts';
import type { Unsubscribe } from 'firebase/firestore';
import {
  subscribeToCategories,
  subscribeToTransactions,
  subscribeToAccounts,
} from '../services/firestore';

interface AppState {
  categories: Category[];
  transactions: Transaction[];
  accounts: Account[];
  loading: boolean;
  unsubscribers: Unsubscribe[];

  setCategories: (categories: Category[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setAccounts: (accounts: Account[]) => void;
  initializeSubscriptions: (uid: string) => void;
  cleanup: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  categories: [],
  transactions: [],
  accounts: [],
  loading: true,
  unsubscribers: [],

  setCategories: (categories) => set({ categories, loading: false }),
  setTransactions: (transactions) => set({ transactions, loading: false }),
  setAccounts: (accounts) => set({ accounts, loading: false }),

  initializeSubscriptions: (uid: string) => {
    const unsubscribers: Unsubscribe[] = [];

    // Subscribe to categories
    const categoriesUnsub = subscribeToCategories(uid, (categories) => {
      get().setCategories(categories);
    });
    unsubscribers.push(categoriesUnsub);

    // Subscribe to transactions
    const transactionsUnsub = subscribeToTransactions(uid, (transactions) => {
      get().setTransactions(transactions);
    });
    unsubscribers.push(transactionsUnsub);

    // Subscribe to accounts
    const accountsUnsub = subscribeToAccounts(uid, (accounts) => {
      get().setAccounts(accounts);
    });
    unsubscribers.push(accountsUnsub);

    set({ unsubscribers });
  },

  cleanup: () => {
    const { unsubscribers } = get();
    unsubscribers.forEach((unsub) => unsub());
    set({ unsubscribers: [], categories: [], transactions: [], accounts: [] });
  },
}));
