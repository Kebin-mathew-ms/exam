import React, { useState, useEffect } from 'react'
import { GraduationCap, ShieldCheck, Mail, Phone, Calendar, UserCheck, MapPin, Eye, Mic, Volume2 } from 'lucide-react'
import useAuth from '../hooks/useAuth'
import useToast from '../hooks/useToast'
import apiClient from '../services/api'
import Loader from '../components/Loader'

export default function Profile() {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [profileLoading, setProfileLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [activeTab, setActiveTab] = useState('academic') // 'academic', 'accessibility'

  // Academic Profile states
  const [profileData, setProfileData] = useState({
    enrollment_number: '',
    date_of_birth: '',
    gender: '',
    address: '',
  })

  // Accessibility Settings states
  const [accessData, setAccessData] = useState({
    voice_enabled: true,
    voice_gender: 'female',
    voice_speed: 1.00,
    voice_pitch: 1.00,
    preferred_language: 'en',
    high_contrast_mode: false,
    large_font_mode: false,
    keyboard_navigation: true,
    auto_read_question: true,
    auto_read_options: true,
    auto_read_instructions: true,
    voice_confirmation: true,
    speech_recognition: true,
    screen_reader_optimization: true
  })

  useEffect(() => {
    async function loadData() {
      if (!user) return
      try {
        const [profileRes, accessRes] = await Promise.all([
          apiClient.get(`/api/users/${user.id}/profile`),
          apiClient.get('/api/accessibility/settings')
        ])

        if (profileRes.data.success) {
          const data = profileRes.data.data
          setProfileData({
            enrollment_number: data.enrollment_number || '',
            date_of_birth: data.date_of_birth || '',
            gender: data.gender || '',
            address: data.address || '',
          })
        }

        if (accessRes.data.success) {
          setAccessData(accessRes.data.data)
        }

      } catch (err) {
        console.warn('Error loading profile details:', err)
      } finally {
        setProfileLoading(false)
      }
    }
    loadData()
  }, [user])

  const handleSaveAcademic = async (e) => {
    e.preventDefault()
    setUpdating(true)
    try {
      const response = await apiClient.put(`/api/users/${user.id}/profile`, profileData)
      if (response.data.success) {
        toast('Academic profile updated successfully.', 'success')
      }
    } catch (err) {
      const errors = err.errors || []
      toast(errors[0] || err.message || 'Failed to update academic profile.', 'error')
    } finally {
      setUpdating(false)
    }
  }

  const handleSaveAccessibility = async (e) => {
    e.preventDefault()
    setUpdating(true)
    try {
      const response = await apiClient.put('/api/accessibility/settings', accessData)
      if (response.data.success) {
        toast('Accessibility options updated successfully.', 'success')
      }
    } catch (err) {
      toast(err.message || 'Failed to update options.', 'error')
    } finally {
      setUpdating(false)
    }
  }

  if (profileLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-6 text-sm">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">My Profile & Accessibility</h2>
        <p className="text-muted-foreground text-sm">Review profile details and customize accessibility support preferences.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b gap-4 select-none">
        <button
          onClick={() => setActiveTab('academic')}
          className={`pb-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'academic' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Academic Details
        </button>
        <button
          onClick={() => setActiveTab('accessibility')}
          className={`pb-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'accessibility' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Accessibility Settings
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Avatar Profile summary card */}
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-24 h-24 rounded-full bg-primary/10 text-primary border flex items-center justify-center font-bold text-3xl shadow-sm">
              {user?.profile_photo ? (
                <img src={user.profile_photo} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                `${user?.first_name?.[0] || 'U'}${user?.last_name?.[0] || ''}`
              )}
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">
                {user?.first_name} {user?.last_name}
              </h3>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                {user?.role?.name} Account
              </p>
            </div>
          </div>

          <div className="border-t border-dashed border-border pt-4 space-y-3 text-xs">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Email</span>
                <span className="text-foreground select-all">{user?.email}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Phone</span>
                <span className="text-foreground select-all">{user?.phone}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</span>
                <span className="text-emerald-600 dark:text-emerald-400 capitalize font-medium">{user?.status?.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tab Panels */}
        <div className="lg:col-span-2 bg-card border rounded-xl p-6 shadow-sm">
          
          {activeTab === 'academic' ? (
            // Academic Form panel
            <div className="space-y-6">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2 border-b pb-3">
                <GraduationCap className="w-5 h-5 text-primary" />
                Academic Enrollment Information
              </h3>

              <form onSubmit={handleSaveAcademic} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Enrollment Number
                    </label>
                    <input
                      type="text"
                      required
                      value={profileData.enrollment_number}
                      onChange={(e) => setProfileData({ ...profileData, enrollment_number: e.target.value })}
                      className="w-full p-2.5 bg-background border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      required
                      value={profileData.date_of_birth}
                      onChange={(e) => setProfileData({ ...profileData, date_of_birth: e.target.value })}
                      className="w-full p-2.5 bg-background border rounded-lg focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Gender
                    </label>
                    <select
                      value={profileData.gender}
                      onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                      className="w-full p-2.5 bg-background border rounded-lg focus:outline-none"
                    >
                      <option value="">Select option</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Residential Address
                  </label>
                  <textarea
                    value={profileData.address}
                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                    rows="3"
                    className="w-full p-2.5 bg-background border rounded-lg leading-relaxed focus:outline-none"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-white font-semibold rounded-lg shadow-sm transition-colors text-xs"
                  >
                    Save Profile Details
                  </button>
                </div>
              </form>
            </div>
          ) : (
            // Accessibility Options Panel
            <div className="space-y-6">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2 border-b pb-3">
                <Volume2 className="w-5 h-5 text-primary" />
                AI Voice & Contrast Settings
              </h3>

              <form onSubmit={handleSaveAccessibility} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Language preferred */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Narration Language
                    </label>
                    <select
                      value={accessData.preferred_language}
                      onChange={(e) => setAccessData({ ...accessData, preferred_language: e.target.value })}
                      className="w-full p-2.5 bg-background border rounded-lg focus:outline-none"
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi (हिन्दी)</option>
                      <option value="ml">Malayalam (മലയാളം)</option>
                    </select>
                  </div>

                  {/* Gender settings */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Voice Gender
                    </label>
                    <select
                      value={accessData.voice_gender}
                      onChange={(e) => setAccessData({ ...accessData, voice_gender: e.target.value })}
                      className="w-full p-2.5 bg-background border rounded-lg focus:outline-none"
                    >
                      <option value="female">Female Accent</option>
                      <option value="male">Male Accent</option>
                    </select>
                  </div>
                </div>

                {/* Range sliders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Voice Speed Rate ({accessData.voice_speed}x)
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={accessData.voice_speed}
                      onChange={(e) => setAccessData({ ...accessData, voice_speed: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Pitch Rate ({accessData.voice_pitch}x)
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={accessData.voice_pitch}
                      onChange={(e) => setAccessData({ ...accessData, voice_pitch: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>

                {/* Checklist options */}
                <div className="border-t border-dashed pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accessData.voice_enabled}
                      onChange={(e) => setAccessData({ ...accessData, voice_enabled: e.target.checked })}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="font-semibold text-foreground">Voice Narration Enabled</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accessData.speech_recognition}
                      onChange={(e) => setAccessData({ ...accessData, speech_recognition: e.target.checked })}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="font-semibold text-foreground">Speech Command Mic Enabled</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accessData.auto_read_question}
                      onChange={(e) => setAccessData({ ...accessData, auto_read_question: e.target.checked })}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="font-semibold text-foreground">Auto-Read Questions</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accessData.keyboard_navigation}
                      onChange={(e) => setAccessData({ ...accessData, keyboard_navigation: e.target.checked })}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="font-semibold text-foreground">Assistive Keyboard Nav</span>
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-white font-semibold rounded-lg shadow-sm transition-colors text-xs"
                  >
                    Save Accessibility preferences
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

      </div>

    </div>
  )
}
