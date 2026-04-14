'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  Clock, 
  FileText, 
  Calendar, 
  Bell, 
  Info, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Gift,
  Star,
  Activity,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line 
} from 'recharts'

export default function DashboardPage() {
  const router = useRouter()
  const { user, uid, role, isSuperAdmin, employeeName } = useAuth()
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])
  const [dashboardStats, setDashboardStats] = useState<any[]>([])
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([])
  const [leaveDistribution, setLeaveDistribution] = useState<any[]>([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        if (!uid) return

        const alerts: any[] = []
        
        // 1. Fetch Holidays
        const holidaysRef = collection(db, 'holidays')
        try {
          const todayStr = new Date().toISOString().split('T')[0]
          const holidaysSnapshot = await getDocs(query(holidaysRef, where('date', '>=', todayStr), orderBy('date'), limit(3)))
          holidaysSnapshot.docs.forEach(doc => {
            const data = doc.data()
            alerts.push({
              id: doc.id,
              type: 'holiday',
              title: `Upcoming Holiday: ${data.name}`,
              date: data.date,
              icon: GhostIconComponent(Calendar, 'text-blue-500'),
              bg: 'bg-blue-50 dark:bg-blue-900/20'
            })
          })
        } catch (e) {
          console.log("Holidays collection might be empty")
        }

        // 2. Role-based Alerts
        if (role === 'admin' || isSuperAdmin) {
          const leavesRef = collection(db, 'leaves')
          const q = query(leavesRef, where('status', '==', 'pending'))
          const snapshot = await getDocs(q)
          if (!snapshot.empty) {
            alerts.push({
              id: 'pending-leaves',
              type: 'info',
              title: `Review Required: ${snapshot.size} pending leave requests.`,
              icon: GhostIconComponent(AlertTriangle, 'text-orange-500'),
              bg: 'bg-orange-50 dark:bg-orange-900/20',
              link: '/dashboard/leaves'
            })
          }
        } else {
          const leavesRef = collection(db, 'leaves')
          try {
            const q = query(leavesRef, where('employeeId', '==', uid))
            const snapshot = await getDocs(q)
            const sortedDocs = snapshot.docs
              .map(doc => ({ id: doc.id, ...(doc.data() as any) }))
              .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, 3)

            sortedDocs.forEach(data => {
              if (data.status !== 'pending') {
                alerts.push({
                  id: data.id,
                  type: 'leave-status',
                  title: `Your leave request for ${data.startDate} was ${data.status}.`,
                  icon: data.status === 'approved' ? GhostIconComponent(CheckCircle2, 'text-green-500') : GhostIconComponent(XCircle, 'text-red-500'),
                  bg: data.status === 'approved' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
                })
              }
            })
          } catch (e) {
            console.log("Leaves collection might be empty for user")
          }
        }

        // 3. Birthday & Anniversary Alerts
        try {
          const employeesSnap = await getDocs(collection(db, 'employees'))
          const today = new Date()
          const todayMonth = today.getMonth() + 1
          const todayDay = today.getDate()
          const todayStr = `${String(todayMonth).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`

          employeesSnap.docs.forEach(doc => {
            const data = doc.data()
            if (data.status !== 'active') return

            // Birthday check
            if (data.dob) {
              const dobDate = new Date(data.dob)
              const dobStr = `${String(dobDate.getMonth() + 1).padStart(2, '0')}-${String(dobDate.getDate()).padStart(2, '0')}`
              if (dobStr === todayStr) {
                alerts.push({
                  id: `bday-${doc.id}`,
                  type: 'event',
                  title: `Today's Birthday: ${data.name} 🎂`,
                  icon: GhostIconComponent(Gift, 'text-pink-500'),
                  bg: 'bg-pink-50 dark:bg-pink-900/20',
                  date: 'Organizational Milestone'
                })
              }
            }

            // Anniversary check
            if (data.joinDate) {
              const joinDate = new Date(data.joinDate)
              const annivStr = `${String(joinDate.getMonth() + 1).padStart(2, '0')}-${String(joinDate.getDate()).padStart(2, '0')}`
              const years = today.getFullYear() - joinDate.getFullYear()
              if (annivStr === todayStr && years > 0) {
                alerts.push({
                  id: `anniv-${doc.id}`,
                  type: 'event',
                  title: `${years}y Work Anniversary: ${data.name} 🌟`,
                  icon: GhostIconComponent(Star, 'text-amber-500'),
                  bg: 'bg-amber-50 dark:bg-amber-900/20',
                  date: 'Operational Growth'
                })
              }
            }
          })
        } catch (e) {
          console.error("Error fetching events for alerts:", e)
        }

        setNotifications(alerts)
        
        // 3. Fetch Real Stats
        const employeesSnap = await getDocs(collection(db, 'employees'))
        const totalEmployees = employeesSnap.size
        
        const today = new Date().toISOString().split('T')[0]
        const attendanceSnap = await getDocs(query(collection(db, 'attendance'), where('date', '==', today)))
        const presentToday = attendanceSnap.docs.filter(d => d.data().status === 'present' || d.data().status === 'on-break').length
        
        const leavesSnap = await getDocs(query(collection(db, 'leaves'), where('status', '==', 'pending')))
        const pendingLeaves = leavesSnap.size

        if (isSuperAdmin || role === 'admin') {
          setDashboardStats([
            { label: 'Total Employees', value: totalEmployees.toString(), icon: Users, color: 'text-blue-600', href: '/dashboard/employees' },
            { label: 'Present Today', value: presentToday.toString(), icon: Clock, color: 'text-green-600', href: '/dashboard/attendance' },
            { label: 'Pending Leaves', value: pendingLeaves.toString(), icon: FileText, color: 'text-orange-600', href: '/dashboard/leaves' },
            { label: 'Active Alerts', value: alerts.length.toString(), icon: AlertTriangle, color: 'text-red-600', href: '#incident-stream' },
          ])

          // 4. Fetch Real Trend Data (Last 7 Days)
          const last7Days: any[] = []
          for (let i = 6; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const dateStr = d.toISOString().split('T')[0]
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
            
            const dayAttendance = await getDocs(query(collection(db, 'attendance'), where('date', '==', dateStr)))
            const present = dayAttendance.docs.filter(doc => doc.data().status === 'present' || doc.data().status === 'on-break').length
            const absent = totalEmployees - present
            
            last7Days.push({ name: dayName, present, absent })
          }
          setAttendanceTrend(last7Days)

          // 5. Fetch Real Leave Distribution
          const allLeaves = await getDocs(collection(db, 'leaves'))
          const leaveCounts: Record<string, number> = { 'Annual': 0, 'Medical': 0, 'Comp Off': 0, 'Other': 0 }
          
          allLeaves.docs.forEach(doc => {
            const l = doc.data()
            if (l.status === 'approved') {
              const type = l.leaveType?.toLowerCase() || ''
              if (type.includes('al') || type.includes('annual')) leaveCounts['Annual'] += 1
              else if (type.includes('ml') || type.includes('medical') || type.includes('sick')) leaveCounts['Medical'] += 1
              else if (type.includes('comp')) leaveCounts['Comp Off'] += 1
              else leaveCounts['Other'] += 1
            }
          })
          
          setLeaveDistribution([
            { name: 'Annual', value: leaveCounts['Annual'], color: '#3b82f6' },
            { name: 'Medical', value: leaveCounts['Medical'], color: '#10b981' },
            { name: 'Comp Off', value: leaveCounts['Comp Off'], color: '#f59e0b' },
            { name: 'Other', value: leaveCounts['Other'], color: '#6366f1' },
          ].filter(item => item.value > 0))

        } else {
          // Employee Stats
          const empSnap = await getDoc(doc(db, 'employees', uid))
          const balances = empSnap.exists() ? empSnap.data().leaveBalances : { al: 12, ml: 10, compOff: 0 }
          
          setDashboardStats([
            { label: 'Annual Leave', value: balances.al.toString(), icon: Calendar, color: 'text-blue-600', href: '/dashboard/my-leaves' },
            { label: 'Medical Leave', value: balances.ml.toString(), icon: Activity, color: 'text-green-600', href: '/dashboard/my-leaves' },
            { label: 'Comp Off', value: balances.compOff.toString(), icon: Gift, color: 'text-orange-600', href: '/dashboard/my-leaves' },
            { label: 'Work Hours', value: 'Auto', icon: Clock, color: 'text-zinc-600', href: '/dashboard/my-attendance' },
          ])

          // 6. Real Employee Weekly Trend
          const weeklyHours: any[] = []
          for (let i = 6; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const dateStr = d.toISOString().split('T')[0]
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
            
            const attDoc = await getDoc(doc(db, 'attendance', `${dateStr}-${uid}`))
            let hours = 0
            if (attDoc.exists()) {
               const hStr = attDoc.data().workingHours || '0'
               hours = parseFloat(hStr) || 0
            }
            weeklyHours.push({ name: dayName, hours })
          }
          setAttendanceTrend(weeklyHours)
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user?.uid, role, isSuperAdmin, employeeName])

  const GhostIconComponent = (Icon: any, colorClass: string) => {
    return (props: any) => <Icon {...props} className={cn(props.className, colorClass)} />
  }

  const getWelcomeMessage = () => {
    if (isSuperAdmin) return 'Command Center'
    if (role === 'admin') return 'Operational Panel'
    return 'Employee Dashboard'
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight flex items-center gap-3 italic uppercase">
            {getWelcomeMessage()}
          </h1>
          <p className="text-muted-foreground mt-2 text-lg font-medium tracking-tight">
            Welcome back, <span className="text-primary font-black uppercase tracking-tighter">{isSuperAdmin ? 'ACCORD Master' : (employeeName || user?.email?.split('@')[0])}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 p-1.5 bg-muted rounded-2xl border border-border">
          <div className="flex px-4 py-2 bg-background border border-border rounded-xl shadow-sm items-center gap-3">
             <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-sm shadow-green-500" />
             <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Pulse Active</span>
          </div>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, index) => {
          const Icon = stat.icon
          const CardContent = (
            <Card className="p-6 bg-card border border-border shadow-xl hover:shadow-2xl transition-all group overflow-hidden relative border-b-4 border-b-primary/20 h-full">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
                <Icon size={80} />
              </div>
              <div className="relative z-10 flex flex-col gap-3">
                <div className={cn("p-2.5 rounded-2xl w-fit shadow-inner", stat.color.replace('text-', 'bg-').concat('/10'))}>
                  <Icon className={stat.color} size={22} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1 opacity-60">{stat.label}</p>
                  <p className="text-4xl font-black text-foreground tracking-tighter">{stat.value}</p>
                </div>
              </div>
            </Card>
          )

          const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>) => {
            if (stat.href?.startsWith('#')) {
              e.preventDefault()
              const element = document.getElementById(stat.href.substring(1))
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            }
          }

          if (stat.href) {
            return (
              <Link 
                key={index} 
                href={stat.href} 
                onClick={handleScroll}
                className="block transition-transform active:scale-95"
              >
                {CardContent}
              </Link>
            )
          }

          return <div key={index}>{CardContent}</div>
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Analytics Section */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="p-8 bg-card border border-border shadow-2xl rounded-3xl overflow-hidden relative">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black tracking-tight uppercase italic flex items-center gap-3">
                  <TrendingUp className="text-primary" /> Attendance Trends
                </h2>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-60">System-wide workforce flow</p>
              </div>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {isSuperAdmin || role === 'admin' ? (
                  <BarChart data={attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', fontWeight: 900 }} 
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    />
                    <Bar dataKey="present" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                ) : (
                  <LineChart data={attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} />
                    <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={4} dot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </Card>

          <Card id="incident-stream" className="p-8 border border-border shadow-xl rounded-2xl scroll-mt-8">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-3 italic">
                  <Bell className="text-primary" /> Incident Stream
                </h3>
             </div>
             <div className="space-y-4">
                {loading ? (
                  [1, 2].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)
                ) : notifications.length === 0 ? (
                  <div className="p-12 text-center bg-muted/20 rounded-3xl border border-dashed border-border/50">
                     <CheckCircle2 className="mx-auto mb-4 text-muted-foreground/20" size={48} />
                     <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">Zero Pending Alerts</p>
                  </div>
                ) : (
                  notifications.map((alert) => {
                    const AlertContent = (
                      <div className={cn("p-5 rounded-3xl flex items-center gap-5 border transition-all hover:scale-[1.01] cursor-pointer", alert.bg, alert.bg.split(' ')[0].replace('bg-', 'border-').concat('/30'))}>
                         <div className="w-12 h-12 bg-background rounded-2xl border border-border flex items-center justify-center shadow-inner">
                            <alert.icon size={22} />
                         </div>
                         <div className="flex-1">
                            <p className="text-sm font-black text-foreground leading-tight tracking-tight">{alert.title}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-60">{alert.date || 'Real-time Alert'}</p>
                         </div>
                      </div>
                    )

                    if (alert.link) {
                      return (
                        <Link key={alert.id} href={alert.link} className="block">
                          {AlertContent}
                        </Link>
                      )
                    }

                    return <div key={alert.id}>{AlertContent}</div>
                  })
                )}
             </div>
          </Card>
        </div>

        {/* Sidebar Analytics */}
        <div className="space-y-8">
          <Card className="p-8 bg-black border-zinc-800 shadow-2xl rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
               <Activity size={100} className="text-primary" />
            </div>
            <h3 className="text-white text-xs font-black uppercase tracking-[0.2em] mb-8">Workforce Allocations</h3>
            <div className="h-[250px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={isSuperAdmin || role === 'admin' ? leaveDistribution : [
                        { name: 'Completed', value: 85, color: '#3b82f6' },
                        { name: 'Remaining', value: 15, color: 'rgba(255,255,255,0.1)' }
                      ]}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {leaveDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
               </ResponsiveContainer>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-3">
               {(isSuperAdmin || role === 'admin' ? leaveDistribution : [{name: 'Efficiency', color: '#3b82f6', value: 85}]).map(item => (
                 <div key={item.name} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                       {item.name}
                    </span>
                    <span className="text-xs font-black text-white">{item.value}%</span>
                 </div>
               ))}
            </div>
          </Card>

          <Card className="p-8 bg-gradient-to-br from-primary to-orange-600 text-white shadow-2xl rounded-3xl relative overflow-hidden group border-none">
             <div className="absolute -bottom-10 -right-10 opacity-20 transform rotate-12 group-hover:scale-110 transition-transform">
                <Star size={180} />
             </div>
             <div className="relative z-10 space-y-6">
                <h3 className="text-2xl font-black italic uppercase leading-none">Elevate Performance</h3>
                <p className="text-white/80 text-sm font-medium leading-relaxed italic">The ACCORD ecosystem is designed for peak operational efficiency. Ready to sync your day?</p>
                <div className="flex flex-col gap-3 pt-4">
                   <Button onClick={() => router.push('/dashboard/my-attendance')} className="bg-white text-primary hover:bg-white/90 rounded-2xl h-14 font-black uppercase tracking-widest text-xs shadow-xl shadow-black/20">
                      Sync Attendance
                   </Button>
                   <Button variant="outline" onClick={() => router.push('/dashboard/leaves')} className="bg-white/10 border-white/20 hover:bg-white/20 text-white rounded-2xl h-14 font-black uppercase tracking-widest text-xs">
                      View Schedules
                   </Button>
                </div>
             </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
