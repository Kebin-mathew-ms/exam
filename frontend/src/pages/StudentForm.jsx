import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save, ShieldAlert, GraduationCap, Phone, Mail, UserPlus, Lock } from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import Loader from '../components/Loader'
import AvatarUpload from '../components/AvatarUpload'

export default function StudentForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const isEdit = !!id

  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(isEdit)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [currentPhoto, setCurrentPhoto] = useState(null)
  const [formError, setFormError] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      password: '',
      status_id: 1,
      enrollment_number: '',
      date_of_birth: '',
      gender: '',
      address: '',
      guardian_name: '',
      guardian_phone: '',
      emergency_contact: '',
      preferred_language: 'en',
      accessibility_requirement_id: 6,
    },
  })

  // Load existing student data if in edit mode
  useEffect(() => {
    async function loadStudent() {
      if (!isEdit) return
      try {
        const response = await apiClient.get(`/api/admin/students/${id}`)
        if (response.data.success) {
          const s = response.data.data
          setValue('first_name', s.first_name)
          setValue('last_name', s.last_name)
          setValue('email', s.email)
          setValue('phone', s.phone)
          setValue('status_id', s.status_id)
          
          if (s.profile_photo) {
            setCurrentPhoto(s.profile_photo)
          }

          if (s.student_profile) {
            const p = s.student_profile
            setValue('enrollment_number', p.enrollment_number || '')
            setValue('date_of_birth', p.date_of_birth || '')
            setValue('gender', p.gender || '')
            setValue('address', p.address || '')
            setValue('guardian_name', p.guardian_name || '')
            setValue('guardian_phone', p.guardian_phone || '')
            setValue('emergency_contact', p.emergency_contact || '')
            setValue('preferred_language', p.preferred_language || 'en')
            setValue('accessibility_requirement_id', p.accessibility_requirement_id || 6)
          }
        }
      } catch (err) {
        toast(err.message || 'Failed to load student details.', 'error')
        navigate('/admin/students')
      } finally {
        setDataLoading(false)
      }
    }
    loadStudent()
  }, [id, isEdit, setValue])

  const onPhotoSelect = (file) => {
    setPhotoFile(file)
    // If in edit mode, we can upload immediately for a faster responsive experience
    if (isEdit) {
      uploadPhoto(id, file)
    }
  }

  const uploadPhoto = async (studentId, file) => {
    setPhotoLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await apiClient.post(`/api/admin/students/${studentId}/photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      if (response.data.success) {
        toast('Profile image updated.', 'success')
        setCurrentPhoto(response.data.data.profile_photo)
      }
    } catch (err) {
      toast(err.message || 'Failed to upload photo.', 'error')
    } finally {
      setPhotoLoading(false)
    }
  }

  const onSubmit = async (formData) => {
    setLoading(true)
    setFormError('')

    // Standardize empty strings to null for backend mapping consistency
    const payload = {
      ...formData,
      status_id: parseInt(formData.status_id),
      accessibility_requirement_id: parseInt(formData.accessibility_requirement_id),
    }

    if (!payload.enrollment_number) delete payload.enrollment_number
    if (!payload.date_of_birth) delete payload.date_of_birth

    try {
      if (isEdit) {
        // Edit mode
        if (!payload.password) delete payload.password // don't send empty pw
        const response = await apiClient.put(`/api/admin/students/${id}`, payload)
        if (response.data.success) {
          toast('Student profile saved successfully.', 'success')
          navigate(`/admin/students/${id}`)
        }
      } else {
        // Create mode
        const response = await apiClient.post('/api/admin/students', payload)
        if (response.data.success) {
          const newStudent = response.data.data
          toast('Student user account created.', 'success')

          // If photo was selected, upload it now
          if (photoFile) {
            await uploadPhoto(newStudent.id, photoFile)
          }
          navigate('/admin/students')
        }
      }
    } catch (err) {
      const errors = err.errors || []
      setFormError(errors[0] || err.message || 'Saving failed')
    } finally {
      setLoading(false)
    }
  }

  if (dataLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      {/* Title Bar */}
      <div className="flex items-center gap-3">
        <Link
          to={isEdit ? `/admin/students/${id}` : '/admin/students'}
          className="p-2 rounded-lg border bg-card text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Cancel editing"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {isEdit ? 'Edit Student Profile' : 'Register Student'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {isEdit ? 'Modify student registration info and accessibility values.' : 'Create a new student login and details profile.'}
          </p>
        </div>
      </div>

      {formError && (
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-200 text-xs font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          <span>{formError}</span>
        </div>
      )}

      {/* Form Submission */}
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start text-sm">
        
        {/* Left Side: Avatar Upload */}
        <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col items-center gap-4">
          <h4 className="font-semibold text-sm text-foreground text-center border-b w-full pb-2">Profile Photo</h4>
          <AvatarUpload currentSrc={currentPhoto} onUpload={onPhotoSelect} loading={photoLoading} />
        </div>

        {/* Right Side: Inputs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Account Credentials */}
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
            <h4 className="font-semibold text-base text-foreground flex items-center gap-2 border-b pb-2.5">
              <Mail className="w-5 h-5 text-primary" />
              Credentials & Status
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">First Name</label>
                <input
                  type="text"
                  disabled={loading}
                  {...register('first_name', { required: 'First name is required' })}
                  className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                />
                {errors.first_name && <p className="text-xs text-rose-500 mt-1">{errors.first_name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Last Name</label>
                <input
                  type="text"
                  disabled={loading}
                  {...register('last_name', { required: 'Last name is required' })}
                  className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                />
                {errors.last_name && <p className="text-xs text-rose-500 mt-1">{errors.last_name.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  disabled={loading}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                      message: 'Invalid email format',
                    },
                  })}
                  className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                />
                {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Phone Number</label>
                <input
                  type="text"
                  disabled={loading}
                  {...register('phone', {
                    required: 'Phone number is required',
                    pattern: {
                      value: /^\+?[\d\s\-()]{7,20}$/,
                      message: 'Invalid phone format',
                    },
                  })}
                  className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                  placeholder="+1234567890"
                />
                {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Password {!isEdit && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="password"
                  disabled={loading}
                  {...register('password', {
                    required: !isEdit ? 'Password is required' : false,
                    minLength: !isEdit ? { value: 8, message: 'Password must be at least 8 characters' } : false,
                  })}
                  className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                  placeholder={isEdit ? '•••••••• (leave blank to retain)' : '••••••••'}
                />
                {errors.password && <p className="text-xs text-rose-500 mt-1">{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Account Status</label>
                <select
                  disabled={loading}
                  {...register('status_id')}
                  className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value={1}>Active</option>
                  <option value={2}>Inactive</option>
                  <option value={3}>Blocked</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: Student Metadata Profile */}
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
            <h4 className="font-semibold text-base text-foreground flex items-center gap-2 border-b pb-2.5">
              <GraduationCap className="w-5 h-5 text-primary" />
              Academic Info & Accessibility
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Enrollment Number</label>
                <input
                  type="text"
                  disabled={loading}
                  {...register('enrollment_number')}
                  className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                  placeholder="Auto-generated if left blank"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Date of Birth</label>
                <input
                  type="date"
                  disabled={loading}
                  {...register('date_of_birth')}
                  className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Gender</label>
                <select
                  disabled={loading}
                  {...register('gender')}
                  className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="">Select option</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Preferred Language</label>
                <select
                  disabled={loading}
                  {...register('preferred_language')}
                  className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="en">English (EN)</option>
                  <option value="es">Spanish (ES)</option>
                  <option value="fr">French (FR)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Accessibility Requirement</label>
              <select
                disabled={loading}
                {...register('accessibility_requirement_id')}
                className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value={6}>None (No accommodations)</option>
                <option value={1}>Blind</option>
                <option value={2}>Low Vision</option>
                <option value={3}>Hearing Impaired</option>
                <option value={4}>Mobility Assistance</option>
                <option value={5}>Learning Disability</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Residential Address</label>
              <textarea
                disabled={loading}
                {...register('address')}
                rows={3}
                className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none leading-relaxed"
                placeholder="Street Address, City, ZIP, Country"
              />
            </div>
          </div>

          {/* Card 3: Guardian & Contact info */}
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
            <h4 className="font-semibold text-base text-foreground flex items-center gap-2 border-b pb-2.5">
              <Phone className="w-5 h-5 text-primary" />
              Emergency Contact & Guardian Info
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Guardian Name</label>
                <input
                  type="text"
                  disabled={loading}
                  {...register('guardian_name')}
                  className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Guardian Phone</label>
                <input
                  type="text"
                  disabled={loading}
                  {...register('guardian_phone')}
                  className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                  placeholder="+1234567890"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Emergency Contact Details</label>
              <textarea
                disabled={loading}
                {...register('emergency_contact')}
                rows={2}
                className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none leading-relaxed"
                placeholder="Emergency Contact Name, Relationship, and Phone number..."
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Link
              to={isEdit ? `/admin/students/${id}` : '/admin/students'}
              className="px-5 py-2.5 border rounded-lg hover:bg-muted font-medium transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-lg font-semibold shadow-sm transition-colors flex items-center gap-2 focus:ring-2 focus:ring-primary focus:outline-none"
            >
              {loading ? <Loader size="small" /> : <Save className="w-4 h-4" />}
              <span>Save Student</span>
            </button>
          </div>

        </div>

      </form>

    </div>
  )
}
