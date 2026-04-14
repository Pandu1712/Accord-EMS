import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
import { getAnalytics, isSupported } from 'firebase/analytics'

// Firebase configuration from your project
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Validation: Check if all required environment variables are present
const requiredKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId'
] as const

const missingKeys = requiredKeys.filter(key => !firebaseConfig[key])
const isFirebaseConfigured = missingKeys.length === 0

// Initialize Firebase
let app: any;
let auth: any;
let db: any;
let storage: any;
let analytics: any;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
    auth = getAuth(app)
    db = getFirestore(app)
    storage = getStorage(app)
    
    // Initialize Analytics only in client-side
    if (typeof window !== 'undefined') {
      isSupported().then(supported => {
        if (supported) analytics = getAnalytics(app)
      })
    }
  } catch (error) {
    console.error("Firebase initialization failed:", error)
  }
} else {
  // Fallback for build time or missing config
  if (process.env.NODE_ENV === 'production') {
    console.error("CRITICAL: Firebase configuration is missing! These keys are required:", missingKeys.join(', '))
  } else {
    console.warn("Firebase configuration is partially missing. Expected this during local build/development if .env is not set.")
  }
}

// Connect to emulator in development (optional)
if (isFirebaseConfigured && process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATOR === 'true') {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
    connectStorageEmulator(storage, '127.0.0.1', 9199)
  } catch (error) {
    // Emulator already connected
  }
}

export { app, auth, db, storage, analytics, isFirebaseConfigured }
