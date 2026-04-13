import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { studentApi } from '../../api';

const StudentCourseDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'stream' | 'materials'>('stream');
    const [comments, setComments] = useState<Record<number, any[]>>({});
    const [mySubmissions, setMySubmissions] = useState<Record<number, any>>({});
    const [submitting, setSubmitting] = useState<number | null>(null);
    const [subFile, setSubFile] = useState<File | null>(null);

    const load = () => {
        studentApi.getCourse(Number(id)).then(res => {
            setData(res.data.data);
            const materials = res.data.data.materials || [];
            materials.forEach((m: any) => {
                loadComments(m.id);
                if (m.type === 'assignment') loadSubmission(m.id);
            });
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    const loadComments = (mid: number) => {
        studentApi.getComments(mid).then(res => setComments(prev => ({ ...prev, [mid]: res.data.data })));
    };

    const loadSubmission = (mid: number) => {
        studentApi.getSubmission(mid).then(res => setMySubmissions(prev => ({ ...prev, [mid]: res.data.data })));
    };

    const handleHomework = async (mid: number) => {
        if (!subFile) return;
        setSubmitting(mid);
        const fd = new FormData();
        fd.append('materialId', mid.toString());
        fd.append('file', subFile);
        try {
            await studentApi.submitHomework(fd);
            setSubFile(null);
            loadSubmission(mid);
            showAlert('Success', 'Homework submitted!');
        } catch (err: any) { showApiError(err); } finally { setSubmitting(null); }
    };

    const postComment = async (mid: number, content: string, isPrivate = false) => {
        try {
            await studentApi.addComment(mid, { content, isPrivate });
            loadComments(mid);
        } catch (err: any) { showApiError(err); }
    };

    useEffect(() => { load(); }, [id]);

    if (loading) return <DashboardLayout role="student"><div className="loading-screen"><div className="spinner"></div></div></DashboardLayout>;
    if (!data) return <DashboardLayout role="student"><p>Course not found</p></DashboardLayout>;

    const { course, materials = [], attendanceRecords = [] } = data;
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter((r: any) => r.status === 'present').length;
    const late = attendanceRecords.filter((r: any) => r.status === 'late').length;
    const absent = attendanceRecords.filter((r: any) => r.status === 'absent').length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 100;


    return (
        <DashboardLayout role="student">
            {/* Course Header */}
            <div className="detail-header" style={{ borderLeft: `4px solid ${course.coverColor}`, background: `linear-gradient(135deg, ${course.coverColor}15, transparent)` }}>
                <h1 className="page-title">{course.courseCode} — {course.courseName}</h1>
                <p className="page-subtitle">{course.description || 'No description'}</p>
                <div className="meta-row">
                    {course.section && <span className="badge badge-active">{course.section}</span>}
                    {course.schedule && <span className="meta-item">Schedule: {course.schedule}</span>}
                    {course.room && <span className="meta-item">Room: {course.room}</span>}
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs-container" style={{ marginTop: '1.5rem' }}>
                <button className={`tab-btn ${tab === 'stream' ? 'active' : ''}`} onClick={() => setTab('stream')}>Stream</button>
                <button className={`tab-btn ${tab === 'materials' ? 'active' : ''}`} onClick={() => setTab('materials')}>History</button>
            </div>

            {tab === 'stream' && (
                <div className="classroom-stream">
                    {materials.length > 0 ? materials.map((m: any) => (
                        <div key={m.id} className="stream-item">
                            {m.type === 'announcement' ? (
                                <>
                                    <div className="stream-header">
                                        <div className="stream-avatar">{m.teacher?.firstName?.[0]}{m.teacher?.lastName?.[0]}</div>
                                        <div className="stream-info">
                                            <div className="stream-author">{m.teacher?.firstName} {m.teacher?.lastName}</div>
                                            <div className="stream-date">{new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                                        </div>
                                    </div>
                                    <div className="stream-content">
                                        {m.title && <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{m.title}</div>}
                                        {m.description}
                                    </div>
                                    <div className="comment-input-area">
                                        <div className="comment-avatar">S</div>
                                        <button className="comment-trigger">Add class comment</button>
                                    </div>
                                </>
                            ) : (
                                <div className="stream-item-material">
                                    <div className="material-badge">
                                        {m.type === 'file' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>}
                                        {m.type === 'link' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>}
                                        {m.type === 'assignment' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>}
                                    </div>
                                    <div className="stream-info">
                                        <h4>{m.teacher?.firstName} {m.teacher?.lastName} posted a new {m.type}: {m.title}</h4>
                                        <p>{new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                                    </div>
                                </div>
                            )}

                            {m.type === 'assignment' && (
                                <div className="assignment-footer" style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-glass)', borderRadius: '12px' }}>
                                    {mySubmissions[m.id] ? (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--accent-green)', fontWeight: 600 }}>Submitted: {new Date(mySubmissions[m.id].submittedAt).toLocaleDateString()}</div>
                                                {mySubmissions[m.id].grade && <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.4rem' }}>Grade: {mySubmissions[m.id].grade}</div>}
                                                {mySubmissions[m.id].feedback && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Feedback: {mySubmissions[m.id].feedback}</div>}
                                            </div>
                                            <button className="btn btn-secondary btn-sm" disabled>Resubmit</button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <input type="file" style={{ fontSize: '0.8rem' }} onChange={e => setSubFile(e.target.files?.[0] || null)} />
                                            <button className="btn btn-primary btn-sm" style={{ width: 'auto' }} onClick={() => handleHomework(m.id)} disabled={submitting === m.id}>
                                                {submitting === m.id ? 'Submitting...' : 'Turn in'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Comments Section */}
                            <div className="comments-section">
                                {comments[m.id]?.filter((c: any) => !c.isPrivate || (c.user?.id === data.user?.id || c.targetStudent?.id === data.user?.id)).map((c: any) => (
                                    <div key={c.id} className="comment-item">
                                        <div className="comment-avatar" style={{ background: c.isPrivate ? 'var(--accent-red)' : '' }}>{c.user?.firstName?.[0]}</div>
                                        <div className="comment-body">
                                            <div className="comment-meta">
                                                <strong>{c.user?.firstName} {c.user?.lastName}</strong> 
                                                <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                                                {c.isPrivate && <span className="pvt-tag">Private</span>}
                                            </div>
                                            <div className="comment-text">{c.content}</div>
                                        </div>
                                    </div>
                                ))}
                                <div className="comment-input-area">
                                    <div className="comment-avatar">S</div>
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input 
                                            type="text" 
                                            className="comment-inline-input" 
                                            placeholder="Add a comment..." 
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && e.currentTarget.value) {
                                                    // By default public, unless it's an assignment then UI should offer private
                                                    postComment(m.id, e.currentTarget.value);
                                                    e.currentTarget.value = '';
                                                }
                                            }}
                                        />
                                        {m.type === 'assignment' && <button className="btn-icon" title="Send Private" onClick={(e) => {
                                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                            if (input.value) {
                                                postComment(m.id, input.value, true);
                                                input.value = '';
                                            }
                                        }}>✉️</button>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                            <p style={{ color: 'var(--text-muted)' }}>No stream items yet.</p>
                        </div>
                    )}
                </div>
            )}

            {tab === 'materials' && (
                <>
                    {/* Attendance Stats */}
            <div className="stats-grid">
                <div className="stat-card green"><div className="stat-value">{present}</div><div className="stat-label">Present</div></div>
                <div className="stat-card yellow"><div className="stat-value">{late}</div><div className="stat-label">Late</div></div>
                <div className="stat-card red"><div className="stat-value">{absent}</div><div className="stat-label">Absent</div></div>
                <div className="stat-card blue">
                    <div className="stat-value">{rate}%</div>
                    <div className="stat-label">Attendance Rate</div>
                </div>
            </div>

            {/* Attendance History */}
            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Attendance History</h3>
                {attendanceRecords.length > 0 ? (
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead><tr><th>Session</th><th>Status</th><th>Date</th></tr></thead>
                            <tbody>
                                {attendanceRecords.map((r: any) => (
                                    <tr key={r.id}>
                                        <td>{r.session?.sessionTitle || 'Session'}</td>
                                        <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : new Date(r.session?.startTime).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No attendance records yet</p>}
            </div>

                </>
            )}
        </DashboardLayout>
    );
};

export default StudentCourseDetail;
