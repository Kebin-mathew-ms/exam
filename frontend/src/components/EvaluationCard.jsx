import React, { useState } from 'react'
import { Sparkles, Loader2, Save } from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import FormulaRenderer from './FormulaRenderer'

export default function EvaluationCard({
  attemptId,
  question = {},
  onSaveSuccess,
}) {
  const { toast } = useToast()
  
  const [marks, setMarks] = useState(question.marks_obtained !== null ? question.marks_obtained : '')
  const [remarks, setRemarks] = useState(question.remarks || '')
  const [saving, setSaving] = useState(false)

  // AI suggestion state
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState(null)

  const handleAIReview = async () => {
    setAiLoading(true)
    try {
      const res = await apiClient.post('/api/evaluation/ai-review', {
        attempt_id: attemptId,
        question_id: question.question_id
      })
      if (res.data.success) {
        setAiResult(res.data.data)
        toast('AI review suggestion computed.', 'success')
      }
    } catch (err) {
      toast('AI evaluation assistant failed.', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  const applyAISuggestion = () => {
    if (aiResult) {
      setMarks(aiResult.suggested_marks)
      setRemarks(aiResult.feedback)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (marks === '') {
      toast('Please enter a valid marks score.', 'error')
      return
    }

    if (parseFloat(marks) > question.max_marks) {
      toast(`Marks cannot exceed maximum score of ${question.max_marks}.`, 'error')
      return
    }

    setSaving(true)
    try {
      const res = await apiClient.post('/api/evaluation/save', {
        attempt_id: attemptId,
        question_id: question.question_id,
        marks_obtained: parseFloat(marks),
        remarks
      })
      if (res.data.success) {
        toast('Marks saved successfully as draft.', 'success')
        if (onSaveSuccess) onSaveSuccess()
      }
    } catch (err) {
      toast('Failed to save manual grade.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6 flex flex-col text-sm">
      
      {/* Description */}
      <div className="space-y-1">
        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
          Subjective Question ({parseFloat(question.max_marks)} Marks Max)
        </span>
        <FormulaRenderer html={question.description || ''} className="text-foreground leading-relaxed font-medium" />
      </div>

      {/* Side by side Answer panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Student answer */}
        <div className="p-4 bg-muted/20 border rounded-xl space-y-1 text-left">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Student's Response</span>
          <p className="text-foreground leading-relaxed whitespace-pre-wrap select-text">
            {question.student_answer_text || 'No answer submitted.'}
          </p>
        </div>

        {/* Expected Answer */}
        <div className="p-4 bg-emerald-50/10 border border-emerald-200/40 rounded-xl space-y-1 text-left">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Model Expected Answer</span>
          <p className="text-foreground leading-relaxed whitespace-pre-wrap">
            {question.expected_answer_text}
          </p>
        </div>
      </div>

      {/* AI Suggestion Area */}
      <div className="border-t border-dashed pt-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-foreground">AI Grading Assistant</span>
          <button
            type="button"
            onClick={handleAIReview}
            disabled={aiLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
          >
            {aiLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>Generate AI review suggestion</span>
          </button>
        </div>

        {aiResult && (
          <div className="p-4 bg-indigo-50/10 border border-indigo-200/40 rounded-xl space-y-3 animate-fade-in text-left">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-semibold text-xs text-indigo-700">AI Grading Breakdown</span>
              <button
                type="button"
                onClick={applyAISuggestion}
                className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:underline"
              >
                Apply AI Marks & Remarks
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
              <div>
                <span>Suggested Score:</span>
                <p className="font-bold text-foreground font-mono">{aiResult.suggested_marks} Marks</p>
              </div>
              <div className="sm:col-span-2">
                <span>Concepts Missed:</span>
                <p className="font-semibold text-rose-500 capitalize">{aiResult.concepts_missed || 'None'}</p>
              </div>
              <div>
                <span>Strengths:</span>
                <p className="text-foreground">{aiResult.strengths}</p>
              </div>
              <div className="sm:col-span-2">
                <span>Weaknesses:</span>
                <p className="text-foreground">{aiResult.weaknesses}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manual Input Form */}
      <form onSubmit={handleSave} className="border-t border-dashed pt-4 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
        <div className="sm:col-span-1">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Assign Marks
          </label>
          <input
            type="number"
            step="0.1"
            required
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
            className="w-full p-2 bg-background border rounded-lg focus:outline-none"
            placeholder="0.0"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Examiner Remarks
          </label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full p-2 bg-background border rounded-lg focus:outline-none"
            placeholder="Add remarks note..."
          />
        </div>

        <div className="sm:col-span-1">
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 bg-primary hover:bg-primary/95 text-white font-semibold rounded-lg flex items-center justify-center gap-1 shadow-sm text-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Draft'}</span>
          </button>
        </div>
      </form>

    </div>
  )
}
