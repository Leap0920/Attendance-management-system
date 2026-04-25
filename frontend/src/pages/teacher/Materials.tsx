import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Avatar from '../../components/Avatar';
import { teacherApi, fileApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { showAlert, showConfirm, showApiError } from '../../utils/feedback';
import { Search, Bell, FileText, Play, Link as LinkIcon, Download, Plus, Share, Trash2, X, Upload, BookOpen, ArrowUpRight, ChevronRight, ChevronDown, Edit2, Users } from 'lucide-react';

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
    file:         { color: '#ef4444', bg: '#fef2f2', label: 'PDF Document',   icon: <FileText size={20} color="#ef4444" /> },
    link:         { color: '#10b981', bg: '#ecfdf5', label: 'External Link',  icon: <LinkIcon size={20} color="#10b981" /> },
    announcement: { color: '#f59e0b', bg: '#fffbeb', label: 'Announcement',   icon: <Bell size={20} color="#f59e0b" /> },
    assignment:   { color: '#3b82f6', bg: '#eff6ff', label: 'Assignment',     icon: <FileText size={20} color="#3b82f6" /> },
    video:        { color: '#8b5cf6', bg: '#f5f3ff', label: 'Video Lecture',  icon: <Play size={20} color="#8b5cf6" /> },
};

