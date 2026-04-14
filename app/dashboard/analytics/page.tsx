'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, BarChart as BarChart3
} from 'recharts'
import { CheckCircle2, Star, TrendingUp as TrendIcon, Award, ShieldAlert, Users, BarChart3 as BarChart3Icon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AnalyticsData {
  totalEmployees: number
  avgAttendanceRate: number
  avgWorkingHours: number
  totalLeavesTaken: number
  departmentStats: Array<{
    department: string
    employees: number
    presentRate: number
  }>
  attendanceTrends: any[]
  leaveTypes: any[]
  topPerformers: any[]
}

export default function AnalyticsPage() {
  const { role, isSuperAdmin } = useAuth()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalEmployees: 0,
    avgAttendanceRate: 0,
    avgWorkingHours: 0,
    totalLeavesTaken: 0,
    departmentStats: [],
    attendanceTrends: [],
    leaveTypes: [],
    topPerformers: [],
  })
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month')

  useEffect(() => {
    if (role !== 'admin' && !isSuperAdmin) {
      router.push('/dashboard')
    }
  }, [role, isSuperAdmin, router])

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true)

        // 1. Fetch Core Entities
        const employeesSnap = await getDocs(collection(db, 'employees'))
        const employees = employeesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        const totalEmployees = employees.length

        const leavesSnap = await getDocs(collection(db, 'leaves'))
        const allLeaves = leavesSnap.docs.map(d => d.data())
        const approvedLeaves = allLeaves.filter(l => l.status === 'approved')

        const attendanceSnap = await getDocs(collection(db, 'attendance'))
        const allAttendance = attendanceSnap.docs.map(d => d.data())

        // 2. Define Date Range
        const now = new Date()
        let daysToLookBack = 30
        if (timeRange === 'week') daysToLookBack = 7
        if (timeRange === 'quarter') daysToLookBack = 90
        
        const startDate = new Date()
        startDate.setDate(now.getDate() - daysToLookBack)
        const startDateStr = startDate.toISOString().split('T')[0]

        const filteredAttendance = allAttendance.filter(r => r.date >= startDateStr)
        const filteredLeaves = approvedLeaves.filter(l => l.appliedOn >= startDateStr)

        // 3. Calculate Performance & Reliability (Leaderboard)
        const employeeStats = employees.map((emp: any) => {
           const empAttendance = filteredAttendance.filter(r => r.employeeId === emp.id)
           const presentDays = empAttendance.filter(r => r.status === 'present' || r.status === 'on-break').length
           
           // Reliability Algorithm 
           const attendanceRate = daysToLookBack > 0 ? presentDays / daysToLookBack : 0
           
           // Punctuality (Target 09:30 AM)
           const onTimeDays = empAttendance.filter(r => {
              if (!r.checkInTime) return false
              const [h, m] = r.checkInTime.split(':').map(Number)
              return (h < 9) || (h === 9 && m <= 30)
           }).length
           
           const punctualityRate = presentDays > 0 ? onTimeDays / presentDays : 1
           const reliabilityScore = Math.min(100, Math.round((attendanceRate * 0.6 + punctualityRate * 0.4) * 100))

           return {
              id: emp.id,
              name: emp.name,
              score: reliabilityScore,
              presentDays,
              designation: emp.designation,
              team: emp.team || 'Global'
           }
        }).sort((a, b) => b.score - a.score).slice(0, 5)

        // 4. Time-based Attendance Trends
        const trends: any[] = []
        for (let i = daysToLookBack - 1; i >= 0; i--) {
           const d = new Date()
           d.setDate(now.getDate() - i)
           const dStr = d.toISOString().split('T')[0]
           const count = allAttendance.filter(r => r.date === dStr && (r.status === 'present' || r.status === 'on-break')).length
           trends.push({
              date: d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
              present: count,
              unaccounted: totalEmployees - count
           })
        }

        // 5. Leave Distribution
        const leaveCounts: Record<string, number> = {}
        approvedLeaves.forEach(l => {
           const t = l.leaveType || 'Other'
           leaveCounts[t] = (leaveCounts[t] || 0) + 1
        })
        const leaveTypes = Object.entries(leaveCounts).map(([name, value]) => ({ name, value }))

        // 6. Department Stats
        const deptMap = new Map()
        employees.forEach((emp: any) => {
           const dept = emp.team || 'Others'
           if (!deptMap.has(dept)) deptMap.set(dept, { emps: 0, presence: 0 })
           const s = deptMap.get(dept)
           s.emps++
           const isPresentToday = allAttendance.some(r => r.employeeId === emp.id && r.date === now.toISOString().split('T')[0] && (r.status === 'present' || r.status === 'on-break'))
           if (isPresentToday) s.presence++
        })

        const departmentStats = Array.from(deptMap.entries()).map(([department, s]) => ({
           department,
           employees: s.emps,
           presentRate: Math.round((s.presence / s.emps) * 100)
        }))

        setAnalytics({
           totalEmployees,
           avgAttendanceRate: Math.round((filteredAttendance.length / Math.max(1, totalEmployees * daysToLookBack)) * 100),
           avgWorkingHours: 8.5, // Logic for avg hours could be added here
           totalLeavesTaken: filteredLeaves.length,
           departmentStats,
           attendanceTrends: trends,
           leaveTypes,
           topPerformers: employeeStats
        })

      } catch (error) {
        console.error('Error loading analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    if (role === 'admin' || isSuperAdmin) {
      loadAnalytics()
    }
  }, [role, isSuperAdmin, timeRange])

  if (role !== 'admin' && !isSuperAdmin) return null

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight italic uppercase leading-none text-primary flex items-center gap-4">
             Command Center
             <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-[10px] font-black tracking-widest rounded-full">REALTIME ALPHA</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-lg font-medium tracking-tight italic">Deep ecosystem intelligence and reliability metrics</p>
        </div>
        <div className="flex items-center gap-2 p-1 bg-muted rounded-2xl border border-border">
          {(['week', 'month', 'quarter'] as const).map(range => (
             <button
               key={range}
               onClick={() => setTimeRange(range)}
               className={cn(
                 "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                 timeRange === range ? "bg-background shadow-lg text-primary" : "text-muted-foreground hover:text-foreground"
               )}
             >
               {range}
             </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Agents', value: analytics.totalEmployees, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Attendance Velocity', value: `${analytics.avgAttendanceRate}%`, icon: TrendIcon, color: 'text-green-500', bg: 'bg-green-500/10' },
            { label: 'Approved Absence', value: analytics.totalLeavesTaken, icon: ShieldAlert, color: 'text-orange-500', bg: 'bg-orange-500/10' },
            { label: 'System Efficiency', value: 'High', icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary/10' },
          ].map((stat, i) => (
            <Card key={i} className="p-6 bg-card border border-border shadow-xl hover:scale-[1.02] transition-transform">
               <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60 mb-1">{stat.label}</p>
                    <p className="text-3xl font-black text-foreground tracking-tighter">{stat.value}</p>
                  </div>
                  <div className={cn("p-3 rounded-2xl", stat.bg)}>
                    <stat.icon size={24} className={stat.color} />
                  </div>
               </div>
            </Card>
          ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           {/* Detailed Trend Chart */}
           <Card className="p-8 bg-card border border-border shadow-2xl rounded-[2.5rem] relative overflow-hidden">
              <div className="flex items-center justify-between mb-10">
                 <div>
                    <h3 className="text-xl font-black uppercase tracking-tight italic flex items-center gap-3">
                       <BarChart3Icon className="text-primary" /> Multi-Vector Performance
                    </h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1 opacity-60">Synchronized Attendance Stream</p>
                 </div>
              </div>
              
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={analytics.attendanceTrends}>
                      <defs>
                        <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#888' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#888' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', fontStyle: 'italic', fontWeight: 900 }} 
                      />
                      <Area type="monotone" dataKey="present" stroke="#f97316" strokeWidth={4} fillOpacity={1} fill="url(#colorPresent)" />
                   </AreaChart>
                </ResponsiveContainer>
              </div>
           </Card>

           {/* Reliability Leaderboard */}
           <Card className="p-8 bg-black border-zinc-800 shadow-2xl rounded-[2.5rem] overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-white text-xl font-black italic uppercase tracking-tight flex items-center gap-3">
                    <Award className="text-primary" /> Reliability Leaderboard
                 </h3>
                 <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Global Ranking</span>
              </div>
              <div className="space-y-4">
                 {analytics.topPerformers.map((perf, i) => (
                    <div key={perf.id} className="flex items-center justify-between p-5 bg-zinc-900/50 rounded-2xl border border-zinc-800 transition-all hover:border-primary/50 group">
                       <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all",
                            i === 0 ? "bg-primary text-white scale-110 shadow-lg shadow-primary/20" : "bg-zinc-800 text-zinc-500"
                          )}>
                             {i + 1}
                          </div>
                          <div>
                             <p className="text-sm font-black text-white uppercase group-hover:text-primary transition-colors">{perf.name}</p>
                             <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{perf.designation}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-lg font-black text-primary tracking-tighter">{perf.score}<span className="text-[9px] opacity-60 ml-0.5">PTS</span></p>
                          <p className="text-[9px] font-black text-zinc-600 uppercase">Efficiency Rating</p>
                       </div>
                    </div>
                 ))}
                 {analytics.topPerformers.length === 0 && (
                   <div className="text-center py-10 text-zinc-600 italic font-bold">No performance data synthesized yet.</div>
                 )}
              </div>
           </Card>
        </div>

        {/* Sidebar Intelligence */}
        <div className="space-y-8">
           <Card className="p-8 bg-card border border-border shadow-2xl rounded-[2.5rem]">
              <h3 className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em] mb-8 italic">Leave Composition</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie
                       data={analytics.leaveTypes}
                       innerRadius={60}
                       outerRadius={80}
                       paddingAngle={8}
                       dataKey="value"
                     >
                       {analytics.leaveTypes.map((_, index) => (
                         <Cell key={`cell-${index}`} fill={['#f97316', '#3b82f6', '#10b981', '#6366f1'][index % 4]} />
                       ))}
                     </Pie>
                     <Tooltip />
                   </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-8 space-y-2">
                 {analytics.leaveTypes.map((t, i) => (
                   <div key={t.name} className="flex items-center justify-between p-3 bg-muted rounded-xl">
                      <span className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#f97316', '#3b82f6', '#10b981', '#6366f1'][i % 4] }} />
                         {t.name}
                      </span>
                      <span className="text-xs font-black">{t.value}</span>
                   </div>
                 ))}
              </div>
           </Card>

           <Card className="p-8 bg-primary rounded-[2.5rem] text-white shadow-2xl shadow-primary/20 relative overflow-hidden group border-none">
              <div className="absolute -bottom-10 -right-10 opacity-20 transform rotate-12 group-hover:scale-110 transition-transform">
                 <Star size={180} />
              </div>
              <div className="relative z-10 space-y-6">
                 <h3 className="text-2xl font-black italic uppercase leading-none">Export Intelligence</h3>
                 <p className="text-white/80 text-sm font-medium leading-relaxed italic">Download full organizational performance report as priority PDF.</p>
                 <Button className="w-full bg-white text-primary hover:bg-zinc-100 rounded-2xl h-14 font-black uppercase tracking-widest text-[10px] shadow-xl">
                    Generate Report
                 </Button>
              </div>
           </Card>

           {/* Department Breakdown */}
           <Card className="p-8 border border-border rounded-[2.5rem] shadow-sm">
              <h3 className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em] mb-6 italic text-center">Deployment Stats</h3>
              <div className="space-y-4">
                 {analytics.departmentStats.map((dept, i) => (
                   <div key={i} className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase">
                         <span className="text-muted-foreground">{dept.department}</span>
                         <span className="text-primary">{dept.presentRate}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                         <div className="bg-primary h-full transition-all" style={{ width: `${dept.presentRate}%` }} />
                      </div>
                   </div>
                 ))}
              </div>
           </Card>
        </div>
      </div>
    </div>
  )
}
