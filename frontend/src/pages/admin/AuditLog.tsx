import React, { useState, useEffect } from 'react';
import { 
  Search, 
  X, 
  ChevronDown, 
  ArrowLeft, 
  ArrowRight,
  LogIn,
  UserPlus,
  BookOpen,
  Edit2,
  Trash2,
  Archive,
  FolderOpen,
  Radio,
  Square,
  RefreshCw,
  CheckCircle2,
  BarChart3,
  Paperclip,
  Share2,
  MessageSquare,
  Megaphone,
  User,
  Image as ImageIcon,
  Lock,
  FileText,
  Activity
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { adminApi } from '../../api';

const actionLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  login: { label: 'Login', color: '#3b82f6', icon: <LogIn size={14} /> },
  register: { label: 'Register', color: '#10b981', icon: <UserPlus size={14} /> },
  create_course: { label: 'Created Course', color: '#8b5cf6', icon: <BookOpen size={14} /> },
  update_course: { label: 'Updated Course', color: '#06b6d4', icon: <Edit2 size={14} /> },
  delete_course: { label: 'Deleted Course', color: '#ef4444', icon: <Trash2 size={14} /> },
  archive_course: { label: 'Archived Course', color: '#f59e0b', icon: <Archive size={14} /> },
  unarchive_course: { label: 'Unarchived Course', color: '#10b981', icon: <FolderOpen size={14} /> },
  create_attendance_session: { label: 'Started Session', color: '#10b981', icon: <Radio size={14} /> },
  close_attendance_session: { label: 'Closed Session', color: '#6b7280', icon: <Square size={14} /> },
  reopen_attendance_session: { label: 'Reopened Session', color: '#f59e0b', icon: <RefreshCw size={14} /> },
  submit_attendance: { label: 'Submitted Attendance', color: '#10b981', icon: <CheckCircle2 size={14} /> },
  update_attendance_record: { label: 'Updated Record', color: '#06b6d4', icon: <BarChart3 size={14} /> },
  create_material: { label: 'Added Material', color: '#8b5cf6', icon: <Paperclip size={14} /> },
  delete_material: { label: 'Deleted Material', color: '#ef4444', icon: <Trash2 size={14} /> },
  share_material: { label: 'Shared Material', color: '#3b82f6', icon: <Share2 size={14} /> },
  send_dm: { label: 'Sent Message', color: '#3b82f6', icon: <MessageSquare size={14} /> },
  broadcast_message: { label: 'Broadcast', color: '#f59e0b', icon: <Megaphone size={14} /> },
  update_profile: { label: 'Updated Profile', color: '#06b6d4', icon: <User size={14} /> },
  update_avatar: { label: 'Updated Avatar', color: '#8b5cf6', icon: <ImageIcon size={14} /> },
  change_password: { label: 'Changed Password', color: '#ef4444', icon: <Lock size={14} /> },
  create_user: { label: 'Created User', color: '#10b981', icon: <UserPlus size={14} /> },
  update_user: { label: 'Updated User', color: '#06b6d4', icon: <Edit2 size={14} /> },
  delete_user: { label: 'Deleted User', color: '#ef4444', icon: <Trash2 size={14} /> },
};

