// Firebase imports for authentication only
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, type Auth } from 'firebase/auth';

// Firebase configuration for authentication only
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Lazy initialization - only when auth features are needed
let app: FirebaseApp | undefined;
let auth: Auth | undefined;

/**
 * Initialize Firebase only when needed for authentication
 */
export function initializeFirebaseAuth(): {
  app: FirebaseApp;
  auth: Auth;
} {
  if (!app) {
    const existingApps = getApps();
    app =
      existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfig);
    auth = getAuth(app);
  }

  return { app: app!, auth: auth! };
}

/**
 * Check if Firebase is configured for authentication
 */
export function isFirebaseAuthConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId
  );
}