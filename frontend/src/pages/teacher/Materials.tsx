import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { teacherApi, fileApi } from '../../api';
import { showAlert, showConfirm, showApiError } from '../../utils/feedback';

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */
const isValidUrl = (str: string) => {
    try { const u = new URL(str); return u.protocol === 'http:' || u.protocol === 'https:'; }
    catch { return false; }
};

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
   File Attachment Card (reusable)
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
                {fileSize ? (fileSize > 1048576 ? `${(fileSize / 1048576).toFixed(1)} MB` : `${Math.round(fileSize / 1024)} KB`) : 'File'}
            </div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    </div>
);

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */
const TeacherMaterials: React.FC = () => {
    const [courses, setCourses] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
    const [typeFilter, setTypeFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ type: 'file', content: '', externalLink: '', dueDate: '' });
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Detail
    const [detail, setDetail] = useState<any | null>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [detailTab, setDetailTab] = useState<'instructions' | 'submissions'>('instructions');

    // Forward
    const [showForward, setShowForward] = useState(false);
    const [fwdId, setFwdId] = useState<number | null>(null);
    const [fwdCourses, setFwdCourses] = useState<number[]>([]);

    /* ── Data ──────────────────────────────────────────────── */
    const load = () => {
        setLoading(true);
        teacherApi.getCourses().then(r => {
            const c = r.data.data || [];
            setCourses(c);
            if (c.length > 0 && !selectedCourse) setSelectedCourse(c[0].id);
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    const loadMaterials = (id: number) => {
        teacherApi.getMaterials(id).then(r => setMaterials(r.data.data || [])).catch(() => {});
    };

    const openDetail = async (m: any) => {
        setDetail(m);
        setDetailTab(m.type === 'assignment' ? 'instructions' : 'instructions');
        setNewComment('');
        try { const r = await teacherApi.getComments(m.id); setComments(r.data.data || []); } catch {}
        if (m.type === 'assignment') {
            try { const r = await teacherApi.getSubmissions(m.id); setSubmissions(r.data.data || []); } catch {}
        } else { setSubmissions([]); }
    };

    useEffect(() => { load(); }, []);
    useEffect(() => { if (selectedCourse) loadMaterials(selectedCourse); }, [selectedCourse]);

    const filtered = typeFilter ? materials.filter(m => m.type === typeFilter) : materials;

    /* ── Create ────────────────────────────────────────────── */
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        const lines = form.content.split('\n');
        const title = lines[0].trim();
        const description = lines.slice(1).join('\n').trim();
        if (!title) { showAlert('Error', 'Please enter a title', 'error'); return; }
        if (form.type === 'link') {
            if (!form.externalLink) { showAlert('Error', 'Please enter a URL', 'error'); return; }
            if (!isValidUrl(form.externalLink)) { showAlert('Invalid URL', 'Please enter a valid URL starting with http:// or https://', 'error'); return; }
        }
        setSubmitting(true);
        const fd = new FormData();
        fd.append('courseIds', String(selectedCourse));
        fd.append('type', form.type);
        fd.append('title', title);
        if (description) fd.append('description', description);
        if (form.externalLink) fd.append('externalLink', form.externalLink);
        if (form.dueDate) fd.append('dueDate', form.dueDate);
        if (file) fd.append('file', file);
        try {
            await teacherApi.createMaterial(fd);
            setShowModal(false);
            setForm({ type: 'file', content: '', externalLink: '', dueDate: '' });
            setFile(null);
            if (selectedCourse) loadMaterials(selectedCourse);
            showAlert('Success', 'Material shared!');
        } catch (err: any) { showApiError(err); } finally { setSubmitting(false); }
    };

    /* ── Forward ───────────────────────────────────────────── */
    const handleForward = async () => {
        if (!fwdId || fwdCourses.length === 0 || submitting) return;
        setSubmitting(true);
        try {
            await teacherApi.shareMaterial(fwdId, fwdCourses.join(','));
            setShowForward(false); setFwdId(null); setFwdCourses([]);
            if (selectedCourse) loadMaterials(selectedCourse);
            showAlert('Success', 'Material forwarded!');
        } catch (err: any) { showApiError(err); } finally { setSubmitting(false); }
    };

    /* ── Delete ────────────────────────────────────────────── */
    const handleDelete = (id: number) => {
        showConfirm('Delete Material', 'Are you sure you want to delete this?', async () => {
            try {
                await teacherApi.deleteMaterial(id);
                if (detail?.id === id) setDetail(null);
                if (selectedCourse) loadMaterials(selectedCourse);
                showAlert('Deleted', 'Material removed.', 'error');
            } catch (err: any) { showApiError(err); }
        });
    };

    /* ── Comment (class-level only, no private here) ─────── */
    const handleAddComment = async () => {
        if (!newComment.trim() || !detail) return;
        try {
            await teacherApi.addComment(detail.id, { content: newComment.trim(), isPrivate: false });
            setNewComment('');
            const r = await teacherApi.getComments(detail.id);
            setComments(r.data.data || []);
        } catch (err: any) { showApiError(err); }
    };

    /* ── Grade ─────────────────────────────────────────────── */
    const handleGrade = async (subId: number, grade: string, feedback: string) => {
        try {
            await teacherApi.gradeSubmission(subId, { grade, feedback });
            if (detail) { const r = await teacherApi.getSubmissions(detail.id); setSubmissions(r.data.data || []); }
            showAlert('Graded', 'Submission graded successfully!');
        } catch (err: any) { showApiError(err); }
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
                                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, background: new Date(m.dueDate) < new Date() ? '#fef2f2' : '#f0fdf4', color: new Date(m.dueDate) < new Date() ? '#dc2626' : '#16a34a' }}>
                                        Due {new Date(m.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} {new Date(m.dueDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </>}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button title="Forward" onClick={(e) => { e.stopPropagation(); setFwdId(m.id); setFwdCourses([]); setShowForward(true); }}
                                style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                            </button>
                            <button title="Delete" onClick={() => handleDelete(m.id)}
                                style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #fecaca', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14H7L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                        </div>
                        <button onClick={() => setDetail(null)} style={{ border: 'none', background: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>×</button>
                    </div>

                    {/* Tabs for assignments */}
                    {isAssignment && (
                        <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '0 1.5rem', flexShrink: 0 }}>
                            {(['instructions', 'submissions'] as const).map(tab => (
                                <button key={tab} onClick={() => setDetailTab(tab)} style={{
                                    padding: '0.7rem 1.25rem', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit',
                                    fontWeight: 600, fontSize: '0.85rem', color: detailTab === tab ? '#3b82f6' : '#94a3b8',
                                    borderBottom: `2px solid ${detailTab === tab ? '#3b82f6' : 'transparent'}`, marginBottom: -1,
                                    textTransform: 'capitalize'
                                }}>{tab === 'submissions' ? `Student work (${submissions.length})` : 'Instructions'}</button>
                            ))}
                        </div>
                    )}

                    {/* Body */}
                    <div style={{ flex: 1, overflow: 'auto' }}>
                        {isAssignment && detailTab === 'submissions' ? (
                            <div style={{ padding: '1.5rem' }}>
                                {submissions.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
                                        <p style={{ fontWeight: 500 }}>No submissions yet</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {submissions.map((s: any) => <SubmissionCard key={s.id} submission={s} onGrade={handleGrade} />)}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div style={{ padding: '1.5rem', flex: 1, overflow: 'auto' }}>
                                    {/* Description */}
                                    {m.description && <div style={{ fontSize: '0.92rem', color: '#334155', lineHeight: 1.75, whiteSpace: 'pre-wrap', marginBottom: '1.25rem' }}>{m.description}</div>}

                                    {/* YouTube preview */}
                                    {m.type === 'link' && m.externalLink && <VideoPreview url={m.externalLink} />}

                                    {/* Link card */}
                                    {m.type === 'link' && m.externalLink && (
                                        <a href={m.externalLink} target="_blank" rel="noopener noreferrer" style={{
                                            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                                            background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0',
                                            textDecoration: 'none', color: 'inherit', marginBottom: '1.25rem', transition: 'all 0.15s'
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

                                    {/* Assignment stats */}
                                    {isAssignment && (
                                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                                            <div style={{ padding: '0.6rem 1rem', background: '#eff6ff', borderRadius: 10, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <span style={{ fontWeight: 700, color: '#3b82f6' }}>{submissions.length}</span> submitted
                                            </div>
                                            <div style={{ padding: '0.6rem 1rem', background: '#f0fdf4', borderRadius: 10, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <span style={{ fontWeight: 700, color: '#16a34a' }}>{submissions.filter(s => s.status === 'graded').length}</span> graded
                                            </div>
                                        </div>
                                    )}

                                    {/* Class comments */}
                                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                                        <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '1rem', color: '#334155' }}>
                                            Class comments ({comments.filter(c => !c.isPrivate).length})
                                        </h4>
                                        {comments.filter(c => !c.isPrivate).length === 0 && <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '1rem' }}>No comments yet</p>}
                                        {comments.filter(c => !c.isPrivate).map((c: any) => (
                                            <div key={c.id} style={{ display: 'flex', gap: '0.65rem', marginBottom: '0.85rem' }}>
                                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>
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
                                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>T</div>
                                    <input className="form-input" style={{ borderRadius: 20, flex: 1, padding: '0.45rem 1rem', fontSize: '0.82rem' }}
                                        placeholder="Add a class comment…" value={newComment} onChange={e => setNewComment(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddComment(); } }} />
                                    <button className="btn btn-primary btn-sm" style={{ width: 'auto', borderRadius: 20, padding: '0.4rem 1rem' }}
                                        onClick={handleAddComment} disabled={!newComment.trim()}>Post</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    /* ══════════════════════════════════════════════════════════
       STREAM ITEM
       ══════════════════════════════════════════════════════════ */
    const renderStreamItem = (m: any) => {
        const tc_m = typeConfig[m.type] || typeConfig.file;
        const isExpandedType = m.type === 'announcement' || m.type === 'link';

        return (
            <div key={m.id} className="stream-item" style={{ cursor: 'pointer', position: 'relative' }} onClick={() => openDetail(m)}>
                {/* Action buttons */}
                <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 4, zIndex: 2 }} onClick={e => e.stopPropagation()}>
                    <button title="Forward" onClick={() => { setFwdId(m.id); setFwdCourses([]); setShowForward(true); }}
                        style={{ width: 30, height: 30, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.9)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontSize: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                    </button>
                    <button title="Delete" onClick={() => handleDelete(m.id)}
                        style={{ width: 30, height: 30, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.9)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                    </button>
                </div>

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
                            <div className="comment-avatar">T</div>
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
    };

    /* ══════════════════════════════════════════════════════════
       MAIN RENDER
       ══════════════════════════════════════════════════════════ */
    return (
        <DashboardLayout role="teacher">
            <div className="page-header">
                <div><h1 className="page-title">Classwork</h1><p className="page-subtitle">Create and manage class materials, assignments, and resources</p></div>
                <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowModal(true)}>+ Create</button>
            </div>

            {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
                <>
                    {/* Filter bar */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <select className="form-input" style={{ maxWidth: 240, borderRadius: 10 }} value={selectedCourse || ''} onChange={e => setSelectedCourse(Number(e.target.value))}>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.courseCode} {c.section ? `– ${c.section}` : ''}</option>)}
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
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem', marginLeft: 'auto' }}>{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Stream */}
                    <div className="classroom-stream">
                        <div className="stream-item" style={{ padding: '0.7rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', color: '#94a3b8' }} onClick={() => setShowModal(true)}>
                            <div className="stream-avatar" style={{ width: 32, height: 32, fontSize: '0.7rem' }}>T</div>
                            <span style={{ fontSize: '0.85rem' }}>Announce something to your class…</span>
                        </div>
                        {filtered.length > 0 ? filtered.map(renderStreamItem) : (
                            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📦</div>
                                <h3 style={{ fontWeight: 600, marginBottom: '0.35rem' }}>No materials found</h3>
                                <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Materials you create will appear here.</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Detail overlay */}
            {detail && renderDetail()}

            {/* Create modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <div className="modal-header"><h3 className="modal-title">Create material</h3><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
                        <form onSubmit={handleCreate}>
                            <div className="form-group"><label className="form-label">Type</label>
                                <select className="form-input" value={form.type} onChange={e => { setForm({ ...form, type: e.target.value }); setFile(null); }}>
                                    <option value="file">📄 Material (File Upload)</option>
                                    <option value="link">🔗 External Link</option>
                                    <option value="announcement">📢 Announcement</option>
                                    <option value="assignment">📋 Assignment</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Title & Description</label>
                                <textarea className="form-input" rows={4} placeholder="First line = title&#10;Remaining lines = description (optional)" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required />
                            </div>
                            {(form.type === 'file' || form.type === 'assignment') && (
                                <div className="form-group">
                                    <label className="form-label">{form.type === 'assignment' ? 'Attachment (optional — reference material for students)' : 'File'}</label>
                                    <label style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '1rem',
                                        border: '2px dashed #cbd5e1', borderRadius: 12, cursor: 'pointer', color: '#64748b', fontSize: '0.85rem',
                                        background: file ? '#eff6ff' : '#f8fafc', transition: 'all 0.15s'
                                    }}>
                                        <input type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
                                        {file ? <span style={{ color: '#3b82f6', fontWeight: 600 }}>📎 {file.name}</span> : <span>📎 Click to attach a file</span>}
                                    </label>
                                </div>
                            )}
                            {form.type === 'link' && (
                                <div className="form-group">
                                    <label className="form-label">URL</label>
                                    <input className="form-input" value={form.externalLink} onChange={e => setForm({ ...form, externalLink: e.target.value })}
                                        placeholder="https://..." style={{ borderColor: form.externalLink && !isValidUrl(form.externalLink) ? '#ef4444' : undefined }} />
                                    {form.externalLink && !isValidUrl(form.externalLink) && (
                                        <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 4, display: 'block' }}>⚠ Enter a valid URL (e.g. https://example.com)</span>
                                    )}
                                </div>
                            )}
                            {form.type === 'assignment' && (
                                <div className="form-group"><label className="form-label">Due Date</label><input className="form-input" type="datetime-local" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
                            )}
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }} disabled={submitting}>{submitting ? 'Creating…' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Forward modal */}
            {showForward && (
                <div className="modal-overlay" onClick={() => setShowForward(false)} style={{ zIndex: 1001 }}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3 className="modal-title">Forward to sections</h3><button className="modal-close" onClick={() => setShowForward(false)}>×</button></div>
                        <div style={{ padding: '1rem 0' }}>
                            <p style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.88rem' }}>Select sections to share this material:</p>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {courses.filter(c => c.id !== selectedCourse).map(c => (
                                    <label key={c.id} className={`chip-select ${fwdCourses.includes(c.id) ? 'selected' : ''}`}>
                                        <input type="checkbox" checked={fwdCourses.includes(c.id)} onChange={e => setFwdCourses(prev => e.target.checked ? [...prev, c.id] : prev.filter(x => x !== c.id))} style={{ display: 'none' }} />
                                        {c.courseCode} {c.section}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowForward(false)} disabled={submitting}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleForward} disabled={fwdCourses.length === 0 || submitting} style={{ width: 'auto' }}>
                                {submitting ? 'Forwarding…' : 'Forward'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

/* ═══════════════════════════════════════════════════════════════
   Submission Card (Teacher view — with grading)
   ═══════════════════════════════════════════════════════════════ */
const SubmissionCard = ({ submission, onGrade }: { submission: any; onGrade: (id: number, grade: string, feedback: string) => void }) => {
    const [editing, setEditing] = useState(false);
    const [grade, setGrade] = useState(submission.grade || '');
    const [feedback, setFeedback] = useState(submission.feedback || '');
    const s = submission;
    const isGraded = s.status === 'graded';

    return (
        <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.15rem',
            borderLeft: `4px solid ${isGraded ? '#16a34a' : '#f59e0b'}`, transition: 'all 0.15s'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.7rem' }}>
                        {s.student?.firstName?.[0]}{s.student?.lastName?.[0]}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{s.student?.firstName} {s.student?.lastName}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {new Date(s.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>
                <span style={{
                    padding: '3px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700,
                    background: isGraded ? '#f0fdf4' : '#fffbeb', color: isGraded ? '#16a34a' : '#d97706'
                }}>{isGraded ? `${s.grade}/100` : 'Pending'}</span>
            </div>

            {/* Content */}
            {s.content && <p style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '0.5rem', lineHeight: 1.5 }}>{s.content}</p>}
            {s.fileName && <FileCard fileName={s.fileName} fileSize={s.fileSize} onDownload={() => downloadFile('submission', s.id, s.fileName)} />}

            {/* Feedback */}
            {s.feedback && !editing && (
                <div style={{ padding: '0.65rem 0.85rem', background: '#f0fdf4', borderRadius: 10, fontSize: '0.82rem', marginTop: '0.5rem', border: '1px solid #bbf7d0' }}>
                    <strong style={{ color: '#16a34a' }}>Feedback:</strong> {s.feedback}
                </div>
            )}

            {/* Grade controls */}
            {editing ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: '0 0 90px' }}>
                        <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 3 }}>Grade</label>
                        <input className="form-input" value={grade} onChange={e => setGrade(e.target.value)} placeholder="100" style={{ padding: '0.45rem 0.6rem' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 3 }}>Feedback</label>
                        <input className="form-input" value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Great work!" style={{ padding: '0.45rem 0.6rem' }} />
                    </div>
                    <button className="btn btn-primary btn-sm" style={{ width: 'auto', borderRadius: 8 }} onClick={() => { onGrade(s.id, grade, feedback); setEditing(false); }}>Save</button>
                    <button className="btn btn-secondary btn-sm" style={{ width: 'auto', borderRadius: 8 }} onClick={() => setEditing(false)}>Cancel</button>
                </div>
            ) : (
                <button onClick={() => setEditing(true)} style={{
                    marginTop: '0.65rem', padding: '0.4rem 1rem', borderRadius: 8, border: `1px solid ${isGraded ? '#bbf7d0' : '#3b82f6'}`,
                    background: isGraded ? '#f0fdf4' : '#eff6ff', color: isGraded ? '#16a34a' : '#3b82f6',
                    fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit'
                }}>{isGraded ? '✏ Edit Grade' : '📝 Grade'}</button>
            )}
        </div>
    );
};

export default TeacherMaterials;
