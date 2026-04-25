import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Avatar from '../../components/Avatar';
import { teacherApi, fileApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { showAlert, showConfirm, showApiError } from '../../utils/feedback';
import { Search, Bell, FileText, Play, Link as LinkIcon, Download, Plus, Share, Trash2, X, Upload, BookOpen, ArrowUpRight, MessageSquare, ChevronRight, Edit2 } from 'lucide-react';

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

const typeConfig: Record<string, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
    file:         { color: '#ef4444', bg: '#fef2f2', label: 'PDF Document',   icon: <FileText size={20} color="#ef4444" /> },
    link:         { color: '#10b981', bg: '#ecfdf5', label: 'External Link',  icon: <LinkIcon size={20} color="#10b981" /> },
    announcement: { color: '#f59e0b', bg: '#fffbeb', label: 'Announcement',   icon: <Bell size={20} color="#f59e0b" /> },
    assignment:   { color: '#3b82f6', bg: '#eff6ff', label: 'Assignment',     icon: <FileText size={20} color="#3b82f6" /> },
    video:        { color: '#3b82f6', bg: '#eff6ff', label: 'Video Lecture',  icon: <Play size={20} color="#3b82f6" /> },
};

const figureOutType = (m: any) => {
    if (m.type === 'link' && m.externalLink && (m.externalLink.includes('youtube') || m.externalLink.includes('youtu.be'))) return 'video';
    return m.type;
};

