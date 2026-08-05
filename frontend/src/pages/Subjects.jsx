import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, BookOpen, Layers, ShieldCheck } from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import Loader from '../components/Loader'
import ConfirmationDialog from '../components/ConfirmationDialog'

export default function Subjects() {
  const { toast } = useToast()
  
  const [activeTab, setActiveTab] = useState('subjects')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Lookups data state
  const [subjects, setSubjects] = useState([])
  const [categories, setCategories] = useState([])
  const [difficulties, setDifficulties] = useState([])
  const [qtypes, setQtypes] = useState([])

  // Modal / Form input states
  const [showForm, setShowForm] = useState(false)
  const [subjectId, setSubjectId] = useState(null)
  const [subjectName, setSubjectName] = useState('')
  const [subjectCode, setSubjectCode] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('active')
  const [deleteId, setDeleteId] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [subRes, lookupRes] = await Promise.all([
        apiClient.get('/api/admin/subjects'),
        apiClient.get('/api/admin/questions/lookups')
      ])

      if (subRes.data.success) setSubjects(subRes.data.data)
      if (lookupRes.data.success) {
        setCategories(lookupRes.data.data.categories)
        setDifficulties(lookupRes.data.data.difficulties)
        setQtypes(lookupRes.data.data.question_types)
      }
    } catch (err) {
      toast(err.message || 'Failed to populate lookups data.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleEditClick = (sub) => {
    setSubjectId(sub.id)
    setSubjectName(sub.subject_name)
    setSubjectCode(sub.subject_code)
    setDescription(sub.description || '')
    setStatus(sub.status)
    setShowForm(true)
  }

  const handleAddClick = () => {
    setSubjectId(null)
    setSubjectName('')
    setSubjectCode('')
    setDescription('')
    setStatus('active')
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!subjectName || !subjectCode) {
      toast('Please fill in Name and Code', 'error')
      return
    }
    setSaving(true)

    const payload = {
      subject_name: subjectName,
      subject_code: subjectCode,
      description,
      status
    }

    try {
      if (subjectId) {
        const res = await apiClient.put(`/api/admin/subjects/${subjectId}`, payload)
        if (res.data.success) {
          toast('Subject updated successfully.', 'success')
          loadData()
          setShowForm(false)
        }
      } else {
        const res = await apiClient.post('/api/admin/subjects', payload)
        if (res.data.success) {
          toast('Subject registered successfully.', 'success')
          loadData()
          setShowForm(false)
        }
      }
    } catch (err) {
      const errors = err.errors || []
      toast(errors[0] || err.message || 'Saving subject failed.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try {
      const res = await apiClient.delete(`/api/admin/subjects/${deleteId}`)
      if (res.data.success) {
        toast('Subject deleted successfully.', 'success')
        loadData()
      }
    } catch (err) {
      toast(err.message || 'Failed to delete subject.', 'error')
    } finally {
      setDeleteId(null)
    }
  }

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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Syllabus & Master Configs</h2>
          <p className="text-muted-foreground text-sm">Configure exam topics, question difficulty lookup indexes, and subject tables.</p>
        </div>
        {activeTab === 'subjects' && !showForm && (
          <button
            onClick={handleAddClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/95 text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Subject
          </button>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b gap-4 select-none">
        <button
          onClick={() => { setActiveTab('subjects'); setShowForm(false) }}
          className={`pb-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'subjects' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Subjects Master
        </button>
        <button
          onClick={() => { setActiveTab('categories'); setShowForm(false) }}
          className={`pb-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'categories' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Categories
        </button>
        <button
          onClick={() => { setActiveTab('lookups'); setShowForm(false) }}
          className={`pb-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'lookups' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Difficulties & Types
        </button>
      </div>

      {/* Form Card for Subject creation */}
      {showForm && activeTab === 'subjects' && (
        <div className="bg-card border rounded-xl p-6 shadow-sm max-w-xl animate-fade-in text-sm">
          <h3 className="font-bold text-base text-foreground mb-4">
            {subjectId ? 'Modify Subject syllabus' : 'Add Subject template'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Subject Name</label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                  placeholder="e.g. Intro to Algebra"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Subject Code</label>
                <input
                  type="text"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                  placeholder="e.g. MATH102"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none leading-relaxed"
                placeholder="Topic coverage, module syllabus details..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-lg font-semibold"
              >
                {saving ? 'Saving...' : 'Save Subject'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid of Subject Cards */}
      {activeTab === 'subjects' && !showForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((sub) => (
            <div key={sub.id} className="bg-card border rounded-xl p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-primary/50 transition-colors">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold bg-primary/10 text-primary px-2.5 py-0.5 rounded-md uppercase">
                    {sub.subject_code}
                  </span>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    sub.status === 'active' 
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50' 
                      : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700/50'
                  }`}>
                    {sub.status}
                  </span>
                </div>
                <h4 className="font-bold text-base text-foreground truncate">{sub.subject_name}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {sub.description || 'No description added.'}
                </p>
              </div>

              <div className="flex justify-end gap-2 border-t pt-3">
                <button
                  onClick={() => handleEditClick(sub)}
                  className="p-1.5 rounded-lg border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit Subject"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteId(sub.id)}
                  className="p-1.5 rounded-lg border bg-background hover:bg-rose-50 text-muted-foreground hover:text-rose-600 transition-colors"
                  title="Delete Subject"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {subjects.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground border border-dashed rounded-xl bg-card">
              No subjects registered. Click "Add Subject" to create one.
            </div>
          )}
        </div>
      )}

      {/* Categories lookup list view */}
      {activeTab === 'categories' && (
        <div className="bg-card border rounded-xl overflow-hidden max-w-2xl shadow-xs">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Category Name</th>
                <th className="px-6 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-muted/10">
                  <td className="px-6 py-3 font-mono text-xs">#{c.id}</td>
                  <td className="px-6 py-3 font-semibold text-foreground">{c.name}</td>
                  <td className="px-6 py-3 text-muted-foreground text-xs">{c.description || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Lookup difficulties and types list */}
      {activeTab === 'lookups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start max-w-4xl">
          {/* Difficulties Table */}
          <div className="bg-card border rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 bg-muted/30 border-b">
              <h4 className="font-semibold text-sm text-foreground">Difficulty Levels</h4>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-2.5">Level</th>
                  <th className="px-4 py-2.5">Definition</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {difficulties.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/10">
                    <td className="px-4 py-3 font-bold text-foreground">{d.name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{d.description || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Types Table */}
          <div className="bg-card border rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 bg-muted/30 border-b">
              <h4 className="font-semibold text-sm text-foreground">Question Formats</h4>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-2.5">Format Type</th>
                  <th className="px-4 py-2.5">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {qtypes.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/10">
                    <td className="px-4 py-3 font-bold text-foreground">{t.name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{t.description || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation dialog for Subject deletion */}
      <ConfirmationDialog
        isOpen={deleteId !== null}
        title="Delete Subject Template"
        message="Are you sure you want to delete this subject? This action will fail if any existing questions or exam configurations map to this subject."
        confirmLabel="Confirm Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />

    </div>
  )
}
