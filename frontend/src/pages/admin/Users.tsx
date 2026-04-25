import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { adminApi } from '../../api';
import { User as UserType } from '../../types';
import { 
  Search, 
  X, 
  Plus, 
  Edit2, 
  Trash2, 
  Check
} from 'lucide-react';

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [createForm, setCreateForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'student', department: '' });
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', role: 'student', department: '', status: 'active', password: '' });
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  const loadUsers = () => {
    setLoading(true);
    adminApi.getUsers(filter || undefined).then(res => {
      setUsers(res.data.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, [filter]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(u =>
      u.fullName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q) ||
      u.studentId?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const roleStats = useMemo(() => ({
    all: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    teacher: users.filter(u => u.role === 'teacher').length,
    student: users.filter(u => u.role === 'student').length,
  }), [users]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.createUser(createForm);
      setShowCreateModal(false);
      setCreateForm({ firstName: '', lastName: '', email: '', password: '', role: 'student', department: '' });
      setToast({ type: 'success', text: 'User created successfully!' });
      loadUsers();
    } catch (err: any) {
      setToast({ type: 'error', text: err.response?.data?.message || 'Failed to create user' });
    }
    setSaving(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    try {
      const payload: any = { ...editForm };
      if (!payload.password) delete payload.password;
      await adminApi.updateUser(editingUser.id, payload);
      setShowEditModal(false);
      setEditingUser(null);
      setToast({ type: 'success', text: 'User updated successfully!' });
      loadUsers();
    } catch (err: any) {
      setToast({ type: 'error', text: err.response?.data?.message || 'Failed to update user' });
    }
    setSaving(false);
  };

  const openEdit = (user: UserType) => {
    setEditingUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      department: user.department || '',
      status: user.status,
      password: '',
    });
    setShowEditModal(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await adminApi.deleteUser(id);
      setToast({ type: 'success', text: 'User deleted successfully!' });
      setShowDeleteConfirm(null);
      loadUsers();
    } catch (err: any) {
      setToast({ type: 'error', text: err.response?.data?.message || 'Failed to delete user' });
    }
  };

  const handleToggleStatus = async (user: UserType) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await adminApi.updateUser(user.id, { status: newStatus });
      setToast({ type: 'success', text: `User ${newStatus === 'active' ? 'activated' : 'suspended'}` });
      loadUsers();
    } catch (err: any) {
      setToast({ type: 'error', text: err.response?.data?.message || 'Action failed' });
    }
  };

  return (
    <DashboardLayout role="admin">
      {/* Toast Notification */}
      {toast && (
        <div className={`admin-toast ${toast.type} animate-in slide-in-from-top-4 duration-300`}>
          <span>{toast.type === 'success' ? <Check size={18} /> : <X size={18} />}</span>
          {toast.text}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage all system accounts</p>
        </div>
        <button className="btn btn-primary shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-2" style={{ width: 'auto' }} onClick={() => setShowCreateModal(true)}>
          <Plus size={18} /> Add User
        </button>
      </div>

      {/* Role Filter Tabs */}
      <div className="admin-filter-bar">
        <div className="admin-filter-tabs">
          {[
            { key: '', label: 'All', count: roleStats.all },
            { key: 'admin', label: 'Admins', count: roleStats.admin },
            { key: 'teacher', label: 'Teachers', count: roleStats.teacher },
            { key: 'student', label: 'Students', count: roleStats.student },
          ].map(tab => (
            <button key={tab.key}
              className={`admin-filter-tab ${filter === tab.key ? 'active' : ''}`}
              onClick={() => setFilter(tab.key)}>
              {tab.label}
              <span className="admin-filter-count">{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="admin-search-box focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <span className="admin-search-icon"><Search size={18} /></span>
          <input
            type="text"
            placeholder="Search by name, email, or department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="admin-search-input"
          />
          {search && (
            <button className="admin-search-clear hover:bg-gray-100 transition-colors" onClick={() => setSearch('')}><X size={16} /></button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-section-card">
        <div className="data-table-wrapper" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Joined</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                  <div className="spinner" style={{ margin: '0 auto' }}></div>
                </td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  {search ? `No users matching "${search}"` : 'No users found'}
                </td></tr>
              ) : filteredUsers.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="admin-table-avatar" style={{
                        background: u.role === 'teacher' ? 'linear-gradient(135deg, #06b6d4, #0891b2)' :
                          u.role === 'admin' ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' :
                            'linear-gradient(135deg, #10b981, #059669)'
                      }}>
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.fullName}</div>
                        {u.studentId && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {u.studentId}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{u.email}</td>
                  <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{u.department || '—'}</td>
                  <td>
                    <span className={`admin-status-pill ${u.status === 'active' ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleStatus(u)}
                      style={{ cursor: 'pointer' }}
                      title={`Click to ${u.status === 'active' ? 'suspend' : 'activate'}`}>
                      <span className="admin-status-dot"></span>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                      <button className="admin-action-btn edit hover:bg-blue-50 transition-colors" onClick={() => openEdit(u)} title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button className="admin-action-btn delete hover:bg-red-50 transition-colors" onClick={() => setShowDeleteConfirm(u.id)} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-table-footer">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header border-b border-gray-100">
              <h3 className="modal-title flex items-center gap-2">
                <Plus size={20} className="text-blue-500" />
                Create New User
              </h3>
              <button className="modal-close hover:bg-gray-100 rounded-full p-1 transition-colors" onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input className="form-input" value={createForm.firstName} onChange={e => setCreateForm({ ...createForm, firstName: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input className="form-input" value={createForm.lastName} onChange={e => setCreateForm({ ...createForm, lastName: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} required placeholder="Min 6 characters" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-input" value={createForm.role} onChange={e => setCreateForm({ ...createForm, role: e.target.value })}>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input className="form-input" value={createForm.department} onChange={e => setCreateForm({ ...createForm, department: e.target.value })} placeholder="Optional" />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }} disabled={saving}>
                  {saving ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header border-b border-gray-100">
              <h3 className="modal-title flex items-center gap-2">
                <Edit2 size={20} className="text-blue-500" />
                Edit User
              </h3>
              <button className="modal-close hover:bg-gray-100 rounded-full p-1 transition-colors" onClick={() => setShowEditModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: 'var(--radius-sm)' }}>
              <div className="admin-table-avatar" style={{
                background: editingUser.role === 'teacher' ? 'linear-gradient(135deg, #06b6d4, #0891b2)' :
                  editingUser.role === 'admin' ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' :
                    'linear-gradient(135deg, #10b981, #059669)',
                width: 44, height: 44, fontSize: '0.85rem'
              }}>
                {editingUser.firstName?.[0]}{editingUser.lastName?.[0]}
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{editingUser.fullName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Editing profile • ID #{editingUser.id}</div>
              </div>
            </div>
            <form onSubmit={handleEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input className="form-input" value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input className="form-input" value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-input" value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input className="form-input" value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })} placeholder="Optional" />
              </div>
              <div className="form-group">
                <label className="form-label">New Password <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(leave blank to keep current)</span></label>
                <input className="form-input" type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="Enter new password..." />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm !== null && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px', textAlign: 'center' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: '#fef2f2',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1.25rem', color: '#ef4444',
              }}>
                <Trash2 size={32} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>Delete User?</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                This action cannot be undone. All data associated with this user will be permanently removed.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleDelete(showDeleteConfirm)}>Delete User</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminUsers;
