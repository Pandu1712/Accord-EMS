'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  X, 
  User, 
  Phone, 
  Mail, 
  Shield, 
  FileText, 
  Building2, 
  UserCog, 
  Briefcase, 
  MapPin, 
  Info, 
  HeartPulse, 
  GraduationCap,
  Activity,
  Calendar,
  AlertTriangle
} from 'lucide-react'
import { signUpAdmin } from '@/lib/firebase-auth'

interface Employee {
  id: string
  employeeNo: string
  name: string
  designation: string
  role: string
  team: string
  workMode: string
  employmentType: string
  dob: string
  joinDate: string
  status: 'active' | 'inactive'
  
  mobile: string
  email: string
  personalEmail: string
  emergencyContact: string
  
  probationStatus: string
  probationStart: string
  probationEnd: string
  pipStatus: string
  
  idCardStatus: string
  insuranceStatus: string
  certificates: string
  
  currentAddress: string
  permanentAddress: string
  salary?: string
  password?: string
  
  createdAt?: string
  updatedAt?: string
  remarks?: { date: string, author: string, action: string }[]
  teamLeadId?: string
  leaveBalances: {
    al: number
    ml: number
    compOff: number
  }
}

export default function EmployeesPage() {
  const { user, role, isSuperAdmin } = useAuth()
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  
  const initialFormData = {
    employeeNo: '',
    name: '',
    designation: '',
    role: 'employee',
    team: '',
    workMode: 'WFO',
    employmentType: 'Permanent',
    dob: '',
    joinDate: new Date().toISOString().split('T')[0],
    status: 'active' as 'active' | 'inactive',
    
    mobile: '',
    email: '',
    personalEmail: '',
    emergencyContact: '',
    
    probationStatus: 'Active',
    probationStart: '',
    probationEnd: '',
    pipStatus: 'NILL',
    
    idCardStatus: 'Yet to Issue',
    insuranceStatus: 'Yet to Issue',
    certificates: '',
    
    currentAddress: '',
    permanentAddress: '',
    salary: '',
    password: '',
    teamLeadId: '',
    leaveBalances: {
      al: 12,
      ml: 10,
      compOff: 0
    }
  }

  const [formData, setFormData] = useState(initialFormData)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (role !== 'admin' && !isSuperAdmin) {
      router.push('/dashboard')
    }
  }, [role, isSuperAdmin, router])

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setLoading(true)
        const employeesRef = collection(db, 'employees')
        const snapshot = await getDocs(employeesRef)
        
        const employeesData: Employee[] = snapshot.docs.map(doc => {
          const d = doc.data()
          return {
            id: doc.id,
            employeeNo: d.employeeNo || '',
            name: d.name || '',
            designation: d.designation || '',
            role: d.role || 'employee',
            team: d.team || '',
            workMode: d.workMode || 'WFO',
            employmentType: d.employmentType || 'Permanent',
            dob: d.dob || '',
            joinDate: d.joinDate || '',
            status: d.status || 'active',
            
            mobile: d.mobile || '',
            email: d.email || '',
            personalEmail: d.personalEmail || '',
            emergencyContact: d.emergencyContact || '',
            
            probationStatus: d.probationStatus || 'Active',
            probationStart: d.probationStart || '',
            probationEnd: d.probationEnd || '',
            pipStatus: d.pipStatus || 'NILL',
            
            idCardStatus: d.idCardStatus || 'Yet to Issue',
            insuranceStatus: d.insuranceStatus || 'Yet to Issue',
            certificates: d.certificates || '',
            
            currentAddress: d.currentAddress || '',
            permanentAddress: d.permanentAddress || '',
            salary: d.salary || '',
            password: d.password || '',
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
            remarks: d.remarks || [],
            teamLeadId: d.teamLeadId || '',
            leaveBalances: d.leaveBalances || { al: 12, ml: 10, compOff: 0 }
          }
        })
        
        setEmployees(employeesData)
      } catch (error) {
        console.error('Error loading employees:', error)
      } finally {
        setLoading(false)
      }
    }

    if (role === 'admin' || isSuperAdmin) {
      loadEmployees()
    }
  }, [role, isSuperAdmin])

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setIsSubmitting(true)

    try {
      if (!formData.employeeNo || !formData.email || !formData.name || !formData.designation) {
        setFormError('Required fields: Employee No, Email (Official), Name, Designation')
        return
      }

      // Check Super Admin limit if creating/updating to super-admin
      if (formData.role === 'super-admin' && !editingEmployee) {
        const usersRef = collection(db, 'users')
        const q = query(usersRef, where('role', '==', 'super-admin'))
        const snapshot = await getDocs(q)
        if (snapshot.size >= 2) {
          setFormError('Maximum limit of 2 Super Admins reached.')
          return
        }
      }

      const newRemark = {
        date: new Date().toISOString(),
        author: user?.email || (isSuperAdmin ? 'Super Admin' : 'Admin'),
        action: editingEmployee ? 'Profile Updated' : 'Account Registered'
      }

      const employeeData: any = {
        employeeNo: formData.employeeNo,
        name: formData.name,
        designation: formData.designation,
        role: formData.role || 'employee',
        team: formData.team,
        workMode: formData.workMode,
        employmentType: formData.employmentType,
        dob: formData.dob,
        joinDate: formData.joinDate,
        status: formData.status,
        
        mobile: formData.mobile,
        email: formData.email,
        personalEmail: formData.personalEmail,
        emergencyContact: formData.emergencyContact,
        
        probationStatus: formData.probationStatus,
        probationStart: formData.probationStart,
        probationEnd: formData.probationEnd,
        pipStatus: formData.pipStatus,
        
        idCardStatus: formData.idCardStatus,
        insuranceStatus: formData.insuranceStatus,
        certificates: formData.certificates,
        
        currentAddress: formData.currentAddress,
        permanentAddress: formData.permanentAddress,
        password: formData.password,
        updatedAt: new Date().toISOString(),
        totalBreakMs: 0,
        teamLeadId: formData.teamLeadId,
        leaveBalances: formData.leaveBalances,
        remarks: editingEmployee 
            ? [...(editingEmployee.remarks || []), newRemark]
            : [newRemark]
      }

      if (isSuperAdmin && formData.salary) {
        employeeData.salary = formData.salary
      }

      if (editingEmployee) {
        await updateDoc(doc(db, 'employees', editingEmployee.id), employeeData)
        // Also update role in users collection if changed
        if (isSuperAdmin && formData.role) {
            await updateDoc(doc(db, 'users', editingEmployee.id), {
                role: formData.role,
                name: formData.name,
                status: formData.status
            })
        }

        setEmployees(employees.map(e =>
          e.id === editingEmployee.id
            ? { ...e, ...employeeData }
            : e
        ))
      } else {
        if (!formData.password) {
          setFormError('Password is required for new accounts')
          return
        }
        
        const user = await signUpAdmin(formData.email, formData.password)

        const finalNewData = {
          ...employeeData,
          userId: user.uid,
          createdAt: new Date().toISOString(),
          passwordChangedAt: new Date().toISOString(),
        }

        await setDoc(doc(db, 'employees', user.uid), finalNewData)

        await setDoc(doc(db, 'users', user.uid), {
          email: formData.email,
          name: formData.name,
          role: isSuperAdmin ? (formData.role || 'employee') : 'employee',
          status: formData.status,
          createdAt: new Date().toISOString(),
          lastLogin: null,
        })

        setEmployees([...employees, {
          id: user.uid,
          ...finalNewData,
        }])
      }

      setFormData(initialFormData)
      setEditingEmployee(null)
      setIsModalOpen(false)
    } catch (error: any) {
      setFormError(error.message || 'Failed to save account')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteEmployee = async (employeeId: string) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      try {
        await deleteDoc(doc(db, 'employees', employeeId))
        setEmployees(employees.filter(e => e.id !== employeeId))
      } catch (error) {
        console.error('Error deleting employee:', error)
        alert('Failed to delete employee')
      }
    }
  }

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee)
    setFormData({
      employeeNo: employee.employeeNo,
      name: employee.name,
      designation: employee.designation,
      role: employee.role || 'employee',
      team: employee.team || '',
      workMode: employee.workMode || 'WFO',
      employmentType: employee.employmentType || 'Permanent',
      dob: employee.dob || '',
      joinDate: employee.joinDate,
      status: employee.status,
      
      mobile: employee.mobile,
      email: employee.email,
      personalEmail: employee.personalEmail || '',
      emergencyContact: employee.emergencyContact || '',
      
      probationStatus: employee.probationStatus || 'Active',
      probationStart: employee.probationStart || '',
      probationEnd: employee.probationEnd || '',
      pipStatus: employee.pipStatus || 'NILL',
      
      idCardStatus: employee.idCardStatus || 'Yet to Issue',
      insuranceStatus: employee.insuranceStatus || 'Yet to Issue',
      certificates: employee.certificates || '',
      
      currentAddress: employee.currentAddress || '',
      permanentAddress: employee.permanentAddress || '',
      salary: employee.salary || '',
      password: '',
      teamLeadId: employee.teamLeadId || '',
      leaveBalances: employee.leaveBalances || { al: 12, ml: 10, compOff: 0 }
    })
    setIsModalOpen(true)
  }

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeNo.toLowerCase().includes(searchTerm.toLowerCase())
  )
  if (role !== 'admin' && !isSuperAdmin) {
    return null
  }

  const [activeTab, setActiveTab] = useState<'identity' | 'employment' | 'communication' | 'payroll' | 'access'>('identity')

  const tabs = [
    { id: 'identity', label: 'Identity', icon: User },
    { id: 'employment', label: 'Work', icon: Briefcase },
    { id: 'communication', label: 'Contact', icon: Mail },
    { id: 'payroll', label: 'Leaves & HR', icon: Calendar },
    { id: 'access', label: 'Security', icon: Shield },
  ] as const

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight italic uppercase leading-none text-primary">Workforce Center</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-lg font-medium tracking-tight italic">Manage the ACCORD organizational ecosystem</p>
        </div>
        <Button
          onClick={() => {
            setEditingEmployee(null)
            setFormData(initialFormData)
            setFormError('')
            setActiveTab('identity')
            setIsModalOpen(true)
          }}
          className="gap-3 bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
        >
          <Plus size={20} />
          Register Agent
        </Button>
      </div>

      <Card className="p-4 bg-card border-none shadow-inner bg-muted/20">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <Input
            placeholder="Search by name, email, or employee system ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-14 rounded-2xl border-none bg-background shadow-sm focus:ring-primary/20 font-medium"
          />
        </div>
      </Card>

      <Card className="bg-card border border-border overflow-hidden rounded-[2.5rem] shadow-2xl">
        {loading ? (
          <div className="p-32 text-center animate-pulse flex flex-col items-center gap-6">
             <div className="w-16 h-16 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
             <p className="font-black text-muted-foreground tracking-[0.3em] uppercase text-xs">Synchronizing Core Database...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-32 text-center flex flex-col items-center gap-6 bg-muted/5">
             <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground/20">
                <Search size={40} />
             </div>
             <div>
                <p className="font-black text-foreground text-xl tracking-tight uppercase italic text-muted-foreground/40">Zero Matches Identified</p>
                <p className="text-sm text-muted-foreground/30 font-bold mt-1">Adjust search parameters to locate agents</p>
             </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Agent Profile</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Deployment</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Contact Node</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">System Credentials</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Status</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-muted/30 transition-all duration-300 group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-3xl bg-zinc-100 dark:bg-zinc-800 border border-border flex items-center justify-center text-zinc-500 font-black text-lg transition-all group-hover:bg-primary group-hover:text-white group-hover:rotate-6">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-foreground text-base tracking-tight leading-none mb-1.5 group-hover:text-primary transition-colors">{emp.name}</p>
                          <div className="flex flex-col gap-0.5">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60 leading-none">ID:// {emp.employeeNo}</p>
                            {emp.teamLeadId && (
                              <p className="text-[9px] font-black text-orange-600 uppercase tracking-tight leading-none">
                                Lead: {employees.find(e => e.id === emp.teamLeadId)?.name || 'Unknown'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                        <p className="text-sm font-black text-foreground mb-1">{emp.designation}</p>
                        <div className="flex gap-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-primary/5 rounded-md text-[9px] font-black text-primary border border-primary/20 uppercase tracking-widest leading-none">
                            {emp.employmentType}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-widest leading-none",
                            emp.role === 'super-admin' ? "bg-purple-500/10 text-purple-600 border-purple-500/20" :
                            emp.role === 'admin' ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                            emp.role === 'team-lead' ? "bg-orange-500/10 text-orange-600 border-orange-500/20" :
                            "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                          )}>
                            {emp.role || 'employee'}
                          </span>
                        </div>
                    </td>
                    <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground italic">
                            <Mail size={12} className="text-primary" /> {emp.email}
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground italic">
                            <Phone size={12} className="text-primary" /> {emp.mobile}
                          </div>
                        </div>
                    </td>
                    <td className="px-8 py-6">
                        <div className="flex flex-col gap-1 font-mono text-[9px] font-bold">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Shield size={10} className="text-primary" /> UID: <span className="text-foreground">{emp.id.substring(0, 10)}...</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <FileText size={10} className="text-primary" /> PW: <span className="text-foreground">{emp.password}</span>
                            </div>
                        </div>
                    </td>
                    <td className="px-8 py-6">
                        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm border transition-all ${
                          emp.status === 'active' 
                            ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                            : 'bg-red-500/10 text-red-600 border-red-500/20'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${emp.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                          {emp.status}
                        </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={() => handleEditEmployee(emp)}
                                className="p-3 text-zinc-500 hover:text-primary hover:bg-primary/10 rounded-2xl transition-all hover:scale-110 active:scale-90 border border-transparent hover:border-primary/20"
                            >
                                <Edit2 size={18} />
                            </button>
                            <button
                                onClick={() => handleDeleteEmployee(emp.id)}
                                className="p-3 text-zinc-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-2xl transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-90"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal - REFACTORED TO TABS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] sm:p-6 overflow-hidden">
          <Card className="w-full sm:max-w-5xl bg-card border-border shadow-[0_0_100px_rgba(0,0,0,0.5)] relative flex flex-col h-full sm:h-[85vh] rounded-none sm:rounded-[3rem] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 sm:p-8 border-b border-border bg-muted/40">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-16 h-16 bg-primary/10 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center text-primary shadow-inner">
                  {editingEmployee ? <UserCog size={24} /> : <Plus size={24} />}
                </div>
                <div>
                  <h2 className="text-xl sm:text-3xl font-black text-foreground tracking-tighter uppercase italic leading-none">
                    {editingEmployee ? 'Secure Reconfig' : 'New Deployment'}
                  </h2>
                  <p className="text-[10px] text-muted-foreground mt-1 sm:mt-1.5 font-black uppercase tracking-[0.2em] opacity-60">Organizational Level: Sector 7</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 sm:w-12 h-12 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-2xl transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex flex-1 flex-col sm:flex-row overflow-hidden">
              {/* Sidebar Tabs */}
              <div className="w-full sm:w-64 border-b sm:border-b-0 sm:border-r border-border bg-muted/20 p-4 sm:p-6 flex flex-row sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto no-scrollbar">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 sm:scale-105'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon size={16} />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                    </button>
                  )
                })}
              </div>

              {/* Form Content */}
              <form onSubmit={handleAddEmployee} className="flex-1 flex flex-col overflow-hidden bg-background">
                <div className="flex-1 overflow-y-auto p-6 sm:p-12 custom-scrollbar">
                  {formError && (
                    <div className="mb-8 p-4 rounded-2xl bg-red-500/10 text-red-600 text-[10px] sm:text-xs font-black border border-red-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                      <AlertTriangle size={18} />
                      {formError}
                    </div>
                  )}

                  {/* TAB: Identity */}
                  {activeTab === 'identity' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Full Identity Name</label>
                          <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="OPERATIVE NAME"
                            className="h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-muted/30 border-none shadow-inner focus:ring-primary/20 font-black text-xs sm:text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">System Employee ID</label>
                          <Input
                            value={formData.employeeNo}
                            onChange={(e) => setFormData({ ...formData, employeeNo: e.target.value })}
                            placeholder="ID-XXXXXX"
                            className="h-14 rounded-2xl bg-muted/30 border-none shadow-inner focus:ring-primary/20 font-black"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Official Designation</label>
                          <Input
                            value={formData.designation}
                            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                            placeholder="OPERATIONAL ROLE"
                            className="h-14 rounded-2xl bg-muted/30 border-none shadow-inner focus:ring-primary/20 font-black italic"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Date of Birth</label>
                          <Input
                            type="date"
                            value={formData.dob}
                            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                            className="h-14 rounded-2xl bg-muted/30 border-none shadow-inner font-black"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB: Employment */}
                  {activeTab === 'employment' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Access Tier</label>
                          <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full h-14 px-4 bg-muted/30 border-none rounded-2xl text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="employee">Standard Employee</option>
                            <option value="team-lead">Team Lead</option>
                            <option value="admin">System Admin</option>
                            {isSuperAdmin && <option value="super-admin">Super Admin</option>}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Deployment Sector</label>
                          <Input
                            value={formData.team}
                            onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                            placeholder="GLOBAL / LOCAL"
                            className="h-14 rounded-2xl bg-muted/30 border-none shadow-inner font-black"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Work Configuration</label>
                          <select
                            value={formData.workMode}
                            onChange={(e) => setFormData({ ...formData, workMode: e.target.value })}
                            className="w-full h-14 px-4 bg-muted/30 border-none rounded-2xl text-xs font-black uppercase tracking-widest outline-none"
                          >
                            <option value="WFO">WFO (Office)</option>
                            <option value="WFH">WFH (Home)</option>
                            <option value="Hybrid">Hybrid System</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Deployment Date</label>
                          <Input
                            type="date"
                            value={formData.joinDate}
                            onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                            className="h-14 rounded-2xl bg-muted/30 border-none shadow-inner font-black"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Probation Status</label>
                          <select
                            value={formData.probationStatus}
                            onChange={(e) => setFormData({ ...formData, probationStatus: e.target.value })}
                            className="w-full h-14 px-4 bg-muted/30 border-none rounded-2xl text-xs font-black uppercase tracking-widest outline-none"
                          >
                            <option value="Active">Operational Trial</option>
                            <option value="Completed">Full Deployment</option>
                            <option value="N/A">Not Applicable</option>
                          </select>
                        </div>
                        {formData.role === 'employee' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Reporting Team Lead</label>
                            <select
                              value={formData.teamLeadId}
                              onChange={(e) => setFormData({ ...formData, teamLeadId: e.target.value })}
                              className="w-full h-14 px-4 bg-muted/30 border-none rounded-2xl text-xs font-black uppercase tracking-widest outline-none"
                            >
                              <option value="">No Team Lead</option>
                              {employees.filter(e => e.role === 'team-lead').map(tl => (
                                <option key={tl.id} value={tl.id}>{tl.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB: Communication */}
                  {activeTab === 'communication' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Official Comms Mobile</label>
                          <Input
                            value={formData.mobile}
                            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                            placeholder="+91-0000000000"
                            className="h-14 rounded-2xl bg-muted/30 border-none shadow-inner font-black"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Official Comms Email</label>
                          <Input
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="agent@accord.systems"
                            className="h-14 rounded-2xl bg-muted/30 border-none shadow-inner font-black italic text-primary"
                            disabled={!!editingEmployee}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Personal Recovery Email</label>
                          <Input
                            value={formData.personalEmail}
                            onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                            placeholder="agent@private.web"
                            className="h-14 rounded-2xl bg-muted/30 border-none shadow-inner font-bold"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Emergency Contact Node</label>
                          <Input
                            value={formData.emergencyContact}
                            onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                            placeholder="NODE / NUMBER"
                            className="h-14 rounded-2xl bg-muted/30 border-none shadow-inner font-black"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Current Residency Address</label>
                          <textarea
                            value={formData.currentAddress}
                            onChange={(e) => setFormData({ ...formData, currentAddress: e.target.value })}
                            rows={3}
                            className="w-full p-4 rounded-3xl bg-muted/30 border-none shadow-inner outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                          />
                        </div>
                    </div>
                  )}

                  {/* TAB: Payroll & Leaves */}
                  {activeTab === 'payroll' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Annual Leave (AL)</label>
                            <Input
                                type="number"
                                value={formData.leaveBalances.al}
                                onChange={(e) => setFormData({ 
                                    ...formData, 
                                    leaveBalances: { ...formData.leaveBalances, al: parseInt(e.target.value) || 0 } 
                                })}
                                className="h-14 rounded-2xl bg-muted/30 border-none shadow-inner font-black text-xl text-blue-600"
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Medical Leave (ML)</label>
                            <Input
                                type="number"
                                value={formData.leaveBalances.ml}
                                onChange={(e) => setFormData({ 
                                    ...formData, 
                                    leaveBalances: { ...formData.leaveBalances, ml: parseInt(e.target.value) || 0 } 
                                })}
                                className="h-14 rounded-2xl bg-muted/30 border-none shadow-inner font-black text-xl text-green-600"
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Comp Off</label>
                            <Input
                                type="number"
                                value={formData.leaveBalances.compOff}
                                onChange={(e) => setFormData({ 
                                    ...formData, 
                                    leaveBalances: { ...formData.leaveBalances, compOff: parseInt(e.target.value) || 0 } 
                                })}
                                className="h-14 rounded-2xl bg-muted/30 border-none shadow-inner font-black text-xl text-orange-600"
                            />
                         </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {isSuperAdmin && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Compensation Package (INR)</label>
                                <Input
                                    type="number"
                                    value={formData.salary}
                                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                                    className="h-14 rounded-2xl bg-primary/5 border-none shadow-inner font-black text-2xl text-primary"
                                />
                            </div>
                          )}
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Employment Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                className="w-full h-14 px-4 bg-muted/30 border-none rounded-2xl text-xs font-black uppercase tracking-widest outline-none"
                            >
                                <option value="active">Active Protocol</option>
                                <option value="inactive">Suspended Node</option>
                            </select>
                          </div>
                       </div>
                    </div>
                  )}

                  {/* TAB: Access */}
                  {activeTab === 'access' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                       {!editingEmployee ? (
                         <div className="space-y-2 max-w-md">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Initial System Password</label>
                            <Input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="MINIMUM 8 CHARACTERS"
                                className="h-14 rounded-2xl bg-muted/30 border-none shadow-inner font-black"
                            />
                            <p className="text-[9px] font-bold text-red-500/60 uppercase tracking-widest ml-1">Caution: This will be the agent's primary access key.</p>
                         </div>
                       ) : (
                         <div className="p-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] text-center">
                            <Shield className="mx-auto mb-4 text-primary" size={48} />
                            <h4 className="font-black uppercase tracking-tighter text-lg">Identity Lock Active</h4>
                            <p className="text-xs text-muted-foreground font-medium mt-2">Credentials can only be reset via the Global Security Module.</p>
                         </div>
                       )}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-8 border-t border-border bg-muted/40 flex items-center justify-between">
                  <div className="flex gap-2">
                     {tabs.map(t => (
                        <div key={t.id} className={`w-3 h-3 rounded-full transition-all ${activeTab === t.id ? 'bg-primary scale-125' : 'bg-muted-foreground/20'}`} />
                     ))}
                  </div>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsModalOpen(false)}
                      className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] border-border hover:bg-muted"
                    >
                      Abort Task
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-14 px-12 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:scale-[1.05] active:scale-[0.95] transition-all"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                           <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                           Processing...
                        </div>
                      ) : editingEmployee ? 'Commit Changes' : 'Initialize Deployment'}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
