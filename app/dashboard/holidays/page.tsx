'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { db } from '@/lib/firebase'
import { collection, getDocs, setDoc, doc, deleteDoc, orderBy, query } from 'firebase/firestore'
import { Plus, X, Calendar, Trash2, MapPin, Info, Coffee, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Holiday {
  id: string
  name: string
  date: string
  description: string
}

export default function HolidaysPage() {
  const { role, isSuperAdmin } = useAuth()
  const router = useRouter()
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: '',
  })
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Employees are allowed to view the calendar

  useEffect(() => {
    const loadHolidays = async () => {
      try {
        setLoading(true)
        const holidaysRef = collection(db, 'holidays')
        const q = query(holidaysRef, orderBy('date', 'asc'))
        const snapshot = await getDocs(q)
        
        const holidaysData: Holiday[] = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          date: doc.data().date,
          description: doc.data().description,
        }))
        
        setHolidays(holidaysData)
      } catch (error) {
        console.error('Error loading holidays:', error)
      } finally {
        setLoading(false)
      }
    }

    if (role) {
      loadHolidays()
    }
  }, [role, isSuperAdmin])

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setIsSubmitting(true)

    try {
      if (!formData.name || !formData.date) {
        setFormError('Name and date are required')
        return
      }

      const holidaysRef = collection(db, 'holidays')
      const newDocId = doc(holidaysRef).id
      
      await setDoc(doc(db, 'holidays', newDocId), {
        name: formData.name,
        date: formData.date,
        description: formData.description,
      })

      setHolidays([...holidays, {
        id: newDocId,
        name: formData.name,
        date: formData.date,
        description: formData.description,
      }].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))

      setFormData({ name: '', date: '', description: '' })
      setIsModalOpen(false)
    } catch (error: any) {
      setFormError(error.message || 'Failed to add holiday')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteHoliday = async (holidayId: string) => {
    if (confirm('Are you sure you want to delete this holiday?')) {
      try {
        await deleteDoc(doc(db, 'holidays', holidayId))
        setHolidays(holidays.filter(h => h.id !== holidayId))
      } catch (error) {
        console.error('Error deleting holiday:', error)
        alert('Failed to delete holiday')
      }
    }
  }

  // Removed role block to allow Employee viewing

  const upcomingHolidays = holidays.filter(h => new Date(h.date) >= new Date())
  const pastHolidays = holidays.filter(h => new Date(h.date) < new Date())

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight italic uppercase leading-none">Holiday Calendar</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-lg font-medium tracking-tight italic">Plan your long weekends and company festivities</p>
        </div>
        {(role === 'admin' || isSuperAdmin) && (
        <Button
          onClick={() => {
            setFormData({ name: '', date: '', description: '' })
            setFormError('')
            setIsModalOpen(true)
          }}
          size="lg"
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 h-14 px-8 w-full sm:w-auto"
        >
          <Plus size={20} />
          Record Holiday
        </Button>
        )}
      </div>

      {/* Hero Analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 bg-zinc-950 text-white border-none shadow-xl overflow-hidden relative rounded-[2rem]">
          <div className="absolute -bottom-4 -right-4 opacity-10 transform rotate-12">
            <Calendar size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Upcoming Events</p>
            <p className="text-4xl font-black tracking-tighter">{upcomingHolidays.length}</p>
          </div>
        </Card>
        
        <Card className="p-6 bg-card border border-border overflow-hidden relative rounded-[2rem]">
          <div className="absolute -bottom-4 -right-4 opacity-5 transform rotate-12 text-primary/20">
            <Coffee size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Rest Days Allotted</p>
            <p className="text-4xl font-black tracking-tighter text-primary">{holidays.length}</p>
          </div>
        </Card>

        <Card className="p-6 bg-card border border-border flex flex-col justify-center rounded-[2rem] sm:col-span-2 lg:col-span-1">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Next Holiday</p>
            {upcomingHolidays.length > 0 ? (
                <div>
                   <p className="text-xl font-black text-foreground truncate uppercase italic">{upcomingHolidays[0].name}</p>
                   <p className="text-xs font-black text-primary uppercase tracking-widest">{new Date(upcomingHolidays[0].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
            ) : (
                <p className="text-xs font-black text-muted-foreground/40 italic uppercase tracking-widest">No holidays scheduled</p>
            )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        {/* List Content */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-3 px-2">
            <Calendar className="text-primary w-5 h-5" />
            Active Calendar
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading ? (
              [1, 2, 3].map(i => <Card key={i} className="h-40 bg-muted/20 animate-pulse" />)
            ) : upcomingHolidays.length === 0 ? (
              <Card className="md:col-span-2 xl:col-span-3 p-12 border-dashed bg-muted/10 flex flex-col items-center text-center space-y-4">
                 <div className="p-4 bg-background rounded-full border border-border">
                    <Calendar className="w-8 h-8 text-muted-foreground/30" />
                 </div>
                 <p className="text-muted-foreground font-medium">No company holidays have been recorded for this period.</p>
              </Card>
            ) : (
                upcomingHolidays.map((holiday) => (
                    <Card key={holiday.id} className="group hover:border-primary/40 hover:shadow-xl transition-all duration-300 overflow-hidden bg-card border border-border">
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="p-3 bg-primary/10 rounded-2xl">
                                <Calendar className="w-6 h-6 text-primary" />
                            </div>
                            {(role === 'admin' || isSuperAdmin) && (
                            <button
                                onClick={() => handleDeleteHoliday(holiday.id)}
                                className="opacity-0 group-hover:opacity-100 p-2 text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                            >
                                <Trash2 size={18} />
                            </button>
                            )}
                        </div>
                        
                        <h4 className="text-lg font-black text-foreground mb-1 leading-tight group-hover:text-primary transition-colors">
                            {holiday.name}
                        </h4>
                        
                        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-tighter mb-4">
                            <span>{new Date(holiday.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                        
                        {holiday.description && (
                            <div className="pt-4 border-t border-border flex gap-3">
                                <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                                <p className="text-xs text-muted-foreground italic leading-relaxed">{holiday.description}</p>
                            </div>
                        )}
                      </div>
                    </Card>
                ))
            )}
          </div>
        </div>

        {/* History Section */}
        {pastHolidays.length > 0 && (
          <div className="space-y-6 pt-4">
            <h2 className="text-xl font-bold text-muted-foreground flex items-center gap-3 px-2">
              <Clock className="w-5 h-5" />
              Past & Archived
            </h2>
            <Card className="bg-card border border-border overflow-hidden rounded-2xl">
                 <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-muted/30 border-b border-border">
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-muted-foreground tracking-widest">Holiday Title</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-muted-foreground tracking-widest">Date Recorded</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-muted-foreground tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {pastHolidays.map((holiday) => (
                                <tr key={holiday.id} className="hover:bg-muted/20 transition-colors opacity-60">
                                    <td className="px-6 py-4 text-sm font-bold text-foreground">{holiday.name}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-muted-foreground">
                                        {new Date(holiday.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className="px-2 py-0.5 bg-muted rounded font-bold text-[10px] uppercase">Archive</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </Card>
          </div>
        )}
      </div>

      {/* Add Holiday Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-card shadow-2xl rounded-3xl overflow-hidden border-border transition-all animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-border bg-muted/20">
              <h2 className="text-xl font-black text-foreground tracking-tight">Record New Holiday</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddHoliday} className="p-7 space-y-6">
              {formError && (
                <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-bold border border-destructive/20">
                  {formError}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                    <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">Holiday Identifier</label>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Independence Day"
                      className="w-full h-12 rounded-xl focus:ring-2 focus:ring-primary/20 border-border"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">Calendar Date</label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full h-12 rounded-xl focus:ring-2 focus:ring-primary/20 border-border"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">Internal Note (Optional)</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Special instructions or context..."
                      className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[100px] transition-all"
                    />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl font-bold text-muted-foreground hover:bg-muted transition-all"
                  disabled={isSubmitting}
                >
                  Discard
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12 rounded-xl font-black bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Recording...' : 'Publish Holiday'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
