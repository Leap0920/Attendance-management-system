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
  ArrowRight,
  TrendingUp,
  Activity,
  Shield,
  LayoutGrid
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
    { label: 'Total Users', value: stats.totalUsers, icon: <Users size={22} />, color: '#2563eb', bg: '#eff6ff', trend: stats.activeUsers ? `+${stats.activeUsers} Active` : '' },
    { label: 'Teachers', value: stats.totalTeachers, icon: <GraduationCap size={22} />, color: '#0891b2', bg: '#ecfeff', trend: 'Staff members' },
    { label: 'Students', value: stats.totalStudents, icon: <BookOpen size={22} />, color: '#059669', bg: '#f0fdf4', trend: 'Learners' },
    { label: 'Active Courses', value: stats.activeCourses, icon: <ClipboardList size={22} />, color: '#7c3aed', bg: '#f5f3ff', trend: `${stats.totalCourses || 0} Total` },
    { label: 'Archived', value: stats.archivedCourses, icon: <Archive size={22} />, color: '#d97706', bg: '#fffbeb', trend: 'Old data' },
    { label: 'Monitoring', value: 'Live', icon: <Activity size={22} />, color: '#dc2626', bg: '#fef2f2', trend: 'System Status' },
  ] : [];

  const quickActions = [
    { label: 'User Management', desc: 'Control access and roles', icon: <User size={24} />, path: '/admin/users', color: '#2563eb' },
    { label: 'Course Catalog', desc: 'Monitor all classrooms', icon: <Book size={24} />, path: '/admin/courses', color: '#7c3aed' },
    { label: 'Security Center', desc: 'Threats and IP rules', icon: <Shield size={24} />, path: '/admin/security', color: '#dc2626' },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title gradient-text" style={{ fontSize: '1.75rem' }}>System Overview</h1>
          <p className="page-subtitle">Welcome back, Administrator. Here's what's happening today.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.85rem' }}>
          <button className="btn btn-secondary shadow-sm hover:shadow-md transition-all active:scale-95" style={{ width: 'auto', background: '#fff' }} onClick={() => navigate('/admin/analytics')}>
            <Activity size={18} />
            Analytics
          </button>
          <button className="btn btn-primary shadow-sm hover:shadow-md transition-all active:scale-95" style={{ width: 'auto' }} onClick={() => navigate('/admin/users')}>
            <Plus size={18} />
            Add User
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '60vh' }}><div className="spinner"></div></div>
      ) : stats && (
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {/* Stats Cards */}
          <div className="admin-stats-grid">
            {statCards.map((card, i) => (
              <div key={i} className="premium-card" style={{ animationDelay: `${i * 0.05}s`, padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '80px', height: '80px', background: card.bg, borderRadius: '50%', opacity: 0.5, zIndex: 0 }}></div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div className="admin-stat-icon" style={{ background: card.bg, color: card.color, margin: 0, width: '46px', height: '46px', borderRadius: '12px' }}>
                      {card.icon}
                    </div>
                    {card.trend && <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.25rem 0.5rem', borderRadius: '20px', background: card.bg, color: card.color }}>{card.trend}</span>}
                  </div>
                  <div className="admin-stat-value" style={{ fontSize: '1.85rem', marginBottom: '0.25rem' }}>{card.value}</div>
                  <div className="admin-stat-label" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{card.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="admin-content-grid" style={{ marginTop: '1.5rem' }}>
            {/* Quick Actions */}
            <div className="premium-card" style={{ padding: '1.75rem' }}>
              <div className="admin-section-header">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Management Hub</h3>
                <LayoutGrid size={20} color="var(--text-muted)" />
              </div>
              <div className="admin-actions-grid" style={{ gap: '1rem' }}>
                {quickActions.map((action, i) => (
                  <div
                    key={i}
                    className="admin-action-card group"
                    style={{ 
                      background: '#f8fafc', 
                      border: '1px solid #f1f5f9',
                      padding: '1.25rem',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => navigate(action.path)}
                  >
                    <div className="admin-action-icon" style={{ background: '#fff', color: action.color, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                      {action.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="admin-action-title" style={{ fontWeight: 700 }}>{action.label}</div>
                      <div className="admin-action-desc">{action.desc}</div>
                    </div>
                    <span className="admin-action-arrow group-hover:translate-x-1 transition-transform">
                      <ArrowRight size={18} />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* System Performance */}
            <div className="premium-card" style={{ padding: '1.75rem' }}>
              <div className="admin-section-header">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Service Health</h3>
                <div className="admin-health-badge" style={{ background: '#f0fdf4', color: '#059669', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
                  All Systems Optimal
                </div>
              </div>
              <div className="admin-health-grid" style={{ gap: '1.5rem', marginTop: '1rem' }}>
                <div className="admin-health-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div className="admin-health-label" style={{ fontWeight: 600 }}>User Engagement</div>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{stats.totalUsers > 0 ? Math.round(((stats.activeUsers || 0) / stats.totalUsers) * 100) : 0}%</span>
                  </div>
                  <div className="admin-health-bar-container" style={{ height: '8px', borderRadius: '4px', background: '#f1f5f9' }}>
                    <div className="admin-health-bar" style={{
                      height: '100%', borderRadius: '4px',
                      width: `${stats.totalUsers > 0 ? Math.min(((stats.activeUsers || 0) / stats.totalUsers) * 100, 100) : 0}%`,
                      background: 'var(--gradient-primary)'
                    }}></div>
                  </div>
                </div>
                <div className="admin-health-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div className="admin-health-label" style={{ fontWeight: 600 }}>Classroom Activity</div>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{stats.totalCourses > 0 ? Math.round((stats.activeCourses / stats.totalCourses) * 100) : 0}%</span>
                  </div>
                  <div className="admin-health-bar-container" style={{ height: '8px', borderRadius: '4px', background: '#f1f5f9' }}>
                    <div className="admin-health-bar" style={{
                      height: '100%', borderRadius: '4px',
                      width: `${stats.totalCourses > 0 ? Math.min((stats.activeCourses / stats.totalCourses) * 100, 100) : 0}%`,
                      background: 'var(--gradient-success)'
                    }}></div>
                  </div>
                </div>
                <div className="admin-health-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div className="admin-health-label" style={{ fontWeight: 600 }}>API Response Time</div>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Normal</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', height: '24px', alignItems: 'flex-end' }}>
                    {[40, 60, 30, 80, 50, 70, 90, 60, 40, 70].map((h, i) => (
                      <div key={i} style={{ flex: 1, height: `${h}%`, background: '#e2e8f0', borderRadius: '2px' }}></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Users Section */}
          <div className="premium-card animate-fade-in" style={{ marginTop: '1.5rem', animationDelay: '0.2s' }}>
            <div className="admin-section-header" style={{ padding: '1.75rem 1.75rem 1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>New Onboardings</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Latest users registered on the platform</p>
              </div>
              <button className="btn btn-sm btn-secondary" style={{ width: 'auto', background: '#f8fafc' }}
                onClick={() => navigate('/admin/users')}>
                View Directory <ArrowRight size={14} />
              </button>
            </div>
            <div className="data-table-wrapper" style={{ border: 'none', padding: '0 1.75rem 1.75rem' }}>
              <table className="data-table">
                <thead>
                  <tr style={{ background: 'transparent' }}>
                    <th style={{ background: 'transparent', paddingLeft: 0 }}>Identity</th>
                    <th style={{ background: 'transparent' }}>Contact</th>
                    <th style={{ background: 'transparent' }}>Permission</th>
                    <th style={{ background: 'transparent' }}>Activity</th>
                    <th style={{ background: 'transparent', textAlign: 'right', paddingRight: 0 }}>Joined Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentUsers?.map((u: any, i: number) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors" style={{ animationDelay: `${i * 0.05}s` }}>
                      <td style={{ paddingLeft: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div className="admin-table-avatar" style={{
                            width: '40px', height: '40px',
                            background: u.role === 'teacher' ? 'var(--gradient-primary)' :
                              u.role === 'admin' ? 'var(--gradient-danger)' :
                                'var(--gradient-success)'
                          }}>
                            {u.firstName?.[0]}{u.lastName?.[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{u.fullName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{u.email}</td>
                      <td>
                        <span className={`badge badge-${u.role}`} style={{ 
                          padding: '0.25rem 0.75rem', 
                          borderRadius: '6px', 
                          fontWeight: 700,
                          fontSize: '0.65rem'
                        }}>{u.role.toUpperCase()}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: u.status === 'active' ? '#10b981' : '#cbd5e1' }}></span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize', color: u.status === 'active' ? 'var(--text-primary)' : 'var(--text-muted)' }}>{u.status}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: 0, color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
                        {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminDashboard;

