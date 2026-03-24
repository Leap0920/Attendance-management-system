import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { teacherApi } from '../../api';

const TeacherDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAttendance, setShowAttendance] = useState(false);
  const [attendForm, setAttendForm] = useState({ courseId: '', sessionTitle: '', duration: '10' });

  useEffect(() => {
    teacherApi.getDashboard().then(res => {
      setData(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const startSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await teacherApi.createAttendance({
        courseId: Number(attendForm.courseId),
        sessionTitle: attendForm.sessionTitle,
        duration: Number(attendForm.duration),
        allowLate: true,
      });
      setShowAttendance(false);
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating session');
    }
  };

  const closeSession = async (id: number) => {
    if (confirm('Close this session? Absent students will be auto-marked.')) {
      await teacherApi.closeAttendance(id);
      window.location.reload();
    }
  };

  return (
    <DashboardLayout role="teacher">
      <div className="page-header">
        <div>
          <h1 className="page-title">Teacher Dashboard</h1>
          <p className="page-subtitle">Manage your courses and attendance</p>
        </div>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowAttendance(true)}>
          📋 Start Attendance
        </button>
      </div>

      {loading ? <div className="loading-screen"><div className="spinner"></div></div> : data && (
        <>
          <div className="stats-grid">
            <div className="stat-card blue">
              <div className="stat-value">{data.totalCourses}</div>
              <div className="stat-label">My Courses</div>
            </div>
            <div className="stat-card green">
              <div className="stat-value">{data.activeSessions?.length || 0}</div>
              <div className="stat-label">Active Sessions</div>
            </div>
          </div>

          {/* Active Sessions */}
          {data.activeSessions?.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>🟢 Active Attendance Sessions</h3>
              {data.activeSessions.map((s: any, i: number) => (
                <div key={i} className="glass-card" style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4>{s.courseName}</h4>
                      <p style={{ color: 'var(--text-secondary)' }}>
                        {s.submissions} / {s.enrolled} submitted
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div className="attendance-code-display" style={{ padding: '0.75rem 1.5rem' }}>
                        <div className="code" style={{ fontSize: '1.5rem' }}>{s.session.attendanceCode}</div>
                      </div>
                      <button className="btn btn-danger btn-sm" onClick={() => closeSession(s.session.id)}>Close</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Courses */}
          <h3 style={{ marginBottom: '1rem' }}>My Courses</h3>
          <div className="course-grid">
            {data.courses?.map((c: any) => (
              <div key={c.id} className="course-card">
                <div className="course-card-header" style={{ background: c.coverColor }}>
                  <h3>{c.courseName}</h3>
                  <p>{c.courseCode} {c.section ? `• ${c.section}` : ''}</p>
                </div>
                <div className="course-card-body">
                  <p>{c.description || 'No description'}</p>
                </div>
                <div className="course-card-footer">
                  <span className="join-code">{c.joinCode}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{c.schedule || ''}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

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
                  {data?.courses?.map((c: any) => <option key={c.id} value={c.id}>{c.courseName}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Session Title (optional)</label>
                <input className="form-input" value={attendForm.sessionTitle} onChange={e => setAttendForm({...attendForm, sessionTitle: e.target.value})} />
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
    </DashboardLayout>
  );
};

export default TeacherDashboard;
