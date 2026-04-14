'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { Plus, Edit2, Trash2, Search } from 'lucide-react'
import { useUserManagement } from '@/lib/hooks/use-user-management'

interface User {
  id: string
  email: string
  role: string
  createdAt: string
  lastLogin: string
}

export default function UsersPage() {
  const { role } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  // Check authorization
  useEffect(() => {
    if (role !== 'super-admin') {
      router.push('/dashboard')
    }
  }, [role, router])

  // Load users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true)
        const usersRef = collection(db, 'users')
        const q = query(usersRef, where('role', '!=', 'super-admin'))
        const snapshot = await getDocs(q)
        
        const usersData: User[] = snapshot.docs.map(doc => ({
          id: doc.id,
          email: doc.data().email,
          role: doc.data().role,
          createdAt: doc.data().createdAt,
          lastLogin: doc.data().lastLogin || 'Never',
        }))
        
        setUsers(usersData)
      } catch (error) {
        console.error('Error loading users:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [])

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteDoc(doc(db, 'users', userId))
        setUsers(users.filter(u => u.id !== userId))
      } catch (error) {
        console.error('Error deleting user:', error)
        alert('Failed to delete user')
      }
    }
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setIsModalOpen(true)
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (role !== 'super-admin') {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-2">Manage all users in the system</p>
        </div>
        <Button
          onClick={() => {
            setEditingUser(null)
            setIsModalOpen(true)
          }}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={20} />
          Add User
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4 bg-card">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={20} />
          <Input
            placeholder="Search by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Users Table */}
      <Card className="bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Created</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Last Login</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-foreground">{user.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground capitalize">
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{user.createdAt}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{user.lastLogin}</td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
