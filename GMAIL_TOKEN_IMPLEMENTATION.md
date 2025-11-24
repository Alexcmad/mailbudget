# Gmail Token Persistence Implementation

## Overview

This implementation adds persistent Gmail authentication so users only need to authorize once instead of signing in every time they sync emails.

## What Changed

### 1. **Token Storage in Firestore**

Added token storage to `users/{userId}/config/gmail` document:
- `gmail_refresh_token` - OAuth refresh token (for getting new access tokens)
- `gmail_access_token` - Current access token
- `gmail_token_expiry` - Timestamp when access token expires

New Firestore functions in [firestore.ts](src/services/firestore.ts):
- `storeGmailTokens()` - Save tokens after authorization
- `getGmailTokens()` - Retrieve stored tokens
- `deleteGmailTokens()` - Remove tokens (for logout/revoke)

### 2. **Smart Token Management**

The Gmail service ([gmailService.ts](src/services/gmailService.ts)) now:
1. **Checks for stored access token** - Uses it if not expired
2. **Refreshes expired tokens** - Uses refresh token to get new access token
3. **Re-authorizes only when necessary** - Prompts user only if no valid tokens exist

### 3. **Updated Settings UI**

The Settings page ([Settings.tsx](src/views/Settings.tsx)) now:
- Shows authorization status on page load
- Has separate "Authorize Gmail" button (one-time) and "Sync Emails" button (repeatable)
- Displays clear messaging about persistent authorization
- Tests connection without triggering re-authorization

## Important Limitations

### ⚠️ Firebase Auth Limitation

**Firebase Authentication does NOT expose OAuth refresh tokens in the browser.**

When using `signInWithPopup()` with `GoogleAuthProvider`, Firebase only provides:
- `accessToken` - Short-lived (1 hour)
- `idToken` - Firebase ID token (not an OAuth refresh token)

**The current implementation stores the access token but cannot obtain a true refresh token from Firebase Auth in the browser.**

### Solutions

#### Option 1: Accept Hourly Re-authorization (Current Implementation)
- Access tokens expire in ~1 hour
- After 1 hour, user needs to click "Authorize Gmail" again
- Still better than authorizing on every sync
- Simple, no backend required

#### Option 2: Implement Backend Token Exchange (Recommended for Production)
To get true persistent authentication, you need a backend:

1. **Firebase Cloud Function** to exchange authorization code for tokens:
```typescript
// functions/src/gmailAuth.ts
import { google } from 'googleapis';

export const exchangeCodeForTokens = functions.https.onCall(async (data, context) => {
  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );

  const { tokens } = await oauth2Client.getToken(data.authorizationCode);

  // Store refresh_token in Firestore
  await admin.firestore()
    .doc(`users/${context.auth.uid}/config/gmail`)
    .set({
      gmail_refresh_token: tokens.refresh_token,
      gmail_access_token: tokens.access_token,
      gmail_token_expiry: Date.now() + (tokens.expiry_date * 1000)
    });

  return { success: true };
});
```

2. **Frontend authorization flow**:
```typescript
// Use authorization code flow instead of implicit flow
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
provider.setCustomParameters({
  access_type: 'offline',
  prompt: 'consent'
});

const result = await signInWithPopup(auth, provider);

// Get authorization code from redirect
// Send code to backend function
const exchangeTokens = httpsCallable(functions, 'exchangeCodeForTokens');
await exchangeTokens({ authorizationCode: code });
```

3. **Backend token refresh**:
```typescript
// functions/src/gmailRefresh.ts
export const refreshGmailToken = functions.https.onCall(async (data, context) => {
  const userDoc = await admin.firestore()
    .doc(`users/${context.auth.uid}/config/gmail`)
    .get();

  const refreshToken = userDoc.data()?.gmail_refresh_token;

  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  await userDoc.ref.update({
    gmail_access_token: credentials.access_token,
    gmail_token_expiry: credentials.expiry_date
  });

  return { accessToken: credentials.access_token };
});
```

#### Option 3: Use Google Cloud Run Service
- Deploy a small Node.js service to handle OAuth flow
- More control than Cloud Functions
- Can handle OAuth redirect URIs properly

## Environment Variables

Add to `.env`:
```env
# Optional - only needed for backend token refresh
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=your_client_secret
```

These are only used if implementing Option 2 above.

## How to Test

1. **Start the app**: `npm run dev`
2. **Go to Settings page**
3. **Click "Authorize Gmail"** - You'll see a Google sign-in popup
4. **Grant permissions**
5. **Check Firestore** - You should see tokens stored in `users/{userId}/config/gmail`
6. **Click "Sync Emails"** - Should work without re-authorizing
7. **Wait 1 hour** - Token will expire
8. **Click "Sync Emails" again** - Will prompt for re-authorization (due to Firebase limitation)

## Security Considerations

### Firestore Security Rules

Make sure your `firestore.rules` restricts access:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

This ensures users can only read/write their own tokens.

### Token Storage

- Tokens are stored in Firestore (server-side)
- Not stored in localStorage (vulnerable to XSS)
- Protected by Firestore security rules
- Only accessible to authenticated user

## Future Improvements

1. **Implement backend token exchange** (see Option 2 above)
2. **Add token revocation** - Button to delete stored tokens
3. **Add automatic background sync** - Cloud Function runs periodically
4. **Token encryption** - Encrypt tokens before storing in Firestore
5. **Error handling** - Better UX for expired/invalid tokens

## Migration Notes

If you had the old implementation:
- Old code called `signInWithPopup()` on every sync
- New code stores tokens and reuses them
- Users will need to authorize once after this update
- Tokens will automatically be saved

## Related Files

- [src/types/index.ts](src/types/index.ts) - Added UserConfig token fields
- [src/services/firestore.ts](src/services/firestore.ts) - Token storage functions
- [src/services/gmailService.ts](src/services/gmailService.ts) - Smart token management
- [src/views/Settings.tsx](src/views/Settings.tsx) - Updated UI for authorization
