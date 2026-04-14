'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, deleteDoc, doc, setDoc, Timestamp } from 'firebase/firestore'
import { Plus, Edit2, Trash2, Search, X } from 'lucide-react'
import { signUpAdmin } from '@/lib/firebase-auth'

interface Admin {
  id: string
  email: string
  name: string
  createdAt: string
  status: string
}

export default function AdminsPage() {
  const { role, isSuperAdmin } = useAuth()
  const router = useRouter()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({ email: '', name: '', password: '' })
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check authorization
  useEffect(() => {
    if (!isSuperAdmin && role !== 'super-admin') {
      router.push('/dashboard')
    }
  }, [isSuperAdmin, role, router])

  // Load admins
  useEffect(() => {
    const loadAdmins = async () => {
      try {
        setLoading(true)
        const adminsRef = collection(db, 'users')
        const q = query(adminsRef, where('role', '==', 'admin'))
        const snapshot = await getDocs(q)
        
        const adminsData: Admin[] = snapshot.docs.map(doc => ({
          id: doc.id,
          email: doc.data().email,
          name: doc.data().name || 'N/A',
          createdAt: doc.data().createdAt || 'N/A',
          status: doc.data().status || 'active',
        }))
        
        setAdmins(adminsData)
      } catch (error) {
        console.error('Error loading admins:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAdmins()
  }, [])

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setIsSubmitting(true)

    try {
      if (!formData.email || !formData.name || !formData.password) {
        setFormError('All fields are required')
        return
      }

      // Create user in Firebase Auth without losing session
      const user = await signUpAdmin(formData.email, formData.password)

      // Create admin record in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: formData.email,
        name: formData.name,
        role: 'admin',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLogin: null,
      })

      // Add to local state
      setAdmins([...admins, {
        id: user.uid,
        email: formData.email,
        name: formData.name,
        createdAt: new Date().toISOString(),
        status: 'active',
      }])

      setFormData({ email: '', name: '', password: '' })
      setIsModalOpen(false)
    } catch (error: any) {
      setFormError(error.message || 'Failed to create admin')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAdmin = async (adminId: string) => {
    if (confirm('Are you sure you want to delete this admin?')) {
      try {
        await deleteDoc(doc(db, 'users', adminId))
        setAdmins(admins.filter(a => a.id !== adminId))
      } catch (error) {
        console.error('Error deleting admin:', error)
        alert('Failed to delete admin')
      }
    }
  }

  const filteredAdmins = admins.filter(admin =>
    admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (role !== 'super-admin') {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Management</h1>
          <p className="text-muted-foreground mt-2">Manage system administrators</p>
        </div>
        <Button
          onClick={() => {
            setFormData({ email: '', name: '', password: '' })
            setFormError('')
            setIsModalOpen(true)
          }}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={20} />
          Add Admin
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4 bg-card">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={20} />
          <Input
            placeholder="Search by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Admins Table */}
      <Card className="bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading admins...</div>
        ) : filteredAdmins.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No admins found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Created</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{admin.name}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{admin.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100">
                        {admin.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{admin.createdAt}</td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      <button
                        onClick={() => handleDeleteAdmin(admin.id)}
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

      {/* Add Admin Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-card">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">Add New Admin</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddAdmin} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded bg-destructive/10 text-destructive text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Admin name"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@example.com"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
                  className="w-full"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Admin'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
