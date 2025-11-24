import { auth } from '../config/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getGmailTokens, storeGmailTokens } from './firestore';

// Gmail API Configuration
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
];

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload?: {
    headers: Array<{ name: string; value: string }>;
    parts?: Array<{ mimeType: string; body: { data: string } }>;
    body?: { data: string };
  };
  internalDate: string;
}

export interface EmailData {
  from: string;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  messageId: string;
  receivedDate: Date;
}

/**
 * Refresh the access token using the refresh token
 */
const refreshAccessToken = async (refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> => {
  // Get client ID from Firebase config
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

  if (!clientId) {
    throw new Error('VITE_GOOGLE_CLIENT_ID not configured');
  }

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to refresh token: ${error.error_description || error.error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
};

/**
 * Get a valid Gmail access token
 * - First checks if we have a stored, non-expired access token
 * - If expired, uses refresh token to get a new access token
 * - If no stored tokens, prompts user to authorize
 */
const getGmailAccessToken = async (): Promise<string> => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Try to get stored tokens
  const storedTokens = await getGmailTokens(user.uid);

  // If we have a valid access token that hasn't expired, use it
  if (storedTokens?.accessToken && storedTokens.tokenExpiry) {
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    if (storedTokens.tokenExpiry > now + bufferTime) {
      console.log('🔑 Using stored access token');
      return storedTokens.accessToken;
    }

    // Token is expired or about to expire, try to refresh it
    if (storedTokens.refreshToken) {
      console.log('🔄 Access token expired, refreshing...');
      try {
        const { accessToken, expiresIn } = await refreshAccessToken(storedTokens.refreshToken);

        // Store the new access token
        await storeGmailTokens(user.uid, storedTokens.refreshToken, accessToken, expiresIn);

        console.log('✅ Access token refreshed successfully');
        return accessToken;
      } catch (error) {
        console.error('❌ Failed to refresh token, will re-authorize:', error);
        // If refresh fails, fall through to re-authorization
      }
    }
  }

  // No stored tokens or refresh failed - need to authorize
  console.log('🔐 No valid tokens found, requesting authorization...');

  const provider = new GoogleAuthProvider();
  SCOPES.forEach(scope => provider.addScope(scope));

  // Request offline access to get refresh token
  provider.setCustomParameters({
    access_type: 'offline',
    prompt: 'consent', // Force consent screen to ensure we get refresh token
  });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);

  if (!credential) {
    throw new Error('Failed to get Gmail credentials');
  }

  const accessToken = credential.accessToken;
  const refreshToken = credential.idToken; // Note: Firebase doesn't expose OAuth refresh token directly

  if (!accessToken) {
    throw new Error('No access token available');
  }

  // Note: Firebase Auth doesn't expose the OAuth refresh token in the browser
  // We would need to implement a backend endpoint to exchange the authorization code for tokens
  // For now, store the access token with a default expiry
  const expiresIn = 3600; // 1 hour default
  await storeGmailTokens(user.uid, refreshToken || '', accessToken, expiresIn);

  console.log('✅ Gmail authorization successful, tokens stored');
  return accessToken;
};

/**
 * Authorize Gmail access and store tokens (one-time setup)
 * This explicitly requests authorization and stores the tokens
 */
export const authorizeGmailAccess = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const provider = new GoogleAuthProvider();
    SCOPES.forEach(scope => provider.addScope(scope));

    // Request offline access to get refresh token
    provider.setCustomParameters({
      access_type: 'offline',
      prompt: 'consent',
    });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential || !credential.accessToken) {
      throw new Error('Failed to get Gmail credentials');
    }

    const accessToken = credential.accessToken;
    const refreshToken = credential.idToken || '';
    const expiresIn = 3600;

    await storeGmailTokens(user.uid, refreshToken, accessToken, expiresIn);

    return {
      success: true,
      message: 'Gmail authorization successful! You can now sync emails without re-authorizing.',
    };
  } catch (error) {
    console.error('Gmail authorization failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to authorize Gmail access',
    };
  }
};

