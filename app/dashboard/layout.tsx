'use client'

import { Sidebar } from '@/components/sidebar'
import { AnnouncementBanner } from '@/components/announcement-banner'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, role, loading, isSuperAdmin, isEmployee } = useAuth()
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    // Redirect if not loading and no session (neither Firebase user nor custom role) exists
    if (!loading && !user && !role) {
      router.push('/login')
    }
  }, [user, role, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Allow access for super admin, employee, or Firebase authenticated users
  if (!isSuperAdmin && !isEmployee && !user) {
    return null
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background overflow-hidden font-sans">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border z-30">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-950 rounded-lg flex items-center justify-center p-1">
                <Image 
                    src="https://accordinnovations.com/images/aawhite.png" 
                    alt="Logo" 
                    width={24} 
                    height={24} 
                    className="object-contain"
                />
            </div>
            <span className="text-sm font-black tracking-tighter">ACCORD EMS</span>
        </div>
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="rounded-xl"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </div>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 overflow-auto bg-slate-50/50 dark:bg-transparent">
        <div className="p-4 md:p-10 max-w-7xl mx-auto w-full">
          <AnnouncementBanner />
          {children}
        </div>
      </main>
    </div>
  )
}
