import { parseEmailWithGemini, extractEmailDomain } from './gemini';
import { addTransaction } from './firestore';
import type { Account, Category } from '../types';
import { checkTransactionFlags } from './transactionFlags';

export interface EmailData {
  from: string;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  messageId?: string;
  receivedDate?: Date;
}

/**
 * Find account by email domain
 */
export const findAccountByEmailDomain = (
  accounts: Account[],
  senderEmail: string
): Account | null => {
  const domain = extractEmailDomain(senderEmail);
  if (!domain) return null;

  return accounts.find((account) => {
    if (!account.email_domain) return false;
    return account.email_domain.toLowerCase() === domain.toLowerCase();
  }) || null;
};

/**
 * Process an incoming bank email and create a transaction
 */
export const processEmailTransaction = async (
  uid: string,
  email: EmailData,
  accounts: Account[],
  categories?: Category[]
): Promise<{ success: boolean; transactionId?: string; error?: string }> => {
  try {
    // 1. Find matching account by email domain
    const account = findAccountByEmailDomain(accounts, email.from);

    if (!account) {
      return {
        success: false,
        error: `No account linked to email domain: ${extractEmailDomain(email.from)}`,
      };
    }

    // 2. Parse email content with Gemini (include categories for auto-categorization)
    const emailContent = email.htmlContent || email.textContent || '';
    const parsed = await parseEmailWithGemini(
      emailContent, 
      email.subject, 
      email.receivedDate,
      categories?.map(cat => ({ id: cat.id, name: cat.name, group: cat.group }))
    );

    if (!parsed) {
      return {
        success: false,
        error: 'Failed to parse transaction details from email',
      };
    }

    // 3. Check for flags (currency mismatch, low confidence, etc.)
    const flags = checkTransactionFlags(email, parsed);

    // 4. Create transaction (use auto-categorized category_id if available)
    const transactionId = await addTransaction(uid, {
      date: parsed.date,
      payee: parsed.payee,
      amount: parsed.amount,
      account_id: account.id,
      status: 'uncleared', // Mark as uncleared initially
      category_id: parsed.category_id || null, // Use auto-categorized category or null
      notes: parsed.notes || `Auto-imported from ${email.from}`,
      original_email_id: email.messageId,
      flags: flags.length > 0 ? flags : undefined,
    });

    return {
      success: true,
      transactionId,
    };
  } catch (error) {
    console.error('Error processing email transaction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

/**
 * Batch process multiple emails
 */
export const processBatchEmails = async (
  uid: string,
  emails: EmailData[],
  accounts: Account[],
  categories?: Category[]
): Promise<{
  processed: number;
  successful: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
}> => {
  let processed = 0;
  let successful = 0;
  let failed = 0;
  const errors: Array<{ email: string; error: string }> = [];

  for (const email of emails) {
    processed++;
    const result = await processEmailTransaction(uid, email, accounts, categories);

    if (result.success) {
      successful++;
    } else {
      failed++;
      errors.push({
        email: email.from,
        error: result.error || 'Unknown error',
      });
    }
  }

  return { processed, successful, failed, errors };
};

/**
 * Validate email data before processing
 */
export const validateEmailData = (email: EmailData): boolean => {
  if (!email.from || !email.from.includes('@')) {
    return false;
  }

  if (!email.htmlContent && !email.textContent) {
    return false;
  }

  return true;
};

/**
 * Strip HTML tags from email content (fallback for text parsing)
 */
export const stripHtmlTags = (html: string): string => {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};
