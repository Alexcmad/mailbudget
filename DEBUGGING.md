# Debugging Blank Page Issue

I've added console logging to help diagnose the issue. Follow these steps:

## Step 1: Check Browser Console

1. Open your browser's Developer Tools:
   - **Chrome/Edge**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - **Firefox**: Press `F12` or `Ctrl+Shift+K` (Windows) / `Cmd+Option+K` (Mac)

2. Go to the **Console** tab

3. Look for messages starting with:
   - ✅ = Success
   - ❌ = Error
   - ⚠️ = Warning
   - 🔍 = Debug info

## Step 2: Common Issues & Solutions

### Issue 1: Missing Environment Variables

**Symptoms:**
- Console shows: `❌ Missing Firebase environment variables: [...]`
- Console shows: `⚠️ VITE_ALLOWED_EMAIL is not set`

**Solution:**
1. Make sure your `.env` file is in the `mailbudget/` directory (same level as `package.json`)
2. Check that all variables start with `VITE_`
3. Restart your dev server after creating/modifying `.env`
4. Verify your `.env` file has no syntax errors (no spaces around `=`)

**Example `.env` format:**
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_ALLOWED_EMAIL=your.email@gmail.com
```

### Issue 2: Firebase Initialization Error

**Symptoms:**
- Console shows: `❌ Firebase initialization error: ...`
- Error mentions "invalid-api-key" or "auth/configuration-not-found"

**Solution:**
1. Double-check your Firebase config values in `.env`
2. Make sure you copied the values from Firebase Console correctly
3. Verify there are no extra quotes or spaces
4. Ensure Firebase Authentication is enabled in Firebase Console

### Issue 3: JavaScript Error

**Symptoms:**
- Red error messages in console
- Stack trace showing file names and line numbers

**Solution:**
1. Read the error message carefully
2. Check which file and line number is causing the error
3. Common issues:
   - Missing imports
   - Undefined variables
   - Type errors

### Issue 4: Page Completely Blank (No Console Output)

**Symptoms:**
- Console is empty
- Page shows nothing at all

**Solution:**
1. Check if the dev server is running: `npm run dev`
2. Verify you're accessing the correct URL (usually `http://localhost:5173`)
3. Check the browser's Network tab for failed requests
4. Try hard refresh: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)

## Step 3: Quick Test

Open your browser console and run:

```javascript
console.log('Environment variables:', {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? 'Set' : 'Missing',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ? 'Set' : 'Missing',
  allowedEmail: import.meta.env.VITE_ALLOWED_EMAIL || 'Missing'
});
```

This will show you which variables are loaded.

## Step 4: Verify Dev Server

Make sure your dev server is running:

```bash
cd mailbudget
npm run dev
```

You should see output like:
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## Step 5: Check Network Tab

1. Open Developer Tools → **Network** tab
2. Refresh the page
3. Look for:
   - Failed requests (red status codes)
   - 404 errors (files not found)
   - CORS errors

## Still Not Working?

If you're still seeing a blank page:

1. **Share the console output** - Copy all console messages (especially errors)
2. **Check the Elements tab** - Is there a `<div id="root">` in the HTML?
3. **Try a different browser** - Sometimes browser extensions can interfere
4. **Clear browser cache** - Old cached files might be causing issues

## Expected Console Output (When Working)

When everything is set up correctly, you should see:

```
🚀 App component mounted
🔍 Environment check:
  - VITE_FIREBASE_API_KEY: ✅ Set
  - VITE_FIREBASE_PROJECT_ID: ✅ Set
  - VITE_ALLOWED_EMAIL: ✅ your.email@gmail.com
✅ Firebase initialized successfully
🔍 Auth component mounted
🔍 ALLOWED_EMAIL: your.email@gmail.com
🔍 Setting up auth state listener
🔍 Auth state changed: No user
```

Then you should see the login screen with "Sign in with Google" button.

