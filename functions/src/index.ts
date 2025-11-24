import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

admin.initializeApp();

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

interface ParsedTransaction {
  date: string;
  payee: string;
  amount: number;
  transactionType: 'purchase' | 'deposit' | 'withdrawal' | 'transfer' | 'fee' | 'unknown';
  notes?: string;
  confidence: 'high' | 'medium' | 'low';
}

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload?: {
    headers: Array<{ name: string; value: string }>;
    parts?: Array<{ mimeType: string; body: { data: string } }>;
    body?: { data: string };
    mimeType?: string;
  };
  internalDate: string;
}

interface EmailData {
  from: string;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  messageId: string;
  receivedDate: Date;
}

/**
 * Get Gmail OAuth2 client ID and secret from environment
 * Uses Firebase Secrets (recommended) or falls back to config
 */
const getOAuthCredentials = () => {
  // Try Firebase Secrets first (recommended)
  const clientId = process.env.GMAIL_CLIENT_ID || functions.config().gmail?.client_id;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET || functions.config().gmail?.client_secret;
  const geminiApiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.api_key;

  if (!clientId || !clientSecret) {
    throw new Error('Gmail OAuth credentials not configured. Set secrets: firebase functions:secrets:set GMAIL_CLIENT_ID GMAIL_CLIENT_SECRET');
  }

  if (!geminiApiKey) {
    throw new Error('Gemini API key not configured. Set secret: firebase functions:secrets:set GEMINI_API_KEY');
  }

  return { clientId, clientSecret, geminiApiKey };
};

/**
 * Refresh Gmail access token using refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const { clientId, clientSecret } = getOAuthCredentials();

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to refresh token: ${error.error_description || error.error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Get Gmail access token (refresh if needed)
 */
