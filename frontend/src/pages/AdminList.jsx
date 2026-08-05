import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, ShieldAlert, Key, UserCheck, RotateCcw } from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import useAuth from '../hooks/useAuth'
import DataTable from '../components/DataTable'
import ConfirmationDialog from '../components/ConfirmationDialog'

export default function AdminList() {
  const { toast } = useToast()
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()

  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)

  const isSuperAdmin = currentUser?.role?.name === 'super_admin'

  // Modal / Dialogue States
  const [deleteId, setDeleteId] = useState(null)
  const [resetPwId, setResetPwId] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [pwError, setPwError] = useState('')

  const fetchAdmins = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/api/admin/admins')
      if (response.data.success) {
        setAdmins(response.data.data)
      }
    } catch (err) {
      toast(err.message || 'Failed to retrieve administrators directory.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdmins()
  }, [])

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try {
      const response = await apiClient.delete(`/api/admin/admins/${deleteId}`)
      if (response.data.success) {
        toast('Admin account deleted successfully.', 'success')
        fetchAdmins()
      }
    } catch (err) {
      toast(err.message || 'Failed to delete administrator.', 'error')
    } finally {
      setDeleteId(null)
    }
  }

  const handleResetPassword = async () => {
    if (!resetPwId) return
    if (newPassword.length < 8) {
      setPwError('Password must be at least 8 characters long')
      return
    }
    setPwError('')

    try {
      const response = await apiClient.post(`/api/admin/admins/${resetPwId}/reset-password`, {
        new_password: newPassword,
      })
      if (response.data.success) {
        toast('Administrator password reset successfully.', 'success')
        setResetPwId(null)
        setNewPassword('')
      }
    } catch (err) {
      toast(err.message || 'Failed to reset password.', 'error')
    }
  }

  // Column definitions for Admin List DataTable
  const columns = [
    {
      key: 'first_name',
      label: 'Admin User',
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
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                ID: #{row.id}
              </span>
            </div>
          </div>
        )
      },
    },
    {
      key: 'email',
      label: 'Email Address',
    },
    {
      key: 'phone',
      label: 'Phone Number',
    },
    {
      key: 'role',
      label: 'Security Role',
      render: (row) => (
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
          row.role.name === 'super_admin' 
            ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/30' 
            : 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/30'
        }`}>
          {row.role.name.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
          row.status.name === 'active' 
            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200' 
            : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-200'
        }`}>
          {row.status.name}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => {
        // Super Admins can update any admin. Normal admins cannot change another admin.
        const canMutate = isSuperAdmin
        const isSelf = currentUser?.id === row.id

        return (
          <div className="flex items-center gap-2">
            {canMutate && (
              <>
                <button
                  onClick={() => navigate(`/admin/admins/${row.id}/edit`)}
                  className="p-1.5 rounded-lg border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit administrator details"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setResetPwId(row.id)
                    setNewPassword('')
                    setPwError('')
                  }}
                  className="p-1.5 rounded-lg border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Reset administrator password"
                >
                  <Key className="w-4 h-4" />
                </button>
                {!isSelf && (
                  <button
                    onClick={() => setDeleteId(row.id)}
                    className="p-1.5 rounded-lg border bg-background hover:bg-rose-50 dark:hover:bg-rose-950/20 text-muted-foreground hover:text-rose-600 transition-colors"
                    title="Delete admin account"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
            {!canMutate && isSelf && (
              <button
                onClick={() => navigate('/admin/profile')}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Go to Profile
              </button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      
      {/* Page Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Administrators Directory</h2>
          <p className="text-muted-foreground text-sm">Review, register, or delete administrators.</p>
        </div>
        {isSuperAdmin && (
          <Link
            to="/admin/admins/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/95 text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Admin
          </Link>
        )}
      </div>

      {/* Admin Data Table */}
      <DataTable columns={columns} data={admins} loading={loading} />

      {/* Reusable Confirm dialogue for Deletion */}
      <ConfirmationDialog
        isOpen={deleteId !== null}
        title="Delete Administrator Account"
        message="Are you sure you want to delete this administrator account? This will revoke all admin privileges immediately."
        confirmLabel="Delete Admin"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />

      {/* Reset Password Modal Popup Drawer */}
      {resetPwId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setResetPwId(null)} />
          <div className="bg-card border rounded-xl w-full max-w-sm shadow-2xl glass-panel p-6 z-10 space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Reset Admin Password
            </h3>
            
            {pwError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-200 text-xs font-semibold">
                {pwError}
              </div>
            )}

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2.5 bg-background border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                  placeholder="•••••••• (Min: 8 characters)"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setResetPwId(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  className="px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-lg font-semibold"
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
