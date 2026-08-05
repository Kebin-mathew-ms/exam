import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Clock,
  Activity,
  Server,
  Key,
  Database,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import Loader from '../components/Loader'

export default function AdminDashboard() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [recentStudents, setRecentStudents] = useState([])
  const [recentLogins, setRecentLogins] = useState([])
  const [systemInfo, setSystemInfo] = useState(null)

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [statsRes, studentsRes, loginsRes, systemRes] = await Promise.all([
          apiClient.get('/api/admin/dashboard/statistics'),
          apiClient.get('/api/admin/dashboard/recent-users'),
          apiClient.get('/api/admin/dashboard/recent-logins'),
          apiClient.get('/api/admin/dashboard/system-info'),
        ])

        if (statsRes.data.success) setStats(statsRes.data.data)
        if (studentsRes.data.success) setRecentStudents(studentsRes.data.data)
        if (loginsRes.data.success) setRecentLogins(loginsRes.data.data)
        if (systemRes.data.success) setSystemInfo(systemRes.data.data)
      } catch (err) {
        toast(err.message || 'Failed to populate dashboard data.', 'error')
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader size="large" />
      </div>
    )
  }

  // Cards definitions
  const statCards = [
    {
      title: 'Total Students',
      value: stats?.total_students || 0,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/40',
      icon: <Users className="w-5 h-5" />,
    },
    {
      title: 'Active Students',
      value: stats?.active_students || 0,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40',
      icon: <ShieldCheck className="w-5 h-5" />,
    },
    {
      title: 'Inactive Students',
      value: stats?.inactive_students || 0,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40',
      icon: <ShieldAlert className="w-5 h-5" />,
    },
    {
      title: 'Total Admins',
      value: stats?.total_admins || 0,
      color: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/40',
      icon: <Key className="w-5 h-5" />,
    },
    {
      title: 'New Registrations',
      value: stats?.new_registrations_current_month || 0,
      sub: 'Current Month',
      color: 'text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-950/40',
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      title: 'Last Logins Count',
      value: stats?.last_login_count || 0,
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/40',
      icon: <Clock className="w-5 h-5" />,
    },
    {
      title: 'Active Sessions',
      value: stats?.active_sessions || 0,
      color: 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/40',
      icon: <Activity className="w-5 h-5" />,
    },
  ]

  return (
    <div className="space-y-8">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h2>
        <p className="text-muted-foreground text-sm">System administration summary metrics and activities log.</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <div key={idx} className="bg-card border rounded-xl p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{card.title}</p>
              <h3 className="text-2xl font-extrabold text-foreground">{card.value}</h3>
              {card.sub && <span className="text-[10px] text-muted-foreground">{card.sub}</span>}
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Section: Recent Students List */}
        <div className="lg:col-span-2 bg-card border rounded-xl p-6 shadow-xs flex flex-col gap-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h4 className="font-semibold text-base text-foreground">Recent Student Sign-ups</h4>
            <Link to="/admin/students" className="text-xs text-primary hover:underline font-semibold flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="text-xs font-semibold text-muted-foreground border-b uppercase tracking-wider">
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Reg No.</th>
                  <th className="py-2 text-right">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/10">
                    <td className="py-3 font-medium text-foreground">{s.first_name} {s.last_name}</td>
                    <td className="py-3 text-muted-foreground">{s.email}</td>
                    <td className="py-3 font-mono text-xs">{s.student_profile?.enrollment_number || 'N/A'}</td>
                    <td className="py-3 text-right text-muted-foreground text-xs">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {recentStudents.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-muted-foreground">No recent students found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Section: System Diagnostics & Actions */}
        <div className="flex flex-col gap-6">
          
          {/* Quick Actions Panel */}
          <div className="bg-card border rounded-xl p-6 shadow-xs flex flex-col gap-4">
            <h4 className="font-semibold text-base text-foreground border-b pb-3">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Link
                to="/admin/students"
                className="p-3 bg-muted hover:bg-primary hover:text-white transition-all text-center rounded-lg border font-semibold flex flex-col items-center gap-1.5"
              >
                <UserPlus className="w-5 h-5" />
                <span>Add Student</span>
              </Link>
              <Link
                to="/admin/admins"
                className="p-3 bg-muted hover:bg-primary hover:text-white transition-all text-center rounded-lg border font-semibold flex flex-col items-center gap-1.5"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>Add Admin</span>
              </Link>
            </div>
          </div>

          {/* System Info Diagnostic Card */}
          <div className="bg-card border rounded-xl p-6 shadow-xs flex flex-col gap-4">
            <h4 className="font-semibold text-base text-foreground border-b pb-3 flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              Diagnostics
            </h4>
            <div className="space-y-3 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Operating System:</span>
                <span className="text-foreground font-medium truncate max-w-[150px]" title={systemInfo?.os}>
                  {systemInfo?.os}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Python Engine:</span>
                <span className="text-foreground font-medium font-mono">{systemInfo?.python_version}</span>
              </div>
              <div className="flex justify-between">
                <span>Database Health:</span>
                <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <Database className="w-3.5 h-3.5" />
                  {systemInfo?.database_status}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Portal Uptime:</span>
                <span className="text-foreground font-medium font-mono">{systemInfo?.uptime}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Logins Log Audit view */}
      <div className="bg-card border rounded-xl p-6 shadow-xs flex flex-col gap-4">
        <h4 className="font-semibold text-base text-foreground border-b pb-3 flex items-center gap-2">
          <Clock className="w-4.5 h-4.5 text-primary" />
          Recent Access Auditing
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="text-xs font-semibold text-muted-foreground border-b uppercase tracking-wider">
                <th className="py-2">User ID</th>
                <th className="py-2">IP Address</th>
                <th className="py-2">Client User Agent</th>
                <th className="py-2 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentLogins.map((log) => (
                <tr key={log.id} className="hover:bg-muted/10">
                  <td className="py-3 font-medium text-foreground">User #{log.user_id}</td>
                  <td className="py-3 text-muted-foreground font-mono text-xs">{log.ip_address || 'N/A'}</td>
                  <td className="py-3 text-muted-foreground text-xs max-w-xs truncate" title={log.user_agent}>
                    {log.user_agent || 'Unknown'}
                  </td>
                  <td className="py-3 text-right text-muted-foreground text-xs">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
              {recentLogins.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-6 text-muted-foreground">No recent logins logged.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
