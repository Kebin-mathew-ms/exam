import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save, ShieldAlert, ShieldCheck, Mail, Phone, Lock } from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import Loader from '../components/Loader'
import AvatarUpload from '../components/AvatarUpload'

export default function AdminForm() {
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
    formState: { errors },
  } = useForm({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      password: '',
      role_id: 3, // Default: normal Admin
      status_id: 1, // Default: Active
    },
  })

  // Load existing admin details if in edit mode
  useEffect(() => {
    async function loadAdmin() {
      if (!isEdit) return
      try {
        const response = await apiClient.get(`/api/admin/admins/${id}`)
        if (response.data.success) {
          const a = response.data.data
          setValue('first_name', a.first_name)
          setValue('last_name', a.last_name)
          setValue('email', a.email)
          setValue('phone', a.phone)
          setValue('role_id', a.role_id)
          setValue('status_id', a.status_id)
          
          if (a.profile_photo) {
            setCurrentPhoto(a.profile_photo)
          }
        }
      } catch (err) {
        toast(err.message || 'Failed to load administrator details.', 'error')
        navigate('/admin/admins')
      } finally {
        setDataLoading(false)
      }
    }
    loadAdmin()
  }, [id, isEdit, setValue])

  const onPhotoSelect = (file) => {
    setPhotoFile(file)
    if (isEdit) {
      uploadPhoto(id, file)
    }
  }

  const uploadPhoto = async (adminId, file) => {
    setPhotoLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      // Admins use same profile upload endpoint
      const response = await apiClient.post(`/api/admin/students/${adminId}/photo`, formData, {
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

    const payload = {
      ...formData,
      role_id: parseInt(formData.role_id),
      status_id: parseInt(formData.status_id),
    }

    try {
      if (isEdit) {
        // Edit mode
        if (!payload.password) delete payload.password
        const response = await apiClient.put(`/api/admin/admins/${id}`, payload)
        if (response.data.success) {
          toast('Administrator profile updated successfully.', 'success')
          navigate('/admin/admins')
        }
      } else {
        // Create mode
        const response = await apiClient.post('/api/admin/admins', payload)
        if (response.data.success) {
          const newAdmin = response.data.data
          toast('Administrator account created successfully.', 'success')

          if (photoFile) {
            await uploadPhoto(newAdmin.id, photoFile)
          }
          navigate('/admin/admins')
        }
      }
    } catch (err) {
      const errors = err.errors || []
      setFormError(errors[0] || err.message || 'Action failed')
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
      
      {/* Title Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/admin/admins"
          className="p-2 rounded-lg border bg-card text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Cancel editing"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {isEdit ? 'Edit Administrator Profile' : 'Register Administrator'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {isEdit ? 'Update administrator credentials, role access, and status.' : 'Register a new administrator account and security credentials.'}
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

        {/* Right Side: Form Inputs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
            <h4 className="font-semibold text-base text-foreground flex items-center gap-2 border-b pb-2.5">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Credentials & Role Settings
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
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Security Role</label>
                <select
                  disabled={loading}
                  {...register('role_id')}
                  className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value={3}>Normal Administrator</option>
                  <option value={1}>Super Administrator</option>
                </select>
              </div>
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

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Link
              to="/admin/admins"
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
              <span>Save Admin</span>
            </button>
          </div>
        </div>

      </form>

    </div>
  )
}
