import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User,
  setPersistence,
  browserLocalPersistence,
  getAuth,
} from 'firebase/auth'
import { initializeApp, deleteApp } from 'firebase/app'
import { auth, db } from './firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'

export interface UserRole {
  uid: string
  email: string
  displayName?: string
  role: 'super-admin' | 'admin' | 'employee'
  createdAt: Date
}

// Sign up a new user (standard, will sign in the user)
export async function signUp(email: string, password: string): Promise<User> {
  try {
    await setPersistence(auth, browserLocalPersistence)
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    return userCredential.user
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign up')
  }
}

// Sign up a new user without signing out the current admin
// This uses a secondary Firebase app instance
export async function signUpAdmin(email: string, password: string): Promise<User> {
  const secondaryConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }

  const secondaryAppName = `SecondaryApp_${Date.now()}`
  const secondaryApp = initializeApp(secondaryConfig, secondaryAppName)
  const secondaryAuth = getAuth(secondaryApp)

  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    const user = userCredential.user
    
    // Sign out from the secondary auth to be safe, though not strictly required
    await signOut(secondaryAuth)
    // Delete the secondary app to clean up resources
    await deleteApp(secondaryApp)
    
    return user
  } catch (error: any) {
    // Cleanup even on error
    try {
      await deleteApp(secondaryApp)
    } catch (e) {}
    throw new Error(error.message || 'Failed to create user account')
  }
}

// Sign in with email and password
export async function signIn(email: string, password: string): Promise<User> {
  try {
    await setPersistence(auth, browserLocalPersistence)
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return userCredential.user
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign in')
  }
}

// Sign out the current user
export async function logOut(): Promise<void> {
  try {
    await signOut(auth)
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign out')
  }
}

// Send password reset email
export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email)
  } catch (error: any) {
    throw new Error(error.message || 'Failed to send reset email')
  }
}

// Update user profile
export async function updateUserProfile(
  user: User,
  displayName: string,
  photoURL?: string
): Promise<void> {
  try {
    await updateProfile(user, {
      displayName,
      photoURL,
    })
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update profile')
  }
}

// Create user record in Firestore
export async function createUserInFirestore(
  uid: string,
  email: string,
  role: UserRole['role'],
  displayName?: string
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid)
    await setDoc(userRef, {
      email,
      role,
      displayName: displayName || email.split('@')[0],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create user record')
  }
}

// Get user role from Firestore
export async function getUserRole(uid: string): Promise<UserRole['role'] | null> {
  try {
    const userRef = doc(db, 'users', uid)
    const userDoc = await getDoc(userRef)
    if (userDoc.exists()) {
      return userDoc.data().role as UserRole['role']
    }
    return null
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get user role')
  }
}

// Get complete user data from Firestore
export async function getUserData(uid: string): Promise<UserRole | null> {
  try {
    const userRef = doc(db, 'users', uid)
    const userDoc = await getDoc(userRef)
    if (userDoc.exists()) {
      return {
        uid,
        ...userDoc.data(),
      } as UserRole
    }
    return null
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get user data')
  }
}
