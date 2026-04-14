import React, { useState, useEffect, useRef } from 'react';
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
    file:         { color: 'var(--accent-blue)', bg: '#eff6ff', label: 'Material' },
    link:         { color: 'var(--accent-purple)', bg: '#f5f3ff', label: 'Link' },
    announcement: { color: 'var(--accent-yellow)', bg: '#fffbeb', label: 'Announcement' },
    assignment:   { color: 'var(--accent-red)', bg: '#fef2f2', label: 'Assignment' },
};

const TypeIcon = ({ type, size = 20 }: { type: string; size?: number }) => {
    const s = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    if (type === 'file') return <svg {...s}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
    if (type === 'link') return <svg {...s}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
    if (type === 'assignment') return <svg {...s}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>;
    return <svg {...s}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
};

/* ═══════════════════════════════════════════════════════════════
   Components
   ═══════════════════════════════════════════════════════════════ */
const VideoPreview = ({ url }: { url: string }) => {
    const ytId = getYouTubeId(url);
    if (!ytId) return null;
    return (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 12, overflow: 'hidden', marginBottom: '1rem', background: '#000', boxShadow: 'var(--shadow-md)' }}>
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
        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem',
        background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--sidebar-border)', cursor: 'pointer',
        transition: 'var(--transition)', marginBottom: '0.5rem'
    }} onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = 'var(--accent-blue)'; }} onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = 'var(--sidebar-border)'; }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {fileSize ? (fileSize > 1048576 ? `${(fileSize / 1048576).toFixed(1)} MB` : `${Math.round(fileSize / 1024)} KB`) : 'File'} • Click to download
            </div>
        </div>
        <div className="btn-icon" style={{ borderRadius: '50%', background: 'white' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </div>
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
    const commentInputRef = useRef<HTMLInputElement>(null);

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
            const data = Array.isArray(r.data?.data) ? r.data.data : [];
            const courseList = data.map((d: any) => d?.course).filter(Boolean);
            setCourses(courseList);
            if (courseList.length > 0) setSelectedCourse(courseList[0].id);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            studentApi.getMaterials(selectedCourse)
                .then(r => setMaterials(Array.isArray(r.data?.data) ? r.data.data : []))
                .catch(() => setMaterials([]));
        }
    }, [selectedCourse]);

    const filtered = typeFilter ? materials.filter(m => m.type === typeFilter) : materials;

    const openDetail = async (m: any, focusComment = false) => {
        setDetail(m);
        setSubmitFile(null);
        setSubmitContent('');
        setNewComment('');
        setPrivateComment('');
        try { 
            const r = await studentApi.getComments(m.id); 
            setComments(Array.isArray(r.data?.data) ? r.data.data : []); 
            if (focusComment) {
                setTimeout(() => commentInputRef.current?.focus(), 300);
            }
        } catch {}
        if (m.type === 'assignment') {
            try { const r = await studentApi.getSubmission(m.id); setMySubmission(r.data.data || null); } catch { setMySubmission(null); }
        } else { setMySubmission(null); }
    };

    /* ── Comments ─────────────────────────────────────── */
    const handleAddComment = async () => {
        if (!newComment.trim() || !detail) return;
        try {
            await studentApi.addComment(detail.id, { content: newComment.trim(), isPrivate: false });
            setNewComment('');
            const r = await studentApi.getComments(detail.id);
            setComments(Array.isArray(r.data?.data) ? r.data.data : []);
        } catch (err: any) { showApiError(err); }
    };

    const handlePrivateComment = async () => {
        if (!privateComment.trim() || !detail) return;
        try {
            await studentApi.addComment(detail.id, { content: privateComment.trim(), isPrivate: true });
            setPrivateComment('');
            const r = await studentApi.getComments(detail.id);
            setComments(Array.isArray(r.data?.data) ? r.data.data : []);
        } catch (err: any) { showApiError(err); }
    };

    /* ── Submit Assignment ─────────────────────────────────── */
    const handleSubmit = async () => {
        if (!detail || submitting) return;
        if (!submitFile && !submitContent.trim()) { showAlert('Error', 'Please attach a file or write a response.', 'error'); return; }
        setSubmitting(true);
        const fd = new FormData();
        fd.append('materialId', detail.id.toString());
        if (submitContent.trim()) fd.append('content', submitContent.trim());
        if (submitFile) fd.append('file', submitFile);
        try {
            await studentApi.submitHomework(fd);
            showAlert('Success', 'Assignment turned in successfully!', 'success');
            const r = await studentApi.getSubmission(detail.id);
            setMySubmission(r.data.data || null);
            setSubmitFile(null);
            setSubmitContent('');
        } catch (err: any) { showApiError(err); } finally { setSubmitting(false); }
    };

    /* ══════════════════════════════════════════════════════════
       DETAIL MODAL
       ══════════════════════════════════════════════════════════ */
    const renderDetail = () => {
        if (!detail) return null;
        const m = detail;
        const tc = typeConfig[m.type] || typeConfig.file;
        const isAssignment = m.type === 'assignment';

        return (
            <div className="modal-overlay" style={{ padding: 0 }}>
                <div style={{ position: 'absolute', inset: 0 }} onClick={() => setDetail(null)} />
                <div className="modal" style={{ 
                    width: '100%', maxWidth: isAssignment ? 1100 : 840, height: '90vh',
                    margin: 'auto', padding: 0, display: 'flex', flexDirection: 'column'
                }}>
                    {/* Header */}
                    <div className="modal-header" style={{ padding: '1.25rem 2rem', borderBottom: '1px solid var(--sidebar-border)', marginBottom: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: 42, height: 42, borderRadius: '50%', background: tc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                <TypeIcon type={m.type} />
                            </div>
                            <div>
                                <h2 className="modal-title" style={{ fontSize: '1.25rem' }}>{m.title}</h2>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    {m.teacher?.firstName} {m.teacher?.lastName} • {new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                            </div>
                        </div>
                        <button className="modal-close" onClick={() => setDetail(null)}>&times;</button>
                    </div>

                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: isAssignment ? 'row' : 'column' }}>
                        {/* Main Body */}
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                            <div style={{ padding: '2rem', flex: 1 }}>
                                {isAssignment && m.dueDate && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                                        <span className={`badge ${new Date(m.dueDate) < new Date() ? 'badge-absent' : 'badge-pending'}`} style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}>
                                            Due {new Date(m.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                )}
                                
                                {m.description && <div style={{ fontSize: '1rem', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '2rem' }}>{m.description}</div>}

                                {m.type === 'link' && m.externalLink && (
                                    <div style={{ marginBottom: '2rem' }}>
                                        <VideoPreview url={m.externalLink} />
                                        <a href={m.externalLink} target="_blank" rel="noopener noreferrer" className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', textDecoration: 'none' }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                            </div>
                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Open Link</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{m.externalLink}</div>
                                            </div>
                                        </a>
                                    </div>
                                )}

                                {m.fileName && <FileCard fileName={m.fileName} fileSize={m.fileSize} onDownload={() => downloadFile('material', m.id, m.fileName)} />}

                                {/* Comments Section */}
                                <div style={{ borderTop: '1px solid var(--sidebar-border)', marginTop: '3rem', paddingTop: '2rem' }}>
                                    <h4 className="section-title">Class Comments ({comments.filter(c => !c.isPrivate).length})</h4>
                                    {comments.filter(c => !c.isPrivate).length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No comments yet. Start the conversation!</div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        {comments.filter(c => !c.isPrivate).map((c: any) => {
                                            const role = (c.user?.role || '').toLowerCase();
                                            const isTeacher = role.includes('teacher');
                                            return (
                                                <div key={c.id} style={{ display: 'flex', gap: '0.85rem', padding: '0.75rem', borderRadius: 12, background: isTeacher ? '#eff6ff' : '#f8fafc', border: '1px solid #e2e8f0' }}>
                                                    <div className="sidebar-avatar" style={{ background: isTeacher ? 'var(--gradient-primary)' : 'var(--accent-green)', width: 34, height: 34, fontSize: '0.7rem', overflow: 'hidden' }}>
                                                        {c.user?.avatarUrl ? <img src={c.user.avatarUrl} alt="avatar" className="avatar-image" /> : <>{c.user?.firstName?.[0]}{c.user?.lastName?.[0]}</>}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '4px', flexWrap: 'wrap' }}>
                                                            <span style={{ fontWeight: 700, fontSize: '0.86rem' }}>{c.user?.firstName} {c.user?.lastName}</span>
                                                            {isTeacher && <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', borderRadius: 999, padding: '2px 8px' }}>Professor</span>}
                                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                        </div>
                                                        <div style={{ fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{c.content}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Comment Input */}
                            <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--sidebar-border)', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div className="sidebar-avatar" style={{ background: 'var(--accent-green)', width: 32, height: 32, fontSize: '0.7rem' }}>S</div>
                                <input 
                                    ref={commentInputRef}
                                    className="form-input" 
                                    style={{ borderRadius: '24px', background: '#fff' }} 
                                    placeholder="Add a class comment..." 
                                    value={newComment} 
                                    onChange={e => setNewComment(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }}
                                />
                                <button className="btn btn-primary" style={{ width: 'auto', borderRadius: '24px' }} disabled={!newComment.trim()} onClick={handleAddComment}>Post</button>
                            </div>
                        </div>

                        {/* Sidebar (Assignments Only) */}
                        {isAssignment && (
                            <div style={{ width: 360, borderLeft: '1px solid var(--sidebar-border)', background: '#f8fafc', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: '2rem' }}>
                                    <h4 className="section-title" style={{ marginBottom: '1.5rem' }}>Your work</h4>
                                    
                                    {mySubmission ? (
                                        <div className="glass-card" style={{ background: '#fff', borderLeft: `4px solid ${mySubmission.grade ? 'var(--accent-green)' : 'var(--accent-blue)'}` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                <span className={`badge ${mySubmission.status === 'graded' ? 'badge-present' : 'badge-active'}`}>
                                                    {mySubmission.status === 'graded' ? 'GRADED' : 'SUBMITTED'}
                                                </span>
                                                {mySubmission.grade !== null && (
                                                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{mySubmission.grade}/100</span>
                                                )}
                                            </div>
                                            
                                            {mySubmission.fileName && (
                                                <FileCard fileName={mySubmission.fileName} fileSize={mySubmission.fileSize} onDownload={() => downloadFile('submission', mySubmission.id, mySubmission.fileName)} />
                                            )}
                                            {mySubmission.content && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: '#f8fafc', padding: '0.75rem', borderRadius: 8, marginTop: '0.5rem' }}>{mySubmission.content}</div>}
                                            
                                            {mySubmission.feedback && (
                                                <div style={{ marginTop: '1.5rem', padding: '1rem', borderTop: '1px solid var(--sidebar-border)' }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Teacher Feedback</div>
                                                    <div style={{ fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--text-primary)' }}>"{mySubmission.feedback}"</div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="glass-card" style={{ background: '#fff' }}>
                                            <textarea className="form-input" rows={4} placeholder="Write a text response (optional)..." value={submitContent} onChange={e => setSubmitContent(e.target.value)} style={{ marginBottom: '1rem' }} />
                                            <label style={{
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1.5rem',
                                                border: '2px dashed var(--border-glass)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'var(--transition)'
                                            }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-glass)'}>
                                                <input type="file" style={{ display: 'none' }} onChange={e => setSubmitFile(e.target.files?.[0] || null)} />
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{submitFile ? submitFile.name : 'Attach File'}</span>
                                            </label>
                                            <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={handleSubmit} disabled={submitting}>
                                                {submitting ? 'Submitting...' : 'Turn In'}
                                            </button>
                                        </div>
                                    )}

                                    {/* Private Comments */}
                                    <div style={{ borderTop: '1px solid var(--sidebar-border)', marginTop: '2.5rem', paddingTop: '2rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>Private Comments</h4>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                                            {comments.filter(c => c.isPrivate).map((c: any) => {
                                                const isTeacher = (c.user?.role || '').toLowerCase().includes('teacher');
                                                return (
                                                    <div key={c.id} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', background: isTeacher ? '#fffbeb' : '#fff', borderRadius: 10, border: '1px solid var(--sidebar-border)' }}>
                                                        <div className="sidebar-avatar" style={{ width: 26, height: 26, fontSize: '0.6rem', background: isTeacher ? 'var(--accent-yellow)' : 'var(--accent-green)', overflow: 'hidden' }}>
                                                            {c.user?.avatarUrl ? <img src={c.user.avatarUrl} alt="avatar" className="avatar-image" /> : <>{c.user?.firstName?.[0]}</>}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                                {c.user?.firstName}
                                                                {isTeacher && <span style={{ fontSize: '0.62rem', background: '#fde68a', color: '#92400e', borderRadius: 999, padding: '1px 6px' }}>Professor</span>}
                                                            </div>
                                                            <div style={{ fontSize: '0.85rem' }}>{c.content}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {comments.filter(c => c.isPrivate).length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No private messages.</p>}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <input className="form-input" style={{ fontSize: '0.85rem', borderRadius: '20px' }} placeholder="Ask teacher..." value={privateComment} onChange={e => setPrivateComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handlePrivateComment(); }} />
                                            <button className="btn btn-primary" style={{ width: 'auto', borderRadius: '20px', paddingInline: '1rem' }} disabled={!privateComment.trim()} onClick={handlePrivateComment}>Send</button>
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
       RENDER
       ══════════════════════════════════════════════════════════ */
    return (
        <DashboardLayout role="student">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Classwork</h1>
                    <p className="page-subtitle">View and complete assignments shared by your teachers</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <select className="form-input" style={{ width: 'auto', minWidth: '240px' }} value={selectedCourse || ''} onChange={e => setSelectedCourse(Number(e.target.value))}>
                        {courses.map((c: any) => <option key={c.id} value={c.id}>{c.courseCode} — {c.courseName}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="loading-screen">
                    <div className="spinner"></div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading course materials...</p>
                </div>
            ) : (
                <div style={{ maxWidth: 840, margin: '0 auto' }}>
                    {/* Filter Chips */}
                    <div className="tabs-container" style={{ marginInline: 'auto' }}>
                        {[ {v: '', l: 'All'}, {v: 'assignment', l: 'Assignments'}, {v: 'file', l: 'Materials'}, {v: 'link', l: 'Links'}, {v: 'announcement', l: 'Updates'} ].map(t => (
                            <button key={t.v} className={`tab-btn ${typeFilter === t.v ? 'active' : ''}`} onClick={() => setTypeFilter(t.v)}>{t.l}</button>
                        ))}
                    </div>

                    <div className="classroom-stream">
                        {filtered.length > 0 ? filtered.map(m => {
                            const tc = typeConfig[m.type] || typeConfig.file;
                            const isSimple = m.type === 'assignment' || m.type === 'file';

                            return (
                                <div key={m.id} className="stream-item" style={{ cursor: 'pointer', padding: isSimple ? '0' : '1.5rem' }} onClick={() => openDetail(m)}>
                                    {!isSimple ? (
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <div className="stream-header">
                                                <div className="stream-avatar" style={{ background: tc.color }}>{m.teacher?.firstName?.[0]}{m.teacher?.lastName?.[0]}</div>
                                                <div className="stream-info">
                                                    <div className="stream-author">{m.teacher?.firstName} {m.teacher?.lastName}</div>
                                                    <div className="stream-date">{new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                                                </div>
                                            </div>
                                            <div className="stream-content">
                                                {m.title && <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>{m.title}</h4>}
                                                {m.description && <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{m.description}</p>}
                                                {m.type === 'link' && m.externalLink && <VideoPreview url={m.externalLink} />}
                                            </div>
                                            <div className="comment-input-area" onClick={e => { e.stopPropagation(); openDetail(m, true); }}>
                                                <div className="comment-avatar">s</div>
                                                <div className="comment-trigger">Add class comment...</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="stream-item-material" style={{ padding: '1rem 1.5rem' }}>
                                            <div className="material-badge" style={{ background: tc.color }}>
                                                <TypeIcon type={m.type} />
                                            </div>
                                            <div className="stream-info">
                                                <h4 style={{ margin: 0, fontWeight: 500 }}>{m.teacher?.firstName} {m.teacher?.lastName} posted a new {tc.label.toLowerCase()}: {m.title}</h4>
                                                <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>
                                                    {new Date(m.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                                                </p>
                                            </div>
                                            {m.type === 'assignment' && m.dueDate && (
                                                <div style={{ color: new Date(m.dueDate) < new Date() ? 'var(--accent-red)' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                                                    Due {new Date(m.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        }) : (
                            <div className="empty-state" style={{ padding: '4rem 2rem', background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-glass)', margin: '1rem' }}>
                                <div style={{ fontSize: '4rem', opacity: 0.8, marginBottom: '1rem' }}>📂</div>
                                <h3 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Nothing here yet</h3>
                                <p style={{ color: 'var(--text-secondary)' }}>Course materials and assignments for this class will show up here.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {detail && renderDetail()}
        </DashboardLayout>
    );
};

export default StudentMaterials;

