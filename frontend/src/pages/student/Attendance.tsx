import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { studentApi } from '../../api';
import { showAlert } from '../../utils/feedback';

const StudentAttendance: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [codes, setCodes] = useState<Record<number, string>>({});
    const [submitting, setSubmitting] = useState<number | null>(null);

    const load = () => {
        studentApi.getDashboard().then(res => {
            setData(res.data.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const submitAttendance = async (sessionId: number) => {
        const code = codes[sessionId];
        if (!code?.trim()) { showAlert('Error', 'Enter attendance code', 'error'); return; }
        if (submitting) return;
        setSubmitting(sessionId);
        try {
            const res = await studentApi.submitAttendance({ sessionId, attendanceCode: code });
            showAlert('Success', res.data.message || 'Attendance submitted!');
            setCodes(prev => ({ ...prev, [sessionId]: '' }));
            load();
        } catch (err: any) {
            showAlert('Error', err.response?.data?.message || 'Failed to submit', 'error');
        } finally { setSubmitting(null); }
    };

    const activeSessions = data?.activeSessions || [];
    const courses = data?.courses || [];

    let totalPresent = 0, totalAll = 0;
    courses.forEach((c: any) => {
        totalAll += c.totalSessions || 0;
        totalPresent += c.presentCount || 0;
    });
    const totalAbsent = totalAll - totalPresent;
    const overallRate = totalAll > 0 ? Math.round((totalPresent / totalAll) * 1000) / 10 : 100;

    return (
        <DashboardLayout role="student">
            <div className="page-header">
                <div><h1 className="page-title">My Attendance</h1><p className="page-subtitle">Submit attendance and view your records</p></div>
            </div>

            {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
                <>
                    {/* Active Sessions */}
                    {activeSessions.length > 0 && (
                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ marginBottom: '1rem', color: 'var(--accent-green)' }}>Active Sessions — Submit Now</h3>
                            {activeSessions.map((s: any) => (
                                <div key={s.session.id} className="glass-card" style={{ marginBottom: '1rem', borderLeft: '3px solid var(--accent-green)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                        <div>
                                            <h4>{s.courseName}</h4>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{s.session.sessionTitle || 'Session'} • {s.session.durationMinutes} min</p>
                                        </div>
                                        {s.alreadySubmitted ? (
                                            <span className="badge badge-present" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>✓ Submitted</span>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <input className="form-input" style={{ maxWidth: '160px' }} placeholder="Enter code…" value={codes[s.session.id] || ''}
                                                    onChange={e => setCodes({ ...codes, [s.session.id]: e.target.value.toUpperCase() })}
                                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitAttendance(s.session.id); } }} />
                                                <button className="btn btn-primary" style={{ width: 'auto' }} disabled={submitting === s.session.id}
                                                    onClick={() => submitAttendance(s.session.id)}>
                                                    {submitting === s.session.id ? 'Submitting…' : 'Submit'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Stats */}
                    <div className="stats-grid">
                        <div className="stat-card green"><div className="stat-value">{totalPresent}</div><div className="stat-label">Present</div></div>
                        <div className="stat-card red"><div className="stat-value">{totalAbsent}</div><div className="stat-label">Absent/Late</div></div>
                        <div className="stat-card blue"><div className="stat-value">{overallRate}%</div><div className="stat-label">Overall Rate</div></div>
                        <div className="stat-card purple"><div className="stat-value">{totalAll}</div><div className="stat-label">Total Sessions</div></div>
                    </div>

                    {/* Per-Course Breakdown */}
                    <div className="glass-card">
                        <h3 style={{ marginBottom: '1rem' }}>Course Breakdown</h3>
                        <div className="data-table-wrapper">
                            <table className="data-table">
                                <thead><tr><th>Course</th><th>Total Sessions</th><th>Present</th><th>Attendance Rate</th></tr></thead>
                                <tbody>
                                    {courses.map((c: any) => (
                                        <tr key={c.course.id}>
                                            <td style={{ fontWeight: 600 }}>{c.course.courseCode} — {c.course.courseName}</td>
                                            <td>{c.totalSessions}</td>
                                            <td><span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{c.presentCount}</span></td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div className="progress-bar-bg">
                                                        <div className="progress-bar-fill" style={{ width: `${c.attendanceRate}%`, background: c.attendanceRate >= 80 ? 'var(--accent-green)' : c.attendanceRate >= 60 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}></div>
                                                    </div>
                                                    <span style={{ fontWeight: 700, fontSize: '0.85rem', minWidth: '45px' }}>{c.attendanceRate}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {courses.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No courses enrolled</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </DashboardLayout>
    );
};

export default StudentAttendance;
