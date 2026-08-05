import React from 'react'
import { Settings, ShieldCheck, Globe, Database, ToggleLeft } from 'lucide-react'

export default function PortalSettings() {
  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Portal Settings</h2>
        <p className="text-muted-foreground text-sm">Configure system preferences and global security behaviors.</p>
      </div>

      <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
        <h3 className="font-semibold text-lg text-foreground flex items-center gap-2 border-b pb-3">
          <Settings className="w-5 h-5 text-primary" />
          Global Parameters (Read-Only Placeholder)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          {/* Box 1 */}
          <div className="p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-900/10 space-y-3">
            <h4 className="font-bold text-foreground flex items-center gap-2">
              <Globe className="w-4.5 h-4.5 text-primary" />
              Localization & Display
            </h4>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Default Language:</span>
                <span className="text-foreground font-semibold">English (US)</span>
              </div>
              <div className="flex justify-between">
                <span>System Timezone:</span>
                <span className="text-foreground font-semibold">UTC (Universal Time)</span>
              </div>
            </div>
          </div>

          {/* Box 2 */}
          <div className="p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-900/10 space-y-3">
            <h4 className="font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-500" />
              Security Settings
            </h4>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>JWT Token Duration:</span>
                <span className="text-foreground font-semibold">30 Minutes</span>
              </div>
              <div className="flex justify-between">
                <span>Password Rotation Limit:</span>
                <span className="text-foreground font-semibold">90 Days</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
