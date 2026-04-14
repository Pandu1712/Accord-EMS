'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, setDoc, doc, updateDoc, orderBy, getDoc } from 'firebase/firestore'
import { FileEdit, Check, X, Clock, AlertCircle, Calendar, User, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RegularizationRequest {
  id: string
  employeeId: string
  employeeName: string
  date: string
  requestedCheckIn: string
  requestedCheckOut: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
}

export default function RegularizationPage() {
  const { user, role, isSuperAdmin } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const dateParam = searchParams.get('date')

  const [requests, setRequests] = useState<RegularizationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(!!dateParam)
  const [formData, setFormData] = useState({
    date: dateParam || '',
    checkIn: '',
    checkOut: '',
    reason: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const loadRequests = async () => {
      try {
        setLoading(true)
        const regRef = collection(db, 'regularizations')
        let q = query(regRef, orderBy('submittedAt', 'desc'))

        if (role === 'employee') {
          q = query(regRef, where('employeeId', '==', user?.uid))
        }

        const snapshot = await getDocs(q)
        const requestsData = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as RegularizationRequest))
          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
        
        setRequests(requestsData)
      } catch (e) {
        console.error('Error loading requests:', e)
      } finally {
        setLoading(false)
      }
    }

    if (user?.uid) {
      loadRequests()
    }
  }, [user?.uid, role])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.date || !formData.checkIn || !formData.checkOut || !formData.reason) {
      alert('Please fill all fields')
      return
    }

    try {
      setIsSubmitting(true)
      const regRef = collection(db, 'regularizations')
      const newId = doc(regRef).id
      
      const payload = {
        employeeId: user?.uid,
        employeeName: (user as any)?.name || user?.email,
        date: formData.date,
        requestedCheckIn: formData.checkIn,
        requestedCheckOut: formData.checkOut,
        reason: formData.reason,
        status: 'pending',
        submittedAt: new Date().toISOString(),
      }

      await setDoc(doc(db, 'regularizations', newId), payload)
      setRequests([{ id: newId, ...payload } as RegularizationRequest, ...requests])
      setIsModalOpen(false)
      setFormData({ date: '', checkIn: '', checkOut: '', reason: '' })
    } catch (e) {
      console.error('Submission failed:', e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusChange = async (request: RegularizationRequest, newStatus: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'regularizations', request.id), { status: newStatus })

      if (newStatus === 'approved') {
        const attendanceId = request.date + '-' + request.employeeId
        const attRef = doc(db, 'attendance', attendanceId)
        
        // Calculate hours
        const s = new Date(`2000-01-01 ${request.requestedCheckIn}`)
        const e = new Date(`2000-01-01 ${request.requestedCheckOut}`)
        const diffHours = (Math.max(0, e.getTime() - s.getTime()) / (1000 * 60 * 60)).toFixed(2)

        const attSnap = await getDoc(attRef)
        if (attSnap.exists()) {
          await updateDoc(attRef, {
            checkInTime: request.requestedCheckIn,
            checkOutTime: request.requestedCheckOut,
            workingHours: `${diffHours}h`,
            status: 'present'
          })
        } else {
          await setDoc(attRef, {
            employeeId: request.employeeId,
            date: request.date,
            checkInTime: request.requestedCheckIn,
            checkOutTime: request.requestedCheckOut,
            workingHours: `${diffHours}h`,
            status: 'present',
            totalBreakMs: 0
          })
        }
      }

      setRequests(requests.map(r => r.id === request.id ? { ...r, status: newStatus } : r))
    } catch (e) {
      console.error('Error updating status:', e)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight italic uppercase leading-none text-primary">Regularization</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-lg font-medium tracking-tight italic">Correction of past attendance records</p>
        </div>
        {role === 'employee' && (
          <Button 
            onClick={() => setIsModalOpen(true)} 
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
          >
            <Plus size={20} /> New Request
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="p-20 text-center animate-pulse tracking-widest uppercase font-black text-xs text-muted-foreground">Synchronizing Requests...</div>
        ) : requests.length === 0 ? (
          <Card className="p-20 text-center flex flex-col items-center gap-4 border-dashed border-2">
            <AlertCircle size={48} className="text-muted-foreground/20" />
            <p className="font-bold text-muted-foreground/40 uppercase tracking-widest text-xs">No requests found</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((request) => (
              <Card key={request.id} className="p-6 bg-card border border-border shadow-xl hover:shadow-2xl transition-all group overflow-hidden relative">
                <div className={cn(
                  "absolute top-0 right-0 w-24 h-24 -translate-y-1/2 translate-x-1/2 rounded-full opacity-10 blur-xl",
                  request.status === 'approved' ? "bg-green-500" : request.status === 'pending' ? "bg-orange-500" : "bg-red-500"
                )} />
                
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-muted rounded-2xl">
                    <Calendar className="text-primary" size={24} />
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    request.status === 'approved' ? "bg-green-100 text-green-700" : 
                    request.status === 'pending' ? "bg-orange-100 text-orange-700 animate-pulse" : 
                    "bg-red-100 text-red-700"
                  )}>
                    {request.status}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-foreground">{request.employeeName}</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Submitted On: {new Date(request.submittedAt).toLocaleDateString()}</p>
                  </div>

                  <div className="p-4 bg-muted/30 rounded-2xl border border-border space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-black text-muted-foreground uppercase tracking-tighter">Target Date</span>
                      <span className="font-bold">{request.date}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-black text-muted-foreground uppercase tracking-tighter">New Shift</span>
                      <span className="font-bold text-primary">{request.requestedCheckIn} - {request.requestedCheckOut}</span>
                    </div>
                  </div>

                  <div className="text-xs">
                    <p className="font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60">Reason</p>
                    <p className="font-medium text-foreground/80 leading-relaxed italic">&quot;{request.reason}&quot;</p>
                  </div>
                </div>

                {role !== 'employee' && request.status === 'pending' && (
                  <div className="mt-6 flex gap-3 pt-6 border-t border-border">
                    <Button 
                      onClick={() => handleStatusChange(request, 'approved')} 
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl h-10 font-bold text-xs"
                    >
                      <Check size={16} className="mr-2" /> Approve
                    </Button>
                    <Button 
                      onClick={() => handleStatusChange(request, 'rejected')} 
                      variant="destructive" 
                      className="flex-1 rounded-xl h-10 font-bold text-xs"
                    >
                      <X size={16} className="mr-2" /> Reject
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Submission Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg bg-card shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border bg-muted/20 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Attendance Regularization</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Target Date</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Correct Check-In</label>
                  <Input
                    type="time"
                    value={formData.checkIn}
                    onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Correct Check-Out</label>
                  <Input
                    type="time"
                    value={formData.checkOut}
                    onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Reason for correction</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full p-4 bg-background border border-border rounded-xl text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. Forgot to punch in, System error, On-site duty..."
                />
              </div>
              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 rounded-xl">Discard</Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 h-12 rounded-xl font-bold bg-primary text-primary-foreground">
                  {isSubmitting ? 'Submitting...' : 'Send for Approval'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}

function Plus({ size, className }: { size: number, className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/><path d="M12 5v14"/>
    </svg>
  )
}
