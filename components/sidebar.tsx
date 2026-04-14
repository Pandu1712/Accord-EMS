'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Clock,
  LogOut,
  Moon,
  Sun,
  ChevronRight,
  Sparkles,
  BarChart3,
  Megaphone,
  LayoutGrid
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import Image from 'next/image'

const getNavItems = (role: string | null) => {
  const common = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  ]

  if (role === 'admin' || role === 'super-admin' || role === 'team-lead') {
    const items = [
      ...common,
      { label: 'My Attendance', href: '/dashboard/my-attendance', icon: Clock },
      { label: 'My Leaves', href: '/dashboard/my-leaves', icon: FileText },
    ]

    if (role === 'admin' || role === 'super-admin') {
      items.push(
        { label: 'Employees', href: '/dashboard/employees', icon: Users },
        { label: 'Team Organizer', href: '/dashboard/teams', icon: LayoutGrid }
      )
    }

    items.push(
      { label: 'Team Attendance', href: '/dashboard/attendance', icon: Clock },
      { label: 'Team Leaves', href: '/dashboard/leaves', icon: FileText },
      { label: 'Events', href: '/dashboard/events', icon: Sparkles },
      { label: 'Announcements', href: '/dashboard/announcements', icon: Megaphone },
      { label: 'Holidays', href: '/dashboard/holidays', icon: Calendar }
    )

    if (role === 'admin' || role === 'super-admin') {
      items.push(
        { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
        { label: 'Reports', href: '/dashboard/reports', icon: FileText }
      )
    }

    return items
  }

  return [
    ...common,
    { label: 'My Attendance', href: '/dashboard/my-attendance', icon: Clock },
    { label: 'My Leaves', href: '/dashboard/my-leaves', icon: FileText },
    { label: 'Holidays', href: '/dashboard/holidays', icon: Calendar },
  ]
}

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname()
  const { role, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navItems = getNavItems(role)

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" 
          onClick={onClose}
        />
      )}

      <div className={cn(
        "fixed md:static inset-y-0 left-0 z-50 flex h-full flex-col bg-card border-r border-border shadow-2xl transition-all duration-300 w-72 group/sidebar",
        !isOpen && "-translate-x-full md:translate-x-0"
      )}>
        {/* Premium Branding */}
        <div className="p-8 pb-10">
          <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-zinc-950 rounded-2xl flex items-center justify-center shadow-lg shadow-black/30 transform transition-transform group-hover/sidebar:rotate-6 p-2">
                  <Image 
                    src="https://accordinnovations.com/images/aawhite.png" 
                    alt="ACCORD Logo" 
                    width={40} 
                    height={40} 
                    className="object-contain"
                  />
              </div>
              <div>
                  <h1 className="text-xl font-black text-foreground tracking-tighter leading-none">ACCORD</h1>
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1">Enterprise EMS</p>
              </div>
          </div>
        </div>

      {/* Navigation */}
      <div className="flex-1 space-y-1.5 px-4 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 group relative',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <div className="flex items-center gap-3.5 relative z-10">
                <item.icon size={20} className={cn(
                    "transition-transform",
                    isActive ? "scale-110" : "group-hover:scale-110"
                )} />
                <span className="tracking-tight">{item.label}</span>
              </div>
              {!isActive && (
                 <ChevronRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
              )}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-2xl" />
              )}
            </Link>
          )
        })}
      </div>

      {/* Bottom Actions */}
      <div className="p-4 mt-auto space-y-3 bg-muted/20 border-t border-border/50">
        <div className="flex items-center gap-2 p-1.5 bg-background border border-border rounded-2xl">
            <Button
              variant={theme === 'light' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTheme('light')}
              className="flex-1 h-9 rounded-xl font-bold"
            >
              <Sun size={16} className="mr-2" />
              Day
            </Button>
            <Button
              variant={theme === 'dark' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTheme('dark')}
              className="flex-1 h-9 rounded-xl font-bold"
            >
              <Moon size={16} className="mr-2" />
              Night
            </Button>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-5 py-3 rounded-2xl text-sm font-black text-destructive hover:bg-destructive/10 transition-all duration-200 group border border-transparent hover:border-destructive/20"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="tracking-tight">Sign Out Session</span>
        </button>
      </div>
      </div>
    </>
  )
}
