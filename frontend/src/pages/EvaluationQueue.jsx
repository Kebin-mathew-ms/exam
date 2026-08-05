import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileSpreadsheet, Search, CheckSquare, Calendar, ChevronRight } from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import Loader from '../components/Loader'

export default function EvaluationQueue() {
  const { toast } = useToast()
  const navigate = useNavigate()

  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function loadQueue() {
      try {
        const res = await apiClient.get('/api/evaluation/pending')
        if (res.data.success) {
          setAttempts(res.data.data)
        }
      } catch (err) {
        toast('Failed to load pending evaluations queue.', 'error')
      } finally {
        setLoading(false)
      }
    }
    loadQueue()
  }, [])

  const filtered = attempts.filter(att =>
    att.student_name.toLowerCase().includes(search.toLowerCase()) ||
    att.exam_name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-6 text-sm">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Manual Evaluation Queue</h2>
        <p className="text-muted-foreground text-sm">Grade essay, short answers, programming and diagram questions.</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border rounded-lg focus:outline-none text-xs"
            placeholder="Search by student or exam name..."
          />
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-card border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-muted/30 text-xs font-semibold text-muted-foreground uppercase border-b tracking-wider">
                <th className="p-4">Student</th>
                <th className="p-4">Exam</th>
                <th className="p-4">Subject</th>
                <th className="p-4 text-center">Submission Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((att) => (
                <tr key={att.attempt_id} className="hover:bg-muted/10">
                  <td className="p-4 font-semibold text-foreground">
                    <div className="flex flex-col">
                      <span>{att.student_name}</span>
                      <span className="text-[10px] text-muted-foreground font-normal select-all">{att.student_email}</span>
                    </div>
                  </td>
                  <td className="p-4 font-semibold text-foreground">
                    <div className="flex flex-col">
                      <span>{att.exam_name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono font-normal uppercase">{att.exam_code}</span>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">{att.subject_name}</td>
                  <td className="p-4 text-center text-muted-foreground text-xs">
                    {new Date(att.submission_time).toLocaleString()}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => navigate(`/admin/evaluation/${att.attempt_id}`)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary/95 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Start Grading</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-muted-foreground italic">
                    Evaluation queue is empty. No pending subjective answers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
