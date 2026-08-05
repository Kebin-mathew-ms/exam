import React from 'react'
import { LayoutDashboard, Users, Clock, ShieldCheck, UserCheck, GraduationCap, Calendar, MapPin } from 'lucide-react'
import useAuth from '../hooks/useAuth'

export default function Dashboard() {
  const { user } = useAuth()
  const isAdmin = user?.role?.name === 'admin'

  const getGreeting = () => {
    const hrs = new Date().getHours()
    if (hrs < 12) return 'Good Morning'
    if (hrs < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  // Renders the Admin-specific dashboard
  const renderAdminDashboard = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Users */}
        <div className="bg-card border rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">System Users</p>
            <h3 className="text-3xl font-bold text-foreground">Active</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Security Status */}
        <div className="bg-card border rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Portal Status</p>
            <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">Secure</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* System Activity */}
        <div className="bg-card border rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Session Log</p>
            <h3 className="text-3xl font-bold text-foreground">Audit Active</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Admin Panel Details */}
      <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
        <h4 className="font-semibold text-lg text-foreground flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-primary" />
          System Administration Info
        </h4>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Welcome to the foundation layout of the Aegis Accessible Online Examination System. As an administrator, you have permission to manage user registrations, audit access logs, configure lookups, and supervise structural updates.
        </p>
        <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800/40 border text-xs font-mono text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Role Permissions:</span>
            <span className="text-foreground">Full CRUD Access</span>
          </div>
          <div className="flex justify-between">
            <span>Active DB Host:</span>
            <span className="text-foreground">Local MySQL Instance</span>
          </div>
        </div>
      </div>
    </div>
  )

  // Renders the Student-specific dashboard
  const renderStudentDashboard = () => (
    <div className="space-y-6">
      {/* Student Welcome Banner */}
      <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-foreground">Student Academic Profile</h3>
          <p className="text-sm text-muted-foreground">
            Enrollment No: <span className="font-mono text-foreground font-semibold">{user?.student_profile?.enrollment_number || 'STU-NEW'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium bg-muted px-3 py-1.5 rounded-lg border">
          <GraduationCap className="w-4 h-4 text-primary" />
          <span>Undergraduate Candidate</span>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
          <h4 className="font-semibold text-lg text-foreground flex items-center gap-2 border-b pb-3">
            <UserCheck className="w-5 h-5 text-primary" />
            Personal Details
          </h4>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Date of Birth:</span>
              <span className="text-foreground font-medium">{user?.student_profile?.date_of_birth || 'Not configured'}</span>
            </div>
            <div className="flex items-center gap-3">
              <GraduationCap className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Gender:</span>
              <span className="text-foreground font-medium">{user?.student_profile?.gender || 'Not configured'}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Address:</span>
              <span className="text-foreground font-medium">{user?.student_profile?.address || 'Not configured'}</span>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
          <h4 className="font-semibold text-lg text-foreground flex items-center gap-2 border-b pb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            Security & Contact
          </h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email Address:</span>
              <span className="text-foreground font-semibold">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone Number:</span>
              <span className="text-foreground font-semibold">{user?.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account Status:</span>
              <span className="capitalize text-emerald-600 dark:text-emerald-400 font-semibold">{user?.status?.name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary/10 via-indigo-500/5 to-transparent border rounded-2xl p-6 sm:p-8 flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
            {getGreeting()}, {user?.first_name}!
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Welcome to the accessible exam portal. Manage your profile, secure your account details, and browse controls.
          </p>
        </div>
      </div>

      {/* Render role specific panels */}
      {isAdmin ? renderAdminDashboard() : renderStudentDashboard()}
    </div>
  )
}
