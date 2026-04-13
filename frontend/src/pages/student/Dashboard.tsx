import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { studentApi } from '../../api';
import { showAlert } from '../../utils/feedback';

const StudentDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [attendCode, setAttendCode] = useState('');
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <DashboardLayout role="student">
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Dashboard</h1>
          <p className="page-subtitle">Your courses and attendance overview</p>
        </div>
      </div>

      {loading ? <div className="loading-screen"><div className="spinner"></div></div> : data && (
        <>
          <div className="stats-grid">
            <div className="stat-card blue"><div className="stat-value">{data.totalCourses}</div><div className="stat-label">Enrolled Courses</div></div>
            <div className="stat-card green"><div className="stat-value">{data.activeSessions?.length || 0}</div><div className="stat-label">Active Sessions</div></div>
          </div>

          {/* Active Sessions — Submit Attendance */}
          {data.activeSessions?.filter((s: any) => !s.alreadySubmitted).length > 0 && (
            <div className="glass-card" style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Submit Attendance</h3>
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
                        {s.session.sessionTitle || ''}
                      </span>
                    </div>
                  </div>
                  <span className={`badge ${selectedSession === s.session.id ? 'badge-active' : 'badge-active'}`} style={{ opacity: selectedSession === s.session.id ? 1 : 0.7 }}>
                    {selectedSession === s.session.id ? 'Selected' : 'Active'}
                  </span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <input
                  className="form-input" placeholder="Enter attendance code"
                  value={attendCode} onChange={e => setAttendCode(e.target.value.toUpperCase())}
                  style={{ flex: 1, fontFamily: 'Courier New', fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '0.3rem', textAlign: 'center', height: '50px' }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitAttendance(); } }}
                />
                <button className="btn btn-primary" style={{ width: 'auto', paddingInline: '2rem' }} onClick={submitAttendance}
                  disabled={!selectedSession || !attendCode || submitting}>{submitting ? 'Submitting…' : 'Submit'}</button>
              </div>
            </div>
          )}

          {/* Courses */}
          <h3 style={{ marginBottom: '1rem' }}>My Courses</h3>
          <div className="course-grid">
            {data.courses?.map((cd: any) => (
              <div key={cd.course.id} className="course-card">
                <div className="course-card-header" style={{ background: cd.course.coverColor }}>
                  <h3>{cd.course.courseName}</h3>
                  <p>{cd.course.courseCode}</p>
                </div>
                <div className="course-card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{cd.totalSessions} sessions</span>
                    <span style={{ fontWeight: 700, color: cd.attendanceRate >= 80 ? 'var(--accent-green)' : cd.attendanceRate >= 60 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>
                      {cd.attendanceRate}%
                    </span>
                  </div>
                  <div style={{ marginTop: '0.5rem', height: 4, borderRadius: 2, background: '#e2e8f0' }}>
                    <div style={{ height: '100%', width: `${cd.attendanceRate}%`, borderRadius: 2,
                      background: cd.attendanceRate >= 80 ? 'var(--accent-green)' : cd.attendanceRate >= 60 ? 'var(--accent-yellow)' : 'var(--accent-red)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default StudentDashboard;
