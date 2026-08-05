import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, ShieldAlert, Check } from 'lucide-react'
import useAuth from '../hooks/useAuth'
import useToast from '../hooks/useToast'
import Loader from '../components/Loader'

export default function Login() {
  const { login } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Redirect target
  const from = location.state?.from?.pathname || '/dashboard'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  })



  const onSubmit = async (data) => {
    setLoading(true)
    const result = await login(data.email, data.password)
    setLoading(false)

    if (result.success) {
      toast('Welcome back! Login successful.', 'success')
      navigate(from, { replace: true })
    } else {
      toast(result.message || 'Login failed. Please verify credentials.', 'error')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="w-full max-w-md space-y-8 glass-panel p-8 sm:p-10 rounded-2xl shadow-xl border">
        {/* Branding/Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/20">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
            Sign in to Portal
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Aegis Accessible Online Examination System
          </p>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email Address
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="text"
                  autoComplete="email"
                  disabled={loading}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                      message: 'Invalid email address format',
                    },
                  })}
                  className={`block w-full pl-10 pr-3 py-2.5 bg-background border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 ${
                    errors.email ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : 'border-input'
                  }`}
                  placeholder="name@exam.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-rose-500 flex items-center gap-1 font-medium">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  disabled={loading}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters',
                    },
                  })}
                  className={`block w-full pl-10 pr-10 py-2.5 bg-background border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 ${
                    errors.password ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : 'border-input'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-rose-500 flex items-center gap-1 font-medium">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {errors.password.message}
                </p>
              )}


            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 rounded-lg bg-primary hover:bg-primary/95 text-white text-sm font-semibold shadow-md shadow-primary/10 hover:shadow-primary/20 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              {loading ? <Loader size="small" className="mr-2" /> : 'Log In'}
            </button>
          </div>
        </form>

        {/* Demo credentials tips */}
        <div className="border-t border-dashed border-border pt-4 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Demo Accounts:</p>
          <div className="flex justify-between">
            <span>Admin: <span className="font-mono text-foreground select-all">admin@exam.com</span></span>
            <span className="font-mono">Admin123!</span>
          </div>
          <div className="flex justify-between">
            <span>Student: <span className="font-mono text-foreground select-all">student@exam.com</span></span>
            <span className="font-mono">Student123!</span>
          </div>
        </div>
      </div>
    </div>
  )
}
