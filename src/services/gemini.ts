import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY || API_KEY === 'your_gemini_api_key_here') {
  console.warn('Gemini API key not configured. Email parsing will not work.');
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export interface ParsedTransaction {
  date: string; // ISO format YYYY-MM-DD
  payee: string;
  amount: number; // Negative for expenses/purchases, positive for deposits/income
  transactionType: 'purchase' | 'deposit' | 'withdrawal' | 'transfer' | 'fee' | 'unknown';
  notes?: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Parse a bank email using Gemini AI
 * Extracts transaction details from the email content
 */
export const parseEmailWithGemini = async (
  emailContent: string,
  emailSubject?: string
): Promise<ParsedTransaction | null> => {
  if (!genAI) {
    throw new Error('Gemini API not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a financial transaction parser. Analyze this bank notification email and extract transaction details.

Email Subject: ${emailSubject || 'N/A'}

Email Content:
${emailContent}

Extract the following information and respond ONLY with a valid JSON object (no markdown, no code blocks, just raw JSON):

{
  "date": "YYYY-MM-DD format (use today's date if not specified, current date is ${new Date().toISOString().split('T')[0]})",
  "payee": "merchant/vendor name",
  "amount": number (NEGATIVE for purchases/expenses/withdrawals, POSITIVE for deposits/income)",
  "transactionType": "purchase" | "deposit" | "withdrawal" | "transfer" | "fee" | "unknown",
  "notes": "any additional details or original amount if currency conversion occurred",
  "confidence": "high" | "medium" | "low" (high if all details are clear, medium if some details inferred, low if uncertain)"
}

Rules:
- Amount must be NEGATIVE for purchases, debits, expenses, withdrawals, and fees
- Amount must be POSITIVE for deposits, credits, income, and refunds
- Use the merchant name as payee (e.g., "TOTAL-LIGUANEA-COSTAL" not "Scotiabank")
- Extract the exact transaction date if provided, otherwise use today's date
- Be concise with payee names, remove unnecessary prefixes/suffixes
- Only return the JSON object, nothing else`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    // Remove markdown code blocks if present
    let jsonText = text;
    if (text.startsWith('```')) {
      jsonText = text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    }

    const parsed = JSON.parse(jsonText) as ParsedTransaction;

    // Validate the response
    if (!parsed.date || !parsed.payee || parsed.amount === undefined) {
      console.error('Invalid response from Gemini:', parsed);
      return null;
    }

    // Ensure amount is a number
    if (typeof parsed.amount === 'string') {
      parsed.amount = parseFloat(parsed.amount);
    }

    return parsed;
  } catch (error) {
    console.error('Error parsing email with Gemini:', error);
    throw error;
  }
};

/**
 * Extract email domain from sender email address
 * Handles formats like: "sender@domain.com", "Name <sender@domain.com>", "sender@domain.com (Name)"
 */
export const extractEmailDomain = (emailAddress: string): string => {
  // Match domain after @ sign, allowing for trailing characters like > or )
  const match = emailAddress.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1].toLowerCase() : '';
};

/**
 * Check if an email is from a known bank/financial institution
 * This can be expanded with more patterns
 */
export const isBankEmail = (emailAddress: string): boolean => {
  const bankDomains = [
    'scotiabank.com',
    'chase.com',
    'bankofamerica.com',
    'wellsfargo.com',
    'citi.com',
    'capitalone.com',
    'usbank.com',
    'pnc.com',
    'tdbank.com',
    'bmo.com',
    'rbc.com',
    'cibc.com',
    'alert',
    'notification',
    'alerts',
  ];

  const domain = extractEmailDomain(emailAddress).toLowerCase();
  return bankDomains.some(
    (bankDomain) => domain.includes(bankDomain) || domain.endsWith(bankDomain)
  );
};
