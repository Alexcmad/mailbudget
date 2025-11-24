# Firebase Cloud Functions - Hourly Email Sync

This directory contains the Firebase Cloud Function that automatically syncs emails every hour in the background, even when the app is not running.

## Setup Instructions

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Configure Environment Variables

You need to set up the following Firebase Function configuration secrets:

```bash
# Set Gmail OAuth credentials (get these from Google Cloud Console)
firebase functions:config:set gmail.client_id="YOUR_GMAIL_CLIENT_ID"
firebase functions:config:set gmail.client_secret="YOUR_GMAIL_CLIENT_SECRET"

# Set Gemini API key
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY"
```

**Note:** For security, you should use Firebase Function Secrets instead of config for sensitive data:

```bash
# Using Firebase Secrets (recommended)
firebase functions:secrets:set GMAIL_CLIENT_ID
firebase functions:secrets:set GMAIL_CLIENT_SECRET
firebase functions:secrets:set GEMINI_API_KEY
```

Then update `functions/src/index.ts` to use `process.env.GMAIL_CLIENT_ID` instead of `functions.config().gmail?.client_id`.

### 3. Build the Functions

```bash
npm run build
```

### 4. Deploy the Function

```bash
# Deploy only the functions
firebase deploy --only functions

# Or deploy everything
firebase deploy
```

### 5. Verify the Schedule

After deployment, the function will automatically run every hour. You can:

1. Check the schedule in [Firebase Console](https://console.firebase.google.com/) → Functions → Triggers
2. View logs: `firebase functions:log`
3. Manually trigger: Go to Cloud Scheduler in Google Cloud Console

## How It Works

1. **Scheduled Trigger**: The function runs every hour via Cloud Scheduler (Pub/Sub)
2. **User Discovery**: Finds all users with Gmail tokens configured in Firestore
3. **Email Fetching**: For each user, fetches unread emails from linked email domains
4. **Parsing**: Uses Gemini AI to parse transaction details from emails
5. **Transaction Creation**: Creates transactions in Firestore (auto-imports, no approval needed)
6. **Mark as Read**: Marks successfully imported emails as read in Gmail

## Function Details

- **Function Name**: `syncEmailsHourly`
- **Schedule**: Every 1 hour
- **Timezone**: America/New_York (you can change this in `index.ts`)
- **Timeout**: Default 60 seconds (can be increased if needed)

## Troubleshooting

### Function Not Running

1. Check Cloud Scheduler in Google Cloud Console
2. Verify the function was deployed: `firebase functions:list`
3. Check logs: `firebase functions:log --only syncEmailsHourly`

### Authentication Errors

- Ensure Gmail tokens are stored in Firestore at `users/{userId}/config/gmail`
- Verify OAuth credentials are correct
- Check that the refresh token hasn't expired (user may need to re-authorize)

### Parsing Errors

- Verify Gemini API key is set correctly
- Check function logs for parsing failures
- Ensure email content is being extracted properly

## Local Testing

To test the function locally:

```bash
# Start emulator
npm run serve

# Or test in shell
npm run shell
```

## Cost Considerations

- Cloud Functions: Free tier includes 2 million invocations/month
- Cloud Scheduler: Free tier includes 3 jobs
- Gmail API: Free (within quota limits)
- Gemini API: Pay per use (check pricing)

Since this runs hourly, that's ~730 invocations/month, well within the free tier.

