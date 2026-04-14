'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { db } from '@/lib/firebase'
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { Megaphone, Trash2, Plus, X, Info, Send, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Announcement {
  id: string
  title: string
  content: string
  type: 'info' | 'priority'
  postedBy: string
  postedAt: any
}

export default function AnnouncementsPage() {
  const { role, isSuperAdmin, employeeName } = useAuth()
  const router = useRouter()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info' as 'info' | 'priority'
  })

  useEffect(() => {
    // All authenticated roles can view global announcements
    if (!role) {
      router.push('/dashboard')
    }
  }, [role, router])

  const loadAnnouncements = async () => {
    try {
      setLoading(true)
      const q = query(collection(db, 'announcements'), orderBy('postedAt', 'desc'))
      const snapshot = await getDocs(q)
      setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)))
    } catch (e) {
      console.error('Error loading announcements:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.content) return

    try {
      setIsSubmitting(true)
      await addDoc(collection(db, 'announcements'), {
        ...formData,
        postedBy: employeeName || 'Administrator',
        postedAt: serverTimestamp(),
      })
      setIsModalOpen(false)
      setFormData({ title: '', content: '', type: 'info' })
      loadAnnouncements()
    } catch (e) {
      console.error('Error posting announcement:', e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this broadcast?')) return
    try {
      await deleteDoc(doc(db, 'announcements', id))
      setAnnouncements(announcements.filter(a => a.id !== id))
    } catch (e) {
      console.error('Error deleting announcement:', e)
    }
  }

  if (!role) return null

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight italic uppercase leading-none text-primary flex items-center gap-4">
             Broadcast Hub
             <Megaphone className="text-primary animate-pulse" />
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-lg font-medium tracking-tight italic">Manage organization-wide announcements and alerts</p>
        </div>
        {(role === 'admin' || isSuperAdmin) && (
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-primary-foreground h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20"
          >
            <Plus size={20} className="mr-2" /> New Broadcast
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
         {loading ? (
             <div className="p-20 text-center animate-pulse font-black text-muted-foreground tracking-widest uppercase text-xs">Synchronizing Broadcasts...</div>
         ) : announcements.length === 0 ? (
             <Card className="p-20 border-dashed flex flex-col items-center gap-4 text-center bg-muted/5 opacity-50">
                <Megaphone size={48} className="text-muted-foreground/20" />
                <p className="text-xs font-black uppercase tracking-widest">No active broadcasts found.</p>
             </Card>
         ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {announcements.map((a) => (
                  <Card key={a.id} className={cn(
                    "p-8 border shadow-xl relative overflow-hidden group rounded-[2rem]",
                    a.type === 'priority' ? "bg-zinc-950 text-white border-zinc-800" : "bg-card border-border"
                  )}>
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                       <Megaphone size={80} />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            a.type === 'priority' ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          )}>
                             {a.type}
                          </span>
                          {(role === 'admin' || isSuperAdmin) && (
                            <button onClick={() => handleDelete(a.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                               <Trash2 size={18} />
                            </button>
                          )}
                       </div>
                       <div>
                          <h3 className="text-xl font-black italic uppercase tracking-tight">{a.title}</h3>
                          <p className={cn(
                            "mt-3 text-sm font-medium leading-relaxed italic",
                            a.type === 'priority' ? "text-zinc-400" : "text-muted-foreground"
                          )}>{a.content}</p>
                       </div>
                       <div className="pt-6 border-t border-border/10 flex items-center justify-between text-[10px] font-black uppercase tracking-widest opacity-40 italic">
                          <span>Posted by {a.postedBy}</span>
                          <span>{a.postedAt?.toDate().toLocaleDateString('en-GB') || 'Now'}</span>
                       </div>
                    </div>
                  </Card>
                ))}
             </div>
         )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg bg-card shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border bg-muted/20 flex items-center justify-between">
              <h2 className="text-xl font-black italic uppercase tracking-tight">Compose Broadcast</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Broadcast Title</label>
                <Input
                  placeholder="e.g. Office Policy Update"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Priority Level</label>
                <div className="flex gap-2 p-1 bg-muted rounded-xl">
                   <button 
                     type="button"
                     onClick={() => setFormData({ ...formData, type: 'info' })}
                     className={cn(
                       "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all",
                       formData.type === 'info' ? "bg-background shadow-md text-blue-500" : "text-muted-foreground"
                     )}
                   >
                      <Info size={14} /> Normal
                   </button>
                   <button 
                     type="button"
                     onClick={() => setFormData({ ...formData, type: 'priority' })}
                     className={cn(
                       "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all",
                       formData.type === 'priority' ? "bg-zinc-950 shadow-md text-red-500" : "text-muted-foreground"
                     )}
                   >
                      <AlertCircle size={14} /> High Priority
                   </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Message Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full p-4 bg-background border border-border rounded-xl text-sm min-h-[120px] outline-none focus:ring-2 focus:ring-primary/20 italic font-medium"
                  placeholder="Write your announcement here..."
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-xl font-black uppercase tracking-widest text-[10px] bg-primary text-primary-foreground shadow-xl shadow-primary/20">
                <Send size={18} className="mr-2" /> {isSubmitting ? 'Transmitting...' : 'Dispatch Broadcast'}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
