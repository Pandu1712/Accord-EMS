import { db } from './firebase'
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  WriteBatch,
  writeBatch,
} from 'firebase/firestore'

/**
 * Initialize Firestore collections and seed initial data
 * Run this once to set up the database
 */
export async function initializeFirestore() {
  try {
    console.log('[v0] Initializing Firestore collections...')

    // Check if roles collection exists and has data
    const rolesRef = collection(db, 'roles')
    const rolesSnapshot = await getDocs(rolesRef)

    if (rolesSnapshot.empty) {
      console.log('[v0] Creating initial roles...')
      const batch = writeBatch(db)

      // Super Admin role
      batch.set(doc(rolesRef), {
        name: 'super-admin',
        description: 'Full system access',
        permissions: [
          'manage_admins',
          'manage_employees',
          'view_reports',
          'manage_holidays',
          'manage_leave_types',
          'system_settings',
        ],
        createdAt: new Date(),
      })

      // Admin role
      batch.set(doc(rolesRef), {
        name: 'admin',
        description: 'Administrative access',
        permissions: [
          'manage_employees',
          'view_attendance',
          'approve_leaves',
          'manage_holidays',
          'view_reports',
        ],
        createdAt: new Date(),
      })

      // Employee role
      batch.set(doc(rolesRef), {
        name: 'employee',
        description: 'Employee access',
        permissions: ['view_own_profile', 'apply_leave', 'view_attendance', 'view_notifications'],
        createdAt: new Date(),
      })

      await batch.commit()
      console.log('[v0] Roles created successfully')
    }

    // Check if leave types collection exists
    const leaveTypesRef = collection(db, 'leaveTypes')
    const leaveTypesSnapshot = await getDocs(leaveTypesRef)

    if (leaveTypesSnapshot.empty) {
      console.log('[v0] Creating initial leave types...')
      const batch = writeBatch(db)

      const leaveTypes = [
        { name: 'Casual Leave', annualLimit: 12 },
        { name: 'Sick Leave', annualLimit: 10 },
        { name: 'Annual Leave', annualLimit: 20 },
        { name: 'Maternity Leave', annualLimit: 180 },
        { name: 'Paternity Leave', annualLimit: 15 },
      ]

      leaveTypes.forEach((leave) => {
        batch.set(doc(leaveTypesRef), {
          ...leave,
          createdAt: new Date(),
        })
      })

      await batch.commit()
      console.log('[v0] Leave types created successfully')
    }

    console.log('[v0] Firestore initialization complete')
  } catch (error) {
    console.error('[v0] Firestore initialization error:', error)
    throw error
  }
}

/**
 * Create initial demo users (for testing)
 */
export async function createDemoUsers() {
  try {
    console.log('[v0] Creating demo users...')
    const usersRef = collection(db, 'users')
    const batch = writeBatch(db)

    const demoUsers = [
      {
        uid: 'super-admin-1',
        email: 'admin@accord.com',
        displayName: 'Super Admin',
        role: 'super-admin',
      },
      {
        uid: 'admin-1',
        email: 'admin2@accord.com',
        displayName: 'Admin User',
        role: 'admin',
      },
      {
        uid: 'emp-1',
        email: 'emp1@accord.com',
        displayName: 'John Doe',
        role: 'employee',
      },
    ]

    demoUsers.forEach((user) => {
      batch.set(doc(usersRef, user.uid), {
        ...user,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    })

    await batch.commit()
    console.log('[v0] Demo users created successfully')
  } catch (error) {
    console.error('[v0] Demo users creation error:', error)
    throw error
  }
}
