import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, Copy, Send, Archive, Users, Calendar, Clock, AlertTriangle } from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import DataTable from '../components/DataTable'
import ConfirmationDialog from '../components/ConfirmationDialog'

export default function ExamList() {
  const { toast } = useToast()
  const navigate = useNavigate()

  const [exams, setExams] = useState({ records: [], totalRecords: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  
  const [queryParams, setQueryParams] = useState({
    page: 1,
    page_size: 10,
    search: '',
    sort_by: 'created_at',
    sort_order: 'desc',
  })

  const [deleteId, setDeleteId] = useState(null)

  const fetchExams = async () => {
    setLoading(true)
    try {
      const params = {
        page: queryParams.page,
        page_size: queryParams.page_size,
        sort_by: queryParams.sort_by,
        sort_order: queryParams.sort_order,
      }
      if (queryParams.search) params.search = queryParams.search

      const res = await apiClient.get('/api/admin/exams', { params })
      if (res.data.success) {
        setExams(res.data.data)
      }
    } catch (err) {
      toast(err.message || 'Failed to load exams list.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExams()
  }, [queryParams])

  const handlePageChange = (newPage) => {
    setQueryParams((prev) => ({ ...prev, page: newPage }))
  }

  const handleSort = (field, order) => {
    setQueryParams((prev) => ({ ...prev, sort_by: field, sort_order: order, page: 1 }))
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try {
      const res = await apiClient.delete(`/api/admin/exams/${deleteId}`)
      if (res.data.success) {
        toast('Exam template deleted successfully.', 'success')
        fetchExams()
      }
    } catch (err) {
      toast(err.message || 'Deletion failed.', 'error')
    } finally {
      setDeleteId(null)
    }
  }

  const handleClone = async (id) => {
    try {
      const res = await apiClient.post(`/api/admin/exams/${id}/clone`)
      if (res.data.success) {
        toast('Exam template cloned successfully. Copy created as Draft.', 'success')
        fetchExams()
      }
    } catch (err) {
      toast(err.message || 'Cloning failed.', 'error')
    }
  }

  const handlePublish = async (id) => {
    try {
      const res = await apiClient.post(`/api/admin/exams/${id}/publish`)
      if (res.data.success) {
        toast('Exam template is now published and active.', 'success')
        fetchExams()
      }
    } catch (err) {
      toast(err.message || 'Publish failed.', 'error')
    }
  }

  const handleArchive = async (id) => {
    try {
      const res = await apiClient.post(`/api/admin/exams/${id}/archive`)
      if (res.data.success) {
        toast('Exam archived successfully.', 'success')
        fetchExams()
      }
    } catch (err) {
      toast(err.message || 'Archive failed.', 'error')
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Exam Profile',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-foreground text-sm">{row.name}</span>
          <span className="font-mono text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            Code: {row.code} • {row.subject?.subject_name}
          </span>
        </div>
      ),
    },
    {
      key: 'start_date',
      label: 'Schedule Slot',
      render: (row) => (
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            Start: {new Date(row.start_date).toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-primary" />
            End: {new Date(row.end_date).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: 'passing_marks',
      label: 'Marks Target',
      render: (row) => (
        <div className="flex flex-col text-xs text-muted-foreground">
          <span>Total: <strong className="text-foreground">{parseFloat(row.total_marks)}</strong></span>
          <span>Passing: <strong className="text-foreground">{parseFloat(row.passing_marks)}</strong></span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row) => {
        const badgeClasses = {
          draft: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800',
          published: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
          archived: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30',
        }
        return (
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
            badgeClasses[row.status] || badgeClasses.draft
          }`}>
            {row.status}
          </span>
        )
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          {/* Publish action */}
          {row.status === 'draft' && (
            <button
              onClick={() => handlePublish(row.id)}
              className="p-1.5 rounded-lg border bg-background hover:bg-emerald-50 text-muted-foreground hover:text-emerald-600 transition-colors"
              title="Publish Exam"
            >
              <Send className="w-4 h-4" />
            </button>
          )}

          {/* Archive action */}
          {row.status === 'published' && (
            <button
              onClick={() => handleArchive(row.id)}
              className="p-1.5 rounded-lg border bg-background hover:bg-rose-50 text-muted-foreground hover:text-rose-600 transition-colors"
              title="Archive Exam"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}

          {/* Assign Students */}
          {row.status === 'published' && (
            <button
              onClick={() => navigate(`/admin/exams/${row.id}/assign`)}
              className="p-1.5 rounded-lg border bg-background hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors"
              title="Assign students"
            >
              <Users className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => handleClone(row.id)}
            className="p-1.5 rounded-lg border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Clone Exam"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(`/admin/exams/${row.id}/edit`)}
            className="p-1.5 rounded-lg border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Edit Exam template"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteId(row.id)}
            className="p-1.5 rounded-lg border bg-background hover:bg-rose-50 text-muted-foreground hover:text-rose-600 transition-colors"
            title="Delete Exam"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Exam Templates</h2>
          <p className="text-muted-foreground text-sm">Schedule examination papers, set duration thresholds and assign student catalogs.</p>
        </div>
        
        <button
          onClick={() => navigate('/admin/exams/new')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/95 text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Exam
        </button>
      </div>

      {/* Query panel */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search exams by title or code..."
            value={queryParams.search}
            onChange={(e) => setQueryParams((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
            className="w-full pl-4 pr-4 py-2 bg-card border rounded-lg text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={exams.records}
        loading={loading}
        pagination={{
          totalRecords: exams.totalRecords,
          totalPages: exams.totalPages,
          currentPage: exams.currentPage,
          pageSize: exams.pageSize,
          onPageChange: handlePageChange,
        }}
        sorting={{
          sortBy: queryParams.sort_by,
          sortOrder: queryParams.sort_order,
          onSort: handleSort,
        }}
      />

      {/* Deletion Dialog */}
      <ConfirmationDialog
        isOpen={deleteId !== null}
        title="Delete Examination Template"
        message="Are you sure you want to delete this exam configuration? All questions mapped and student assignment mappings will be deleted immediately."
        confirmLabel="Confirm Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />

    </div>
  )
}
