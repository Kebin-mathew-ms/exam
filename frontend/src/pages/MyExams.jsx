import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, BarChart2, Award, ArrowRight } from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import Loader from '../components/Loader'

export default function MyExams() {
  const { toast } = useToast()
  const navigate = useNavigate()

  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('available') // 'available', 'completed'

  const loadExams = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/api/student/exams')
      if (res.data.success) {
        setExams(res.data.data)
      }
    } catch (err) {
      toast('Failed to load exams list.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExams()
  }, [])

  // Filter lists matching active status tab
  const getFilteredExams = () => {
    const now = new Date()
    if (activeTab === 'available') {
      // Available / upcoming: status is assigned or started and not completed
      return exams.filter(e => e.status === 'assigned' || e.status === 'started')
    } else {
      // Completed: Status is completed
      return exams.filter(e => e.status === 'completed')
    }
  }

  const filtered = getFilteredExams()

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
        <h2 className="text-2xl font-bold tracking-tight text-foreground">My Examinations</h2>
        <p className="text-muted-foreground text-sm">Manage scheduled exam registrations and view grade reviews.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b gap-4 select-none">
        <button
          onClick={() => setActiveTab('available')}
          className={`pb-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'available' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Assigned & In-Progress ({exams.filter(e => e.status !== 'completed').length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`pb-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'completed' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Completed results ({exams.filter(e => e.status === 'completed').length})
        </button>
      </div>

      {/* Grid of exam cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((e) => {
          const isStarted = e.attempt_status === 'started'
          
          return (
            <div key={e.exam_id} className="bg-card border rounded-xl p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-primary/50 transition-colors">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-md">
                    {e.subject_code}
                  </span>
                  {e.status === 'completed' && (
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50">
                      Completed
                    </span>
                  )}
                  {isStarted && (
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/50 animate-pulse">
                      In-Progress
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-base text-foreground line-clamp-1">{e.name}</h4>
                
                <div className="space-y-2 text-xs text-muted-foreground border-t border-dashed pt-3">
                  <div className="flex justify-between">
                    <span>Duration Limit:</span>
                    <span className="text-foreground font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      {e.duration_minutes} Mins
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Marks Target:</span>
                    <span className="text-foreground font-semibold flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-primary" />
                      {e.total_marks} Marks
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>End Date Window:</span>
                    <span className="text-foreground font-semibold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      {new Date(e.end_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="border-t pt-3">
                {activeTab === 'available' ? (
                  <button
                    onClick={() => navigate(`/student/exams/${e.exam_id}/instructions`)}
                    className="w-full py-2 bg-primary hover:bg-primary/95 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-sm text-xs transition-colors"
                  >
                    <span>{isStarted ? 'Resume Attempt' : 'Enter Exam'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/student/results/${e.attempt_id}`)}
                    className="w-full py-2 border border-primary text-primary hover:bg-primary/5 font-semibold rounded-lg flex items-center justify-center gap-1.5 text-xs transition-colors"
                  >
                    <BarChart2 className="w-4 h-4" />
                    <span>Review Result Score</span>
                  </button>
                )}
              </div>

            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-12 border border-dashed rounded-xl text-center text-muted-foreground italic bg-card">
            No exams listed in this section.
          </div>
        )}
      </div>

    </div>
  )
}
