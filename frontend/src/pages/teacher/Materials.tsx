import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Avatar from '../../components/Avatar';
import { teacherApi, fileApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { showAlert, showConfirm, showApiError } from '../../utils/feedback';
import { Search, Bell, FileText, Play, Link as LinkIcon, Download, Plus, Share, Trash2, X, Upload, BookOpen, ArrowUpRight, ChevronRight, ChevronDown, Users, Clock, MessageSquare } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */
const isValidUrl = (str: string) => {
    try { const u = new URL(str); return u.protocol === 'http:' || u.protocol === 'https:'; }
    catch { return false; }
};

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
    file: { color: '#ef4444', bg: '#fef2f2', label: 'Resource', icon: <FileText size={20} color="#ef4444" /> },
    link: { color: '#10b981', bg: '#ecfdf5', label: 'External Link', icon: <LinkIcon size={20} color="#10b981" /> },
    announcement: { color: '#f59e0b', bg: '#fffbeb', label: 'Announcement', icon: <Bell size={20} color="#f59e0b" /> },
    assignment: { color: '#3b82f6', bg: '#eff6ff', label: 'Assignment', icon: <FileText size={20} color="#3b82f6" /> },
    video: { color: '#8b5cf6', bg: '#f5f3ff', label: 'Video Lecture', icon: <Play size={20} color="#8b5cf6" /> },
};

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

