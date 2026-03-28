import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { teacherApi } from '../../api';

const TeacherCourseDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'students' | 'sessions'>('students');
    const [showEdit, setShowEdit] = useState(false);
    const [showAttendance, setShowAttendance] = useState(false);
    const [editForm, setEditForm] = useState({ courseCode: '', courseName: '', description: '', section: '', schedule: '', room: '' });
    const [attendForm, setAttendForm] = useState({ sessionTitle: '', duration: '10' });

    const load = () => {
        teacherApi.getCourse(Number(id)).then(res => {
            setData(res.data.data);
            const c = res.data.data.course;
            setEditForm({ courseCode: c.courseCode, courseName: c.courseName, description: c.description || '', section: c.section || '', schedule: c.schedule || '', room: c.room || '' });
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    useEffect(() => { load(); }, [id]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        await teacherApi.updateCourse(Number(id), editForm);
        setShowEdit(false);
        load();
    };

    const handleDelete = async () => {
        if (confirm('Delete this course? This cannot be undone.')) {
            await teacherApi.deleteCourse(Number(id));
            navigate('/teacher/courses');
        }
    };

    const startSession = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await teacherApi.createAttendance({ courseId: Number(id), sessionTitle: attendForm.sessionTitle, duration: Number(attendForm.duration), allowLate: true });
            setShowAttendance(false);
            setAttendForm({ sessionTitle: '', duration: '10' });
            load();
        } catch (err: any) { alert(err.response?.data?.message || 'Error'); }
    };

    const closeSession = async (sessionId: number) => {
        if (confirm('Close this session?')) {
            await teacherApi.closeAttendance(sessionId);
            load();
        }
    };

    if (loading) return <DashboardLayout role="teacher"><div className="loading-screen"><div className="spinner"></div></div></DashboardLayout>;
    if (!data) return <DashboardLayout role="teacher"><p>Course not found</p></DashboardLayout>;

    const { course, enrollments, sessions } = data;

    return (
        <DashboardLayout role="teacher">
            {/* Course Header */}
            <div className="detail-header" style={{ borderLeft: `4px solid ${course.coverColor}`, background: `linear-gradient(135deg, ${course.coverColor}15, transparent)` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 className="page-title">{course.courseCode} — {course.courseName}</h1>
                        <p className="page-subtitle">{course.description || 'No description'}</p>
                        <div className="meta-row">
                            {course.section && <span className="badge badge-active">{course.section}</span>}
                            <span className="meta-item">Join: {course.joinCode}</span>
                            {course.schedule && <span className="meta-item">Schedule: {course.schedule}</span>}
                            {course.room && <span className="meta-item">Room: {course.room}</span>}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowAttendance(true)}>Start Attendance</button>
                        <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setShowEdit(true)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs-container">
                <button className={`tab-btn ${tab === 'students' ? 'active' : ''}`} onClick={() => setTab('students')}>Students ({enrollments?.length || 0})</button>
                <button className={`tab-btn ${tab === 'sessions' ? 'active' : ''}`} onClick={() => setTab('sessions')}>Sessions ({sessions?.length || 0})</button>
            </div>

            {/* Students Tab */}
            {tab === 'students' && (
                <div className="glass-card">
                    {enrollments?.length > 0 ? (
                        <div className="data-table-wrapper">
                            <table className="data-table">
                                <thead><tr><th>Student</th><th>Student ID</th><th>Email</th><th>Status</th></tr></thead>
                                <tbody>
                                    {enrollments.map((e: any) => (
                                        <tr key={e.id}>
                                            <td style={{ fontWeight: 600 }}>{e.student?.firstName} {e.student?.lastName}</td>
                                            <td>{e.student?.studentId || '—'}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{e.student?.email}</td>
                                            <td><span className="badge badge-present">Active</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No students enrolled yet</p>}
                </div>
            )}

            {/* Sessions Tab */}
            {tab === 'sessions' && (
                <div className="glass-card">
                    {sessions?.length > 0 ? (
                        <div className="data-table-wrapper">
                            <table className="data-table">
                                <thead><tr><th>Session</th><th>Code</th><th>Duration</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {sessions.map((s: any) => (
                                        <tr key={s.id}>
                                            <td style={{ fontWeight: 600 }}>{s.sessionTitle || 'Session'}</td>
                                            <td><span className="join-code">{s.attendanceCode}</span></td>
                                            <td>{s.durationMinutes} min</td>
                                            <td><span className={`badge badge-${s.status === 'active' ? 'present' : 'absent'}`}>{s.status}</span></td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{new Date(s.startTime).toLocaleString()}</td>
                                            <td>
                                                {s.status === 'active' && <button className="btn btn-danger btn-sm" onClick={() => closeSession(s.id)}>Close</button>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No sessions yet</p>}
                </div>
            )}

            {/* Edit Modal */}
            {showEdit && (
                <div className="modal-overlay" onClick={() => setShowEdit(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3 className="modal-title">Edit Course</h3><button className="modal-close" onClick={() => setShowEdit(false)}>×</button></div>
                        <form onSubmit={handleUpdate}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div className="form-group"><label className="form-label">Course Code</label><input className="form-input" value={editForm.courseCode} onChange={e => setEditForm({ ...editForm, courseCode: e.target.value })} required /></div>
                                <div className="form-group"><label className="form-label">Section</label><input className="form-input" value={editForm.section} onChange={e => setEditForm({ ...editForm, section: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Course Name</label><input className="form-input" value={editForm.courseName} onChange={e => setEditForm({ ...editForm, courseName: e.target.value })} required /></div>
                            <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div className="form-group"><label className="form-label">Schedule</label><input className="form-input" value={editForm.schedule} onChange={e => setEditForm({ ...editForm, schedule: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Room</label><input className="form-input" value={editForm.room} onChange={e => setEditForm({ ...editForm, room: e.target.value })} /></div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Start Attendance Modal */}
            {showAttendance && (
                <div className="modal-overlay" onClick={() => setShowAttendance(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3 className="modal-title">Start Attendance</h3><button className="modal-close" onClick={() => setShowAttendance(false)}>×</button></div>
                        <form onSubmit={startSession}>
                            <div className="form-group"><label className="form-label">Session Title (optional)</label><input className="form-input" value={attendForm.sessionTitle} onChange={e => setAttendForm({ ...attendForm, sessionTitle: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Duration (minutes)</label><input className="form-input" type="number" min="1" max="120" value={attendForm.duration} onChange={e => setAttendForm({ ...attendForm, duration: e.target.value })} /></div>
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

export default TeacherCourseDetail;