/* ── Sub-components ──────────────────────────────────────── */
const VideoPreview = ({ url }: { url: string }) => {
    const ytId = getYouTubeId(url);
    if (!ytId) return null;
    return (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 16, overflow: 'hidden', marginBottom: '1.25rem', background: '#000', boxShadow: '0 8px 32px rgba(0,0,0,.12)' }}>
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
    <div onClick={e => { e.stopPropagation(); onDownload(); }}
        style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem',
            background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0', cursor: 'pointer',
            transition: 'all .15s', marginBottom: '0.5rem'
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
    >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={18} color="#3b82f6" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
                {fileSize ? (fileSize > 1048576 ? `${(fileSize / 1048576).toFixed(1)} MB` : `${Math.round(fileSize / 1024)} KB`) : 'File'}
            </div>
        </div>
        <Download size={18} color="#94a3b8" />
    </div>
);

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */
const TeacherMaterials: React.FC = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [courses, setCourses] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<number | null>(Number(searchParams.get('courseId')) || null);
    const [typeFilter, setTypeFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
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

    // Inline grading
    const [gradingId, setGradingId] = useState<number | null>(null);
    const [gradeVal, setGradeVal] = useState('');
    const [feedbackVal, setFeedbackVal] = useState('');

    /* ── Data ──────────────────────────────────────────────── */
    const load = () => {
        setLoading(true);
        teacherApi.getCourses().then(r => {
            const c = r.data.data || [];
            setCourses(c);
            const initialCourseId = Number(searchParams.get('courseId'));
            if (initialCourseId && c.some((course: any) => course.id === initialCourseId)) {
                setSelectedCourse(initialCourseId);
            } else if (c.length > 0 && !selectedCourse) {
                setSelectedCourse(c[0].id);
                setSearchParams({ courseId: c[0].id.toString() }, { replace: true });
            }
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
        setGradingId(null);
        try { const r = await teacherApi.getComments(m.id); setComments(r.data.data || []); } catch {}
        if (m.type === 'assignment') {
            try { const r = await teacherApi.getSubmissions(m.id); setSubmissions(r.data.data || []); } catch {}
        } else { setSubmissions([]); }
    };

    useEffect(() => { load(); }, []);
    useEffect(() => {
        if (selectedCourse) {
            setSearchParams({ courseId: selectedCourse.toString() }, { replace: true });
            loadMaterials(selectedCourse);
        }
    }, [selectedCourse]);

    const activeCourseData = courses.find(c => c.id === selectedCourse);

    const filtered = materials.filter(m => {
        if (typeFilter) {
            if (typeFilter === 'video' && figureOutType(m) !== 'video') return false;
            if (typeFilter === 'file' && figureOutType(m) !== 'file') return false;
            if (typeFilter === 'link' && m.type !== 'link') return false;
            if (typeFilter === 'assignment' && m.type !== 'assignment') return false;
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return m.title?.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q);
        }
        return true;
    });

    /* ── Handlers ────────────────────────────────────────────── */
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

    const handleAddComment = async () => {
        if (!newComment.trim() || !detail) return;
        try {
            await teacherApi.addComment(detail.id, { content: newComment.trim(), isPrivate: false });
            setNewComment('');
            const r = await teacherApi.getComments(detail.id);
            setComments(r.data.data || []);
        } catch (err: any) { showApiError(err); }
    };

    const handleGrade = async (subId: number, grade: string, feedback: string) => {
        try {
            await teacherApi.gradeSubmission(subId, { grade, feedback });
            if (detail) { const r = await teacherApi.getSubmissions(detail.id); setSubmissions(r.data.data || []); }
            showAlert('Graded', 'Submission graded successfully!');
            setGradingId(null);
        } catch (err: any) { showApiError(err); }
    };

    /* ══════════════════════════════════════════════════════════
       DETAIL MODAL
       ══════════════════════════════════════════════════════════ */
    const renderDetail = () => {
        if (!detail) return null;
        const m = detail;
        const tc = typeConfig[figureOutType(m)] || typeConfig.file;
        const isAssignment = m.type === 'assignment';

        return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.4)', backdropFilter: 'blur(6px)' }} onClick={() => setDetail(null)} />
                <div style={{
                    position: 'relative', zIndex: 1, background: '#fff', width: '100%', maxWidth: isAssignment ? 1100 : 780,
                    borderRadius: 24, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                    boxShadow: '0 25px 60px rgba(0,0,0,.18)'
                }}>
                    {/* Header */}
                    <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: tc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                            {tc.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, lineHeight: 1.3 }}>{m.title}</h2>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span>{m.teacher?.firstName} {m.teacher?.lastName}</span>
                                <span>·</span>
                                <span>{new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                {isAssignment && m.dueDate && <>
                                    <span>·</span>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700,
                                        background: new Date(m.dueDate) < new Date() ? '#fef2f2' : '#f0fdf4',
                                        color: new Date(m.dueDate) < new Date() ? '#dc2626' : '#16a34a'
                                    }}>
                                        Due {new Date(m.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                </>}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button title="Forward" onClick={() => { setFwdId(m.id); setFwdCourses([]); setShowForward(true); }}
                                style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                <Share size={16} />
                            </button>
                            <button title="Delete" onClick={() => handleDelete(m.id)}
                                style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #fecaca', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                        <button onClick={() => setDetail(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                            <X size={22} />
                        </button>
                    </div>

                    {/* Assignment Tabs */}
                    {isAssignment && (
                        <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '0 1.75rem', flexShrink: 0 }}>
                            {(['instructions', 'submissions'] as const).map(tab => (
                                <button key={tab} onClick={() => setDetailTab(tab)} style={{
                                    padding: '0.75rem 1.25rem', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit',
                                    fontWeight: 700, fontSize: '0.85rem', color: detailTab === tab ? '#3b82f6' : '#94a3b8',
                                    borderBottom: `2px solid ${detailTab === tab ? '#3b82f6' : 'transparent'}`, marginBottom: -1,
                                }}>{tab === 'submissions' ? `Student Work (${submissions.length})` : 'Instructions'}</button>
                            ))}
                        </div>
                    )}

                    {/* Body */}
                    <div style={{ flex: 1, overflow: 'auto', background: '#fafbfc' }}>
                        {isAssignment && detailTab === 'submissions' ? (
                            <div style={{ padding: '1.75rem' }}>
                                {submissions.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                        <BookOpen size={36} color="#cbd5e1" style={{ marginBottom: '0.75rem' }} />
                                        <p style={{ fontWeight: 600 }}>No submissions yet</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                        {submissions.map((s: any) => {
                                            const isGraded = s.status === 'graded';
                                            const isEditing = gradingId === s.id;
                                            return (
                                                <div key={s.id} style={{
                                                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '1.15rem',
                                                    borderLeft: `4px solid ${isGraded ? '#16a34a' : '#f59e0b'}`
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                                            <Avatar firstName={s.student?.firstName} lastName={s.student?.lastName} size={34} />
                                                            <div>
                                                                <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{s.student?.firstName} {s.student?.lastName}</div>
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
                                                    {s.content && <p style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '0.5rem', lineHeight: 1.5 }}>{s.content}</p>}
                                                    {s.fileName && <FileCard fileName={s.fileName} fileSize={s.fileSize} onDownload={() => downloadFile('submission', s.id, s.fileName)} />}
                                                    {s.feedback && !isEditing && (
                                                        <div style={{ padding: '0.6rem 0.85rem', background: '#f0fdf4', borderRadius: 10, fontSize: '0.82rem', marginTop: '0.5rem', border: '1px solid #bbf7d0' }}>
                                                            <strong style={{ color: '#16a34a' }}>Feedback:</strong> {s.feedback}
                                                        </div>
                                                    )}
                                                    {isEditing ? (
                                                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-end', marginTop: '0.65rem', flexWrap: 'wrap' }}>
                                                            <div style={{ flex: '0 0 80px' }}>
                                                                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 3 }}>Grade</label>
                                                                <input style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.4rem 0.5rem', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit' }}
                                                                    value={gradeVal} onChange={e => setGradeVal(e.target.value)} placeholder="100" />
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 3 }}>Feedback</label>
                                                                <input style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.4rem 0.5rem', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit' }}
                                                                    value={feedbackVal} onChange={e => setFeedbackVal(e.target.value)} placeholder="Great work!" />
                                                            </div>
                                                            <button style={{ padding: '0.4rem 0.85rem', borderRadius: 8, background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: '0.78rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                                                                onClick={() => handleGrade(s.id, gradeVal, feedbackVal)}>Save</button>
                                                            <button style={{ padding: '0.4rem 0.85rem', borderRadius: 8, background: '#f1f5f9', color: '#64748b', fontWeight: 700, fontSize: '0.78rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                                                                onClick={() => setGradingId(null)}>Cancel</button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => { setGradingId(s.id); setGradeVal(s.grade || ''); setFeedbackVal(s.feedback || ''); }}
                                                            style={{
                                                                marginTop: '0.6rem', padding: '0.4rem 0.85rem', borderRadius: 8,
                                                                border: `1px solid ${isGraded ? '#bbf7d0' : '#93c5fd'}`,
                                                                background: isGraded ? '#f0fdf4' : '#eff6ff',
                                                                color: isGraded ? '#16a34a' : '#3b82f6',
                                                                fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit',
                                                                display: 'flex', alignItems: 'center', gap: '0.35rem'
                                                            }}>
                                                            <Edit2 size={12} /> {isGraded ? 'Edit Grade' : 'Grade'}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div style={{ padding: '1.75rem', flex: 1, overflow: 'auto' }}>
                                    {m.description && <div style={{ fontSize: '0.95rem', color: '#334155', lineHeight: 1.75, whiteSpace: 'pre-wrap', marginBottom: '1.5rem' }}>{m.description}</div>}
                                    {m.type === 'link' && m.externalLink && <VideoPreview url={m.externalLink} />}
                                    {m.type === 'link' && m.externalLink && (
                                        <a href={m.externalLink} target="_blank" rel="noopener noreferrer" style={{
                                            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem',
                                            background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0',
                                            textDecoration: 'none', color: 'inherit', marginBottom: '1.25rem'
                                        }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <ArrowUpRight size={18} color="#3b82f6" />
                                            </div>
                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Open Link</div>
                                                <div style={{ fontSize: '0.78rem', color: '#3b82f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.externalLink}</div>
                                            </div>
                                        </a>
                                    )}
                                    {m.fileName && <FileCard fileName={m.fileName} fileSize={m.fileSize} onDownload={() => downloadFile('material', m.id, m.fileName)} />}

                                    {isAssignment && (
                                        <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.25rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                                            <div style={{ padding: '0.55rem 1rem', background: '#eff6ff', borderRadius: 10, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                <span style={{ fontWeight: 800, color: '#3b82f6' }}>{submissions.length}</span> submitted
                                            </div>
                                            <div style={{ padding: '0.55rem 1rem', background: '#f0fdf4', borderRadius: 10, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                <span style={{ fontWeight: 800, color: '#16a34a' }}>{submissions.filter(s => s.status === 'graded').length}</span> graded
                                            </div>
                                        </div>
                                    )}

                                    {/* Class Comments */}
                                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: '#334155' }}>
                                            Class Comments ({comments.filter(c => !c.isPrivate).length})
                                        </h4>
                                        {comments.filter(c => !c.isPrivate).length === 0 && <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '1rem' }}>No comments yet</p>}
                                        {comments.filter(c => !c.isPrivate).map((c: any) => {
                                            const isTeacher = (c.user?.role || '').toLowerCase().includes('teacher');
                                            return (
                                                <div key={c.id} style={{ display: 'flex', gap: '0.65rem', marginBottom: '0.85rem', padding: '0.65rem', borderRadius: 10, background: isTeacher ? '#eff6ff' : '#f8fafc', border: '1px solid #e2e8f0' }}>
                                                    <Avatar firstName={c.user?.firstName} lastName={c.user?.lastName} avatarUrl={c.user?.avatarUrl} size={30} variant={isTeacher ? 'blue' : 'green'} />
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

                                {/* Comment Input */}
                                <div style={{ padding: '0.85rem 1.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.6rem', alignItems: 'center', flexShrink: 0, background: '#fff' }}>
                                    <Avatar firstName={user?.firstName} lastName={user?.lastName} avatarUrl={user?.avatar} size={30} />
                                    <input
                                        style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 20, padding: '0.5rem 1rem', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit' }}
                                        placeholder="Add a class comment…"
                                        value={newComment} onChange={e => setNewComment(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddComment(); } }}
                                    />
                                    <button
                                        style={{ padding: '0.42rem 1rem', borderRadius: 20, background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: '0.82rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: newComment.trim() ? 1 : 0.5 }}
                                        disabled={!newComment.trim()} onClick={handleAddComment}
                                    >Post</button>
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
        <DashboardLayout role="teacher">
            {/* ── Top Navigation Bar ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1rem 0.5rem', borderBottom: '1px solid #f1f5f9', marginBottom: '2rem',
                position: 'sticky', top: 0, zIndex: 10, background: '#fff'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#3b82f6', margin: 0, letterSpacing: '-0.02em' }}>Materials Library</h1>
                    <nav style={{ display: 'flex', gap: '1.5rem', fontSize: '0.88rem', fontWeight: 600 }}>
                        <span style={{ color: '#3b82f6', borderBottom: '2px solid #3b82f6', paddingBottom: 4, cursor: 'pointer' }}>Browse</span>
                        <span style={{ color: '#94a3b8', cursor: 'pointer' }} onClick={() => {
                            if (courses.length > 1) {
                                const idx = courses.findIndex(c => c.id === selectedCourse);
                                setSelectedCourse(courses[(idx + 1) % courses.length].id);
                            }
                        }}>Switch Course</span>
                    </nav>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            style={{ background: '#f1f5f9', border: 'none', borderRadius: 999, padding: '0.5rem 1rem 0.5rem 2.2rem', fontSize: '0.85rem', width: 240, outline: 'none', fontFamily: 'inherit', fontWeight: 500 }}
                            placeholder="Search resources…"
                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                        <Bell size={20} />
                    </button>
                    <Avatar avatarUrl={user?.avatar} firstName={user?.firstName} lastName={user?.lastName} size={36} />
                </div>
            </div>

            {loading ? (
                <div className="loading-screen" style={{ padding: '5rem 0' }}><div className="spinner" style={{ marginBottom: '1rem' }} /><p style={{ color: '#94a3b8' }}>Loading repository...</p></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>
                    {/* ── LEFT COLUMN ── */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                            <div>
                                <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.35rem' }}>Academic Repository</h2>
                                <p style={{ fontSize: '1.05rem', color: '#64748b' }}>Curated materials for <strong style={{ color: '#334155' }}>{activeCourseData?.courseName || activeCourseData?.courseCode || 'this course'}</strong>.</p>
                            </div>
                            <button onClick={() => setShowModal(true)} style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem',
                                background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: '0.88rem',
                                borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                                boxShadow: '0 4px 12px rgba(59,130,246,.25)', transition: 'all .15s',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#2563eb'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#3b82f6'; }}
                            >
                                <Plus size={18} /> New Material
                            </button>
                        </div>

                        {/* Filter pills */}
                        <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                            {[
                                { v: '', l: 'All Materials' },
                                { v: 'video', l: 'Video Lectures' },
                                { v: 'file', l: 'Reading PDFs' },
                                { v: 'link', l: 'Interactive Links' },
                            ].map(f => (
                                <button key={f.v} onClick={() => setTypeFilter(f.v)} style={{
                                    padding: '0.5rem 1.25rem', borderRadius: 999, fontSize: '0.85rem', fontWeight: 700,
                                    border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                                    background: typeFilter === f.v ? '#3b82f6' : '#f1f5f9',
                                    color: typeFilter === f.v ? '#fff' : '#64748b',
                                    boxShadow: typeFilter === f.v ? '0 4px 12px rgba(59,130,246,.25)' : 'none',
                                }}>{f.l}</button>
                            ))}
                        </div>

                        {/* Material rows */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '3rem' }}>
                            {filtered.filter(m => m.type !== 'assignment').map(m => {
                                const rt = figureOutType(m);
                                const tc = typeConfig[rt] || typeConfig.file;
                                return (
                                    <div key={m.id} onClick={() => openDetail(m)} style={{
                                        display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.15rem 1.25rem',
                                        background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9',
                                        cursor: 'pointer', transition: 'all .2s', position: 'relative',
                                        boxShadow: '0 1px 3px rgba(0,0,0,.04)',
                                    }}
                                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                    >
                                        <div style={{ width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: tc.bg }}>
                                            {tc.icon}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h3 style={{ fontWeight: 700, fontSize: '1.02rem', margin: 0, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#0f172a' }}>{m.title}</h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.76rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                <span>{tc.label}</span>
                                                <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbd5e1' }} />
                                                <span>{m.fileSize ? (m.fileSize > 1024 * 1024 ? `${(m.fileSize / 1024 / 1024).toFixed(1)} MB` : `${Math.round(m.fileSize / 1024)} KB`) : 'Resource'}</span>
                                                <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbd5e1' }} />
                                                <span>Updated {new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {filtered.filter(m => m.type !== 'assignment').length === 0 && (
                                <div style={{ textAlign: 'center', padding: '3rem', background: '#fafbfc', borderRadius: 18, border: '2px dashed #e2e8f0' }}>
                                    <BookOpen size={32} color="#cbd5e1" style={{ marginBottom: '0.75rem' }} />
                                    <p style={{ color: '#94a3b8', fontWeight: 600 }}>No materials in this category.</p>
                                </div>
                            )}
                        </div>

                        <div style={{ borderTop: '1px solid #f1f5f9', marginBottom: '2rem' }} />

                        {/* Active Assignments */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Active Assignments</h2>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3b82f6', cursor: 'pointer' }}>View All</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                            {materials.filter(m => m.type === 'assignment').slice(0, 4).map(m => {
                                const isUrgent = m.dueDate && new Date(m.dueDate).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;
                                const isPast = m.dueDate && new Date(m.dueDate) < new Date();
                                return (
                                    <div key={m.id} onClick={() => openDetail(m)} style={{
                                        background: '#fff', borderRadius: 18, padding: '1.25rem', cursor: 'pointer',
                                        border: '1px solid #f1f5f9',
                                        borderLeftWidth: 6, borderLeftStyle: 'solid',
                                        borderLeftColor: isPast ? '#ef4444' : isUrgent ? '#f97316' : '#3b82f6',
                                        transition: 'all .2s', boxShadow: '0 1px 3px rgba(0,0,0,.04)',
                                    }}
                                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,.08)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.04)'; }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                                            <span style={{
                                                fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em',
                                                padding: '3px 8px', borderRadius: 6,
                                                background: isPast ? '#fef2f2' : isUrgent ? '#fff7ed' : '#eff6ff',
                                                color: isPast ? '#dc2626' : isUrgent ? '#ea580c' : '#2563eb'
                                            }}>
                                                {isPast ? 'OVERDUE' : isUrgent ? 'URGENT' : 'OPEN'}
                                            </span>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8' }}>
                                                {m.dueDate ? `Due ${new Date(m.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'No due date'}
                                            </span>
                                        </div>
                                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem', lineHeight: 1.35 }}>{m.title}</h4>
                                        <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {m.description || 'View details to grade submissions.'}
                                        </p>
                                    </div>
                                );
                            })}
                            {materials.filter(m => m.type === 'assignment').length === 0 && (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2.5rem', background: '#fafbfc', borderRadius: 18, border: '2px dashed #e2e8f0' }}>
                                    <p style={{ color: '#94a3b8', fontWeight: 600 }}>No active assignments at the moment.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── RIGHT SIDEBAR ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Library Insights */}
                        <div style={{ background: '#fff', borderRadius: 22, padding: '1.5rem', border: '1px solid #f1f5f9' }}>
                            <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: '1.5rem' }}>Library Insights</h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.65rem' }}>
                                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#64748b' }}>Total Resources</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#3b82f6' }}>{materials.length}</span>
                            </div>
                            <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', marginBottom: '0.85rem', background: '#f1f5f9' }}>
                                <div style={{ background: '#3b82f6', width: `${(materials.filter(m => figureOutType(m) === 'video').length / (materials.length || 1)) * 100}%`, transition: 'width .5s' }} />
                                <div style={{ background: '#94a3b8', width: `${(materials.filter(m => figureOutType(m) === 'file').length / (materials.length || 1)) * 100}%`, transition: 'width .5s' }} />
                                <div style={{ background: '#10b981', width: `${(materials.filter(m => m.type === 'link').length / (materials.length || 1)) * 100}%`, transition: 'width .5s' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                <span>VIDEO ({materials.filter(m => figureOutType(m) === 'video').length})</span>
                                <span>READING ({materials.filter(m => figureOutType(m) === 'file').length})</span>
                                <span>LINKS ({materials.filter(m => m.type === 'link').length})</span>
                            </div>
                        </div>

                        {/* Instructor Dashboard */}
                        <div style={{
                            background: 'linear-gradient(135deg, #22d3ee, #3b82f6)',
                            borderRadius: 22, padding: '1.5rem', color: '#fff', position: 'relative', overflow: 'hidden',
                            boxShadow: '0 8px 30px rgba(59,130,246,.25)'
                        }}>
                            <div style={{ position: 'absolute', right: -30, top: -30, width: 120, height: 120, background: 'rgba(255,255,255,.1)', borderRadius: '50%', filter: 'blur(20px)', pointerEvents: 'none' }} />
                            <h3 style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,.7)', marginBottom: '1rem' }}>INSTRUCTOR DASHBOARD</h3>
                            <h2 style={{ fontSize: '1.35rem', fontWeight: 900, marginBottom: '0.6rem' }}>Quick Actions</h2>
                            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,.8)', fontStyle: 'italic', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                                Share resources across sections, grade submissions, or post new announcements.
                            </p>
                            <button onClick={() => setShowModal(true)} style={{
                                width: '100%', padding: '0.75rem', borderRadius: 14, border: 'none',
                                background: '#fff', color: '#3b82f6', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                                fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                transition: 'all .15s'
                            }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                            >
                                <Plus size={16} /> Create Material
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {detail && renderDetail()}

            {/* Create Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.4)', backdropFilter: 'blur(6px)' }} onClick={() => setShowModal(false)} />
                    <div style={{ position: 'relative', zIndex: 1, background: '#fff', borderRadius: 24, padding: '2rem', width: '100%', maxWidth: 520, boxShadow: '0 25px 60px rgba(0,0,0,.18)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Create Material</h3>
                            <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={22} /></button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Type</label>
                                <select style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 12, padding: '0.6rem 0.75rem', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit' }}
                                    value={form.type} onChange={e => { setForm({ ...form, type: e.target.value }); setFile(null); }}>
                                    <option value="file">Document / File</option>
                                    <option value="link">Link / Video</option>
                                    <option value="announcement">Announcement</option>
                                    <option value="assignment">Assignment</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Title & Description</label>
                                <textarea style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 12, padding: '0.75rem', fontSize: '0.88rem', resize: 'vertical', minHeight: 100, fontFamily: 'inherit', outline: 'none' }}
                                    placeholder={"First line = title\nRemaining lines = description"} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required />
                            </div>
                            {(form.type === 'file' || form.type === 'assignment') && (
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Attachment</label>
                                    <label style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1.15rem',
                                        border: '2px dashed #cbd5e1', borderRadius: 14, cursor: 'pointer', transition: 'all .15s',
                                        background: file ? '#eff6ff' : '#fafbfc', color: file ? '#3b82f6' : '#64748b', fontWeight: 600, fontSize: '0.88rem'
                                    }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#93c5fd'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                    >
                                        <input type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
                                        <Upload size={18} /> {file ? file.name : 'Click to attach a file'}
                                    </label>
                                </div>
                            )}
                            {form.type === 'link' && (
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>URL</label>
                                    <input style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 12, padding: '0.6rem 0.75rem', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit' }}
                                        value={form.externalLink} onChange={e => setForm({ ...form, externalLink: e.target.value })} placeholder="https://..." />
                                    {form.externalLink && !isValidUrl(form.externalLink) && (
                                        <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 4, display: 'block' }}>Enter a valid URL (https://…)</span>
                                    )}
                                </div>
                            )}
                            {form.type === 'assignment' && (
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Due Date</label>
                                    <input type="datetime-local" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 12, padding: '0.6rem 0.75rem', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit' }}
                                        value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                                <button type="button" onClick={() => setShowModal(false)} disabled={submitting}
                                    style={{ padding: '0.6rem 1.25rem', borderRadius: 12, border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                                <button type="submit" disabled={submitting}
                                    style={{ padding: '0.6rem 1.5rem', borderRadius: 12, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit' }}>{submitting ? 'Creating…' : 'Publish'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Forward Modal */}
            {showForward && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1001, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.4)', backdropFilter: 'blur(6px)' }} onClick={() => setShowForward(false)} />
                    <div style={{ position: 'relative', zIndex: 1, background: '#fff', borderRadius: 24, padding: '2rem', width: '100%', maxWidth: 420, boxShadow: '0 25px 60px rgba(0,0,0,.18)' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>Forward Material</h3>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>Select sections to share this content:</p>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                            {courses.filter(c => c.id !== selectedCourse).map(c => (
                                <label key={c.id} style={{
                                    padding: '0.5rem 1rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                                    border: `1px solid ${fwdCourses.includes(c.id) ? '#3b82f6' : '#e2e8f0'}`,
                                    background: fwdCourses.includes(c.id) ? '#eff6ff' : '#fff',
                                    color: fwdCourses.includes(c.id) ? '#2563eb' : '#64748b',
                                }}>
                                    <input type="checkbox" style={{ display: 'none' }} checked={fwdCourses.includes(c.id)} onChange={e => setFwdCourses(prev => e.target.checked ? [...prev, c.id] : prev.filter(x => x !== c.id))} />
                                    {c.courseCode} {c.section}
                                </label>
                            ))}
                        </div>
                        <button onClick={handleForward} disabled={fwdCourses.length === 0 || submitting}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 14, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit', opacity: fwdCourses.length === 0 ? 0.5 : 1 }}>
                            {submitting ? 'Forwarding…' : 'Forward to Selected'}
                        </button>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default TeacherMaterials;
