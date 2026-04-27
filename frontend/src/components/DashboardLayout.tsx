import React, { useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LogOut, 
  User, 
  Settings, 
  Shield, 
  X, 
  AlertCircle,
  Menu,
  ChevronRight,
  Terminal,
  Activity
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { studentApi, teacherApi } from '../api';
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
        { label: 'Courses', path: '/admin/courses' },
        { label: 'Audit Log', path: '/admin/audit-log' },
      ],
    },
    {
      label: 'MONITORING',
      items: [
        { label: 'Analytics', path: '/admin/analytics' },
        { label: 'Security Alerts', path: '/admin/security-alerts' },
        { label: 'System Console', path: '/admin/security' },
        { label: 'Cloud Status', path: '/admin/health' },
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
        { label: 'Assignments', path: '/teacher/assignments' },
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
        { label: 'Assignments', path: '/student/assignments' },
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
  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm' | 'error' | 'success';
    onConfirm?: () => void;
    confirmLabel?: string;
  }>({ isOpen: false, title: '', message: '', type: 'alert' });

  // Modal event listeners
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

  // Swipe gesture variables
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (window.innerWidth > 900) return; // Only on mobile
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = Math.abs(touchEndY - touchStartY.current);

    // Only trigger if swipe is mostly horizontal
    if (Math.abs(deltaX) > deltaY) {
      setSidebarOpen(prev => {
        // Swipe right to open (from anywhere)
        if (!prev && deltaX > 50) {
          return true;
        }
        // Swipe left to close
        if (prev && deltaX < -50) {
          return false;
        }
        return prev;
      });
    }
  };

  // Accessibility: trap focus and disable scroll when sidebar is open
  React.useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add('sidebar-open');
      // Trap focus in sidebar
      const sidebar = document.getElementById('sidebar-menu');
      if (sidebar) {
        sidebar.focus();
      }
      const handleTab = (e: KeyboardEvent) => {
        if (!sidebarOpen) return;
        const focusableEls = sidebar?.querySelectorAll<HTMLElement>(
          'a, button, input, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableEls || focusableEls.length === 0) return;
        const first = focusableEls[0];
        const last = focusableEls[focusableEls.length - 1];
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
        if (e.key === 'Escape') {
          setSidebarOpen(false);
        }
      };
      window.addEventListener('keydown', handleTab);
      return () => {
        document.body.classList.remove('sidebar-open');
        window.removeEventListener('keydown', handleTab);
      };
    } else {
      document.body.classList.remove('sidebar-open');
    }
  }, [sidebarOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const apiForRole = role === 'student' ? studentApi : role === 'teacher' ? teacherApi : null;

  const hasAvatar = typeof user?.avatar === 'string' && user.avatar.trim().length > 0;

  const getAvatarUrl = (avatar?: unknown) => {
    if (typeof avatar !== 'string') return '';
    const value = avatar.trim();
    if (!value) return '';
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    return `http://${window.location.hostname}:8080${value.startsWith('/') ? value : `/${value}`}`;
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
    if (!apiForRole) {
      setProfileMsg({ type: 'error', text: 'Profile editing is only available for students and teachers' });
      return;
    }
    setSaving(true);
    setProfileMsg(null);
    try {
      const res = await apiForRole.updateProfile(profileForm);
      const updatedUser = res.data.data;
      if (updatedUser) {
        const nextUser = { ...user, ...updatedUser } as any;
        setUser(nextUser);
        localStorage.setItem('user', JSON.stringify(nextUser));
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
    if (!apiForRole) {
      setProfileMsg({ type: 'error', text: 'Password update is only available for students and teachers' });
      return;
    }
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
      await apiForRole.changePassword({
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

  const handleAvatarUpload = async (file?: File) => {
    if (!file || !apiForRole) return;
    const formData = new FormData();
    formData.append('file', file);

    setUploadingAvatar(true);
    setProfileMsg(null);
    try {
      const res = await apiForRole.uploadAvatar(formData);
      const updatedUser = res.data.data;
      if (updatedUser) {
        const nextUser = { ...user, ...updatedUser } as any;
        setUser(nextUser);
        localStorage.setItem('user', JSON.stringify(nextUser));
      }
      setProfileMsg({ type: 'success', text: 'Profile photo updated successfully!' });
      await refreshUser();
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Error uploading profile photo' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const deleteAvatar = async () => {
    if (!apiForRole) return;

    setUploadingAvatar(true);
    setProfileMsg(null);
    try {
      const res = await apiForRole.deleteAvatar();
      const updatedUser = res.data.data;
      if (updatedUser) {
        const nextUser = { ...user, ...updatedUser } as any;
        setUser(nextUser);
        localStorage.setItem('user', JSON.stringify(nextUser));
      }
      setProfileMsg({ type: 'success', text: 'Profile photo removed successfully!' });
      await refreshUser();
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Error removing profile photo' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = () => {
    if (!hasAvatar || uploadingAvatar) return;
    setModal({
      isOpen: true,
      title: 'Delete Profile Picture',
      message: 'Are you sure you want to remove your profile picture?',
      type: 'confirm',
      onConfirm: deleteAvatar,
      confirmLabel: 'Delete',
    });
  };

  return (
    <div
      className={`dashboard-layout${sidebarOpen ? ' sidebar-open' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sidebar overlay for mobile */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' active' : ''}`}
        style={{
          display: sidebarOpen ? 'block' : 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.25)',
          zIndex: 200,
        }}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        id="sidebar-menu"
        className={`sidebar${sidebarOpen ? ' open' : ''}`}
        style={sidebarOpen ? { zIndex: 201 } : {}}
        aria-modal="true"
        role="dialog"
        tabIndex={sidebarOpen ? 0 : -1}
        aria-hidden={!sidebarOpen}
      >
        {/* Close button for mobile sidebar */}
        <button
          className="sidebar-close-btn hover:rotate-90 transition-transform"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
          style={{
            display: 'none',
            position: 'absolute',
            top: 18,
            right: 18,
            background: 'none',
            border: 'none',
            fontSize: 28,
            color: 'var(--text-secondary)',
            zIndex: 202,
            cursor: 'pointer',
          }}
        >
          <X size={24} />
        </button>
        <div className="sidebar-brand gradient-text" style={{ fontSize: '1.5rem', letterSpacing: '-0.02em', marginBottom: '2.5rem' }}>
          AttendEase
        </div>
        <nav className="sidebar-nav">
          {navSections[role]?.map((section) => (
            <React.Fragment key={section.label}>
              <div className="sidebar-section-label">{section.label}</div>
              {section.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-link group ${isActive(item.path) ? 'active' : ''}`}
                  style={{ position: 'relative', overflow: 'hidden' }}
                >
                  <span className="group-hover:translate-x-1 transition-transform">{item.label}</span>
                  {isActive(item.path) && (
                    <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                  )}
                </Link>
              ))}
            </React.Fragment>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div 
            className="sidebar-profile glass-effect" 
            onClick={openProfile} 
            title="Account Settings"
            style={{ 
              padding: '0.85rem', 
              borderRadius: 'var(--radius-md)', 
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: '1px solid var(--border-glass)'
            }}
          >
            <div className="sidebar-avatar" style={{ 
              width: '38px', 
              height: '38px',
              boxShadow: '0 0 12px rgba(37, 99, 235, 0.15)',
              border: '2px solid #fff'
            }}>
              {hasAvatar ? (
                <img src={getAvatarUrl(user.avatar)} alt="Profile" className="avatar-image" />
              ) : (
                <span>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
              )}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.fullName}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                {user?.role}
              </div>
            </div>
          </div>
          <button 
            onClick={() => setShowLogout(true)} 
            className="btn btn-secondary" 
            style={{ 
              width: '100%', 
              fontSize: '0.8rem', 
              fontWeight: 700, 
              background: '#f8fafc',
              border: '1px solid #f1f5f9',
              color: 'var(--text-secondary)'
            }}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>

      </aside>

      <main className="main-content">{children}</main>

      {/* Logout Confirmation Modal */}
      {showLogout && (
        <div className="modal-overlay" onClick={() => setShowLogout(false)}>
          <div className="modal shadow-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px', textAlign: 'center' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: '#fef2f2',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1rem', fontSize: '1.25rem', color: '#ef4444',
              }}>
                <AlertCircle size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>Confirm Logout</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Are you sure you want to log out of your account?
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary transition-colors"
                style={{ flex: 1 }}
                onClick={() => setShowLogout(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger transition-colors shadow-sm hover:shadow-md"
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
          <div className="modal shadow-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', width: 'min(92vw, 460px)', margin: '0 auto', maxHeight: '90vh', overflowY: 'auto', padding: 'clamp(1rem, 2vw, 2rem)' }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Profile</h3>
              <button className="modal-close hover:rotate-90 transition-transform" onClick={() => setShowProfile(false)}><X size={20} /></button>
            </div>

            <div className="profile-avatar-lg shadow-sm">
              {hasAvatar ? (
                <img src={getAvatarUrl(user.avatar)} alt="Profile" className="avatar-image" />
              ) : (
                <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>
              )}
            </div>

            {(role === 'student' || role === 'teacher') && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '-0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    handleAvatarUpload(file);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm transition-colors"
                  style={{ width: 'auto' }}
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  <User size={14} className="mr-1" />
                  {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                </button>
                {hasAvatar && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm transition-colors"
                    style={{ width: 'auto' }}
                    onClick={handleDeleteAvatar}
                    disabled={uploadingAvatar}
                  >
                    <X size={14} className="mr-1" />
                    Delete Photo
                  </button>
                )}
              </div>
            )}

            <div className="profile-tabs">
              <button className={`profile-tab ${profileTab === 'info' ? 'active' : ''}`} onClick={() => { setProfileTab('info'); setProfileMsg(null); }}>
                <Settings size={14} className="mr-1 inline-block" />
                Personal Info
              </button>
              <button className={`profile-tab ${profileTab === 'security' ? 'active' : ''}`} onClick={() => { setProfileTab('security'); setProfileMsg(null); }}>
                <Shield size={14} className="mr-1 inline-block" />
                Security
              </button>
            </div>

            {profileMsg && (
              <div className={`alert alert-${profileMsg.type === 'success' ? 'success' : 'error'}`}>
                <AlertCircle size={14} className="mr-1" />
                {profileMsg.text}
              </div>
            )}

            {profileTab === 'info' && (
              <form onSubmit={handleProfileUpdate}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input className="form-input focus:ring-2 focus:ring-blue-100 transition-all" value={profileForm.firstName} onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input className="form-input focus:ring-2 focus:ring-blue-100 transition-all" value={profileForm.lastName} onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input className="form-input focus:ring-2 focus:ring-blue-100 transition-all" value={profileForm.department} onChange={e => setProfileForm({ ...profileForm, department: e.target.value })} placeholder="e.g. Computer Science" />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary transition-colors" onClick={() => setShowProfile(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary shadow-sm hover:shadow-md transition-all active:scale-95" style={{ width: 'auto' }} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {profileTab === 'security' && (
              <form onSubmit={handlePasswordChange}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input className="form-input focus:ring-2 focus:ring-blue-100 transition-all" type="password" value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input className="form-input focus:ring-2 focus:ring-blue-100 transition-all" type="password" value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input className="form-input focus:ring-2 focus:ring-blue-100 transition-all" type="password" value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary transition-colors" onClick={() => setShowProfile(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary shadow-sm hover:shadow-md transition-all active:scale-95" style={{ width: 'auto' }} disabled={saving}>
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