const figureOutType = (m: any) => {
    const link = m.externalLink || m.external_link || '';
    if (m.type === 'link' && link && (link.toLowerCase().includes('youtube') || link.toLowerCase().includes('youtu.be'))) return 'video';
    return m.type;
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
    const menuRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Inline expand (replaces modal)
    const [expandedId, setExpandedId] = useState<number | null>(null);
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

    const toggleExpand = async (m: any) => {
        if (expandedId === m.id) { setExpandedId(null); return; }
        setExpandedId(m.id);
        setDetailTab('instructions');
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
            setShowAll(false);
            setShowAllAssignments(false);
            setExpandedId(null);
            teacherApi.getCourse(selectedCourse).then(r => {
                setEnrollments(r.data?.data?.enrollments || []);
            }).catch(() => setEnrollments([]));
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

    const nonAssignments = filtered.filter(m => m.type !== 'assignment');
    const displayMaterials = showAll ? nonAssignments : nonAssignments.slice(0, 5);
    const assignments = materials.filter(m => m.type === 'assignment');
    const displayAssignments = showAllAssignments ? assignments : assignments.slice(0, 4);

    /* ── Handlers ────────────────────────────────────────────── */
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        const lines = form.content.split('\n');
        const title = lines[0].trim();
        const description = lines.slice(1).join('\n').trim();
        if (!title) { showAlert('Error', 'Please enter a title', 'error'); return; }
        if (!selectedCourse) { showAlert('Error', 'No course selected', 'error'); return; }
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
                if (expandedId === id) setExpandedId(null);
                if (selectedCourse) loadMaterials(selectedCourse);
                showAlert('Deleted', 'Material removed.', 'error');
            } catch (err: any) { showApiError(err); }
        });
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

    const handleGrade = async (subId: number, grade: string, feedback: string) => {
        try {
            await teacherApi.gradeSubmission(subId, { grade, feedback });
            if (expandedId) { const r = await teacherApi.getSubmissions(expandedId); setSubmissions(r.data.data || []); }
            showAlert('Graded', 'Submission graded successfully!');
            setGradingId(null);
        } catch (err: any) { showApiError(err); }
    };



    /* ══════════════════════════════════════════════════════════
       RENDER
       ══════════════════════════════════════════════════════════ */
    return (
        <DashboardLayout role="teacher">
            {/* ── Top Navigation Bar ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1.25rem 2.5rem', borderBottom: '1px solid #f1f5f9', marginBottom: '2.5rem',
                position: 'sticky', top: 0, zIndex: 10, background: '#fff',
                borderRadius: '20px', marginTop: '1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
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
                                <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.35rem', letterSpacing: '-0.03em' }}>Academic Repository</h2>
                                <p style={{ fontSize: '1.05rem', color: '#64748b' }}>Curated materials for <strong style={{ color: '#3b82f6', fontWeight: 800 }}>{activeCourseData?.courseName || activeCourseData?.courseCode || 'this course'}</strong>.</p>
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
                                                    <span style={{ color: tc.color }}>{tc.label}</span>
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
                                                {/* Video embed */}
                                                {m.type === 'link' && mLink && <VideoPreview url={mLink} />}
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
                            {nonAssignments.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '3rem', background: '#fafbfc', borderRadius: 18, border: '2px dashed #e2e8f0' }}>
                                    <BookOpen size={32} color="#cbd5e1" style={{ marginBottom: '0.75rem' }} />
                                    <p style={{ color: '#94a3b8', fontWeight: 600 }}>No materials in this category.</p>
                                </div>
                            )}
                        </div>

                        <div style={{ borderTop: '1px solid #f1f5f9', marginBottom: '2rem' }} />

                        {/* Active Assignments */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Active Assignments ({assignments.length})</h2>
                            {assignments.length > 4 && <span onClick={() => setShowAllAssignments(!showAllAssignments)} style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3b82f6', cursor: 'pointer' }}>{showAllAssignments ? 'Show Less' : 'View All'}</span>}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                            {displayAssignments.map(m => {
                                const isUrgent = m.dueDate && new Date(m.dueDate).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;
                                const isPast = m.dueDate && new Date(m.dueDate) < new Date();
                                return (
                                    <div key={m.id} onClick={() => toggleExpand(m)} style={{
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

                        {/* Instructor Dashboard */}
                        <div style={{
                            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                            borderRadius: 22, padding: '1.5rem', color: '#fff', position: 'relative', overflow: 'hidden',
                            boxShadow: '0 10px 30px rgba(15,23,42,.15)'
                        }}>
                            <div style={{ position: 'absolute', right: -20, bottom: -20, width: 100, height: 100, background: 'rgba(59,130,246,.15)', borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none' }} />
                            <div style={{ position: 'absolute', left: -20, top: -20, width: 80, height: 80, background: 'rgba(34,211,238,.1)', borderRadius: '50%', filter: 'blur(20px)', pointerEvents: 'none' }} />
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(59,130,246,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Users size={16} color="#3b82f6" />
                                </div>
                                <h3 style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,.6)', margin: 0 }}>TEACHER DASHBOARD</h3>
                            </div>
                            
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.75rem', lineHeight: 1.2 }}>Enhance Your <span style={{ color: '#3b82f6' }}>Classroom</span></h2>
                            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,.7)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                                Share resources, track student progress, and manage assignments in real-time.
                            </p>
                            
                            <button onClick={() => setShowModal(true)} style={{
                                width: '100%', padding: '0.85rem', borderRadius: 14, border: 'none',
                                background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                                fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem',
                                transition: 'all .2s', boxShadow: '0 4px 12px rgba(59,130,246,.3)'
                            }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                <Plus size={18} /> Create Material
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}


            {/* Create Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.4)', backdropFilter: 'blur(8px)' }} onClick={() => setShowModal(false)} />
                    <div style={{ 
                        position: 'relative', zIndex: 1, background: '#fff', borderRadius: 28, width: '100%', maxWidth: 650, 
                        boxShadow: '0 30px 70px rgba(0,0,0,.2)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                        animation: 'modalIn .3s ease-out'
                    }}>
                        {/* Header */}
                        <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Create New Material</h3>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0' }}>Share resources and assignments with your students</p>
                            </div>
                            <button onClick={() => setShowModal(false)} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#fff', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleCreate} style={{ padding: '2rem', maxHeight: '75vh', overflowY: 'auto' }}>
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
                                            value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required 
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
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', animation: 'fadeIn .2s ease-out' }}>
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

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2.5rem' }}>
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
