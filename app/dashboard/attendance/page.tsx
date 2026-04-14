'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { Search, Download, Calendar, CheckCircle, XCircle, Clock, Coffee, User, Users, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

const ExportPDFButton = dynamic(() => import('@/components/ExportPDFButton'), { ssr: false })

interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  date: string
  checkInTime: string
  checkOutTime: string
  totalBreakMs: number
  status: 'present' | 'absent' | 'leave' | 'on-break'
  workingHours: string
}

interface Employee {
  id: string
  name: string
  employeeNo: string
  mobile: string
  designation: string
}

export default function AttendancePage() {
  const { role, isSuperAdmin, uid } = useAuth()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'employee'>('daily')
  
  // Daily Ledger State
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  
  // Monthly / Employee History State
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [monthlyRecords, setMonthlyRecords] = useState<AttendanceRecord[]>([])

  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [employeeRecords, setEmployeeRecords] = useState<AttendanceRecord[]>([])

  // Custom Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('')

  useEffect(() => {
    if (role !== 'admin' && !isSuperAdmin && role !== 'team-lead') {
      router.push('/dashboard')
    }
  }, [role, isSuperAdmin, router])

  // Fetch all employees for the dropdown
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const empRef = collection(db, 'employees')
        let q = query(empRef)
        if (role === 'team-lead') {
          q = query(empRef, where('teamLeadId', '==', uid))
        }
        
        const snap = await getDocs(q)
        const emps = snap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || 'Unknown',
          employeeNo: doc.data().employeeNo || 'No ID',
          mobile: doc.data().mobile || 'No Mobile',
          designation: doc.data().designation || 'Staff'
        }))
        setEmployees(emps)
        if (emps.length > 0) {
          setSelectedEmployeeId(emps[0].id)
        }
      } catch (error) {
        console.error('Error loading employees:', error)
      }
    }
    if (role === 'admin' || isSuperAdmin || role === 'team-lead') {
      loadEmployees()
    }
  }, [role, isSuperAdmin, uid])

  // Daily Ledger Data
  useEffect(() => {
    const loadDailyAttendance = async () => {
      if (activeTab !== 'daily') return
      try {
        setLoading(true)
        const attendanceRef = collection(db, 'attendance')
        const q = query(attendanceRef, where('date', '==', selectedDate))
        const snapshot = await getDocs(q)
        
        let recordsData: AttendanceRecord[] = snapshot.docs.map(doc => ({
          id: doc.id,
          employeeId: doc.data().employeeId,
          employeeName: doc.data().employeeName || 'Unknown Employee',
          date: doc.data().date,
          checkInTime: doc.data().checkInTime || '-',
          checkOutTime: doc.data().checkOutTime || '-',
          totalBreakMs: doc.data().totalBreakMs || 0,
          status: doc.data().status || 'absent',
          workingHours: doc.data().workingHours || '0h',
        }))

        // Filter for Team Lead if necessary
        if (role === 'team-lead') {
          const teamMemberIds = employees.map(e => e.id)
          recordsData = recordsData.filter(r => teamMemberIds.includes(r.employeeId))
        }
        
        setRecords(recordsData)
      } catch (error) {
        console.error('Error loading attendance:', error)
      } finally {
        setLoading(false)
      }
    }

    if (role === 'admin' || isSuperAdmin || role === 'team-lead') {
      loadDailyAttendance()
    }
  }, [role, isSuperAdmin, selectedDate, activeTab, employees, uid])

  // Monthly Ledger Data
  useEffect(() => {
    const loadMonthlyAttendance = async () => {
      if (activeTab !== 'monthly') return
      try {
        setLoading(true)
        const monthStr = String(selectedMonth + 1).padStart(2, '0')
        const startDate = `${selectedYear}-${monthStr}-01`
        const endDate = `${selectedYear}-${monthStr}-31`
        
        const attendanceRef = collection(db, 'attendance')
        let q = query(
          attendanceRef, 
          where('date', '>=', startDate),
          where('date', '<=', endDate)
        )
        const snapshot = await getDocs(q)
        
        let recordsData: AttendanceRecord[] = snapshot.docs.map(doc => ({
          id: doc.id,
          employeeId: doc.data().employeeId,
          employeeName: doc.data().employeeName || 'Unknown Employee',
          date: doc.data().date,
          checkInTime: doc.data().checkInTime || '-',
          checkOutTime: doc.data().checkOutTime || '-',
          totalBreakMs: doc.data().totalBreakMs || 0,
          status: doc.data().status || 'absent',
          workingHours: doc.data().workingHours || '0h',
        }))

        // Filter for Team Lead if necessary
        if (role === 'team-lead') {
          const teamMemberIds = employees.map(e => e.id)
          recordsData = recordsData.filter(r => teamMemberIds.includes(r.employeeId))
        }
        
        recordsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setMonthlyRecords(recordsData)
      } catch (error) {
        console.error('Error loading monthly attendance:', error)
      } finally {
        setLoading(false)
      }
    }

    if (role === 'admin' || isSuperAdmin || role === 'team-lead') {
      loadMonthlyAttendance()
    }
  }, [role, isSuperAdmin, selectedMonth, selectedYear, activeTab, employees, uid])

  // Employee History Data
  useEffect(() => {
    const loadEmployeeAttendance = async () => {
      if (activeTab !== 'employee' || !selectedEmployeeId) return
      try {
        setLoading(true)
        const attendanceRef = collection(db, 'attendance')
        const q = query(attendanceRef, where('employeeId', '==', selectedEmployeeId))
        const snapshot = await getDocs(q)
        
        const recordsData: AttendanceRecord[] = snapshot.docs.map(doc => ({
          id: doc.id,
          employeeId: doc.data().employeeId,
          employeeName: doc.data().employeeName || 'Unknown Employee',
          date: doc.data().date,
          checkInTime: doc.data().checkInTime || '-',
          checkOutTime: doc.data().checkOutTime || '-',
          totalBreakMs: doc.data().totalBreakMs || 0,
          status: doc.data().status || 'absent',
          workingHours: doc.data().workingHours || '0h',
        }))
        
        recordsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setEmployeeRecords(recordsData)
      } catch (error) {
        console.error('Error loading employee attendance:', error)
      } finally {
        setLoading(false)
      }
    }

    if (role === 'admin' || isSuperAdmin || role === 'team-lead') {
      loadEmployeeAttendance()
    }
  }, [role, isSuperAdmin, selectedEmployeeId, activeTab, uid])

  const formatMsToTime = (ms: number) => {
    if (!ms) return '0m'
    const totalMinutes = Math.floor(ms / (1000 * 60))
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  // Cross-reference search function for generic terms against rich employee data
  const crossReferenceSearch = (record: AttendanceRecord) => {
    if (!searchTerm) return true;
    const emp = employees.find(e => e.id === record.employeeId);
    const lowerSearch = searchTerm.toLowerCase();
    
    return record.employeeName.toLowerCase().includes(lowerSearch) ||
           (emp?.employeeNo && emp.employeeNo.toLowerCase().includes(lowerSearch)) ||
           (emp?.mobile && emp.mobile.toLowerCase().includes(lowerSearch)) ||
           (emp?.designation && emp.designation.toLowerCase().includes(lowerSearch));
  }

  const filteredDailyRecords = records.filter(crossReferenceSearch)
  const filteredMonthlyRecords = monthlyRecords.filter(crossReferenceSearch)

  const filteredEmployeeRecords = useMemo(() => {
    return employeeRecords.filter(r => {
      const d = new Date(r.date)
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
    })
  }, [employeeRecords, selectedMonth, selectedYear])

  const stats = useMemo(() => {
    const activeRecords = activeTab === 'daily' ? records : activeTab === 'monthly' ? monthlyRecords : filteredEmployeeRecords
    return {
        present: activeRecords.filter(r => r.status === 'present' || r.status === 'on-break').length,
        absent: activeRecords.filter(r => r.status === 'absent').length,
        onBreak: activeRecords.filter(r => r.status === 'on-break').length,
    }
  }, [activeTab, records, monthlyRecords, filteredEmployeeRecords])

  const getExportParams = () => {
    let targetRecords: AttendanceRecord[] = []
    let filename = ''
    let title = ''
    
    if (activeTab === 'daily') {
      targetRecords = filteredDailyRecords
      title = `Enterprise Attendance Ledger - ${selectedDate}`
      filename = `team_attendance_${selectedDate}.pdf`
    } else if (activeTab === 'monthly') {
      targetRecords = filteredMonthlyRecords
      title = `Enterprise Monthly Ledger - ${selectedYear}-${selectedMonth+1}`
      filename = `team_monthly_${selectedYear}_${selectedMonth+1}.pdf`
    } else {
      targetRecords = filteredEmployeeRecords
      const emp = employees.find(e => e.id === selectedEmployeeId)
      title = `Operative History: ${emp?.name || 'Unknown'} - ${selectedYear}-${selectedMonth+1}`
      filename = `attendance_history_${emp?.name?.replace(/ /g, '_') || 'employee'}_${selectedYear}_${selectedMonth+1}.pdf`
    }
    return { data: targetRecords, title, filename }
  }
  const exportParams = getExportParams()

  const MonthYearSelector = () => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-3">
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
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
    </div>
  )

  const searchableEmployeeList = employees.filter(emp => {
      const term = employeeSearchTerm.toLowerCase();
      return emp.name.toLowerCase().includes(term) ||
             emp.employeeNo.toLowerCase().includes(term) ||
             emp.mobile.toLowerCase().includes(term) ||
             emp.designation.toLowerCase().includes(term);
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.employee-dropdown-container')) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (role !== 'admin' && !isSuperAdmin && role !== 'team-lead') {
    return null
  }

  const renderTable = (recordsData: AttendanceRecord[]) => (
    <Card className="bg-card border border-border shadow-2xl overflow-hidden rounded-3xl mt-6">
        {loading ? (
        <div className="p-20 text-center animate-pulse flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <p className="font-bold text-muted-foreground tracking-widest uppercase text-xs">Accessing Secure Records...</p>
        </div>
        ) : recordsData.length === 0 ? (
        <div className="p-20 text-center flex flex-col items-center gap-4 bg-muted/10">
            <Search className="w-12 h-12 text-muted-foreground/10" />
            <p className="font-bold text-muted-foreground/40 tracking-widest uppercase text-xs">No ledger entries found.</p>
        </div>
        ) : (
        <div className="overflow-x-auto">
            <table className="w-full">
            <thead>
                <tr className="bg-muted/30 border-b border-border">
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-muted-foreground tracking-widest">Date</th>
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-muted-foreground tracking-widest">Employee</th>
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-muted-foreground tracking-widest">Punch In</th>
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-muted-foreground tracking-widest">Punch Out</th>
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-muted-foreground tracking-widest">Break Time</th>
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-muted-foreground tracking-widest">Work Hours</th>
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-muted-foreground tracking-widest">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border">
                {recordsData.map((record) => {
                const associatedEmp = employees.find(e => e.id === record.employeeId);
                return (
                <tr key={record.id} className="hover:bg-muted/20 transition-all group">
                    <td className="px-8 py-5">
                       <span className="text-sm font-black text-foreground">{new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </td>
                    <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-border text-zinc-500 font-black text-xs">
                           <User size={16} />
                        </div>
                        <div>
                           <p className="text-sm font-black text-foreground group-hover:text-primary transition-colors leading-none mb-1">{record.employeeName}</p>
                           <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">ID: {associatedEmp?.employeeNo || record.id.slice(0, 8)}</p>
                        </div>
                    </div>
                    </td>
                    <td className="px-8 py-5">
                        <p className="text-sm font-bold text-foreground">{record.checkInTime}</p>
                    </td>
                    <td className="px-8 py-5">
                        <p className="text-sm font-bold text-foreground">{record.checkOutTime}</p>
                    </td>
                    <td className="px-8 py-5">
                        <p className="text-xs font-black text-orange-500">{formatMsToTime(record.totalBreakMs)}</p>
                    </td>
                    <td className="px-8 py-5">
                        <span className="px-3 py-1 bg-primary/10 rounded-lg text-xs font-black text-primary border border-primary/20">
                            {record.workingHours}
                        </span>
                    </td>
                    <td className="px-8 py-5">
                    <span
                        className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm border",
                        record.status === 'present' || record.status === 'on-break'
                            ? 'bg-green-500/10 text-green-600 border-green-500/20'
                            : record.status === 'leave'
                            ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                            : 'bg-red-500/10 text-red-600 border-red-500/20'
                        )}
                    >
                        <span className={cn("w-1.5 h-1.5 rounded-full", 
                            (record.status === 'present' || record.status === 'on-break') ? 'bg-green-500 animate-pulse' :
                            record.status === 'leave' ? 'bg-yellow-500' :
                            'bg-red-500'
                        )} />
                        {record.status}
                    </span>
                    </td>
                </tr>
                )})}
            </tbody>
            </table>
        </div>
        )}
        <div className="p-6 border-t border-border bg-muted/20">
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em] text-center">End of ledger entry</p>
        </div>
    </Card>
  )

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight italic uppercase leading-none text-primary">Team Attendance</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-lg font-medium tracking-tight italic">Enterprise-wide attendance synchronization center</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <ExportPDFButton 
            data={exportParams.data}
            title={exportParams.title}
            filename={exportParams.filename}
            headers={['Employee Name', 'Date', 'Punch In', 'Punch Out', 'Break Time', 'Work Hours', 'Status']}
            formatRow={(r: AttendanceRecord) => [
              r.employeeName, r.date, r.checkInTime || '-', r.checkOutTime || '-', formatMsToTime(r.totalBreakMs), r.workingHours || '-', r.status
            ]}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 h-14 px-8 transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
            buttonText="Export Ledger"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-muted/30 p-1.5 rounded-2xl w-full max-w-xl border border-border">
        <button
          onClick={() => setActiveTab('daily')}
          className={cn("flex-1 px-4 py-3 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-widest transition-all", activeTab === 'daily' ? "bg-background shadow-md text-primary" : "text-muted-foreground hover:text-foreground")}
        >
          Daily Ledger
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={cn("flex-1 px-4 py-3 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-widest transition-all", activeTab === 'monthly' ? "bg-background shadow-md text-primary" : "text-muted-foreground hover:text-foreground")}
        >
          Monthly Ledger
        </button>
        <button
          onClick={() => setActiveTab('employee')}
          className={cn("flex-1 px-4 py-3 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-widest transition-all", activeTab === 'employee' ? "bg-background shadow-md text-primary" : "text-muted-foreground hover:text-foreground")}
        >
          Employee History
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
        <Card className="p-6 bg-zinc-950 text-white border-zinc-900 shadow-xl overflow-hidden relative group rounded-[2rem]">
          <div className="absolute -bottom-4 -right-4 opacity-10 transform group-hover:scale-110 transition-transform duration-500">
            <CheckCircle size={100} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Total Present</p>
          <p className="text-4xl sm:text-5xl font-black tracking-tighter">{stats.present}</p>
        </Card>
        
        <Card className="p-6 bg-card border border-border shadow-xl overflow-hidden relative group rounded-[2rem]">
          <div className="absolute -bottom-4 -right-4 opacity-5 transform group-hover:scale-110 transition-transform duration-500 text-primary/10">
            <XCircle size={100} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Total Absences</p>
          <p className="text-4xl sm:text-5xl font-black tracking-tighter text-red-600">{stats.absent}</p>
        </Card>

        <Card className="p-6 bg-card border border-border shadow-xl overflow-hidden relative group rounded-[2rem]">
          <div className="absolute -bottom-4 -right-4 opacity-10 transform group-hover:scale-110 transition-transform duration-500 text-orange-500/20">
            <Coffee size={100} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 mb-1">Total Breaks</p>
          <p className="text-4xl sm:text-5xl font-black tracking-tighter text-orange-600">{stats.onBreak}</p>
        </Card>
      </div>


      {activeTab === 'daily' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="p-4 bg-card border border-border shadow-md rounded-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
                <div className="space-y-2 lg:col-span-1">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Target Calendar Date</label>
                    <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="pl-10 h-12 rounded-xl border-border focus:ring-primary/20 font-bold"
                    />
                    </div>
                </div>
                <div className="space-y-2 lg:col-span-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Workforce Ledger Search</label>
                    <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <Input
                        placeholder="Search by Employee Name, ID, Mobile, or Designation..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-12 rounded-xl border-border focus:ring-primary/20 font-medium"
                    />
                    </div>
                </div>
                </div>
            </Card>
            {renderTable(filteredDailyRecords)}
        </div>
      )}

      {activeTab === 'monthly' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="p-6 bg-card border border-border shadow-md rounded-2xl flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Selection Period</label>
                    <MonthYearSelector />
                </div>
                <div className="space-y-2 w-full md:w-1/3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Ledger Filters</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                        <Input
                            placeholder="Search by Name, ID, Mobile..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-12 rounded-xl border-border focus:ring-primary/20 font-medium"
                        />
                    </div>
                </div>
            </Card>
            {renderTable(filteredMonthlyRecords)}
        </div>
      )}

      {activeTab === 'employee' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="p-6 bg-card border border-border shadow-md rounded-2xl flex flex-col md:flex-row md:items-end justify-between gap-6 overflow-visible">
                <div className="space-y-2 w-full md:w-1/2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Target Personnel</label>
                    
                    <div className="relative employee-dropdown-container">
                        <div 
                           className="flex items-center justify-between w-full pl-10 pr-4 h-12 rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-primary/20 cursor-pointer shadow-sm transition-all"
                           onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                           <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                           <span className="font-bold text-sm truncate">
                              {selectedEmployeeId 
                                ? employees.find(e => e.id === selectedEmployeeId)?.name + ' - ' + employees.find(e => e.id === selectedEmployeeId)?.employeeNo 
                                : "Select an Operative..."}
                           </span>
                           <ChevronDown size={16} className={cn("text-muted-foreground transition-transform duration-200", isDropdownOpen && "rotate-180")} />
                        </div>

                        {isDropdownOpen && (
                            <div className="absolute z-[100] w-full mt-2 bg-card border border-border rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200">
                                <div className="sticky top-0 bg-card z-10 pb-2">
                                  <div className="relative">
                                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                     <Input 
                                        autoFocus
                                        placeholder="Search Mobile, Name, ID, Team..." 
                                        value={employeeSearchTerm}
                                        onChange={e => setEmployeeSearchTerm(e.target.value)}
                                        className="pl-9 h-10 border-border focus:ring-primary bg-muted/30"
                                     />
                                  </div>
                                </div>
                                <div className="max-h-60 overflow-y-auto pr-1 space-y-1">
                                    {searchableEmployeeList.length === 0 ? (
                                        <div className="p-4 text-center text-xs font-bold text-muted-foreground">No personnel matched search.</div>
                                    ) : (
                                        searchableEmployeeList.map(emp => (
                                            <div 
                                                key={emp.id}
                                                className={cn(
                                                    "p-3 rounded-lg flex flex-col gap-1 cursor-pointer transition-colors border",
                                                    selectedEmployeeId === emp.id 
                                                        ? "bg-primary/5 border-primary/20" 
                                                        : "border-transparent hover:bg-muted/50"
                                                )}
                                                onClick={() => { 
                                                    setSelectedEmployeeId(emp.id); 
                                                    setIsDropdownOpen(false); 
                                                    setEmployeeSearchTerm(''); 
                                                }}
                                            >
                                                <p className="font-black text-sm text-foreground flex items-center justify-between">
                                                    {emp.name}
                                                    {selectedEmployeeId === emp.id && <CheckCircle size={14} className="text-primary" />}
                                                </p>
                                                <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-wider flex-wrap">
                                                    <span className="bg-muted px-1.5 py-0.5 rounded text-zinc-500">ID: {emp.employeeNo}</span>
                                                    <span className="bg-muted px-1.5 py-0.5 rounded text-zinc-500">PH: {emp.mobile}</span>
                                                    <span>{emp.designation}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Filter Timeline</label>
                    <MonthYearSelector />
                </div>
            </Card>
            {renderTable(filteredEmployeeRecords)}
        </div>
      )}
    </div>
  )
}