async function getGmailAccessToken(uid: string): Promise<string> {
  const db = admin.firestore();
  const configRef = db.doc(`users/${uid}/config/gmail`);
  const configSnap = await configRef.get();

  if (!configSnap.exists) {
    throw new Error(`No Gmail tokens found for user ${uid}`);
  }

  const config = configSnap.data()!;
  const refreshToken = config.gmail_refresh_token;
  const accessToken = config.gmail_access_token;
  const tokenExpiry = config.gmail_token_expiry || 0;

  if (!refreshToken) {
    throw new Error(`No refresh token found for user ${uid}`);
  }

  // Check if access token is still valid (with 5 minute buffer)
  if (accessToken && tokenExpiry > Date.now() + 5 * 60 * 1000) {
    return accessToken;
  }

  // Refresh the token
  console.log(`Refreshing access token for user ${uid}`);
  const newAccessToken = await refreshAccessToken(refreshToken);
  const expiresIn = 3600; // 1 hour

  // Update stored token
  await configRef.update({
    gmail_access_token: newAccessToken,
    gmail_token_expiry: Date.now() + (expiresIn * 1000),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  return newAccessToken;
}

/**
 * Decode base64url encoded string
 */
function decodeBase64Url(str: string): string {
  try {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(
      Buffer.from(base64, 'base64')
        .toString('binary')
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch (error) {
    console.error('Failed to decode base64url:', error);
    return '';
  }
}

/**
 * Extract email content from Gmail message
 */
function extractEmailContent(message: GmailMessage): { htmlContent?: string; textContent?: string } {
  let htmlContent: string | undefined;
  let textContent: string | undefined;

  const parts = message.payload?.parts || [];

  if (parts.length > 0) {
    for (const part of parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        htmlContent = decodeBase64Url(part.body.data);
      } else if (part.mimeType === 'text/plain' && part.body?.data) {
        textContent = decodeBase64Url(part.body.data);
      }
    }
  } else if (message.payload?.body?.data) {
    const content = decodeBase64Url(message.payload.body.data);
    if (message.payload.mimeType === 'text/html') {
      htmlContent = content;
    } else {
      textContent = content;
    }
  }

  return { htmlContent, textContent };
}

/**
 * Get header value from Gmail message
 */
function getHeader(message: GmailMessage, headerName: string): string {
  const headers = message.payload?.headers || [];
  const header = headers.find((h) => h.name.toLowerCase() === headerName.toLowerCase());
  return header?.value || '';
}

/**
 * Fetch emails from specific domain
 */
async function fetchEmailsFromDomain(
  accessToken: string,
  domain: string,
  maxResults: number = 50
): Promise<EmailData[]> {
  const query = `from:@${domain} is:unread`;
  const listResponse = await fetch(
    `${GMAIL_API_BASE}/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!listResponse.ok) {
    const error = await listResponse.json();
    throw new Error(error.error?.message || 'Failed to fetch emails from domain');
  }

  const listData = await listResponse.json();
  const messages = listData.messages || [];

  if (messages.length === 0) {
    return [];
  }

  const emailPromises = messages.map(async (msg: { id: string }) => {
    const msgResponse = await fetch(
      `${GMAIL_API_BASE}/users/me/messages/${msg.id}?format=full`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!msgResponse.ok) {
      return null;
    }

    const fullMessage: GmailMessage = await msgResponse.json();
    const { htmlContent, textContent } = extractEmailContent(fullMessage);

    return {
      from: getHeader(fullMessage, 'From'),
      subject: getHeader(fullMessage, 'Subject'),
      htmlContent,
      textContent,
      messageId: fullMessage.id,
      receivedDate: new Date(parseInt(fullMessage.internalDate)),
    };
  });

  const emails = await Promise.all(emailPromises);
  return emails.filter((email): email is EmailData => email !== null);
}

/**
 * Parse email with Gemini
 */
async function parseEmailWithGemini(
  emailContent: string,
  emailSubject: string,
  geminiApiKey: string
): Promise<ParsedTransaction | null> {
  const genAI = new GoogleGenerativeAI(geminiApiKey);
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

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    let jsonText = text;
    if (text.startsWith('```')) {
      jsonText = text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    }

    const parsed = JSON.parse(jsonText) as ParsedTransaction;

    if (!parsed.date || !parsed.payee || parsed.amount === undefined) {
      console.error('Invalid response from Gemini:', parsed);
      return null;
    }

    if (typeof parsed.amount === 'string') {
      parsed.amount = parseFloat(parsed.amount);
    }

    return parsed;
  } catch (error) {
    console.error('Error parsing email with Gemini:', error);
    return null;
  }
}

/**
 * Extract email domain from sender email address
 */
function extractEmailDomain(emailAddress: string): string {
  const match = emailAddress.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Find account by email domain
 */
function findAccountByEmailDomain(accounts: any[], senderEmail: string): any | null {
  const domain = extractEmailDomain(senderEmail);
  if (!domain) return null;

  return accounts.find((account) => {
    if (!account.email_domain) return false;
    return account.email_domain.toLowerCase() === domain.toLowerCase();
  }) || null;
}

/**
 * Mark email as read
 */
async function markEmailAsRead(accessToken: string, messageId: string): Promise<void> {
  const response = await fetch(
    `${GMAIL_API_BASE}/users/me/messages/${messageId}/modify`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        removeLabelIds: ['UNREAD'],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Failed to mark email as read');
  }
}

/**
 * Scheduled function to sync emails every hour
 */
export const syncEmailsHourly = functions.pubsub
  .schedule('every 1 hours')
  .timeZone('America/New_York')
  .onRun(async (_context: functions.EventContext) => {
    console.log('🕐 Hourly email sync started');

    try {
      const db = admin.firestore();
      const { geminiApiKey } = getOAuthCredentials();

      // Find all users with Gmail tokens configured
      const usersSnapshot = await db.collectionGroup('config')
        .where('gmail_refresh_token', '!=', null)
        .get();

      if (usersSnapshot.empty) {
        console.log('No users with Gmail tokens found');
        return null;
      }

      for (const configDoc of usersSnapshot.docs) {
        const userId = configDoc.ref.parent.parent?.id;
        if (!userId) continue;

        console.log(`Processing user: ${userId}`);

        try {
          // Get Gmail access token
          const accessToken = await getGmailAccessToken(userId);

          // Get user's accounts with email domains
          const accountsSnapshot = await db.collection(`users/${userId}/accounts`).get();
          const accounts = accountsSnapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => ({
            id: doc.id,
            ...doc.data(),
          }));

          const linkedDomains = accounts
            .map((account: any) => account.email_domain)
            .filter((domain: any): domain is string => !!domain);

          if (linkedDomains.length === 0) {
            console.log(`No email domains linked for user ${userId}`);
            continue;
          }

          console.log(`Found ${linkedDomains.length} linked domain(s) for user ${userId}`);

          // Fetch emails from all linked domains
          let allEmails: EmailData[] = [];
          for (const domain of linkedDomains) {
            try {
              const emails = await fetchEmailsFromDomain(accessToken, domain, 50);
              allEmails = allEmails.concat(emails);
              console.log(`Fetched ${emails.length} email(s) from domain ${domain}`);
            } catch (error) {
              console.error(`Error fetching emails from domain ${domain}:`, error);
            }
          }

          if (allEmails.length === 0) {
            console.log(`No new emails found for user ${userId}`);
            continue;
          }

          console.log(`Processing ${allEmails.length} email(s) for user ${userId}`);

          // Process each email
          let imported = 0;
          let skipped = 0;

          for (const email of allEmails) {
            try {
              // Find matching account
              const account = findAccountByEmailDomain(accounts, email.from);
              if (!account) {
                console.log(`No account linked for email from ${email.from}`);
                skipped++;
                continue;
              }

              // Parse email
              const emailContent = email.htmlContent || email.textContent || '';
              const parsed = await parseEmailWithGemini(emailContent, email.subject, geminiApiKey);

              if (!parsed) {
                console.log(`Failed to parse email from ${email.from}`);
                skipped++;
                continue;
              }

              // Check for duplicate
              const transactionsRef = db.collection(`users/${userId}/transactions`);
              if (email.messageId) {
                const duplicateQuery = await transactionsRef
                  .where('original_email_id', '==', email.messageId)
                  .get();

                if (!duplicateQuery.empty) {
                  console.log(`Duplicate transaction found for email ${email.messageId}`);
                  skipped++;
                  continue;
                }
              }

              // Create transaction
              await transactionsRef.add({
                date: parsed.date,
                payee: parsed.payee,
                amount: parsed.amount,
                account_id: account.id,
                status: 'uncleared',
                category_id: null,
                notes: parsed.notes || `Auto-imported from ${email.from}`,
                original_email_id: email.messageId,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
              });

              imported++;
              console.log(`✅ Imported transaction: ${parsed.payee} - ${parsed.amount}`);

              // Mark email as read
              if (email.messageId) {
                try {
                  await markEmailAsRead(accessToken, email.messageId);
                } catch (err) {
                  console.warn(`Failed to mark email as read:`, err);
                }
              }
            } catch (error) {
              console.error(`Error processing email from ${email.from}:`, error);
              skipped++;
            }
          }

          console.log(`✅ Sync complete for user ${userId}: ${imported} imported, ${skipped} skipped`);
        } catch (error) {
          console.error(`Error processing user ${userId}:`, error);
        }
      }

      console.log('🕐 Hourly email sync completed');
      return null;
    } catch (error) {
      console.error('❌ Hourly email sync failed:', error);
      throw error;
    }
  });

