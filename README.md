# MailBudget

A personal budgeting app that automatically parses transaction emails from Gmail and creates budget entries using the YNAB envelope system.

## Overview

MailBudget is a **single-user** mobile-first Progressive Web App (PWA) designed to streamline personal finance tracking by:

- Automatically parsing transaction emails from your bank accounts
- Creating budget transactions in a YNAB-style envelope system
- Providing real-time budget tracking and money movement between categories

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Backend**: Firebase (Firestore + Cloud Functions)
- **Authentication**: Firebase Auth (Google Sign-In)
- **Icons**: lucide-react
- **Email Parsing**: Regex + Google Gemini Flash (LLM fallback)

## Project Structure

```
mailbudget/
├── src/
│   ├── components/
│   │   ├── Auth.tsx              # Google Sign-In with email restriction
│   │   ├── Layout.tsx            # Mobile-first layout with bottom nav
│   │   └── MoveMoneyModal.tsx    # Modal for moving money between categories
│   ├── views/
│   │   ├── Budget.tsx            # YNAB-style budget view
│   │   ├── Accounts.tsx          # Bank accounts list
│   │   └── Transactions.tsx      # Transaction history
│   ├── services/
│   │   └── firestore.ts          # Firestore CRUD operations
│   ├── store/
│   │   └── useStore.ts           # Zustand global state
│   ├── config/
│   │   └── firebase.ts           # Firebase configuration
│   ├── types/
│   │   └── index.ts              # TypeScript type definitions
│   ├── App.tsx
│   └── main.tsx
├── .env.example                  # Environment variables template
└── README.md
```

## Setup Instructions

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable Firebase services:
   - **Authentication**: Enable Google Sign-In provider
   - **Firestore Database**: Create in production mode
   - **Cloud Functions**: Will be set up later

### 2. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Enable the **Gmail API**
4. Configure OAuth Consent Screen:
   - User Type: **External**
   - Publishing Status: **Testing** (keeps it in permanent testing mode)
   - Test Users: Add your personal Gmail address

### 3. Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Firebase credentials from Firebase Console > Project Settings:
   ```
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

3. Set your allowed email (for single-user access restriction):
   ```
   VITE_ALLOWED_EMAIL=your.email@gmail.com
   ```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Features Completed

✅ **Authentication & Security**
- Google Sign-In with Firebase Auth
- Single-user email restriction
- Auto sign-out for unauthorized emails

✅ **Mobile-First UI**
- Bottom navigation bar (Budget, Accounts, Transactions)
- Responsive Tailwind CSS design
- Safe-area padding for mobile devices

✅ **Budget Management (YNAB-Style)**
- Category groups and categories
- Assigned / Activity / Available columns
- Move money between categories modal
- Color-coded available amounts (red/gray/green)

✅ **Data Management**
- Real-time Firestore subscriptions
- Zustand global state management
- Type-safe TypeScript interfaces
- CRUD operations for categories, accounts, and transactions

✅ **Views**
- Budget view with envelope system
- Accounts view with balances
- Transactions view with categorization

## Next Steps (TODO)

### 6. Firebase Cloud Functions (Email Parsing Backend)

**Location**: Create a `functions/` directory in the project root

**Tasks**:
1. Initialize Firebase Functions:
   ```bash
   firebase init functions
   ```

2. Create Cloud Function to:
   - Authenticate with Google using stored Refresh Token
   - Fetch emails from last 24 hours with query: `subject:transaction OR subject:spent`
   - Parse emails using regex patterns (Tier 1)
   - Fallback to Gemini Flash LLM if regex fails (Tier 2)
   - Create transactions in Firestore with duplicate prevention

3. Store Google Refresh Token as Firebase Function Secret

### 7. Email Parser Implementation

**Location**: `functions/src/parsers/`

**Files to create**:
- `parsers/regex.ts` - Hardcoded regex patterns for specific banks
- `parsers/gemini.ts` - LLM fallback using Gemini Flash API
- `parsers/index.ts` - Main parser orchestration

**Example regex pattern**:
```typescript
/(?:spent|transaction of)\s+\$([\\d.]+)\\s+at\\s+([^.]+)/i
```

**Gemini prompt**:
```
Extract {amount, merchant, date} from this email body as JSON.
If not a transaction, return null.
```

### 8. Scheduled Trigger

Set up Cloud Function to run on schedule (e.g., every 6 hours) using Firebase Cloud Scheduler or Pub/Sub.

## Firestore Data Schema

```typescript
users/{userId}
  ├── config
  │     ├── allowed_email: string
  │     └── last_sync_time: timestamp
  ├── accounts (subcollection)
  │     ├── id: string
  │     ├── name: string
  │     ├── type: 'checking' | 'savings' | 'credit'
  │     └── cleared_balance: number
  ├── categories (subcollection)
  │     ├── id: string
  │     ├── name: string
  │     ├── group: string
  │     ├── assigned: number
  │     ├── activity: number
  │     └── available: number (calculated: assigned - activity)
  └── transactions (subcollection)
        ├── id: string
        ├── date: string
        ├── payee: string
        ├── amount: number
        ├── category_id: string | null
        ├── original_email_id: string (for deduplication)
        ├── status: 'cleared' | 'uncleared' | 'reconciled'
        └── account_id: string
```

## Security Notes

- **Personal Use Only**: The "Google hasn't verified this app" warning is expected and safe when you click "Advanced" > "Go to App (unsafe)"
- **Email Restriction**: Only the email specified in `VITE_ALLOWED_EMAIL` can access the app
- **Firebase Rules**: Set up Firestore security rules to restrict access to authenticated user's own data only

## Deployment

When ready to deploy:

```bash
npm run build
firebase deploy
```

---

Built with [Claude Code](https://claude.com/claude-code)
