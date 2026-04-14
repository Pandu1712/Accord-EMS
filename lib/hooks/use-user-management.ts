import { useState, useCallback } from 'react'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore'

export interface User {
  id: string
  email: string
  role: string
  createdAt: string
  lastLogin: string
}

export function useUserManagement() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const usersRef = collection(db, 'users')
      const q = query(usersRef, where('role', '!=', 'super-admin'))
      const snapshot = await getDocs(q)
      
      const users: User[] = snapshot.docs.map(doc => ({
        id: doc.id,
        email: doc.data().email,
        role: doc.data().role,
        createdAt: doc.data().createdAt,
        lastLogin: doc.data().lastLogin || 'Never',
      }))
      
      return users
    } catch (err: any) {
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteUser = useCallback(async (userId: string) => {
    try {
      setLoading(true)
      setError(null)
      await deleteDoc(doc(db, 'users', userId))
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateUser = useCallback(async (userId: string, data: Partial<User>) => {
    try {
      setLoading(true)
      setError(null)
      await updateDoc(doc(db, 'users', userId), data)
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getUsers,
    deleteUser,
    updateUser,
  }
}