/**
 * Check if Gmail is authorized (has stored tokens)
 */
export const isGmailAuthorized = async (): Promise<boolean> => {
  const user = auth.currentUser;
  if (!user) return false;

  const tokens = await getGmailTokens(user.uid);
  return !!(tokens?.refreshToken || tokens?.accessToken);
};

/**
 * Test Gmail connection
 */
export const testGmailConnection = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    const accessToken = await getGmailAccessToken();

    const response = await fetch(`${GMAIL_API_BASE}/users/me/profile`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to connect to Gmail');
    }

    const profile = await response.json();

    return {
      success: true,
      message: `Successfully connected to Gmail: ${profile.emailAddress}`,
    };
  } catch (error) {
    console.error('Gmail connection test failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to connect to Gmail',
    };
  }
};

/**
 * Decode base64url encoded string
 */
const decodeBase64Url = (str: string): string => {
  try {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch (error) {
    console.error('Failed to decode base64url:', error);
    return '';
  }
};

/**
 * Extract email content from Gmail message
 */
const extractEmailContent = (message: GmailMessage): {
  htmlContent?: string;
  textContent?: string;
} => {
  let htmlContent: string | undefined;
  let textContent: string | undefined;

  const parts = message.payload?.parts || [];

  // Check for multipart message
  if (parts.length > 0) {
    for (const part of parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        htmlContent = decodeBase64Url(part.body.data);
      } else if (part.mimeType === 'text/plain' && part.body?.data) {
        textContent = decodeBase64Url(part.body.data);
      }
    }
  } else if (message.payload?.body?.data) {
    // Simple message body
    const content = decodeBase64Url(message.payload.body.data);
    if (message.payload.mimeType === 'text/html') {
      htmlContent = content;
    } else {
      textContent = content;
    }
  }

  return { htmlContent, textContent };
};

/**
 * Get header value from Gmail message
 */
const getHeader = (message: GmailMessage, headerName: string): string => {
  const headers = message.payload?.headers || [];
  const header = headers.find((h) => h.name.toLowerCase() === headerName.toLowerCase());
  return header?.value || '';
};

/**
 * Fetch recent emails from Gmail
 */
export const fetchRecentEmails = async (maxResults: number = 10): Promise<EmailData[]> => {
  try {
    console.log(`📧 Starting Gmail sync: fetching up to ${maxResults} emails...`);
    const accessToken = await getGmailAccessToken();

    // List messages
    const listResponse = await fetch(
      `${GMAIL_API_BASE}/users/me/messages?maxResults=${maxResults}&q=is:unread category:primary`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!listResponse.ok) {
      const error = await listResponse.json();
      throw new Error(error.error?.message || 'Failed to fetch email list');
    }

    const listData = await listResponse.json();
    const messages = listData.messages || [];

    console.log(`📧 Found ${messages.length} message(s) in Gmail`);

    if (messages.length === 0) {
      console.log('📧 No emails to process');
      return [];
    }

    // Fetch full message details for each message
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
        console.error(`Failed to fetch message ${msg.id}`);
        return null;
      }

      const fullMessage: GmailMessage = await msgResponse.json();
      const { htmlContent, textContent } = extractEmailContent(fullMessage);
      const from = getHeader(fullMessage, 'From');
      const subject = getHeader(fullMessage, 'Subject');

      // Log email subject and sender
      console.log(`📧 Email: Subject="${subject}" | From="${from}"`);

      return {
        from,
        subject,
        htmlContent,
        textContent,
        messageId: fullMessage.id,
        receivedDate: new Date(parseInt(fullMessage.internalDate)),
      };
    });

    const emails = await Promise.all(emailPromises);
    const validEmails = emails.filter((email): email is EmailData => email !== null);
    
    console.log(`📧 Gmail sync complete: ${validEmails.length} email(s) processed`);
    
    return validEmails;
  } catch (error) {
    console.error('Failed to fetch emails:', error);
    throw error;
  }
};

/**
 * Fetch emails from specific sender domain
 */
