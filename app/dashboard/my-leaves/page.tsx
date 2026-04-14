'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, setDoc, doc, orderBy, getDoc } from 'firebase/firestore'
import { Plus, X, Calendar, FileText, CheckCircle2, Clock, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LeaveRequest {
  id: string
  leaveType: string
  startDate: string
  endDate: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  appliedOn: string
}

export default function MyLeavesPage() {
  const { user, uid, role, employeeName } = useAuth()
  const router = useRouter()
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    leaveType: 'casual',
    startDate: '',
    endDate: '',
    reason: '',
  })
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    available: 0,
    al: 0,
    ml: 0,
    compOff: 0
  })

  useEffect(() => {
    const validRoles = ['employee', 'team-lead', 'admin', 'super-admin']
    if (!validRoles.includes(role || '')) {
      router.push('/dashboard')
    }
  }, [role, router])

  useEffect(() => {
    const loadLeaves = async () => {
      try {
        setLoading(true)
        if (!uid) return

        const leavesRef = collection(db, 'leaves')
        const q = query(leavesRef, where('employeeId', '==', uid))
        const snapshot = await getDocs(q)
        
        const leavesData: LeaveRequest[] = snapshot.docs.map(doc => ({
          id: doc.id,
          leaveType: doc.data().leaveType,
          startDate: doc.data().startDate,
          endDate: doc.data().endDate,
          reason: doc.data().reason,
          status: doc.data().status,
          appliedOn: doc.data().appliedOn,
        })).sort((a, b) => new Date(b.appliedOn).getTime() - new Date(a.appliedOn).getTime())
        
        setLeaves(leavesData)
        
        // Fetch employee document for balances
        const empRef = doc(db, 'employees', uid)
        const empSnap = await getDoc(empRef)
        let balances = { al: 12, ml: 10, compOff: 0 }
        if (empSnap.exists()) {
          balances = empSnap.data().leaveBalances || balances
        }

        // Calculate stats
        const approvedCount = leavesData.filter(l => l.status === 'approved').length
        setStats({
          pending: leavesData.filter(l => l.status === 'pending').length,
          approved: approvedCount,
          rejected: leavesData.filter(l => l.status === 'rejected').length,
          available: (balances.al + balances.ml + balances.compOff),
          al: balances.al,
          ml: balances.ml,
          compOff: balances.compOff
        })
      } catch (error) {
        console.error('Error loading leaves:', error)
      } finally {
        setLoading(false)
      }
    }

    if (role) {
      loadLeaves()
    }
  }, [role, uid])

  const handleSubmitLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setIsSubmitting(true)

    try {
      if (!formData.startDate || !formData.endDate || !formData.reason) {
        setFormError('Please complete all fields to submit your request.')
        return
      }

      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        setFormError('End date cannot be earlier than start date.')
        return
      }

      if (!uid) return

      const leavesRef = collection(db, 'leaves')
      const newLeaveId = doc(leavesRef).id
      
      const newRequest = {
        employeeId: uid,
        employeeName: employeeName || (user?.email || 'Employee'),
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        status: 'pending',
        appliedOn: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await setDoc(doc(db, 'leaves', newLeaveId), newRequest)

      setLeaves([{ id: newLeaveId, ...newRequest } as LeaveRequest, ...leaves])
      
      setStats(prev => ({ ...prev, pending: prev.pending + 1 }))
      setFormData({ leaveType: 'casual', startDate: '', endDate: '', reason: '' })
      setIsModalOpen(false)
    } catch (error: any) {
      setFormError(error.message || 'Failed to submit leave request')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!role) {
    return null
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">My Leave Hub</h1>
          <p className="text-muted-foreground mt-2 text-lg font-medium">Track your balances and submit time-off requests</p>
        </div>
        <Button
          onClick={() => {
            setFormData({ leaveType: 'casual', startDate: '', endDate: '', reason: '' })
            setFormError('')
            setIsModalOpen(true)
          }}
          size="lg"
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-bold shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          New Leave Request
        </Button>
      </div>

      {/* Leave Balance & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="p-6 bg-zinc-950 text-white border-none shadow-xl relative overflow-hidden group rounded-[2rem]">
          <div className="absolute -bottom-4 -right-4 opacity-20 transform rotate-12 group-hover:scale-110 transition-transform">
             <Calendar size={100} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Available Allowance</p>
            <p className="text-3xl sm:text-4xl font-black tracking-tighter">{stats.available} Days</p>
          </div>
        </Card>

        <Card className="p-6 bg-card border border-border flex flex-col justify-center rounded-[2rem]">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Pending Approval</p>
            <p className="text-2xl sm:text-3xl font-black text-orange-500 tracking-tighter">{stats.pending}</p>
        </Card>
        
        <Card className="p-6 bg-card border border-border flex flex-col justify-center rounded-[2rem]">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Leaves Approved</p>
            <p className="text-2xl sm:text-3xl font-black text-green-600 tracking-tighter">{stats.approved}</p>
        </Card>

        <Card className="p-6 bg-card border border-border flex flex-col justify-center rounded-[2rem]">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Declined Requests</p>
            <p className="text-2xl sm:text-3xl font-black text-destructive tracking-tighter">{stats.rejected}</p>
        </Card>
      </div>

      {/* History Table */}
      <Card className="bg-card border border-border shadow-xl overflow-hidden rounded-3xl">
        <div className="p-6 border-b border-border bg-muted/20 flex items-center justify-between">
            <h3 className="font-black text-foreground uppercase tracking-widest text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Application History
            </h3>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 text-center animate-pulse flex flex-col items-center gap-3">
               <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
               <p className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">Retrieving Records...</p>
            </div>
          ) : leaves.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center gap-4 bg-muted/5">
               <FileText className="w-12 h-12 text-muted-foreground/10" />
               <p className="text-sm font-bold text-muted-foreground/40 uppercase tracking-widest">No leave requests found for this period.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-muted-foreground tracking-widest">Leave Type</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-muted-foreground tracking-widest">Timeline</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-muted-foreground tracking-widest">Statement of Fact</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-muted-foreground tracking-widest">Approval Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap group">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Info className="text-primary w-4 h-4" />
                         </div>
                         <span className="text-sm font-black text-foreground capitalize group-hover:text-primary transition-colors">{leave.leaveType}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">{leave.startDate}</span>
                          <span className="text-[10px] font-bold text-muted-foreground pr-2 italic">until {leave.endDate}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <p className="text-xs text-muted-foreground font-medium line-clamp-1 max-w-[200px]" title={leave.reason}>
                         {leave.reason}
                       </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                          leave.status === 'approved' ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 shadow-sm border border-green-200 dark:border-green-800" :
                          leave.status === 'pending' ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 shadow-sm border border-orange-200 dark:border-orange-800" :
                          "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 shadow-sm border border-red-200 dark:border-red-800"
                        )}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full", leave.status === 'approved' ? "bg-green-500" : leave.status === 'pending' ? "bg-orange-500 animate-pulse" : "bg-red-500")} />
                        {leave.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Leave Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg bg-card shadow-2xl rounded-3xl overflow-hidden border-border transition-all animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                   <Calendar className="text-primary w-5 h-5" />
                </div>
                <h2 className="text-xl font-black text-foreground tracking-tight">Request Time Off</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmitLeaveRequest} className="p-8 space-y-6">
              {formError && (
                <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-bold border border-destructive/20 flex items-center gap-3">
                  <AlertCircle size={18} />
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Type of Absence</label>
                    <div className="relative">
                      <select
                        value={formData.leaveType}
                        onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                        className="w-full px-4 h-12 border border-border rounded-xl bg-background text-foreground font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                      >
                        <option value="casual">Casual Leave</option>
                        <option value="sick">Sick / Medical Leave</option>
                        <option value="personal">Personal / Vacation</option>
                        <option value="emergency">Family Emergency</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                         <Info size={16} />
                      </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Effective From</label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="h-12 rounded-xl focus:ring-primary/20 border-border font-medium"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">End Date</label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="h-12 rounded-xl focus:ring-primary/20 border-border font-medium"
                    />
                </div>

                <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Justification / Remarks</label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="Please provide a brief context for your request..."
                      className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[120px] transition-all font-medium"
                    />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl font-bold text-muted-foreground"
                  disabled={isSubmitting}
                >
                  Withdraw
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12 rounded-xl font-black bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
