import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === `/${role}`) return location.pathname === path;
    return location.pathname.startsWith(path);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontWeight: 700,
              fontSize: '0.8rem', color: '#fff',
            }}>
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
    </div>
  );
};

export default DashboardLayout;
