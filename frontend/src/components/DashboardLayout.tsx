import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: 'admin' | 'teacher' | 'student';
}

const navItems: Record<string, { label: string; path: string; icon: string }[]> = {
  admin: [
    { label: 'Dashboard', path: '/admin', icon: '📊' },
    { label: 'Users', path: '/admin/users', icon: '👥' },
    { label: 'Audit Log', path: '/admin/audit-log', icon: '📋' },
  ],
  teacher: [
    { label: 'Dashboard', path: '/teacher', icon: '📊' },
    { label: 'Courses', path: '/teacher/courses', icon: '📚' },
    { label: 'Attendance', path: '/teacher/attendance', icon: '📋' },
    { label: 'Materials', path: '/teacher/materials', icon: '📄' },
    { label: 'Reports', path: '/teacher/reports', icon: '📈' },
    { label: 'Messages', path: '/teacher/messages', icon: '💬' },
  ],
  student: [
    { label: 'Dashboard', path: '/student', icon: '📊' },
    { label: 'Courses', path: '/student/courses', icon: '📚' },
    { label: 'Attendance', path: '/student/attendance', icon: '📋' },
    { label: 'Materials', path: '/student/materials', icon: '📄' },
    { label: 'Messages', path: '/student/messages', icon: '💬' },
  ],
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, role }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
        <div className="sidebar-brand">🛡️ AttendEase</div>
        <nav className="sidebar-nav">
          {navItems[role]?.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--gradient-primary)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem',
            }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{user?.fullName}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
            Logout
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
};

export default DashboardLayout;
