# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MailBudget is a **single-user** mobile-first Progressive Web App (PWA) for personal budgeting. It uses the YNAB envelope system and is designed to automatically parse transaction emails from Gmail to create budget entries.

**Tech Stack:** React + TypeScript + Vite, Tailwind CSS, Zustand (state management), Firebase (Firestore + Auth), lucide-react (icons)

**Working Directory:** All development commands should be run from the `mailbudget/` directory, not the repository root.

## Development Commands

### Essential Commands
```bash
# Start development server (runs on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview

# Seed default categories (requires user to be signed in - see scripts/README.md)
npm run seed
```

### Firebase Commands
```bash
# Deploy Firestore rules and hosting
firebase deploy

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy only hosting
firebase deploy --only hosting
```

## Environment Setup

The app requires a `.env` file in the `mailbudget/` directory with Firebase configuration. See `ENV_SETUP_GUIDE.md` for detailed instructions on obtaining credentials from Firebase Console.

**Critical:** All environment variables must start with `VITE_` prefix to be exposed to the frontend. The dev server must be restarted after `.env` changes.

## Architecture

### Data Flow Pattern

The app uses a **unidirectional data flow** with real-time Firestore subscriptions:

1. **Firebase Auth** manages user authentication (Google Sign-In only)
2. **Zustand store** (`src/store/useStore.ts`) holds global state for categories, transactions, and accounts
3. **Firestore subscriptions** (`src/services/firestore.ts`) automatically sync data to Zustand when Firestore changes
4. **React components** read from Zustand and call Firestore service functions to modify data

```
User Action → Firestore Service Function → Firestore Database
                                              ↓
                                    onSnapshot listener
                                              ↓
                                        Zustand Store
                                              ↓
                                      React Components (re-render)
```

### Key Architectural Decisions

#### Single User Enforcement
- App restricts access to one email address via `VITE_ALLOWED_EMAIL` environment variable
- Auth.tsx automatically signs out unauthorized users
- Firestore rules enforce user data isolation: `users/{userId}/...`

#### YNAB Envelope Math
The budget follows YNAB's "Available = Assigned - Activity" formula:
- **Assigned**: Money allocated to a category
- **Activity**: Sum of all transaction amounts in that category (negative for expenses)
- **Available**: Calculated field (assigned - activity)

All category calculations are handled server-side in `firestore.ts` via `recalculateCategoryActivity()`.

#### Automatic Balance Recalculation
When transactions are added/updated/deleted, the affected category's activity and account's cleared_balance are automatically recalculated by the Firestore service layer. This ensures consistency without client-side math.

#### Component Organization
- **components/**: Reusable UI components and modals
- **views/**: Full-page views (Home, Budget, Accounts, Transactions, Settings)
- **Layout.tsx**: Mobile-first shell with bottom navigation bar

### Firestore Data Structure

```
users/{userId}/
  ├── categories (subcollection)
  │   └── { id, name, group, assigned, activity, available }
  ├── transactions (subcollection)
  │   └── { id, date, payee, amount, category_id, account_id, status, original_email_id }
  └── accounts (subcollection)
      └── { id, name, type, cleared_balance, email_domain }
```

**Important:** All collections are subcollections under `users/{userId}`. Security rules enforce that authenticated users can only access their own data.

### State Management (Zustand)

The store (`src/store/useStore.ts`) manages:
- `categories[]`, `transactions[]`, `accounts[]` arrays
- `loading` flag
- `initializeSubscriptions(uid)`: Sets up real-time listeners when user signs in
- `cleanup()`: Unsubscribes all listeners when user signs out

**Subscription Lifecycle:**
1. User signs in → App.tsx calls `initializeSubscriptions(uid)`
2. Store creates three Firestore `onSnapshot` listeners
3. Listeners push updates to Zustand state
4. User signs out → App.tsx calls `cleanup()` to remove listeners

### Type System

All domain types are defined in `src/types/index.ts`:
- `Category`, `Transaction`, `Account`, `UserConfig`
- Use these types consistently across components and services
- Firebase Timestamp fields are strings in TypeScript (e.g., `date: string`)

## Mobile-First Design

- **Bottom navigation** (Layout.tsx): Budget, Accounts, Transactions, Settings
- **Safe-area padding**: Uses `pb-safe` and similar Tailwind classes for mobile notches
- **Touch-friendly**: Large tap targets, swipe gestures considered
- **Responsive**: Desktop displays centered mobile layout

## Email Parsing (Future Implementation)

The app is designed for automatic email parsing via Firebase Cloud Functions (not yet implemented):
1. Cloud Function runs on schedule (e.g., every 6 hours)
2. Fetches Gmail emails using Gmail API
3. Parses transactions using regex patterns (Tier 1) with Gemini Flash LLM fallback (Tier 2)
4. Creates transactions in Firestore with duplicate prevention via `original_email_id`

See README.md "Next Steps" section for detailed implementation plan.

## Debugging

If the app shows a blank page, see `DEBUGGING.md` for comprehensive troubleshooting steps. Common issues:
- Missing or incorrect `.env` file
- Dev server not running
- Firebase Auth not enabled in Firebase Console
- Browser console errors (always check DevTools Console first)

## Testing Data

To populate the app with default categories, use the seed script:
1. Sign in to the app
2. Open browser DevTools Console (F12)
3. Find your User ID in console logs: `🆔 Your User ID (UID): ...`
4. Run: `await seedDefaultCategories('YOUR_USER_ID_HERE')`

See `scripts/README.md` for details.

## Code Conventions

- Use `.tsx` extension for components, `.ts` for utilities
- Import types with `import type { ... }` from `../types/index.ts`
- Firestore service functions are async and handle recalculations automatically
- Modal components follow the pattern: visibility prop, onClose callback, onSuccess callback
- Clean undefined fields from objects before sending to Firestore (use `Object.fromEntries` filter pattern)
