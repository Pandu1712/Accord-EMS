'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { db } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { Gift, Star, Calendar, PartyPopper, Cake, Heart, ChevronRight, Search, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

interface Employee {
  id: string
  name: string
  dob: string
  joinDate: string
  status: string
  designation: string
  team: string
}

interface EventItem {
  employeeId: string
  name: string
  type: 'birthday' | 'anniversary'
  date: string // "MM-DD"
  fullDate: string // original YYYY-MM-DD
  years?: number
  designation: string
  team: string
}

export default function EventsPage() {
  const { role, isSuperAdmin } = useAuth()
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    // Shared organizational viewing for all authenticated roles
    if (!role) {
      router.push('/dashboard')
    }
  }, [role, router])

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setLoading(true)
        const employeesRef = collection(db, 'employees')
        const snapshot = await getDocs(employeesRef)
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Employee[]
        setEmployees(data.filter(emp => emp.status === 'active'))
      } catch (error) {
        console.error('Error loading employees:', error)
      } finally {
        setLoading(false)
      }
    }

    if (role) {
      loadEmployees()
    }
  }, [role, isSuperAdmin])

  const { todayEvents, upcomingEvents } = useMemo(() => {
    const today = new Date()
    const todayMonth = today.getMonth() + 1
    const todayDay = today.getDate()
    
    const events: EventItem[] = []
    
    employees.forEach(emp => {
      // Birthdays
      if (emp.dob) {
        const dobDate = new Date(emp.dob)
        events.push({
          employeeId: emp.id,
          name: emp.name,
          type: 'birthday',
          date: `${String(dobDate.getMonth() + 1).padStart(2, '0')}-${String(dobDate.getDate()).padStart(2, '0')}`,
          fullDate: emp.dob,
          designation: emp.designation,
          team: emp.team
        })
      }
      
      // Anniversaries
      if (emp.joinDate) {
        const joinDate = new Date(emp.joinDate)
        const years = today.getFullYear() - joinDate.getFullYear()
        if (years > 0) {
          events.push({
            employeeId: emp.id,
            name: emp.name,
            type: 'anniversary',
            date: `${String(joinDate.getMonth() + 1).padStart(2, '0')}-${String(joinDate.getDate()).padStart(2, '0')}`,
            fullDate: emp.joinDate,
            years,
            designation: emp.designation,
            team: emp.team
          })
        }
      }
    })

    const todayStr = `${String(todayMonth).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`
    
    const todayEvts = events.filter(e => e.date === todayStr)
    
    // Sort upcoming events
    const upcomingEvts = events
      .filter(e => {
        if (e.date === todayStr) return false
        const [m, d] = e.date.split('-').map(Number)
        const eventThisYear = new Date(today.getFullYear(), m - 1, d)
        
        // If event already passed this year, look for next year
        if (eventThisYear < today) {
          eventThisYear.setFullYear(today.getFullYear() + 1)
        }
        
        const diffDays = Math.ceil((eventThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays <= 30
      })
      .sort((a, b) => {
        const [am, ad] = a.date.split('-').map(Number)
        const [bm, bd] = b.date.split('-').map(Number)
        
        let aDate = new Date(today.getFullYear(), am - 1, ad)
        if (aDate < today) aDate.setFullYear(today.getFullYear() + 1)
        
        let bDate = new Date(today.getFullYear(), bm - 1, bd)
        if (bDate < today) bDate.setFullYear(today.getFullYear() + 1)
        
        return aDate.getTime() - bDate.getTime()
      })

    return { todayEvents: todayEvts, upcomingEvents: upcomingEvts }
  }, [employees])

  const filteredUpcoming = upcomingEvents.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!role) return null

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight italic uppercase leading-none text-primary">Events Center</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-lg font-medium tracking-tight italic">Celebrate workforce milestones and growth</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Today's Spotlight */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-3 px-2 italic uppercase tracking-tighter">
              <PartyPopper className="text-primary" /> Today's Spotlight
            </h2>
            
            {todayEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {todayEvents.map((event, idx) => (
                  <Card key={`${event.employeeId}-${event.type}`} className="p-8 bg-black border-zinc-800 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-500">
                       {event.type === 'birthday' ? <Cake size={100} className="text-primary" /> : <Star size={100} className="text-primary" />}
                    </div>
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-center gap-3">
                         <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30">
                            {event.type === 'birthday' ? <Cake size={24} className="text-primary" /> : <Star size={24} className="text-primary" />}
                         </div>
                         <span className={cn(
                           "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                           event.type === 'birthday' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-orange-500/10 text-orange-500 border-orange-500/20"
                         )}>
                           {event.type === 'birthday' ? 'Birthday' : `${event.years} Year Anniversary`}
                         </span>
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-white italic uppercase">{event.name}</h3>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1 opacity-60">{event.designation} • {event.team}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 border-dashed bg-muted/10 flex flex-col items-center text-center space-y-4 rounded-3xl">
                 <div className="p-4 bg-background rounded-full border border-border">
                    <Clock className="w-8 h-8 text-muted-foreground/30" />
                 </div>
                 <p className="text-muted-foreground font-medium uppercase text-xs tracking-widest opacity-40">No organizational milestones recorded for today.</p>
              </Card>
            )}
          </section>

          {/* Upcoming Timeline */}
          <section className="space-y-6">
             <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-3 italic uppercase tracking-tighter">
                  <Calendar className="text-primary" /> Upcoming Calendar (30 Days)
                </h2>
                <div className="relative w-full max-w-[200px]">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                   <Input 
                     placeholder="Search..." 
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="h-9 pl-9 text-xs rounded-xl bg-muted/40 border-none"
                   />
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                  [1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)
                ) : filteredUpcoming.length > 0 ? (
                  filteredUpcoming.map((event) => {
                    const [m, d] = event.date.split('-').map(Number)
                    const dateObj = new Date(new Date().getFullYear(), m-1, d)
                    return (
                      <Card key={`${event.employeeId}-${event.type}`} className="p-5 flex items-center gap-4 hover:shadow-xl transition-all border border-border group rounded-2xl">
                         <div className={cn(
                           "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border",
                           event.type === 'birthday' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-orange-50 text-orange-600 border-orange-100"
                         )}>
                            {event.type === 'birthday' ? <Cake size={20} /> : <Star size={20} />}
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="font-black text-foreground truncate uppercase text-sm">{event.name}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                               {event.type === 'birthday' ? 'Birthday' : `${event.years}y Anniversary`} • {dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </p>
                         </div>
                         <div className="text-right">
                           <p className="text-[10px] font-black uppercase text-primary tracking-widest italic">{event.team}</p>
                         </div>
                      </Card>
                    )
                  })
                ) : (
                  <div className="md:col-span-2 p-12 text-center opacity-40 italic font-bold">No upcoming events found.</div>
                )}
             </div>
          </section>
        </div>

        {/* Quick Insights Sidebar */}
        <div className="space-y-8">
           <Card className="p-8 bg-zinc-950 text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden group border-none">
              <div className="absolute -bottom-10 -right-10 opacity-10 transform -rotate-12 transition-transform group-hover:scale-110">
                 <Heart size={200} />
              </div>
              <div className="relative z-10 space-y-6">
                 <div>
                    <h3 className="text-3xl font-black italic uppercase leading-tight tracking-tighter">Organizational Wellness</h3>
                    <p className="text-zinc-500 text-sm font-medium mt-2">Personal milestones drive collective performance. Stay ahead of the celebrations.</p>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
                       <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Total Birthdays/Mo</span>
                       <span className="text-xl font-black text-primary">{upcomingEvents.filter(e => e.type === 'birthday').length}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
                       <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Total Anniv/Mo</span>
                       <span className="text-xl font-black text-primary">{upcomingEvents.filter(e => e.type === 'anniversary').length}</span>
                    </div>
                 </div>
              </div>
           </Card>

           <Card className="p-8 border border-border rounded-[2.5rem] shadow-xl space-y-6">
              <h4 className="text-sm font-black uppercase tracking-[0.2em] italic text-muted-foreground">Recent Deployment</h4>
              <div className="space-y-4">
                 {employees.sort((a,b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime()).slice(0, 3).map(emp => (
                   <div key={emp.id} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                         <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center font-black text-xs text-primary shrink-0">
                            {emp.name.charAt(0)}
                         </div>
                         <div className="min-w-0">
                            <p className="text-sm font-black text-foreground truncate uppercase">{emp.name}</p>
                            <p className="text-[10px] font-medium text-muted-foreground tracking-tight italic">Joined {new Date(emp.joinDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</p>
                         </div>
                      </div>
                      <ChevronRight size={14} className="text-muted-foreground/30" />
                   </div>
                 ))}
              </div>
           </Card>
        </div>
      </div>
    </div>
  )
}
