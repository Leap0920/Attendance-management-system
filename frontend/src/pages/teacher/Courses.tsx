import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { teacherApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { showAlert, showConfirm, showApiError } from '../../utils/feedback';
import Avatar from '../../components/Avatar';

const DAYS = [
  { key: 'M', label: 'M' }, { key: 'T', label: 'T' }, { key: 'W', label: 'W' },
  { key: 'Th', label: 'Th' }, { key: 'F', label: 'F' }, { key: 'S', label: 'S' },
];

const COURSE_GRADIENTS = [
  'linear-gradient(135deg, #FF6B4A 0%, #FF4757 100%)',
  'linear-gradient(135deg, #F4A742 0%, #E8950A 100%)',
  'linear-gradient(135deg, #7B68EE 0%, #6C5CE7 100%)',
  'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
  'linear-gradient(135deg, #34A853 0%, #059669 100%)',
  'linear-gradient(135deg, #00BCD4 0%, #0891B2 100%)',
  'linear-gradient(135deg, #9C27B0 0%, #7C3AED 100%)',
  'linear-gradient(135deg, #FF5722 0%, #DC2626 100%)',
];

const CATEGORY_LABELS = ['ONGOING', 'SOCIAL SCIENCES', 'LEADERSHIP', 'ENGINEERING', 'COMPUTER SCIENCE', 'BUSINESS', 'EDUCATION', 'GENERAL'];
const CATEGORY_COLORS: Record<string, string> = {
  ONGOING: '#22c55e', 'SOCIAL SCIENCES': '#F4A742', LEADERSHIP: '#7B68EE',
  ENGINEERING: '#4285F4', 'COMPUTER SCIENCE': '#00BCD4', BUSINESS: '#FF5722',
  EDUCATION: '#9C27B0', GENERAL: '#6b7280',
};

const getGradient = (idx: number) => COURSE_GRADIENTS[idx % COURSE_GRADIENTS.length];
const getCategory = (idx: number) => CATEGORY_LABELS[idx % CATEGORY_LABELS.length];

function formatTime12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

const TeacherCourses: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ courseCode: '', courseName: '', section: '', room: '' });
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [showNewSession, setShowNewSession] = useState(false);
  const [sessionForm, setSessionForm] = useState({ courseId: '', sessionTitle: '', duration: '10' });

  const loadCourses = () => {
    teacherApi.getCourses().then(res => { setCourses(res.data.data || []); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { loadCourses(); }, []);

  const buildSchedule = () => selectedDays.length === 0 ? '' : `${selectedDays.join('')} ${formatTime12(startTime)} - ${formatTime12(endTime)}`;
  const toggleDay = (day: string) => setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await teacherApi.createCourse({ ...form, schedule: buildSchedule() });
      setShowModal(false);
      setForm({ courseCode: '', courseName: '', section: '', room: '' });
      setSelectedDays([]); setStartTime('09:00'); setEndTime('10:30');
      showAlert('Success', 'Course created successfully!', 'success');
      loadCourses();
    } catch (err: any) { showApiError(err); }
  };

  const handleArchive = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    showConfirm('Archive Course', 'Archive this course? Students won\'t be able to see it.', async () => {
      try { await teacherApi.archiveCourse(id); showAlert('Success', 'Course archived.', 'success'); loadCourses(); }
      catch (err: any) { showApiError(err); }
    });
  };

  const handleUnarchive = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try { await teacherApi.unarchiveCourse(id); showAlert('Success', 'Course unarchived.', 'success'); loadCourses(); }
    catch (err: any) { showApiError(err); }
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    showConfirm('Delete Course', 'Are you sure? This cannot be undone.', async () => {
      try { await teacherApi.deleteCourse(id); showAlert('Deleted', 'Course removed.', 'error'); loadCourses(); }
      catch (err: any) { showApiError(err); }
    });
  };

  const handleNewSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await teacherApi.createAttendance({ courseId: Number(sessionForm.courseId), sessionTitle: sessionForm.sessionTitle, duration: Number(sessionForm.duration), allowLate: true });
      setShowNewSession(false);
      setSessionForm({ courseId: '', sessionTitle: '', duration: '10' });
      const code = res.data?.data?.attendanceCode || '';
      showAlert('Success', `Session started! Code: ${code}`, 'success');
    } catch (err: any) { showApiError(err); }
  };

  const getAvatarUrl = (avatar?: unknown) => {
    if (typeof avatar !== 'string') return undefined;
    const v = avatar.trim();
    if (!v) return undefined;
    if (v.startsWith('http')) return v;
    return `http://${window.location.hostname}:8080${v.startsWith('/') ? v : `/${v}`}`;
  };

  const filtered = courses.filter(c => {
    if (c.status !== activeTab) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.courseName?.toLowerCase().includes(q) || c.courseCode?.toLowerCase().includes(q) || c.section?.toLowerCase().includes(q);
  });

  return (
    <DashboardLayout role="teacher">
      {/* ── Top Bar ──────────────────────────────────────── */}
      <div className="td-topbar">
        <div className="td-search-wrapper">
          <svg className="td-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input className="td-search-input" placeholder="Search courses..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="td-topbar-actions">
          <button className="btn btn-secondary td-topbar-btn" onClick={() => setShowNewSession(true)}>+ New Session</button>
          <button className="btn btn-primary td-topbar-btn" onClick={() => setShowModal(true)}>+ Create Course</button>
        </div>
        <Avatar firstName={user?.firstName} lastName={user?.lastName} avatarUrl={getAvatarUrl(user?.avatar)} size={38} />
      </div>

      {/* ── Page Header ──────────────────────────────────── */}
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>My Courses</h1>

      {/* ── Tabs + View Toggle ────────────────────────────── */}
      <div className="tc-filter-bar">
        <div className="tc-tabs">
          <button className={`tc-tab ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>Active</button>
          <button className={`tc-tab ${activeTab === 'archived' ? 'active' : ''}`} onClick={() => setActiveTab('archived')}>Archived</button>
        </div>
        <div className="tc-view-toggle">
          <button className={`tc-view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grid view">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </button>
          <button className={`tc-view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="List view">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
        </div>
      </div>

      {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
        <>
          {/* ── Course Grid ───────────────────────────────── */}
          <div className={viewMode === 'grid' ? 'tc-course-grid' : 'tc-course-list'}>
            {filtered.map((c, idx) => (
              <div key={c.id} className={viewMode === 'grid' ? 'tc-card' : 'tc-list-item'} onClick={() => navigate(`/teacher/courses/${c.id}`)}>
                {viewMode === 'grid' ? (
                  <>
                    <div className="tc-card-cover" style={{ background: c.coverColor ? `linear-gradient(135deg, ${c.coverColor}, ${c.coverColor}bb)` : getGradient(idx) }}>
                      <span className="tc-category-badge" style={{ background: `${CATEGORY_COLORS[getCategory(idx)] || '#6b7280'}22`, color: CATEGORY_COLORS[getCategory(idx)] || '#6b7280', border: `1px solid ${CATEGORY_COLORS[getCategory(idx)] || '#6b7280'}44` }}>
                        {getCategory(idx)}
                      </span>
                      <div className="tc-card-actions">
                        <button className="tc-action-icon" title="Edit" onClick={(e) => { e.stopPropagation(); navigate(`/teacher/courses/${c.id}`); }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="tc-action-icon" title="Delete" onClick={(e) => activeTab === 'active' ? handleArchive(e, c.id) : handleDelete(e, c.id)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                      <div className="tc-card-schedule">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        {c.schedule || 'No schedule'}
                      </div>
                    </div>
                    <div className="tc-card-body">
                      <h4>{c.courseName}</h4>
                      <p className="tc-card-desc">{c.description || c.courseCode + (c.section ? ` · ${c.section}` : '')}</p>
                      <div className="tc-card-footer">
                        <div className="tc-card-stat">
                          <span className="tc-card-stat-label">JOIN CODE</span>
                          <span className="tc-card-stat-value tc-code">{c.joinCode}</span>
                        </div>
                        <div className="tc-card-stat">
                          <span className="tc-card-stat-label">STUDENTS</span>
                          <span className="tc-card-stat-value">{c.enrollmentCount || '0'}</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* ── List View ──────────────────────────── */
                  <>
                    <div className="tc-list-color" style={{ background: c.coverColor || COURSE_GRADIENTS[idx % COURSE_GRADIENTS.length].match(/#[0-9A-Fa-f]{6}/)?.[0] || '#4285F4' }}></div>
                    <div className="tc-list-info">
                      <h4>{c.courseName}</h4>
                      <span>{c.courseCode}{c.section ? ` · ${c.section}` : ''} · {c.schedule || 'No schedule'}</span>
                    </div>
                    <span className="tc-list-code">{c.joinCode}</span>
                    <span className="tc-list-students">{c.enrollmentCount || '0'} students</span>
                    <div className="tc-list-actions">
                      {activeTab === 'active' ? (
                        <button className="btn btn-secondary btn-sm" onClick={(e) => handleArchive(e, c.id)} style={{ width: 'auto' }}>Archive</button>
                      ) : (
                        <button className="btn btn-secondary btn-sm" onClick={(e) => handleUnarchive(e, c.id)} style={{ width: 'auto' }}>Unarchive</button>
                      )}
                      <button className="btn btn-danger btn-sm" onClick={(e) => handleDelete(e, c.id)} style={{ width: 'auto' }}>Delete</button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {/* ── Expand Curriculum Card ──────────────── */}
            {activeTab === 'active' && viewMode === 'grid' && (
              <div className="tc-add-card" onClick={() => setShowModal(true)}>
                <div className="tc-add-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </div>
                <h4>Expand Curriculum</h4>
                <p>Ready to start a new academic journey? Create a course to begin tracking.</p>
                <button className="btn btn-secondary btn-sm" style={{ width: 'auto', marginTop: '0.5rem' }}>Get Started</button>
              </div>
            )}
          </div>
          {filtered.length === 0 && activeTab !== 'active' && (
            <div className="td-empty-sessions" style={{ padding: '3rem' }}>
              <p>No {activeTab} courses found</p>
              <span>{searchQuery ? 'Try a different search.' : ''}</span>
            </div>
          )}
        </>
      )}

      {/* ── Floating Add Button ───────────────────────────── */}
      <button className="tc-fab" onClick={() => setShowModal(true)} title="Create Course">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>

      {/* ── Create Course Modal ───────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">Create New Course</h3><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
            <form onSubmit={handleCreate}>
              <div className="form-group"><label className="form-label">Course Name</label><input className="form-input" value={form.courseName} onChange={e => setForm({ ...form, courseName: e.target.value })} required placeholder="Introduction to Programming" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group"><label className="form-label">Course Code</label><input className="form-input" value={form.courseCode} onChange={e => setForm({ ...form, courseCode: e.target.value })} required placeholder="CS101" /></div>
                <div className="form-group"><label className="form-label">Section</label><input className="form-input" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} placeholder="Section A" /></div>
              </div>
              <div className="form-group">
                <label className="form-label">Schedule</label>
                <div className="day-picker" style={{ marginBottom: '0.75rem' }}>{DAYS.map(d => (<div key={d.key} className={`day-chip ${selectedDays.includes(d.key) ? 'selected' : ''}`} onClick={() => toggleDay(d.key)}>{d.label}</div>))}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div><label className="form-label" style={{ fontSize: '0.78rem' }}>Start Time</label><input className="form-input" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
                  <div><label className="form-label" style={{ fontSize: '0.78rem' }}>End Time</label><input className="form-input" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></div>
                </div>
              </div>
              <div className="form-group"><label className="form-label">Room</label><input className="form-input" value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} placeholder="Room 301" /></div>
              <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Create</button></div>
            </form>
          </div>
        </div>
      )}

      {/* ── New Session Modal ──────────────────────────────── */}
      {showNewSession && (
        <div className="modal-overlay" onClick={() => setShowNewSession(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">Start Attendance Session</h3><button className="modal-close" onClick={() => setShowNewSession(false)}>×</button></div>
            <form onSubmit={handleNewSession}>
              <div className="form-group"><label className="form-label">Course</label>
                <select className="form-input" value={sessionForm.courseId} onChange={e => setSessionForm({ ...sessionForm, courseId: e.target.value })} required>
                  <option value="">Select course...</option>
                  {courses.filter(c => c.status === 'active').map(c => <option key={c.id} value={c.id}>{c.courseCode} {c.section ? `- ${c.section}` : ''}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Session Title (optional)</label><input className="form-input" value={sessionForm.sessionTitle} onChange={e => setSessionForm({ ...sessionForm, sessionTitle: e.target.value })} placeholder="e.g. Week 5" /></div>
              <div className="form-group"><label className="form-label">Duration (minutes)</label><input className="form-input" type="number" min="1" max="120" value={sessionForm.duration} onChange={e => setSessionForm({ ...sessionForm, duration: e.target.value })} /></div>
              <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowNewSession(false)}>Cancel</button><button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Start</button></div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TeacherCourses;
