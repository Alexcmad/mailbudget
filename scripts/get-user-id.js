// Copy and paste this into your browser console while logged into the app
// It will print your Firebase Auth UID

import { auth } from '../src/config/firebase';

console.log('🔍 Finding your User ID...');
console.log('Current user:', auth.currentUser);

if (auth.currentUser) {
  console.log('✅ Your User ID:', auth.currentUser.uid);
  console.log('\n📋 Copy the UID above and use it in the seed-categories.ts script');
} else {
  console.log('❌ No user logged in. Please sign in to the app first.');
}
