import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  getDocs,
  where,
  setDoc,
  getDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Category, Transaction, Account } from '../types/index.ts';

// Helper to get user collection path
const getUserPath = (uid: string) => `users/${uid}`;

/**
 * Subscribe to categories for a user
 */
export const subscribeToCategories = (
  uid: string,
  callback: (categories: Category[]) => void
): Unsubscribe => {
  const categoriesRef = collection(db, `${getUserPath(uid)}/categories`);
  const q = query(categoriesRef, orderBy('group'), orderBy('name'));

  return onSnapshot(q, (snapshot) => {
    const categories: Category[] = [];
    snapshot.forEach((doc) => {
      categories.push({ id: doc.id, ...doc.data() } as Category);
    });
    callback(categories);
  });
};

/**
 * Subscribe to transactions for a user
 */
export const subscribeToTransactions = (
  uid: string,
  callback: (transactions: Transaction[]) => void
): Unsubscribe => {
  const transactionsRef = collection(db, `${getUserPath(uid)}/transactions`);
  const q = query(transactionsRef, orderBy('date', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const transactions: Transaction[] = [];
    snapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() } as Transaction);
    });
    callback(transactions);
  });
};

/**
 * Subscribe to accounts for a user
 */
export const subscribeToAccounts = (
  uid: string,
  callback: (accounts: Account[]) => void
): Unsubscribe => {
  const accountsRef = collection(db, `${getUserPath(uid)}/accounts`);
  const q = query(accountsRef, orderBy('name'));

  return onSnapshot(q, (snapshot) => {
    const accounts: Account[] = [];
    snapshot.forEach((doc) => {
      accounts.push({ id: doc.id, ...doc.data() } as Account);
    });
    callback(accounts);
  });
};

/**
 * Recalculate activity and available for a category based on its transactions
 */
const recalculateCategoryActivity = async (
  uid: string,
  categoryId: string
): Promise<void> => {
  const transactionsRef = collection(db, `${getUserPath(uid)}/transactions`);
  const categoryTransactionsQuery = query(
    transactionsRef,
    where('category_id', '==', categoryId)
  );

  const snapshot = await getDocs(categoryTransactionsQuery);
  let totalActivity = 0;

  snapshot.forEach((doc) => {
    const transaction = doc.data() as Transaction;
    totalActivity += transaction.amount;
  });

  // Get the category to read its assigned value
  const categoryRef = doc(db, `${getUserPath(uid)}/categories/${categoryId}`);
  const categorySnapshot = await getDocs(
    query(collection(db, `${getUserPath(uid)}/categories`), where('__name__', '==', categoryId))
  );

  if (!categorySnapshot.empty) {
    const category = categorySnapshot.docs[0].data() as Category;
    await updateDoc(categoryRef, {
      activity: totalActivity,
      available: category.assigned - totalActivity,
    });
  }
};

/**
 * Recalculate cleared balance for an account based on all transactions
 * Note: In YNAB, typically only "cleared" transactions count, but for simplicity
 * we're counting all transactions. You can filter by status if needed.
 */
const recalculateAccountBalance = async (
  uid: string,
  accountId: string
): Promise<void> => {
  const transactionsRef = collection(db, `${getUserPath(uid)}/transactions`);
  const accountTransactionsQuery = query(
    transactionsRef,
    where('account_id', '==', accountId)
  );

  const snapshot = await getDocs(accountTransactionsQuery);
  let clearedBalance = 0;

  snapshot.forEach((doc) => {
    const transaction = doc.data() as Transaction;
    // Count all cleared and uncleared transactions
    // If you want YNAB-style (only cleared), add: if (transaction.status === 'cleared')
    clearedBalance += transaction.amount;
  });

  const accountRef = doc(db, `${getUserPath(uid)}/accounts/${accountId}`);
  await updateDoc(accountRef, {
    cleared_balance: clearedBalance,
  });
};

/**
 * Add a new transaction
 * Uses YNAB-style math: Available = Assigned - Activity
 */