const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => { 
    loadLogs(page, search); 
    
    // Auto-Sync Engine (Every 10 seconds)
    const interval = setInterval(() => {
      loadLogs(page, search, true); // Added 'isSilent' flag
    }, 10000);

    return () => clearInterval(interval);
  }, [page, search]);

  const loadLogs = (targetPage = page, searchTerm = search, isSilent = false) => {
    if (!isSilent) setLoading(true);
    adminApi.getAuditLogs(targetPage, 20, searchTerm.trim()).then(res => {
      setLogs(res.data.data.content);
      setTotalPages(res.data.data.totalPages);
      if (!isSilent) setLoading(false);
    }).catch(() => {
      if (!isSilent) setLoading(false);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadLogs(0, search);
  };

  const getActionInfo = (action: string) => {
    return actionLabels[action] || { label: action.replace(/_/g, ' '), color: '#6b7280', icon: <FileText size={14} /> };
  };

  return (
    <DashboardLayout role="admin">
      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title gradient-text">System Audit Log</h1>
          <p className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="sync-indicator"></span> 
            Live tracking administrative actions and security events
          </p>
        </div>
      </div>

      <div className="premium-card animate-fade-in" style={{ animationDelay: '0.1s', padding: '1.5rem' }}>
        <form onSubmit={handleSearch} className="admin-search-bar" style={{ marginBottom: '2rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border-glass)' }}>
          <div className="admin-search-wrapper focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
            <span className="admin-search-icon"><Search size={18} /></span>
            <input 
              className="admin-search-input" 
              placeholder="Search by action, user, or network address..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              style={{ fontWeight: 500 }}
            />
            {search && <button type="button" className="admin-search-clear hover:bg-slate-700 transition-colors" onClick={() => { setSearch(''); setPage(0); loadLogs(0, ''); }}><X size={16} /></button>}
          </div>
          <button type="submit" className="btn btn-primary shadow-lg hover:shadow-xl transition-all active:scale-95" style={{ width: 'auto', padding: '0.75rem 1.75rem', borderRadius: '12px' }} disabled={loading}>
            <Activity size={18} /> Execute Search
          </button>
        </form>

        <div className="audit-timeline">
          {loading ? (
            <div className="loading-screen" style={{ minHeight: '400px' }}><div className="spinner"></div></div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
              <Search size={48} strokeWidth={1} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <div>No audit entries found matching your security parameters.</div>
            </div>
          ) : (
            logs.map((log, i) => {
              const info = getActionInfo(log.action);
              const isExpanded = expandedId === log.id;
              return (
                <div 
                  key={log.id} 
                  className={`audit-entry ${isExpanded ? 'expanded' : ''} animate-slide-up`} 
                  style={{ 
                    animationDelay: `${i * 0.05}s`, 
                    borderBottom: '1px solid var(--border-glass)',
                    opacity: 0 // Will be set to 1 by animation
                  }}
                >
                  <div className="audit-main hover:bg-slate-800/50 transition-colors" style={{ padding: '1.25rem 1rem', cursor: 'pointer', background: 'transparent' }} onClick={() => setExpandedId(isExpanded ? null : log.id)}>
                    <div className="audit-icon-wrapper shadow-sm" style={{ background: `${info.color}15`, color: info.color, width: '40px', height: '40px', borderRadius: '12px' }}>
                      {info.icon}
                    </div>
                    <div className="audit-content">
                      <div className="audit-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="audit-action" style={{ color: info.color, fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{info.label}</span>
                        <span className="admin-audit-separator" style={{ background: 'var(--border-glass)' }}></span>
                        <span className="audit-user" style={{ fontWeight: 700, fontSize: '0.95rem' }}>{log.userEmail || 'System Process'}</span>
                      </div>
                      <div className="audit-secondary" style={{ marginTop: '0.25rem' }}>
                        <span className="audit-time" style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                          {log.createdAt ? new Date(log.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          }) : 'Date Unknown'}
                        </span>
                        <span className="admin-audit-separator" style={{ background: 'var(--border-glass)' }}></span>
                        <span className="audit-ip" style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.8rem' }}>📍 {log.ipAddress}</span>
                      </div>
                    </div>
                    <div className={`audit-chevron transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-600' : 'text-gray-300'}`}>
                      <ChevronDown size={20} />
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="audit-details animate-fade-in" style={{ background: 'var(--bg-primary)', margin: '0 1rem 1.25rem', borderRadius: '14px', border: '1px solid var(--border-glass)', padding: '1.5rem' }}>
                      <div className="audit-details-grid" style={{ gap: '1.5rem' }}>
                        <div className="audit-detail-item">
                          <label style={{ fontWeight: 700, color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Actor Identity</label>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{log.userName || 'Service Account'}</div>
                        </div>
                        <div className="audit-detail-item">
                          <label style={{ fontWeight: 700, color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Network Fingerprint (User Agent)</label>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.5 }}>{log.userAgent}</div>
                        </div>
                        <div className="audit-detail-item" style={{ gridColumn: '1 / -1' }}>
                          <label style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Event Payload / Details</label>
                          <pre className="audit-metadata-box" style={{ background: '#0f172a', color: '#94a3b8', padding: '1rem', borderRadius: '10px', fontSize: '0.8rem', overflowX: 'auto', border: '1px solid #1e293b' }}>
                            {JSON.stringify(JSON.parse(log.details || '{}'), null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="admin-pagination" style={{ borderTop: '1px solid #f1f5f9', marginTop: '2rem', padding: '1.5rem 0 0' }}>
          <button 
            className="btn btn-secondary shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-30" 
            disabled={page === 0 || loading} 
            onClick={() => setPage(p => p - 1)}
            style={{ width: 'auto', padding: '0.5rem 1rem', borderRadius: '10px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            <ArrowLeft size={16} /> Previous
          </button>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Log Page <span className="gradient-text">{page + 1}</span> of {totalPages || 1}
          </div>
          <button 
            className="btn btn-secondary shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-30" 
            disabled={page >= totalPages - 1 || loading} 
            onClick={() => setPage(p => p + 1)}
            style={{ width: 'auto', padding: '0.5rem 1rem', borderRadius: '10px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            Next <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AuditLog;
