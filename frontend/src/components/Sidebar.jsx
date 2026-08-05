import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, GraduationCap, UserCircle, Shield, X, Award, BarChart2 } from 'lucide-react'
import useAuth from '../hooks/useAuth'

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth()

  // Navigation schema configured for student portal (Prompt 4 + Prompt 6)
  const links = [
    {
      path: '/student/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      path: '/student/exams',
      label: 'My Exams',
      icon: <GraduationCap className="w-5 h-5" />,
    },
    {
      path: '/student/certificates',
      label: 'My Certificates',
      icon: <Award className="w-5 h-5" />,
    },
    {
      path: '/student/analytics',
      label: 'My Performance',
      icon: <BarChart2 className="w-5 h-5" />,
    },
    {
      path: '/student/profile',
      label: 'My Profile',
      icon: <UserCircle className="w-5 h-5" />,
    },
  ]

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 border-r bg-card transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:h-[calc(100vh-4rem)] lg:z-0`}
      >
        <div className="flex h-16 items-center justify-between px-6 lg:hidden border-b">
          <span className="font-bold text-base text-foreground">Menu</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex flex-col gap-1 p-4 h-full" aria-label="Sidebar navigation">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              {link.icon}
              <span>{link.label}</span>
            </NavLink>
          ))}

          {/* Security badge at bottom of sidebar */}
          <div className="mt-auto p-4 rounded-xl border border-dashed bg-muted/30 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
              <Shield className="w-4 h-4" />
              <span>Secure Session</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-normal">
              Authentication is validated using encrypted JWT access tokens with proctoring controls active.
            </p>
          </div>
        </nav>
      </aside>
    </>
  )
}
