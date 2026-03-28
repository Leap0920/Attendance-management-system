import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { teacherApi } from '../../api';

const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAttendance, setShowAttendance] = useState(false);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [attendForm, setAttendForm] = useState({ courseId: '', sessionTitle: '', duration: '10' });
  const [courseForm, setCourseForm] = useState({ courseName: '', courseCode: '', section: '', description: '', schedule: '', room: '', coverColor: '#3b82f6' });
  const [notification, setNotification] = useState<string | null>(null);

  const loadDashboard = () => {
    teacherApi.getDashboard().then(res => {
      setData(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadDashboard(); }, []);

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
      setNotification(`Attendance session started! Code: ${code}`);
      loadDashboard();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating session');
    }
  };

  const closeSession = async (id: number) => {
    if (confirm('Close this session? Absent students will be auto-marked.')) {
      await teacherApi.closeAttendance(id);
      setNotification(null);
      loadDashboard();
    }
  };

  const createCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await teacherApi.createCourse(courseForm);
      setShowCreateCourse(false);
      setCourseForm({ courseName: '', courseCode: '', section: '', description: '', schedule: '', room: '', coverColor: '#3b82f6' });
      loadDashboard();
    } catch (err: any) { alert(err.response?.data?.message || 'Error creating course'); }
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
              <button onClick={() => setNotification(null)} style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: '1rem' }}>x</button>
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
              <div key={i} className="active-session-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{s.courseName}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {s.session?.sessionTitle || 'Session'} &middot; {s.submissions}/{s.enrolled} submitted
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      padding: '0.5rem 1rem', background: '#eff6ff', borderRadius: 'var(--radius-sm)',
                      fontFamily: "'Courier New', monospace", fontWeight: 800, fontSize: '1.1rem',
                      color: 'var(--accent-blue)', letterSpacing: '0.15em',
                    }}>
                      {s.session?.attendanceCode}
                    </div>
                    <button
                      className="btn-icon"
                      title="Copy code"
                      onClick={() => { navigator.clipboard.writeText(s.session?.attendanceCode || ''); }}
                      style={{ fontSize: '0.75rem', padding: '0.5rem' }}
                    >
                      Copy
                    </button>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      fontSize: '0.775rem', color: 'var(--accent-green)', fontWeight: 600
                    }}>
                      {s.session?.durationMinutes || 10} min
                    </span>
                    <button className="btn btn-danger btn-sm" onClick={() => closeSession(s.session.id)} style={{ width: 'auto' }}>
                      Close Session
                    </button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No active sessions. Click "New Session" to start attendance.
              </div>
            )}
          </div>

          {/* My Courses */}
          <h3 className="section-title">My Courses</h3>
          <div className="course-grid">
            {data.courses?.map((c: any) => (
              <div key={c.id} className="course-card" onClick={() => navigate(`/teacher/courses/${c.id}`)}>
                <div className="course-card-header" style={{ background: c.coverColor }}>
                  <h3>{c.courseName}</h3>
                  <p>{c.courseCode} {c.section ? `- ${c.section}` : ''}</p>
                </div>
                <div className="course-card-body">
                  <p>{c.description || 'No description'}</p>
                </div>
                <div className="course-card-footer">
                  <span className="join-code">{c.joinCode}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{c.schedule || ''}</span>
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
              <button className="modal-close" onClick={() => setShowAttendance(false)}>x</button>
            </div>
            <form onSubmit={startSession}>
              <div className="form-group">
                <label className="form-label">Course</label>
                <select className="form-input" value={attendForm.courseId} onChange={e => setAttendForm({...attendForm, courseId: e.target.value})} required>
                  <option value="">Select course...</option>
                  {data?.courses?.map((c: any) => <option key={c.id} value={c.id}>{c.courseName}</option>)}
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

      {/* Create Course Modal */}
      {showCreateCourse && (
        <div className="modal-overlay" onClick={() => setShowCreateCourse(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Course</h3>
              <button className="modal-close" onClick={() => setShowCreateCourse(false)}>x</button>
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
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={2} value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})} placeholder="Course description..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Schedule</label>
                  <input className="form-input" value={courseForm.schedule} onChange={e => setCourseForm({...courseForm, schedule: e.target.value})} placeholder="MWF 9:00-10:00" />
                </div>
                <div className="form-group">
                  <label className="form-label">Room</label>
                  <input className="form-input" value={courseForm.room} onChange={e => setCourseForm({...courseForm, room: e.target.value})} placeholder="Room 301" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Cover Color</label>
                <input type="color" value={courseForm.coverColor} onChange={e => setCourseForm({...courseForm, coverColor: e.target.value})} style={{ width: '48px', height: '36px', border: 'none', cursor: 'pointer', borderRadius: '6px' }} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateCourse(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Create Course</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TeacherDashboard;
