import { useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { useStore } from '../store/useStore';

const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL;

// Debug: Check if environment variables are loaded
if (!ALLOWED_EMAIL) {
  console.warn('⚠️ VITE_ALLOWED_EMAIL is not set in .env file');
}

interface AuthProps {
  children: React.ReactNode;
}

export default function Auth({ children }: AuthProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { initializeSubscriptions, cleanup } = useStore();

  // Debug: Log on mount
  useEffect(() => {
    console.log('🔍 Auth component mounted');
    console.log('🔍 ALLOWED_EMAIL:', ALLOWED_EMAIL || 'NOT SET');
  }, []);

  useEffect(() => {
    console.log('🔍 Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('🔍 Auth state changed:', currentUser ? `User: ${currentUser.email}` : 'No user');
      try {
        if (currentUser) {
          // CRITICAL: Check if user email matches allowed email
          if (currentUser.email !== ALLOWED_EMAIL) {
            console.warn('⚠️ Email mismatch:', currentUser.email, 'vs', ALLOWED_EMAIL);
            setError('Access Denied: This is a personal app. Your email is not authorized.');
            await signOut(auth);
            setUser(null);
            cleanup();
          } else {
            console.log('✅ User authorized:', currentUser.email);
            console.log('🆔 Your User ID (UID):', currentUser.uid);
            console.log('📝 To seed categories, run: npm run seed', currentUser.uid);
            setUser(currentUser);
            setError(null);
            // Initialize Firestore subscriptions
            initializeSubscriptions(currentUser.uid);
          }
        } else {
          setUser(null);
          cleanup();
        }
      } catch (err) {
        console.error('❌ Error in auth state change:', err);
        setError('An error occurred. Check console for details.');
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error('❌ Auth state listener error:', error);
      setError('Authentication error. Check console for details.');
      setLoading(false);
    });

    return () => {
      unsubscribe();
      cleanup();
    };
  }, [initializeSubscriptions, cleanup]);

  const handleGoogleSignIn = async () => {
    try {
      console.log('🔍 Attempting Google sign in...');
      setError(null);
      await signInWithPopup(auth, googleProvider);
      console.log('✅ Sign in successful');
    } catch (err: any) {
      console.error('❌ Sign in error:', err);
      setError(err.message || 'Failed to sign in');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">MailBudget</h1>
          <p className="text-gray-600 text-center mb-6">
            Personal budgeting app with email transaction parsing
          </p>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            This is a single-user personal app. Only the authorized email can access.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
