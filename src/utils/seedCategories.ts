import { collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

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

export async function seedDefaultCategories(uid: string): Promise<void> {
  console.log('🌱 Seeding default categories...');

  const categoriesRef = collection(db, `users/${uid}/categories`);
  let successCount = 0;

  for (const category of defaultCategories) {
    try {
      await addDoc(categoriesRef, category);
      console.log(`✅ Added: ${category.group} - ${category.name}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to add ${category.name}:`, error);
    }
  }

  console.log(`\n🎉 Successfully added ${successCount}/${defaultCategories.length} categories!`);
}

// Make it available in browser console
if (typeof window !== 'undefined') {
  (window as any).seedDefaultCategories = seedDefaultCategories;
}
