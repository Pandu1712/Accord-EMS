'use client'

import { AlertTriangle, ExternalLink, ShieldCheck, Terminal } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function ConfigurationMissing() {
  const envVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ]

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 border-2 border-primary/20 shadow-2xl rounded-[2rem] overflow-hidden relative">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center animate-pulse shadow-inner border border-primary/20">
            <AlertTriangle className="text-primary w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-foreground">
              Deployment Sync <span className="text-primary tracking-normal">Status: Incomplete</span>
            </h1>
            <p className="text-muted-foreground font-medium text-lg max-w-md mx-auto italic">
              The application core is active, but the Firebase bridge has not been established for this environment.
            </p>
          </div>

          <div className="w-full bg-muted/50 rounded-3xl p-6 border border-border text-left space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Terminal size={18} className="text-primary" />
              <span className="text-xs font-black uppercase tracking-widest opacity-60">Missing Environment Variables</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {envVars.map((v) => (
                <div key={v} className="flex items-center gap-2 p-2 bg-background border border-border rounded-xl">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <code className="text-[10px] font-bold text-muted-foreground">{v}</code>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full pt-4">
            <Card className="p-5 border border-border bg-card/50 rounded-2xl text-left flex gap-4 transition-all hover:border-primary/50">
              <div className="p-3 bg-primary/10 rounded-xl h-fit">
                <ShieldCheck size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest mb-1">Local Config Found</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">Check your <code className="font-bold">.env.local</code> file for these values.</p>
              </div>
            </Card>
            
            <Card className="p-5 border border-border bg-card/50 rounded-2xl text-left flex gap-4 transition-all hover:border-primary/50">
              <div className="p-3 bg-primary/10 rounded-xl h-fit">
                <ExternalLink size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest mb-1">Vercel Setup</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">Go to <span className="font-bold">Project Settings &gt; Environment Variables</span> to add them.</p>
              </div>
            </Card>
          </div>

          <Button 
            onClick={() => window.location.reload()} 
            className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 group hover:scale-[1.02] transition-all"
          >
            I've added them, Reload Protocol
          </Button>
          
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 italic">
            ACCORD EMS System Diagnostic // Engine V8
          </p>
        </div>
      </Card>
    </div>
  )
}
