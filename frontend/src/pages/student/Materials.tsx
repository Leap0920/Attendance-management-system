import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { studentApi, fileApi } from '../../api';
import { showAlert, showApiError } from '../../utils/feedback';

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════
   Video Preview
   ═══════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════
   File Card (downloadable)
   ═══════════════════════════════════════════════════════════════ */
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
const StudentMaterials: React.FC = () => {
    const [courses, setCourses] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
    const [typeFilter, setTypeFilter] = useState('');

    // Detail
    const [detail, setDetail] = useState<any | null>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');

    // Assignment submission
    const [mySubmission, setMySubmission] = useState<any | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitFile, setSubmitFile] = useState<File | null>(null);
    const [submitContent, setSubmitContent] = useState('');

    // Private comment (only in assignment detail)
    const [privateComment, setPrivateComment] = useState('');

    /* ── Data ──────────────────────────────────────────────── */
    useEffect(() => {
        studentApi.getCourses().then(r => {
            const data = r.data.data || [];
            const courseList = data.map((d: any) => d.course);
            setCourses(courseList);
            if (courseList.length > 0) setSelectedCourse(courseList[0].id);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (selectedCourse) studentApi.getMaterials(selectedCourse).then(r => setMaterials(r.data.data || [])).catch(() => {});
    }, [selectedCourse]);

    const filtered = typeFilter ? materials.filter(m => m.type === typeFilter) : materials;

    const openDetail = async (m: any) => {
        setDetail(m);
        setSubmitFile(null);
        setSubmitContent('');
        setNewComment('');
        setPrivateComment('');
        try { const r = await studentApi.getComments(m.id); setComments(r.data.data || []); } catch {}
        if (m.type === 'assignment') {
            try { const r = await studentApi.getSubmission(m.id); setMySubmission(r.data.data || null); } catch { setMySubmission(null); }
        } else { setMySubmission(null); }
    };

    /* ── Comments (class-level, no private) ─────────────── */
    const handleAddComment = async () => {
        if (!newComment.trim() || !detail) return;
        try {
            await studentApi.addComment(detail.id, { content: newComment.trim(), isPrivate: false });
            setNewComment('');
            const r = await studentApi.getComments(detail.id);
            setComments(r.data.data || []);
        } catch (err: any) { showApiError(err); }
    };

    /* ── Private comment (assignment only) ──────────────── */
    const handlePrivateComment = async () => {
        if (!privateComment.trim() || !detail) return;
        try {
            await studentApi.addComment(detail.id, { content: privateComment.trim(), isPrivate: true });
            setPrivateComment('');
            const r = await studentApi.getComments(detail.id);
            setComments(r.data.data || []);
        } catch (err: any) { showApiError(err); }
    };

    /* ── Submit ─────────────────────────────────────────── */
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

    /* ══════════════════════════════════════════════════════════
       DETAIL VIEW
       ══════════════════════════════════════════════════════════ */
    const renderDetail = () => {
        if (!detail) return null;
        const m = detail;
        const tc = typeConfig[m.type] || typeConfig.file;
        const isAssignment = m.type === 'assignment';

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
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: tc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                            <TypeIcon type={m.type} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, lineHeight: 1.3 }}>{m.title}</h2>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
                                <span>{m.teacher?.firstName} {m.teacher?.lastName}</span>
                                <span>·</span>
                                <span>{new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                {isAssignment && m.dueDate && <>
                                    <span>·</span>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
                                        background: new Date(m.dueDate) < new Date() ? '#fef2f2' : '#f0fdf4',
                                        color: new Date(m.dueDate) < new Date() ? '#dc2626' : '#16a34a'
                                    }}>Due {new Date(m.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} {new Date(m.dueDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                                </>}
                            </div>
                        </div>
                        <button onClick={() => setDetail(null)} style={{ border: 'none', background: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>×</button>
                    </div>

                    {/* Body */}
                    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: isAssignment ? 'row' : 'column' }}>
                        {/* Left / main content */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: isAssignment ? '1px solid #f1f5f9' : 'none' }}>
                            <div style={{ padding: '1.5rem', flex: 1, overflow: 'auto' }}>
                                {m.description && <div style={{ fontSize: '0.92rem', color: '#334155', lineHeight: 1.75, whiteSpace: 'pre-wrap', marginBottom: '1.25rem' }}>{m.description}</div>}

                                {/* YouTube preview */}
                                {m.type === 'link' && m.externalLink && <VideoPreview url={m.externalLink} />}

                                {/* Link */}
                                {m.type === 'link' && m.externalLink && (
                                    <a href={m.externalLink} target="_blank" rel="noopener noreferrer" style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                                        background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0',
                                        textDecoration: 'none', color: 'inherit', marginBottom: '1.25rem'
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

                                {/* File download */}
                                {m.fileName && <FileCard fileName={m.fileName} fileSize={m.fileSize} onDownload={() => downloadFile('material', m.id, m.fileName)} />}

                                {/* Class comments */}
                                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '1rem', color: '#334155' }}>
                                        Class comments ({comments.filter(c => !c.isPrivate).length})
                                    </h4>
                                    {comments.filter(c => !c.isPrivate).length === 0 && <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '1rem' }}>No comments yet</p>}
                                    {comments.filter(c => !c.isPrivate).map((c: any) => (
                                        <div key={c.id} style={{ display: 'flex', gap: '0.65rem', marginBottom: '0.85rem' }}>
                                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: c.user?.role === 'ROLE_TEACHER' ? 'var(--gradient-primary)' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>
                                                {c.user?.firstName?.[0]}{c.user?.lastName?.[0]}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.78rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                    <strong>{c.user?.firstName} {c.user?.lastName}</strong>
                                                    <span style={{ color: '#94a3b8' }}>{new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: 2 }}>{c.content}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Comment input — class-level only */}
                            <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0, background: '#fff' }}>
                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>S</div>
                                <input className="form-input" style={{ borderRadius: 20, flex: 1, padding: '0.45rem 1rem', fontSize: '0.82rem' }}
                                    placeholder="Add a class comment…" value={newComment} onChange={e => setNewComment(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddComment(); } }} />
                                <button className="btn btn-primary btn-sm" style={{ width: 'auto', borderRadius: 20, padding: '0.4rem 1rem' }}
                                    onClick={handleAddComment} disabled={!newComment.trim()}>Post</button>
                            </div>
                        </div>

                        {/* Right sidebar: assignment submission + private comments */}
                        {isAssignment && (
                            <div style={{ width: 340, flexShrink: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                                {/* Submission area */}
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
                                            {mySubmission.fileName && (
                                                <FileCard fileName={mySubmission.fileName} fileSize={mySubmission.fileSize}
                                                    onDownload={() => downloadFile('submission', mySubmission.id, mySubmission.fileName)} />
                                            )}
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
                                            {m.dueDate && new Date(m.dueDate) < new Date() && (
                                                <p style={{ fontSize: '0.75rem', color: '#ef4444', textAlign: 'center', marginTop: '0.5rem', fontWeight: 600 }}>⚠ Past due</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Private comments — assignment only */}
                                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: '1.25rem' }}>
                                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            🔒 Private comments
                                        </h4>
                                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>Only visible to you and your teacher</p>

                                        {comments.filter(c => c.isPrivate).length === 0 && (
                                            <p style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.75rem', fontStyle: 'italic' }}>No private messages yet</p>
                                        )}

                                        {comments.filter(c => c.isPrivate).map((c: any) => (
                                            <div key={c.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.65rem', padding: '0.5rem 0.65rem', background: '#fef2f2', borderRadius: 10 }}>
                                                <div style={{ width: 26, height: 26, borderRadius: '50%', background: c.user?.role === 'ROLE_TEACHER' ? '#ef4444' : '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.58rem', fontWeight: 700, flexShrink: 0 }}>
                                                    {c.user?.firstName?.[0]}{c.user?.lastName?.[0]}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.72rem' }}><strong>{c.user?.firstName}</strong> <span style={{ color: '#94a3b8' }}>{new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></div>
                                                    <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: 1 }}>{c.content}</div>
                                                </div>
                                            </div>
                                        ))}

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

    /* ══════════════════════════════════════════════════════════
       STREAM
       ══════════════════════════════════════════════════════════ */
    return (
        <DashboardLayout role="student">
            <div className="page-header">
                <div><h1 className="page-title">Classwork</h1><p className="page-subtitle">View assignments, files, and class resources</p></div>
            </div>

            {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
                <>
                    {/* Stats */}
                    <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
                        <div className="stat-card blue"><div className="stat-value">{materials.length}</div><div className="stat-label">Total Materials</div></div>
                        <div className="stat-card red"><div className="stat-value">{materials.filter(m => m.type === 'assignment' && m.dueDate && new Date(m.dueDate) > new Date()).length}</div><div className="stat-label">Pending Assignments</div></div>
                    </div>

                    {/* Filter bar */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <select className="form-input" style={{ maxWidth: 260, borderRadius: 10 }} value={selectedCourse || ''} onChange={e => setSelectedCourse(Number(e.target.value))}>
                            {courses.map((c: any) => <option key={c.id} value={c.id}>{c.courseCode} — {c.courseName}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {[{ val: '', label: 'All' }, { val: 'assignment', label: '📋 Assignments' }, { val: 'file', label: '📄 Materials' }, { val: 'link', label: '🔗 Links' }, { val: 'announcement', label: '📢 Announcements' }].map(f => (
                                <button key={f.val} onClick={() => setTypeFilter(f.val)} style={{
                                    padding: '0.4rem 0.85rem', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
                                    fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.15s',
                                    background: typeFilter === f.val ? '#3b82f6' : '#fff',
                                    color: typeFilter === f.val ? '#fff' : '#64748b',
                                    borderColor: typeFilter === f.val ? '#3b82f6' : '#e2e8f0',
                                }}>{f.label}</button>
                            ))}
                        </div>
                    </div>

                    {/* Stream */}
                    <div className="classroom-stream">
                        {filtered.length > 0 ? filtered.map(m => {
                            const tc_m = typeConfig[m.type] || typeConfig.file;
                            const isExpandedType = m.type === 'announcement' || m.type === 'link';

                            return (
                                <div key={m.id} className="stream-item" style={{ cursor: 'pointer' }} onClick={() => openDetail(m)}>
                                    {isExpandedType ? (
                                        <>
                                            <div className="stream-header">
                                                <div className="stream-avatar" style={{ background: tc_m.color }}>{m.teacher?.firstName?.[0]}{m.teacher?.lastName?.[0]}</div>
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
                                            <div className="material-badge" style={{ background: tc_m.color }}>
                                                <TypeIcon type={m.type} />
                                            </div>
                                            <div className="stream-info" style={{ flex: 1 }}>
                                                <h4 style={{ margin: 0, fontSize: '0.9rem' }}>{m.teacher?.firstName} {m.teacher?.lastName} posted a new {tc_m.label.toLowerCase()}: {m.title}</h4>
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
                                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📦</div>
                                <h3 style={{ fontWeight: 600, marginBottom: '0.35rem' }}>No materials yet</h3>
                                <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Materials will appear here when your teacher shares them.</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {detail && renderDetail()}
        </DashboardLayout>
    );
};

export default StudentMaterials;
