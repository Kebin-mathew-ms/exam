import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Download, Award, Clock, BarChart2, CheckCircle2, XCircle, HelpCircle } from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import Loader from '../components/Loader'

export default function ResultDetails() {
  const { id } = useParams() // Attempt ID
  const navigate = useNavigate()
  const { toast } = useToast()

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    async function loadResult() {
      try {
        const res = await apiClient.get(`/api/student/results/${id}`)
        if (res.data.success) {
          setResult(res.data.data)
        }
      } catch (err) {
        toast('Failed to load result details.', 'error')
        navigate('/student/exams')
      } finally {
        setLoading(false)
      }
    }
    loadResult()
  }, [id])

  const handleDownloadPDF = async () => {
    setDownloading(true)
    try {
      const response = await apiClient.get(`/api/student/results/${id}/pdf`, {
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `report_card_${id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast('Report card PDF downloaded successfully.', 'success')
    } catch (err) {
      toast('PDF compilation failed.', 'error')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader size="large" />
      </div>
    )
  }

  if (!result) return null

  return (
    <div className="space-y-6 text-sm max-w-4xl mx-auto">
      
      {/* Title */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link
            to="/student/exams"
            className="p-2 rounded-lg border bg-card text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back to exams"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Examination Review</h2>
            <p className="text-muted-foreground text-xs font-mono font-semibold uppercase">{result.exam_name}</p>
          </div>
        </div>

        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/95 text-xs font-semibold shadow-sm transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          {downloading ? 'Compiling PDF...' : 'Download Report Card'}
        </button>
      </div>

      {/* Outcome Banner */}
      <div className={`p-6 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs ${
        result.is_passed
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400'
          : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400'
      }`}>
        <div className="flex items-center gap-3">
          {result.is_passed ? (
            <CheckCircle2 className="w-10 h-10 text-emerald-500 flex-shrink-0" />
          ) : (
            <XCircle className="w-10 h-10 text-rose-500 flex-shrink-0" />
          )}
          <div className="text-left space-y-0.5">
            <h3 className="font-extrabold text-lg leading-none">
              {result.is_passed ? 'Congratulations! Passed' : 'Attempt Failed'}
            </h3>
            <p className="text-xs opacity-90 leading-tight">
              You scored a total percentage of {parseFloat(result.percentage)}% in this test.
            </p>
          </div>
        </div>
        <div className="font-bold text-center sm:text-right">
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-85 block">Final Score</span>
          <span className="text-2xl font-extrabold">{parseFloat(result.final_score)} marks</span>
        </div>
      </div>

      {/* Answer Key grid details */}
      <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-base text-foreground flex items-center gap-2 border-b pb-3">
          <BarChart2 className="w-5 h-5 text-primary" />
          Answers Verification Key
        </h3>

        <div className="divide-y space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {result.answers.map((ans, idx) => {
            const isMcqCorrect = ans.selected_answer === ans.correct_answer
            const isSkipped = ans.selected_answer === 'Skipped'
            const isEssay = ans.question_type_id in (3, 4) // Short/Long Answer

            return (
              <div key={idx} className="pt-4 flex flex-col gap-2">
                <div className="flex justify-between items-start gap-4">
                  <span className="font-semibold text-foreground">
                    Question {idx + 1}: {ans.question_title}
                  </span>
                  
                  {/* Status Badging */}
                  {isEssay ? (
                    <span className="inline-flex items-center rounded bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-[9px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 px-2 py-0.5">
                      Pending Grade
                    </span>
                  ) : isSkipped ? (
                    <span className="inline-flex items-center rounded bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700/50 text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 px-2 py-0.5">
                      Skipped
                    </span>
                  ) : isMcqCorrect ? (
                    <span className="inline-flex items-center rounded bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700/50 text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 px-2 py-0.5">
                      Correct
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded bg-rose-100 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-700/50 text-[9px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 px-2 py-0.5">
                      Incorrect
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted-foreground bg-muted/10 p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <span>Your Selected Answer:</span>
                    <p className={`font-semibold ${
                      isEssay ? 'text-foreground' : isMcqCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {ans.selected_answer}
                    </p>
                  </div>
                  {!isEssay && (
                    <div className="space-y-0.5">
                      <span>Correct Answer Reference:</span>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {ans.correct_answer}
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-muted-foreground flex justify-between font-mono font-medium">
                  <span>Time Spent: {ans.time_spent_seconds} Seconds</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
