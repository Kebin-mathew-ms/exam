import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save, ShieldAlert, BookOpen, Sparkles, Image as ImageIcon } from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import Loader from '../components/Loader'
import RichTextEditor from '../components/RichTextEditor'
import FormulaRenderer from '../components/FormulaRenderer'
import MultiOptionComponent from '../components/MultiOptionComponent'

export default function QuestionForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const isEdit = !!id

  // State Management
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(isEdit)
  const [lookups, setLookups] = useState({ categories: [], difficulties: [], question_types: [], subjects: [] })
  
  // Custom Form Component state bindings
  const [description, setDescription] = useState('')
  const [options, setOptions] = useState([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [formError, setFormError] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: '',
      subject_id: '',
      category_id: '',
      difficulty_id: '',
      question_type_id: '',
      marks: 1.00,
      negative_marks: 0.00,
      explanation: '',
    },
  })

  // Watch selected question type to conditionally show MCQ options editor
  const selectedQType = watch('question_type_id')

  useEffect(() => {
    async function loadLookupsAndData() {
      try {
        const lookupRes = await apiClient.get('/api/admin/questions/lookups')
        if (lookupRes.data.success) {
          setLookups(lookupRes.data.data)
        }

        if (isEdit) {
          const detailRes = await apiClient.get(`/api/admin/questions/${id}`)
          if (detailRes.data.success) {
            const q = detailRes.data.data
            setValue('title', q.title)
            setValue('subject_id', q.subject_id)
            setValue('category_id', q.category_id)
            setValue('difficulty_id', q.difficulty_id)
            setValue('question_type_id', q.question_type_id)
            setValue('marks', parseFloat(q.marks))
            setValue('negative_marks', parseFloat(q.negative_marks))
            setValue('explanation', q.explanation || '')
            setDescription(q.description)
            setOptions(q.options || [])
          }
        } else {
          // Initialize with 4 blank MCQ options by default
          setOptions([
            { option_text: '', is_correct: false, display_order: 1 },
            { option_text: '', is_correct: false, display_order: 2 },
            { option_text: '', is_correct: false, display_order: 3 },
            { option_text: '', is_correct: false, display_order: 4 },
          ])
        }
      } catch (err) {
        toast('Failed to load form lookup data.', 'error')
      } finally {
        setDataLoading(false)
      }
    }
    loadLookupsAndData()
  }, [id, isEdit, setValue])

  const handleDiagramUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await apiClient.post('/api/admin/questions/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (res.data.success) {
        const path = res.data.data.filepath
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        const imgTag = `<br/><img src="${baseURL}/${path}" alt="Question Diagram" class="max-w-md my-2 rounded-lg border shadow-xs" /><br/>`
        // Append image tag to description
        setDescription((prev) => prev + imgTag)
        toast('Image uploaded and inserted successfully.', 'success')
      }
    } catch (err) {
      toast(err.message || 'Image upload failed.', 'error')
    } finally {
      setUploadingImage(false)
    }
  }

  const onSubmit = async (formData) => {
    if (!description.trim()) {
      setFormError('Question description body is required')
      return
    }

    // MCQ verification
    const typeId = parseInt(formData.question_type_id)
    if (typeId === 1) { // MCQ
      const hasCorrect = options.some(o => o.is_correct)
      const hasEmptyText = options.some(o => !o.option_text.trim())
      if (!hasCorrect) {
        setFormError('MCQ question requires at least one option marked as correct.')
        return
      }
      if (hasEmptyText) {
        setFormError('All MCQ option texts must be filled in.')
        return
      }
    }

    setLoading(true)
    setFormError('')

    const payload = {
      title: formData.title,
      description,
      subject_id: parseInt(formData.subject_id),
      category_id: parseInt(formData.category_id),
      difficulty_id: parseInt(formData.difficulty_id),
      question_type_id: typeId,
      marks: parseFloat(formData.marks),
      negative_marks: parseFloat(formData.negative_marks),
      explanation: formData.explanation,
      options: typeId === 1 ? options : [], // only send options for MCQs
    }

    try {
      if (isEdit) {
        const res = await apiClient.put(`/api/admin/questions/${id}`, payload)
        if (res.data.success) {
          toast('Question modified successfully.', 'success')
          navigate('/admin/questions')
        }
      } else {
        const res = await apiClient.post('/api/admin/questions', payload)
        if (res.data.success) {
          toast('Question added successfully.', 'success')
          navigate('/admin/questions')
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
          to="/admin/questions"
          className="p-2 rounded-lg border bg-card text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Cancel editing"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {isEdit ? 'Edit Question Bank Entry' : 'Add Question'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {isEdit ? 'Update detailed question descriptions, LaTeX formulas, or option weights.' : 'Create a new question templates index.'}
          </p>
        </div>
      </div>

      {formError && (
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-200 text-xs font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          <span>{formError}</span>
        </div>
      )}

      {/* Main Grid Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start text-sm">
        
        {/* Left Side: Setup dropdown parameters */}
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
          <h4 className="font-semibold text-sm text-foreground border-b pb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Meta Properties
          </h4>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Question Identifier Title</label>
            <input
              type="text"
              disabled={loading}
              {...register('title', { required: 'Question title is required' })}
              className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
              placeholder="e.g. Pythagoras Theorem Check"
            />
            {errors.title && <p className="text-xs text-rose-500 mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Subject Syllabus</label>
            <select
              disabled={loading}
              {...register('subject_id', { required: 'Subject code is required' })}
              className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="">Select subject</option>
              {lookups.subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Category</label>
              <select
                disabled={loading}
                {...register('category_id', { required: 'Category is required' })}
                className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="">Select option</option>
                {lookups.categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Difficulty</label>
              <select
                disabled={loading}
                {...register('difficulty_id', { required: 'Difficulty level is required' })}
                className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="">Select option</option>
                {lookups.difficulties.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Question Type Format</label>
            <select
              disabled={loading}
              {...register('question_type_id', { required: 'Question type is required' })}
              className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="">Select option</option>
              {lookups.question_types.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Marks Weight</label>
              <input
                type="number"
                step="0.01"
                disabled={loading}
                {...register('marks', { required: 'Marks are required', min: 0 })}
                className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Negative Marks</label>
              <input
                type="number"
                step="0.01"
                disabled={loading}
                {...register('negative_marks', { required: 'Negative marking weight is required', min: 0 })}
                className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Text areas, option mapping and images */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Rich text body editor */}
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
            <h4 className="font-semibold text-base text-foreground border-b pb-2 flex items-center justify-between">
              <span>Question Body</span>
              <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-muted hover:bg-muted/70 border rounded-lg text-xs font-semibold cursor-pointer">
                <ImageIcon className="w-3.5 h-3.5" />
                {uploadingImage ? 'Uploading Image...' : 'Insert Diagram'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleDiagramUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
              </label>
            </h4>

            <RichTextEditor value={description} onChange={setDescription} disabled={loading} />

            {/* LaTeX Live rendering math sandbox preview */}
            {description.includes('\\(') && (
              <div className="p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-900/10 space-y-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  LaTeX Equations Rendered Output
                </span>
                <FormulaRenderer html={description} />
              </div>
            )}
          </div>

          {/* Conditionally render MCQ Options if selected type ID is 1 */}
          {parseInt(selectedQType) === 1 && (
            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <MultiOptionComponent options={options} onChange={setOptions} disabled={loading} />
            </div>
          )}

          {/* Explanation / Solution block */}
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-3">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Solution Explanation (Optional)
            </label>
            <textarea
              disabled={loading}
              {...register('explanation')}
              rows={3}
              placeholder="Provide a step-by-step resolution explanation shown to students after evaluation..."
              className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none leading-relaxed"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3">
            <Link
              to="/admin/questions"
              className="px-5 py-2.5 border rounded-lg hover:bg-muted font-medium transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || uploadingImage}
              className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-lg font-semibold shadow-sm transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Question</span>
            </button>
          </div>
        </div>

      </form>

    </div>
  )
}
