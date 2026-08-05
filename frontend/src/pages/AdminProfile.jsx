import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { User, Key, ShieldCheck, Mail, Phone, ShieldAlert, Save } from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import useAuth from '../hooks/useAuth'
import Loader from '../components/Loader'
import AvatarUpload from '../components/AvatarUpload'

export default function AdminProfile() {
  const { toast } = useToast()
  const { user: authUser } = useAuth()
  
  const [profileLoading, setProfileLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [currentPhoto, setCurrentPhoto] = useState(null)

  // Profile data form
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    setValue: setProfileValue,
    formState: { errors: profileErrors },
  } = useForm({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
    },
  })

  // Password change form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    watch: watchPassword,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm({
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  })

  const newPasswordValue = watchPassword('new_password', '')

  // Password strength checker helper
  const getPasswordStrength = (pw) => {
    if (!pw) return { score: 0, text: 'Empty', color: 'bg-muted' }
    let score = 0
    if (pw.length >= 8) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[a-z]/.test(pw)) score++
    if (/\d/.test(pw)) score++
    if (/[!@#$%^&*(),.?\":{}|<>]/.test(pw)) score++

    const levels = [
      { text: 'Very Weak', color: 'bg-rose-500' },
      { text: 'Weak', color: 'bg-rose-400' },
      { text: 'Fair', color: 'bg-amber-400' },
      { text: 'Good', color: 'bg-indigo-400' },
      { text: 'Strong', color: 'bg-emerald-500' },
    ]
    return { score, ...levels[score - 1] }
  }

  const strength = getPasswordStrength(newPasswordValue)

  // Fetch current user details from profile endpoint
  const loadProfile = async () => {
    try {
      const response = await apiClient.get('/api/profile')
      if (response.data.success) {
        const u = response.data.data
        setProfileValue('first_name', u.first_name)
        setProfileValue('last_name', u.last_name)
        setProfileValue('email', u.email)
        setProfileValue('phone', u.phone)
        if (u.profile_photo) {
          setCurrentPhoto(u.profile_photo)
        }
      }
    } catch (err) {
      toast(err.message || 'Failed to retrieve profile data.', 'error')
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const handleProfileSubmit = async (data) => {
    setSavingProfile(true)
    try {
      const response = await apiClient.put('/api/profile', data)
      if (response.data.success) {
        toast('Profile details updated successfully.', 'success')
        
        // Update user storage
        const userRes = await apiClient.get('/api/auth/me')
        if (userRes.data.success) {
          localStorage.setItem('user', JSON.stringify(userRes.data.data))
        }
      }
    } catch (err) {
      const errors = err.errors || []
      toast(errors[0] || err.message || 'Failed to update profile.', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (data) => {
    if (data.new_password !== data.confirm_password) {
      toast('Passwords do not match.', 'error')
      return
    }

    setChangingPassword(true)
    try {
      const response = await apiClient.post('/api/profile/change-password', {
        current_password: data.current_password,
        new_password: data.new_password,
      })
      if (response.data.success) {
        toast('Password changed successfully.', 'success')
        resetPasswordForm()
      }
    } catch (err) {
      const errors = err.errors || []
      toast(errors[0] || err.message || 'Failed to change password.', 'error')
    } finally {
      setChangingPassword(false)
    }
  }

  const handlePhotoUpload = async (file) => {
    setPhotoLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await apiClient.post('/api/profile/photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      if (response.data.success) {
        toast('Profile image updated.', 'success')
        setCurrentPhoto(response.data.data.profile_photo)
        
        // Update local context user details
        const userRes = await apiClient.get('/api/auth/me')
        if (userRes.data.success) {
          localStorage.setItem('user', JSON.stringify(userRes.data.data))
        }
      }
    } catch (err) {
      toast(err.message || 'Failed to upload photo.', 'error')
    } finally {
      setPhotoLoading(false)
    }
  }

  if (profileLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">My Profile</h2>
        <p className="text-muted-foreground text-sm">Review profile details, upload photo, and adjust settings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Card: Photo Upload & Identity */}
        <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col items-center gap-6">
          <AvatarUpload currentSrc={currentPhoto} onUpload={handlePhotoUpload} loading={photoLoading} />
          
          <div className="w-full text-center space-y-1">
            <h3 className="font-bold text-lg text-foreground">
              {authUser?.first_name} {authUser?.last_name}
            </h3>
            <span className="inline-flex items-center rounded-md border bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/30 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider">
              {authUser?.role?.name.replace('_', ' ')}
            </span>
          </div>

          <div className="w-full border-t border-dashed pt-4 space-y-3 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Account Status:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold uppercase">{authUser?.status?.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Member Since:</span>
              <span className="text-foreground font-medium">{new Date(authUser?.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Right Section: Forms */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Edit Profile details */}
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
            <h4 className="font-semibold text-base text-foreground flex items-center gap-2 border-b pb-2.5">
              <User className="w-5 h-5 text-primary" />
              Profile Details
            </h4>
            
            <form onSubmit={handleSubmitProfile(handleProfileSubmit)} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">First Name</label>
                  <input
                    type="text"
                    disabled={savingProfile}
                    {...registerProfile('first_name', { required: 'First name is required' })}
                    className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  {profileErrors.first_name && <p className="text-xs text-rose-500 mt-1">{profileErrors.first_name.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Last Name</label>
                  <input
                    type="text"
                    disabled={savingProfile}
                    {...registerProfile('last_name', { required: 'Last name is required' })}
                    className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  {profileErrors.last_name && <p className="text-xs text-rose-500 mt-1">{profileErrors.last_name.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    disabled={savingProfile}
                    {...registerProfile('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                        message: 'Invalid email format',
                      },
                    })}
                    className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  {profileErrors.email && <p className="text-xs text-rose-500 mt-1">{profileErrors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    disabled={savingProfile}
                    {...registerProfile('phone', {
                      required: 'Phone number is required',
                      pattern: {
                        value: /^\+?[\d\s\-()]{7,20}$/,
                        message: 'Invalid phone format',
                      },
                    })}
                    className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  {profileErrors.phone && <p className="text-xs text-rose-500 mt-1">{profileErrors.phone.message}</p>}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-lg font-semibold shadow-sm transition-colors flex items-center gap-2"
                >
                  {savingProfile ? <Loader size="small" /> : <Save className="w-4 h-4" />}
                  <span>Save Profile Details</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Password Modifying */}
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
            <h4 className="font-semibold text-base text-foreground flex items-center gap-2 border-b pb-2.5">
              <Key className="w-5 h-5 text-primary" />
              Modify Password
            </h4>

            <form onSubmit={handleSubmitPassword(handlePasswordSubmit)} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Current Password</label>
                <input
                  type="password"
                  disabled={changingPassword}
                  {...registerPassword('current_password', { required: 'Current password is required' })}
                  className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                  placeholder="••••••••"
                />
                {passwordErrors.current_password && <p className="text-xs text-rose-500 mt-1">{passwordErrors.current_password.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">New Password</label>
                  <input
                    type="password"
                    disabled={changingPassword}
                    {...registerPassword('new_password', {
                      required: 'New password is required',
                      minLength: { value: 8, message: 'Password must be at least 8 characters' },
                    })}
                    className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                    placeholder="••••••••"
                  />
                  {passwordErrors.new_password && <p className="text-xs text-rose-500 mt-1">{passwordErrors.new_password.message}</p>}

                  {/* Password Strength Progress Bar */}
                  {newPasswordValue && (
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-semibold text-muted-foreground">
                        <span>Strength: {strength.text}</span>
                        <span>{strength.score} / 5</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${strength.color} transition-all duration-300`} 
                          style={{ width: `${(strength.score / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    disabled={changingPassword}
                    {...registerPassword('confirm_password', { required: 'Password confirmation is required' })}
                    className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                    placeholder="••••••••"
                  />
                  {passwordErrors.confirm_password && <p className="text-xs text-rose-500 mt-1">{passwordErrors.confirm_password.message}</p>}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-lg font-semibold shadow-sm transition-colors flex items-center gap-2"
                >
                  {changingPassword ? <Loader size="small" /> : <Save className="w-4 h-4" />}
                  <span>Change Password</span>
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>

    </div>
  )
}