const getMLink = (m: any): string => m.externalLink || m.external_link || '';

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
    const navigate = useNavigate();
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
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [showAllAssignments, setShowAllAssignments] = useState(false);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [detailTab, setDetailTab] = useState<'instructions' | 'submissions'>('instructions');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewType, setPreviewType] = useState<'image' | 'pdf' | 'other' | null>(null);
    const [previewName, setPreviewName] = useState('');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [fwdId, setFwdId] = useState<number | null>(null);
    const [fwdCourses, setFwdCourses] = useState<number[]>([]);
    const [showForward, setShowForward] = useState(false);
    const [gradingId, setGradingId] = useState<number | null>(null);
    const [gradeVal, setGradeVal] = useState('');
    const [feedbackVal, setFeedbackVal] = useState('');
    const [targetCourses, setTargetCourses] = useState<number[]>([]);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        teacherApi.getMaterials(id).then(r => setMaterials(r.data.data || [])).catch(() => { });
    };

    const toggleExpand = async (m: any) => {
        if (expandedId === m.id) { setExpandedId(null); return; }
        setExpandedId(m.id);
        setDetailTab('instructions');
        setNewComment('');
        try { const r = await teacherApi.getComments(m.id); setComments(r.data.data || []); } catch { }
        if (m.type === 'assignment') {
            try { const r = await teacherApi.getSubmissions(m.id); setSubmissions(r.data.data || []); } catch { }
        } else { setSubmissions([]); }
    };

    useEffect(() => { load(); }, []);
    useEffect(() => {
        if (selectedCourse) {
            setSearchParams({ courseId: selectedCourse.toString() }, { replace: true });
            loadMaterials(selectedCourse);
            setShowAll(false);
            setShowAllAssignments(false);
            setExpandedId(null);
            teacherApi.getCourse(selectedCourse).then(r => {
                setEnrollments(r.data?.data?.enrollments || []);
            }).catch(() => setEnrollments([]));

            if (searchParams.get('section') === 'assignments') {
                setTimeout(() => {
                    document.getElementById('assignments-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 500);
            }
        }
    }, [selectedCourse, searchParams]);

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
        let title = lines[0].trim();
        const description = lines.slice(1).join('\n').trim();

        if (!title && file) {
            title = file.name;
        }

        if (!title) { showAlert('Error', 'Please enter a title or attach a file', 'error'); return; }
        if (targetCourses.length === 0) { showAlert('Error', 'Please select at least one classroom', 'error'); return; }
        if (form.type === 'link') {
            if (!form.externalLink) { showAlert('Error', 'Please enter a URL', 'error'); return; }
            if (!isValidUrl(form.externalLink)) { showAlert('Invalid URL', 'Please enter a valid URL starting with http:// or https://', 'error'); return; }
        }
        setSubmitting(true);
        const fd = new FormData();
        fd.append('courseIds', targetCourses.join(','));
        fd.append('type', form.type);
        fd.append('title', title);
        if (description) fd.append('description', description);
        if (form.externalLink) fd.append('externalLink', form.externalLink.trim());
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

    const handleAddComment = async () => {
        if (!newComment.trim() || !expandedId) return;
        try {
            await teacherApi.addComment(expandedId, { content: newComment.trim(), isPrivate: false });
            setNewComment('');
            const r = await teacherApi.getComments(expandedId);
            setComments(r.data.data || []);
        } catch (err: any) { showApiError(err); }
    };

    const handleDelete = (id: number) => {
        showConfirm('Delete Material', 'Are you sure you want to delete this?', async () => {
            try {
                await teacherApi.deleteMaterial(id);
                if (expandedId === id) setExpandedId(null);
                if (selectedCourse) loadMaterials(selectedCourse);
                showAlert('Deleted', 'Material removed.', 'error');
            } catch (err: any) { showApiError(err); }
        });
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

    const handleGrade = async (subId: number, grade: string, feedback: string) => {
        try {
            await teacherApi.gradeSubmission(subId, { grade, feedback });
            if (expandedId) { const r = await teacherApi.getSubmissions(expandedId); setSubmissions(r.data.data || []); }
            showAlert('Graded', 'Submission graded successfully!');
            setGradingId(null);
        } catch (err: any) { showApiError(err); }
    };

    const handlePreview = async (type: 'material' | 'submission', id: number, fileName: string) => {
        try {
            const res = type === 'material' ? await fileApi.downloadMaterial(id) : await fileApi.downloadSubmission(id);
            const blob = new Blob([res.data], { type: fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/*' });
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            setPreviewName(fileName);

            const ext = fileName.split('.').pop()?.toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) setPreviewType('image');
            else if (ext === 'pdf') setPreviewType('pdf');
            else setPreviewType('other');
        } catch { showAlert('Error', 'Could not load preview', 'error'); }
    };



    /* ══════════════════════════════════════════════════════════
       RENDER
       ══════════════════════════════════════════════════════════ */
    return (
        <DashboardLayout role="teacher">
            {/* ── Top Navigation Bar ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1rem 2.5rem', borderBottom: '1px solid #f1f5f9', marginBottom: '2.5rem',
                position: 'sticky', top: '0.5rem', zIndex: 10, background: '#fff', marginTop: '-1.9rem',
                borderRadius: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5rem' }}>
                    <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#3b82f6', margin: 0, letterSpacing: '-0.04em', cursor: 'pointer' }} onClick={() => navigate('/teacher/dashboard')}>Materials Library</h1>
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
                                onMouseEnter={e => { if (!isMenuOpen) e.currentTarget.style.color = '#3b82f6'; }}
                                onMouseLeave={e => { if (!isMenuOpen) e.currentTarget.style.color = '#94a3b8'; }}
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
                                                onMouseEnter={e => { if (selectedCourse !== c.id) e.currentTarget.style.background = '#f8fafc'; }}
                                                onMouseLeave={e => { if (selectedCourse !== c.id) e.currentTarget.style.background = 'transparent'; }}
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>Academic Repository</h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>Curated materials for <strong>{activeCourseData?.courseName || activeCourseData?.courseCode || 'this course'}</strong>.</p>
                                    {activeCourseData?.joinCode && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f1f5f9', padding: '4px 10px', borderRadius: 8, border: '1px solid #e2e8f0', cursor: 'pointer' }}
                                            onClick={() => {
                                                navigator.clipboard.writeText(activeCourseData.joinCode);
                                                showAlert('Copied', 'Join code copied to clipboard!');
                                            }}
                                            title="Click to copy join code"
                                        >
                                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Join Code:</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>{activeCourseData.joinCode}</span>
                                            <Share size={12} color="#94a3b8" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => { setShowModal(true); setTargetCourses(selectedCourse ? [selectedCourse] : []); }} style={{
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
                                                {/* Action buttons */}
                                                <div style={{ display: 'flex', gap: 6, marginBottom: '1rem' }}>
                                                    <button title="Forward" onClick={() => { setFwdId(m.id); setFwdCourses([]); setShowForward(true); }}
                                                        style={{ padding: '0.4rem 0.8rem', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: '#3b82f6', fontWeight: 600, fontSize: '0.78rem', fontFamily: 'inherit' }}>
                                                        <Share size={13} /> Forward
                                                    </button>
                                                    <button title="Delete" onClick={() => handleDelete(m.id)}
                                                        style={{ padding: '0.4rem 0.8rem', borderRadius: 8, border: '1px solid #fecaca', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: '#ef4444', fontWeight: 600, fontSize: '0.78rem', fontFamily: 'inherit' }}>
                                                        <Trash2 size={13} /> Delete
                                                    </button>
                                                    {m.type === 'link' && mLink && (
                                                        <a href={mLink} target="_blank" rel="noopener noreferrer"
                                                            style={{ padding: '0.4rem 0.8rem', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', gap: 5, color: '#10b981', fontWeight: 600, fontSize: '0.78rem', textDecoration: 'none', fontFamily: 'inherit' }}>
                                                            <ArrowUpRight size={13} /> Open Link
                                                        </a>
                                                    )}
                                                </div>
                                                {/* Video/Link Section */}
                                                {mLink && (
                                                    <div style={{ marginBottom: '1.25rem' }}>
                                                        <VideoPreview url={mLink} />
                                                        <a href={mLink} target="_blank" rel="noopener noreferrer" style={{
                                                            display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.85rem 1.25rem',
                                                            background: '#f8fafc', borderRadius: 14, color: '#3b82f6', fontWeight: 700,
                                                            textDecoration: 'none', border: '1px solid #e2e8f0', fontSize: '0.88rem',
                                                            transition: 'all .2s'
                                                        }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                                        >
                                                            <LinkIcon size={18} /> {getYouTubeId(mLink) ? 'Watch on YouTube' : 'Open External Link'} <ArrowUpRight size={16} />
                                                        </a>
                                                    </div>
                                                )}
                                                {/* Description */}
                                                {m.description && <div style={{ fontSize: '0.92rem', color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>{m.description}</div>}
                                                {/* File download */}
                                                {m.fileName && <FileCard fileName={m.fileName} fileSize={m.fileSize} onDownload={() => downloadFile('material', m.id, m.fileName)} />}
                                                {/* Comments */}
                                                <div style={{ marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                                                    <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>Class Comments ({comments.length})</h4>
                                                    {comments.length === 0 && <p style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>No comments yet</p>}
                                                    {comments.map((c: any) => (
                                                        <div key={c.id} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.85rem' }}>
                                                            <Avatar firstName={c.user?.firstName} lastName={c.user?.lastName} size={28} />
                                                            <div>
                                                                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0f172a' }}>{c.user?.firstName} {c.user?.lastName}
                                                                    <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 8, fontSize: '0.7rem' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                                                                </div>
                                                                <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: 2 }}>{c.content}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                                                        <Avatar firstName={user?.firstName} lastName={user?.lastName} size={28} />
                                                        <input style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 20, padding: '0.45rem 0.85rem', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit' }}
                                                            value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a class comment…"
                                                            onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }} />
                                                        <button style={{ padding: '0.42rem 1rem', borderRadius: 20, background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: '0.82rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: newComment.trim() ? 1 : 0.5 }}
                                                            disabled={!newComment.trim()} onClick={handleAddComment}>Post</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {nonAssignments.length > 5 && (
                                <button onClick={() => setShowAll(!showAll)} style={{ padding: '0.65rem', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: '#3b82f6', fontFamily: 'inherit', transition: 'all .15s' }}>
                                    {showAll ? 'Show Less' : `See All ${nonAssignments.length} Materials`}
                                </button>
                            )}
                        </div>
                        <div id="assignments-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', marginTop: '0.5rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Active Assignments</h2>
                                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.1rem 0 0', fontWeight: 500 }}>Manage student submissions</p>
                            </div>
                            <button onClick={() => navigate(`/teacher/assignments?courseId=${selectedCourse}`)} style={{
                                padding: '0.45rem 1rem', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff',
                                fontSize: '0.8rem', fontWeight: 700, color: '#3b82f6', cursor: 'pointer', transition: 'all .2s',
                                display: 'flex', alignItems: 'center', gap: '0.4rem'
                            }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                            >
                                View All
                                <ArrowUpRight size={14} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            {displayAssignments.map(m => {
                                const isUrgent = m.dueDate && new Date(m.dueDate).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;
                                const isPast = m.dueDate && new Date(m.dueDate) < new Date();
                                const isExpanded = expandedId === m.id;
                                return (
                                    <div key={m.id} style={{
                                        borderRadius: 20,
                                        border: `1px solid ${isExpanded ? '#3b82f6' : '#f1f5f9'}`,
                                        overflow: 'hidden', transition: 'all .2s',
                                        boxShadow: isExpanded ? '0 10px 25px rgba(59,130,246,.08)' : '0 1px 3px rgba(0,0,0,0.04)',
                                        background: '#fff'
                                    }}>
                                        <div onClick={() => toggleExpand(m)} style={{
                                            display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.15rem 1.5rem',
                                            background: isExpanded ? '#f8fafc' : '#fff',
                                            cursor: 'pointer', transition: 'all .2s',
                                            borderLeft: `6px solid ${isPast ? '#ef4444' : isUrgent ? '#f97316' : '#3b82f6'}`
                                        }}
                                            onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = '#fafbfc'; }}
                                            onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = '#fff'; }}
                                        >
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 4 }}>
                                                    <span style={{
                                                        fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em',
                                                        padding: '3px 8px', borderRadius: 6,
                                                        background: isPast ? '#fef2f2' : isUrgent ? '#fff7ed' : '#eff6ff',
                                                        color: isPast ? '#dc2626' : isUrgent ? '#ea580c' : '#2563eb'
                                                    }}>
                                                        {isPast ? 'OVERDUE' : isUrgent ? 'URGENT' : 'OPEN'}
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                        <Clock size={12} />
                                                        {m.dueDate ? `Due ${new Date(m.dueDate).toLocaleDateString()}` : 'No due date'}
                                                    </span>
                                                </div>
                                                <h3 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0, color: '#0f172a' }}>{m.title}</h3>
                                            </div>
                                            <div style={{
                                                width: 32, height: 32, borderRadius: '50%', background: isExpanded ? '#eff6ff' : '#f8fafc',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: isExpanded ? '#3b82f6' : '#94a3b8',
                                                transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s'
                                            }}>
                                                <ChevronDown size={20} />
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div style={{ padding: '2rem', background: '#fff', borderTop: '1px solid #f1f5f9' }}>
                                                {/* Navigation Tabs */}
                                                <div style={{
                                                    display: 'flex', gap: '2rem', borderBottom: '2px solid #f1f5f9', marginBottom: '2rem',
                                                    position: 'relative'
                                                }}>
                                                    {['Instructions', 'Submissions'].map(t => {
                                                        const active = detailTab === t.toLowerCase();
                                                        return (
                                                            <button key={t} onClick={(e) => { e.stopPropagation(); setDetailTab(t.toLowerCase() as any); }} style={{
                                                                padding: '0.6rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer',
                                                                fontSize: '0.8rem', fontWeight: 600, color: active ? '#3b82f6' : '#94a3b8',
                                                                borderBottom: `2px solid ${active ? '#3b82f6' : 'transparent'}`,
                                                                marginBottom: -2, transition: 'all .2s',
                                                                display: 'flex', alignItems: 'center', gap: '0.5rem'
                                                            }}>
                                                                {t === 'Instructions' ? <FileText size={16} /> : <Users size={16} />}
                                                                {t}
                                                                {t === 'Submissions' && (
                                                                    <span style={{
                                                                        fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999,
                                                                        background: active ? '#eff6ff' : '#f1f5f9', color: active ? '#3b82f6' : '#64748b'
                                                                    }}>{submissions.length}</span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {detailTab === 'instructions' ? (
                                                    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                                        {m.description && (
                                                            <div style={{
                                                                fontSize: '1.05rem', color: '#334155', lineHeight: 1.8,
                                                                whiteSpace: 'pre-wrap', marginBottom: '2rem',
                                                                padding: '1.5rem', background: '#f8fafc', borderRadius: 16, border: '1px solid #f1f5f9'
                                                            }}>
                                                                {m.description}
                                                            </div>
                                                        )}
                                                        {m.fileName && <FileCard fileName={m.fileName} fileSize={m.fileSize} onDownload={() => handlePreview('material', m.id, m.fileName)} />}

                                                        <div style={{ marginTop: '2.5rem' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Class Comments</h4>
                                                                <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>{comments.length} Discussion{comments.length !== 1 ? 's' : ''}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                                                {comments.map((c: any) => (
                                                                    <div key={c.id} style={{ display: 'flex', gap: '1rem' }}>
                                                                        <Avatar firstName={c.user?.firstName} lastName={c.user?.lastName} size={36} />
                                                                        <div style={{ flex: 1 }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: 2 }}>
                                                                                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }}>{c.user?.firstName} {c.user?.lastName}</span>
                                                                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                                                                            </div>
                                                                            <div style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 }}>{c.content}</div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {comments.length === 0 && (
                                                                    <div style={{ textAlign: 'center', padding: '2rem', background: '#fafbfc', borderRadius: 16, border: '1px dashed #e2e8f0' }}>
                                                                        <MessageSquare size={24} color="#cbd5e1" style={{ marginBottom: '0.5rem' }} />
                                                                        <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>No comments yet. Start the conversation!</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.3s ease-out' }}>
                                                        {submissions.length === 0 ? (
                                                            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#fafbfc', borderRadius: 20, border: '2px dashed #e2e8f0' }}>
                                                                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                                                    <Users size={32} color="#94a3b8" />
                                                                </div>
                                                                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>No submissions yet</h4>
                                                                <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '300px', margin: '0 auto' }}>Wait for students to upload their work for this assignment.</p>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'grid', gap: '1rem' }}>
                                                                {submissions.map((s: any) => (
                                                                    <div key={s.id} style={{
                                                                        padding: '1.25rem 1.5rem', background: '#fff', borderRadius: 20,
                                                                        border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all .2s'
                                                                    }}
                                                                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(59,130,246,0.06)'; }}
                                                                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; }}
                                                                    >
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                                                            <Avatar firstName={s.student?.firstName} lastName={s.student?.lastName} size={48} />
                                                                            <div>
                                                                                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{s.student?.firstName} {s.student?.lastName}</div>
                                                                                <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                                                    <Clock size={14} />
                                                                                    Submitted {new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                                            {s.filePath && (
                                                                                <button onClick={(e) => { e.stopPropagation(); handlePreview('submission', s.id, s.fileName); }} style={{
                                                                                    padding: '0.7rem 1.25rem', borderRadius: 12, background: '#f8fafc',
                                                                                    border: '1px solid #e2e8f0', fontSize: '0.88rem', fontWeight: 700,
                                                                                    cursor: 'pointer', color: '#475569', transition: 'all .2s',
                                                                                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                                                                                }}
                                                                                    onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                                                                                    onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; }}
                                                                                >
                                                                                    <FileText size={16} color="#3b82f6" />
                                                                                    View Work
                                                                                </button>
                                                                            )}
                                                                            <button onClick={(e) => { e.stopPropagation(); setGradingId(s.id); setGradeVal(s.grade || ''); }} style={{
                                                                                padding: '0.7rem 1.5rem', borderRadius: 12, background: s.grade ? '#eff6ff' : '#3b82f6',
                                                                                color: s.grade ? '#3b82f6' : '#fff', border: 'none', fontSize: '0.88rem', fontWeight: 800,
                                                                                cursor: 'pointer', transition: 'all .2s',
                                                                                boxShadow: s.grade ? 'none' : '0 4px 12px rgba(59,130,246,0.3)'
                                                                            }}
                                                                                onMouseEnter={e => { if (!s.grade) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                                                                onMouseLeave={e => { if (!s.grade) e.currentTarget.style.transform = 'none'; }}
                                                                            >
                                                                                {s.grade ? `Graded: ${s.grade}%` : 'Grade Now'}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
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
                                            <Avatar firstName={en.student?.firstName} lastName={en.student?.lastName} size={32} />
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

                        {/* Assignments Summary */}
                        <div id="assignments-sidebar" style={{ background: '#fff', borderRadius: 22, padding: '1.5rem', border: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', margin: 0 }}>Active Assignments</h3>
                                <div style={{ width: 32, height: 32, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FileText size={16} color="#3b82f6" />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {assignments.slice(0, 3).map(a => (
                                    <div key={a.id} onClick={() => { toggleExpand(a); document.getElementById('assignments-section')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ padding: '0.75rem', borderRadius: 12, border: '1px solid #f8fafc', background: '#f8fafc', cursor: 'pointer' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.2rem' }}>{a.title}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{a.dueDate ? `Due ${new Date(a.dueDate).toLocaleDateString()}` : 'No due date'}</div>
                                    </div>
                                ))}
                                {assignments.length === 0 && <p style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>No active assignments</p>}
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowModal(false)}>
                    <div style={{ position: 'relative', background: '#fff', width: '100%', maxWidth: '650px', maxHeight: '90vh', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'scaleIn 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
                        
                        {/* Header */}
                        <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Create New Material</h3>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0' }}>Share resources and assignments with your students</p>
                            </div>
                            <button onClick={() => setShowModal(false)} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#fff', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            <div className="modal-scroll-area" style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
                                {/* Type Selection Chips */}
                                <div style={{ marginBottom: '2rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>What are you posting?</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                                        {[
                                            { id: 'file', label: 'Document', icon: <FileText size={18} />, color: '#ef4444' },
                                            { id: 'link', label: 'Link/Video', icon: <Play size={18} />, color: '#8b5cf6' },
                                            { id: 'announcement', label: 'Notice', icon: <Bell size={18} />, color: '#f59e0b' },
                                            { id: 'assignment', label: 'Assignment', icon: <BookOpen size={18} />, color: '#3b82f6' },
                                        ].map(t => (
                                            <div key={t.id} onClick={() => { setForm({ ...form, type: t.id }); setFile(null); }} style={{
                                                padding: '1rem', borderRadius: 16, border: `2px solid ${form.type === t.id ? t.color : '#f1f5f9'}`,
                                                background: form.type === t.id ? `${t.color}08` : '#fff', cursor: 'pointer', transition: 'all .2s',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textAlign: 'center'
                                            }}>
                                                <div style={{ color: form.type === t.id ? t.color : '#94a3b8' }}>{t.icon}</div>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: form.type === t.id ? t.color : '#64748b' }}>{t.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: 800, color: '#64748b', marginBottom: 12, display: 'block', textTransform: 'uppercase', fontSize: '0.7rem' }}>Target Classrooms</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', maxHeight: '150px', overflowY: 'auto', padding: '1rem', background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                                        {courses.map(c => (
                                            <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s', background: targetCourses.includes(c.id) ? '#eff6ff' : 'transparent' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={targetCourses.includes(c.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setTargetCourses([...targetCourses, c.id]);
                                                        else setTargetCourses(targetCourses.filter(id => id !== c.id));
                                                    }}
                                                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                                                />
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: targetCourses.includes(c.id) ? '#3b82f6' : '#334155' }}>
                                                    {c.courseCode} <span style={{ fontWeight: 500, opacity: 0.6 }}>· {c.section}</span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                    {targetCourses.length === 0 && <p style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700, marginTop: -12, marginBottom: 12 }}>* Please select at least one classroom</p>}
                                </div>

                                {/* Content Inputs */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Title & Details</label>
                                        <div style={{ position: 'relative' }}>
                                            <textarea
                                                style={{
                                                    width: '100%', border: '2px solid #f1f5f9', borderRadius: 16, padding: '1rem', fontSize: '0.9rem',
                                                    resize: 'vertical', minHeight: 120, fontFamily: 'inherit', outline: 'none', transition: 'all .2s',
                                                    background: '#f8fafc'
                                                }}
                                                onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#fff'; }}
                                                onBlur={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.background = '#f8fafc'; }}
                                                placeholder={"Material Title (First line)\nDescription and instructions (Rest of lines)"}
                                                value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {form.type === 'link' && (
                                        <div style={{ animation: 'fadeIn .2s ease-out' }}>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>External URL</label>
                                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                <div style={{ position: 'absolute', left: '1rem', color: '#94a3b8' }}><LinkIcon size={18} /></div>
                                                <input
                                                    style={{
                                                        width: '100%', border: '2px solid #f1f5f9', borderRadius: 16, padding: '0.85rem 1rem 0.85rem 2.75rem',
                                                        fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit', background: '#f8fafc', transition: 'all .2s'
                                                    }}
                                                    onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#fff'; }}
                                                    onBlur={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.background = '#f8fafc'; }}
                                                    value={form.externalLink} onChange={e => setForm({ ...form, externalLink: e.target.value })}
                                                    placeholder="https://youtube.com/watch?v=..."
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {(form.type === 'file' || form.type === 'assignment') && (
                                        <div style={{ animation: 'fadeIn .2s ease-out' }}>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Attachment</label>
                                            <label style={{
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '2rem',
                                                border: '2px dashed #e2e8f0', borderRadius: 20, cursor: 'pointer', transition: 'all .2s',
                                                background: file ? '#f0f9ff' : '#fafbfc', color: file ? '#0284c7' : '#94a3b8'
                                            }}
                                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#f8fafc'; }}
                                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = file ? '#f0f9ff' : '#fafbfc'; }}
                                            >
                                                <input type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
                                                <div style={{ width: 48, height: 48, borderRadius: '50%', background: file ? '#e0f2fe' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Upload size={20} />
                                                </div>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: file ? '#0369a1' : '#475569' }}>{file ? file.name : 'Select a file to upload'}</div>
                                                    <div style={{ fontSize: '0.75rem', marginTop: 4 }}>PDF, DOCX, ZIP or Images (Max 10MB)</div>
                                                </div>
                                            </label>
                                        </div>
                                    )}

                                    {form.type === 'assignment' && (
                                        <div className="responsive-modal-grid" style={{ animation: 'fadeIn .2s ease-out' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Due Date</label>
                                                <input type="datetime-local"
                                                    style={{
                                                        width: '100%', border: '2px solid #f1f5f9', borderRadius: 16, padding: '0.85rem 1rem',
                                                        fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit', background: '#f8fafc'
                                                    }}
                                                    value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Points</label>
                                                <input type="number" defaultValue="100"
                                                    style={{
                                                        width: '100%', border: '2px solid #f1f5f9', borderRadius: 16, padding: '0.85rem 1rem',
                                                        fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit', background: '#f8fafc'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', padding: '1.5rem 2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
                                <button type="button" onClick={() => setShowModal(false)} disabled={submitting}
                                    style={{ padding: '0.85rem 1.75rem', borderRadius: 16, border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}>Discard</button>
                                <button type="submit" disabled={submitting}
                                    style={{
                                        padding: '0.85rem 2.5rem', borderRadius: 16, border: 'none', background: '#3b82f6', color: '#fff',
                                        fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit',
                                        boxShadow: '0 8px 20px rgba(59,130,246,0.3)', transition: 'all .2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                >{submitting ? 'Publishing...' : 'Publish Material'}</button>
                            </div>
                        </form>
                    </div>
                    <style>{`
                        @keyframes modalIn {
                            from { opacity: 0; transform: scale(0.95) translateY(20px); }
                            to { opacity: 1; transform: scale(1) translateY(0); }
                        }
                        @keyframes fadeIn {
                            from { opacity: 0; transform: translateY(10px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>
                </div>
            )}

            {/* Forward Modal */}
            {showForward && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1001, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.4)', backdropFilter: 'blur(6px)' }} onClick={() => setShowForward(false)} />
                    <div className="modal-window-responsive" style={{ position: 'relative', zIndex: 1, background: '#fff', borderRadius: 24, padding: '2rem', width: '100%', maxWidth: 420, boxShadow: '0 25px 60px rgba(0,0,0,.18)' }}>
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
            {/* File Preview Modal */}
            {/* ── Grading Modal ── */}
            {gradingId && (
                <div className="modal-overlay" onClick={() => setGradingId(null)} style={{ zIndex: 1000 }}>
                    <div className="modal shadow-xl animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', borderRadius: '24px' }}>
                        <div className="modal-header" style={{ border: 'none', paddingBottom: 0 }}>
                            <h3 className="modal-title" style={{ fontSize: '1.5rem', fontWeight: 900 }}>Grade Submission</h3>
                            <button className="modal-close" onClick={() => setGradingId(null)}><X size={20} /></button>
                        </div>
                        <div style={{ padding: '0 2rem 2rem' }}>
                            <div className="form-group" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                                <label className="form-label" style={{ fontWeight: 800, color: '#64748b', marginBottom: '1rem', display: 'block' }}>GRADE (0-100)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={gradeVal}
                                    onChange={e => setGradeVal(e.target.value)}
                                    placeholder="0"
                                    autoFocus
                                    style={{
                                        fontSize: '3rem', fontWeight: 900, textAlign: 'center', height: '100px',
                                        borderRadius: '20px', border: '2px solid #e2e8f0', color: '#3b82f6',
                                        background: '#f8fafc'
                                    }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 800, color: '#64748b' }}>FEEDBACK</label>
                                <textarea
                                    className="form-input"
                                    value={feedbackVal}
                                    onChange={e => setFeedbackVal(e.target.value)}
                                    placeholder="Provide constructive feedback..."
                                    style={{ minHeight: '120px', borderRadius: '16px', padding: '1rem', lineHeight: '1.6' }}
                                />
                            </div>
                            <div className="modal-actions" style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem' }}>
                                <button className="btn btn-secondary" onClick={() => setGradingId(null)} style={{ flex: 1, borderRadius: '14px', fontWeight: 700 }}>Cancel</button>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleGrade(gradingId, gradeVal, feedbackVal)}
                                    disabled={!gradeVal || submitting}
                                    style={{ flex: 2, borderRadius: '14px', fontWeight: 800, background: '#3b82f6', boxShadow: '0 8px 20px rgba(59,130,246,0.3)' }}
                                >
                                    {submitting ? 'Submitting...' : 'Confirm Grade'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {previewUrl && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 2100, display: 'flex', flexDirection: 'column', background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)', animation: 'fadeIn 0.2s' }}>
                    <div style={{ padding: '1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <FileText size={20} color="#3b82f6" />
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{previewName}</h3>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => { const a = document.createElement('a'); a.href = previewUrl; a.download = previewName; a.click(); }} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Download size={16} /> Download</button>
                            <button onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', fontWeight: 700, cursor: 'pointer' }}>Close Preview</button>
                        </div>
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
                        {previewType === 'image' ? (
                            <img src={previewUrl} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} alt="Preview" />
                        ) : previewType === 'pdf' ? (
                            <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 'none', background: '#fff', borderRadius: 8, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} title="PDF Preview" />
                        ) : (
                            <div style={{ textAlign: 'center', color: '#fff' }}>
                                <FileText size={64} color="#3b82f6" style={{ marginBottom: '1rem' }} />
                                <p>Preview not available for this file type.</p>
                                <button onClick={() => { const a = document.createElement('a'); a.href = previewUrl; a.download = previewName; a.click(); }} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem 2rem', fontWeight: 700, cursor: 'pointer', marginTop: '1rem' }}>Download to View</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default TeacherMaterials;
