import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { adminApi } from '../../api';

const actionLabels: Record<string, { label: string; color: string; icon: string }> = {
  login: { label: 'Login', color: '#3b82f6', icon: '🔑' },
  register: { label: 'Register', color: '#10b981', icon: '📝' },
  create_course: { label: 'Created Course', color: '#8b5cf6', icon: '📋' },
  update_course: { label: 'Updated Course', color: '#06b6d4', icon: '✏️' },
  delete_course: { label: 'Deleted Course', color: '#ef4444', icon: '🗑️' },
  archive_course: { label: 'Archived Course', color: '#f59e0b', icon: '📦' },
  unarchive_course: { label: 'Unarchived Course', color: '#10b981', icon: '📂' },
  create_attendance_session: { label: 'Started Session', color: '#10b981', icon: '📡' },
  close_attendance_session: { label: 'Closed Session', color: '#6b7280', icon: '⏹️' },
  reopen_attendance_session: { label: 'Reopened Session', color: '#f59e0b', icon: '🔄' },
  submit_attendance: { label: 'Submitted Attendance', color: '#10b981', icon: '✅' },
  update_attendance_record: { label: 'Updated Record', color: '#06b6d4', icon: '📊' },
  create_material: { label: 'Added Material', color: '#8b5cf6', icon: '📎' },
  delete_material: { label: 'Deleted Material', color: '#ef4444', icon: '🗑️' },
  share_material: { label: 'Shared Material', color: '#3b82f6', icon: '🔗' },
  send_dm: { label: 'Sent Message', color: '#3b82f6', icon: '💬' },
  broadcast_message: { label: 'Broadcast', color: '#f59e0b', icon: '📢' },
  update_profile: { label: 'Updated Profile', color: '#06b6d4', icon: '👤' },
  update_avatar: { label: 'Updated Avatar', color: '#8b5cf6', icon: '🖼️' },
  change_password: { label: 'Changed Password', color: '#ef4444', icon: '🔒' },
  create_user: { label: 'Created User', color: '#10b981', icon: '👤' },
  update_user: { label: 'Updated User', color: '#06b6d4', icon: '✏️' },
  delete_user: { label: 'Deleted User', color: '#ef4444', icon: '🗑️' },
};

const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    adminApi.getAuditLogs(page, 15).then(res => {
      const content = res.data.data?.content || [];
      setLogs(content);
      setTotalPages(res.data.data?.totalPages || 1);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [page]);

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(log =>
      log.action?.toLowerCase().includes(q) ||
      log.entityType?.toLowerCase().includes(q) ||
      log.user?.fullName?.toLowerCase().includes(q) ||
      log.ipAddress?.toLowerCase().includes(q)
    );
  }, [logs, search]);

  const getActionInfo = (action: string) => {
    return actionLabels[action] || { label: action.replace(/_/g, ' '), color: '#6b7280', icon: '📄' };
  };

  const formatTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <DashboardLayout role="admin">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Trail</h1>
          <p className="page-subtitle">Complete system activity log</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="admin-filter-bar" style={{ marginBottom: '1rem' }}>
        <div className="admin-search-box" style={{ flex: 1, maxWidth: '400px' }}>
          <span className="admin-search-icon">🔍</span>
          <input type="text" placeholder="Search actions, users, or IP addresses..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="admin-search-input" />
          {search && <button className="admin-search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>
      </div>

      {/* Timeline View */}
      <div className="admin-section-card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner"></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            {search ? `No logs matching "${search}"` : 'No audit logs found'}
          </div>
        ) : (
          <div className="admin-audit-timeline">
            {filteredLogs.map((log, i) => {
              const info = getActionInfo(log.action);
              const isExpanded = expandedId === log.id;
              const hasDetails = log.oldValues || log.newValues;
              return (
                <div key={log.id} className={`admin-audit-entry ${isExpanded ? 'expanded' : ''}`}
                     style={{ animationDelay: `${i * 0.03}s` }}>
                  <div className="admin-audit-entry-main" onClick={() => hasDetails && setExpandedId(isExpanded ? null : log.id)}>
                    <div className="admin-audit-icon" style={{ background: `${info.color}15`, color: info.color }}>
                      {info.icon}
                    </div>
                    <div className="admin-audit-content">
                      <div className="admin-audit-action-row">
                        <span className="admin-audit-action" style={{ color: info.color }}>
                          {info.label}
                        </span>
                        <span className="admin-audit-entity">
                          {log.entityType} #{log.entityId}
                        </span>
                      </div>
                      <div className="admin-audit-meta">
                        <span className="admin-audit-user">
                          {log.user?.fullName || 'System'}
                        </span>
                        <span className="admin-audit-separator">•</span>
                        <span className="admin-audit-time" title={new Date(log.createdAt).toLocaleString()}>
                          {formatTimeAgo(log.createdAt)}
                        </span>
                        {log.ipAddress && (
                          <>
                            <span className="admin-audit-separator">•</span>
                            <span className="admin-audit-ip">{log.ipAddress}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {hasDetails && (
                      <div className="admin-audit-expand-icon" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        ▾
                      </div>
                    )}
                  </div>
                  {isExpanded && hasDetails && (
                    <div className="admin-audit-details">
                      <div className="admin-audit-details-grid">
                        {log.oldValues && (
                          <div className="admin-audit-detail-col">
                            <div className="admin-audit-detail-header" style={{ color: '#ef4444' }}>Before</div>
                            <pre className="admin-audit-json">{JSON.stringify(log.oldValues, null, 2)}</pre>
                          </div>
                        )}
                        {log.newValues && (
                          <div className="admin-audit-detail-col">
                            <div className="admin-audit-detail-header" style={{ color: '#10b981' }}>After</div>
                            <pre className="admin-audit-json">{JSON.stringify(log.newValues, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        <div className="admin-pagination">
          <button className="admin-page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            ← Previous
          </button>
          <div className="admin-page-info">
            Page {page + 1} of {totalPages}
          </div>
          <button className="admin-page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            Next →
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AuditLog;
