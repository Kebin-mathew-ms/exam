import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, Search, Filter, RotateCcw, Upload, Download, Copy, Eye, FileSpreadsheet } from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import DataTable from '../components/DataTable'
import ConfirmationDialog from '../components/ConfirmationDialog'

export default function QuestionBank() {
  const { toast } = useToast()
  const navigate = useNavigate()

  // State Management
  const [data, setData] = useState({ records: [], totalRecords: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [lookups, setLookups] = useState({ categories: [], difficulties: [], question_types: [], subjects: [] })

  // Query Parameters
  const [queryParams, setQueryParams] = useState({
    page: 1,
    page_size: 10,
    search: '',
    subject_id: '',
    category_id: '',
    difficulty_id: '',
    question_type_id: '',
    sort_by: 'created_at',
    sort_order: 'desc',
  })

  // Import Modal States
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importReport, setImportReport] = useState(null)

  // Confirmation States
  const [deleteId, setDeleteId] = useState(null)
  const [exportDropdown, setExportDropdown] = useState(false)

  const fetchQuestions = async () => {
    setLoading(true)
    try {
      const params = {
        page: queryParams.page,
        page_size: queryParams.page_size,
        sort_by: queryParams.sort_by,
        sort_order: queryParams.sort_order,
      }
      if (queryParams.search) params.search = queryParams.search
      if (queryParams.subject_id) params.subject_id = parseInt(queryParams.subject_id)
      if (queryParams.category_id) params.category_id = parseInt(queryParams.category_id)
      if (queryParams.difficulty_id) params.difficulty_id = parseInt(queryParams.difficulty_id)
      if (queryParams.question_type_id) params.question_type_id = parseInt(queryParams.question_type_id)

      const response = await apiClient.get('/api/admin/questions', { params })
      if (response.data.success) {
        setData(response.data.data)
      }
    } catch (err) {
      toast(err.message || 'Failed to retrieve questions list.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchLookups = async () => {
    try {
      const response = await apiClient.get('/api/admin/questions/lookups')
      if (response.data.success) {
        setLookups(response.data.data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchLookups()
  }, [])

  useEffect(() => {
    fetchQuestions()
  }, [queryParams])

  const handlePageChange = (newPage) => {
    setQueryParams((prev) => ({ ...prev, page: newPage }))
  }

  const handleSort = (field, order) => {
    setQueryParams((prev) => ({ ...prev, sort_by: field, sort_order: order, page: 1 }))
  }

  const handleResetFilters = () => {
    setQueryParams({
      page: 1,
      page_size: 10,
      search: '',
      subject_id: '',
      category_id: '',
      difficulty_id: '',
      question_type_id: '',
      sort_by: 'created_at',
      sort_order: 'desc',
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try {
      const response = await apiClient.delete(`/api/admin/questions/${deleteId}`)
      if (response.data.success) {
        toast('Question deleted successfully.', 'success')
        fetchQuestions()
      }
    } catch (err) {
      toast(err.message || 'Failed to delete question.', 'error')
    } finally {
      setDeleteId(null)
    }
  }

  const handleDuplicate = async (row) => {
    try {
      const payload = {
        title: `${row.title} (Copy)`,
        description: row.description,
        subject_id: row.subject_id,
        category_id: row.category_id,
        difficulty_id: row.difficulty_id,
        question_type_id: row.question_type_id,
        marks: row.marks,
        negative_marks: row.negative_marks,
        explanation: row.explanation,
        options: row.options.map(opt => ({
          option_text: opt.option_text,
          is_correct: opt.is_correct,
          display_order: opt.display_order
        }))
      }
      const response = await apiClient.post('/api/admin/questions', payload)
      if (response.data.success) {
        toast('Question duplicated.', 'success')
        fetchQuestions()
      }
    } catch (err) {
      toast(err.message || 'Duplication failed', 'error')
    }
  }

  const handleSecureExport = async (format) => {
    setExportDropdown(false)
    try {
      const response = await apiClient.get(`/api/admin/questions/export?format=${format}`, {
        responseType: 'blob',
      })
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const ext = format === 'excel' ? 'xlsx' : format
      link.setAttribute('download', `question_bank_export.${ext}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast(`Export completed for format: ${format.toUpperCase()}`, 'success')
    } catch (err) {
      toast(err.message || 'Export failed.', 'error')
    }
  }

  const handleImportSubmit = async (e) => {
    e.preventDefault()
    if (!importFile) return
    setImporting(true)
    setImportReport(null)

    const formData = new FormData()
    formData.append('file', importFile)

    try {
      const response = await apiClient.post('/api/admin/questions/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (response.data.success) {
        setImportReport(response.data.data)
        fetchQuestions()
        toast('Import file processed.', 'success')
      }
    } catch (err) {
      toast(err.message || 'File import failed.', 'error')
    } finally {
      setImporting(false)
    }
  }

  // Columns layout
  const columns = [
    {
      key: 'title',
      label: 'Question Info',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col gap-1 max-w-xs">
          <span className="font-semibold text-foreground text-sm line-clamp-1">{row.title}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            {row.subject?.subject_code} • {row.category?.name}
          </span>
        </div>
      ),
    },
    {
      key: 'question_type',
      label: 'Format Type',
      render: (row) => (
        <span className="text-xs font-semibold text-muted-foreground uppercase">
          {row.question_type?.name}
        </span>
      ),
    },
    {
      key: 'difficulty',
      label: 'Difficulty',
      render: (row) => {
        const difficultyClasses = {
          Easy: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
          Medium: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
          Hard: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30',
        }
        const name = row.difficulty?.name || 'Easy'
        return (
          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
            difficultyClasses[name] || difficultyClasses.Easy
          }`}>
            {name}
          </span>
        )
      },
    },
    {
      key: 'marks',
      label: 'Marks Info',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col text-xs">
          <span className="text-foreground font-semibold">+{row.marks} Marks</span>
          <span className="text-rose-500">-{row.negative_marks} Neg.</span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/admin/questions/${row.id}/edit`)}
            className="p-1.5 rounded-lg border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Edit Question"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDuplicate(row)}
            className="p-1.5 rounded-lg border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Duplicate Question"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteId(row.id)}
            className="p-1.5 rounded-lg border bg-background hover:bg-rose-50 dark:hover:bg-rose-950/20 text-muted-foreground hover:text-rose-600 transition-colors"
            title="Delete Question"
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
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Question Bank</h2>
          <p className="text-muted-foreground text-sm">Create, query, import, and catalog examination queries.</p>
        </div>
        
        {/* Buttons Panel */}
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-card hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg border text-sm font-semibold transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportDropdown((prev) => !prev)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-card hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg border text-sm font-semibold transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            {exportDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportDropdown(false)} />
                <div className="absolute right-0 mt-2 w-40 rounded-xl border bg-card shadow-2xl glass-panel p-1.5 z-50 text-xs">
                  <button
                    onClick={() => handleSecureExport('csv')}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Export to CSV
                  </button>
                  <button
                    onClick={() => handleSecureExport('excel')}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Export to Excel
                  </button>
                  <button
                    onClick={() => handleSecureExport('pdf')}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Export to PDF
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => navigate('/admin/questions/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/95 text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>
        </div>
      </div>

      {/* Query Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search questions by keyword title or description..."
            value={queryParams.search}
            onChange={(e) => setQueryParams((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
            className="w-full pl-10 pr-4 py-2 bg-card border rounded-lg text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
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
          
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 px-3 py-2 bg-card text-muted-foreground hover:text-foreground rounded-lg border text-sm font-semibold hover:bg-muted transition-colors"
            title="Reset Filters"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Drawers Panel */}
      {filtersOpen && (
        <div className="p-4 rounded-xl border bg-card/60 shadow-inner grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in text-xs">
          {/* Subject Filter */}
          <div>
            <label className="block font-semibold text-muted-foreground uppercase mb-1">Subject Syllabus</label>
            <select
              value={queryParams.subject_id}
              onChange={(e) => setQueryParams((prev) => ({ ...prev, subject_id: e.target.value, page: 1 }))}
              className="w-full p-2 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="">All Subjects</option>
              {lookups.subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block font-semibold text-muted-foreground uppercase mb-1">Category</label>
            <select
              value={queryParams.category_id}
              onChange={(e) => setQueryParams((prev) => ({ ...prev, category_id: e.target.value, page: 1 }))}
              className="w-full p-2 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="">All Categories</option>
              {lookups.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="block font-semibold text-muted-foreground uppercase mb-1">Difficulty Level</label>
            <select
              value={queryParams.difficulty_id}
              onChange={(e) => setQueryParams((prev) => ({ ...prev, difficulty_id: e.target.value, page: 1 }))}
              className="w-full p-2 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="">All Levels</option>
              {lookups.difficulties.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Question Type Filter */}
          <div>
            <label className="block font-semibold text-muted-foreground uppercase mb-1">Question Type</label>
            <select
              value={queryParams.question_type_id}
              onChange={(e) => setQueryParams((prev) => ({ ...prev, question_type_id: e.target.value, page: 1 }))}
              className="w-full p-2 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="">All Formats</option>
              {lookups.question_types.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* DataTable */}
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

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={deleteId !== null}
        title="Delete Question Bank Entry"
        message="Are you sure you want to delete this question? Deleting it will cascade deletion to its options list and remove it from mapped exams."
        confirmLabel="Confirm Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />

      {/* Import Modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { if(!importing) setImportOpen(false) }} />
          <div className="bg-card border rounded-xl w-full max-w-lg shadow-2xl glass-panel p-6 z-10 space-y-4 text-sm animate-scale-in">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Import Questions Directory
            </h3>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div className="border border-dashed p-6 rounded-xl flex flex-col items-center justify-center gap-2">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="text-xs"
                />
                <span className="text-[10px] text-muted-foreground">Supports CSV and Microsoft Excel templates (.xlsx)</span>
              </div>

              {/* Import report parsing feedback logs */}
              {importReport && (
                <div className="p-3 bg-muted/30 border rounded-lg max-h-40 overflow-y-auto space-y-2 text-xs">
                  <p className="font-bold text-foreground">Import Results:</p>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Parsed Success: <strong className="text-emerald-600 font-bold">{importReport.success_count}</strong></span>
                    <span>Parsed Failures: <strong className="text-rose-600 font-bold">{importReport.failure_count}</strong></span>
                  </div>
                  {importReport.errors.map((err, i) => (
                    <p key={i} className="text-rose-500 font-medium">Row {err.row}: {err.error}</p>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => { setImportOpen(false); setImportFile(null); setImportReport(null) }}
                  className="px-4 py-2 border rounded-lg hover:bg-muted"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={importing || !importFile}
                  className="px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-lg font-semibold flex items-center gap-2"
                >
                  {importing ? 'Processing...' : 'Upload File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
