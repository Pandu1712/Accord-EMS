'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { db } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { 
  FileText, 
  Download, 
  BarChart3, 
  Users, 
  Clock, 
  Table as TableIcon,
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ReportsPage() {
  const { role, isSuperAdmin } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    onLeaveToday: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (role !== 'admin' && !isSuperAdmin) {
      router.push('/dashboard')
    }
  }, [role, isSuperAdmin, router])

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true)
        
        const employeesRef = collection(db, 'employees')
        const employeesSnapshot = await getDocs(employeesRef)
        
        const today = new Date().toISOString().split('T')[0]
        const attendanceRef = collection(db, 'attendance')
        const attendanceSnapshot = await getDocs(attendanceRef)
        
        const todayAttendance = attendanceSnapshot.docs.filter(
          doc => doc.data().date === today
        )
        
        const presentCount = todayAttendance.filter(
          doc => doc.data().status === 'present' || doc.data().status === 'on-break'
        ).length
        const absentCount = todayAttendance.filter(
          doc => doc.data().status === 'absent'
        ).length
        const leaveCount = todayAttendance.filter(
          doc => doc.data().status === 'leave'
        ).length
        
        setStats({
          totalEmployees: employeesSnapshot.size,
          presentToday: presentCount,
          absentToday: absentCount,
          onLeaveToday: leaveCount,
        })
      } catch (error) {
        console.error('Error loading stats:', error)
      } finally {
        setLoading(false)
      }
    }

    if (role === 'admin' || isSuperAdmin) {
      loadStats()
    }
  }, [role, isSuperAdmin])

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return ''
    const headers = Object.keys(data[0]).join(',')
    const rows = data.map(obj => 
      Object.values(obj).map(val => `"${val}"`).join(',')
    ).join('\n')
    return `${headers}\n${rows}`
  }

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportAttendance = async () => {
    try {
      const attendanceRef = collection(db, 'attendance')
      const snapshot = await getDocs(attendanceRef)
      const data = snapshot.docs.map(doc => ({
        EmployeeID: doc.data().employeeId || '',
        Date: doc.data().date || '',
        CheckIn: doc.data().checkInTime || '',
        CheckOut: doc.data().checkOutTime || '',
        Breaks: (doc.data().totalBreakMs ? Math.floor(doc.data().totalBreakMs / 60000) : 0) + ' mins',
        WorkingHours: doc.data().workingHours || '',
        Status: doc.data().status || ''
      }))
      const csv = convertToCSV(data)
      downloadCSV(csv, `attendance_report_${new Date().toISOString().split('T')[0]}.csv`)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const exportEmployees = async () => {
    try {
      const employeesRef = collection(db, 'employees')
      const snapshot = await getDocs(employeesRef)
      const data = snapshot.docs.map(doc => {
        const d = doc.data()
        return {
          Name: d.fullName || '',
          Email: d.email || '',
          EmployeeID: d.employeeNo || '',
          Department: d.department || '',
          Designation: d.designation || '',
          JoinDate: d.dateOfJoining || '',
          Status: d.status || 'Active'
        }
      })
      const csv = convertToCSV(data)
      downloadCSV(csv, `employee_directory_${new Date().toISOString().split('T')[0]}.csv`)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  if (role !== 'admin' && !isSuperAdmin) {
    return null
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">Intelligence & Reports</h1>
          <p className="text-muted-foreground mt-2 text-lg font-medium">Export organizational data and track operational metrics</p>
        </div>
        <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-2xl border border-border">
          <Button
            variant="ghost"
            className="rounded-xl px-4 py-2 font-bold text-xs uppercase"
            onClick={() => window.print()}
          >
            <Download size={16} className="mr-2" />
            Print Portal
          </Button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-card border border-border shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Users size={80} />
          </div>
          <div className="relative z-10 space-y-2">
            <div className="p-2 bg-primary/10 rounded-lg w-fit">
              <Users className="text-primary" size={20} />
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Workforce Size</p>
            <p className="text-3xl font-black text-foreground tracking-tighter">{stats.totalEmployees}</p>
          </div>
        </Card>

        <Card className="p-6 bg-card border border-border shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShieldCheck size={80} />
          </div>
          <div className="relative z-10 space-y-2">
            <div className="p-2 bg-green-500/10 rounded-lg w-fit">
              <ShieldCheck className="text-green-600" size={20} />
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Attendance Rate</p>
            <p className="text-3xl font-black text-green-600 tracking-tighter">
                {stats.totalEmployees > 0 ? Math.round((stats.presentToday / stats.totalEmployees) * 100) : 0}%
            </p>
          </div>
        </Card>

        <Card className="p-6 bg-card border border-border shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Clock size={80} />
          </div>
          <div className="relative z-10 space-y-2">
            <div className="p-2 bg-orange-500/10 rounded-lg w-fit">
              <Clock className="text-orange-600" size={20} />
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Present Today</p>
            <p className="text-3xl font-black text-orange-600 tracking-tighter">{stats.presentToday}</p>
          </div>
        </Card>

        <Card className="p-6 bg-card border border-border shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp size={80} />
          </div>
          <div className="relative z-10 space-y-2">
            <div className="p-2 bg-blue-500/10 rounded-lg w-fit">
              <TrendingUp className="text-blue-600" size={20} />
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Avg Work Hours</p>
            <p className="text-3xl font-black text-blue-600 tracking-tighter">8.2h</p>
          </div>
        </Card>
      </div>

      {/* Report Generator Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-3 px-2">
          <FileText className="text-primary w-5 h-5" />
          Master Data Export
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Attendance Report */}
          <Card className="p-8 bg-card border border-border shadow-lg hover:border-primary/30 transition-all rounded-3xl group">
            <div className="flex flex-col h-full space-y-6">
              <div className="flex items-center justify-between">
                <div className="p-4 bg-primary/10 rounded-2xl group-hover:bg-primary group-hover:text-white transition-colors">
                  <Clock size={32} />
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Last Updated</p>
                    <p className="text-xs font-bold text-foreground">Real-time sync</p>
                </div>
              </div>
              
              <div className="flex-1">
                <h3 className="text-2xl font-black text-foreground mb-2 group-hover:text-primary transition-colors tracking-tight">Attendance Ledger</h3>
                <p className="text-muted-foreground font-medium leading-relaxed">
                  Comprehensive log of all check-ins, check-outs, break durations and computed working hours for the entire workforce.
                </p>
              </div>

              <div className="flex gap-3">
                 <Button onClick={exportAttendance} className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                    Generate CSV
                 </Button>
                 <Button variant="outline" className="px-4 h-12 rounded-xl border-border hover:bg-muted font-bold">
                    <TableIcon size={20} />
                 </Button>
              </div>
            </div>
          </Card>

          {/* Employee Directory */}
          <Card className="p-8 bg-card border border-border shadow-lg hover:border-primary/30 transition-all rounded-3xl group">
            <div className="flex flex-col h-full space-y-6">
              <div className="flex items-center justify-between">
                <div className="p-4 bg-primary/10 rounded-2xl group-hover:bg-primary group-hover:text-white transition-colors">
                  <Users size={32} />
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Database</p>
                    <p className="text-xs font-bold text-foreground">Cloud Active</p>
                </div>
              </div>
              
              <div className="flex-1">
                <h3 className="text-2xl font-black text-foreground mb-2 group-hover:text-primary transition-colors tracking-tight">Master Directory</h3>
                <p className="text-muted-foreground font-medium leading-relaxed">
                  Export complete profile details including departments, designations, joining dates, and contact information.
                </p>
              </div>

              <div className="flex gap-3">
                 <Button onClick={exportEmployees} className="flex-1 h-12 rounded-xl bg-foreground text-background font-black uppercase text-xs tracking-widest shadow-lg shadow-foreground/10 hover:scale-[1.02] active:scale-[0.98] transition-all">
                    Export to Excel
                 </Button>
                 <Button variant="outline" className="px-4 h-12 rounded-xl border-border hover:bg-muted font-bold">
                    <FileSpreadsheet size={20} />
                 </Button>
              </div>
            </div>
          </Card>

          {/* Leave Analytics */}
          <Card className="p-8 bg-card border border-border shadow-lg hover:shadow-xl transition-all rounded-3xl group md:col-span-2">
            <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="p-6 bg-muted/50 rounded-3xl border border-border group-hover:border-primary/20 transition-all">
                    <BarChart3 className="w-16 h-16 text-primary opacity-40" />
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h3 className="text-xl font-black text-foreground tracking-tight">Leave Usage Dashboard</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xl font-medium">
                        Analyze leave patterns across departments, track balance availability, and identify workforce trends. Comprehensive PDF analysis coming soon.
                    </p>
                </div>
                <Button variant="outline" size="lg" className="rounded-2xl px-8 font-black uppercase text-xs tracking-widest border-primary/20 text-primary hover:bg-primary/5">
                    Launch Analytics
                </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
