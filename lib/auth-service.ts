import { signIn, getUserRole } from './firebase-auth'
import { loginEmployee } from './employee-auth'

export type AuthResult = {
  success: boolean
  role?: string
  error?: string
}

/**
 * Unified login function that attempts authentication across all supported tiers
 * ONLY via USER ID and Password
 */
export async function unifiedLogin(identifier: string, password: string): Promise<AuthResult> {
  const trimmedId = identifier.trim().toUpperCase()
  const trimmedPassword = password.trim()

  try {
    // 1. Root Tier: Master Super Admin (Hardcoded)
    if (trimmedId === 'ACCORD123') {
      if (trimmedPassword === 'AccordPandu') {
        sessionStorage.setItem('superAdminUsername', 'ACCORD123')
        sessionStorage.setItem('superAdminSession', Date.now().toString())
        return { success: true, role: 'super-admin' }
      } else {
        throw new Error('Invalid Master Password')
      }
    }

    // 2. Security Check: Block raw email entry
    if (trimmedId.includes('@')) {
      throw new Error('Please login using your SYSTEM ID, not your email address.')
    }

    // 3. Organizational Tier: Look up ID in Employees Collection
    let employeeData: any = null
    try {
      employeeData = await loginEmployee(trimmedId, trimmedPassword)
    } catch (err: any) {
      if (err.message === 'Invalid password') throw err
      // If not found, it might be an Admin who needs Firebase Auth bridge
    }

    if (employeeData) {
      // If found and standard employee/lead, they are already logged in via loginEmployee's sessionStorage logic
      if (employeeData.role === 'employee' || employeeData.role === 'team-lead') {
        return { success: true, role: employeeData.role }
      }
      
      // If found and Admin/SuperAdmin, we bridge to Firebase Auth using their stored email
      if ((employeeData.role === 'admin' || employeeData.role === 'super-admin') && employeeData.email) {
        console.log('[v8] Bridging to Firebase Auth via ID lookup...')
        const user = await signIn(employeeData.email, trimmedPassword)
        const role = await getUserRole(user.uid)
        return { success: true, role: role || employeeData.role }
      }
    }

    // 4. Final Fallback: ID not recognized in any tier
    throw new Error('USER ID not recognized. Please verify your credentials.')

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Authentication synchronization failed'
    }
  }
}
