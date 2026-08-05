import React, { useState, useEffect } from 'react'
import { BarChart, Users, Award, Percent } from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import Loader from '../components/Loader'
import PerformanceChart from '../components/PerformanceChart'

export default function AnalyticsDashboard() {
  const { toast } = useToast()
  
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await apiClient.get('/api/results/analytics')
        if (res.data.success) {
          setStats(res.data.data)
        }
      } catch (err) {
        toast('Failed to load system analytics.', 'error')
      } finally {
        setLoading(false)
      }
    }
    loadAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader size="large" />
      </div>
    )
  }

  const cards = [
    {
      title: 'Total Enrolled Students',
      value: stats?.total_students || 0,
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40',
      icon: <Users className="w-5 h-5" />
    },
    {
      title: 'Average Test Score',
      value: `${stats?.avg_score || 0.0} marks`,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
      icon: <Award className="w-5 h-5" />
    },
    {
      title: 'Average Pass Rate',
      value: `${stats?.pass_rate_percentage || 0.0}%`,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40',
      icon: <Percent className="w-5 h-5" />
    }
  ]

  return (
    <div className="space-y-6 text-sm">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Aegis Report Center & Analytics</h2>
        <p className="text-muted-foreground text-sm">Aggregated scores, grade distribution metrics, and student performance stats.</p>
      </div>

      {/* Stats cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((c, idx) => (
          <div key={idx} className="bg-card border rounded-xl p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{c.title}</p>
              <h3 className="text-2xl font-extrabold text-foreground">{c.value}</h3>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.color}`}>
              {c.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Chart wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          {stats?.grade_distribution && (
            <PerformanceChart data={stats.grade_distribution} />
          )}
        </div>

        {/* Highlight board summary */}
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
          <h4 className="font-semibold text-base text-foreground border-b pb-3 flex items-center gap-2">
            <BarChart className="w-4.5 h-4.5 text-primary" />
            Outcome Aggregations
          </h4>
          <div className="space-y-3 text-xs text-muted-foreground">
            <div className="flex justify-between border-b pb-2">
              <span>Passed Attempts:</span>
              <span className="text-foreground font-semibold font-mono">{stats?.passed_count || 0}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span>Failed Attempts:</span>
              <span className="text-foreground font-semibold font-mono">{stats?.failed_count || 0}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span>Active Accessibility Users:</span>
              <span className="text-foreground font-semibold font-mono">{stats?.accessibility_users_count || 0}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
