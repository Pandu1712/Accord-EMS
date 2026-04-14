'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { db } from '@/lib/firebase'
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore'
import { 
  Users, 
  UserPlus, 
  ArrowRightLeft, 
  Search, 
  User, 
  ShieldCheck, 
  LayoutGrid, 
  UserMinus,
  CheckCircle2,
  AlertCircle,
  Table as TableIcon,
  Columns
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Employee {
  id: string
  name: string
  employeeNo: string
  designation: string
  role: string
  teamLeadId?: string
  status: string
}

export default function TeamOrganizerPage() {
  const { role, isSuperAdmin, uid } = useAuth()
  const router = useRouter()
  
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'teams' | 'all'>('teams')

  useEffect(() => {
    if (role !== 'admin' && !isSuperAdmin) {
      router.push('/dashboard')
    }
  }, [role, isSuperAdmin, router])

  const loadData = async () => {
    try {
      setLoading(true)
      const snap = await getDocs(collection(db, 'employees'))
      const emps = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Employee[]
      setEmployees(emps)
    } catch (error) {
      console.error('Error loading teams:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (role === 'admin' || isSuperAdmin) {
      loadData()
    }
  }, [role, isSuperAdmin])

  const leads = useMemo(() => employees.filter(e => e.role === 'team-lead'), [employees])
  
  const standardEmployees = useMemo(() => 
    employees.filter(e => e.role === 'employee'),
    [employees]
  )

  const unassigned = useMemo(() => 
    employees.filter(e => e.role === 'employee' && !e.teamLeadId && e.status === 'active'),
    [employees]
  )

  const handleAssign = async (employeeId: string, leadId: string | null) => {
    try {
      setIsUpdating(employeeId)
      const empRef = doc(db, 'employees', employeeId)
      await updateDoc(empRef, { teamLeadId: leadId || '' })
      
      setEmployees(prev => prev.map(e => 
        e.id === employeeId ? { ...e, teamLeadId: leadId || '' } : e
      ))
    } catch (error) {
      console.error('Assignment failed:', error)
      alert('Failed to update assignment')
    } finally {
      setIsUpdating(null)
    }
  }

  const filteredUnassigned = unassigned.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.employeeNo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredAllEmployees = standardEmployees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.employeeNo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (role !== 'admin' && !isSuperAdmin) return null

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-foreground tracking-tighter italic uppercase flex items-center gap-4">
            <LayoutGrid className="w-10 h-10 text-primary" />
            Team Organizer
          </h1>
          <p className="text-muted-foreground mt-3 text-lg font-medium tracking-tight italic">Coordinate organization structure and reporting lines</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* View Toggle */}
          <div className="bg-muted p-1 rounded-2xl flex items-center gap-1 border border-border shadow-inner">
            <Button 
              size="sm"
              variant={viewMode === 'teams' ? 'default' : 'ghost'}
              onClick={() => setViewMode('teams')}
              className={cn(
                "rounded-xl gap-2 font-black text-[10px] uppercase tracking-widest px-4 h-10 transition-all",
                viewMode === 'teams' ? "shadow-lg shadow-primary/20" : "text-muted-foreground"
              )}
            >
              <Columns size={14} /> Team View
            </Button>
            <Button 
              size="sm"
              variant={viewMode === 'all' ? 'default' : 'ghost'}
              onClick={() => setViewMode('all')}
              className={cn(
                "rounded-xl gap-2 font-black text-[10px] uppercase tracking-widest px-4 h-10 transition-all",
                viewMode === 'all' ? "shadow-lg shadow-primary/20" : "text-muted-foreground"
              )}
            >
              <TableIcon size={14} /> Global List
            </Button>
          </div>

          <div className="bg-muted/50 p-2 rounded-2xl border border-border flex items-center gap-6 px-6 h-12">
              <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1">Total Leads</span>
                  <span className="text-base font-black text-foreground">{leads.length}</span>
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1">Unassigned</span>
                  <span className="text-base font-black text-orange-600">{unassigned.length}</span>
              </div>
          </div>
        </div>
      </div>

      {viewMode === 'all' ? (
        /* Global List Mode */
        <div className="space-y-8 animate-in fade-in duration-500">
           <Card className="p-8 bg-zinc-950 text-white rounded-[3rem] border-none shadow-2xl relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 opacity-5 group-hover:rotate-12 transition-transform duration-700">
                <Users size={400} />
              </div>

              <div className="relative z-10 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                   <div>
                     <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Global Operative Hub</h3>
                     <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Master Assignment Control</p>
                   </div>
                   <div className="w-full md:w-96 relative">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                     <Input 
                       placeholder="Find any operative..." 
                       value={searchTerm}
                       onChange={e => setSearchTerm(e.target.value)}
                       className="bg-white/5 border-white/10 h-14 pl-12 rounded-2xl text-sm font-bold tracking-tight focus:ring-primary/40 focus:border-primary/40 transition-all placeholder:text-zinc-700"
                     />
                   </div>
                </div>

                <div className="overflow-x-auto">
                   <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                           <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-zinc-500 tracking-widest leading-none">Identity</th>
                           <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-zinc-500 tracking-widest leading-none">Deployment Sector</th>
                           <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-zinc-500 tracking-widest leading-none">Action Command</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05]">
                         {filteredAllEmployees.map(emp => (
                           <tr key={emp.id} className="group/row hover:bg-white/[0.02] transition-all">
                              <td className="px-6 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
                                       {emp.name.charAt(0)}
                                    </div>
                                    <div>
                                       <p className="font-black text-base tracking-tight leading-none mb-1.5">{emp.name}</p>
                                       <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest leading-none">ID:// {emp.employeeNo}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-6 font-bold text-zinc-400 text-sm">
                                 {emp.designation}
                              </td>
                              <td className="px-6 py-6">
                                 <div className="flex items-center gap-4 max-w-xs">
                                    <select 
                                      value={emp.teamLeadId || ''}
                                      disabled={isUpdating === emp.id}
                                      onChange={(e) => handleAssign(emp.id, e.target.value)}
                                      className={cn(
                                        "w-full bg-zinc-900 border rounded-2xl px-4 h-12 text-xs font-black uppercase focus:outline-none transition-all cursor-pointer shadow-inner",
                                        emp.teamLeadId 
                                          ? "border-primary/40 text-primary" 
                                          : "border-white/10 text-zinc-500 hover:border-white/20"
                                      )}
                                    >
                                      <option value="">NO LEAD ASSIGNED</option>
                                      {leads.map(lead => (
                                        <option key={lead.id} value={lead.id} className="bg-zinc-950 text-white italic">
                                          TL NAME: {lead.name}
                                        </option>
                                      ))}
                                    </select>
                                    {isUpdating === emp.id && (
                                       <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                    )}
                                 </div>
                              </td>
                           </tr>
                         ))}
                         {filteredAllEmployees.length === 0 && (
                           <tr>
                              <td colSpan={3} className="px-6 py-20 text-center">
                                 <AlertCircle className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                                 <p className="text-zinc-600 font-bold uppercase text-xs tracking-widest">No matching personnel records found in the hub.</p>
                              </td>
                           </tr>
                         )}
                      </tbody>
                   </table>
                </div>
              </div>
           </Card>
        </div>
      ) : (
        /* Original Team Cards Mode */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start animate-in fade-in duration-500">
          {/* Unassigned Pool */}
          <Card className="xl:col-span-4 bg-zinc-950 text-white rounded-[3rem] p-8 border-none shadow-2xl relative overflow-hidden group min-h-[500px]">
             <div className="absolute -top-10 -right-10 opacity-5 group-hover:rotate-12 transition-transform duration-700">
               <UserPlus size={300} />
             </div>
             
             <div className="relative z-10 space-y-8">
               <div>
                 <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Personnel Pool</h3>
                 <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Awaiting Team Assignment</p>
               </div>
  
               <div className="relative">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                 <Input 
                   placeholder="Find Operative by Name/ID..." 
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                   className="bg-white/5 border-white/10 h-14 pl-12 rounded-2xl text-sm font-bold tracking-tight focus:ring-primary/40 focus:border-primary/40 transition-all placeholder:text-zinc-700"
                 />
               </div>
  
               <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredUnassigned.length === 0 ? (
                    <div className="p-12 text-center rounded-3xl border border-white/5 bg-white/[0.02]">
                      <CheckCircle2 className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                      <p className="text-zinc-600 font-bold uppercase text-[10px] tracking-[0.2em]">Clearance: All Personnel Assigned</p>
                    </div>
                  ) : (
                    filteredUnassigned.map(emp => (
                      <div key={emp.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all flex items-center justify-between group/item">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-black text-xs">
                               {emp.name.charAt(0)}
                            </div>
                            <div>
                               <p className="font-black text-sm tracking-tight">{emp.name}</p>
                               <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{emp.employeeNo}</p>
                            </div>
                         </div>
                         <select 
                           disabled={isUpdating === emp.id}
                           onChange={(e) => handleAssign(emp.id, e.target.value)}
                           className="bg-zinc-900 border border-white/10 rounded-xl px-3 h-8 text-[10px] font-black uppercase text-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                         >
                           <option value="">Assign Lead...</option>
                           {leads.map(lead => (
                             <option key={lead.id} value={lead.id}>{lead.name}</option>
                           ))}
                         </select>
                      </div>
                    ))
                  )}
               </div>
             </div>
          </Card>
  
          {/* Teams Grid */}
          <div className="xl:col-span-8 space-y-8">
             <div className="flex items-center justify-between px-4">
                <h2 className="text-xl font-black uppercase tracking-widest text-muted-foreground flex items-center gap-3">
                  <ShieldCheck className="text-primary" /> Established Teams
                </h2>
             </div>
  
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {leads.map(lead => {
                  const teamMembers = employees.filter(e => e.teamLeadId === lead.id)
                  return (
                    <Card key={lead.id} className="rounded-[2.5rem] bg-card border border-border shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden group">
                       {/* Card Header (Lead Info) */}
                       <div className="p-8 pb-6 border-b border-border bg-muted/20 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[4rem] group-hover:scale-110 transition-transform duration-700" />
                          
                          <div className="flex items-center gap-5 relative z-10">
                             <div className="w-16 h-16 rounded-[1.5rem] bg-zinc-950 text-white flex items-center justify-center font-black text-xl shadow-2xl relative">
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-4 border-card animate-pulse" />
                                {lead.name.charAt(0)}
                             </div>
                             <div>
                                <h4 className="text-2xl font-black text-foreground tracking-tighter leading-none mb-2">{lead.name}</h4>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-orange-500/10 text-orange-600 border border-orange-500/20 text-[9px] font-black uppercase rounded-md tracking-widest">Team Lead</span>
                                  <span className="text-[10px] font-bold text-muted-foreground tracking-widest">{lead.employeeNo}</span>
                                </div>
                             </div>
                          </div>
                       </div>
  
                       {/* Card Body (Team Members) */}
                       <div className="p-8">
                          <div className="flex items-center justify-between mb-6">
                             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                               <Users size={12} /> Team Members ({teamMembers.length})
                             </span>
                          </div>
  
                          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                             {teamMembers.length === 0 ? (
                               <div className="p-8 text-center rounded-3xl border border-dashed border-border bg-muted/10 opacity-60">
                                 <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                                 <p className="text-[9px] font-bold uppercase tracking-widest">No operatives assigned</p>
                               </div>
                             ) : (
                               teamMembers.map(member => (
                                 <div key={member.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border group/member">
                                    <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold">
                                         <User size={14} />
                                       </div>
                                       <div className="leading-tight">
                                          <p className="text-sm font-black text-foreground">{member.name}</p>
                                          <p className="text-[9px] font-bold text-muted-foreground uppercase">{member.designation}</p>
                                       </div>
                                    </div>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      disabled={isUpdating === member.id}
                                      onClick={() => handleAssign(member.id, null)}
                                      className="h-8 w-8 p-0 rounded-xl opacity-0 group-hover/member:opacity-100 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                    >
                                      <UserMinus size={14} />
                                    </Button>
                                 </div>
                               ))
                             )}
                          </div>
  
                          <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
                              <div className="flex -space-x-2">
                                 {teamMembers.slice(0, 4).map(m => (
                                   <div key={m.id} className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                     {m.name.charAt(0)}
                                   </div>
                                 ))}
                                 {teamMembers.length > 4 && (
                                   <div className="w-8 h-8 rounded-full bg-zinc-950 border-2 border-background flex items-center justify-center text-[10px] font-bold text-white">
                                     +{teamMembers.length - 4}
                                   </div>
                                 )}
                              </div>
                              <Button 
                                variant="ghost" 
                                className="text-[10px] font-black uppercase text-primary tracking-widest hover:bg-primary/5 rounded-xl gap-2"
                                onClick={() => {
                                  // Scroll to unassigned pool
                                  document.querySelector('.xl\\:col-span-4')?.scrollIntoView({ behavior: 'smooth' })
                                }}
                              >
                                <ArrowRightLeft size={12} /> Reassign Logic
                              </Button>
                          </div>
                       </div>
                    </Card>
                  )
                })}
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
