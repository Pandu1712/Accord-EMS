import { db } from './firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import * as bcrypt from 'bcryptjs'

/**
 * Login employee using Employee ID and password
 */
export async function loginEmployee(employeeId: string, password: string): Promise<any> {
  try {
    // Query Firestore for employee with matching ID
    const employeesRef = collection(db, 'employees')
    const q = query(employeesRef, where('employeeNo', '==', employeeId.toUpperCase()))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      throw new Error('Employee ID not found')
    }

    const employeeDoc = querySnapshot.docs[0]
    const employeeData = employeeDoc.data()

    // Verify password (in real app, compare with hashed password)
    if (employeeData.password !== password) {
      throw new Error('Invalid password')
    }

    // Store employee session
    sessionStorage.setItem('employeeId', employeeId.toUpperCase())
    sessionStorage.setItem('employeeSession', Date.now().toString())
    sessionStorage.setItem('employeeUid', employeeDoc.id)
    sessionStorage.setItem('employeeName', employeeData.name || '')
    sessionStorage.setItem('employeeRole', employeeData.role || 'employee')

    return employeeData
  } catch (error: any) {
    throw new Error(error.message || 'Failed to login employee')
  }
}

/**
 * Check if employee session is valid
 */
export function isEmployeeSessionValid(): boolean {
  const employeeId = sessionStorage.getItem('employeeId')
  const sessionTime = sessionStorage.getItem('employeeSession')
  
  if (!employeeId || !sessionTime) {
    return false
  }

  // Session expires after 8 hours
  const sessionAge = Date.now() - parseInt(sessionTime)
  const maxAge = 8 * 60 * 60 * 1000

  return sessionAge < maxAge
}

/**
 * Get current employee session data
 */
export function getEmployeeSession() {
  if (!isEmployeeSessionValid()) {
    logoutEmployee()
    return null
  }

  return {
    employeeId: sessionStorage.getItem('employeeId'),
    employeeUid: sessionStorage.getItem('employeeUid'),
    employeeName: sessionStorage.getItem('employeeName'),
    role: sessionStorage.getItem('employeeRole') || 'employee',
  }
}

/**
 * Logout employee
 */
export function logoutEmployee(): void {
  sessionStorage.removeItem('employeeId')
  sessionStorage.removeItem('employeeSession')
  sessionStorage.removeItem('employeeUid')
  sessionStorage.removeItem('employeeName')
  sessionStorage.removeItem('employeeRole')
}

/**
 * Hash password (for storing in database)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return await bcrypt.hash(password, salt)
}

/**
 * Verify password
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}
