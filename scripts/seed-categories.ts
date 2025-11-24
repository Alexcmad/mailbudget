import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

// Firebase config from your .env
const firebaseConfig = {
  apiKey: "AIzaSyDKTudiYZsW3IG4fTo7KL5VBLEXzno3iAQ",
  authDomain: "finance-tracker-5ff56.firebaseapp.com",
  projectId: "finance-tracker-5ff56",
  storageBucket: "finance-tracker-5ff56.firebasestorage.app",
  messagingSenderId: "520240576861",
  appId: "1:520240576861:web:beff7f2369cbf4015c10b4",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Your user ID - get this from your Firebase Auth console or browser
// After logging in, check the browser console or Firestore for your UID
const USER_ID = 'YOUR_USER_ID_HERE'; // Replace with your actual Firebase Auth UID

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
  console.log('🌱 Seeding default categories...');

  if (USER_ID === 'YOUR_USER_ID_HERE') {
    console.error('❌ ERROR: Please update USER_ID in the script with your Firebase Auth UID');
    console.log('📝 To find your UID:');
    console.log('   1. Sign in to the app');
    console.log('   2. Open browser DevTools Console');
    console.log('   3. Run: firebase.auth().currentUser.uid');
    console.log('   4. Copy the UID and paste it into this script');
    process.exit(1);
  }

  const categoriesRef = collection(db, `users/${USER_ID}/categories`);

  try {
    for (const category of defaultCategories) {
      await addDoc(categoriesRef, category);
      console.log(`✅ Added: ${category.group} - ${category.name}`);
    }

    console.log(`\n🎉 Successfully added ${defaultCategories.length} categories!`);
    console.log('💡 You can now assign money to these categories in your budget.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  }
}

seedCategories();
