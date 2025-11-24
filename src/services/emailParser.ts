import { parseEmailWithGemini, extractEmailDomain } from './gemini';
import { addTransaction } from './firestore';
import type { Account } from '../types';

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
  accounts: Account[]
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

    // 2. Parse email content with Gemini
    const emailContent = email.htmlContent || email.textContent || '';
    const parsed = await parseEmailWithGemini(emailContent, email.subject);

    if (!parsed) {
      return {
        success: false,
        error: 'Failed to parse transaction details from email',
      };
    }

    // 3. Check confidence level
    if (parsed.confidence === 'low') {
      console.warn('Low confidence transaction parse:', parsed);
      // You might want to flag this for manual review
    }

    // 4. Create transaction
    const transactionId = await addTransaction(uid, {
      date: parsed.date,
      payee: parsed.payee,
      amount: parsed.amount,
      account_id: account.id,
      status: 'uncleared', // Mark as uncleared initially
      category_id: null, // User can categorize later
      notes: parsed.notes || `Auto-imported from ${email.from}`,
      original_email_id: email.messageId,
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
  accounts: Account[]
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
    const result = await processEmailTransaction(uid, email, accounts);

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
