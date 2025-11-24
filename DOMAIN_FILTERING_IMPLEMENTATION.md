# Domain Filtering and Searchable Dropdown Implementation

## Overview

This implementation adds a searchable dropdown for selecting bank email domains and ensures email sync only pulls from domains linked to accounts.

## Features Added

### 1. **Searchable Domain Dropdown**

A new component that helps users discover and select bank email domains from their Gmail:

**Component:** [DomainSearchDropdown.tsx](src/components/DomainSearchDropdown.tsx)

**Features:**
- Click "Find Domains" to scan recent emails (last 100 by default)
- Shows unique sender domains sorted by frequency
- Displays sample sender and email count for each domain
- Live search/filter as you type
- Can still manually type domain if not found in search
- Dropdown closes on outside click

**UI Flow:**
1. User clicks "Link" or "Edit" next to an account in Settings
2. Clicks "Find Domains" button next to input field
3. Component fetches and analyzes recent Gmail messages
4. Shows dropdown with discovered domains
5. User selects a domain or types manually
6. Clicks "Save" to link domain to account

### 2. **Domain Discovery**

New Gmail service function to find unique sender domains:

**Function:** `fetchUniqueSenderDomains()` in [gmailService.ts](src/services/gmailService.ts)

**How it works:**
- Fetches metadata from recent emails (fast, doesn't download full content)
- Extracts sender domain from email addresses using regex: `/@([^>]+)/`
- Aggregates domains with count and sample sender
- Returns sorted list (most frequent first)

**Performance:**
- Uses `format=metadata` for faster fetching
- Only fetches `From` header, not full message
- Processes 100 emails in ~2-3 seconds

### 3. **Domain-Based Email Filtering**

Email sync now **only pulls from domains linked to accounts**:

**Updated:** `handleFetchEmails()` in [Settings.tsx](src/views/Settings.tsx)

**Before:**
```typescript
// Old: Fetched ALL unread emails
const emails = await fetchRecentEmails(10);
```

**After:**
```typescript
// New: Only fetches from linked domains
const linkedDomains = accounts
  .map(account => account.email_domain)
  .filter((domain): domain is string => !!domain);

const emailPromises = linkedDomains.map(domain =>
  fetchEmailsFromDomain(domain, 50)
);

const allEmails = (await Promise.all(emailPromises)).flat();
```

**Benefits:**
- No more noise from non-bank emails
- Only processes relevant transaction emails
- Faster sync (fewer emails to parse)
- More predictable results

### 4. **Logging**

Added detailed console logging throughout:

**Gmail Service:**
- `🔍` - Domain search progress
- `📧` - Email fetch operations
- Domain count and sample info

**Settings:**
- Logs linked domains before sync
- Shows total emails fetched per domain

**Example output:**
```
📧 Syncing emails from 2 linked domain(s): ['alerts.chase.com', 'boa.com']
📧 Starting Gmail sync for domain "alerts.chase.com": fetching up to 50 emails...
📧 Found 3 message(s) from domain "alerts.chase.com"
📧 Email: Subject="Transaction Alert" | From="alerts@chase.com"
📧 Gmail sync complete for domain "alerts.chase.com": 3 email(s) processed
```

## UI Changes

### Settings Page

**Email Domain Linking Section:**
- Replaced plain text input with searchable dropdown
- Added "Find Domains" button
- Updated instructions to mention domain search
- Changed "Sync Emails" to only work with linked domains

**Validation:**
- Shows error if user clicks "Sync Emails" without linking any domains
- Message: "No email domains linked to accounts. Please link at least one domain first."

## Files Modified

1. **[src/services/gmailService.ts](src/services/gmailService.ts)**
   - Added `extractDomain()` helper function
   - Added `fetchUniqueSenderDomains()` export
   - Added logging to `fetchRecentEmails()` and `fetchEmailsFromDomain()`

2. **[src/components/DomainSearchDropdown.tsx](src/components/DomainSearchDropdown.tsx)** *(NEW)*
   - Searchable dropdown component
   - Handles domain search and selection
   - Auto-closes on outside click

3. **[src/views/Settings.tsx](src/views/Settings.tsx)**
   - Imported `DomainSearchDropdown` component
   - Imported `fetchUniqueSenderDomains` and `fetchEmailsFromDomain`
   - Replaced text input with dropdown in account editing
   - Updated `handleFetchEmails()` to filter by linked domains
   - Updated info box with new instructions

## How to Use

### For Users

1. **Go to Settings page**
2. **Click "Link" next to an account**
3. **Click "Find Domains" button**
   - Wait 2-3 seconds while it searches
   - Dropdown shows discovered domains
4. **Select a bank domain from the list** (or type manually)
5. **Click "Save"**
6. **Repeat for other accounts**
7. **Click "Sync Emails"** - Only emails from linked domains will be fetched

### For Developers

**Testing domain search:**
```typescript
import { fetchUniqueSenderDomains } from './services/gmailService';

const domains = await fetchUniqueSenderDomains(100);
console.log(domains);
// [
//   { domain: 'alerts.chase.com', count: 25, sampleSender: 'Chase Alerts <alerts@chase.com>' },
//   { domain: 'boa.com', count: 18, sampleSender: 'Bank of America <noreply@boa.com>' },
//   ...
// ]
```

**Testing filtered sync:**
```typescript
// In Settings, after linking domains:
const linkedDomains = ['alerts.chase.com', 'boa.com'];

const emails = await Promise.all(
  linkedDomains.map(domain => fetchEmailsFromDomain(domain, 50))
);

const allEmails = emails.flat();
// Only emails from chase.com and boa.com
```

## Architecture Decisions

### Why Scan 100 Emails?

- Balances discovery vs. performance
- Most users receive bank emails frequently
- 100 emails covers ~1-2 weeks for active accounts
- Can be adjusted with parameter

### Why Sort by Frequency?

- Most frequent domains are likely automated bank alerts
- Helps users identify primary bank accounts quickly
- Less frequent = likely promotional or one-off emails

### Why Filter at Sync Time?

- **Security:** User explicitly controls which domains are accessed
- **Privacy:** Only emails from trusted domains are downloaded
- **Performance:** Fewer emails to parse and process
- **UX:** Clearer expectations about what will be synced

### Why Store Domain on Account?

- Natural 1:1 relationship (one account → one bank → one email domain)
- Easy to query and display
- Simple to validate and update

## Security Considerations

### Domain Whitelist

Only emails from explicitly linked domains are fetched:
- User must manually add domain to account
- No wildcards or partial matching (exact domain match)
- Gmail API query: `from:@exact-domain.com`

### Token Usage

Domain search uses same stored access token:
- No additional authorization required
- Respects token expiry and refresh logic
- Falls back to re-auth if token invalid

## Future Improvements

1. **Cache Discovered Domains**
   - Store in local state or IndexedDB
   - Refresh periodically
   - Faster subsequent searches

2. **Domain Suggestions**
   - Predefined list of common bank domains
   - Chase, BoA, Wells Fargo, etc.
   - Combine with discovered domains

3. **Domain Validation**
   - Verify domain actually sends emails
   - Warn if no emails found in recent history
   - Test domain before saving

4. **Multiple Domains per Account**
   - Some banks use multiple sender domains
   - Support comma-separated list
   - Show all linked domains for account

5. **Smart Domain Detection**
   - Parse email content to identify bank transactions
   - Auto-suggest domain based on transaction patterns
   - Machine learning for domain classification

## Related Documentation

- [GMAIL_TOKEN_IMPLEMENTATION.md](GMAIL_TOKEN_IMPLEMENTATION.md) - Persistent Gmail auth
- [CLAUDE.md](CLAUDE.md) - Overall architecture guide
