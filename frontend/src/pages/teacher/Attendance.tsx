import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { teacherApi } from '../../api';
import { showAlert, showConfirm, showApiError } from '../../utils/feedback';

const TeacherAttendance: React.FC = () => {
    const [sessions, setSessions] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showRecords, setShowRecords] = useState<any>(null);
    const [records, setRecords] = useState<any[]>([]);
    const [form, setForm] = useState({ courseId: '', sessionTitle: '', duration: '10' });

    const load = () => {
        Promise.all([teacherApi.getSessions(), teacherApi.getCourses()]).then(([sessRes, courseRes]) => {
            setSessions(sessRes.data.data || []);
            setCourses(courseRes.data.data || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await teacherApi.createAttendance({ courseId: Number(form.courseId), sessionTitle: form.sessionTitle, duration: Number(form.duration), allowLate: true });
            setShowModal(false);
            setForm({ courseId: '', sessionTitle: '', duration: '10' });
            load();
            showAlert('Success', 'Attendance session started!');
        } catch (err: any) { showApiError(err); }
    };

    const closeSession = async (id: number) => {
        showConfirm('Close Session', 'Are you sure you want to close this session? Absent students will be auto-marked.', async () => {
            try {
                await teacherApi.closeAttendance(id);
                load();
                showAlert('Success', 'Session closed.');
            } catch (err: any) { showApiError(err); }
        });
    };

    const reopenSession = async (id: number) => {
        showConfirm('Reopen Session', 'Reopen this session? A new code will be generated.', async () => {
            try {
                await teacherApi.reopenAttendance(id);
                load();
                showAlert('Success', 'Session reopened.');
            } catch (err: any) { showApiError(err); }
        });
    };

    const viewRecords = async (session: any) => {
        const res = await teacherApi.getRecords(session.id);
        setRecords(res.data.data || []);
        setShowRecords(session);
    };

    const activeSessions = sessions.filter(s => s.status === 'active');
    const closedSessions = sessions.filter(s => s.status !== 'active');

    return (
        <DashboardLayout role="teacher">
            <div className="page-header">
                <div><h1 className="page-title">Attendance Management</h1><p className="page-subtitle">View and manage all attendance sessions</p></div>
                <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowModal(true)}>+ New Session</button>
            </div>

            {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
                <>
                    {/* Stats */}
                    <div className="stats-grid">
                        <div className="stat-card blue"><div className="stat-value">{sessions.length}</div><div className="stat-label">Total Sessions</div></div>
                        <div className="stat-card green"><div className="stat-value">{activeSessions.length}</div><div className="stat-label">Active Now</div></div>
                        <div className="stat-card purple"><div className="stat-value">{closedSessions.length}</div><div className="stat-label">Completed</div></div>
                    </div>

                    {/* Active Sessions */}
                    {activeSessions.length > 0 && (
                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ marginBottom: '1rem', color: 'var(--accent-green)' }}>Active Sessions</h3>
                            {activeSessions.map(s => (
                                <div key={s.id} className="glass-card" style={{ marginBottom: '1rem', borderLeft: '3px solid var(--accent-green)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                        <div>
                                            <h4>{s.course?.courseName || 'Course'}</h4>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{s.sessionTitle || 'Session'} • {s.durationMinutes} min</p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div className="attendance-code-display" style={{ padding: '0.5rem 1rem' }}>
                                                <div className="code" style={{ fontSize: '1.5rem' }}>{s.attendanceCode}</div>
                                            </div>
                                            <button className="btn btn-secondary btn-sm" onClick={() => viewRecords(s)}>Records</button>
                                            <button className="btn btn-danger btn-sm" onClick={() => closeSession(s.id)}>Close</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* All Sessions Table */}
                    <div className="glass-card">
                        <h3 style={{ marginBottom: '1rem' }}>All Sessions</h3>
                        <div className="data-table-wrapper">
                            <table className="data-table">
                                <thead><tr><th>Course</th><th>Session</th><th>Code</th><th>Duration</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {sessions.map(s => (
                                        <tr key={s.id}>
                                            <td style={{ fontWeight: 600 }}>{s.course?.courseCode || '—'}</td>
                                            <td>{s.sessionTitle || 'Session'}</td>
                                            <td><span className="join-code">{s.attendanceCode}</span></td>
                                            <td>{s.durationMinutes} min</td>
                                            <td><span className={`badge badge-${s.status === 'active' ? 'present' : 'absent'}`}>{s.status}</span></td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{new Date(s.startTime).toLocaleString()}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => viewRecords(s)}>View</button>
                                                    {s.status === 'active' && <button className="btn btn-danger btn-sm" onClick={() => closeSession(s.id)}>Close</button>}
                                                    {s.status === 'closed' && <button className="btn btn-success btn-sm" onClick={() => reopenSession(s.id)}>Reopen</button>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {sessions.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No sessions yet</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3 className="modal-title">New Attendance Session</h3><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
                        <form onSubmit={handleCreate}>
                            <div className="form-group"><label className="form-label">Course</label>
                                <select className="form-input" value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value })} required>
                                    <option value="">Select course...</option>
                                    {courses.map((c: any) => <option key={c.id} value={c.id}>{c.courseCode} — {c.courseName}</option>)}
                                </select>
                            </div>
                            <div className="form-group"><label className="form-label">Session Title (optional)</label><input className="form-input" value={form.sessionTitle} onChange={e => setForm({ ...form, sessionTitle: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Duration (minutes)</label><input className="form-input" type="number" min="1" max="120" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} /></div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Start Session</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Records Modal */}
            {showRecords && (
                <div className="modal-overlay" onClick={() => setShowRecords(null)}>
                    <div className="modal" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3 className="modal-title">Attendance Records — {showRecords.sessionTitle || 'Session'}</h3><button className="modal-close" onClick={() => setShowRecords(null)}>×</button></div>
                        <div className="data-table-wrapper">
                            <table className="data-table">
                                <thead><tr><th>Student</th><th>Status</th><th>Time</th></tr></thead>
                                <tbody>
                                    {records.map((r: any) => (
                                        <tr key={r.id}>
                                            <td style={{ fontWeight: 500 }}>
                                                {r.student?.firstName} {r.student?.lastName}
                                                {r.student?.studentId && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{r.student.studentId}</div>}
                                            </td>
                                            <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '—'}</td>
                                        </tr>
                                    ))}
                                    {records.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No records</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default TeacherAttendance;
