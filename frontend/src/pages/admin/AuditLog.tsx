import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { adminApi } from '../../api';

const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    adminApi.getAuditLogs(page).then(res => {
      setLogs(res.data.data?.content || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [page]);

  return (
    <DashboardLayout role="admin">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Trail</h1>
          <p className="page-subtitle">Complete system activity log</p>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>IP Address</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
            ) : logs.map(log => (
              <tr key={log.id}>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
                <td>{log.user?.fullName || 'System'}</td>
                <td><span className="badge badge-active">{log.action}</span></td>
                <td>{log.entityType} #{log.entityId}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{log.ipAddress || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
        <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
        <span style={{ padding: '0.5rem 1rem', color: 'var(--text-secondary)' }}>Page {page + 1}</span>
        <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)}>Next →</button>
      </div>
    </DashboardLayout>
  );
};

export default AuditLog;
