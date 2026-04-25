import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  ClipboardList, 
  Archive, 
  Trash2, 
  User, 
  Book, 
  FileText,
  Plus,
  ArrowRight
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { adminApi } from '../../api';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    adminApi.getDashboard().then(res => {
      setStats(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const statCards = stats ? [
    { label: 'Total Users', value: stats.totalUsers, icon: <Users size={20} />, color: '#3b82f6', bg: '#eff6ff', trend: stats.activeUsers ? `${stats.activeUsers} active` : '' },
    { label: 'Teachers', value: stats.totalTeachers, icon: <GraduationCap size={20} />, color: '#06b6d4', bg: '#ecfeff', trend: '' },
    { label: 'Students', value: stats.totalStudents, icon: <BookOpen size={20} />, color: '#10b981', bg: '#f0fdf4', trend: '' },
    { label: 'Active Courses', value: stats.activeCourses, icon: <ClipboardList size={20} />, color: '#8b5cf6', bg: '#f5f3ff', trend: `${stats.totalCourses || 0} total` },
    { label: 'Archived', value: stats.archivedCourses, icon: <Archive size={20} />, color: '#f59e0b', bg: '#fffbeb', trend: '' },
    { label: 'Deleted', value: stats.deletedCourses, icon: <Trash2 size={20} />, color: '#ef4444', bg: '#fef2f2', trend: '' },
  ] : [];

  const quickActions = [
    { label: 'Manage Users', desc: 'Add, edit, or remove users', icon: <User size={22} />, path: '/admin/users', color: '#3b82f6' },
    { label: 'View Courses', desc: 'Monitor all classrooms', icon: <Book size={22} />, path: '/admin/courses', color: '#8b5cf6' },
    { label: 'Audit Trail', desc: 'Track system activity', icon: <FileText size={22} />, path: '/admin/audit-log', color: '#10b981' },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">System overview and management</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary shadow-sm hover:shadow-md transition-all active:scale-95" style={{ width: 'auto' }} onClick={() => navigate('/admin/users')}>
            <Plus size={18} />
            Add User
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '60vh' }}><div className="spinner"></div></div>
      ) : stats && (
        <>
          {/* Stats Cards */}
          <div className="admin-stats-grid">
            {statCards.map((card, i) => (
              <div key={i} className="admin-stat-card hover:translate-y-[-2px] transition-all duration-300" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="admin-stat-icon" style={{ background: card.bg, color: card.color }}>
                  {card.icon}
                </div>
                <div className="admin-stat-info">
                  <div className="admin-stat-value">{card.value}</div>
                  <div className="admin-stat-label">{card.label}</div>
                  {card.trend && <div className="admin-stat-trend">{card.trend}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="admin-content-grid">
            {/* Quick Actions */}
            <div className="admin-section-card">
              <div className="admin-section-header">
                <h3>Quick Actions</h3>
              </div>
              <div className="admin-actions-grid">
                {quickActions.map((action, i) => (
                  <div
                    key={i}
                    className="admin-action-card group hover:translate-x-1 transition-all duration-300"
                    onClick={() => navigate(action.path)}
                  >
                    <div className="admin-action-icon" style={{ background: `${action.color}12`, color: action.color }}>
                      {action.icon}
                    </div>
                    <div>
                      <div className="admin-action-title">{action.label}</div>
                      <div className="admin-action-desc">{action.desc}</div>
                    </div>
                    <span className="admin-action-arrow group-hover:translate-x-1 transition-transform">
                      <ArrowRight size={18} />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* System Health */}
            <div className="admin-section-card">
              <div className="admin-section-header">
                <h3>System Health</h3>
                <span className="admin-health-badge">
                  <span className="admin-health-dot"></span>
                  All Systems Normal
                </span>
              </div>
              <div className="admin-health-grid">
                <div className="admin-health-item">
                  <div className="admin-health-label">User Engagement</div>
                  <div className="admin-health-bar-container">
                    <div className="admin-health-bar transition-all duration-1000" style={{
                      width: `${stats.totalUsers > 0 ? Math.min(((stats.activeUsers || 0) / stats.totalUsers) * 100, 100) : 0}%`,
                      background: 'linear-gradient(90deg, #10b981, #34d399)'
                    }}></div>
                  </div>
                  <span className="admin-health-pct">
                    {stats.totalUsers > 0 ? Math.round(((stats.activeUsers || 0) / stats.totalUsers) * 100) : 0}%
                  </span>
                </div>
                <div className="admin-health-item">
                  <div className="admin-health-label">Active Courses</div>
                  <div className="admin-health-bar-container">
                    <div className="admin-health-bar transition-all duration-1000" style={{
                      width: `${stats.totalCourses > 0 ? Math.min((stats.activeCourses / stats.totalCourses) * 100, 100) : 0}%`,
                      background: 'linear-gradient(90deg, #3b82f6, #60a5fa)'
                    }}></div>
                  </div>
                  <span className="admin-health-pct">
                    {stats.totalCourses > 0 ? Math.round((stats.activeCourses / stats.totalCourses) * 100) : 0}%
                  </span>
                </div>
                <div className="admin-health-item">
                  <div className="admin-health-label">Student Ratio</div>
                  <div className="admin-health-bar-container">
                    <div className="admin-health-bar transition-all duration-1000" style={{
                      width: `${stats.totalUsers > 0 ? Math.min((stats.totalStudents / stats.totalUsers) * 100, 100) : 0}%`,
                      background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)'
                    }}></div>
                  </div>
                  <span className="admin-health-pct">
                    {stats.totalUsers > 0 ? Math.round((stats.totalStudents / stats.totalUsers) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Users Table */}
          <div className="admin-section-card shadow-sm hover:shadow-md transition-shadow duration-300" style={{ marginTop: '1.25rem' }}>
            <div className="admin-section-header">
              <h3>Recent Users</h3>
              <button className="btn btn-sm btn-secondary hover:bg-gray-200 transition-all" style={{ width: 'auto' }}
                onClick={() => navigate('/admin/users')}>
                View All <ArrowRight size={14} style={{ marginLeft: '0.25rem' }} />
              </button>
            </div>
            <div className="data-table-wrapper" style={{ border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentUsers?.map((u: any) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div className="admin-table-avatar" style={{
                            background: u.role === 'teacher' ? 'linear-gradient(135deg, #06b6d4, #0891b2)' :
                              u.role === 'admin' ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' :
                                'linear-gradient(135deg, #10b981, #059669)'
                          }}>
                            {u.firstName?.[0]}{u.lastName?.[0]}
                          </div>
                          <span style={{ fontWeight: 600 }}>{u.fullName}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                      <td>
                        <span className={`admin-status-pill ${u.status === 'active' ? 'active' : 'inactive'}`}>
                          <span className="admin-status-dot"></span>
                          {u.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default AdminDashboard;
