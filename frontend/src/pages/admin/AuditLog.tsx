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
  FileText
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

  const loadLogs = (targetPage = page, searchTerm = search) => {
    setLoading(true);
    adminApi.getAuditLogs(targetPage, 20, searchTerm.trim()).then(res => {
      setLogs(res.data.data.content);
      setTotalPages(res.data.data.totalPages);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadLogs(page, search); }, [page]);

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
      <div className="page-header">
        <div>
          <h1 className="page-title">System Audit Log</h1>
          <p className="page-subtitle">Track all system activities and security events</p>
        </div>
      </div>

      <div className="admin-section-card shadow-sm">
        <form onSubmit={handleSearch} className="admin-search-bar" style={{ marginBottom: '1.5rem' }}>
          <div className="admin-search-wrapper focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <span className="admin-search-icon"><Search size={18} /></span>
            <input 
              className="admin-search-input" 
              placeholder="Search by action, user, or IP address..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button type="button" className="admin-search-clear hover:bg-gray-100 transition-colors" onClick={() => { setSearch(''); setPage(0); loadLogs(0, ''); }}><X size={16} /></button>}
          </div>
          <button type="submit" className="btn btn-primary shadow-sm hover:shadow-md transition-all active:scale-95" style={{ width: 'auto' }} disabled={loading}>Search</button>
        </form>

        <div className="audit-timeline">
          {loading ? (
            <div className="loading-screen" style={{ minHeight: '300px' }}><div className="spinner"></div></div>
          ) : logs.length === 0 ? (
            <div className="empty-state">No audit logs found matching your criteria.</div>
          ) : (
            logs.map((log) => {
              const info = getActionInfo(log.action);
              const isExpanded = expandedId === log.id;
              return (
                <div key={log.id} className={`audit-entry ${isExpanded ? 'expanded' : ''} hover:bg-gray-50 transition-colors`}>
                  <div className="audit-main" onClick={() => setExpandedId(isExpanded ? null : log.id)}>
                    <div className="audit-icon-wrapper" style={{ background: `${info.color}15`, color: info.color }}>
                      {info.icon}
                    </div>
                    <div className="audit-content">
                      <div className="audit-primary">
                        <span className="audit-action" style={{ color: info.color }}>{info.label}</span>
                        <span className="admin-audit-separator"></span>
                        <span className="audit-user">{log.userEmail || 'System'}</span>
                      </div>
                      <div className="audit-secondary">
                        <span className="audit-time">{new Date(log.createdAt).toLocaleString()}</span>
                        <span className="admin-audit-separator"></span>
                        <span className="audit-ip">{log.ipAddress}</span>
                      </div>
                    </div>
                    <div className={`audit-chevron transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                      <ChevronDown size={18} />
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="audit-details transition-all duration-300">
                      <div className="audit-details-grid">
                        <div className="audit-detail-item">
                          <label>Full Name</label>
                          <div>{log.userName || 'N/A'}</div>
                        </div>
                        <div className="audit-detail-item">
                          <label>User Agent</label>
                          <div style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>{log.userAgent}</div>
                        </div>
                        <div className="audit-detail-item" style={{ gridColumn: '1 / -1' }}>
                          <label>Event Metadata</label>
                          <pre className="audit-metadata-box">{log.details || '{}'}</pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="admin-pagination shadow-inner">
          <button 
            className="btn btn-sm btn-secondary hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50" 
            disabled={page === 0 || loading} 
            onClick={() => setPage(p => p - 1)}
          >
            <ArrowLeft size={14} className="mr-1" /> Previous
          </button>
          <span className="admin-pagination-info">
            Page <strong>{page + 1}</strong> of <strong>{totalPages || 1}</strong>
          </span>
          <button 
            className="btn btn-sm btn-secondary hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50" 
            disabled={page >= totalPages - 1 || loading} 
            onClick={() => setPage(p => p + 1)}
          >
            Next <ArrowRight size={14} className="ml-1" />
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AuditLog;
