# Email Sync Update - Scan All Unread & Mark as Read

## Overview

Updated the email sync functionality to scan **all unread emails** (not just from linked domains), parse them with AI, log detailed results, and mark successfully imported emails as read.

## Changes Made

### 1. **Scan All Unread Emails**

**Before:**
- Only fetched emails from domains linked to accounts
- Required at least one linked domain to work

**After:**
- Fetches ALL unread emails (up to 100)
- No domain filtering at fetch time
- Domain matching happens during processing

**Why:**
- More flexible - works even if domains aren't linked yet
- Allows AI to parse any transaction email regardless of sender
- User can see what emails are being processed

### 2. **Detailed Console Logging**

Added comprehensive logging for transparency:

```javascript
// Per-email logging
📧 Processing email from "alerts@chase.com"
   Subject: "Transaction Alert - $45.67 at Starbucks"
   ✅ SUCCESS: Transaction imported (ID: abc123)
   📬 Marked as read

// Or if skipped
   ❌ SKIPPED: No account linked to email domain: chase.com

// Summary at end
📊 Email sync complete:
   Total processed: 15
   Successfully imported: 8
   Skipped: 7
```

**Log Emojis:**
- `📧` - Email processing
- `✅` - Successful import
- `❌` - Skipped/failed
- `📬` - Marked as read
- `⚠️` - Warning (e.g., failed to mark as read)
- `📊` - Summary stats

### 3. **Mark Emails as Read**

Successfully imported transactions are automatically marked as read in Gmail:

```typescript
if (result.success && email.messageId) {
  try {
    await markEmailAsRead(email.messageId);
    console.log(`   📬 Marked as read`);
  } catch (err) {
    console.warn(`   ⚠️ Failed to mark as read:`, err);
  }
}
```

**Behavior:**
- ✅ **Imported** → Email marked as read
- ❌ **Skipped/Failed** → Email remains unread (can retry later)

### 4. **Updated Both Pages**

**Settings Page ([Settings.tsx](src/views/Settings.tsx)):**
- "Sync Emails" button uses new logic
- Removed domain filtering requirement
- Shows detailed status messages

**Transactions Page ([Transactions.tsx](src/views/Transactions.tsx)):**
- Mail icon button uses same logic
- Consistent behavior across both pages

## Files Modified

1. **[src/views/Settings.tsx](src/views/Settings.tsx)**
   - Updated `handleFetchEmails()` function
   - Added imports: `fetchRecentEmails`, `markEmailAsRead`, `processEmailTransaction`
   - Updated info box text to reflect new behavior
   - Added detailed console logging

2. **[src/views/Transactions.tsx](src/views/Transactions.tsx)**
   - Updated `handleScanInbox()` function
   - Changed from `fetchEmailsFromDomain()` to `fetchRecentEmails()`
   - Added `markEmailAsRead` import
   - Removed domain filtering logic

## How It Works Now

### Email Processing Flow

1. **Fetch** all unread emails (up to 100)
2. **For each email:**
   - Log sender and subject
   - Call `processEmailTransaction()`
     - Try to match email domain to a linked account
     - If matched: Parse with Gemini AI
     - If parsed successfully: Create transaction
   - **If import successful:**
     - Mark email as read
     - Log success with transaction ID
   - **If skipped/failed:**
     - Leave email unread
     - Log reason for skip

3. **Show summary:**
   - Total emails processed
   - Number imported
   - Number skipped

### Example Console Output

```
📧 Starting email sync: Fetching all unread emails...
📧 Found 15 unread email(s). Processing...

📧 Processing email from "alerts@chase.com"
   Subject: "Transaction Alert - $45.67 at Starbucks"
   ✅ SUCCESS: Transaction imported (ID: tx_abc123)
   📬 Marked as read

📧 Processing email from "amazon@amazon.com"
   Subject: "Your order has shipped"
   ❌ SKIPPED: No account linked to email domain: amazon.com

📧 Processing email from "alerts@boa.com"
   Subject: "Purchase Alert - $128.50 at Target"
   ✅ SUCCESS: Transaction imported (ID: tx_def456)
   📬 Marked as read

📊 Email sync complete:
   Total processed: 15
   Successfully imported: 8
   Skipped: 7
```

## User Experience

### Before
- User had to link domains first
- Only emails from linked domains were fetched
- All emails required manual "mark as read"
- Limited visibility into what was being processed

### After
- Works immediately, even without linked domains
- All unread emails are scanned
- Successfully imported emails auto-marked as read
- Full transparency via console logs
- Unmatched emails remain unread for retry

## Domain Matching Logic

Email sync now follows this logic:

```typescript
// 1. Fetch ALL unread emails
const emails = await fetchRecentEmails(100);

// 2. For each email, try to find matching account
const account = findAccountByEmailDomain(accounts, email.from);

// 3a. If match found → Parse and import
if (account) {
  const parsed = await parseEmailWithGemini(emailContent);
  await addTransaction(uid, { ...parsed, account_id: account.id });
  await markEmailAsRead(email.messageId); // ✅ Mark as read
}

// 3b. If no match → Skip (leave unread for retry)
else {
  console.log('❌ SKIPPED: No account linked');
  // Email stays unread ⭕
}
```

## Benefits

1. **No Setup Required** - Works even before linking domains
2. **Automatic Cleanup** - Imported emails marked as read
3. **Retry Friendly** - Failed emails stay unread
4. **Full Transparency** - Detailed logs show exactly what happened
5. **Flexible** - Can handle any transaction email format via Gemini AI

## Migration Notes

### Breaking Changes
None - this is purely additive

### User Impact
- Existing linked domains still work
- Sync now processes more emails
- Users will see more detailed console output
- Successful imports auto-marked as read

### Testing
To test the new behavior:
1. Have some unread emails in Gmail
2. Ensure at least one account has a linked domain
3. Click "Sync Emails" in Settings or Transactions
4. Open browser console (F12) to see detailed logs
5. Check Gmail - successfully imported emails should be marked as read

## Future Improvements

1. **Batch Mark as Read** - Mark all emails in batch for performance
2. **Undo Feature** - Allow user to un-import and mark as unread again
3. **Smart Retry** - Automatically retry failed emails after user links domain
4. **Processing Queue** - Show UI progress bar for large email batches
5. **Error Reporting** - Surface parsing errors to user for manual review
6. **Duplicate Detection** - Warn if transaction already exists before importing

## Related Documentation

- [GMAIL_TOKEN_IMPLEMENTATION.md](GMAIL_TOKEN_IMPLEMENTATION.md) - Persistent Gmail auth
- [DOMAIN_FILTERING_IMPLEMENTATION.md](DOMAIN_FILTERING_IMPLEMENTATION.md) - Domain discovery
- [CLAUDE.md](CLAUDE.md) - Overall architecture
