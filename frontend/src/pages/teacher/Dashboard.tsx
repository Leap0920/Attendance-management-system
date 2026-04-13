import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { teacherApi } from '../../api';
import { showAlert, showConfirm, showApiError } from '../../utils/feedback';

const DAYS = [
  { key: 'M', label: 'M' },
  { key: 'T', label: 'T' },
  { key: 'W', label: 'W' },
  { key: 'Th', label: 'Th' },
  { key: 'F', label: 'F' },
  { key: 'S', label: 'S' },
];

const COURSE_PATTERNS = [
  'linear-gradient(135deg, #4285F4 0%, #5B9CF4 100%)',
  'linear-gradient(135deg, #EA4335 0%, #FF6B5B 100%)',
  'linear-gradient(135deg, #34A853 0%, #4FC36B 100%)',
  'linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%)',
  'linear-gradient(135deg, #FF5722 0%, #FF8A65 100%)',
  'linear-gradient(135deg, #00BCD4 0%, #4DD0E1 100%)',
  'linear-gradient(135deg, #3F51B5 0%, #7986CB 100%)',
  'linear-gradient(135deg, #E91E63 0%, #F06292 100%)',
];

const getPattern = (index: number) => COURSE_PATTERNS[index % COURSE_PATTERNS.length];

const SessionTimer: React.FC<{ endTime: string; onExpire: () => void }> = ({ endTime, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const end = new Date(endTime).getTime();
    
    const update = () => {
      const now = Date.now();
      const diff = end - now;
      
      if (diff <= 0) {
        onExpire();
        return;
      }
      
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [endTime, onExpire]);

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
      fontSize: '0.85rem', color: 'var(--accent-green)', 
      fontWeight: 700, fontPadding: '0 0.5rem', background: '#f0fdf4',
      padding: '0.25rem 0.5rem', borderRadius: '4px'
    }}>
      <span style={{ fontSize: '1rem' }}>⏱</span> {timeLeft}
    </span>
  );
};