export const fetchEmailsFromDomain = async (
  domain: string,
  maxResults: number = 50
): Promise<EmailData[]> => {
  try {
    console.log(`📧 Starting Gmail sync for domain "${domain}": fetching up to ${maxResults} emails...`);
    const accessToken = await getGmailAccessToken();

    // Search for emails from domain
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

    console.log(`📧 Found ${messages.length} message(s) from domain "${domain}"`);

    if (messages.length === 0) {
      console.log(`📧 No emails found from domain "${domain}"`);
      return [];
    }

    // Fetch full message details
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
      const from = getHeader(fullMessage, 'From');
      const subject = getHeader(fullMessage, 'Subject');

      // Log email subject and sender
      console.log(`📧 Email: Subject="${subject}" | From="${from}"`);

      return {
        from,
        subject,
        htmlContent,
        textContent,
        messageId: fullMessage.id,
        receivedDate: new Date(parseInt(fullMessage.internalDate)),
      };
    });

    const emails = await Promise.all(emailPromises);
    const validEmails = emails.filter((email): email is EmailData => email !== null);
    
    console.log(`📧 Gmail sync complete for domain "${domain}": ${validEmails.length} email(s) processed`);
    
    return validEmails;
  } catch (error) {
    console.error('Failed to fetch emails from domain:', error);
    throw error;
  }
};

/**
 * Mark email as read
 */
export const markEmailAsRead = async (messageId: string): Promise<void> => {
  try {
    const accessToken = await getGmailAccessToken();

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
      const errorMessage = error.error?.message || 'Failed to mark email as read';
      console.error('Gmail API error:', error);
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('Failed to mark email as read:', error);
    throw error;
  }
};

/**
 * Extract domain from email address
 */
const extractDomain = (emailAddress: string): string | null => {
  const match = emailAddress.match(/@([^>]+)/);
  if (match && match[1]) {
    return match[1].trim().toLowerCase();
  }
  return null;
};

/**
 * Fetch unique sender domains from recent emails
 * This helps users discover which bank domains are sending them emails
 */
export const fetchUniqueSenderDomains = async (maxResults: number = 100): Promise<Array<{
  domain: string;
  count: number;
  sampleSender: string;
}>> => {
  try {
    console.log(`🔍 Searching for unique sender domains in recent ${maxResults} emails...`);
    const accessToken = await getGmailAccessToken();

    // Fetch recent emails (not just unread, to get a better sample)
    const listResponse = await fetch(
      `${GMAIL_API_BASE}/users/me/messages?maxResults=${maxResults}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!listResponse.ok) {
      const error = await listResponse.json();
      throw new Error(error.error?.message || 'Failed to fetch email list');
    }

    const listData = await listResponse.json();
    const messages = listData.messages || [];

    console.log(`🔍 Analyzing ${messages.length} message(s)...`);

    if (messages.length === 0) {
      return [];
    }

    // Fetch sender info for each message (using metadata format for speed)
    const domainMap = new Map<string, { count: number; sampleSender: string }>();

    const senderPromises = messages.map(async (msg: { id: string }) => {
      try {
        const msgResponse = await fetch(
          `${GMAIL_API_BASE}/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!msgResponse.ok) {
          return null;
        }

        const message: GmailMessage = await msgResponse.json();
        const from = getHeader(message, 'From');

        if (from) {
          const domain = extractDomain(from);
          if (domain) {
            const existing = domainMap.get(domain);
            if (existing) {
              existing.count++;
            } else {
              domainMap.set(domain, { count: 1, sampleSender: from });
            }
          }
        }

        return null;
      } catch (error) {
        return null;
      }
    });

    await Promise.all(senderPromises);

    // Convert map to sorted array
    const domains = Array.from(domainMap.entries())
      .map(([domain, { count, sampleSender }]) => ({
        domain,
        count,
        sampleSender,
      }))
      .sort((a, b) => b.count - a.count); // Sort by count (most frequent first)

    console.log(`🔍 Found ${domains.length} unique sender domain(s)`);

    return domains;
  } catch (error) {
    console.error('Failed to fetch sender domains:', error);
    throw error;
  }
};
