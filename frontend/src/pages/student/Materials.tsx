import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Avatar from '../../components/Avatar';
import { studentApi, fileApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { showAlert, showApiError } from '../../utils/feedback';
import { Search, Bell, FileText, Play, Link as LinkIcon, Download, Users, MessageSquare, X, Upload, ChevronRight, BookOpen, Clock, ArrowUpRight } from 'lucide-react';

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
                {fileSize ? (fileSize > 1048576 ? `${(fileSize / 1048576).toFixed(1)} MB` : `${Math.round(fileSize / 1024)} KB`) : 'File'} · Click to download
            </div>
        </div>
        <Download size={18} color="#94a3b8" />
    </div>
);

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */
const StudentMaterials: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [courses, setCourses] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<number | null>(Number(searchParams.get('courseId')) || null);
    const [typeFilter, setTypeFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const commentInputRef = useRef<HTMLInputElement>(null);

    /* detail state */
    const [detail, setDetail] = useState<any | null>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');

    /* assignment submission state */
    const [mySubmission, setMySubmission] = useState<any | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitFile, setSubmitFile] = useState<File | null>(null);
    const [submitContent, setSubmitContent] = useState('');
    const [privateComment, setPrivateComment] = useState('');

    /* ── Data ──────────────────────────────────────────────── */
    useEffect(() => {
        studentApi.getCourses().then(r => {
            const data = Array.isArray(r.data?.data) ? r.data.data : [];
            const courseList = data.map((d: any) => d?.course).filter(Boolean);
            setCourses(courseList);
            const initialCourseId = Number(searchParams.get('courseId'));
            if (initialCourseId && courseList.some((c: any) => c.id === initialCourseId)) {
                setSelectedCourse(initialCourseId);
            } else if (courseList.length > 0) {
                setSelectedCourse(courseList[0].id);
                setSearchParams({ courseId: courseList[0].id.toString() }, { replace: true });
            }
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            setSearchParams({ courseId: selectedCourse.toString() }, { replace: true });
            studentApi.getMaterials(selectedCourse)
                .then(r => setMaterials(Array.isArray(r.data?.data) ? r.data.data : []))
                .catch(() => setMaterials([]));
        }
    }, [selectedCourse]);

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

    const activeCourseData = courses.find(c => c.id === selectedCourse);

    /* ── Open / close detail ──────────────────────────────── */
    const openDetail = async (m: any, focusComment = false) => {
        setDetail(m);
        setMySubmission(null);
        setSubmitFile(null);
        setSubmitContent('');
        setNewComment('');
        setPrivateComment('');
        try {
            const r = await studentApi.getComments(m.id);
            setComments(Array.isArray(r.data?.data) ? r.data.data : []);
            if (focusComment) setTimeout(() => commentInputRef.current?.focus(), 300);
        } catch {}
        if (m.type === 'assignment') {
            try { const r = await studentApi.getSubmission(m.id); setMySubmission(r.data.data || null); }
            catch { setMySubmission(null); }
        }
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
                        <button onClick={() => setDetail(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>
                            <X size={22} />
                        </button>
                    </div>

                    {/* Body */}
                    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                        {/* Main content area */}
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '1.75rem', flex: 1 }}>
                                {m.description && <div style={{ fontSize: '0.95rem', color: '#334155', lineHeight: 1.75, whiteSpace: 'pre-wrap', marginBottom: '1.5rem' }}>{m.description}</div>}
                                {m.type === 'link' && m.externalLink && <VideoPreview url={m.externalLink} />}
                                {m.type === 'link' && m.externalLink && (
                                    <a href={m.externalLink} target="_blank" rel="noopener noreferrer" style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem',
                                        background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0',
                                        textDecoration: 'none', color: 'inherit', marginBottom: '1.25rem', transition: 'all .15s'
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

                                {/* Class Comments */}
                                <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '2.5rem', paddingTop: '1.5rem' }}>
                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginBottom: '1rem' }}>
                                        Class Comments ({comments.filter(c => !c.isPrivate).length})
                                    </h4>
                                    {comments.filter(c => !c.isPrivate).length === 0 && (
                                        <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '1rem' }}>No comments yet. Start the conversation!</p>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                        {comments.filter(c => !c.isPrivate).map((c: any) => {
                                            const isTeacher = (c.user?.role || '').toLowerCase().includes('teacher');
                                            return (
                                                <div key={c.id} style={{ display: 'flex', gap: '0.7rem', padding: '0.7rem 0.85rem', borderRadius: 12, background: isTeacher ? '#eff6ff' : '#f8fafc', border: '1px solid #e2e8f0' }}>
                                                    <Avatar firstName={c.user?.firstName} lastName={c.user?.lastName} avatarUrl={c.user?.avatarUrl || c.user?.avatar} size={30} variant={isTeacher ? 'blue' : 'green'} />
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
                            </div>

                            {/* Comment Input */}
                            <div style={{ padding: '0.85rem 1.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.6rem', alignItems: 'center', flexShrink: 0, background: '#fafbfc' }}>
                                <Avatar firstName={user?.firstName} lastName={user?.lastName} avatarUrl={user?.avatar} size={30} variant="green" />
                                <input
                                    ref={commentInputRef}
                                    style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 20, padding: '0.5rem 1rem', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit' }}
                                    placeholder="Add a class comment…"
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddComment(); } }}
                                />
                                <button
                                    style={{ padding: '0.42rem 1rem', borderRadius: 20, background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: '0.82rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: newComment.trim() ? 1 : 0.5 }}
                                    disabled={!newComment.trim()} onClick={handleAddComment}
                                >Post</button>
                            </div>
                        </div>

                        {/* Assignment Sidebar */}
                        {isAssignment && (
                            <div style={{ width: 340, borderLeft: '1px solid #f1f5f9', background: '#fafbfc', overflowY: 'auto', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                                <div style={{ padding: '1.75rem' }}>
                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1.5rem', color: '#1e293b' }}>Your Work</h4>

                                    {mySubmission && !submitting ? (
                                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '1.25rem', borderLeft: `4px solid ${mySubmission.grade != null ? '#16a34a' : '#3b82f6'}` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                <span style={{
                                                    padding: '3px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700,
                                                    background: mySubmission.status === 'graded' ? '#f0fdf4' : '#eff6ff',
                                                    color: mySubmission.status === 'graded' ? '#16a34a' : '#3b82f6'
                                                }}>
                                                    {mySubmission.status === 'graded' ? 'GRADED' : 'SUBMITTED'}
                                                </span>
                                                {mySubmission.grade != null && (
                                                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>{mySubmission.grade}/100</span>
                                                )}
                                            </div>
                                            {mySubmission.fileName && <FileCard fileName={mySubmission.fileName} fileSize={mySubmission.fileSize} onDownload={() => downloadFile('submission', mySubmission.id, mySubmission.fileName)} />}
                                            {mySubmission.content && <div style={{ fontSize: '0.85rem', color: '#64748b', background: '#f8fafc', padding: '0.75rem', borderRadius: 10, marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>{mySubmission.content}</div>}
                                            {mySubmission.feedback && (
                                                <div style={{ marginTop: '1.25rem', padding: '0.85rem', borderTop: '1px solid #e2e8f0' }}>
                                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Teacher Feedback</div>
                                                    <div style={{ fontSize: '0.88rem', fontStyle: 'italic', color: '#334155' }}>"{mySubmission.feedback}"</div>
                                                </div>
                                            )}
                                            {mySubmission.status !== 'graded' && (
                                                <button onClick={() => { setSubmitContent(mySubmission.content || ''); setMySubmission(null); }}
                                                    style={{ marginTop: '1rem', width: '100%', padding: '0.55rem', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit', color: '#3b82f6' }}>
                                                    Edit Submission
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '1.25rem' }}>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Your Response</label>
                                                <textarea
                                                    style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 12, padding: '0.75rem', fontSize: '0.85rem', resize: 'vertical', minHeight: 90, fontFamily: 'inherit', outline: 'none' }}
                                                    placeholder="Write your response here..."
                                                    value={submitContent}
                                                    onChange={e => setSubmitContent(e.target.value)}
                                                />
                                            </div>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Attachments</label>
                                                {submitFile ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem', background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{submitFile.name}</div>
                                                            <div style={{ fontSize: '0.7rem', color: '#60a5fa' }}>Ready to upload</div>
                                                        </div>
                                                        <button onClick={() => setSubmitFile(null)} style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <X size={12} color="#ef4444" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <label style={{
                                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', padding: '1.25rem',
                                                        border: '2px dashed #cbd5e1', borderRadius: 14, cursor: 'pointer', transition: 'all .15s', background: '#fafbfc'
                                                    }}
                                                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.background = '#eff6ff'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#fafbfc'; }}
                                                    >
                                                        <input type="file" style={{ display: 'none' }} onChange={e => setSubmitFile(e.target.files?.[0] || null)} />
                                                        <Upload size={20} color="#94a3b8" />
                                                        <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>Attach File</span>
                                                    </label>
                                                )}
                                            </div>
                                            <button
                                                style={{
                                                    width: '100%', padding: '0.65rem', borderRadius: 12, background: '#3b82f6', color: '#fff',
                                                    fontWeight: 700, fontSize: '0.88rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                                                    opacity: submitting || (!submitFile && !submitContent.trim()) ? 0.5 : 1
                                                }}
                                                onClick={handleSubmit}
                                                disabled={submitting || (!submitFile && !submitContent.trim())}
                                            >
                                                {submitting ? 'Submitting...' : 'Turn In'}
                                            </button>
                                        </div>
                                    )}

                                    {/* Private Comments */}
                                    <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '2rem', paddingTop: '1.5rem' }}>
                                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem', color: '#1e293b' }}>Private Comments</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                                            {comments.filter(c => c.isPrivate).map((c: any) => {
                                                const isTeacher = (c.user?.role || '').toLowerCase().includes('teacher');
                                                return (
                                                    <div key={c.id} style={{ display: 'flex', gap: '0.6rem', padding: '0.6rem', background: isTeacher ? '#fffbeb' : '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                                        <Avatar firstName={c.user?.firstName} lastName={c.user?.lastName} avatarUrl={c.user?.avatarUrl || c.user?.avatar} size={24} variant={isTeacher ? 'blue' : 'green'} />
                                                        <div>
                                                            <div style={{ fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                                {c.user?.firstName}
                                                                {isTeacher && <span style={{ fontSize: '0.6rem', background: '#fde68a', color: '#92400e', borderRadius: 999, padding: '1px 5px' }}>Prof</span>}
                                                            </div>
                                                            <div style={{ fontSize: '0.82rem' }}>{c.content}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {comments.filter(c => c.isPrivate).length === 0 && <p style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>No private messages.</p>}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            <input
                                                style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 20, padding: '0.42rem 0.85rem', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit' }}
                                                placeholder="Ask teacher..."
                                                value={privateComment}
                                                onChange={e => setPrivateComment(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') handlePrivateComment(); }}
                                            />
                                            <button
                                                style={{ padding: '0.42rem 0.85rem', borderRadius: 20, background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: '0.78rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: privateComment.trim() ? 1 : 0.5 }}
                                                disabled={!privateComment.trim()} onClick={handlePrivateComment}
                                            >Send</button>
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
                            placeholder="Search resources..."
                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', position: 'relative' }}>
                        <Bell size={20} />
                        <span style={{ position: 'absolute', top: 0, right: 0, width: 7, height: 7, background: '#ef4444', borderRadius: '50%' }} />
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
                        <div style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.35rem' }}>Academic Repository</h2>
                            <p style={{ fontSize: '1.05rem', color: '#64748b' }}>Curated materials for <strong style={{ color: '#334155' }}>{activeCourseData?.courseName || 'this course'}</strong>.</p>
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
                                        cursor: 'pointer', transition: 'all .2s',
                                        boxShadow: '0 1px 3px rgba(0,0,0,.04)',
                                    }}
                                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                    >
                                        <div style={{ width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: tc.bg, transition: 'all .2s' }}>
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
                                    <p style={{ color: '#94a3b8', fontWeight: 600 }}>No materials available in this category.</p>
                                </div>
                            )}
                        </div>

                        {/* ── Divider ── */}
                        <div style={{ borderTop: '1px solid #f1f5f9', marginBottom: '2rem' }} />

                        {/* ── Active Assignments ── */}
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
                                        borderLeft: `6px solid ${isPast ? '#ef4444' : isUrgent ? '#f97316' : '#3b82f6'}`,
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
                                                {m.dueDate ? `Due in ${Math.max(0, Math.ceil((new Date(m.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days` : 'No due date'}
                                            </span>
                                        </div>
                                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem', lineHeight: 1.35 }}>{m.title}</h4>
                                        <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {m.description || 'View details to submit your work.'}
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

                        {/* Instructor Office */}
                        <div style={{
                            background: 'linear-gradient(135deg, #22d3ee, #3b82f6)',
                            borderRadius: 22, padding: '1.5rem', color: '#fff', position: 'relative', overflow: 'hidden',
                            boxShadow: '0 8px 30px rgba(59,130,246,.25)'
                        }}>
                            <div style={{ position: 'absolute', right: -30, top: -30, width: 120, height: 120, background: 'rgba(255,255,255,.1)', borderRadius: '50%', filter: 'blur(20px)', pointerEvents: 'none' }} />
                            <h3 style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,.7)', marginBottom: '1rem' }}>INSTRUCTOR OFFICE</h3>
                            <h2 style={{ fontSize: '1.35rem', fontWeight: 900, marginBottom: '0.6rem' }}>{activeCourseData?.teacher ? `${activeCourseData.teacher.firstName} ${activeCourseData.teacher.lastName}` : 'Instructor'}</h2>
                            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,.8)', fontStyle: 'italic', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                                "Design is the silent ambassador of your brand."
                            </p>
                            <button onClick={() => navigate('/student/messages')} style={{
                                width: '100%', padding: '0.75rem', borderRadius: 14, border: 'none',
                                background: 'rgba(255,255,255,.2)', backdropFilter: 'blur(8px)',
                                color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                                fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                transition: 'all .15s'
                            }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.3)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.2)'; }}
                            >
                                <MessageSquare size={16} /> Message Professor
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {detail && renderDetail()}
        </DashboardLayout>
    );
};

export default StudentMaterials;
