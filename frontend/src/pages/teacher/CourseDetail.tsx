import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Avatar from '../../components/Avatar';
import { teacherApi, fileApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { showAlert, showConfirm, showApiError } from '../../utils/feedback';

const getYouTubeId = (url: string): string | null => {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
};

const downloadFile = async (type: 'material' | 'submission', id: number, fileName: string) => {
    try {
        const res = type === 'material'
            ? await fileApi.downloadMaterial(id)
            : await fileApi.downloadSubmission(id);
        const blob = new Blob([res.data]);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName || 'download';
        a.click();
        URL.revokeObjectURL(a.href);
    } catch { showAlert('Error', 'Could not download file', 'error'); }
};

const typeConfig: Record<string, { color: string; bg: string; label: string }> = {
    file:         { color: '#4285F4', bg: '#eff6ff', label: 'Material' },
    link:         { color: '#8b5cf6', bg: '#f5f3ff', label: 'Link' },
    announcement: { color: '#f59e0b', bg: '#fffbeb', label: 'Announcement' },
    assignment:   { color: '#EA4335', bg: '#fef2f2', label: 'Assignment' },
};

const TypeIcon = ({ type, size = 20 }: { type: string; size?: number }) => {
    const s = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    if (type === 'file') return <svg {...s}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
    if (type === 'link') return <svg {...s}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
    if (type === 'assignment') return <svg {...s}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>;
    return <svg {...s}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
};

const VideoPreview = ({ url }: { url: string }) => {
    const ytId = getYouTubeId(url);
    if (!ytId) return null;
    return (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 12, overflow: 'hidden', marginBottom: '1rem', background: '#000' }}>
            <iframe
                src={`https://www.youtube.com/embed/${ytId}`}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen title="Video preview"
            />
        </div>
    );
};

