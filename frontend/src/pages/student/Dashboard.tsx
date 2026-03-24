import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { studentApi } from '../../api';

const StudentDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [attendCode, setAttendCode] = useState('');
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [submitMsg, setSubmitMsg] = useState('');

  useEffect(() => {
    studentApi.getDashboard().then(res => {
      setData(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const submitAttendance = async () => {
    if (!selectedSession || !attendCode) return;
    try {
      const res = await studentApi.submitAttendance({ sessionId: selectedSession, attendanceCode: attendCode });
      setSubmitMsg(res.data.message || 'Attendance recorded!');
      setAttendCode('');
      setSelectedSession(null);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setSubmitMsg(err.response?.data?.message || 'Failed to submit');
    }
  };

  return (
    <DashboardLayout role="student">
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Dashboard</h1>
          <p className="page-subtitle">Your courses and attendance</p>
        </div>
      </div>

      {loading ? <div className="loading-screen"><div className="spinner"></div></div> : data && (
        <>
          <div className="stats-grid">
            <div className="stat-card blue">
              <div className="stat-value">{data.totalCourses}</div>
              <div className="stat-label">Enrolled Courses</div>
            </div>
            <div className="stat-card green">
              <div className="stat-value">{data.activeSessions?.length || 0}</div>
              <div className="stat-label">Active Sessions</div>
            </div>
          </div>

          {/* Active Sessions — Submit Attendance */}
          {data.activeSessions?.filter((s: any) => !s.alreadySubmitted).length > 0 && (
            <div className="glass-card" style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>📋 Submit Attendance</h3>
              {submitMsg && <div className={`alert ${submitMsg.includes('fail') || submitMsg.includes('Invalid') ? 'alert-error' : 'alert-success'}`}>{submitMsg}</div>}
              {data.activeSessions.filter((s: any) => !s.alreadySubmitted).map((s: any) => (
                <div key={s.session.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', padding: '0.75rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
                  <input type="radio" name="session" checked={selectedSession === s.session.id} onChange={() => setSelectedSession(s.session.id)} />
                  <div style={{ flex: 1 }}>
                    <strong>{s.courseName}</strong>
                    <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem', fontSize: '0.85rem' }}>
                      {s.session.sessionTitle || ''}
                    </span>
                  </div>
                  <span className="badge badge-active">Active</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <input
                  className="form-input" placeholder="Enter attendance code"
                  value={attendCode} onChange={e => setAttendCode(e.target.value.toUpperCase())}
                  style={{ flex: 1, fontFamily: 'Courier New', fontSize: '1.1rem', letterSpacing: '0.2rem', textAlign: 'center' }}
                />
                <button className="btn btn-primary" style={{ width: 'auto' }} onClick={submitAttendance}
                  disabled={!selectedSession || !attendCode}>Submit</button>
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
                  <div style={{ marginTop: '0.5rem', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }}>
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
