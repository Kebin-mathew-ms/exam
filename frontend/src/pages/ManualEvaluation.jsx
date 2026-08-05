import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, User, BookOpen, Send } from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import Loader from '../components/Loader'
import EvaluationCard from '../components/EvaluationCard'

export default function ManualEvaluation() {
  const { id } = useParams() // Attempt ID
  const navigate = useNavigate()
  const { toast } = useToast()

  const [attempt, setAttempt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [btnLoading, setBtnLoading] = useState(false)

  const loadAttemptDetails = async () => {
    try {
      const res = await apiClient.get(`/api/evaluation/${id}`)
      if (res.data.success) {
        setAttempt(res.data.data)
      }
    } catch (err) {
      toast('Failed to load grading details.', 'error')
      navigate('/admin/evaluation')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAttemptDetails()
  }, [id])

  const handlePublishGrades = async () => {
    setBtnLoading(true)
    try {
      const res = await apiClient.post('/api/evaluation/publish', {
        attempt_id: parseInt(id)
      })
      if (res.data.success) {
        toast('Grades published successfully. Ranks recalculated.', 'success')
        navigate('/admin/evaluation')
      }
    } catch (err) {
      toast(err.message || 'Publishing failed.', 'error')
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

  // Filter only subjective questions (Short Answer: 3, Essay: 4)
  const subjectiveQuestions = attempt?.questions?.filter(q => q.question_type_id === 3 || q.question_type_id === 4) || []

  return (
    <div className="space-y-6 text-sm max-w-4xl mx-auto">
      
      {/* Title */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/evaluation"
            className="p-2 rounded-lg border bg-card text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back to queue"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Subjective Grading Workspace</h2>
            <p className="text-muted-foreground text-xs font-mono font-semibold uppercase">{attempt?.exam_name}</p>
          </div>
        </div>

        <button
          onClick={handlePublishGrades}
          disabled={btnLoading || subjectiveQuestions.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition-colors shadow-sm disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{btnLoading ? 'Publishing...' : 'Publish Evaluation Grades'}</span>
        </button>
      </div>

      {/* Info strip */}
      <div className="bg-card border rounded-xl p-4 shadow-xs flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <User className="w-4 h-4 text-primary" />
          <span>Student: <b className="text-foreground">{attempt?.student_name}</b></span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <BookOpen className="w-4 h-4 text-primary" />
          <span>Ungraded questions: <b className="text-foreground">{subjectiveQuestions.length}</b></span>
        </div>
      </div>

      {/* List evaluations workspace */}
      <div className="space-y-6">
        {subjectiveQuestions.map((q) => (
          <EvaluationCard
            key={q.question_id}
            attemptId={parseInt(id)}
            question={q}
            onSaveSuccess={loadAttemptDetails}
          />
        ))}

        {subjectiveQuestions.length === 0 && (
          <div className="py-12 border border-dashed rounded-xl text-center text-muted-foreground italic bg-card">
            No subjective questions mapped to this exam template attempt.
          </div>
        )}
      </div>

    </div>
  )
}
