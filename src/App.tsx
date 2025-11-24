import { useEffect } from 'react';
import Auth from './components/Auth';
import Layout from './components/Layout';

function App() {
  useEffect(() => {
    console.log('🚀 App component mounted');
    // Log environment variables (without sensitive values)
    console.log('🔍 Environment check:');
    console.log('  - VITE_FIREBASE_API_KEY:', import.meta.env.VITE_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('  - VITE_FIREBASE_PROJECT_ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing');
    console.log('  - VITE_ALLOWED_EMAIL:', import.meta.env.VITE_ALLOWED_EMAIL ? `✅ ${import.meta.env.VITE_ALLOWED_EMAIL}` : '❌ Missing');
  }, []);

  return (
    <Auth>
      <Layout />
    </Auth>
  );
}

export default App;
