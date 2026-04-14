'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, setDoc, doc, updateDoc, getDoc } from 'firebase/firestore'
import { Clock, LogIn, LogOut, Calendar, Coffee, FileEdit, ChevronLeft, ChevronRight, Search, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import dynamic from 'next/dynamic'

const ExportPDFButton = dynamic(() => import('@/components/ExportPDFButton'), { ssr: false })

interface AttendanceRecord {
  id: string
  date: string
  checkInTime: string | null
  checkOutTime: string | null
  breakInTime: string | null
  breakOutTime: string | null
  totalBreakMs: number
  status: 'present' | 'absent' | 'on-break'
  workingHours: string | null
}

export default function MyAttendancePage() {
  const { user, uid, role } = useAuth()
  const router = useRouter()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [leaveBalances, setLeaveBalances] = useState({ al: 0, ml: 0, compOff: 0 })
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Digital Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const validRoles = ['employee', 'team-lead', 'admin', 'super-admin']
    if (!validRoles.includes(role || '')) {
      router.push('/dashboard')
    }
  }, [role, router])

  useEffect(() => {
    const loadAttendance = async () => {
      try {
        setLoading(true)
        if (!uid) return

        // Load Leave Balances
        const empSnap = await getDoc(doc(db, 'employees', uid))
        if (empSnap.exists()) {
          setLeaveBalances(empSnap.data().leaveBalances || { al: 12, ml: 10, compOff: 0 })
        }

        const attendanceRef = collection(db, 'attendance')
        const q = query(attendanceRef, where('employeeId', '==', uid))
        const snapshot = await getDocs(q)
        
        const recordsData: AttendanceRecord[] = snapshot.docs.map(doc => ({
          id: doc.id,
          date: doc.data().date,
          checkInTime: doc.data().checkInTime,
          checkOutTime: doc.data().checkOutTime,
          breakInTime: doc.data().breakInTime,
          breakOutTime: doc.data().breakOutTime,
          totalBreakMs: doc.data().totalBreakMs || 0,
          status: doc.data().status,
          workingHours: doc.data().workingHours,
        })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        
        setRecords(recordsData)
        
        const today = new Date().toISOString().split('T')[0]
        const today_record = recordsData.find(r => r.date === today)
        setTodayRecord(today_record || null)
        
      } catch (error) {
        console.error('Error loading attendance:', error)
      } finally {
        setLoading(false)
      }
    }

    if (uid) {
      loadAttendance()
    }
  }, [uid])

  const handleAction = async (action: 'check-in' | 'break-in' | 'break-out' | 'check-out') => {
    try {
      setIsProcessing(true)
      if (!uid) return
      const today = new Date().toISOString().split('T')[0]
      const now = new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      })

      const attendanceRef = doc(db, 'attendance', todayRecord?.id || today + '-' + uid)

      if (action === 'check-in') {
        const empSnap = await getDoc(doc(db, 'employees', uid))
        const empName = empSnap.exists() ? empSnap.data().name : (user?.email || 'System Admin')
        
        const payload = {
          employeeId: uid,
          employeeName: empName,
          date: today,
          checkInTime: now,
          checkOutTime: null,
          breakInTime: null,
          breakOutTime: null,
          totalBreakMs: 0,
          status: 'present',
          workingHours: null,
        }
        await setDoc(attendanceRef, payload)
      } else if (action === 'break-in') {
        await updateDoc(attendanceRef, { breakInTime: now, status: 'on-break' })
      } else if (action === 'break-out' && todayRecord?.breakInTime) {
        const breakIn = new Date(`2000-01-01 ${todayRecord.breakInTime}`)
        const breakOut = new Date(`2000-01-01 ${now}`)
        const breakMs = breakOut.getTime() - breakIn.getTime()
        const totalBreakMs = (todayRecord.totalBreakMs || 0) + breakMs
        await updateDoc(attendanceRef, { breakInTime: null, totalBreakMs, status: 'present' })
      } else if (action === 'check-out' && todayRecord?.checkInTime) {
        const checkIn = new Date(`2000-01-01 ${todayRecord.checkInTime}`)
        const checkOut = new Date(`2000-01-01 ${now}`)
        let durationMs = checkOut.getTime() - checkIn.getTime()
        durationMs = durationMs - (todayRecord.totalBreakMs || 0)
        const diffHours = (Math.max(0, durationMs) / (1000 * 60 * 60)).toFixed(2)
        await updateDoc(attendanceRef, { checkOutTime: now, workingHours: `${diffHours}h`, status: 'present' })
      }

      window.location.reload()
    } catch (e) {
      console.error('Action failed:', e)
      alert('Operation failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const filteredRecords = records.filter(r => {
    const d = new Date(r.date)
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
  })

  // Leave Data for Recharts
  const leaveData = [
    { name: 'AL', value: leaveBalances.al, color: '#3b82f6', total: 12 },
    { name: 'ML', value: leaveBalances.ml, color: '#10b981', total: 10 },
    { name: 'COMP', value: leaveBalances.compOff, color: '#f59e0b', total: 5 },
  ]

  const formatMsToTime = (ms: number) => {
    if (!ms) return '0m'
    const totalMinutes = Math.floor(ms / (1000 * 60))
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  const exportParams = {
    data: filteredRecords,
    title: `Personal Attendance Report - ${selectedYear}-${selectedMonth + 1}`,
    filename: `my_attendance_${selectedYear}_${selectedMonth + 1}.pdf`
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section with Digital Clock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-8 bg-black border-zinc-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
            <Clock size={200} />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-zinc-400 font-black uppercase tracking-widest text-[10px] sm:text-xs mb-2">Current System Time</h1>
                <div className="text-5xl sm:text-6xl md:text-8xl font-black text-white tracking-tighter">
                  {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  <span className="text-2xl sm:text-3xl text-zinc-600 ml-2">:{currentTime.toLocaleTimeString('en-IN', { second: '2-digit' })}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-primary font-black text-sm uppercase">{currentTime.toLocaleDateString('en-IN', { weekday: 'long' })}</p>
                <p className="text-zinc-500 font-bold">{currentTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>

            <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row flex-wrap gap-4">
              {!todayRecord?.checkInTime ? (
                <Button 
                  onClick={() => handleAction('check-in')} 
                  disabled={isProcessing}
                  className="h-14 sm:h-16 px-6 sm:px-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-black text-base sm:text-lg gap-3 shadow-xl shadow-primary/20 w-full sm:w-auto"
                >
                  <LogIn size={24} />
                  Start Your Day
                </Button>
              ) : todayRecord.checkOutTime ? (
                <div className="h-14 sm:h-16 flex items-center px-6 sm:px-8 bg-zinc-800 text-zinc-400 rounded-2xl font-black text-base sm:text-lg gap-3 border border-zinc-700 w-full sm:w-auto">
                  <CheckCircle2 className="text-green-500" />
                  Day Completed
                </div>
              ) : (
                <>
                  {todayRecord.status === 'on-break' ? (
                    <Button 
                      onClick={() => handleAction('break-out')} 
                      disabled={isProcessing}
                      className="h-14 sm:h-16 px-6 sm:px-8 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-base sm:text-lg gap-3 shadow-xl shadow-orange-500/20 w-full sm:w-auto"
                    >
                      <Coffee size={24} />
                      End Break
                    </Button>
                  ) : (
                    <>
                      <Button 
                        onClick={() => handleAction('break-in')} 
                        disabled={isProcessing}
                        variant="outline"
                        className="h-14 sm:h-16 px-6 sm:px-8 border-orange-500 text-orange-500 hover:bg-orange-500/10 rounded-2xl font-black text-base sm:text-lg gap-3 w-full sm:w-auto"
                      >
                        <Coffee size={24} />
                        Coffee Break
                      </Button>
                      <Button 
                        onClick={() => handleAction('check-out')} 
                        disabled={isProcessing}
                        className="h-14 sm:h-16 px-6 sm:px-8 bg-destructive hover:bg-destructive/90 text-white rounded-2xl font-black text-base sm:text-lg gap-3 shadow-xl shadow-destructive/20 w-full sm:w-auto"
                      >
                        <LogOut size={24} />
                        End Your Day
                      </Button>
                    </>
                  )}
                </>
              )}
              <Button 
                variant="outline" 
                onClick={() => router.push('/dashboard/leaves')}
                className="h-14 sm:h-16 px-6 sm:px-8 border-zinc-700 text-zinc-400 hover:bg-zinc-800 rounded-2xl font-black text-base sm:text-lg gap-3 w-full sm:w-auto"
              >
                <Calendar size={24} />
                Mark Leave
              </Button>
            </div>
          </div>
        </Card>

        {/* Leave Balances Donut Charts */}
        <Card className="p-6 bg-card border border-border flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest mb-4">Leave Entitlements</h3>
          <div className="grid grid-cols-1 gap-4 flex-1">
            {leaveData.map((leave) => (
              <div key={leave.name} className="flex items-center gap-4 p-3 bg-muted/30 rounded-xl border border-border/50">
                <div className="w-16 h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { value: leave.value },
                          { value: Math.max(0, leave.total - leave.value) }
                        ]}
                        innerRadius={22}
                        outerRadius={30}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill={leave.color} />
                        <Cell fill="rgba(0,0,0,0.1)" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground">{leave.name} Balance</p>
                  <p className="text-xl font-black leading-none mt-1">{leave.value}<span className="text-[10px] text-muted-foreground ml-1">Days Remaining</span></p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <LogIn className="text-blue-500" />, label: 'Punch In', value: todayRecord?.checkInTime || '--:--' },
          { icon: <LogOut className="text-red-500" />, label: 'Punch Out', value: todayRecord?.checkOutTime || '--:--' },
          { icon: <Coffee className="text-orange-500" />, label: 'Break Total', value: formatMsToTime(todayRecord?.totalBreakMs || 0) },
          { icon: <Clock className="text-primary" />, label: 'Total Hours', value: todayRecord?.workingHours || '0.00h' },
        ].map((item, idx) => (
          <Card key={idx} className="p-4 flex items-center gap-4 bg-card border border-border shadow-sm">
            <div className="p-2 bg-muted rounded-lg">{item.icon}</div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">{item.label}</p>
              <p className="text-lg font-black">{item.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Attendance History Section */}
      <Card className="bg-card border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden rounded-3xl">
        <div className="p-8 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Attendance Ledger</h2>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">Monthly performance and logs</p>
          </div>
          
          <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4 xl:gap-3">
            <ExportPDFButton 
               data={exportParams.data}
               title={exportParams.title}
               filename={exportParams.filename}
               headers={['Date', 'Punch In', 'Punch Out', 'Break Time', 'Work Hours', 'Status']}
               formatRow={(r: AttendanceRecord) => [
                 new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                 r.checkInTime || '-', r.checkOutTime || '-', formatMsToTime(r.totalBreakMs || 0), r.workingHours || '-', r.status
               ]}
               className="bg-primary hover:bg-primary/90 text-white gap-2 text-[10px] font-black uppercase tracking-widest h-10 px-4 rounded-xl shadow-lg shadow-primary/20 w-full xl:w-auto"
               buttonText="Export Report"
               iconSize={14}
            />
            <div className="flex flex-wrap p-1 bg-muted rounded-xl border border-border">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((name, idx) => (
                <button
                  key={name}
                  onClick={() => setSelectedMonth(idx)}
                  className={cn(
                    "px-2 sm:px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all",
                    selectedMonth === idx ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="h-10 w-full sm:w-auto px-4 bg-muted border border-border rounded-xl text-xs font-black uppercase outline-none"
            >
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-zinc-500 tracking-widest">Date</th>
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-zinc-500 tracking-widest">Shift Timing</th>
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-zinc-500 tracking-widest">Total Break</th>
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-zinc-500 tracking-widest">Working Hours</th>
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-zinc-500 tracking-widest">Status</th>
                <th className="px-8 py-5 text-right text-[10px] font-black uppercase text-zinc-500 tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-muted-foreground font-black uppercase text-xs tracking-widest opacity-20">
                    No records found for this period
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="group hover:bg-muted/20 transition-all">
                    <td className="px-8 py-5">
                      <p className="text-sm font-black text-foreground">
                        {new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">
                        {new Date(record.date).toLocaleDateString('en-GB', { weekday: 'long' })}
                      </p>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4 text-xs font-bold text-zinc-600">
                        <span className="flex items-center gap-1.5"><LogIn size={14} className="text-blue-500" /> {record.checkInTime || '--:--'}</span>
                        <ChevronRight size={14} className="text-zinc-300" />
                        <span className="flex items-center gap-1.5"><LogOut size={14} className="text-red-500" /> {record.checkOutTime || '--:--'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-xs font-black text-orange-500">{formatMsToTime(record.totalBreakMs)}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-black text-primary">{record.workingHours || '0.0h'}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        record.status === 'present' ? "bg-green-100 text-green-700 dark:bg-green-900/30" : "bg-zinc-100 text-zinc-500"
                      )}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => router.push(`/dashboard/regularization?date=${record.date}`)}
                        className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <FileEdit size={14} className="mr-2" /> Regularize
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function CheckCircle2({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"/><path d="m9 12 2 2 4-4"/>
    </svg>
  )
}
