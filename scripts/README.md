# Scripts

## Seed Default Categories

This adds 27 default budget categories to your MailBudget app, organized into 6 groups:
- **Monthly Bills** (6 categories)
- **Daily Living** (6 categories)
- **Health & Wellness** (4 categories)
- **Entertainment** (4 categories)
- **Savings Goals** (4 categories)
- **Debt Payments** (3 categories)

### How to Use (Browser Console Method - RECOMMENDED)

1. **Sign in to the app** at http://localhost:5173

2. **Open browser DevTools Console** (F12)

3. **Look for your User ID** in the console logs:
   ```
   🆔 Your User ID (UID): BqIfXVKebaM1SWRzYQQV6BBwN2F3
   ```

4. **Run this command in the console:**
   ```javascript
   await seedDefaultCategories('YOUR_USER_ID_HERE')
   ```

   Example:
   ```javascript
   await seedDefaultCategories('BqIfXVKebaM1SWRzYQQV6BBwN2F3')
   ```

5. **Watch the console** for progress - you'll see each category being added!

6. Categories will appear immediately in the app (no refresh needed!)

### Alternative: Node.js Script (Not Recommended - Requires Admin SDK)

The `seed-categories.js` script exists but requires Firebase Admin SDK configuration to bypass security rules. The browser console method above is simpler and uses your existing authentication.

### What Gets Created

All categories start with:
- **Assigned:** $0
- **Activity:** $0
- **Available:** $0

You can then assign money to each category through the Budget tab.

### Customization

Edit `src/utils/seedCategories.ts` to add, remove, or modify categories.
