import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save, ShieldAlert, Clock, Calendar, CheckSquare, Square, Settings, Eye } from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import Loader from '../components/Loader'
import RichTextEditor from '../components/RichTextEditor'

export default function ExamForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const isEdit = !!id

  // State Management
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(isEdit)
  const [subjects, setSubjects] = useState([])
  const [questions, setQuestions] = useState([])
  const [selectedQuestions, setSelectedQuestions] = useState([]) // Array of mapped questions { id, display_order, marks_override }
  const [instructions, setInstructions] = useState('')
  const [formError, setFormError] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      code: '',
      description: '',
      subject_id: '',
      duration_minutes: 60,
      passing_marks: 5.00,
      total_marks: 10.00,
      start_date: '',
      end_date: '',
      randomize_questions: false,
      randomize_options: false,
      show_result_immediately: true,
      allow_multiple_attempts: false,
      max_attempts: 1,
      auto_submit: true,
      timezone: 'UTC',
      late_entry_allowed: false,
      grace_time_minutes: 0,
      calculator_allowed: false,
      negative_marking: false,
      voice_navigation_availability: false,
    },
  })

  // Watch subject_id to trigger questions reload for that subject
  const watchedSubjectId = watch('subject_id')

  useEffect(() => {
    async function loadSubjects() {
      try {
        const res = await apiClient.get('/api/admin/subjects')
        if (res.data.success) {
          setSubjects(res.data.data.filter(s => s.status === 'active'))
        }
      } catch (err) {
        toast('Failed to load subjects lookup.', 'error')
      }
    }
    loadSubjects()
  }, [])

  // Load questions for the selected subject
  useEffect(() => {
    async function loadQuestionsForSubject() {
      if (!watchedSubjectId) {
        setQuestions([])
        return
      }
      try {
        // Retrieve all questions for subject (avoid page offset bounds by fetching large cap)
        const res = await apiClient.get(`/api/admin/questions?subject_id=${watchedSubjectId}&page_size=100`)
        if (res.data.success) {
          setQuestions(res.data.data.records)
        }
      } catch (err) {
        console.error(err)
      }
    }
    loadQuestionsForSubject()
  }, [watchedSubjectId])

  // Load editing exam details
  useEffect(() => {
    async function loadExamData() {
      if (!isEdit) return
      try {
        const res = await apiClient.get(`/api/admin/exams/${id}`)
        if (res.data.success) {
          const e = res.data.data
          setValue('name', e.name)
          setValue('code', e.code)
          setValue('description', e.description || '')
          setValue('subject_id', e.subject_id)
          setValue('duration_minutes', e.duration_minutes)
          setValue('passing_marks', parseFloat(e.passing_marks))
          setValue('total_marks', parseFloat(e.total_marks))
          
          // Format ISO date strings to local datetime-local format 'YYYY-MM-DDTHH:MM'
          setValue('start_date', e.start_date.substring(0, 16))
          setValue('end_date', e.end_date.substring(0, 16))
          
          setValue('randomize_questions', e.randomize_questions)
          setValue('randomize_options', e.randomize_options)
          setValue('show_result_immediately', e.show_result_immediately)
          setValue('allow_multiple_attempts', e.allow_multiple_attempts)
          setValue('max_attempts', e.max_attempts)
          setValue('auto_submit', e.auto_submit)
          setValue('timezone', e.timezone)
          setValue('late_entry_allowed', e.late_entry_allowed)
          setValue('grace_time_minutes', e.grace_time_minutes)
          setValue('calculator_allowed', e.calculator_allowed)
          setValue('negative_marking', e.negative_marking)
          setValue('voice_navigation_availability', e.voice_navigation_availability)
          setInstructions(e.instructions || '')

          // Parse mapped questions
          const mapped = e.questions.map(q => ({
            id: q.question_id,
            display_order: q.display_order,
            marks_override: q.marks_override ? parseFloat(q.marks_override) : ''
          }))
          setSelectedQuestions(mapped)
        }
      } catch (err) {
        toast('Failed to load exam configurations.', 'error')
        navigate('/admin/exams')
      } finally {
        setDataLoading(false)
      }
    }
    loadExamData()
  }, [id, isEdit, setValue])

  const handleQuestionToggle = (qId) => {
    const exists = selectedQuestions.find(q => q.id === qId)
    if (exists) {
      setSelectedQuestions(selectedQuestions.filter(q => q.id !== qId))
    } else {
      setSelectedQuestions([
        ...selectedQuestions,
        { id: qId, display_order: selectedQuestions.length + 1, marks_override: '' }
      ])
    }
  }

  const handleOrderChange = (qId, value) => {
    setSelectedQuestions(
      selectedQuestions.map(q => q.id === qId ? { ...q, display_order: parseInt(value) || 1 } : q)
    )
  }

  const handleOverrideChange = (qId, value) => {
    setSelectedQuestions(
      selectedQuestions.map(q => q.id === qId ? { ...q, marks_override: value } : q)
    )
  }

  const onSubmit = async (formData) => {
    if (selectedQuestions.length === 0) {
      setFormError('Please select at least one question to include in the exam.')
      return
    }

    setLoading(true)
    setFormError('')

    const payload = {
      ...formData,
      subject_id: parseInt(formData.subject_id),
      duration_minutes: parseInt(formData.duration_minutes),
      passing_marks: parseFloat(formData.passing_marks),
      total_marks: parseFloat(formData.total_marks),
      max_attempts: parseInt(formData.max_attempts),
      grace_time_minutes: parseInt(formData.grace_time_minutes),
      instructions,
      questions: selectedQuestions.map(q => ({
        question_id: q.id,
        display_order: q.display_order,
        marks_override: q.marks_override !== '' ? parseFloat(q.marks_override) : null
      }))
    }

    try {
      if (isEdit) {
        const res = await apiClient.put(`/api/admin/exams/${id}`, payload)
        if (res.data.success) {
          toast('Exam configuration modified.', 'success')
          navigate('/admin/exams')
        }
      } else {
        const res = await apiClient.post('/api/admin/exams', payload)
        if (res.data.success) {
          toast('Exam templates registered successfully.', 'success')
          navigate('/admin/exams')
        }
      }
    } catch (err) {
      const errors = err.errors || []
      setFormError(errors[0] || err.message || 'Saving exam failed')
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
      
      {/* Back button */}
      <div className="flex items-center gap-3">
        <Link
          to="/admin/exams"
          className="p-2 rounded-lg border bg-card text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Cancel editing"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {isEdit ? 'Modify Exam Setup' : 'Create Exam Template'}
          </h2>
          <p className="text-muted-foreground text-sm">
            Configure examination schedules, randomizations, pass margins and mapped questions.
          </p>
        </div>
      </div>

      {formError && (
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-200 text-xs font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          <span>{formError}</span>
        </div>
      )}

      {/* Grid Layout */}
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start text-sm">
        
        {/* Left Card: Core metadata and dates */}
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
          <h4 className="font-semibold text-sm text-foreground border-b pb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Scheduling & Properties
          </h4>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Exam Name</label>
            <input
              type="text"
              disabled={loading}
              {...register('name', { required: 'Exam name is required' })}
              className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
              placeholder="e.g. Mid-term Programming"
            />
            {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Exam Code</label>
            <input
              type="text"
              disabled={loading}
              {...register('code', { required: 'Unique exam code is required' })}
              className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
              placeholder="e.g. EXAM-CS101-02"
            />
            {errors.code && <p className="text-xs text-rose-500 mt-1">{errors.code.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Subject</label>
            <select
              disabled={loading || isEdit}
              {...register('subject_id', { required: 'Subject syllabus linking is required' })}
              className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.subject_name}</option>
              ))}
            </select>
            {isEdit && <span className="text-[10px] text-muted-foreground">Subject lock binds once created</span>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Schedule Window (Start)</label>
            <input
              type="datetime-local"
              disabled={loading}
              {...register('start_date', { required: 'Start slot is required' })}
              className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Schedule Window (End)</label>
            <input
              type="datetime-local"
              disabled={loading}
              {...register('end_date', { required: 'End slot is required' })}
              className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Duration (Min)</label>
              <input
                type="number"
                disabled={loading}
                {...register('duration_minutes', { required: 'Duration is required', min: 1 })}
                className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Time Zone</label>
              <input
                type="text"
                disabled={loading}
                {...register('timezone')}
                className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Total Marks</label>
              <input
                type="number"
                step="0.01"
                disabled={loading}
                {...register('total_marks', { required: 'Total marks required', min: 1 })}
                className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Passing Marks</label>
              <input
                type="number"
                step="0.01"
                disabled={loading}
                {...register('passing_marks', { required: 'Passing limit required', min: 0 })}
                className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Options, Questions list check bounds */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Instructions and Description panel */}
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
            <h4 className="font-semibold text-base text-foreground border-b pb-2.5 flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Configuration Parameters
            </h4>

            {/* Randomization toggles grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border bg-muted/20 p-4 rounded-xl text-xs font-medium">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" disabled={loading} {...register('randomize_questions')} className="rounded border-gray-300 text-primary focus:ring-primary" />
                <span>Randomize Questions Order</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" disabled={loading} {...register('randomize_options')} className="rounded border-gray-300 text-primary focus:ring-primary" />
                <span>Randomize MCQ Options order</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" disabled={loading} {...register('calculator_allowed')} className="rounded border-gray-300 text-primary focus:ring-primary" />
                <span>Calculator Allowed</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" disabled={loading} {...register('negative_marking')} className="rounded border-gray-300 text-primary focus:ring-primary" />
                <span>Negative Marking active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" disabled={loading} {...register('voice_navigation_availability')} className="rounded border-gray-300 text-primary focus:ring-primary" />
                <span>Voice Navigation Availability</span>
              </label>
            </div>

            <RichTextEditor value={instructions} onChange={setInstructions} label="Instructions Sheet" disabled={loading} />
          </div>

          {/* Question Selector Mapping */}
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
            <h4 className="font-semibold text-base text-foreground border-b pb-2 flex items-center justify-between">
              <span>Select Questions to Include</span>
              <span className="text-xs text-muted-foreground font-semibold">
                Mapped: {selectedQuestions.length} Questions
              </span>
            </h4>

            {watchedSubjectId ? (
              <div className="divide-y space-y-3 max-h-96 overflow-y-auto pr-2">
                {questions.map((q) => {
                  const mapIndex = selectedQuestions.findIndex(sq => sq.id === q.id)
                  const isChecked = mapIndex !== -1
                  const mapItem = isChecked ? selectedQuestions[mapIndex] : null

                  return (
                    <div key={q.id} className="flex items-center justify-between py-3 gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleQuestionToggle(q.id)}
                          className="mt-0.5 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                        >
                          {isChecked ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                        </button>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-foreground truncate">{q.title}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">
                            Marks: {parseFloat(q.marks)} • Type: {q.question_type?.name}
                          </span>
                        </div>
                      </div>

                      {/* Display Order and Marks Override if checked */}
                      {isChecked && mapItem && (
                        <div className="flex items-center gap-2">
                          <div className="w-20">
                            <label className="block text-[9px] font-bold text-muted-foreground uppercase">Order</label>
                            <input
                              type="number"
                              disabled={loading}
                              value={mapItem.display_order}
                              onChange={(e) => handleOrderChange(q.id, e.target.value)}
                              className="w-full p-1 bg-background border rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div className="w-20">
                            <label className="block text-[9px] font-bold text-muted-foreground uppercase">Override</label>
                            <input
                              type="number"
                              step="0.1"
                              disabled={loading}
                              value={mapItem.marks_override}
                              onChange={(e) => handleOverrideChange(q.id, e.target.value)}
                              className="w-full p-1 bg-background border rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary"
                              placeholder="Marks"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {questions.length === 0 && (
                  <p className="text-xs text-muted-foreground italic text-center py-6">
                    No questions found under this subject syllabus. Add questions to the subject first.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic text-center py-6">
                Please select a subject in the sidebar to populate syllabus questions.
              </p>
            )}
          </div>

          {/* Save buttons */}
          <div className="flex justify-end gap-3">
            <Link
              to="/admin/exams"
              className="px-5 py-2.5 border rounded-lg hover:bg-muted font-medium transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-lg font-semibold shadow-sm transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Exam Template</span>
            </button>
          </div>
        </div>

      </form>

    </div>
  )
}
