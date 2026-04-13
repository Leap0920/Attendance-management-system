import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { teacherApi } from '../api';
import Modal from './Modal';

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: 'admin' | 'teacher' | 'student';
}

interface NavSection {
  label: string;
  items: { label: string; path: string }[];
}

const navSections: Record<string, NavSection[]> = {
  admin: [
    {
      label: 'MAIN MENU',
      items: [
        { label: 'Dashboard', path: '/admin' },
        { label: 'Users', path: '/admin/users' },
        { label: 'Audit Log', path: '/admin/audit-log' },
      ],
    },
  ],
  teacher: [
    {
      label: 'MAIN MENU',
      items: [{ label: 'Dashboard', path: '/teacher' }],
    },
    {
      label: 'TEACHING',
      items: [
        { label: 'My Courses', path: '/teacher/courses' },
        { label: 'Attendance', path: '/teacher/attendance' },
        { label: 'Materials', path: '/teacher/materials' },
        { label: 'Reports', path: '/teacher/reports' },
      ],
    },
    {
      label: 'COMMUNICATION',
      items: [{ label: 'Messages', path: '/teacher/messages' }],
    },
  ],
  student: [
    {
      label: 'MAIN MENU',
      items: [{ label: 'Dashboard', path: '/student' }],
    },
    {
      label: 'LEARNING',
      items: [
        { label: 'My Courses', path: '/student/courses' },
        { label: 'Attendance', path: '/student/attendance' },
        { label: 'Materials', path: '/student/materials' },
      ],
    },
    {
      label: 'COMMUNICATION',
      items: [{ label: 'Messages', path: '/student/messages' }],
    },
  ],
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, role }) => {
  const { user, logout, setUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogout, setShowLogout] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileTab, setProfileTab] = useState<'info' | 'security'>('info');
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    department: (user as any)?.department || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm' | 'error' | 'success';
    onConfirm?: () => void;
    confirmLabel?: string;
  }>({ isOpen: false, title: '', message: '', type: 'alert' });

  React.useEffect(() => {
    const handleAlert = (e: any) => {
      setModal({
        isOpen: true,
        title: e.detail.title,
        message: e.detail.message,
        type: e.detail.type || 'alert',
      });
    };
    const handleConfirm = (e: any) => {
      setModal({
        isOpen: true,
        title: e.detail.title,
        message: e.detail.message,
        type: 'confirm',
        onConfirm: e.detail.onConfirm,
        confirmLabel: e.detail.confirmLabel,
      });
    };

    window.addEventListener('ff-alert', handleAlert);
    window.addEventListener('ff-confirm', handleConfirm);
    return () => {
      window.removeEventListener('ff-alert', handleAlert);
      window.removeEventListener('ff-confirm', handleConfirm);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === `/${role}`) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const openProfile = () => {
    setProfileForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      department: (user as any)?.department || '',
    });
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setProfileMsg(null);
    setProfileTab('info');
    setShowProfile(true);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setProfileMsg(null);
    try {
      const res = await teacherApi.updateProfile(profileForm);
      const updatedUser = res.data.data;
      if (updatedUser) {
        setUser({ ...user, ...updatedUser } as any);
        localStorage.setItem('user', JSON.stringify({ ...user, ...updatedUser }));
      }
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
      await refreshUser();
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Error updating profile' });
    }
    setSaving(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setProfileMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setProfileMsg({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    setSaving(true);
    setProfileMsg(null);
    try {
      await teacherApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setProfileMsg({ type: 'success', text: 'Password changed successfully!' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Error changing password' });
    }
    setSaving(false);
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">AttendEase</div>
        <nav className="sidebar-nav">
          {navSections[role]?.map((section) => (
            <React.Fragment key={section.label}>
              <div className="sidebar-section-label">{section.label}</div>
              {section.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
                >
                  <span>{item.label}</span>
                </Link>
              ))}
            </React.Fragment>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-profile" onClick={openProfile} title="Edit Profile">
            <div className="sidebar-avatar">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{user?.fullName}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
          </div>
          <button
            onClick={() => setShowLogout(true)}
            className="btn btn-sm"
            style={{ width: '100%', background: '#f3f4f6', color: 'var(--text-secondary)', border: '1px solid var(--border-glass)' }}
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">{children}</main>

      {/* Logout Confirmation Modal */}
      {showLogout && (
        <div className="modal-overlay" onClick={() => setShowLogout(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px', textAlign: 'center' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: '#fef2f2',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1rem', fontSize: '1.25rem', color: '#ef4444',
              }}>
                !
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>Confirm Logout</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Are you sure you want to log out of your account?
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowLogout(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {showProfile && (
        <div className="modal-overlay" onClick={() => setShowProfile(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Profile</h3>
              <button className="modal-close" onClick={() => setShowProfile(false)}>×</button>
            </div>

            <div className="profile-avatar-lg">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>

            <div className="profile-tabs">
              <button className={`profile-tab ${profileTab === 'info' ? 'active' : ''}`} onClick={() => { setProfileTab('info'); setProfileMsg(null); }}>
                Personal Info
              </button>
              <button className={`profile-tab ${profileTab === 'security' ? 'active' : ''}`} onClick={() => { setProfileTab('security'); setProfileMsg(null); }}>
                Security
              </button>
            </div>

            {profileMsg && (
              <div className={`alert alert-${profileMsg.type === 'success' ? 'success' : 'error'}`}>
                {profileMsg.text}
              </div>
            )}

            {profileTab === 'info' && (
              <form onSubmit={handleProfileUpdate}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input className="form-input" value={profileForm.firstName} onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input className="form-input" value={profileForm.lastName} onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input className="form-input" value={profileForm.department} onChange={e => setProfileForm({ ...profileForm, department: e.target.value })} placeholder="e.g. Computer Science" />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowProfile(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ width: 'auto' }} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {profileTab === 'security' && (
              <form onSubmit={handlePasswordChange}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input className="form-input" type="password" value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input className="form-input" type="password" value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input className="form-input" type="password" value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowProfile(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ width: 'auto' }} disabled={saving}>
                    {saving ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <Modal 
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={() => {
          if (modal.onConfirm) modal.onConfirm();
          setModal({ ...modal, isOpen: false });
        }}
        confirmLabel={modal.confirmLabel}
      />
    </div>
  );
};

export default DashboardLayout;
