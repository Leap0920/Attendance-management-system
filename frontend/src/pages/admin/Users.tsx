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
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  const loadUsers = () => {
    setLoading(true);
    adminApi.getUsers(filter || undefined, statusFilter || undefined).then(res => {
      setUsers(res.data.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, [filter, statusFilter]);

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
        <div className={`admin-toast ${toast.type} animate-fade-in`} style={{ top: '1.5rem', right: '1.5rem', transform: 'none' }}>
          <span style={{ background: toast.type === 'success' ? '#10b981' : '#ef4444', color: 'white', padding: '0.25rem', borderRadius: '50%' }}>
            {toast.type === 'success' ? <Check size={14} /> : <X size={14} />}
          </span>
          {toast.text}
        </div>
      )}

      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title gradient-text">User Directory</h1>
          <p className="page-subtitle">Manage system access, roles and department assignments</p>
        </div>
        <button className="btn btn-primary shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2" style={{ width: 'auto', padding: '0.75rem 1.5rem', borderRadius: '14px' }} onClick={() => setShowCreateModal(true)}>
          <Plus size={20} /> Create User
        </button>
      </div>

      {/* Role Filter Tabs */}
      <div className="admin-filter-bar animate-fade-in" style={{ animationDelay: '0.1s', border: 'none', background: 'transparent' }}>
        <div className="admin-filter-tabs" style={{ padding: '0.35rem', borderRadius: '35px', boxShadow: 'var(--shadow-premium)' }}>
          {[
            { key: '', label: 'All Users', count: roleStats.all },
            { key: 'admin', label: 'Admins', count: roleStats.admin },
            { key: 'teacher', label: 'Teachers', count: roleStats.teacher },
            { key: 'student', label: 'Students', count: roleStats.student },
          ].map(tab => (
            <button key={tab.key}
              className={`admin-filter-tab ${filter === tab.key ? 'active' : ''}`}
              onClick={() => setFilter(tab.key)}
              style={{ borderRadius: '30px', padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
              {tab.label}
              <span className="admin-filter-count" style={{ background: filter === tab.key ? 'rgba(255,255,255,0.2)' : '#f1f5f9', color: filter === tab.key ? 'white' : '#64748b' }}>{tab.count}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select
            className="form-input"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ minWidth: 140, height: '42px', borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-premium)' }}
          >
            <option value="">Any Status</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended</option>
          </select>
          <div className="admin-search-box focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-sm" style={{ height: '42px', borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-premium)', minWidth: '300px' }}>
            <span className="admin-search-icon"><Search size={18} /></span>
            <input
              type="text"
              placeholder="Search directory..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="admin-search-input"
            />
            {search && (
              <button className="admin-search-clear hover:bg-gray-100 transition-colors" onClick={() => setSearch('')}><X size={16} /></button>
            )}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="premium-card animate-fade-in" style={{ animationDelay: '0.2s', padding: '1rem 0' }}>
        <div className="data-table-wrapper" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr style={{ background: 'transparent' }}>
                <th style={{ background: 'transparent', paddingLeft: '2rem' }}>Identity</th>
                <th style={{ background: 'transparent' }}>Contact Info</th>
                <th style={{ background: 'transparent' }}>Permission</th>
                <th style={{ background: 'transparent' }}>Department</th>
                <th style={{ background: 'transparent' }}>Activity</th>
                <th style={{ background: 'transparent', textAlign: 'right', paddingRight: '2rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '5rem' }}>
                  <div className="spinner" style={{ margin: '0 auto' }}></div>
                </td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Search size={48} strokeWidth={1} style={{ opacity: 0.3 }} />
                    <div>{search ? `No results found for "${search}"` : 'No users found in this directory'}</div>
                  </div>
                </td></tr>
              ) : filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-all duration-200" style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <td style={{ paddingLeft: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div className="admin-table-avatar shadow-sm" style={{
                        width: '42px', height: '42px', borderRadius: '12px',
                        background: u.role === 'teacher' ? 'linear-gradient(135deg, #0ea5e9, #0284c7)' :
                          u.role === 'admin' ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' :
                            'linear-gradient(135deg, #10b981, #059669)',
                        fontSize: '0.9rem', fontWeight: 800
                      }}>
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{u.fullName}</div>
                        {u.studentId && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ID: {u.studentId}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{u.email}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Primary Contact</div>
                  </td>
                  <td>
                    <span className={`badge badge-${u.role}`} style={{ borderRadius: '6px', padding: '0.3rem 0.75rem', fontWeight: 800, fontSize: '0.65rem' }}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>{u.department || '—'}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>School Unit</div>
                  </td>
                  <td>
                    <div className={`admin-status-pill ${u.status === 'active' ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleStatus(u)}
                      style={{ cursor: 'pointer', padding: '0.3rem 0.8rem', borderRadius: '20px', display: 'inline-flex', alignItems: 'center' }}
                      title={`Click to ${u.status === 'active' ? 'suspend' : 'activate'}`}>
                      <span className="admin-status-dot" style={{ width: 8, height: 8 }}></span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{u.status}</span>
                    </div>
                  </td>
                  <td style={{ paddingRight: '2rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="admin-action-btn edit" onClick={() => openEdit(u)} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-secondary)', color: '#2563eb' }}>
                        <Edit2 size={16} />
                      </button>
                      <button className="admin-action-btn delete" onClick={() => setShowDeleteConfirm(u.id)} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-table-footer" style={{ border: 'none', color: 'var(--text-muted)', fontWeight: 600, padding: '1.5rem 2rem' }}>
          {filteredUsers.length} total personnel found
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }} onClick={() => setShowCreateModal(false)}>
          <div className="premium-card modal animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>Onboard Personnel</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>First Name</label>
                  <input className="form-input" style={{ padding: '0.75rem' }} value={createForm.firstName} onChange={e => setCreateForm({ ...createForm, firstName: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Last Name</label>
                  <input className="form-input" style={{ padding: '0.75rem' }} value={createForm.lastName} onChange={e => setCreateForm({ ...createForm, lastName: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Email Address</label>
                  <input className="form-input" style={{ padding: '0.75rem' }} type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Access Password</label>
                  <input className="form-input" style={{ padding: '0.75rem' }} type="password" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} required placeholder="Min 6 characters" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>System Role</label>
                    <select className="form-input" style={{ padding: '0.75rem' }} value={createForm.role} onChange={e => setCreateForm({ ...createForm, role: e.target.value })}>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Department</label>
                  <input className="form-input" style={{ padding: '0.75rem' }} value={createForm.department} onChange={e => setCreateForm({ ...createForm, department: e.target.value })} placeholder="e.g. CS, Physics" />
                </div>
              </div>
              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" style={{ width: 'auto', background: 'transparent', border: 'none' }} onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary shadow-lg" style={{ width: 'auto', padding: '0.75rem 1.5rem' }} disabled={saving}>
                  {saving ? 'Creating Account...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }} onClick={() => setShowEditModal(false)}>
          <div className="premium-card modal animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>Profile Configuration</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0', padding: '1.25rem', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-glass)' }}>
              <div className="admin-table-avatar shadow-sm" style={{
                background: editingUser.role === 'teacher' ? 'linear-gradient(135deg, #0ea5e9, #0284c7)' :
                  editingUser.role === 'admin' ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' :
                    'linear-gradient(135deg, #10b981, #059669)',
                width: 50, height: 50, fontSize: '1rem', fontWeight: 800, borderRadius: '14px'
              }}>
                {editingUser.firstName?.[0]}{editingUser.lastName?.[0]}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{editingUser.fullName}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Object Reference ID #{editingUser.id}</div>
              </div>
            </div>
            <form onSubmit={handleEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>First Name</label>
                  <input className="form-input" style={{ padding: '0.75rem' }} value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Last Name</label>
                  <input className="form-input" style={{ padding: '0.75rem' }} value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Email Address</label>
                <input className="form-input" style={{ padding: '0.75rem' }} type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>System Role</label>
                  <select className="form-input" style={{ padding: '0.75rem' }} value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Activity Status</label>
                  <select className="form-input" style={{ padding: '0.75rem' }} value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Change Department</label>
                <input className="form-input" style={{ padding: '0.75rem' }} value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Reset Password <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(Optional)</span></label>
                <input className="form-input" style={{ padding: '0.75rem' }} type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="New password..." />
              </div>
              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" style={{ width: 'auto', background: 'transparent', border: 'none' }} onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary shadow-lg" style={{ width: 'auto', padding: '0.75rem 1.5rem' }} disabled={saving}>
                  {saving ? 'Applying Changes...' : 'Synchronize Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm !== null && (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }} onClick={() => setShowDeleteConfirm(null)}>
          <div className="premium-card modal animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center', padding: '2.5rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="shadow-lg" style={{
                width: 72, height: 72, borderRadius: '24px', background: '#fef2f2',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1.5rem', color: '#ef4444', border: '1px solid #fee2e2'
              }}>
                <Trash2 size={36} />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Delete Account?</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                This is a destructive action. All associated academic records and system logs for this user will be <strong>permanently purged</strong>.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.85rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1, border: 'none' }} onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger shadow-md" style={{ flex: 1 }} onClick={() => handleDelete(showDeleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminUsers;