const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAttendance, setShowAttendance] = useState(false);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [attendForm, setAttendForm] = useState({ courseId: '', sessionTitle: '', duration: '10' });
  const [courseForm, setCourseForm] = useState({ courseName: '', courseCode: '', section: '', schedule: '', room: '' });
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [notification, setNotification] = useState<string | null>(null);
  const [reopeningId, setReopeningId] = useState<number | null>(null);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [targetReopenSession, setTargetReopenSession] = useState<{id: number, title: string} | null>(null);
  const [reopenDuration, setReopenDuration] = useState('10');

  const loadDashboard = () => {
    teacherApi.getDashboard().then(res => {
      setData(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadDashboard(); }, []);

  const formatTime12 = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const buildSchedule = () => {
    if (selectedDays.length === 0) return '';
    return `${selectedDays.join('')} ${formatTime12(startTime)} - ${formatTime12(endTime)}`;
  };

  const startSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await teacherApi.createAttendance({
        courseId: Number(attendForm.courseId),
        sessionTitle: attendForm.sessionTitle,
        duration: Number(attendForm.duration),
        allowLate: true,
      });
      setShowAttendance(false);
      setAttendForm({ courseId: '', sessionTitle: '', duration: '10' });
      const code = res.data?.data?.attendanceCode || '';
      showAlert('Success', `Attendance session started! Code: ${code}`);
      loadDashboard();
    } catch (err: any) {
      showApiError(err, 'Error creating session');
    }
  };

  const closeSession = async (id: number) => {
    showConfirm('Confirm Action', 'Close this attendance session? Absent students will be automatically marked.', async () => {
      try {
        await teacherApi.closeAttendance(id);
        showAlert('Success', 'Session closed successfully.', 'success');
        loadDashboard();
      } catch (err: any) {
        showApiError(err, 'Error closing session');
      }
    });
  };

  const confirmReopen = async () => {
    if (!targetReopenSession) return;
    try {
      setReopeningId(targetReopenSession.id);
      const res = await teacherApi.reopenAttendance(targetReopenSession.id, Number(reopenDuration));
      const code = res.data?.data?.attendanceCode || '';
      showAlert('Success', `Session reopened! New code: ${code}`);
      setShowReopenModal(false);
      setTargetReopenSession(null);
      loadDashboard();
    } catch (err: any) {
      showApiError(err, 'Error reopening session');
    } finally {
      setReopeningId(null);
    }
  };

  const openReopenModal = (id: number, title: string) => {
    setTargetReopenSession({ id, title });
    setReopenDuration('10');
    setShowReopenModal(true);
  };

  const createCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await teacherApi.createCourse({ ...courseForm, schedule: buildSchedule() });
      setShowCreateCourse(false);
      setCourseForm({ courseName: '', courseCode: '', section: '', schedule: '', room: '' });
      setSelectedDays([]);
      setStartTime('09:00');
      setEndTime('10:30');
      showAlert('Success', 'Course created successfully!', 'success');
      loadDashboard();
    } catch (err: any) { showApiError(err, 'Error creating course'); }
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleArchive = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    showConfirm('Archive Course', 'Are you sure you want to archive this course?', async () => {
      try {
        await teacherApi.archiveCourse(id);
        showAlert('Archived', 'Course moved to archives.');
        loadDashboard();
      } catch (err: any) { showApiError(err, 'Error archiving course'); }
    });
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    showConfirm('Delete Course', 'Are you sure you want to delete this course? This action cannot be undone, though admins can still view the logs.', async () => {
      try {
        await teacherApi.deleteCourse(id);
        showAlert('Deleted', 'Course has been deleted.', 'error');
        loadDashboard();
      } catch (err: any) { showApiError(err, 'Error deleting course'); }
    });
  };

  // Compute stats
  const totalCourses = data?.totalCourses || data?.courses?.length || 0;
  const totalStudents = data?.totalStudents || 0;
  const totalSessions = data?.totalSessions || 0;
  const activeSessionsCount = data?.activeSessions?.length || 0;

  return (
    <DashboardLayout role="teacher">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {data?.teacherName || 'Teacher'}!</p>
        </div>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowCreateCourse(true)}>
          + Create Course
        </button>
      </div>

      {loading ? <div className="loading-screen"><div className="spinner"></div></div> : data && (
        <>
          {/* Notification Banner */}
          {notification && (
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1.25rem', marginBottom: '1.25rem', color: '#16a34a',
              fontSize: '0.875rem', fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span>{notification}</span>
              <button onClick={() => setNotification(null)} style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: '1rem' }}>×</button>
            </div>
          )}

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card blue">
              <div className="stat-icon blue">C</div>
              <div className="stat-value">{totalCourses}</div>
              <div className="stat-label">Active Courses</div>
            </div>
            <div className="stat-card green">
              <div className="stat-icon green">S</div>
              <div className="stat-value">{totalStudents}</div>
              <div className="stat-label">Total Students</div>
            </div>
            <div className="stat-card purple">
              <div className="stat-icon purple">A</div>
              <div className="stat-value">{totalSessions}</div>
              <div className="stat-label">Sessions Created</div>
            </div>
            <div className="stat-card yellow">
              <div className="stat-icon yellow">L</div>
              <div className="stat-value">{activeSessionsCount}</div>
              <div className="stat-label">Active Sessions</div>
            </div>
          </div>

          {/* Active Attendance Sessions */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="section-title">Active Attendance Sessions</h3>
              <button className="btn btn-primary btn-sm" style={{ width: 'auto' }} onClick={() => setShowAttendance(true)}>
                + New Session
              </button>
            </div>
            {data.activeSessions?.length > 0 ? data.activeSessions.map((s: any, i: number) => (
              <div key={i} className="active-session-card" style={{ borderLeft: '4px solid var(--accent-blue)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{s.courseName}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {s.session?.sessionTitle || 'Regular Session'} &middot; {s.submissions}/{s.enrolled} submitted
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="attendance-code-badge" style={{
                      padding: '0.5rem 1rem', background: '#eff6ff', borderRadius: 'var(--radius-sm)',
                      fontFamily: "'Courier New', monospace", fontWeight: 800, fontSize: '1.1rem',
                      color: 'var(--accent-blue)', letterSpacing: '0.15em', border: '1px solid #dbeafe'
                    }}>
                      {s.session?.attendanceCode}
                    </div>
                    <SessionTimer endTime={s.session.endTime} onExpire={loadDashboard} />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        title="Copy code"
                        onClick={() => { 
                          navigator.clipboard.writeText(s.session?.attendanceCode || '');
                          setNotification('Code copied to clipboard!');
                        }}
                        style={{ width: 'auto', padding: '0.4rem 0.75rem' }}
                      >
                        Copy
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => closeSession(s.session.id)} style={{ width: 'auto' }}>
                        Close Session
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No active sessions. Click "New Session" to start attendance.
              </div>
            )}
          </div>

          {/* Recently Closed Sessions */}
          {data.recentSessions?.length > 0 && (
            <div style={{ marginBottom: '1.75rem' }}>
              <h3 className="section-title" style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Recently Closed</h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {data.recentSessions.map((s: any, i: number) => (
                  <div key={i} className="glass-card" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.85 }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{s.courseName}</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                        {s.session?.sessionTitle || 'Regular Session'} &middot; {new Date(s.session.startTime).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                         {s.submissions}/{s.enrolled} joined
                      </span>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => openReopenModal(s.session.id, s.session.sessionTitle || 'Regular Session')} 
                        disabled={reopeningId === s.session.id}
                        style={{ width: 'auto' }}
                      >
                        {reopeningId === s.session.id ? 'Loading...' : 'Reopen'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My Courses — Google Classroom Style */}
          <h3 className="section-title">My Courses</h3>
          <div className="course-grid">
            {data.courses?.filter((c: any) => c.status === 'active').map((c: any, idx: number) => (
              <div key={c.id} className="course-card" onClick={() => navigate(`/teacher/courses/${c.id}`)}>
                <div className="course-card-header" style={{ background: c.coverColor ? `linear-gradient(135deg, ${c.coverColor}, ${c.coverColor}cc)` : getPattern(idx) }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3>{c.courseName}</h3>
                  </div>
                  <p>{c.courseCode} {c.section ? `• ${c.section}` : ''}</p>
                </div>
                <div className="course-card-body">
                  <p>{c.schedule || 'No schedule set'}</p>
                </div>
                <div className="course-card-footer">
                  <span className="join-code">{c.joinCode}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{c.room || ''}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Start Attendance Modal */}
      {showAttendance && (
        <div className="modal-overlay" onClick={() => setShowAttendance(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Start Attendance Session</h3>
              <button className="modal-close" onClick={() => setShowAttendance(false)}>×</button>
            </div>
            <form onSubmit={startSession}>
              <div className="form-group">
                <label className="form-label">Course</label>
                <select className="form-input" value={attendForm.courseId} onChange={e => setAttendForm({...attendForm, courseId: e.target.value})} required>
                  <option value="">Select course...</option>
                  {data?.courses?.map((c: any) => <option key={c.id} value={c.id}>{c.courseCode} {c.section ? `- ${c.section}` : ''}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Session Title (optional)</label>
                <input className="form-input" value={attendForm.sessionTitle} onChange={e => setAttendForm({...attendForm, sessionTitle: e.target.value})} placeholder="e.g. Week 5" />
              </div>
              <div className="form-group">
                <label className="form-label">Duration (minutes)</label>
                <input className="form-input" type="number" min="1" max="120" value={attendForm.duration} onChange={e => setAttendForm({...attendForm, duration: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAttendance(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Start Session</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Course Modal — Redesigned */}
      {showCreateCourse && (
        <div className="modal-overlay" onClick={() => setShowCreateCourse(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Course</h3>
              <button className="modal-close" onClick={() => setShowCreateCourse(false)}>×</button>
            </div>
            <form onSubmit={createCourse}>
              <div className="form-group">
                <label className="form-label">Course Name</label>
                <input className="form-input" value={courseForm.courseName} onChange={e => setCourseForm({...courseForm, courseName: e.target.value})} required placeholder="Introduction to Programming" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Course Code</label>
                  <input className="form-input" value={courseForm.courseCode} onChange={e => setCourseForm({...courseForm, courseCode: e.target.value})} required placeholder="CS101" />
                </div>
                <div className="form-group">
                  <label className="form-label">Section</label>
                  <input className="form-input" value={courseForm.section} onChange={e => setCourseForm({...courseForm, section: e.target.value})} placeholder="Section A" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Schedule</label>
                <div className="day-picker" style={{ marginBottom: '0.75rem' }}>
                  {DAYS.map(d => (
                    <div key={d.key} className={`day-chip ${selectedDays.includes(d.key) ? 'selected' : ''}`} onClick={() => toggleDay(d.key)}>
                      {d.label}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Start Time</label>
                    <input className="form-input" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>End Time</label>
                    <input className="form-input" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Room</label>
                <input className="form-input" value={courseForm.room} onChange={e => setCourseForm({...courseForm, room: e.target.value})} placeholder="Room 301" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateCourse(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Create Course</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reopen Session Modal */}
      {showReopenModal && (
        <div className="modal-overlay" onClick={() => setShowReopenModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Reopen Session</h3>
              <button className="modal-close" onClick={() => setShowReopenModal(false)}>×</button>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Reopening: <strong>{targetReopenSession?.title}</strong>. 
              <br/>This will only clear "absent" records, allowing late students to submit. Students who have already attended will keep their status.
            </p>
            <div className="form-group">
              <label className="form-label">Extended Duration (minutes)</label>
              <input 
                type="number" 
                className="form-input" 
                value={reopenDuration} 
                onChange={e => setReopenDuration(e.target.value)} 
                min="1" max="120"
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowReopenModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={confirmReopen} disabled={reopeningId !== null}>
                {reopeningId !== null ? 'Reopening...' : 'Confirm Reopen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TeacherDashboard;
