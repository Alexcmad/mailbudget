// Run this with: node scripts/seed-categories.js YOUR_USER_ID
// Get your user ID by signing into the app and checking the console logs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDKTudiYZsW3IG4fTo7KL5VBLEXzno3iAQ",
  authDomain: "finance-tracker-5ff56.firebaseapp.com",
  projectId: "finance-tracker-5ff56",
  storageBucket: "finance-tracker-5ff56.firebasestorage.app",
  messagingSenderId: "520240576861",
  appId: "1:520240576861:web:beff7f2369cbf4015c10b4",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const defaultCategories = [
  // Monthly Bills
  { group: 'Monthly Bills', name: 'Rent/Mortgage', assigned: 0, activity: 0, available: 0 },
  { group: 'Monthly Bills', name: 'Electric', assigned: 0, activity: 0, available: 0 },
  { group: 'Monthly Bills', name: 'Water', assigned: 0, activity: 0, available: 0 },
  { group: 'Monthly Bills', name: 'Internet', assigned: 0, activity: 0, available: 0 },
  { group: 'Monthly Bills', name: 'Phone', assigned: 0, activity: 0, available: 0 },
  { group: 'Monthly Bills', name: 'Subscriptions', assigned: 0, activity: 0, available: 0 },

  // Daily Living
  { group: 'Daily Living', name: 'Groceries', assigned: 0, activity: 0, available: 0 },
  { group: 'Daily Living', name: 'Dining Out', assigned: 0, activity: 0, available: 0 },
  { group: 'Daily Living', name: 'Gas/Fuel', assigned: 0, activity: 0, available: 0 },
  { group: 'Daily Living', name: 'Transportation', assigned: 0, activity: 0, available: 0 },
  { group: 'Daily Living', name: 'Household Items', assigned: 0, activity: 0, available: 0 },
  { group: 'Daily Living', name: 'Clothing', assigned: 0, activity: 0, available: 0 },

  // Health & Wellness
  { group: 'Health & Wellness', name: 'Medical', assigned: 0, activity: 0, available: 0 },
  { group: 'Health & Wellness', name: 'Dental', assigned: 0, activity: 0, available: 0 },
  { group: 'Health & Wellness', name: 'Gym/Fitness', assigned: 0, activity: 0, available: 0 },
  { group: 'Health & Wellness', name: 'Medications', assigned: 0, activity: 0, available: 0 },

  // Entertainment
  { group: 'Entertainment', name: 'Streaming Services', assigned: 0, activity: 0, available: 0 },
  { group: 'Entertainment', name: 'Hobbies', assigned: 0, activity: 0, available: 0 },
  { group: 'Entertainment', name: 'Games', assigned: 0, activity: 0, available: 0 },
  { group: 'Entertainment', name: 'Movies/Events', assigned: 0, activity: 0, available: 0 },

  // Savings Goals
  { group: 'Savings Goals', name: 'Emergency Fund', assigned: 0, activity: 0, available: 0 },
  { group: 'Savings Goals', name: 'Vacation', assigned: 0, activity: 0, available: 0 },
  { group: 'Savings Goals', name: 'Car Replacement', assigned: 0, activity: 0, available: 0 },
  { group: 'Savings Goals', name: 'Home Maintenance', assigned: 0, activity: 0, available: 0 },

  // Debt Payments
  { group: 'Debt Payments', name: 'Credit Card', assigned: 0, activity: 0, available: 0 },
  { group: 'Debt Payments', name: 'Student Loans', assigned: 0, activity: 0, available: 0 },
  { group: 'Debt Payments', name: 'Car Loan', assigned: 0, activity: 0, available: 0 },
];

async function seedCategories() {
  const userId = process.argv[2];

  if (!userId) {
    console.error('❌ ERROR: User ID is required');
    console.log('\n📝 Usage: node scripts/seed-categories.js YOUR_USER_ID');
    console.log('\n🔍 To find your User ID:');
    console.log('   1. Sign in to the app at http://localhost:5173');
    console.log('   2. Open browser DevTools Console (F12)');
    console.log('   3. Look for the log: "✅ User authorized: your@email.com"');
    console.log('   4. The next line will show your UID');
    console.log('   5. Copy the UID and run this script again\n');
    process.exit(1);
  }

  console.log('🌱 Seeding default categories for user:', userId);
  console.log(`📦 Preparing to add ${defaultCategories.length} categories...\n`);

  const categoriesRef = collection(db, `users/${userId}/categories`);

  try {
    for (const category of defaultCategories) {
      await addDoc(categoriesRef, category);
      console.log(`✅ ${category.group.padEnd(20)} - ${category.name}`);
    }

    console.log(`\n🎉 Successfully added ${defaultCategories.length} categories!`);
    console.log('💡 Refresh your app to see the new categories.');
    console.log('💰 You can now assign money to these categories in your budget.\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    console.error('\n💡 Make sure:');
    console.error('   - Your User ID is correct');
    console.error('   - You have internet connection');
    console.error('   - Firestore security rules allow this operation\n');
    process.exit(1);
  }
}

seedCategories();
