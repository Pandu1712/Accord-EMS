'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, updateDoc, doc, orderBy, setDoc, getDoc } from 'firebase/firestore'
import { Search, Check, X, Calendar, User, FileText, AlertCircle, Filter, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  appliedOn: string
}

export default function LeavesPage() {
  const { role, isSuperAdmin, uid } = useAuth()
  const router = useRouter()
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [allEmployees, setAllEmployees] = useState<any[]>([])
  const [formData, setFormData] = useState({
    employeeId: '',
    leaveType: 'al',
    startDate: '',
    endDate: '',
    reason: '',
  })

  useEffect(() => {
    if (role !== 'admin' && !isSuperAdmin && role !== 'team-lead') {
      router.push('/dashboard')
    }
  }, [role, isSuperAdmin, router])

  useEffect(() => {
    const loadLeaves = async () => {
      try {
        setLoading(true)
        const leavesRef = collection(db, 'leaves')
        const q = query(leavesRef, orderBy('appliedOn', 'desc'))
        const snapshot = await getDocs(q)
        
        let leavesData: LeaveRequest[] = snapshot.docs.map(doc => ({
          id: doc.id,
          employeeId: doc.data().employeeId,
          employeeName: doc.data().employeeName,
          leaveType: doc.data().leaveType,
          startDate: doc.data().startDate,
          endDate: doc.data().endDate,
          reason: doc.data().reason,
          status: doc.data().status || 'pending',
          appliedOn: doc.data().appliedOn,
        }))
        
        // Filter for Team Lead if necessary
        if (role === 'team-lead') {
          // We need to know which employees report to this Team Lead
          const empRef = collection(db, 'employees')
          const empSnap = await getDocs(query(empRef, where('teamLeadId', '==', uid)))
          const teamMemberIds = empSnap.docs.map(d => d.id)
          leavesData = leavesData.filter(l => teamMemberIds.includes(l.employeeId))
        }

        setLeaves(leavesData)
      } catch (error) {
        console.error('Error loading leaves:', error)
      } finally {
        setLoading(false)
      }
    }

    if (role === 'admin' || isSuperAdmin || role === 'team-lead') {
      loadLeaves()
      fetchEmployees()
    }
  }, [role, isSuperAdmin, uid])

  const fetchEmployees = async () => {
    try {
      let q = query(collection(db, 'employees'))
      if (role === 'team-lead') {
        q = query(collection(db, 'employees'), where('teamLeadId', '==', uid))
      }
      const snap = await getDocs(q)
      setAllEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) {
      console.error('Error fetching employees:', e)
    }
  }

  const calculateDays = (start: string, end: string) => {
    const s = new Date(start)
    const e = new Date(end)
    const diffTime = Math.abs(e.getTime() - s.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  const updateBalances = async (employeeId: string, leaveType: string, days: number) => {
    try {
      const empRef = doc(db, 'employees', employeeId)
      const empSnap = await getDoc(empRef)
      if (empSnap.exists()) {
        const data = empSnap.data()
        const currentBalances = data.leaveBalances || { al: 12, ml: 10, compOff: 0 }
        
        // Map UI leave type to schema keys
        let key = 'al'
        if (leaveType.toLowerCase().includes('medical') || leaveType.toLowerCase().includes('sick')) key = 'ml'
        if (leaveType.toLowerCase().includes('comp')) key = 'compOff'
        if (leaveType === 'al' || leaveType === 'ml' || leaveType === 'compOff') key = leaveType

        const newBalances = {
          ...currentBalances,
          [key]: Math.max(0, (currentBalances[key] || 0) - days)
        }
        
        await updateDoc(empRef, { leaveBalances: newBalances })
      }
    } catch (e) {
      console.error('Error updating balances:', e)
    }
  }

  const handleApprove = async (leaveId: string) => {
    try {
      const leave = leaves.find(l => l.id === leaveId)
      if (!leave) return

      await updateDoc(doc(db, 'leaves', leaveId), {
        status: 'approved',
        updatedAt: new Date().toISOString(),
      })

      const days = calculateDays(leave.startDate, leave.endDate)
      await updateBalances(leave.employeeId, leave.leaveType, days)

      setLeaves(leaves.map(l => l.id === leaveId ? { ...l, status: 'approved' } : l))
    } catch (error) {
      console.error('Error approving leave:', error)
      alert('Failed to approve leave')
    }
  }

  const handleReject = async (leaveId: string) => {
    try {
      await updateDoc(doc(db, 'leaves', leaveId), {
        status: 'rejected',
        updatedAt: new Date().toISOString(),
      })
      setLeaves(leaves.map(l => l.id === leaveId ? { ...l, status: 'rejected' } : l))
    } catch (error) {
      console.error('Error rejecting leave:', error)
      alert('Failed to reject leave')
    }
  }

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.employeeId || !formData.startDate || !formData.endDate || !formData.reason) {
      alert('Please fill all fields')
      return
    }

    try {
      setIsSubmitting(true)
      const emp = allEmployees.find(e => e.id === formData.employeeId)
      if (!emp) return

      const leavesRef = collection(db, 'leaves')
      const newLeaveId = doc(leavesRef).id
      
      const newRequest = {
        employeeId: emp.id,
        employeeName: emp.name,
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        status: 'approved',
        appliedOn: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await setDoc(doc(db, 'leaves', newLeaveId), newRequest)
      
      const days = calculateDays(formData.startDate, formData.endDate)
      await updateBalances(emp.id, formData.leaveType, days)

      setLeaves([{ id: newLeaveId, ...newRequest } as LeaveRequest, ...leaves])
      setIsModalOpen(false)
      setFormData({ employeeId: '', leaveType: 'al', startDate: '', endDate: '', reason: '' })
    } catch (e) {
      console.error('Error creating leave:', e)
      alert('Failed to create leave')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredLeaves = leaves.filter(leave => {
    const matchesSearch = leave.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || leave.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const stats = {
    pending: leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => l.status === 'rejected').length,
  }

  if (role !== 'admin' && !isSuperAdmin && role !== 'team-lead') {
    return null
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground mt-2 text-lg font-medium">Review and process workforce absence requests</p>
        </div>
        {(role === 'admin' || isSuperAdmin) && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-2xl shadow-lg shadow-primary/20"
          >
            <Plus size={20} />
            Create Record
          </Button>
        )}
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <AlertCircle size={64} />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-1">Pending Approval</p>
            <p className="text-4xl font-black text-orange-700 dark:text-orange-300 tracking-tighter">{stats.pending}</p>
          </div>
        </Card>
        
        <Card className="p-6 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Check size={64} />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-black text-green-600 dark:text-green-400 uppercase tracking-widest mb-1">Approved This Month</p>
            <p className="text-4xl font-black text-green-700 dark:text-green-300 tracking-tighter">{stats.approved}</p>
          </div>
        </Card>

        <Card className="p-6 bg-muted/30 border-border shadow-sm flex flex-col justify-center">
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Total Requests</p>
            <p className="text-3xl font-black text-foreground tracking-tighter">{leaves.length}</p>
        </Card>
      </div>

      {/* Control Bar */}
      <Card className="p-4 bg-card border border-border shadow-md rounded-2xl">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Search Employee</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Name, ID or Department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 rounded-xl border-border focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="w-full md:w-64 space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Filter by Status</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full pl-10 pr-4 h-11 border border-border rounded-xl bg-background text-foreground font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
              >
                <option value="all">All Request Status</option>
                <option value="pending">🟡 Pending Only</option>
                <option value="approved">🟢 Approved Items</option>
                <option value="rejected">🔴 Rejected Items</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Content Table */}
      <Card className="bg-card border border-border shadow-xl overflow-hidden rounded-3xl">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 text-center animate-pulse flex flex-col items-center gap-4">
               <Calendar className="w-12 h-12 text-muted-foreground/20" />
               <p className="font-bold text-muted-foreground tracking-widest uppercase text-xs">Synchronizing Records...</p>
            </div>
          ) : filteredLeaves.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
               <FileText className="w-12 h-12 text-muted-foreground/10" />
               <p className="font-bold text-muted-foreground/40 tracking-widest uppercase text-xs">No records matching your criteria.</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-6 py-5 text-left text-[10px] font-black uppercase text-muted-foreground tracking-widest">Employee Profile</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black uppercase text-muted-foreground tracking-widest">Leave Details</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black uppercase text-muted-foreground tracking-widest">Duration & Dates</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black uppercase text-muted-foreground tracking-widest">Current Status</th>
                  <th className="px-6 py-5 text-right text-[10px] font-black uppercase text-muted-foreground tracking-widest">Action Center</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLeaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-muted/20 transition-all group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                          <User className="text-primary w-5 h-5" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-black text-foreground leading-none">{leave.employeeName}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">ID: {leave.employeeId.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <span className="px-2.5 py-1 bg-primary/5 text-primary border border-primary/10 text-[10px] font-black uppercase rounded-lg">
                          {leave.leaveType}
                        </span>
                        <p className="text-xs text-muted-foreground font-medium line-clamp-1 max-w-[200px]" title={leave.reason}>
                          {leave.reason}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                       <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">{leave.startDate}</span>
                          <span className="text-[10px] font-bold text-muted-foreground">to {leave.endDate}</span>
                       </div>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                          leave.status === 'approved' ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" :
                          leave.status === 'pending' ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" :
                          "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                        )}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full shadow-sm", 
                          leave.status === 'approved' ? "bg-green-500" :
                          leave.status === 'pending' ? "bg-orange-500 animate-pulse" :
                          "bg-red-500"
                        )} />
                        {leave.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {leave.status === 'pending' ? (
                        <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            onClick={() => handleApprove(leave.id)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl px-4 h-9 shadow-md shadow-green-100 dark:shadow-none"
                          >
                            <Check size={16} className="mr-2" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleReject(leave.id)}
                            size="sm"
                            variant="destructive"
                            className="font-bold rounded-xl px-4 h-9 shadow-md shadow-red-100 dark:shadow-none"
                          >
                            <X size={16} className="mr-2" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pr-4">Processed</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="p-6 border-t border-border bg-muted/20">
            <p className="text-xs text-muted-foreground font-medium italic">Showing {filteredLeaves.length} leave requests from the current fiscal period.</p>
        </div>
      </Card>

      {/* Manual Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg bg-card shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border bg-muted/20 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Manual Leave Entry</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleManualCreate} className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Employee</label>
                <select
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select Employee...</option>
                  {allEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Leave Type</label>
                <select
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                  className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="al">Annual Leave (AL)</option>
                  <option value="ml">Medical Leave (ML)</option>
                  <option value="compOff">Comp Off</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Start Date</label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">End Date</label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full p-4 bg-background border border-border rounded-xl text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Reason for manual entry..."
                />
              </div>
              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 rounded-xl">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 h-12 rounded-xl font-bold bg-primary text-primary-foreground">
                  {isSubmitting ? 'Creating...' : 'Create Record'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