const FileCard = ({ fileName, fileSize, onDownload }: { fileName: string; fileSize?: number; onDownload: () => void }) => (
    <div onClick={e => { e.stopPropagation(); onDownload(); }} style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
        background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', cursor: 'pointer',
        transition: 'all 0.15s', marginBottom: '0.5rem'
    }} onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')} onMouseLeave={e => (e.currentTarget.style.background = '#f8fafc')}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {fileSize ? (fileSize > 1048576 ? `${(fileSize / 1048576).toFixed(1)} MB` : `${Math.round(fileSize / 1024)} KB`) : 'File'}
            </div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    </div>
);

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
    const { user } = useAuth();
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
    const [expandedThreads, setExpandedThreads] = useState<Record<number, boolean>>({});
    const [showStudentsPanel, setShowStudentsPanel] = useState(false);
    const [detail, setDetail] = useState<any>(null);
    const [showForward, setShowForward] = useState<number | null>(null);
    const [forwardCourses, setForwardCourses] = useState<number[]>([]);

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

    const openDetail = async (material: any) => {
        setDetail(material);
        if (material.type === 'assignment') {
            teacherApi.getSubmissions(material.id).then(res => setSubmissions(res.data.data || []));
        }
    };

    const handleForward = async () => {
        if (!showForward || forwardCourses.length === 0 || posting) return;
        setPosting(true);
        try {
            await teacherApi.shareMaterial(showForward, forwardCourses.join(','));
            setShowForward(null);
            setForwardCourses([]);
            showAlert('Success', 'Material shared with other courses');
        } catch (err: any) { showApiError(err); } finally { setPosting(false); }
    };

    const handleDeleteMaterial = (mid: number) => {
        showConfirm('Delete', 'Are you sure you want to delete this post?', async () => {
            try {
                await teacherApi.deleteMaterial(mid);
                setDetail(null);
                load();
                showAlert('Deleted', 'Post removed', 'error');
            } catch (err: any) { showApiError(err); }
        });
    };

    const gradeSubmission = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await teacherApi.gradeSubmission(gradingSub.id, { grade: gradingSub.grade, feedback: gradingSub.feedback });
            setGradingSub(null);
            teacherApi.getSubmissions(detail.id).then(res => setSubmissions(res.data.data || []));
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
            <button
                className="btn btn-primary"
                onClick={() => setShowStudentsPanel(prev => !prev)}
                style={{
                    position: 'fixed',
                    right: showStudentsPanel ? 330 : 18,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 'auto',
                    zIndex: 50,
                    borderRadius: 999,
                    padding: '0.45rem 0.9rem',
                    transition: 'right 0.2s ease'
                }}
            >
                {showStudentsPanel ? 'Hide Students' : `Students (${enrollments?.length || 0})`}
            </button>

            <div
                style={{
                    position: 'fixed',
                    top: 90,
                    right: 0,
                    bottom: 16,
                    width: 320,
                    background: '#fff',
                    borderLeft: '1px solid var(--border-glass)',
                    boxShadow: '-8px 0 20px rgba(15,23,42,0.08)',
                    transform: showStudentsPanel ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.2s ease',
                    zIndex: 45,
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <div style={{ padding: '0.9rem 1rem', borderBottom: '1px solid var(--border-glass)', fontWeight: 700 }}>
                    Student List
                </div>
                <div style={{ padding: '0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {enrollments?.length > 0 ? enrollments.map((e: any) => (
                        <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.6rem', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            <div className="sidebar-avatar" style={{ width: 30, height: 30, fontSize: '0.65rem' }}>
                                {e.student?.firstName?.[0]}{e.student?.lastName?.[0]}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {e.student?.firstName} {e.student?.lastName}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                    {e.student?.studentId || 'No student ID'}
                                </div>
                            </div>
                        </div>
                    )) : <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.25rem 0.5rem' }}>No students enrolled yet.</p>}
                </div>
            </div>

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
                            <div onClick={() => openDetail(m)} style={{ cursor: 'pointer' }}>
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
                                            <div style={{ whiteSpace: 'pre-wrap', color: '#334155' }}>{m.description}</div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="stream-item-material">
                                        <div className="material-badge" style={{ background: typeConfig[m.type]?.bg || '#f1f5f9', color: typeConfig[m.type]?.color || '#64748b' }}>
                                            <TypeIcon type={m.type} />
                                        </div>
                                        <div className="stream-info" style={{ flex: 1 }}>
                                            <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{m.teacher?.firstName} {m.teacher?.lastName} posted a new {m.type}: {m.title}</h4>
                                            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                                        </div>
                                        {m.type === 'assignment' && (
                                            <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); openDetail(m); }}>Submissions</button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Comments Section */}
                            <div className="comments-section" style={{ borderTop: '1px solid #f1f5f9', marginTop: '1rem', paddingTop: '1rem' }}>
                                {(expandedThreads[m.id] ? comments[m.id] : comments[m.id]?.slice(0, 2))?.map((c: any) => (
                                    <div key={c.id} className="comment-item" style={{ display: 'flex', gap: '0.65rem', marginBottom: '0.85rem' }}>
                                        <Avatar firstName={c.user?.firstName} lastName={c.user?.lastName} size={30} variant={c.isPrivate ? 'green' : 'blue'} style={c.isPrivate ? { background: 'var(--accent-red)' } : {}} />
                                        <div className="comment-body" style={{ flex: 1, fontSize: '0.85rem' }}>
                                            <div className="comment-meta" style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginBottom: '2px' }}>
                                                <strong style={{ fontWeight: 600 }}>{c.user?.firstName} {c.user?.lastName}</strong> 
                                                <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                {c.isPrivate && <span className="pvt-tag" style={{ fontSize: '0.6rem', padding: '1px 6px', background: '#fee2e2', color: '#b91c1c', borderRadius: 999 }}>Private</span>}
                                            </div>
                                            <div className="comment-text" style={{ color: '#334155' }}>{c.content}</div>
                                        </div>
                                    </div>
                                ))}
                                {comments[m.id]?.length > 2 && !expandedThreads[m.id] && (
                                    <button 
                                        onClick={() => setExpandedThreads(prev => ({ ...prev, [m.id]: true }))}
                                        style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: '0.85rem' }}
                                    >
                                        See {comments[m.id].length - 2} More Comments
                                    </button>
                                )}
                                <div className="comment-input-area" style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', marginTop: '0.5rem' }}>
                                    <Avatar firstName={user?.firstName} lastName={user?.lastName} size={30} />
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
            {/* Material Detail Modal */}
            {detail && (
                <div className="modal-overlay" onClick={() => setDetail(null)}>
                    <div className={`modal ${detail.type === 'assignment' ? 'modal-xl' : 'modal-lg'}`} 
                         onClick={e => e.stopPropagation()} 
                         style={{ maxWidth: detail.type === 'assignment' ? 1100 : 780, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: typeConfig[detail.type]?.color || '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                <TypeIcon type={detail.type} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{detail.title}</h3>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                                    {detail.teacher?.firstName} {detail.teacher?.lastName} • {new Date(detail.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn-icon" title="Forward" onClick={() => setShowForward(detail.id)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/></svg></button>
                                <button className="btn-icon" title="Delete" onClick={() => handleDeleteMaterial(detail.id)} style={{ color: 'var(--accent-red)' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                                <button className="modal-close" onClick={() => setDetail(null)} style={{ position: 'static' }}>×</button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                                {detail.description && <div style={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#334155', marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>{detail.description}</div>}
                                {detail.externalLink && <VideoPreview url={detail.externalLink} />}
                                {detail.fileName && <FileCard fileName={detail.fileName} fileSize={detail.fileSize} onDownload={() => downloadFile('material', detail.id, detail.fileName)} />}
                                {detail.externalLink && !getYouTubeId(detail.externalLink) && (
                                    <a href={detail.externalLink} target="_blank" rel="noreferrer" className="link-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', textDecoration: 'none', color: 'inherit' }}>
                                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                        </div>
                                        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, fontSize: '0.85rem' }}>{detail.externalLink}</div>
                                    </a>
                                )}

                                <div style={{ marginTop: '2.5rem' }}>
                                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '1rem' }}>Class Comments</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {comments[detail.id]?.map((c: any) => (
                                            <div key={c.id} style={{ display: 'flex', gap: '0.75rem' }}>
                                                <Avatar firstName={c.user?.firstName} lastName={c.user?.lastName} size={32} />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2px' }}>
                                                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.user?.firstName} {c.user?.lastName}</span>
                                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.88rem', color: '#334155' }}>{c.content}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {detail.type === 'assignment' && (
                                <div style={{ width: 420, background: '#f8fafc', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Students</h4>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>{submissions.length} Turned-in</span>
                                            <span style={{ fontSize: '0.7rem', background: '#e2e8f0', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{data.enrollments?.length || 0} Total</span>
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, overflowY: 'auto' }}>
                                        {data.enrollments?.length === 0 ? (
                                            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                                                <p style={{ fontSize: '0.85rem' }}>No alternate students enrolled.</p>
                                            </div>
                                        ) : (
                                            data.enrollments?.map((e: any) => {
                                                const s = submissions.find(x => x.student?.id === e.student?.id);
                                                const isGrading = gradingSub?.id === s?.id;
                                                return (
                                                    <div key={e.id} style={{ 
                                                        padding: '1rem 1.25rem', 
                                                        borderBottom: '1px solid #f1f5f9', 
                                                        background: isGrading ? '#eff6ff' : 'transparent',
                                                        transition: 'all 0.15s'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: s ? '0.75rem' : 0 }}>
                                                            <Avatar firstName={e.student?.firstName} lastName={e.student?.lastName} size={32} />
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{e.student?.firstName} {e.student?.lastName}</div>
                                                                {s ? (
                                                                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                                                        {s.status === 'graded' ? <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>Graded</span> : <span style={{ color: '#3b82f6', fontWeight: 700 }}>Turned in</span>}
                                                                        {" • "}{new Date(s.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Assigned</div>
                                                                )}
                                                            </div>
                                                            {s?.grade && <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-green)' }}>{s.grade}/100</span>}
                                                        </div>
                                                        
                                                        {s && (
                                                            <div style={{ marginTop: '0.5rem' }}>
                                                                {s.fileName && (
                                                                    <div onClick={() => downloadFile('submission', s.id, s.fileName)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', cursor: 'pointer', marginBottom: '0.5rem' }}>
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                                                        <div style={{ flex: 1, fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.fileName}</div>
                                                                    </div>
                                                                )}
                                                                {s.content && <div style={{ fontSize: '0.8rem', color: '#334155', background: '#fff', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>{s.content}</div>}
                                                                <button className="btn btn-secondary btn-sm" style={{ width: '100%', height: '32px' }} onClick={() => setGradingSub(s)}>
                                                                    {s.status === 'graded' ? 'Edit Grade' : 'Grade'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Forward Modal */}
            {showForward && (
                <div className="modal-overlay" onClick={() => setShowForward(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3 className="modal-title">Share to other courses</h3><button className="modal-close" onClick={() => setShowForward(null)}>×</button></div>
                        <div style={{ padding: '1.5rem' }}>
                            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>Select which courses to share this content with:</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                {courses.filter(c => c.id !== Number(id)).map(c => (
                                    <label key={c.id} className={`chip-select ${forwardCourses.includes(c.id) ? 'selected' : ''}`}>
                                        <input type="checkbox" checked={forwardCourses.includes(c.id)} onChange={e => {
                                            setForwardCourses(prev => e.target.checked ? [...prev, c.id] : prev.filter(x => x !== c.id));
                                        }} style={{ display: 'none' }} />
                                        {c.courseCode} {c.section}
                                    </label>
                                ))}
                            </div>
                            <div className="modal-actions">
                                <button className="btn btn-secondary" onClick={() => setShowForward(null)}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleForward} disabled={posting || forwardCourses.length === 0}>{posting ? 'Sharing...' : 'Share Now'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Grading Modal */}
            {gradingSub && (
                <div className="modal-overlay" onClick={() => setGradingSub(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ zIndex: 2000 }}>
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
