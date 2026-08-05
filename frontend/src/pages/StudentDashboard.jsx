import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, GraduationCap, Calendar, BarChart2, CheckCircle2, User, HelpCircle, ArrowRight } from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import Loader from '../components/Loader'

export default function StudentDashboard() {
  const { toast } = useToast()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await apiClient.get('/api/student/dashboard')
        if (res.data.success) {
          setStats(res.data.data)
        }
      } catch (err) {
        toast('Failed to load dashboard data.', 'error')
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader size="large" />
      </div>
    )
  }

  const statCards = [
    {
      title: 'Active & Assigned Exams',
      value: stats?.upcoming_exams || 0,
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40',
      icon: <GraduationCap className="w-5 h-5" />,
      link: '/student/exams'
    },
    {
      title: 'Completed Attempts',
      value: stats?.completed_exams || 0,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
      icon: <CheckCircle2 className="w-5 h-5" />,
      link: '/student/exams'
    },
    {
      title: 'Profile Progress',
      value: `${stats?.profile_completion || 100}%`,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40',
      icon: <User className="w-5 h-5" />,
      link: '/profile'
    }
  ]

  return (
    <div className="space-y-8 text-sm">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome Back</h2>
        <p className="text-muted-foreground text-sm">Aegis Online Student Examination dashboard portal.</p>
      </div>

      {/* Grid of cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card, idx) => (
          <div key={idx} className="bg-card border rounded-xl p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{card.title}</p>
              <h3 className="text-2xl font-extrabold text-foreground">{card.value}</h3>
              <Link to={card.link} className="text-xs text-primary hover:underline font-semibold inline-flex items-center gap-1 mt-1">
                Manage <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Scores Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Recent scores */}
        <div className="lg:col-span-2 bg-card border rounded-xl p-6 shadow-sm flex flex-col gap-4">
          <h4 className="font-semibold text-base text-foreground border-b pb-3 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            Recent Exam Results
          </h4>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="text-xs font-semibold text-muted-foreground border-b uppercase tracking-wider">
                  <th className="py-2">Exam</th>
                  <th className="py-2 text-center">Score</th>
                  <th className="py-2 text-center">Outcome</th>
                  <th className="py-2 text-right">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats?.recent_results?.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/10">
                    <td className="py-3 font-semibold text-foreground">{r.exam_name}</td>
                    <td className="py-3 text-center font-mono font-bold text-foreground">
                      {r.score} marks ({r.percentage}%)
                    </td>
                    <td className="py-3 text-center">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${
                        r.is_passed 
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50' 
                          : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700/50'
                      }`}>
                        {r.is_passed ? 'Passed' : 'Failed'}
                      </span>
                    </td>
                    <td className="py-3 text-right text-muted-foreground text-xs">
                      {new Date(r.submission_time).toLocaleDateString()}
                    </td>
                  </tr>
                ))}

                {stats?.recent_results?.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-muted-foreground italic">
                      No recent exam scores loaded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Quick Action widgets */}
        <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col gap-4">
          <h4 className="font-semibold text-base text-foreground border-b pb-3">Quick Navigation</h4>
          <div className="flex flex-col gap-3">
            <Link
              to="/student/exams"
              className="p-3 border rounded-xl hover:bg-primary/5 hover:border-primary transition-all text-left flex items-start gap-3"
            >
              <BookOpen className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">Take Examination</span>
                <span className="text-xs text-muted-foreground">View schedules list and start tests.</span>
              </div>
            </Link>
            <div className="p-3 border rounded-xl bg-muted/30 dark:bg-accent/30 flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-indigo-500 mt-0.5" />
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">Accessibility preference</span>
                <span className="text-xs text-muted-foreground capitalize">
                  Current Profile setting: {stats?.accessibility_preference?.replace('_', ' ') || 'None'}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
