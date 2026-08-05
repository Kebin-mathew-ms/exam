import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  GraduationCap,
  Calendar,
  MapPin,
  Mail,
  Phone,
  UserCheck,
  ShieldCheck,
  ArrowLeft,
  Edit2,
  Users,
} from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import Loader from '../components/Loader'

export default function StudentDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStudent() {
      try {
        const response = await apiClient.get(`/api/admin/students/${id}`)
        if (response.data.success) {
          setStudent(response.data.data)
        }
      } catch (err) {
        toast(err.message || 'Failed to load student details.', 'error')
        navigate('/admin/students')
      } finally {
        setLoading(false)
      }
    }
    loadStudent()
  }, [id])

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader size="large" />
      </div>
    )
  }

  if (!student) return null

  // Resolve Profile Photo path
  const getAvatar = () => {
    if (student.profile_photo) {
      if (student.profile_photo.startsWith('uploads') || student.profile_photo.startsWith('uploads\\')) {
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        return `${baseURL}/${student.profile_photo}`
      }
      return student.profile_photo
    }
    return null
  }
  const avatarSrc = getAvatar()

  const accessibilityName = student.student_profile?.accessibility_requirement?.name || 'none'

  return (
    <div className="space-y-6">
      
      {/* Navigation Headers */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/students"
            className="p-2 rounded-lg border bg-card text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back to students list"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Student Profile</h2>
            <p className="text-muted-foreground text-xs font-mono">ID: #{student.id}</p>
          </div>
        </div>
        <Link
          to={`/admin/students/${student.id}/edit`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/95 text-sm font-semibold transition-colors shadow-sm self-start sm:self-auto"
        >
          <Edit2 className="w-4 h-4" />
          Edit Student
        </Link>
      </div>

      {/* Main Info Blocks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Avatar & Basic Contact card */}
        <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col items-center gap-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-24 h-24 rounded-full border bg-muted flex items-center justify-center font-bold text-3xl shadow-xs overflow-hidden">
              {avatarSrc ? (
                <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                `${student.first_name[0]}${student.last_name[0]}`
              )}
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">
                {student.first_name} {student.last_name}
              </h3>
              <p className="text-xs font-mono text-muted-foreground font-semibold">
                {student.student_profile?.enrollment_number || 'STU-N/A'}
              </p>
            </div>
          </div>

          <div className="w-full border-t border-dashed pt-4 space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Mail className="w-4.5 h-4.5 text-muted-foreground" />
              <div className="flex flex-col truncate">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Email</span>
                <span className="text-foreground truncate select-all">{student.email}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4.5 h-4.5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Phone</span>
                <span className="text-foreground select-all">{student.phone}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-500" />
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Account Status</span>
                <span className="text-emerald-600 dark:text-emerald-400 capitalize font-medium">{student.status.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed student profile details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Academic Data */}
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
            <h4 className="font-semibold text-base text-foreground flex items-center gap-2 border-b pb-3">
              <GraduationCap className="w-5 h-5 text-primary" />
              Academic Info
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Accessibility Category</span>
                <p className="font-medium text-foreground capitalize">
                  {accessibilityName.replace('_', ' ')}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Preferred Language</span>
                <p className="font-medium text-foreground uppercase">
                  {student.student_profile?.preferred_language || 'EN'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Date of Birth</span>
                <p className="font-medium text-foreground flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  {student.student_profile?.date_of_birth || 'N/A'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Gender</span>
                <p className="font-medium text-foreground">
                  {student.student_profile?.gender || 'N/A'}
                </p>
              </div>
            </div>
            <div className="space-y-1 pt-2">
              <span className="text-xs text-muted-foreground">Residential Address</span>
              <p className="font-medium text-foreground flex items-start gap-1.5 leading-relaxed">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                {student.student_profile?.address || 'N/A'}
              </p>
            </div>
          </div>

          {/* Card 2: Emergency / Guardian Contacts */}
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
            <h4 className="font-semibold text-base text-foreground flex items-center gap-2 border-b pb-3">
              <UserCheck className="w-5 h-5 text-primary" />
              Emergency & Guardian Info
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Guardian Name</span>
                <p className="font-medium text-foreground">
                  {student.student_profile?.guardian_name || 'N/A'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Guardian Phone</span>
                <p className="font-medium text-foreground font-mono">
                  {student.student_profile?.guardian_phone || 'N/A'}
                </p>
              </div>
            </div>
            <div className="space-y-1 pt-2">
              <span className="text-xs text-muted-foreground">Emergency Contact Details</span>
              <p className="font-medium text-foreground leading-relaxed">
                {student.student_profile?.emergency_contact || 'N/A'}
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}
