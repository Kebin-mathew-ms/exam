import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, ShieldAlert, Check } from 'lucide-react'
import apiClient from '../services/api'
import useToast from '../hooks/useToast'
import Loader from '../components/Loader'
import ConfirmationDialog from '../components/ConfirmationDialog'

export default function Users() {
  const { toast } = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  // Dialog & Modal state
  const [deleteUserId, setDeleteUserId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  // Form Fields
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    role_id: 2, // Default: Student
    status_id: 1, // Default: Active
  })
  const [formError, setFormError] = useState('')

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/api/users')
      if (response.data.success) {
        setUsers(response.data.data)
      }
    } catch (err) {
      toast(err.message || 'Failed to load users list.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleOpenCreate = () => {
    setEditingUser(null)
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      password: '',
      role_id: 2,
      status_id: 1,
    })
    setFormError('')
    setFormOpen(true)
  }

  const handleOpenEdit = (user) => {
    setEditingUser(user)
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      password: '', // blank unless changing
      role_id: user.role_id,
      status_id: user.status_id,
    })
    setFormError('')
    setFormOpen(true)
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    try {
      if (editingUser) {
        // Update user payload (password only sent if typed)
        const payload = { ...formData }
        if (!payload.password) delete payload.password

        const response = await apiClient.put(`/api/users/${editingUser.id}`, payload)
        if (response.data.success) {
          toast('User updated successfully.', 'success')
          setFormOpen(false)
          fetchUsers()
        }
      } else {
        // Create user
        if (!formData.password) {
          setFormError('Password is required for new users')
          return
        }
        const response = await apiClient.post('/api/users', formData)
        if (response.data.success) {
          toast('User registered successfully.', 'success')
          setFormOpen(false)
          fetchUsers()
        }
      }
    } catch (err) {
      const errors = err.errors || []
      setFormError(errors[0] || err.message || 'Action failed')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteUserId) return
    try {
      const response = await apiClient.delete(`/api/users/${deleteUserId}`)
      if (response.data.success) {
        toast('User account deleted successfully.', 'success')
        fetchUsers()
      }
    } catch (err) {
      toast(err.message || 'Could not delete user account.', 'error')
    } finally {
      setDeleteUserId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">User Directory</h2>
          <p className="text-muted-foreground text-sm">List, update, create, or delete portal users.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/95 text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Users table / Loading */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader size="large" />
        </div>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/10">
                    <td className="px-6 py-4 font-medium text-foreground">
                      {u.first_name} {u.last_name}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground select-all">{u.email}</td>
                    <td className="px-6 py-4 text-muted-foreground select-all">{u.phone}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wider ${
                        u.role.name === 'admin' 
                          ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400' 
                          : 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400'
                      }`}>
                        {u.role.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wider ${
                        u.status.name === 'active' 
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400' 
                          : u.status.name === 'blocked' 
                          ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                      }`}>
                        {u.status.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Edit user"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteUserId(u.id)}
                          className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/20 text-muted-foreground hover:text-rose-600 transition-colors"
                          aria-label="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-muted-foreground">
                      No users registered. Click "Add User" to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reusable Confirmation Dialog for deletion */}
      <ConfirmationDialog
        isOpen={deleteUserId !== null}
        title="Delete User Account"
        message="Are you sure you want to delete this user? This will revoke access and erase their active session registry."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteUserId(null)}
      />

      {/* Create / Edit Form Modal Drawer */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setFormOpen(false)} />
          <div className="bg-card border rounded-xl w-full max-w-md shadow-2xl glass-panel p-6 z-10 space-y-4">
            <h3 className="text-lg font-bold text-foreground">
              {editingUser ? 'Edit User Credentials' : 'Register New User'}
            </h3>
            
            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-200 text-xs font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full p-2.5 bg-background border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full p-2.5 bg-background border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2.5 bg-background border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2.5 bg-background border rounded-lg"
                  placeholder="+1234567890"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Password {editingUser && '(Leave blank to retain)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full p-2.5 bg-background border rounded-lg"
                  placeholder="••••••••"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">System Role</label>
                  <select
                    value={formData.role_id}
                    onChange={(e) => setFormData({ ...formData, role_id: parseInt(e.target.value) })}
                    className="w-full p-2.5 bg-background border rounded-lg"
                  >
                    <option value={1}>Admin</option>
                    <option value={2}>Student</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Account Status</label>
                  <select
                    value={formData.status_id}
                    onChange={(e) => setFormData({ ...formData, status_id: parseInt(e.target.value) })}
                    className="w-full p-2.5 bg-background border rounded-lg"
                  >
                    <option value={1}>Active</option>
                    <option value={2}>Inactive</option>
                    <option value={3}>Blocked</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-lg font-medium"
                >
                  {editingUser ? 'Save Changes' : 'Register User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