export const addTransaction = async (
  uid: string,
  transaction: Omit<Transaction, 'id'>
): Promise<string> => {
  const transactionsRef = collection(db, `${getUserPath(uid)}/transactions`);

  // Check for duplicate email_id if present
  if (transaction.original_email_id) {
    const duplicateQuery = query(
      transactionsRef,
      where('original_email_id', '==', transaction.original_email_id)
    );
    const duplicates = await getDocs(duplicateQuery);

    if (!duplicates.empty) {
      throw new Error('Transaction with this email ID already exists');
    }
  }

  // Remove undefined fields (Firebase doesn't allow them)
  const cleanTransaction = Object.fromEntries(
    Object.entries(transaction).filter(([_, v]) => v !== undefined)
  );

  const docRef = await addDoc(transactionsRef, {
    ...cleanTransaction,
    created_at: serverTimestamp(),
  });

  // Recalculate category activity if categorized
  if (transaction.category_id) {
    await recalculateCategoryActivity(uid, transaction.category_id);
  }

  // Recalculate account balance if account is specified
  if (transaction.account_id) {
    await recalculateAccountBalance(uid, transaction.account_id);
  }

  return docRef.id;
};

/**
 * Update a transaction
 */
export const updateTransaction = async (
  uid: string,
  transactionId: string,
  updates: Partial<Transaction>
): Promise<void> => {
  const transactionRef = doc(
    db,
    `${getUserPath(uid)}/transactions/${transactionId}`
  );

  // Get the old transaction to check if category or account changed
  const oldTransactionSnap = await getDocs(
    query(
      collection(db, `${getUserPath(uid)}/transactions`),
      where('__name__', '==', transactionId)
    )
  );

  let oldCategoryId: string | null = null;
  let oldAccountId: string | undefined = undefined;
  let oldStatus: 'cleared' | 'uncleared' | 'reconciled' | undefined = undefined;

  if (!oldTransactionSnap.empty) {
    const oldTransaction = oldTransactionSnap.docs[0].data() as Transaction;
    oldCategoryId = oldTransaction.category_id;
    oldAccountId = oldTransaction.account_id;
    oldStatus = oldTransaction.status;
  }

  // Remove undefined fields (Firebase doesn't allow them)
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined)
  );

  await updateDoc(transactionRef, {
    ...cleanUpdates,
    updated_at: serverTimestamp(),
  });

  // Recalculate activity for old category if it had one
  if (oldCategoryId) {
    await recalculateCategoryActivity(uid, oldCategoryId);
  }

  // Recalculate activity for new category if it changed
  if (updates.category_id && updates.category_id !== oldCategoryId) {
    await recalculateCategoryActivity(uid, updates.category_id);
  }

  // Recalculate account balance if account changed or status changed
  if (oldAccountId && (updates.account_id !== oldAccountId || updates.status !== oldStatus)) {
    await recalculateAccountBalance(uid, oldAccountId);
  }

  if (updates.account_id && updates.account_id !== oldAccountId) {
    await recalculateAccountBalance(uid, updates.account_id);
  }
};

/**
 * Delete a transaction
 */
export const deleteTransaction = async (
  uid: string,
  transactionId: string
): Promise<void> => {
  // Get the transaction to check its category and account before deleting
  const transactionSnap = await getDocs(
    query(
      collection(db, `${getUserPath(uid)}/transactions`),
      where('__name__', '==', transactionId)
    )
  );

  let categoryId: string | null = null;
  let accountId: string | undefined = undefined;

  if (!transactionSnap.empty) {
    const transaction = transactionSnap.docs[0].data() as Transaction;
    categoryId = transaction.category_id;
    accountId = transaction.account_id;
  }

  const transactionRef = doc(
    db,
    `${getUserPath(uid)}/transactions/${transactionId}`
  );
  await deleteDoc(transactionRef);

  // Recalculate category activity if it had one
  if (categoryId) {
    await recalculateCategoryActivity(uid, categoryId);
  }

  // Recalculate account balance if it had one
  if (accountId) {
    await recalculateAccountBalance(uid, accountId);
  }
};

/**
 * Add a new category
 */
export const addCategory = async (
  uid: string,
  category: Omit<Category, 'id'>
): Promise<string> => {
  const categoriesRef = collection(db, `${getUserPath(uid)}/categories`);
  const docRef = await addDoc(categoriesRef, category);
  return docRef.id;
};

