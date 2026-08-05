import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, ShieldCheck, UserCircle, Settings, LogOut,
  Bell, ChevronRight, Menu, X, User, Sun, Moon,
  BookOpen, HelpCircle, GraduationCap, CheckSquare, BarChart2,
} from 'lucide-react'
import useAuth from '../hooks/useAuth'
import { useTheme } from '../contexts/ThemeContext'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('admin_sidebar_collapsed') === 'true' } catch { return false }
  })
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    try { localStorage.setItem('admin_sidebar_collapsed', String(collapsed)) } catch {}
  }, [collapsed])

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const sidebarLinks = [
    { path: '/admin/dashboard',  label: 'Dashboard',           icon: <LayoutDashboard className="w-5 h-5 flex-shrink-0" /> },
    { path: '/admin/students',   label: 'Manage Students',     icon: <Users           className="w-5 h-5 flex-shrink-0" /> },
    { path: '/admin/admins',     label: 'Manage Admins',       icon: <ShieldCheck     className="w-5 h-5 flex-shrink-0" />, superAdminOnly: true },
    { path: '/admin/subjects',   label: 'Syllabus Master',     icon: <BookOpen        className="w-5 h-5 flex-shrink-0" /> },
    { path: '/admin/questions',  label: 'Question Bank',       icon: <HelpCircle      className="w-5 h-5 flex-shrink-0" /> },
    { path: '/admin/exams',      label: 'Exam Templates',      icon: <GraduationCap   className="w-5 h-5 flex-shrink-0" /> },
    { path: '/admin/evaluation', label: 'Manual Evaluations',  icon: <CheckSquare     className="w-5 h-5 flex-shrink-0" /> },
    { path: '/admin/analytics',  label: 'Analytics & Reports', icon: <BarChart2       className="w-5 h-5 flex-shrink-0" /> },
    { path: '/admin/profile',    label: 'My Profile',          icon: <UserCircle      className="w-5 h-5 flex-shrink-0" /> },
    { path: '/admin/settings',   label: 'Portal Settings',     icon: <Settings        className="w-5 h-5 flex-shrink-0" /> },
  ]

  const generateBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean)
    return paths.map((segment, index) => {
      const url = '/' + paths.slice(0, index + 1).join('/')
      const label = segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      return { url, label }
    })
  }
  const breadcrumbs = generateBreadcrumbs()

  const handleLogout = () => { logout(); navigate('/login') }

  const getAvatarSrc = () => {
    if (user?.profile_photo) {
      if (user.profile_photo.startsWith('uploads/') || user.profile_photo.startsWith('uploads\\')) {
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        return baseURL + '/' + user.profile_photo
      }
      return user.profile_photo
    }
    return null
  }
  const avatarSrc = getAvatarSrc()

  const NavItem = ({ link, isCollapsed }) => (
    <NavLink
      to={link.path}
      title={isCollapsed ? link.label : undefined}
      className={({ isActive }) =>
        'group relative flex items-center rounded-lg text-sm font-medium transition-all duration-150 ' +
        (isCollapsed ? 'justify-center px-0 py-3 mx-1 ' : 'gap-3 px-4 py-3 ') +
        (isActive
          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground')
      }
    >
      {link.icon}
      {!isCollapsed && <span className="truncate">{link.label}</span>}
      {isCollapsed && (
        <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg bg-foreground text-background text-xs font-semibold px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50">
          {link.label}
        </span>
      )}
    </NavLink>
  )

  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors duration-300">

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b bg-card/90 backdrop-blur-md flex h-16 items-center justify-between px-4 sm:px-6 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (window.innerWidth >= 1024) {
                setCollapsed(p => !p)
              } else {
                setMobileOpen(p => !p)
              }
            }}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors focus:outline-none"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-[#5D866C] bg-clip-text text-transparent">
            Aegis Admin Panel
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors" aria-label="Toggle theme">
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          <button className="relative p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors" aria-label="Notifications">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive animate-pulse" />
          </button>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(p => !p)}
              className="flex items-center gap-2 p-1.5 rounded-full border bg-background hover:bg-muted transition-colors focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border flex items-center justify-center font-bold text-xs">
                {avatarSrc
                  ? <img src={avatarSrc} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                  : (user?.first_name?.[0] || 'U') + (user?.last_name?.[0] || '')}
              </div>
            </button>
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-card shadow-2xl glass-panel p-2 z-50 animate-fade-in text-sm">
                  <div className="px-3 py-2 border-b pb-2 mb-1">
                    <p className="font-semibold text-foreground truncate">{user?.first_name} {user?.last_name}</p>
                    <p className="text-xs text-muted-foreground truncate capitalize">{user?.role?.name.replace('_', ' ')}</p>
                  </div>
                  <Link to="/admin/profile" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <User className="w-4 h-4" /><span>My Profile</span>
                  </Link>
                  <Link to="/admin/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Settings className="w-4 h-4" /><span>Portal Settings</span>
                  </Link>
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/20 transition-colors text-left">
                    <LogOut className="w-4 h-4" /><span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">

        {/* Desktop sidebar — collapses to icon rail */}
        <aside className={'hidden lg:flex flex-col border-r bg-card transition-all duration-300 ease-in-out overflow-hidden ' + (collapsed ? 'w-16' : 'w-64')}>
          <nav className="flex flex-col gap-0.5 p-2 flex-1 overflow-y-auto overflow-x-hidden pt-3">
            {sidebarLinks
              .filter(l => !l.superAdminOnly || user?.role?.name === 'super_admin')
              .map(l => <NavItem key={l.path} link={l} isCollapsed={collapsed} />)}
            <div className="mt-auto pt-3 border-t">
              <button
                onClick={handleLogout}
                className={'group relative w-full flex items-center rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/20 transition-all ' +
                  (collapsed ? 'justify-center px-0 py-3 mx-1' : 'gap-3 px-4 py-3')}
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>Logout</span>}
                {collapsed && (
                  <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg bg-foreground text-background text-xs font-semibold px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50">
                    Logout
                  </span>
                )}
              </button>
            </div>
          </nav>
        </aside>

        {/* Mobile drawer — slides in from left */}
        <aside className={'fixed top-0 bottom-0 left-0 z-50 w-72 border-r bg-card flex flex-col shadow-2xl transition-transform duration-300 lg:hidden ' + (mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
          <div className="flex h-16 items-center justify-between px-5 border-b flex-shrink-0">
            <span className="font-bold text-base bg-gradient-to-r from-primary to-[#5D866C] bg-clip-text text-transparent">
              Aegis Admin Panel
            </span>
            <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex flex-col gap-0.5 p-3 flex-1 overflow-y-auto pt-3">
            {sidebarLinks
              .filter(l => !l.superAdminOnly || user?.role?.name === 'super_admin')
              .map(l => <NavItem key={l.path} link={l} isCollapsed={false} />)}
            <div className="mt-auto pt-3 border-t">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/20 transition-all">
                <LogOut className="w-5 h-5" /><span>Logout</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <div className="bg-background border-b px-4 sm:px-6 py-3 flex items-center min-h-12 shadow-xs select-none">
            <nav className="flex items-center space-x-1.5 text-xs font-medium text-muted-foreground">
              <Link to="/admin/dashboard" className="hover:text-foreground transition-colors">Portal</Link>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.url}>
                  <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                  {idx === breadcrumbs.length - 1
                    ? <span className="text-foreground font-semibold truncate max-w-[150px]">{crumb.label}</span>
                    : <Link to={crumb.url} className="hover:text-foreground transition-colors truncate max-w-[150px]">{crumb.label}</Link>}
                </React.Fragment>
              ))}
            </nav>
          </div>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
            <div className="max-w-7xl mx-auto w-full animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>

      </div>
    </div>
  )
}