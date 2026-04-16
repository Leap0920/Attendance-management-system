import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Avatar from '../../components/Avatar';
import { studentApi, fileApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { showAlert, showApiError } from '../../utils/feedback';

/* ── Helpers ─────────────────────────────────────────────────── */
const getYouTubeId = (url: string): string | null => {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
};

const downloadFile = async (type: 'material' | 'submission', id: number, fileName: string) => {
    try {
        const res = type === 'material' ? await fileApi.downloadMaterial(id) : await fileApi.downloadSubmission(id);
        const blob = new Blob([res.data]);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName || 'download';
        a.click();
        URL.revokeObjectURL(a.href);
    } catch { showAlert('Error', 'Could not download file', 'error'); }
};

const typeColors: Record<string, string> = { file: '#4285F4', link: '#8b5cf6', announcement: '#f59e0b', assignment: '#EA4335' };

const TypeIcon = ({ type }: { type: string }) => {
    const s = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
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
            <iframe src={`https://www.youtube.com/embed/${ytId}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Video" />
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
                {fileSize ? (fileSize > 1048576 ? `${(fileSize / 1048576).toFixed(1)} MB` : `${Math.round(fileSize / 1024)} KB`) : 'File'} · Click to download
            </div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    </div>
);

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */
const StudentCourseDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'stream' | 'history'>('stream');

    // Detail view
    const [detail, setDetail] = useState<any | null>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [mySubmission, setMySubmission] = useState<any | null>(null);
    const [submitFile, setSubmitFile] = useState<File | null>(null);
    const [submitContent, setSubmitContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [privateComment, setPrivateComment] = useState('');
    const [showStudentsPanel, setShowStudentsPanel] = useState(false);

    const load = () => {
        studentApi.getCourse(Number(id)).then(res => {
            setData(res.data.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    useEffect(() => { load(); }, [id]);

    const openDetail = async (m: any) => {
        setDetail(m);
        setNewComment('');
        setPrivateComment('');
        setSubmitFile(null);
        setSubmitContent('');
        try { const r = await studentApi.getComments(m.id); setComments(r.data.data || []); } catch {}
        if (m.type === 'assignment') {
            try { const r = await studentApi.getSubmission(m.id); setMySubmission(r.data.data || null); } catch { setMySubmission(null); }
        } else { setMySubmission(null); }
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !detail) return;
        try {
            await studentApi.addComment(detail.id, { content: newComment.trim(), isPrivate: false });
            setNewComment('');
            const r = await studentApi.getComments(detail.id);
            setComments(r.data.data || []);
        } catch (err: any) { showApiError(err); }
    };

    const handlePrivateComment = async () => {
        if (!privateComment.trim() || !detail) return;
        try {
            await studentApi.addComment(detail.id, { content: privateComment.trim(), isPrivate: true });
            setPrivateComment('');
            const r = await studentApi.getComments(detail.id);
            setComments(r.data.data || []);
        } catch (err: any) { showApiError(err); }
    };

    const handleSubmit = async () => {
        if (!detail || submitting) return;
        if (!submitFile && !submitContent.trim()) { showAlert('Error', 'Attach a file or write something', 'error'); return; }
        setSubmitting(true);
        const fd = new FormData();
        fd.append('materialId', detail.id.toString());
        if (submitContent.trim()) fd.append('content', submitContent.trim());
        if (submitFile) fd.append('file', submitFile);
        try {
            await studentApi.submitHomework(fd);
            showAlert('Success', 'Assignment submitted!');
            const r = await studentApi.getSubmission(detail.id);
            setMySubmission(r.data.data || null);
            setSubmitFile(null);
            setSubmitContent('');
        } catch (err: any) { showApiError(err); } finally { setSubmitting(false); }
    };

    if (loading) return <DashboardLayout role="student"><div className="loading-screen"><div className="spinner"></div></div></DashboardLayout>;
    if (!data) return <DashboardLayout role="student"><p>Course not found</p></DashboardLayout>;

    const { course, materials = [], attendanceRecords = [], enrollments = [] } = data;
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter((r: any) => r.status === 'present').length;
    const late = attendanceRecords.filter((r: any) => r.status === 'late').length;
    const absent = attendanceRecords.filter((r: any) => r.status === 'absent').length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 100;

    /* ── Detail Modal ─────────────────────────────────────── */
    const renderDetail = () => {
        if (!detail) return null;
        const m = detail;
        const isAssignment = m.type === 'assignment';
        const tc = typeColors[m.type] || '#4285F4';

        return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(6px)' }} onClick={() => setDetail(null)} />
                <div style={{
                    position: 'relative', zIndex: 1, background: '#fff', width: '100%', maxWidth: isAssignment ? 1100 : 780,
                    borderRadius: 20, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.18)', animation: 'modalIn .25s ease-out'
                }}>
                    {/* Header */}
                    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: tc, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                            <TypeIcon type={m.type} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{m.title}</h2>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
                                <span>{m.teacher?.firstName} {m.teacher?.lastName}</span>
                                <span>·</span>
                                <span>{new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                {isAssignment && m.dueDate && <>
                                    <span>·</span>
                                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, background: new Date(m.dueDate) < new Date() ? '#fef2f2' : '#f0fdf4', color: new Date(m.dueDate) < new Date() ? '#dc2626' : '#16a34a' }}>
                                        Due {new Date(m.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                </>}
                            </div>
                        </div>
                        <button onClick={() => setDetail(null)} style={{ border: 'none', background: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#94a3b8' }}>×</button>
                    </div>

                    {/* Body */}
                    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: isAssignment ? 'row' : 'column' }}>
                        {/* Main content */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: isAssignment ? '1px solid #f1f5f9' : 'none' }}>
                            <div style={{ padding: '1.5rem', flex: 1, overflow: 'auto' }}>
                                {m.description && <div style={{ fontSize: '0.92rem', color: '#334155', lineHeight: 1.75, whiteSpace: 'pre-wrap', marginBottom: '1.25rem' }}>{m.description}</div>}

                                {m.type === 'link' && m.externalLink && <VideoPreview url={m.externalLink} />}
                                {m.type === 'link' && m.externalLink && (
                                    <a href={m.externalLink} target="_blank" rel="noopener noreferrer" style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', textDecoration: 'none', color: 'inherit', marginBottom: '1.25rem'
                                    }}>
                                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                        </div>
                                        <div style={{ overflow: 'hidden', flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Open link</div>
                                            <div style={{ fontSize: '0.78rem', color: '#3b82f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.externalLink}</div>
                                        </div>
                                    </a>
                                )}

                                {m.fileName && <FileCard fileName={m.fileName} fileSize={m.fileSize} onDownload={() => downloadFile('material', m.id, m.fileName)} />}

                                {/* Class comments */}
                                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '1rem', color: '#334155' }}>
                                        Class comments ({comments.filter(c => !c.isPrivate).length})
                                    </h4>
                                    {comments.filter(c => !c.isPrivate).length === 0 && <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '1rem' }}>No comments yet</p>}
                                    {comments.filter(c => !c.isPrivate).map((c: any) => {
                                        const isTeacher = (c.user?.role || '').toLowerCase().includes('teacher');
                                        return (
                                            <div key={c.id} style={{ display: 'flex', gap: '0.65rem', marginBottom: '0.85rem', padding: '0.65rem', borderRadius: 10, background: isTeacher ? '#eff6ff' : '#f8fafc', border: '1px solid #e2e8f0' }}>
                                                <Avatar
                                                    firstName={c.user?.firstName}
                                                    lastName={c.user?.lastName}
                                                    avatarUrl={c.user?.avatarUrl}
                                                    size={30}
                                                    variant={isTeacher ? 'blue' : 'green'}
                                                />
                                                <div>
                                                    <div style={{ fontSize: '0.78rem', display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                        <strong>{c.user?.firstName} {c.user?.lastName}</strong>
                                                        {isTeacher && <span style={{ fontSize: '0.62rem', background: '#dbeafe', color: '#1d4ed8', borderRadius: 999, padding: '1px 6px', fontWeight: 700 }}>Professor</span>}
                                                        <span style={{ color: '#94a3b8' }}>{new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: 2 }}>{c.content}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Comment input */}
                            <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0, background: '#fff' }}>
                                <Avatar firstName={user?.firstName} lastName={user?.lastName} size={30} variant="green" />
                                <input className="form-input" style={{ borderRadius: 20, flex: 1, padding: '0.45rem 1rem', fontSize: '0.82rem' }}
                                    placeholder="Add a class comment…" value={newComment} onChange={e => setNewComment(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddComment(); } }} />
                                <button className="btn btn-primary btn-sm" style={{ width: 'auto', borderRadius: 20, padding: '0.4rem 1rem' }}
                                    onClick={handleAddComment} disabled={!newComment.trim()}>Post</button>
                            </div>
                        </div>

                        {/* Assignment sidebar */}
                        {isAssignment && (
                            <div style={{ width: 340, flexShrink: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: '1.5rem', flex: 1 }}>
                                    <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '1rem', color: '#334155' }}>Your work</h4>

                                    {mySubmission ? (
                                        <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: 14, border: '1px solid #bbf7d0' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <span style={{ fontWeight: 600, color: '#16a34a', fontSize: '0.88rem' }}>
                                                    {mySubmission.status === 'graded' ? '✅ Graded' : '📤 Submitted'}
                                                </span>
                                                {mySubmission.grade && (
                                                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '2px 10px', borderRadius: 6 }}>
                                                        {mySubmission.grade}/100
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                                {new Date(mySubmission.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                            {mySubmission.fileName && <FileCard fileName={mySubmission.fileName} fileSize={mySubmission.fileSize} onDownload={() => downloadFile('submission', mySubmission.id, mySubmission.fileName)} />}
                                            {mySubmission.content && <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#334155' }}>{mySubmission.content}</div>}
                                            {mySubmission.feedback && (
                                                <div style={{ marginTop: '0.75rem', padding: '0.7rem', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                                    <strong style={{ fontSize: '0.78rem', color: '#64748b' }}>Teacher Feedback:</strong>
                                                    <div style={{ fontSize: '0.85rem', marginTop: 3 }}>{mySubmission.feedback}</div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0', marginBottom: '0.75rem' }}>
                                                <textarea className="form-input" rows={3} placeholder="Add a text response (optional)…"
                                                    value={submitContent} onChange={e => setSubmitContent(e.target.value)}
                                                    style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }} />
                                                <label style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.85rem',
                                                    border: '2px dashed #cbd5e1', borderRadius: 10, cursor: 'pointer', color: '#64748b', fontSize: '0.82rem',
                                                    background: submitFile ? '#eff6ff' : 'transparent', transition: 'all 0.15s'
                                                }}>
                                                    <input type="file" style={{ display: 'none' }} onChange={e => setSubmitFile(e.target.files?.[0] || null)} />
                                                    {submitFile ? <span style={{ color: '#3b82f6', fontWeight: 600 }}>📎 {submitFile.name}</span> : '📎 Attach file'}
                                                </label>
                                            </div>
                                            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} style={{ width: '100%', borderRadius: 10 }}>
                                                {submitting ? 'Submitting…' : 'Submit'}
                                            </button>
                                        </div>
                                    )}

                                    {/* Private comments */}
                                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: '1.25rem' }}>
                                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>🔒 Private comments</h4>
                                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>Only visible to you and your teacher</p>

                                        {comments.filter(c => c.isPrivate).length === 0 && <p style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.75rem', fontStyle: 'italic' }}>No private messages yet</p>}
                                        {comments.filter(c => c.isPrivate).map((c: any) => {
                                            const isTeacher = (c.user?.role || '').toLowerCase().includes('teacher');
                                            return (
                                                <div key={c.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.65rem', padding: '0.5rem 0.65rem', background: '#fef2f2', borderRadius: 10 }}>
                                                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: isTeacher ? '#ef4444' : '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.58rem', fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
                                                        {c.user?.avatarUrl ? <img src={c.user.avatarUrl} alt="avatar" className="avatar-image" /> : <>{c.user?.firstName?.[0]}{c.user?.lastName?.[0]}</>}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                            <strong>{c.user?.firstName}</strong>
                                                            {isTeacher && <span style={{ fontSize: '0.6rem', background: '#fee2e2', color: '#b91c1c', borderRadius: 999, padding: '1px 6px' }}>Professor</span>}
                                                            <span style={{ color: '#94a3b8' }}>{new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                        </div>
                                                        <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: 1 }}>{c.content}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                                            <input className="form-input" style={{ borderRadius: 20, flex: 1, padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                                placeholder="Message your teacher…" value={privateComment} onChange={e => setPrivateComment(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handlePrivateComment(); } }} />
                                            <button className="btn btn-primary btn-sm" style={{ width: 'auto', borderRadius: 20, padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}
                                                onClick={handlePrivateComment} disabled={!privateComment.trim()}>Send</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    /* ═══════════════════════════════════════════════════════════
       Main Render
       ═══════════════════════════════════════════════════════════ */
    return (
        <DashboardLayout role="student">
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
                            <div className="sidebar-avatar" style={{ width: 30, height: 30, fontSize: '0.65rem', overflow: 'hidden' }}>
                                {e.student?.avatarUrl ? <img src={e.student.avatarUrl} alt="avatar" className="avatar-image" /> : <>{e.student?.firstName?.[0]}{e.student?.lastName?.[0]}</>}
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
                    )) : <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.25rem 0.5rem' }}>No classmates found.</p>}
                </div>
            </div>

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
                <button className={`tab-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>History</button>
            </div>

            {tab === 'stream' && (
                <div className="classroom-stream">
                    {materials.length > 0 ? materials.map((m: any) => {
                        const isExpanded = m.type === 'announcement' || m.type === 'link';
                        const tc = typeColors[m.type] || '#4285F4';

                        return (
                            <div key={m.id} className="stream-item" style={{ cursor: 'pointer' }} onClick={() => openDetail(m)}>
                                {isExpanded ? (
                                    <>
                                        <div className="stream-header">
                                            <div className="stream-avatar" style={{ background: tc }}>{m.teacher?.firstName?.[0]}{m.teacher?.lastName?.[0]}</div>
                                            <div className="stream-info">
                                                <div className="stream-author">{m.teacher?.firstName} {m.teacher?.lastName}</div>
                                                <div className="stream-date">{new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                                            </div>
                                        </div>
                                        <div className="stream-content">
                                            {m.title && <div style={{ fontWeight: 600, marginBottom: 4 }}>{m.title}</div>}
                                            {m.description && <div style={{ color: '#64748b', marginBottom: 8, fontSize: '0.88rem' }}>{m.description}</div>}
                                            {m.type === 'link' && m.externalLink && <VideoPreview url={m.externalLink} />}
                                            {m.type === 'link' && m.externalLink && (
                                                <a href={m.externalLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#3b82f6', textDecoration: 'none' }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 350 }}>{m.externalLink}</span>
                                                </a>
                                            )}
                                        </div>
                                        <div className="comment-input-area">
                                            <div className="comment-avatar">S</div>
                                            <button className="comment-trigger" onClick={e => { e.stopPropagation(); openDetail(m); }}>Add class comment</button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="stream-item-material">
                                        <div className="material-badge" style={{ background: tc }}>
                                            <TypeIcon type={m.type} />
                                        </div>
                                        <div className="stream-info" style={{ flex: 1 }}>
                                            <h4 style={{ margin: 0, fontSize: '0.9rem' }}>{m.teacher?.firstName} {m.teacher?.lastName} posted a new {m.type}: {m.title}</h4>
                                            <p style={{ margin: '4px 0 0', display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.78rem', color: '#94a3b8' }}>
                                                {new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                {m.type === 'assignment' && m.dueDate && (
                                                    <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600, background: new Date(m.dueDate) < new Date() ? '#fef2f2' : '#fffbeb', color: new Date(m.dueDate) < new Date() ? '#dc2626' : '#d97706' }}>
                                                        Due {new Date(m.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                )}
                                                {m.fileName && <span>📎 {m.fileName}</span>}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    }) : (
                        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📭</div>
                            <h3 style={{ fontWeight: 600, marginBottom: '0.35rem' }}>No materials yet</h3>
                            <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Materials will appear here when your teacher shares them.</p>
                        </div>
                    )}
                </div>
            )}

            {tab === 'history' && (
                <>
                    <div className="stats-grid">
                        <div className="stat-card green"><div className="stat-value">{present}</div><div className="stat-label">Present</div></div>
                        <div className="stat-card yellow"><div className="stat-value">{late}</div><div className="stat-label">Late</div></div>
                        <div className="stat-card red"><div className="stat-value">{absent}</div><div className="stat-label">Absent</div></div>
                        <div className="stat-card blue"><div className="stat-value">{rate}%</div><div className="stat-label">Attendance Rate</div></div>
                    </div>

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

            {/* Detail Modal */}
            {detail && renderDetail()}
        </DashboardLayout>
    );
};

export default StudentCourseDetail;
