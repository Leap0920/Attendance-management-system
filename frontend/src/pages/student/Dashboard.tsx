import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { studentApi } from '../../api';
import { showAlert } from '../../utils/feedback';

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [attendCode, setAttendCode] = useState('');
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const load = () => {
    studentApi.getDashboard().then(res => {
      setData(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Auto-select session if only one is available
  useEffect(() => {
    if (data?.activeSessions) {
      const active = data.activeSessions.filter((s: any) => !s.alreadySubmitted);
      if (active.length === 1) {
        setSelectedSession(active[0].session.id);
      }
    }
  }, [data]);

  const submitAttendance = async () => {
    if (!selectedSession || !attendCode || submitting) return;
    setSubmitting(true);
    try {
      const res = await studentApi.submitAttendance({ sessionId: selectedSession, attendanceCode: attendCode });
      showAlert('Success', res.data.message || 'Attendance recorded!');
      setAttendCode('');
      setSelectedSession(null);
      load(); // Refresh data instead of full page reload
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || 'Failed to submit', 'error');
    } finally { setSubmitting(false); }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || joining) return;
    setJoining(true);
    try {
      await studentApi.joinCourse(joinCode.toUpperCase());
      showAlert('Success', 'Successfully joined the course!');
      setShowJoin(false);
      setJoinCode('');
      load();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || 'Could not join course', 'error');
    } finally { setJoining(false); }
  };

  return (
    <DashboardLayout role="student">
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Dashboard</h1>
          <p className="page-subtitle">Your courses and attendance overview</p>
        </div>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowJoin(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Join Course
        </button>
      </div>

      {loading ? <div className="loading-screen"><div className="spinner"></div></div> : data && (
        <>
          <div className="stats-grid">
            <div className="stat-card blue">
              <div className="stat-icon blue">📚</div>
              <div className="stat-value">{data.totalCourses}</div>
              <div className="stat-label">Enrolled Courses</div>
            </div>
            <div className="stat-card green">
              <div className="stat-icon green">⚡</div>
              <div className="stat-value">{data.activeSessions?.length || 0}</div>
              <div className="stat-label">Active Sessions</div>
            </div>
            <div className="stat-card purple">
              <div className="stat-icon purple">📊</div>
              <div className="stat-value">
                {data.courses?.length > 0 
                  ? Math.round(data.courses.reduce((acc: number, c: any) => acc + c.attendanceRate, 0) / data.courses.length) 
                  : 100}%
              </div>
              <div className="stat-label">Avg. Attendance</div>
            </div>
          </div>

          {/* Active Sessions — Submit Attendance */}
          {data.activeSessions?.filter((s: any) => !s.alreadySubmitted).length > 0 && (
            <div className="glass-card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--accent-blue)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <div className="live-dot" />
                <h3 style={{ margin: 0 }}>Active Attendance Session</h3>
              </div>
              
              {data.activeSessions.filter((s: any) => !s.alreadySubmitted).map((s: any) => (
                <div 
                  key={s.session.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    marginBottom: '0.75rem', 
                    padding: '0.85rem 1.25rem', 
                    background: selectedSession === s.session.id ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-glass)', 
                    borderRadius: 'var(--radius-md)', 
                    border: selectedSession === s.session.id ? '2px solid var(--accent-blue)' : '1px solid var(--border-glass)', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: selectedSession === s.session.id ? '0 4px 12px rgba(59, 130, 246, 0.1)' : 'none'
                  }} 
                  onClick={() => setSelectedSession(s.session.id)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '1.05rem', color: selectedSession === s.session.id ? 'var(--accent-blue)' : 'inherit' }}>
                        {s.courseName}
                      </strong>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {s.session.sessionTitle || 'Live Session'}
                      </span>
                    </div>
                  </div>
                  <span className={`badge ${selectedSession === s.session.id ? 'badge-active' : 'badge-active'}`} style={{ opacity: selectedSession === s.session.id ? 1 : 0.7 }}>
                    {selectedSession === s.session.id ? 'Selected' : 'Click to select'}
                  </span>
                </div>
              ))}
              
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <input
                  className="form-input" placeholder="0 0 0 0 0 0"
                  value={attendCode} onChange={e => setAttendCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  style={{ flex: 1, fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '800', letterSpacing: '0.5rem', textAlign: 'center', height: '60px', borderRadius: '12px' }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitAttendance(); } }}
                />
                <button className="btn btn-primary" style={{ width: 'auto', paddingInline: '2.5rem', borderRadius: '12px', fontSize: '1rem' }} onClick={submitAttendance}
                  disabled={!selectedSession || !attendCode || submitting}>{submitting ? 'Submitting…' : 'Submit Code'}</button>
              </div>
            </div>
          )}

          {/* Courses */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0 }}>My Courses</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-sm btn-secondary" onClick={() => navigate('/student/courses')}>Open All</button>
              <button className="btn btn-sm btn-secondary" onClick={() => load()}>Refresh</button>
            </div>
          </div>
          
          <div className="course-grid">
            {data.courses?.map((cd: any) => (
              <div
                key={cd.course.id}
                className="course-card"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/student/courses/${cd.course.id}`)}
              >
                <div className="course-card-header" style={{ background: cd.course.coverColor || 'var(--accent-blue)' }}>
                  <h3>{cd.course.courseName}</h3>
                  <p>{cd.course.courseCode}</p>
                  <div className="teacher-avatar">
                    {cd.course.teacher?.firstName?.[0]}{cd.course.teacher?.lastName?.[0] || 'T'}
                  </div>
                </div>
                <div className="course-card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Attendance Rate</span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: cd.attendanceRate >= 80 ? 'var(--accent-green)' : cd.attendanceRate >= 60 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>
                      {cd.attendanceRate}%
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${cd.attendanceRate}%`, borderRadius: 4,
                      transition: 'width 1s ease-out',
                      background: cd.attendanceRate >= 80 ? 'var(--accent-green)' : cd.attendanceRate >= 60 ? 'var(--accent-yellow)' : 'var(--accent-red)' }} />
                  </div>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{cd.totalSessions} total sessions</span>
                    <span>{Math.round((cd.attendanceRate / 100) * cd.totalSessions)} present</span>
                  </div>
                </div>
              </div>
            ))}
            {data.courses?.length === 0 && (
                <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '4rem 2rem', background: '#fff', borderRadius: '16px', border: '1px dashed var(--border-glass)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
                    <h3>No courses enrolled</h3>
                    <p>Enter a join code from your teacher to get started.</p>
                    <button className="btn btn-primary" style={{ width: 'auto', marginTop: '1rem' }} onClick={() => setShowJoin(true)}>Join Course</button>
                </div>
            )}
          </div>
        </>
      )}

      {/* Join Course Modal */}
      {showJoin && (
        <div className="modal-overlay" onClick={() => setShowJoin(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Join New Course</h3>
              <button className="modal-close" onClick={() => setShowJoin(false)}>&times;</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Enter the 6-digit course code provided by your teacher to enroll in their class.
            </p>
            <form onSubmit={handleJoin}>
              <div className="form-group">
                <label className="form-label">Course Code</label>
                <input 
                  className="form-input" 
                  autoFocus 
                  placeholder="EX: ABC123"
                  value={joinCode} 
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  required
                  style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.3rem', fontWeight: '700', fontFamily: 'monospace', height: '56px' }}
                />
              </div>
              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowJoin(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={joining || joinCode.length < 5}>
                  {joining ? 'Joining...' : 'Enroll Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default StudentDashboard;
