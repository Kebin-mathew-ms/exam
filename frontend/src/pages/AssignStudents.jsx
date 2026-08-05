import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Users, UserPlus, Trash2, ShieldCheck, CheckSquare, Square, Search } from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import Loader from '../components/Loader'

export default function AssignStudents() {
  const { id } = useParams() // Exam ID
  const { toast } = useToast()

  // State Management
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exam, setExam] = useState(null)
  
  // Lists
  const [assignments, setAssignments] = useState([])
  const [students, setStudents] = useState([])
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  
  // Query filters
  const [studentSearch, setStudentSearch] = useState('')

  const loadData = async () => {
    try {
      const [examRes, assignRes, studentRes] = await Promise.all([
        apiClient.get(`/api/admin/exams/${id}`),
        apiClient.get('/api/admin/assignments'),
        apiClient.get('/api/admin/students?page_size=100') // fetch students directory
      ])

      if (examRes.data.success) setExam(examRes.data.data)
      if (assignRes.data.success) {
        // Filter assignments matching this exam
        const filtered = assignRes.data.data.filter(a => a.exam_id === parseInt(id))
        setAssignments(filtered)
      }
      if (studentRes.data.success) {
        setStudents(studentRes.data.data.records)
      }
    } catch (err) {
      toast(err.message || 'Failed to populate assignment dashboard.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const handleStudentSelectToggle = (stuId) => {
    if (selectedStudentIds.includes(stuId)) {
      setSelectedStudentIds(selectedStudentIds.filter(x => x !== stuId))
    } else {
      setSelectedStudentIds([...selectedStudentIds, stuId])
    }
  }

  const handleSelectAllToggle = (filteredStudents) => {
    const allFilteredIds = filteredStudents.map(s => s.id)
    const allSelected = allFilteredIds.every(id => selectedStudentIds.includes(id))
    if (allSelected) {
      // Unselect all filtered
      setSelectedStudentIds(selectedStudentIds.filter(id => !allFilteredIds.includes(id)))
    } else {
      // Add all filtered
      const newSelections = Array.from(new Set([...selectedStudentIds, ...allFilteredIds]))
      setSelectedStudentIds(newSelections)
    }
  }

  const handleAssignSubmit = async () => {
    if (selectedStudentIds.length === 0) return
    setSaving(true)

    try {
      const res = await apiClient.post('/api/admin/assignments', {
        student_ids: selectedStudentIds,
        exam_id: parseInt(id)
      })
      if (res.data.success) {
        toast(res.data.message, 'success')
        setSelectedStudentIds([])
        loadData()
      }
    } catch (err) {
      toast(err.message || 'Assignment failed.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleRevoke = async (assignId) => {
    try {
      const res = await apiClient.delete(`/api/admin/assignments/${assignId}`)
      if (res.data.success) {
        toast('Exam assignment revoked.', 'success')
        loadData()
      }
    } catch (err) {
      toast(err.message || 'Revocation failed.', 'error')
    }
  }

  // Filter students out that are already mapped
  const mappedStudentIds = assignments.map(a => a.student_id)
  const unassignedStudents = students.filter(s => !mappedStudentIds.includes(s.id))
  
  // Apply search keyword filter
  const filteredUnassigned = unassignedStudents.filter(s => {
    const fullname = `${s.first_name} ${s.last_name}`.toLowerCase()
    return fullname.includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase())
  })

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex items-center gap-3">
        <Link
          to="/admin/exams"
          className="p-2 rounded-lg border bg-card text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back to exams"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Student Assignment: {exam?.name}
          </h2>
          <p className="text-muted-foreground text-sm font-mono uppercase font-semibold">
            Exam Code: {exam?.code}
          </p>
        </div>
      </div>

      {/* Main Splits */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start text-sm">
        
        {/* Left Side: Currently Assigned Students (Col Span 3) */}
        <div className="lg:col-span-3 bg-card border rounded-xl p-6 shadow-sm flex flex-col gap-4">
          <h4 className="font-semibold text-base text-foreground border-b pb-2.5 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Currently Assigned Students ({assignments.length})
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-2.5">Student</th>
                  <th className="py-2.5">Email</th>
                  <th className="py-2.5 text-center">Status</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {assignments.map((assign) => (
                  <tr key={assign.id} className="hover:bg-muted/10">
                    <td className="py-3 font-semibold text-foreground">{assign.student_name}</td>
                    <td className="py-3 text-muted-foreground">{assign.student_email}</td>
                    <td className="py-3 text-center">
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50">
                        {assign.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleRevoke(assign.id)}
                        className="p-1.5 rounded-lg border bg-background hover:bg-rose-100 dark:hover:bg-rose-950/30 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        title="Revoke Assignment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {assignments.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-muted-foreground italic">
                      No students currently assigned to this exam. Use the list on the right to assign them.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Unassigned Students Checklists (Col Span 2) */}
        <div className="lg:col-span-2 bg-card border rounded-xl p-6 shadow-sm flex flex-col gap-4">
          <h4 className="font-semibold text-base text-foreground border-b pb-2.5 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Assign Students
          </h4>

          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search unassigned students..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full pl-3 pr-4 py-2 bg-background border rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Select all bar */}
          {filteredUnassigned.length > 0 && (
            <div className="flex items-center justify-between border bg-muted/20 p-2.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleSelectAllToggle(filteredUnassigned)}
                className="flex items-center gap-2 hover:text-primary transition-colors focus:outline-none"
              >
                {filteredUnassigned.every(s => selectedStudentIds.includes(s.id)) ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>Select All Filtered ({filteredUnassigned.length})</span>
              </button>
            </div>
          )}

          {/* List of checkboxes */}
          <div className="divide-y max-h-80 overflow-y-auto pr-2">
            {filteredUnassigned.map((s) => {
              const isChecked = selectedStudentIds.includes(s.id)
              return (
                <div key={s.id} className="flex items-center justify-between py-2.5">
                  <button
                    type="button"
                    onClick={() => handleStudentSelectToggle(s.id)}
                    className="flex items-start gap-2.5 text-left focus:outline-none"
                  >
                    {isChecked ? <CheckSquare className="w-4 h-4 text-primary mt-0.5" /> : <Square className="w-4 h-4 mt-0.5" />}
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground leading-none mb-0.5">{s.first_name} {s.last_name}</span>
                      <span className="text-[10px] text-muted-foreground leading-none font-mono">{s.student_profile?.enrollment_number}</span>
                    </div>
                  </button>
                </div>
              )
            })}

            {filteredUnassigned.length === 0 && (
              <p className="text-xs text-muted-foreground italic text-center py-6">
                No unassigned students found.
              </p>
            )}
          </div>

          {/* Actions */}
          <button
            onClick={handleAssignSubmit}
            disabled={selectedStudentIds.length === 0 || saving}
            className="w-full py-2.5 bg-primary hover:bg-primary/95 text-white rounded-lg font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <span>Assign Selected ({selectedStudentIds.length})</span>
          </button>
        </div>

      </div>

    </div>
  )
}
