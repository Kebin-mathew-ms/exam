import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, AlertTriangle, Play, HelpCircle, Settings, Calculator, ShieldAlert, Award } from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import Loader from '../components/Loader'

export default function ExamInstructions() {
  const { id } = useParams() // Exam ID
  const navigate = useNavigate()
  const { toast } = useToast()

  const [exam, setExam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accepted, setAccepted] = useState(false)
  const [btnLoading, setBtnLoading] = useState(false)

  useEffect(() => {
    async function loadInstructions() {
      try {
        const res = await apiClient.get(`/api/student/exams/${id}`)
        if (res.data.success) {
          setExam(res.data.data)
        }
      } catch (err) {
        toast('Failed to load exam details.', 'error')
        navigate('/student/exams')
      } finally {
        setLoading(false)
      }
    }
    loadInstructions()
  }, [id])

  const handleStartAttempt = async () => {
    if (!accepted) {
      toast('Please accept the rules to proceed.', 'error')
      return
    }

    setBtnLoading(true)
    try {
      const res = await apiClient.post('/api/student/exams/start', { exam_id: parseInt(id) })
      if (res.data.success) {
        const attemptId = res.data.data.attempt_id
        toast('Exam session started successfully.', 'success')
        
        // Go fullscreen and redirect
        navigate(`/student/exams/${id}/take`, { state: { attemptId } })
      }
    } catch (err) {
      const errors = err.errors || []
      toast(errors[0] || err.message || 'Starting attempt session failed.', 'error')
    } finally {
      setBtnLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-6 text-sm max-w-4xl mx-auto">
      
      {/* Title */}
      <div className="flex items-center gap-3">
        <Link
          to="/student/exams"
          className="p-2 rounded-lg border bg-card text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back to exams"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Exam Guidelines & Prep</h2>
          <p className="text-muted-foreground text-xs font-mono uppercase font-semibold">Exam: {exam?.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Detail Specifications (Col Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Guidelines Sheet */}
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-semibold text-base text-foreground border-b pb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              General Guidelines
            </h3>
            
            <div
              className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2 select-none"
              dangerouslySetInnerHTML={{ __html: exam?.instructions || 'No special guidelines posted.' }}
            />
          </div>

          {/* Section 2: Security Violations rules */}
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-3">
            <h3 className="font-semibold text-base text-foreground border-b pb-2.5 flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-5 h-5" />
              Strict Browser Integrity Rules
            </h3>
            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
              <li>Do not press refresh, change tabs, resize window, or minimize the browser window.</li>
              <li>Exiting Fullscreen mode is flagged as a direct proctoring security violation.</li>
              <li>Focus losses (clicking outside or opening widgets) are tracked and audit-logged in real-time.</li>
            </ul>
          </div>
        </div>

        {/* Right Side: Quick Specs & Start triggers */}
        <div className="space-y-6">
          
          {/* Card 1: Exam specs */}
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
            <h4 className="font-semibold text-base text-foreground border-b pb-3 flex items-center gap-2">
              <Settings className="w-4.5 h-4.5 text-primary" />
              Technical Specs
            </h4>
            <div className="space-y-3 text-xs text-muted-foreground">
              <div className="flex justify-between border-b pb-2">
                <span>Duration Limit:</span>
                <span className="text-foreground font-semibold font-mono">{exam?.duration_minutes} Minutes</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Total Marks:</span>
                <span className="text-foreground font-semibold">{exam?.total_marks} Marks</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Passing threshold:</span>
                <span className="text-foreground font-semibold">{exam?.passing_marks} Marks</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Calculator Allowed:</span>
                <span className="text-foreground font-semibold flex items-center gap-1">
                  <Calculator className="w-3.5 h-3.5 text-primary" />
                  {exam?.calculator_allowed ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Voice Assist Availability:</span>
                <span className="text-foreground font-semibold">{exam?.voice_navigation_availability ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Acceptance and Trigger */}
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
            <label className="flex items-start gap-3 cursor-pointer text-xs font-semibold text-muted-foreground select-none leading-relaxed">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span>I confirm that I have read the instructions and agree to proctoring guidelines.</span>
            </label>

            <button
              onClick={handleStartAttempt}
              disabled={!accepted || btnLoading}
              className="w-full py-2.5 bg-primary hover:bg-primary/95 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-sm text-sm transition-colors disabled:opacity-40 focus:ring-2 focus:ring-primary focus:outline-none"
            >
              {btnLoading ? 'Starting...' : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Start Examination</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>

    </div>
  )
}
