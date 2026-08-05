import React from 'react'
import { Sun, Moon, LogOut, User, Menu } from 'lucide-react'
import useAuth from '../hooks/useAuth'
import { useTheme } from '../contexts/ThemeContext'

export default function Header({ onMenuToggle }) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-card/80 backdrop-blur-md flex h-16 items-center justify-between px-4 sm:px-6 shadow-sm">
      {/* Left side: Menu toggle for mobile & system brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-[#5D866C] bg-clip-text text-transparent">
            Aegis Exam System
          </span>
          <span className="hidden sm:inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            v1.0
          </span>
        </div>
      </div>

      {/* Right side: Actions, Theme, and Profile */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        {/* User Info & Avatar */}
        <div className="flex items-center gap-3 pl-2 border-l border-border">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-sm font-medium text-foreground leading-none">
              {user?.first_name} {user?.last_name}
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">
              {user?.role?.name}
            </span>
          </div>

          {/* Profile Photo Avatar */}
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary border flex items-center justify-center font-bold text-sm select-none">
            {user?.profile_photo ? (
              <img
                src={user.profile_photo}
                alt="Profile"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              `${user?.first_name?.[0] || 'U'}${user?.last_name?.[0] || ''}`
            )}
          </div>

          {/* Logout Trigger */}
          <button
            onClick={logout}
            className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 text-muted-foreground transition-colors ml-1"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