/**
 * Update a category
 */
export const updateCategory = async (
  uid: string,
  categoryId: string,
  updates: Partial<Category>
): Promise<void> => {
  const categoryRef = doc(db, `${getUserPath(uid)}/categories/${categoryId}`);
  await updateDoc(categoryRef, updates);
};

/**
 * Delete a category
 */
export const deleteCategory = async (
  uid: string,
  categoryId: string
): Promise<void> => {
  const categoryRef = doc(db, `${getUserPath(uid)}/categories/${categoryId}`);
  await deleteDoc(categoryRef);
};

/**
 * Move money between categories (YNAB envelope system)
 */
export const moveMoney = async (
  uid: string,
  fromCategoryId: string,
  toCategoryId: string,
  amount: number
): Promise<void> => {
  const fromCategoryRef = doc(
    db,
    `${getUserPath(uid)}/categories/${fromCategoryId}`
  );
  const toCategoryRef = doc(
    db,
    `${getUserPath(uid)}/categories/${toCategoryId}`
  );

  // Get current values
  const fromSnapshot = await getDocs(
    query(collection(db, `${getUserPath(uid)}/categories`), where('__name__', '==', fromCategoryId))
  );
  const toSnapshot = await getDocs(
    query(collection(db, `${getUserPath(uid)}/categories`), where('__name__', '==', toCategoryId))
  );

  if (fromSnapshot.empty || toSnapshot.empty) {
    throw new Error('Category not found');
  }

  const fromCategory = fromSnapshot.docs[0].data() as Category;
  const toCategory = toSnapshot.docs[0].data() as Category;

  // Update assigned amounts
  await updateDoc(fromCategoryRef, {
    assigned: fromCategory.assigned - amount,
    available: fromCategory.assigned - amount - fromCategory.activity,
  });

  await updateDoc(toCategoryRef, {
    assigned: toCategory.assigned + amount,
    available: toCategory.assigned + amount - toCategory.activity,
  });
};

/**
 * Add a new account
 */
export const addAccount = async (
  uid: string,
  account: Omit<Account, 'id'>
): Promise<string> => {
  const accountsRef = collection(db, `${getUserPath(uid)}/accounts`);
  const docRef = await addDoc(accountsRef, account);
  return docRef.id;
};

/**
 * Update an account
 */
export const updateAccount = async (
  uid: string,
  accountId: string,
  updates: Partial<Account>
): Promise<void> => {
  const accountRef = doc(db, `${getUserPath(uid)}/accounts/${accountId}`);

  // Remove undefined fields (Firebase doesn't allow them)
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined)
  );

  await updateDoc(accountRef, cleanUpdates);
};

/**
 * Store Gmail tokens in user config
 */
export const storeGmailTokens = async (
  uid: string,
  refreshToken: string,
  accessToken: string,
  expiresIn: number
): Promise<void> => {
  const configRef = doc(db, `${getUserPath(uid)}/config/gmail`);
  await setDoc(configRef, {
    gmail_refresh_token: refreshToken,
    gmail_access_token: accessToken,
    gmail_token_expiry: Date.now() + (expiresIn * 1000),
    updated_at: serverTimestamp(),
  }, { merge: true });
};

/**
 * Get Gmail tokens from user config
 */
export const getGmailTokens = async (
  uid: string
): Promise<{ refreshToken?: string; accessToken?: string; tokenExpiry?: number } | null> => {
  const configRef = doc(db, `${getUserPath(uid)}/config/gmail`);
  const configSnapshot = await getDoc(configRef);

  if (!configSnapshot.exists()) {
    return null;
  }

  const data = configSnapshot.data();
  return {
    refreshToken: data.gmail_refresh_token,
    accessToken: data.gmail_access_token,
    tokenExpiry: data.gmail_token_expiry,
  };
};

/**
 * Delete Gmail tokens from user config
 */
export const deleteGmailTokens = async (uid: string): Promise<void> => {
  const configRef = doc(db, `${getUserPath(uid)}/config/gmail`);
  await setDoc(configRef, {
    gmail_refresh_token: null,
    gmail_access_token: null,
    gmail_token_expiry: null,
    updated_at: serverTimestamp(),
  }, { merge: true });
};
