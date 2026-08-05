import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, Eye, Filter, Search, RotateCcw, Image } from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import DataTable from '../components/DataTable'
import ConfirmationDialog from '../components/ConfirmationDialog'

export default function StudentList() {
  const { toast } = useToast()
  const navigate = useNavigate()

  // State Management
  const [data, setData] = useState({ records: [], totalRecords: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Query Parameters State
  const [queryParams, setQueryParams] = useState({
    page: 1,
    page_size: 10,
    search: '',
    status_id: '',
    accessibility_requirement_id: '',
    sort_by: 'created_at',
    sort_order: 'desc',
  })

  // Confirmation state
  const [deleteId, setDeleteId] = useState(null)

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const params = {
        page: queryParams.page,
        page_size: queryParams.page_size,
        sort_by: queryParams.sort_by,
        sort_order: queryParams.sort_order,
      }
      if (queryParams.search) params.search = queryParams.search
      if (queryParams.status_id) params.status_id = parseInt(queryParams.status_id)
      if (queryParams.accessibility_requirement_id) {
        params.accessibility_requirement_id = parseInt(queryParams.accessibility_requirement_id)
      }

      const response = await apiClient.get('/api/admin/students', { params })
      if (response.data.success) {
        setData(response.data.data)
      }
    } catch (err) {
      toast(err.message || 'Failed to retrieve students list.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [queryParams])

  const handlePageChange = (newPage) => {
    setQueryParams((prev) => ({ ...prev, page: newPage }))
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setQueryParams((prev) => ({ ...prev, page: 1 }))
  }

  const handleSort = (field, order) => {
    setQueryParams((prev) => ({ ...prev, sort_by: field, sort_order: order, page: 1 }))
  }

  const handleResetFilters = () => {
    setQueryParams({
      page: 1,
      page_size: 10,
      search: '',
      status_id: '',
      accessibility_requirement_id: '',
      sort_by: 'created_at',
      sort_order: 'desc',
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try {
      const response = await apiClient.delete(`/api/admin/students/${deleteId}`)
      if (response.data.success) {
        toast('Student user account and profile deleted.', 'success')
        fetchStudents()
      }
    } catch (err) {
      toast(err.message || 'Failed to delete student.', 'error')
    } finally {
      setDeleteId(null)
    }
  }

  // Column definitions for DataTable
  const columns = [
    {
      key: 'first_name',
      label: 'Student',
      sortable: true,
      render: (row) => {
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        const avatar = row.profile_photo 
          ? (row.profile_photo.startsWith('uploads') ? `${baseURL}/${row.profile_photo}` : row.profile_photo)
          : null
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border bg-muted flex items-center justify-center font-bold text-xs select-none">
              {avatar ? (
                <img src={avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                `${row.first_name[0]}${row.last_name[0]}`
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-foreground text-sm leading-none mb-0.5">
                {row.first_name} {row.last_name}
              </span>
              <span className="text-xs text-muted-foreground leading-none font-mono">
                {row.student_profile?.enrollment_number || 'N/A'}
              </span>
            </div>
          </div>
        )
      },
    },
    {
      key: 'email',
      label: 'Email Address',
      sortable: false,
    },
    {
      key: 'accessibility_requirement',
      label: 'Accessibility',
      sortable: false,
      render: (row) => {
        const req = row.student_profile?.accessibility_requirement?.name || 'none'
        const badgeClasses = {
          blind: 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30',
          low_vision: 'bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/30',
          hearing_impaired: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30',
          mobility_assistance: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/30',
          learning_disability: 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/30',
          none: 'bg-slate-50 dark:bg-slate-900/20 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800',
        }
        return (
          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
            badgeClasses[req] || badgeClasses.none
          }`}>
            {req.replace('_', ' ')}
          </span>
        )
      },
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row) => (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
          row.status.name === 'active' 
            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30' 
            : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/30'
        }`}>
          {row.status.name}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Registered Date',
      sortable: true,
      render: (row) => new Date(row.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/admin/students/${row.id}`)}
            className="p-1.5 rounded-lg border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="View student profile details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(`/admin/students/${row.id}/edit`)}
            className="p-1.5 rounded-lg border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Edit student profile"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteId(row.id)}
            className="p-1.5 rounded-lg border bg-background hover:bg-rose-50 dark:hover:bg-rose-950/20 text-muted-foreground hover:text-rose-600 transition-colors"
            title="Delete student"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      
      {/* Title & Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Student Directory</h2>
          <p className="text-muted-foreground text-sm">Query, filter, and modify student records.</p>
        </div>
        <Link
          to="/admin/students/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/95 text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Student
        </Link>
      </div>

      {/* Query Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        
        {/* Search Input Form */}
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by student name, email, phone, or enrollment number..."
            value={queryParams.search}
            onChange={(e) => setQueryParams((prev) => ({ ...prev, search: e.target.value }))}
            className="w-full pl-10 pr-4 py-2 bg-card border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </form>

        <div className="flex gap-2">
          {/* Toggle Filters Button */}
          <button
            onClick={() => setFiltersOpen((prev) => !prev)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${
              filtersOpen
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          {/* Reset Parameters */}
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 px-3 py-2 bg-card text-muted-foreground hover:text-foreground rounded-lg border text-sm font-semibold hover:bg-muted transition-colors"
            title="Reset Filters"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters Panel drawer */}
      {filtersOpen && (
        <div className="p-4 rounded-xl border bg-card/60 shadow-inner grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in text-sm">
          {/* Status Filter */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Account Status
            </label>
            <select
              value={queryParams.status_id}
              onChange={(e) => setQueryParams((prev) => ({ ...prev, status_id: e.target.value, page: 1 }))}
              className="w-full p-2 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="1">Active</option>
              <option value="2">Inactive</option>
              <option value="3">Blocked</option>
            </select>
          </div>

          {/* Accessibility Filter */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Accessibility Requirement
            </label>
            <select
              value={queryParams.accessibility_requirement_id}
              onChange={(e) => setQueryParams((prev) => ({ ...prev, accessibility_requirement_id: e.target.value, page: 1 }))}
              className="w-full p-2 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="">All Requirements</option>
              <option value="1">Blind</option>
              <option value="2">Low Vision</option>
              <option value="3">Hearing Impaired</option>
              <option value="4">Mobility Assistance</option>
              <option value="5">Learning Disability</option>
              <option value="6">None</option>
            </select>
          </div>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={data.records}
        loading={loading}
        pagination={{
          totalRecords: data.totalRecords,
          totalPages: data.totalPages,
          currentPage: data.currentPage,
          pageSize: data.pageSize,
          onPageChange: handlePageChange,
        }}
        sorting={{
          sortBy: queryParams.sort_by,
          sortOrder: queryParams.sort_order,
          onSort: handleSort,
        }}
      />

      {/* Reusable delete confirmation */}
      <ConfirmationDialog
        isOpen={deleteId !== null}
        title="Delete Student Record"
        message="Are you sure you want to delete this student account? This will permanently erase their registration, cascade profiles deletion, and revoke login credentials."
        confirmLabel="Delete Account"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />

    </div>
  )
}
