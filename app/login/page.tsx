'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { unifiedLogin } from '@/lib/auth-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { AlertCircle, ShieldCheck, UserCircle } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      console.log('[v8] Unified login attempt for:', identifier)
      const result = await unifiedLogin(identifier, password)
      
      if (result.success) {
        console.log('[v8] Login successful, role:', result.role)
        // Using window.location.href for a clean reload and context re-initialization
        window.location.href = '/dashboard'
      } else {
        setError(result.error || 'Failed to sign in')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      console.error('[v8] Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-black p-4 selection:bg-orange-500/30">
      <Card className="w-full max-w-md p-6 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-border/50 rounded-[3rem] bg-card/50 backdrop-blur-2xl relative overflow-hidden group">
        
        {/* Decorative Background Elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-all duration-700" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />

        <div className="text-center mb-12 flex flex-col items-center relative z-10">
          <div className="w-24 h-24 bg-zinc-950 rounded-[2.5rem] flex items-center justify-center p-5 shadow-2xl mb-8 group-hover:scale-105 transition-transform duration-500 border border-white/10">
            <Image 
                src="https://accordinnovations.com/images/aawhite.png" 
                alt="ACCORD Logo" 
                width={80} 
                height={80} 
                className="object-contain"
            />
          </div>
          <h1 className="text-5xl font-black text-foreground tracking-tighter mb-3 italic">
            ACCORD <span className="text-primary">EMS</span>
          </h1>
          <div className="flex items-center gap-2 px-4 py-1.5 bg-muted rounded-full border border-border/50">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground whitespace-nowrap">Enterprise Ecosystem</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-8 relative z-10">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="text-red-600 shrink-0" size={20} />
              <p className="text-red-600 dark:text-red-400 text-xs font-bold leading-tight">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="identifier" className="text-[10px] font-black uppercase tracking-[0.2em] ml-1 text-muted-foreground">USER ID / SYSTEM ID</Label>
              <div className="relative group/input">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/input:text-primary transition-colors">
                    <UserCircle size={20} />
                </div>
                <Input
                    id="identifier"
                    type="text"
                    placeholder="e.g. EMP001 / ACCORD123"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    disabled={loading}
                    className="h-14 pl-12 rounded-2xl bg-muted/30 border-none shadow-inner focus:ring-2 focus:ring-primary/20 font-bold transition-all placeholder:text-muted-foreground/30"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.2em] ml-1 text-muted-foreground">SECURITY CREDENTIALS</Label>
              <div className="relative group/input">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/input:text-primary transition-colors">
                    <ShieldCheck size={20} />
                </div>
                <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-14 pl-12 rounded-2xl bg-muted/30 border-none shadow-inner focus:ring-2 focus:ring-primary/20 font-bold transition-all placeholder:text-muted-foreground/30"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !identifier || !password}
            className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    <span>Synchronizing...</span>
                </div>
            ) : 'Access Core'}
          </Button>
        </form>

      </Card>
    </div>
  )
}
