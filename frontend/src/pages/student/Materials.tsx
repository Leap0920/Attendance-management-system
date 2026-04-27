import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Avatar from '../../components/Avatar';
import { studentApi, fileApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { showAlert, showApiError } from '../../utils/feedback';
import { Search, Bell, FileText, Play, Link as LinkIcon, Download, MessageSquare, X, Upload, ChevronRight, ChevronDown, BookOpen, ArrowUpRight, Users, Share, Trash2, Edit2 } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */
const getYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/i);
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
    file:         { color: '#ef4444', bg: '#fef2f2', label: 'Resource',      icon: <FileText size={20} color="#ef4444" /> },
    link:         { color: '#10b981', bg: '#ecfdf5', label: 'External Link',  icon: <LinkIcon size={20} color="#10b981" /> },
    announcement: { color: '#f59e0b', bg: '#fffbeb', label: 'Announcement',   icon: <Bell size={20} color="#f59e0b" /> },
    assignment:   { color: '#3b82f6', bg: '#eff6ff', label: 'Assignment',     icon: <FileText size={20} color="#3b82f6" /> },
    video:        { color: '#8b5cf6', bg: '#f5f3ff', label: 'Video Lecture',  icon: <Play size={20} color="#8b5cf6" /> },
};

const getMLink = (m: any) => m.externalLink || m.external_link || '';

const figureOutType = (m: any) => {
    const link = m.externalLink || m.external_link || '';
    if (m.type === 'link' && link && (link.toLowerCase().includes('youtube') || link.toLowerCase().includes('youtu.be'))) return 'video';
    if (m.type === 'file' && !m.fileName) return 'announcement';
    return m.type;
};

