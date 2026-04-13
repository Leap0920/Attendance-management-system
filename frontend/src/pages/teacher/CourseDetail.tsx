import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { teacherApi } from '../../api';
import { showAlert, showConfirm, showApiError } from '../../utils/feedback';

const SessionTimer: React.FC<{ endTime: string; onExpire: () => void }> = ({ endTime, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const end = new Date(endTime).getTime();
    const update = () => {
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) { setTimeLeft('Expired'); onExpire(); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [endTime, onExpire]);

  return (
    <span style={{ color: timeLeft === 'Expired' ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: 700 }}>
      {timeLeft}
    </span>
  );
};

const TeacherCourseDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'students' | 'sessions' | 'materials'>('materials');
    const [showEdit, setShowEdit] = useState(false);
    const [showAttendance, setShowAttendance] = useState(false);
    const [editForm, setEditForm] = useState({ courseCode: '', courseName: '', description: '', section: '', schedule: '', room: '' });
    const [attendForm, setAttendForm] = useState({ sessionTitle: '', duration: '10' });
    const [showReopenModal, setShowReopenModal] = useState(false);
    const [targetReopenSession, setTargetReopenSession] = useState<{id: number, title: string} | null>(null);
    const [reopenDuration, setReopenDuration] = useState('10');
    const [reopeningId, setReopeningId] = useState<number | null>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [showPostArea, setShowPostArea] = useState(false);
    const [postForm, setPostForm] = useState({ type: 'announcement', title: '', description: '', externalLink: '', dueDate: '', forCourses: [Number(id)] });
    const [postFile, setPostFile] = useState<File | null>(null);
    const [posting, setPosting] = useState(false);
    const [showSubmissions, setShowSubmissions] = useState<any>(null);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [gradingSub, setGradingSub] = useState<any>(null);
    const [comments, setComments] = useState<Record<number, any[]>>({});

    const load = () => {
        teacherApi.getCourse(Number(id)).then(res => {
            setData(res.data.data);
            const c = res.data.data.course;
            setEditForm({ courseCode: c.courseCode, courseName: c.courseName, description: c.description || '', section: c.section || '', schedule: c.schedule || '', room: c.room || '' });
            setLoading(false);
            teacherApi.getMaterials(Number(id)).then(mres => {
                const materials = mres.data.data || [];
                setData((prev: any) => ({ ...prev, materials }));
                materials.forEach((m: any) => loadComments(m.id));
            });
            teacherApi.getCourses().then(cres => setCourses(cres.data.data || []));
        }).catch(() => setLoading(false));
    };

    const loadComments = (mid: number) => {
        teacherApi.getComments(mid).then(res => setComments(prev => ({ ...prev, [mid]: res.data.data })));
    };

    const handlePost = async (e: React.FormEvent) => {
        e.preventDefault();
        setPosting(true);
        const fd = new FormData();
        fd.append('courseIds', postForm.forCourses.join(','));
        fd.append('type', postForm.type);
        fd.append('title', postForm.title);
        if (postForm.description) fd.append('description', postForm.description);
        if (postForm.externalLink) fd.append('externalLink', postForm.externalLink);
        if (postForm.dueDate) fd.append('dueDate', postForm.dueDate);
        if (postFile) fd.append('file', postFile);

        try {
            await teacherApi.createMaterial(fd);
            setShowPostArea(false);
            setPostForm({ type: 'announcement', title: '', description: '', externalLink: '', dueDate: '', forCourses: [Number(id)] });
            setPostFile(null);
            load();
            showAlert('Success', 'Posted successfully');
        } catch (err: any) { showApiError(err); } finally { setPosting(false); }
    };

    const viewSubmissions = (material: any) => {
        setShowSubmissions(material);
        teacherApi.getSubmissions(material.id).then(res => setSubmissions(res.data.data || []));
    };

    const gradeSubmission = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await teacherApi.gradeSubmission(gradingSub.id, { grade: gradingSub.grade, feedback: gradingSub.feedback });
            setGradingSub(null);
            teacherApi.getSubmissions(showSubmissions.id).then(res => setSubmissions(res.data.data || []));
            showAlert('Success', 'Graded successfully');
        } catch (err: any) { showApiError(err); }
    };

    const postComment = async (mid: number, content: string, isPrivate = false) => {
        try {
            await teacherApi.addComment(mid, { content, isPrivate });
            loadComments(mid);
        } catch (err: any) { showApiError(err); }
    };

    useEffect(() => { load(); }, [id]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        await teacherApi.updateCourse(Number(id), editForm);
        setShowEdit(false);
        load();
    };

    const handleDelete = async () => {
        showConfirm('Delete Course', 'Are you sure you want to delete this course? This cannot be undone.', async () => {
            try {
                await teacherApi.deleteCourse(Number(id));
                navigate('/teacher/courses');
                showAlert('Deleted', 'Course has been deleted.', 'error');
            } catch (err: any) { showApiError(err); }
        });
    };

    const handleArchive = async () => {
        showConfirm('Archive Course', 'Archive this course? Students will no longer see it in their active list.', async () => {
            try {
                await teacherApi.archiveCourse(Number(id));
                showAlert('Archived', 'Course archived.');
                load();
            } catch (err: any) { showApiError(err); }
        });
    };

    const handleUnarchive = async () => {
        await teacherApi.unarchiveCourse(Number(id));
        load();
    };

    const startSession = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await teacherApi.createAttendance({ courseId: Number(id), sessionTitle: attendForm.sessionTitle, duration: Number(attendForm.duration), allowLate: true });
            setShowAttendance(false);
            setAttendForm({ sessionTitle: '', duration: '10' });
            load();
            showAlert('Success', 'Attendance session started!');
        } catch (err: any) { showApiError(err); }
    };

    const closeSession = async (sessionId: number) => {
        showConfirm('Close Session', 'Are you sure you want to close this session? Absent students will be auto-marked.', async () => {
            try {
                await teacherApi.closeAttendance(sessionId);
                showAlert('Success', 'Session closed.');
                load();
            } catch (err: any) { showApiError(err); }
        });
    };

    const openReopenModal = (id: number, title: string) => {
        setTargetReopenSession({ id, title });
        setReopenDuration('10');
        setShowReopenModal(true);
    };

    const confirmReopen = async () => {
        if (!targetReopenSession) return;
        try {
            setReopeningId(targetReopenSession.id);
            await teacherApi.reopenAttendance(targetReopenSession.id, Number(reopenDuration));
            setShowReopenModal(false);
            setTargetReopenSession(null);
            load();
        } catch (err: any) {
            showApiError(err, 'Error reopening');
        } finally {
            setReopeningId(null);
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
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowAttendance(true)}>Start Attendance</button>
                        <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setShowEdit(true)}>Edit</button>
                        {course.status === 'archived' ? (
                            <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={handleUnarchive}>Unarchive</button>
                        ) : (
                            <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={handleArchive}>Archive</button>
                        )}
                        <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs-container">
                <button className={`tab-btn ${tab === 'materials' ? 'active' : ''}`} onClick={() => setTab('materials')}>Stream</button>
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

            {/* Materials (Stream) Tab */}
            {tab === 'materials' && (
                <div className="classroom-stream">
                    {/* Share Box */}
                    {!showPostArea ? (
                        <div className="stream-item post-trigger" onClick={() => setShowPostArea(true)}>
                            <div className="stream-avatar">{course?.teacher?.firstName?.[0] || 'T'}</div>
                            <span>Announce something to your class...</span>
                        </div>
                    ) : (
                        <div className="stream-item post-box-expanded">
                            <form onSubmit={handlePost}>
                                <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1rem' }}>
                                    <select className="form-input" style={{ width: 'auto' }} value={postForm.type} onChange={e => setPostForm({ ...postForm, type: e.target.value })}>
                                        <option value="announcement">Announcement</option>
                                        <option value="assignment">Assignment</option>
                                        <option value="file">Material (File)</option>
                                        <option value="link">Material (Link)</option>
                                    </select>
                                    <input className="form-input" placeholder="Title" value={postForm.title} onChange={e => setPostForm({ ...postForm, title: e.target.value })} required />
                                </div>
                                <textarea className="form-input" placeholder="Description" rows={4} value={postForm.description} onChange={e => setPostForm({ ...postForm, description: e.target.value })} style={{ marginBottom: '1rem' }} />
                                
                                {postForm.type === 'file' && <input type="file" className="form-input" style={{ marginBottom: '1rem' }} onChange={e => setPostFile(e.target.files?.[0] || null)} />}
                                {postForm.type === 'link' && <input type="text" className="form-input" placeholder="https://..." style={{ marginBottom: '1rem' }} value={postForm.externalLink} onChange={e => setPostForm({ ...postForm, externalLink: e.target.value })} />}
                                {postForm.type === 'assignment' && <div className="form-group"><label className="form-label">Due Date</label><input type="datetime-local" className="form-input" value={postForm.dueDate} onChange={e => setPostForm({ ...postForm, dueDate: e.target.value })} /></div>}

                                <div className="forward-sections" style={{ marginBottom: '1rem' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>For: (Select other sections to forward to)</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {courses.map(c => (
                                            <label key={c.id} className={`chip-select ${postForm.forCourses.includes(c.id) ? 'selected' : ''}`}>
                                                <input type="checkbox" checked={postForm.forCourses.includes(c.id)} onChange={e => {
                                                    const cur = postForm.forCourses;
                                                    setPostForm({ ...postForm, forCourses: e.target.checked ? [...cur, c.id] : cur.filter(x => x !== c.id) });
                                                }} style={{ display: 'none' }} />
                                                {c.courseCode} {c.section}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowPostArea(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" style={{ width: 'auto' }} disabled={posting}>{posting ? 'Posting...' : 'Post'}</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {data.materials?.length > 0 ? data.materials.map((m: any) => (
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
                                </>
                            ) : (
                                <div className="stream-item-material">
                                    <div className="material-badge">
                                        {m.type === 'file' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>}
                                        {m.type === 'link' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>}
                                        {m.type === 'assignment' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>}
                                    </div>
                                    <div className="stream-info" style={{ flex: 1 }}>
                                        <h4>{m.teacher?.firstName} {m.teacher?.lastName} posted a new {m.type}: {m.title}</h4>
                                        <p>{new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                                    </div>
                                    {m.type === 'assignment' && (
                                        <button className="btn btn-secondary btn-sm" onClick={() => viewSubmissions(m)}>Submissions</button>
                                    )}
                                </div>
                            )}

                            {/* Comments Section */}
                            <div className="comments-section">
                                {comments[m.id]?.map((c: any) => (
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
                                    <div className="comment-avatar">T</div>
                                    <input 
                                        type="text" 
                                        className="comment-inline-input" 
                                        placeholder="Add a class comment..." 
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && e.currentTarget.value) {
                                                postComment(m.id, e.currentTarget.value);
                                                e.currentTarget.value = '';
                                            }
                                        }}
                                    />
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
                                                {s.status === 'active' ? (
                                                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                        <SessionTimer endTime={s.endTime} onExpire={load} />
                                                        <button className="btn btn-danger btn-sm" onClick={() => closeSession(s.id)}>Close</button>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        className="btn btn-secondary btn-sm" 
                                                        onClick={() => openReopenModal(s.id, s.sessionTitle || 'Session')}
                                                        disabled={reopeningId === s.id}
                                                    >
                                                        {reopeningId === s.id ? 'Loading...' : 'Reopen'}
                                                    </button>
                                                )}
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
                            <br/>This will only clear "absent" records for late students.
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
            {/* Submissions Modal */}
            {showSubmissions && (
                <div className="modal-overlay" onClick={() => setShowSubmissions(null)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Submissions: {showSubmissions.title}</h3>
                            <button className="modal-close" onClick={() => setShowSubmissions(null)}>×</button>
                        </div>
                        <div className="data-table-wrapper">
                            <table className="data-table">
                                <thead><tr><th>Student</th><th>Date</th><th>File</th><th>Grade</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {submissions.map(s => (
                                        <tr key={s.id}>
                                            <td>{s.student?.firstName} {s.student?.lastName}</td>
                                            <td>{new Date(s.submittedAt).toLocaleString()}</td>
                                            <td>{s.fileName ? <a href={`/${s.filePath}`} target="_blank" rel="noreferrer">📄 {s.fileName}</a> : '—'}</td>
                                            <td>{s.grade || 'Not graded'}</td>
                                            <td>
                                                <button className="btn btn-secondary btn-sm" onClick={() => setGradingSub(s)}>Grade</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Grading Modal */}
            {gradingSub && (
                <div className="modal-overlay" onClick={() => setGradingSub(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3 className="modal-title">Grade Submission</h3><button className="modal-close" onClick={() => setGradingSub(null)}>×</button></div>
                        <form onSubmit={gradeSubmission}>
                            <div className="form-group"><label className="form-label">Grade</label><input className="form-input" value={gradingSub.grade || ''} onChange={e => setGradingSub({ ...gradingSub, grade: e.target.value })} required /></div>
                            <div className="form-group"><label className="form-label">Feedback</label><textarea className="form-input" value={gradingSub.feedback || ''} onChange={e => setGradingSub({ ...gradingSub, feedback: e.target.value })} /></div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setGradingSub(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Save Grade</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default TeacherCourseDetail;
