# Environment Variables Setup Guide

This guide shows you exactly where to find each value you need for your `.env` file.

## Required Environment Variables

Create a `.env` file in the `mailbudget/` directory with the following variables:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_ALLOWED_EMAIL=
```

---

## Where to Find Each Value

### 1. Firebase Configuration Values

All Firebase values come from the **Firebase Console**.

#### Step-by-Step:

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project** (or create a new one)
3. **Click the gear icon** ⚙️ next to "Project Overview" → **Project Settings**
4. **Scroll down to "Your apps"** section
5. **If you don't have a web app yet:**
   - Click **"Add app"** → Select **Web** (</> icon)
   - Register your app (give it a nickname like "MailBudget")
   - You'll see the config values appear

6. **Copy the config values** from the Firebase SDK configuration:

```javascript
// You'll see something like this in Firebase Console:
const firebaseConfig = {
  apiKey: "AIzaSy...",                    // ← VITE_FIREBASE_API_KEY
  authDomain: "your-project.firebaseapp.com",  // ← VITE_FIREBASE_AUTH_DOMAIN
  projectId: "your-project-id",           // ← VITE_FIREBASE_PROJECT_ID
  storageBucket: "your-project.appspot.com",   // ← VITE_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "123456789",         // ← VITE_FIREBASE_MESSAGING_SENDER_ID
  appId: "1:123456789:web:abc123"         // ← VITE_FIREBASE_APP_ID
};
```

#### Visual Guide:
- **apiKey**: Found in "apiKey" field
- **authDomain**: Usually `{projectId}.firebaseapp.com`
- **projectId**: Your Firebase project ID (shown at top of project settings)
- **storageBucket**: Usually `{projectId}.appspot.com`
- **messagingSenderId**: Found in "messagingSenderId" field
- **appId**: Found in "appId" field

**Location in Firebase Console:**
```
Firebase Console → Your Project → ⚙️ Project Settings → Your apps → Web app config
```

---

### 2. VITE_ALLOWED_EMAIL

This is simply **your personal Gmail address** that you want to allow access to the app.

**Example:**
```env
VITE_ALLOWED_EMAIL=your.email@gmail.com
```

**Important:** This must match the email you'll use to sign in with Google. The app will automatically sign out anyone who tries to log in with a different email.

---

## Optional: Future Environment Variables (For Cloud Functions)

When you set up Firebase Cloud Functions for email parsing, you'll also need:

### Gmail API Refresh Token

**Location:** You'll generate this yourself using OAuth 2.0

**Steps:**
1. **Enable Gmail API** in Google Cloud Console:
   - Go to: https://console.cloud.google.com/
   - Select your Firebase project
   - Go to **APIs & Services** → **Library**
   - Search for "Gmail API" → **Enable**

2. **Create OAuth 2.0 Credentials:**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: Add `http://localhost:3000` (or your callback URL)
   - Download the credentials JSON

3. **Generate Refresh Token:**
   - Use OAuth 2.0 Playground: https://developers.google.com/oauthplayground/
   - Or use a script to generate the refresh token
   - This token will be stored as a **Firebase Function Secret** (not in `.env`)

### Google AI Studio API Key (For Gemini Flash)

**Location:** Google AI Studio

**Steps:**
1. Go to: https://aistudio.google.com/
2. Click **Get API Key** or go to: https://aistudio.google.com/app/apikey
3. Create a new API key
4. Copy the API key

**Note:** This will be used in Cloud Functions, stored as a Firebase Function Secret, not in the frontend `.env` file.

---

## Example `.env` File

```env
# Firebase Configuration (from Firebase Console → Project Settings)
VITE_FIREBASE_API_KEY=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz123456
VITE_FIREBASE_AUTH_DOMAIN=mailbudget-12345.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mailbudget-12345
VITE_FIREBASE_STORAGE_BUCKET=mailbudget-12345.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# Your personal email (for single-user access control)
VITE_ALLOWED_EMAIL=your.email@gmail.com
```

---

## Quick Checklist

- [ ] Created Firebase project at https://console.firebase.google.com/
- [ ] Added a Web app in Firebase Console
- [ ] Copied all 6 Firebase config values to `.env`
- [ ] Set `VITE_ALLOWED_EMAIL` to your Gmail address
- [ ] Saved `.env` file in the `mailbudget/` directory
- [ ] Restarted your dev server (`npm run dev`)

---

## Troubleshooting

### "Firebase: Error (auth/invalid-api-key)"
- Double-check that `VITE_FIREBASE_API_KEY` is correct
- Make sure there are no extra spaces or quotes in your `.env` file

### "Access Denied" error on login
- Verify `VITE_ALLOWED_EMAIL` matches the email you're signing in with
- Check for typos in the email address

### Environment variables not loading
- Make sure your `.env` file is in the `mailbudget/` directory (same level as `package.json`)
- Restart your dev server after creating/modifying `.env`
- In Vite, environment variables must start with `VITE_` to be exposed to the frontend

---

## Security Notes

⚠️ **Important:** 
- Never commit your `.env` file to Git (it's already in `.gitignore`)
- The `.env` file is for **frontend** variables only
- For Cloud Functions, use **Firebase Function Secrets** instead of `.env`
- Your Firebase API keys are safe to expose in frontend code (they're meant to be public)

