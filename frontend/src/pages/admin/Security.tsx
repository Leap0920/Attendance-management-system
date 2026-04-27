import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, ShieldAlert, ShieldCheck, ShieldX, Eye, EyeOff,
  Plus, Trash2, X, RefreshCw, ChevronDown, ChevronLeft, ChevronRight,
  Globe, AlertTriangle, CheckCircle, Clock, Ban, Filter
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { adminApi } from '../../api';
import { showAlert, showConfirm, showApiError } from '../../utils/feedback';

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  CRITICAL: { color: '#dc2626', bg: '#fef2f2', icon: <ShieldX size={16} /> },
  HIGH: { color: '#ea580c', bg: '#fff7ed', icon: <ShieldAlert size={16} /> },
  MEDIUM: { color: '#d97706', bg: '#fffbeb', icon: <AlertTriangle size={16} /> },
  LOW: { color: '#059669', bg: '#f0fdf4', icon: <ShieldCheck size={16} /> },
};

const TYPE_LABELS: Record<string, string> = {
  FAILED_LOGIN: 'Failed Login',
  BLOCKED_IP: 'Blocked IP',
  SUSPICIOUS_ACTIVITY: 'Suspicious Activity',
};

const AdminSecurity: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'events' | 'ipaccess'>('events');
  const [summary, setSummary] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [eventsPage, setEventsPage] = useState(0);
  const [eventsTotalPages, setEventsTotalPages] = useState(0);
  const [ipList, setIpList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Add IP Modal
  const [showAddIP, setShowAddIP] = useState(false);
  const [ipForm, setIpForm] = useState({ ipAddress: '', type: 'BLOCK', reason: '' });

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, eventsRes, ipRes] = await Promise.all([
        adminApi.getSecuritySummary(),
        adminApi.getSecurityEvents(eventsPage, 15, typeFilter || undefined, severityFilter || undefined),
        adminApi.getIPAccessList(),
      ]);

      if (summaryRes.data?.success) setSummary(summaryRes.data.data);
      if (eventsRes.data?.success) {
        setEvents(eventsRes.data.data.content || []);
        setEventsTotalPages(eventsRes.data.data.totalPages || 0);
      }
      if (ipRes.data?.success) setIpList(ipRes.data.data || []);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [eventsPage, typeFilter, severityFilter]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleAcknowledge = async (id: number) => {
    try {
      await adminApi.acknowledgeEvent(id);
      showAlert('Success', 'Event acknowledged', 'success');
      fetchData();
    } catch (err: any) {
      showApiError(err, 'Failed to acknowledge event');
    }
  };

  const handleAddIP = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.addIPAccessEntry(ipForm);
      showAlert('Success', `IP ${ipForm.type === 'BLOCK' ? 'blocked' : 'whitelisted'} successfully`, 'success');
      setShowAddIP(false);
      setIpForm({ ipAddress: '', type: 'BLOCK', reason: '' });
      fetchData();
    } catch (err: any) {
      showApiError(err, 'Failed to add IP entry');
    }
  };

  const handleRemoveIP = (id: number, ip: string) => {
    showConfirm('Remove IP Rule', `Remove the rule for ${ip}?`, async () => {
      try {
        await adminApi.removeIPAccessEntry(id);
        showAlert('Success', 'IP rule removed', 'success');
        fetchData();
      } catch (err: any) {
        showApiError(err, 'Failed to remove IP entry');
      }
    });
  };

  const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <DashboardLayout role="admin">
      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title gradient-text">Security Monitor</h1>
          <p className="page-subtitle">Login tracking, threat detection & IP access control</p>
        </div>
        <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
          <button
            className={`adm-icon-btn ${refreshing ? 'spinning' : ''}`}
            onClick={handleRefresh}
            title="Refresh"
            style={{ width: '40px', height: '40px', borderRadius: '12px' }}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '60vh' }}><div className="spinner"></div></div>
      ) : (
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {/* Summary Cards */}
          {summary && (
            <div className="adm-security-summary">
              <div className="premium-card adm-sec-card adm-sec-card-total">
                <div className="adm-sec-card-icon"><Shield size={22} /></div>
                <div className="adm-sec-card-info">
                  <span className="adm-sec-card-value">{summary.totalEvents24h}</span>
                  <span className="adm-sec-card-label">Events (24h)</span>
                </div>
              </div>
              <div className="premium-card adm-sec-card adm-sec-card-critical">
                <div className="adm-sec-card-icon"><ShieldX size={22} /></div>
                <div className="adm-sec-card-info">
                  <span className="adm-sec-card-value">{summary.criticalEvents24h}</span>
                  <span className="adm-sec-card-label">Critical</span>
                </div>
              </div>
              <div className="premium-card adm-sec-card adm-sec-card-blocked">
                <div className="adm-sec-card-icon"><Ban size={22} /></div>
                <div className="adm-sec-card-info">
                  <span className="adm-sec-card-value">{summary.blockedIPs}</span>
                  <span className="adm-sec-card-label">Blocked IPs</span>
                </div>
              </div>
              {summary.topCountries && Object.keys(summary.topCountries).length > 0 && (
                <div className="premium-card adm-sec-card adm-sec-card-geo">
                  <div className="adm-sec-card-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}><Globe size={22} /></div>
                  <div className="adm-sec-card-info">
                    <span className="adm-sec-card-value">{Object.keys(summary.topCountries)[0]}</span>
                    <span className="adm-sec-card-label">Top Source</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab Switcher */}
          <div className="adm-tab-bar" style={{ marginBottom: '1.5rem', border: 'none' }}>
            <button
              className={`adm-tab ${activeTab === 'events' ? 'active' : ''}`}
              onClick={() => setActiveTab('events')}
              style={{ padding: '0.75rem 1.5rem', borderRadius: '30px', background: activeTab === 'events' ? 'var(--sidebar-active)' : 'transparent' }}
            >
              <Shield size={16} /> Security Feed
            </button>
            <button
              className={`adm-tab ${activeTab === 'ipaccess' ? 'active' : ''}`}
              onClick={() => setActiveTab('ipaccess')}
              style={{ padding: '0.75rem 1.5rem', borderRadius: '30px', background: activeTab === 'ipaccess' ? 'var(--sidebar-active)' : 'transparent' }}
            >
              <Globe size={16} /> Access Control
            </button>
          </div>

          {/* Events Tab */}
          {activeTab === 'events' && (
            <div className="premium-card" style={{ padding: '1.75rem' }}>
              <div className="adm-section-header">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Intrusion Detection Feed</h3>
                <button
                  className="adm-filter-btn"
                  onClick={() => setShowFilters(!showFilters)}
                  style={{ background: '#f8fafc' }}
                >
                  <Filter size={14} /> Filter Feed
                  <ChevronDown size={14} style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
              </div>

              {showFilters && (
                <div className="adm-filters-row animate-fade-in" style={{ background: '#f8fafc', padding: '1.5rem', border: '1px solid #f1f5f9' }}>
                  <div className="adm-filter-group">
                    <label>Event Type</label>
                    <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setEventsPage(0); }}>
                      <option value="">All Types</option>
                      <option value="FAILED_LOGIN">Failed Login</option>
                      <option value="BLOCKED_IP">Blocked IP</option>
                      <option value="SUSPICIOUS_ACTIVITY">Suspicious Activity</option>
                    </select>
                  </div>
                  <div className="adm-filter-group">
                    <label>Severity Level</label>
                    <select value={severityFilter} onChange={e => { setSeverityFilter(e.target.value); setEventsPage(0); }}>
                      <option value="">All Severities</option>
                      <option value="CRITICAL">Critical Only</option>
                      <option value="HIGH">High Severity</option>
                      <option value="MEDIUM">Medium Severity</option>
                      <option value="LOW">Low Severity</option>
                    </select>
                  </div>
                  <button className="adm-filter-clear" onClick={() => { setTypeFilter(''); setSeverityFilter(''); setEventsPage(0); }}>
                    Reset Filters
                  </button>
                </div>
              )}

              {events.length > 0 ? (
                <div className="adm-events-list">
                  {events.map((event: any, i: number) => {
                    const sevConfig = SEVERITY_CONFIG[event.severity] || SEVERITY_CONFIG.LOW;
                    return (
                      <div key={event.id} className={`adm-event-item ${event.acknowledged ? 'acknowledged' : ''}`} style={{ animationDelay: `${i * 0.05}s`, borderBottom: '1px solid #f1f5f9', padding: '1.5rem 0' }}>
                        <div className="adm-event-severity" style={{ background: sevConfig.bg, color: sevConfig.color, width: '42px', height: '42px', borderRadius: '12px' }}>
                          {sevConfig.icon}
                        </div>
                        <div className="adm-event-body">
                          <div className="adm-event-top">
                            <span className="adm-event-type-badge" style={{ background: sevConfig.bg, color: sevConfig.color, borderRadius: '6px', fontWeight: 800 }}>
                              {event.severity}
                            </span>
                            <span className="adm-event-type-label" style={{ fontWeight: 700 }}>
                              {TYPE_LABELS[event.type] || event.type}
                            </span>
                            <span className="adm-event-time" style={{ fontWeight: 500 }}>
                              <Clock size={12} /> {timeAgo(event.createdAt)}
                            </span>
                          </div>
                          <p className="adm-event-desc" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0.5rem 0 1rem' }}>{event.description}</p>
                          <div className="adm-event-meta">
                            {event.ipAddress && (
                              <span className="adm-event-meta-item" style={{ background: '#f8fafc', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                <Globe size={12} /> {event.ipAddress}
                              </span>
                            )}
                            {event.userEmail && (
                              <span className="adm-event-meta-item" style={{ background: '#f8fafc', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                <User size={12} /> {event.userEmail}
                              </span>
                            )}
                            {event.countryCode && (
                              <span className="adm-event-meta-item" style={{ background: '#f8fafc', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                📍 {event.city ? `${event.city}, ` : ''}{event.countryCode}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="adm-event-actions">
                          {event.acknowledged ? (
                            <span className="adm-event-ack-badge" style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                              <ShieldCheck size={14} /> Resolved
                            </span>
                          ) : (
                            <button
                              className="adm-event-ack-btn shadow-sm hover:shadow-md transition-all"
                              onClick={() => handleAcknowledge(event.id)}
                              style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe', padding: '0.5rem 1rem' }}
                            >
                              <Eye size={14} /> Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="adm-empty-state" style={{ padding: '5rem 2rem' }}>
                  <ShieldCheck size={50} color="#10b981" strokeWidth={1.5} />
                  <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>Environment Secure</p>
                  <span style={{ color: 'var(--text-muted)' }}>No suspicious activities detected in this period.</span>
                </div>
              )}

              {/* Pagination */}
              {eventsTotalPages > 1 && (
                <div className="adm-pagination" style={{ borderTop: '1px solid #f1f5f9', marginTop: '2rem' }}>
                  <button
                    disabled={eventsPage === 0}
                    onClick={() => setEventsPage(p => Math.max(0, p - 1))}
                    style={{ width: '40px', height: '40px', borderRadius: '12px' }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Page {eventsPage + 1} of {eventsTotalPages}</span>
                  <button
                    disabled={eventsPage >= eventsTotalPages - 1}
                    onClick={() => setEventsPage(p => p + 1)}
                    style={{ width: '40px', height: '40px', borderRadius: '12px' }}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* IP Access Tab */}
          {activeTab === 'ipaccess' && (
            <div className="premium-card" style={{ padding: '1.75rem' }}>
              <div className="adm-section-header">
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Access Control Rules</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Manage whitelisted and blocked CIDR ranges</p>
                </div>
                <button className="btn btn-primary shadow-sm" style={{ width: 'auto', padding: '0.6rem 1.25rem' }} onClick={() => setShowAddIP(true)}>
                  <Plus size={18} /> New Rule
                </button>
              </div>
              <div className="adm-ip-note" style={{ background: '#f8fafc', color: 'var(--text-secondary)', border: '1px solid #f1f5f9', marginTop: '1rem' }}>
                <AlertTriangle size={14} style={{ color: '#d97706' }} />
                <span>Whitelist entries take precedence over blocklist. Supports IPv4, IPv6 and CIDR notation.</span>
              </div>

              {ipList.length > 0 ? (
                <div className="data-table-wrapper" style={{ border: 'none', marginTop: '1.5rem' }}>
                  <table className="data-table">
                    <thead>
                      <tr style={{ background: 'transparent' }}>
                        <th style={{ background: 'transparent', paddingLeft: 0 }}>IP Range</th>
                        <th style={{ background: 'transparent' }}>Policy</th>
                        <th style={{ background: 'transparent' }}>Context</th>
                        <th style={{ background: 'transparent' }}>Metadata</th>
                        <th style={{ background: 'transparent', textAlign: 'right', paddingRight: 0 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ipList.map((entry: any) => (
                        <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                          <td style={{ paddingLeft: 0 }}>
                            <code className="adm-ip-code" style={{ background: '#f1f5f9', padding: '0.35rem 0.65rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{entry.ipAddress}</code>
                          </td>
                          <td>
                            <span className={`adm-ip-type-badge ${entry.type === 'BLOCK' ? 'block' : 'whitelist'}`} style={{ borderRadius: '6px', padding: '0.25rem 0.75rem', fontSize: '0.7rem' }}>
                              {entry.type === 'BLOCK' ? <Ban size={12} /> : <CheckCircle size={12} />}
                              {entry.type}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            {entry.reason || 'No reason provided'}
                          </td>
                          <td>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{entry.addedByName || 'System'}</div>
                              <div>{entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '—'}</div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', paddingRight: 0 }}>
                            <button
                              className="adm-icon-btn adm-icon-btn-danger"
                              onClick={() => handleRemoveIP(entry.id, entry.ipAddress)}
                              style={{ width: '34px', height: '34px', borderRadius: '10px' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="adm-empty-state" style={{ padding: '5rem 2rem' }}>
                  <Globe size={50} color="var(--text-muted)" strokeWidth={1.5} />
                  <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>No active rules</p>
                  <span style={{ color: 'var(--text-muted)' }}>Add IP entries to start controlling system access.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add IP Modal */}
      {showAddIP && (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }} onClick={() => setShowAddIP(false)}>
          <div className="premium-card modal animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: '2rem' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>Create Policy</h3>
              <button className="modal-close" onClick={() => setShowAddIP(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddIP} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>IP Network Address / CIDR</label>
                <input
                  className="form-input"
                  style={{ background: '#f8fafc', padding: '0.85rem 1rem' }}
                  placeholder="e.g. 192.168.1.1 or 10.0.0.0/24"
                  value={ipForm.ipAddress}
                  onChange={e => setIpForm({ ...ipForm, ipAddress: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Access Policy</label>
                <select
                  className="form-input"
                  style={{ background: '#f8fafc', padding: '0.85rem 1rem' }}
                  value={ipForm.type}
                  onChange={e => setIpForm({ ...ipForm, type: e.target.value })}
                >
                  <option value="BLOCK">🚫 BLOCK ACCESS</option>
                  <option value="WHITELIST">✅ WHITELIST ACCESS</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Policy Justification</label>
                <textarea
                  className="form-input"
                  style={{ background: '#f8fafc', padding: '0.85rem 1rem', minHeight: '80px' }}
                  placeholder="Why is this rule being added?"
                  value={ipForm.reason}
                  onChange={e => setIpForm({ ...ipForm, reason: e.target.value })}
                />
              </div>
              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" style={{ width: 'auto', background: 'transparent', border: 'none' }} onClick={() => setShowAddIP(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary shadow-lg" style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
                  {ipForm.type === 'BLOCK' ? <Ban size={18} /> : <CheckCircle size={18} />}
                  Confirm Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminSecurity;
