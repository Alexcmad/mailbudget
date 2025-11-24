# Quick Setup Guide for Hourly Email Sync

## Prerequisites

1. Firebase CLI installed: `npm install -g firebase-tools`
2. Logged into Firebase: `firebase login`
3. Project selected: `firebase use default` (or your project)

## Step 1: Install Dependencies

```bash
cd functions
npm install
```

## Step 2: Set Up Secrets

You need to configure three secrets. When you run these commands, Firebase will prompt you to enter the values:

```bash
# Gmail OAuth Client ID (from Google Cloud Console)
firebase functions:secrets:set GMAIL_CLIENT_ID

# Gmail OAuth Client Secret (from Google Cloud Console)
firebase functions:secrets:set GMAIL_CLIENT_SECRET

# Gemini API Key (from Google AI Studio)
firebase functions:secrets:set GEMINI_API_KEY
```

**Where to get these values:**

- **Gmail OAuth Credentials**: 
  1. Go to [Google Cloud Console](https://console.cloud.google.com/)
  2. Select your Firebase project
  3. Go to **APIs & Services** → **Credentials**
  4. Find or create OAuth 2.0 Client ID
  5. Copy the Client ID and Client Secret

- **Gemini API Key**:
  1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
  2. Create a new API key
  3. Copy the key

## Step 3: Build and Deploy

```bash
# Build the functions
npm run build

# Deploy to Firebase
firebase deploy --only functions
```

## Step 4: Verify

1. Check Firebase Console → Functions → You should see `syncEmailsHourly`
2. Check Cloud Scheduler in Google Cloud Console → You should see a job running every hour
3. View logs: `firebase functions:log`

## How It Works

- Runs automatically every hour via Cloud Scheduler
- Finds users with Gmail tokens in Firestore
- Fetches unread emails from linked domains
- Parses with Gemini AI
- Creates transactions automatically
- Marks emails as read

## Troubleshooting

**Function not running?**
- Check Cloud Scheduler in Google Cloud Console
- Verify function is deployed: `firebase functions:list`
- Check logs: `firebase functions:log`

**Authentication errors?**
- Ensure user has authorized Gmail in the app (Settings page)
- Check that tokens are stored in Firestore at `users/{userId}/config/gmail`

**Parsing errors?**
- Verify Gemini API key is correct
- Check function logs for specific errors

