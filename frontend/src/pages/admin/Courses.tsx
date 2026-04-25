import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { adminApi } from '../../api';
import { Search, X, ChevronRight } from 'lucide-react';

const AdminCourses: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadCourses = () => {
    setLoading(true);
    adminApi.getAllCourses(filter || undefined).then(res => {
      setCourses(res.data.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadCourses(); }, [filter]);

  const filteredCourses = useMemo(() => {
    if (!search.trim()) return courses;
    const q = search.toLowerCase();
    return courses.filter(c =>
      c.courseName?.toLowerCase().includes(q) ||
      c.courseCode?.toLowerCase().includes(q) ||
      c.teacher?.firstName?.toLowerCase().includes(q) ||
      c.teacher?.lastName?.toLowerCase().includes(q) ||
      c.joinCode?.toLowerCase().includes(q)
    );
  }, [courses, search]);

  const statusStats = useMemo(() => ({
    all: courses.length,
    active: courses.filter(c => c.status === 'active').length,
    archived: courses.filter(c => c.status === 'archived').length,
    deleted: courses.filter(c => c.status === 'deleted').length,
  }), [courses]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
      case 'archived': return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
      case 'deleted': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
      default: return { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' };
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="page-header">
        <div>
          <h1 className="page-title">Course Management</h1>
          <p className="page-subtitle">Monitor and manage all classrooms</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <div className="admin-filter-tabs">
          {[
            { key: '', label: 'All', count: statusStats.all },
            { key: 'active', label: 'Active', count: statusStats.active },
            { key: 'archived', label: 'Archived', count: statusStats.archived },
            { key: 'deleted', label: 'Deleted', count: statusStats.deleted },
          ].map(tab => (
            <button key={tab.key}
              className={`admin-filter-tab ${filter === tab.key ? 'active' : ''}`}
              onClick={() => setFilter(tab.key)}>
              {tab.label}
              <span className="admin-filter-count">{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="admin-search-box focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <span className="admin-search-icon"><Search size={18} /></span>
          <input type="text" placeholder="Search courses, codes, or teachers..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="admin-search-input" />
          {search && <button className="admin-search-clear hover:bg-gray-100 transition-colors" onClick={() => setSearch('')}><X size={16} /></button>}
        </div>
      </div>

      {/* Courses Table */}
      <div className="admin-section-card">
        <div className="data-table-wrapper" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{width: '30px'}}></th>
                <th>Course</th>
                <th>Code</th>
                <th>Teacher</th>
                <th>Join Code</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                  <div className="spinner" style={{ margin: '0 auto' }}></div>
                </td></tr>
              ) : filteredCourses.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  {search ? `No courses matching "${search}"` : 'No courses found'}
                </td></tr>
              ) : filteredCourses.map(c => {
                const sc = getStatusColor(c.status);
                const isExpanded = expandedId === c.id;
                return (
                  <React.Fragment key={c.id}>
                    <tr className="clickable-row" onClick={() => setExpandedId(isExpanded ? null : c.id)}
                        style={{ cursor: 'pointer' }}>
                      <td style={{ textAlign: 'center' }}>
                        <ChevronRight 
                          size={16} 
                          className={`transition-transform duration-200 text-gray-400 ${isExpanded ? 'rotate-90' : ''}`} 
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 8,
                            background: c.coverColor || '#3b82f6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0
                          }}>
                            {c.courseName?.[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.courseName}</div>
                            {c.section && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Section: {c.section}</div>}
                          </div>
                        </div>
                      </td>
                      <td><span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.courseCode}</span></td>
                      <td>
                        {c.teacher ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="admin-table-avatar" style={{
                              width: 28, height: 28, fontSize: '0.6rem',
                              background: 'linear-gradient(135deg, #06b6d4, #0891b2)'
                            }}>
                              {c.teacher.firstName?.[0]}{c.teacher.lastName?.[0]}
                            </div>
                            <span style={{ fontSize: '0.85rem' }}>
                              {c.teacher.firstName} {c.teacher.lastName}
                            </span>
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        <span className="join-code">{c.joinCode}</span>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '0.2rem 0.6rem', borderRadius: 20,
                          fontSize: '0.7rem', fontWeight: 600,
                          background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                          textTransform: 'capitalize'
                        }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <div className="admin-expanded-row">
                            <div className="admin-expanded-grid">
                              <div className="admin-expanded-item">
                                <span className="admin-expanded-label">Description</span>
                                <span className="admin-expanded-value">{c.description || 'No description'}</span>
                              </div>
                              <div className="admin-expanded-item">
                                <span className="admin-expanded-label">Schedule</span>
                                <span className="admin-expanded-value">{c.schedule || 'Not set'}</span>
                              </div>
                              <div className="admin-expanded-item">
                                <span className="admin-expanded-label">Room</span>
                                <span className="admin-expanded-value">{c.room || 'Not set'}</span>
                              </div>
                              <div className="admin-expanded-item">
                                <span className="admin-expanded-label">Created</span>
                                <span className="admin-expanded-value">
                                  {new Date(c.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="admin-table-footer">
          Showing {filteredCourses.length} of {courses.length} courses
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminCourses;
