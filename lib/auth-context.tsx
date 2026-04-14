'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { onAuthStateChanged, User, signOut } from 'firebase/auth'
import { auth, isFirebaseConfigured } from './firebase'
import { getUserRole } from './firebase-auth'
import { getEmployeeSession, isEmployeeSessionValid } from './employee-auth'
import { ConfigurationMissing } from '@/components/config-missing'

interface AuthContextType {
  user: User | null
  uid: string | null
  role: string | null
  loading: boolean
  error: string | null
  userEmail?: string
  employeeId?: string
  employeeName?: string
  isSuperAdmin?: boolean
  isEmployee?: boolean
  isTeamLead?: boolean
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [employeeData, setEmployeeData] = useState<any>(null)

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('[v8] Auth context initializing system synchronization...')
      
      try {
        // 1. Check for Super Admin Session (Highest Tier)
        const superAdminUsername = sessionStorage.getItem('superAdminUsername')
        if (superAdminUsername === 'ACCORD123') {
          console.log('[v8] Master Credentials detected. Granting Super Admin access.')
          setRole('super-admin')
          setLoading(false)
          return
        }

        // 2. Check for Employee Session (Custom Auth Tier)
        if (isEmployeeSessionValid()) {
          const empSession = getEmployeeSession()
          if (empSession) {
            console.log('[v8] Employee Token validated. Role: ', empSession.role)
            setRole(empSession.role || 'employee')
            setEmployeeData(empSession)
            setLoading(false)
            return
          }
        }

        // 3. Check for Firebase Session (Standard Admin Tier)
        console.log('[v8] No legacy local sessions. Establishing Firebase bridge...')
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            console.log('[v8] Firebase Auth established for UID:', firebaseUser.uid)
            setUser(firebaseUser)
            try {
                const userRole = await getUserRole(firebaseUser.uid)
                console.log('[v8] System role identified:', userRole)
                setRole(userRole)
            } catch (err) {
                console.error('[v8] Role fetch failed:', err)
                setRole('user')
            }
          } else {
            console.log('[v8] No active Firebase sessions identified.')
            setUser(null)
            setRole(null)
          }
          setLoading(false)
        })

        return () => unsubscribe()

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'System initialization failed'
        setError(errorMessage)
        console.error('[v8] Critical Auth Failure:', err)
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const logout = async () => {
    try {
      console.log('[v8] Initiating global sign-out protocol...')
      await signOut(auth)
      sessionStorage.clear()
      localStorage.clear()
      setUser(null)
      setRole(null)
      setEmployeeData(null)
      window.location.href = '/login'
    } catch (err) {
      console.error('[v8] Sign-out failure:', err)
    }
  }

  const authValue: AuthContextType = {
    user,
    uid: user?.uid || employeeData?.employeeUid || (role === 'super-admin' ? 'ACCORD-MASTER' : null),
    role,
    loading,
    error,
    userEmail: user?.email || (role === 'super-admin' ? 'master@accord.systems' : employeeData?.employeeEmail),
    employeeId: employeeData?.employeeId,
    employeeName: employeeData?.employeeName,
    isSuperAdmin: role === 'super-admin',
    isEmployee: role === 'employee' || role === 'team-lead' || !!employeeData?.employeeId,
    isTeamLead: role === 'team-lead',
    logout
  }

  return (
    <AuthContext.Provider value={authValue}>
      {!isFirebaseConfigured ? <ConfigurationMissing /> : children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