const getDynamicLabel = (m: any) => {
    const rt = figureOutType(m);
    if (rt === 'file' && m.fileName) {
        const ext = m.fileName.split('.').pop()?.toUpperCase();
        return ext ? `${ext} Document` : 'Document';
    }
    if (m.type === 'file' && !m.fileName) return 'Course Note';
    return typeConfig[rt]?.label || 'Resource';
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
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<number | null>(Number(searchParams.get('courseId')) || null);
    const [typeFilter, setTypeFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const commentInputRef = useRef<HTMLInputElement>(null);
    const [showAll, setShowAll] = useState(false);
    const [showAllAssignments, setShowAllAssignments] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const getYouTubeId = (url: string): string | null => {
        if (!url) return null;
        const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
        return m ? m[1] : null;
    };

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /* detail state (inline expand) */
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');

    /* assignment submission state */
    const [mySubmission, setMySubmission] = useState<any | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitFile, setSubmitFile] = useState<File | null>(null);
    const [submitContent, setSubmitContent] = useState('');
    const [privateComment, setPrivateComment] = useState('');
    const [detailTab, setDetailTab] = useState<'instructions' | 'submissions'>('instructions');

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
            setShowAll(false);
            setShowAllAssignments(false);
            studentApi.getMaterials(selectedCourse)
                .then(r => setMaterials(Array.isArray(r.data?.data) ? r.data.data : []))
                .catch(() => setMaterials([]));
            // Get course detail (including enrollments)
            studentApi.getCourse(selectedCourse).then(r => {
                const data = r.data?.data;
                setEnrollments(data?.enrollments || []);
            }).catch(() => {});
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

    const displayMaterials = showAll ? filtered.filter(m => m.type !== 'assignment') : filtered.filter(m => m.type !== 'assignment').slice(0, 5);

    const activeCourseData = courses.find(c => c.id === selectedCourse);

    /* ── Inline Expand ──────────────────────────────────── */
    const toggleExpand = async (m: any) => {
        if (expandedId === m.id) { setExpandedId(null); return; }
        setExpandedId(m.id);
        setMySubmission(null);
        setSubmitFile(null);
        setSubmitContent('');
        setNewComment('');
        setPrivateComment('');
        setDetailTab('instructions');
        try {
            const r = await studentApi.getComments(m.id);
            setComments(Array.isArray(r.data?.data) ? r.data.data : []);
        } catch {}
        if (m.type === 'assignment') {
            try { const r = await studentApi.getSubmission(m.id); setMySubmission(r.data.data || null); }
            catch { setMySubmission(null); }
        }
    };

    /* ── Comments ─────────────────────────────────────── */
    const handleAddComment = async () => {
        if (!newComment.trim() || !expandedId) return;
        try {
            await studentApi.addComment(expandedId, { content: newComment.trim(), isPrivate: false });
            setNewComment('');
            const r = await studentApi.getComments(expandedId);
            setComments(Array.isArray(r.data?.data) ? r.data.data : []);
        } catch (err: any) { showApiError(err); }
    };

    const handlePrivateComment = async () => {
        if (!privateComment.trim() || !expandedId) return;
        try {
            await studentApi.addComment(expandedId, { content: privateComment.trim(), isPrivate: true });
            setPrivateComment('');
            const r = await studentApi.getComments(expandedId);
            setComments(Array.isArray(r.data?.data) ? r.data.data : []);
        } catch (err: any) { showApiError(err); }
    };

    /* ── Submit Assignment ─────────────────────────────────── */
    const handleSubmit = async () => {
        if (!expandedId || submitting) return;
        if (!submitFile && !submitContent.trim()) { showAlert('Error', 'Please attach a file or write a response.', 'error'); return; }
        setSubmitting(true);
        const fd = new FormData();
        fd.append('materialId', expandedId.toString());
        if (submitContent.trim()) fd.append('content', submitContent.trim());
        if (submitFile) fd.append('file', submitFile);
        try {
            await studentApi.submitHomework(fd);
            showAlert('Success', 'Assignment turned in successfully!', 'success');
            const r = await studentApi.getSubmission(expandedId);
            setMySubmission(r.data.data || null);
            setSubmitFile(null);
            setSubmitContent('');
        } catch (err: any) { showApiError(err); } finally { setSubmitting(false); }
    };

    /* ══════════════════════════════════════════════════════════
       DETAIL MODAL
       ══════════════════════════════════════════════════════════ */



    /* ══════════════════════════════════════════════════════════
       RENDER
       ══════════════════════════════════════════════════════════ */
    return (
        <DashboardLayout role="student">
            {/* ── Top Navigation Bar ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1rem 2.5rem', borderBottom: '1px solid #f1f5f9', marginBottom: '2.5rem',
                position: 'sticky', top: '0.5rem', zIndex: 10, background: '#fff', marginTop: '-1.9rem',
                borderRadius: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5rem' }}>
                    <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#3b82f6', margin: 0, letterSpacing: '-0.04em', cursor: 'pointer' }} onClick={() => navigate('/student/dashboard')}>Materials Library</h1>
                    <nav style={{ display: 'flex', gap: '3rem', fontSize: '0.9rem', fontWeight: 700, alignItems: 'center' }}>
                        <span style={{ color: '#3b82f6', borderBottom: '3px solid #3b82f6', paddingBottom: 6, cursor: 'pointer' }}>Browse</span>
                        
                        {/* Course Switcher Dropdown */}
                        <div style={{ position: 'relative' }} ref={menuRef}>
                            <div 
                                style={{ 
                                    color: isMenuOpen ? '#3b82f6' : '#94a3b8', 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px',
                                    background: isMenuOpen ? '#eff6ff' : 'transparent',
                                    padding: '4px 8px',
                                    borderRadius: '8px',
                                    transition: 'all 0.2s'
                                }} 
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                onMouseEnter={e => { if(!isMenuOpen) e.currentTarget.style.color = '#3b82f6'; }}
                                onMouseLeave={e => { if(!isMenuOpen) e.currentTarget.style.color = '#94a3b8'; }}
                            >
                                <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {activeCourseData?.courseCode || 'Switch Classroom'}
                                </span>
                                <ChevronRight size={14} style={{ transform: isMenuOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                            </div>
                            
                            {isMenuOpen && (
                                <div style={{
                                    position: 'absolute', top: '100%', left: 0, marginTop: '10px',
                                    background: '#fff', border: '1px solid #f1f5f9', borderRadius: 16,
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.12)', width: '280px', padding: '8px',
                                    zIndex: 100
                                }}>
                                    <div style={{ padding: '8px 12px', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Classrooms</div>
                                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        {courses.map(c => (
                                            <div 
                                                key={c.id} 
                                                onClick={() => { setSelectedCourse(c.id); setIsMenuOpen(false); }}
                                                style={{
                                                    padding: '10px 12px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s',
                                                    background: selectedCourse === c.id ? '#eff6ff' : 'transparent',
                                                    color: selectedCourse === c.id ? '#3b82f6' : '#334155',
                                                    display: 'flex', flexDirection: 'column', gap: '2px'
                                                }}
                                                onMouseEnter={e => { if(selectedCourse !== c.id) e.currentTarget.style.background = '#f8fafc'; }}
                                                onMouseLeave={e => { if(selectedCourse !== c.id) e.currentTarget.style.background = 'transparent'; }}
                                            >
                                                <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{c.courseName}</div>
                                                <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{c.courseCode} · {c.section}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </nav>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 999, padding: '0.65rem 1.25rem 0.65rem 2.8rem', fontSize: '0.9rem', width: 300, outline: 'none', fontFamily: 'inherit', fontWeight: 500, transition: 'all 0.2s' }}
                            placeholder="Search resources..."
                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(59,130,246,0.06)'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.boxShadow = 'none'; }}
                        />
                    </div>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bell size={22} />
                        <span style={{ position: 'absolute', top: 2, right: 2, width: 8, height: 8, background: '#ef4444', borderRadius: '50%', border: '2px solid #fff' }} />
                    </button>
                    <Avatar avatarUrl={user?.avatar} firstName={user?.firstName} lastName={user?.lastName} size={42} />
                </div>
            </div>

            {loading ? (
                <div className="loading-screen" style={{ padding: '5rem 0' }}><div className="spinner" style={{ marginBottom: '1rem' }} /><p style={{ color: '#94a3b8' }}>Loading repository...</p></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>
                    {/* ── LEFT COLUMN ── */}
                    <div>
                        <div style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.35rem', letterSpacing: '-0.03em' }}>Academic Repository</h2>
                            <p style={{ fontSize: '1.05rem', color: '#64748b' }}>Curated materials for <strong style={{ color: '#3b82f6', fontWeight: 800 }}>{activeCourseData?.courseName || 'this course'}</strong>.</p>
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
                            {displayMaterials.map(m => {
                                const rt = figureOutType(m);
                                const tc = typeConfig[rt] || typeConfig.file;
                                const mLink = getMLink(m);
                                const ytId = rt === 'video' && mLink ? getYouTubeId(mLink) : null;
                                const isExpanded = expandedId === m.id;
                                return (
                                    <div key={m.id} style={{ borderRadius: 18, border: `1px solid ${isExpanded ? '#93c5fd' : '#f1f5f9'}`, overflow: 'hidden', transition: 'all .2s', boxShadow: isExpanded ? '0 8px 24px rgba(59,130,246,.1)' : '0 1px 3px rgba(0,0,0,.04)' }}>
                                        {/* Row */}
                                        <div onClick={() => toggleExpand(m)} style={{
                                            display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.15rem 1.25rem',
                                            background: isExpanded ? '#f8fafc' : '#fff', cursor: 'pointer', transition: 'all .2s',
                                        }}
                                            onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = '#fafbfc'; }}
                                            onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = '#fff'; }}
                                        >
                                            <div style={{ width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: tc.bg }}>{tc.icon}</div>
                                            {ytId && (
                                                <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="" style={{ width: 120, height: 68, objectFit: 'cover', borderRadius: 10, flexShrink: 0, border: '1px solid #e2e8f0' }} />
                                            )}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h3 style={{ fontWeight: 700, fontSize: '1.02rem', margin: 0, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#0f172a' }}>{m.title}</h3>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.76rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                    <span style={{ color: tc.color }}>{getDynamicLabel(m)}</span>
                                                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbd5e1' }} />
                                                    <span>Resource</span>
                                                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbd5e1' }} />
                                                    <span>{new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · {new Date(m.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                            <ChevronDown size={20} color="#94a3b8" style={{ transition: 'transform .2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }} />
                                        </div>
                                        {/* Expand panel */}
                                        {isExpanded && (
                                            <div style={{ borderTop: '1px solid #e2e8f0', padding: '1.5rem', background: '#fff' }}>
                                                {m.description && <div style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '1.25rem' }}>{m.description}</div>}
                                                {ytId && <VideoPreview url={mLink} />}
                                                {mLink && !ytId && (
                                                    <a href={mLink} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', textDecoration: 'none', color: '#3b82f6', fontWeight: 600, fontSize: '0.85rem', marginBottom: '1rem' }}>
                                                        <ArrowUpRight size={16} /> Open External Link
                                                    </a>
                                                )}
                                                {m.fileName && <FileCard fileName={m.fileName} fileSize={m.fileSize} onDownload={() => downloadFile('material', m.id, m.fileName)} />}

                                                {/* Comments section */}
                                                <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '1.5rem', paddingTop: '1.5rem' }}>
                                                    <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem' }}>Class Comments ({comments.filter(c => !c.isPrivate).length})</h4>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                                        {comments.filter(c => !c.isPrivate).map((c: any) => {
                                                            const isTeacher = (c.user?.role || '').toLowerCase().includes('teacher');
                                                            return (
                                                                <div key={c.id} style={{ display: 'flex', gap: '0.75rem' }}>
                                                                    <Avatar firstName={c.user?.firstName} lastName={c.user?.lastName} avatarUrl={c.user?.avatarUrl || c.user?.avatar} size={32} variant={isTeacher ? 'blue' : 'green'} />
                                                                    <div style={{ flex: 1, background: isTeacher ? '#f5f3ff' : '#f8fafc', padding: '0.75rem 1rem', borderRadius: '0 12px 12px 12px', border: `1px solid ${isTeacher ? '#ede9fe' : '#f1f5f9'}` }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>{c.user?.firstName} {c.user?.lastName} {isTeacher && ' (Professor)'}</span>
                                                                            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                                                                        </div>
                                                                        <div style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>{c.content}</div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                        <Avatar firstName={user?.firstName} lastName={user?.lastName} avatarUrl={user?.avatar} size={32} />
                                                        <div style={{ flex: 1, position: 'relative' }}>
                                                            <input style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 99, padding: '0.5rem 1rem', fontSize: '0.85rem', outline: 'none', background: '#f8fafc' }}
                                                                placeholder="Add a class comment..." value={newComment} onChange={e => setNewComment(e.target.value)}
                                                                onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }} />
                                                            <button onClick={handleAddComment} style={{ position: 'absolute', right: 4, top: 4, bottom: 4, border: 'none', background: '#3b82f6', color: '#fff', borderRadius: 99, padding: '0 1rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Post</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {!showAll && filtered.filter(m => m.type !== 'assignment').length > 5 && (
                                <button 
                                    onClick={() => setShowAll(true)}
                                    style={{
                                        width: '100%', padding: '1rem', background: '#fff', borderRadius: 18, 
                                        border: '1px solid #f1f5f9', color: '#3b82f6', fontWeight: 800, fontSize: '0.88rem',
                                        cursor: 'pointer', transition: 'all 0.2s', marginTop: '0.5rem'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#f1f5f9'; }}
                                >
                                    See {filtered.filter(m => m.type !== 'assignment').length - 5} More Materials
                                </button>
                            )}

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
                            {materials.filter(m => m.type === 'assignment').length > 4 && (
                                <span onClick={() => setShowAllAssignments(!showAllAssignments)} style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3b82f6', cursor: 'pointer' }}>
                                    {showAllAssignments ? 'Show Less' : `View All (${materials.filter(m => m.type === 'assignment').length})`}
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            {(showAllAssignments ? materials.filter(m => m.type === 'assignment') : materials.filter(m => m.type === 'assignment').slice(0, 4)).map(m => {
                                const isUrgent = m.dueDate && new Date(m.dueDate).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;
                                const isPast = m.dueDate && new Date(m.dueDate) < new Date();
                                const isExpanded = expandedId === m.id;
                                const mLink = getMLink(m);
                                const ytId = mLink ? getYouTubeId(mLink) : null;

                                return (
                                    <div key={m.id} style={{ borderRadius: 18, border: `1px solid ${isExpanded ? '#3b82f6' : '#f1f5f9'}`, overflow: 'hidden', transition: 'all .2s', boxShadow: isExpanded ? '0 8px 24px rgba(59,130,246,.1)' : '0 1px 3px rgba(0,0,0,.04)' }}>
                                        <div onClick={() => toggleExpand(m)} style={{ padding: '1.25rem', background: isExpanded ? '#f8fafc' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ width: 48, height: 48, borderRadius: 12, background: isPast ? '#fef2f2' : isUrgent ? '#fff7ed' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <BookOpen size={20} color={isPast ? '#ef4444' : isUrgent ? '#f97316' : '#3b82f6'} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                                                    <span style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4, background: isPast ? '#fef2f2' : isUrgent ? '#fff7ed' : '#eff6ff', color: isPast ? '#dc2626' : isUrgent ? '#ea580c' : '#2563eb' }}>{isPast ? 'Overdue' : isUrgent ? 'Urgent' : 'Open'}</span>
                                                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>{m.dueDate ? `Due ${new Date(m.dueDate).toLocaleDateString()}` : 'No deadline'}</span>
                                                </div>
                                                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>{m.title}</h4>
                                            </div>
                                            <ChevronDown size={20} color="#94a3b8" style={{ transition: 'transform .2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }} />
                                        </div>
                                        {isExpanded && (
                                            <div style={{ borderTop: '1px solid #f1f5f9', background: '#fff', display: 'grid', gridTemplateColumns: '1fr 320px' }}>
                                                {/* Left: Instructions */}
                                                <div style={{ padding: '1.5rem', borderRight: '1px solid #f1f5f9' }}>
                                                    <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid #f1f5f9', marginBottom: '1.5rem' }}>
                                                        <button onClick={() => setDetailTab('instructions')} style={{ paddingBottom: '0.75rem', border: 'none', background: 'none', fontSize: '0.85rem', fontWeight: 700, color: detailTab === 'instructions' ? '#3b82f6' : '#94a3b8', borderBottom: `2px solid ${detailTab === 'instructions' ? '#3b82f6' : 'transparent'}`, cursor: 'pointer' }}>Instructions</button>
                                                        <button onClick={() => setDetailTab('submissions')} style={{ paddingBottom: '0.75rem', border: 'none', background: 'none', fontSize: '0.85rem', fontWeight: 700, color: detailTab === 'submissions' ? '#3b82f6' : '#94a3b8', borderBottom: `2px solid ${detailTab === 'submissions' ? '#3b82f6' : 'transparent'}`, cursor: 'pointer' }}>My Submission</button>
                                                    </div>

                                                    {detailTab === 'instructions' ? (
                                                        <div style={{ animation: 'fadeIn .2s' }}>
                                                            {m.description && <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.description}</p>}
                                                            {ytId && <VideoPreview url={mLink} />}
                                                            {m.fileName && <FileCard fileName={m.fileName} fileSize={m.fileSize} onDownload={() => downloadFile('material', m.id, m.fileName)} />}
                                                        </div>
                                                    ) : (
                                                        <div style={{ animation: 'fadeIn .2s' }}>
                                                            {mySubmission ? (
                                                                <div style={{ background: '#f8fafc', borderRadius: 16, padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                                                        <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 6, background: mySubmission.status === 'graded' ? '#f0fdf4' : '#eff6ff', color: mySubmission.status === 'graded' ? '#16a34a' : '#3b82f6' }}>{mySubmission.status}</span>
                                                                        {mySubmission.grade !== null && <span style={{ fontWeight: 900, color: '#1e293b' }}>{mySubmission.grade}/100</span>}
                                                                    </div>
                                                                    {mySubmission.fileName && <FileCard fileName={mySubmission.fileName} fileSize={mySubmission.fileSize} onDownload={() => downloadFile('submission', mySubmission.id, mySubmission.fileName)} />}
                                                                    {mySubmission.content && <p style={{ fontSize: '0.88rem', color: '#475569', background: '#fff', padding: '0.75rem', borderRadius: 8, border: '1px solid #f1f5f9' }}>{mySubmission.content}</p>}
                                                                    {mySubmission.feedback && (
                                                                        <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: 8, background: '#fffbeb', border: '1px solid #fef3c7' }}>
                                                                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Feedback</span>
                                                                            <p style={{ fontSize: '0.85rem', color: '#78350f', margin: 0 }}>{mySubmission.feedback}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div style={{ background: '#f8fafc', borderRadius: 16, padding: '1.25rem', border: '2px dashed #e2e8f0' }}>
                                                                    <textarea style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 12, padding: '0.75rem', fontSize: '0.85rem', minHeight: 100, marginBottom: '1rem', outline: 'none' }} placeholder="Write your submission content..." value={submitContent} onChange={e => setSubmitContent(e.target.value)} />
                                                                    <div style={{ marginBottom: '1rem' }}>
                                                                        {submitFile ? (
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                                                                <FileText size={16} color="#3b82f6" />
                                                                                <span style={{ fontSize: '0.8rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{submitFile.name}</span>
                                                                                <X size={14} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => setSubmitFile(null)} />
                                                                            </div>
                                                                        ) : (
                                                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#3b82f6', fontWeight: 600, fontSize: '0.85rem' }}>
                                                                                <input type="file" style={{ display: 'none' }} onChange={e => setSubmitFile(e.target.files?.[0] || null)} />
                                                                                <Upload size={16} /> Attach File
                                                                            </label>
                                                                        )}
                                                                    </div>
                                                                    <button onClick={handleSubmit} disabled={submitting} style={{ width: '100%', padding: '0.75rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>{submitting ? 'Submitting...' : 'Submit Work'}</button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Right: Private Comments */}
                                                <div style={{ padding: '1.5rem', background: '#fafbfc' }}>
                                                    <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem' }}>Private Comments</h4>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 250, overflowY: 'auto', marginBottom: '1rem' }}>
                                                        {comments.filter(c => c.isPrivate).map((c: any) => {
                                                            const isTeacher = (c.user?.role || '').toLowerCase().includes('teacher');
                                                            return (
                                                                <div key={c.id} style={{ display: 'flex', gap: '0.6rem' }}>
                                                                    <Avatar firstName={c.user?.firstName} lastName={c.user?.lastName} avatarUrl={c.user?.avatarUrl || c.user?.avatar} size={24} variant={isTeacher ? 'blue' : 'green'} />
                                                                    <div style={{ flex: 1, background: isTeacher ? '#fffbeb' : '#fff', padding: '0.5rem 0.75rem', borderRadius: '0 10px 10px 10px', border: '1px solid #e2e8f0' }}>
                                                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, marginBottom: 2 }}>{c.user?.firstName}</div>
                                                                        <div style={{ fontSize: '0.8rem', color: '#475569' }}>{c.content}</div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        {comments.filter(c => c.isPrivate).length === 0 && <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>No private messages yet.</p>}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <input style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 20, padding: '0.4rem 0.75rem', fontSize: '0.8rem', outline: 'none' }} placeholder="Ask professor..." value={privateComment} onChange={e => setPrivateComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handlePrivateComment(); }} />
                                                        <button onClick={handlePrivateComment} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Play size={14} fill="#fff" /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
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

                        {/* Enrolled Students */}
                        <div style={{ background: '#fff', borderRadius: 22, padding: '1.5rem', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', margin: 0 }}>Enrolled Students</h3>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#3b82f6', background: '#eff6ff', padding: '2px 8px', borderRadius: 6 }}>{enrollments.length} Total</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                {enrollments.length === 0 ? (
                                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', margin: '1rem 0' }}>No students enrolled yet.</p>
                                ) : (
                                    enrollments.map((en: any) => (
                                        <div key={en.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <Avatar firstName={en.student?.firstName} lastName={en.student?.lastName} avatarUrl={en.student?.avatarUrl} size={32} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {en.student?.firstName} {en.student?.lastName}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{en.student?.studentId || 'No ID'}</div>
                                            </div>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} title="Active" />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Instructor Office */}
                        <div style={{
                            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                            borderRadius: 22, padding: '1.75rem', color: '#fff', position: 'relative', overflow: 'hidden',
                            boxShadow: '0 15px 35px rgba(15,23,42,.2)'
                        }}>
                            <div style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, background: 'rgba(59,130,246,.15)', borderRadius: '50%', filter: 'blur(30px)' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
                                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Users size={20} color="#3b82f6" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '0.65rem', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Lead Instructor</h3>
                                    <h2 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0 }}>{activeCourseData?.teacher ? `${activeCourseData.teacher.firstName} ${activeCourseData.teacher.lastName}` : 'Professor'}</h2>
                                </div>
                            </div>
                            <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.5rem', fontStyle: 'italic' }}>
                                Connect with your professor for guidance on materials or assignment feedback.
                            </p>
                            <button onClick={() => navigate('/student/messages')} style={{
                                width: '100%', padding: '0.85rem', borderRadius: 14, border: 'none',
                                background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: '0.88rem', 
                                cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', 
                                justifyContent: 'center', gap: '0.6rem', transition: 'all .2s',
                                boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
                            }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                <MessageSquare size={16} /> Send Message
                            </button>
                        </div>

                    </div>
                </div>
            )}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </DashboardLayout>
    );
};

export default StudentMaterials;
