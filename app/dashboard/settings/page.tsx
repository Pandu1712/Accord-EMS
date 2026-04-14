'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'
import { Settings as SettingsIcon, Bell, Shield, Database } from 'lucide-react'

export default function SettingsPage() {
  const { role } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (role !== 'super-admin') {
      router.push('/dashboard')
    }
  }, [role, router])

  if (role !== 'super-admin') {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
        <p className="text-muted-foreground mt-2">Configure system-wide settings and preferences</p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card className="p-6 bg-card">
          <div className="flex items-start gap-4">
            <SettingsIcon className="text-primary mt-1" size={24} />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-2">General Settings</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure basic system settings like application name and timezone
              </p>
              <Button variant="outline" className="w-full justify-center">
                Manage
              </Button>
            </div>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card className="p-6 bg-card">
          <div className="flex items-start gap-4">
            <Bell className="text-primary mt-1" size={24} />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-2">Notifications</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure email and system notifications for all users
              </p>
              <Button variant="outline" className="w-full justify-center">
                Manage
              </Button>
            </div>
          </div>
        </Card>

        {/* Security Settings */}
        <Card className="p-6 bg-card">
          <div className="flex items-start gap-4">
            <Shield className="text-primary mt-1" size={24} />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-2">Security</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Manage password policies and user session settings
              </p>
              <Button variant="outline" className="w-full justify-center">
                Manage
              </Button>
            </div>
          </div>
        </Card>

        {/* Database Settings */}
        <Card className="p-6 bg-card">
          <div className="flex items-start gap-4">
            <Database className="text-primary mt-1" size={24} />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-2">Database</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Backup and restore database, view storage usage
              </p>
              <Button variant="outline" className="w-full justify-center">
                Manage
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* System Information */}
      <Card className="p-6 bg-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Application Version</p>
            <p className="text-lg font-medium text-foreground">1.0.0</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Updated</p>
            <p className="text-lg font-medium text-foreground">{new Date().toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Environment</p>
            <p className="text-lg font-medium text-foreground">Production</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="text-lg font-medium text-green-600">Operational</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
