import type { TransactionFlag } from '../types';
import type { EmailData } from './emailParser';

export interface FlagRule {
  id: string;
  name: string;
  check: (email: EmailData, parsedTransaction?: any) => boolean;
  getMessage: (email: EmailData, parsedTransaction?: any) => string;
}

/**
 * Flag rules for detecting problematic transactions
 */
export const FLAG_RULES: FlagRule[] = [
  {
    id: 'currency_mismatch',
    name: 'Currency Mismatch',
    check: (email: EmailData) => {
      const content = (email.htmlContent || email.textContent || '').toLowerCase();
      return content.includes('please note, the dollar amount reported is in the currency of the account') ||
             content.includes('dollar amount reported is in the currency') ||
             content.includes('amount reported is in the currency of the account');
    },
    getMessage: () => 'Transaction amount may be in USD instead of JMD. Please verify the currency.',
  },
  {
    id: 'low_confidence',
    name: 'Low Confidence Parse',
    check: (_email: EmailData, parsedTransaction?: any) => {
      return parsedTransaction?.confidence === 'low';
    },
    getMessage: () => 'Transaction was parsed with low confidence. Please review the details.',
  },
  {
    id: 'missing_category',
    name: 'Missing Category',
    check: (_email: EmailData, parsedTransaction?: any) => {
      return !parsedTransaction?.category_id;
    },
    getMessage: () => 'Transaction was not automatically categorized. Please assign a category.',
  },
  {
    id: 'unusual_amount',
    name: 'Unusual Amount',
    check: (_email: EmailData, parsedTransaction?: any) => {
      if (!parsedTransaction?.amount) return false;
      const amount = Math.abs(parsedTransaction.amount);
      // Flag transactions over $10,000 or under $0.01
      return amount > 10000 || amount < 0.01;
    },
    getMessage: (_email: EmailData, parsedTransaction?: any) => {
      const amount = Math.abs(parsedTransaction?.amount || 0);
      if (amount > 10000) {
        return `Large transaction amount: $${amount.toLocaleString()}. Please verify.`;
      }
      return 'Very small transaction amount. Please verify.';
    },
  },
];

/**
 * Check an email and parsed transaction against all flag rules
 */
export const checkTransactionFlags = (
  email: EmailData,
  parsedTransaction?: any
): TransactionFlag[] => {
  const flags: TransactionFlag[] = [];

  for (const rule of FLAG_RULES) {
    if (rule.check(email, parsedTransaction)) {
      flags.push({
        reason: rule.id,
        message: rule.getMessage(email, parsedTransaction),
        created_at: new Date().toISOString(),
        resolved: false,
      });
    }
  }

  return flags;
};

/**
 * Check if a transaction has unresolved flags
 */
export const hasUnresolvedFlags = (transaction: { flags?: TransactionFlag[] }): boolean => {
  if (!transaction.flags || transaction.flags.length === 0) return false;
  return transaction.flags.some(flag => !flag.resolved);
};

