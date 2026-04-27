import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Avatar from '../../components/Avatar';
import { teacherApi, fileApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { showAlert, showConfirm, showApiError } from '../../utils/feedback';
import { Search, Bell, FileText, Download, Plus, Share, Trash2, X, Upload, BookOpen, ArrowUpRight, ChevronRight, ChevronDown, Users, Clock, MessageSquare } from 'lucide-react';

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

const TeacherAssignments: React.FC = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [courses, setCourses] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<number | null>(Number(searchParams.get('courseId')) || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ content: '', dueDate: '' });
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const menuRef = useRef<HTMLDivElement>(null);

    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [detailTab, setDetailTab] = useState<'instructions' | 'submissions'>('instructions');

    const [gradingId, setGradingId] = useState<number | null>(null);
    const [gradeVal, setGradeVal] = useState('');
    const [feedbackVal, setFeedbackVal] = useState('');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    const loadAssignments = (id: number) => {
        teacherApi.getMaterials(id).then(r => {
            const all = r.data.data || [];
            setAssignments(all.filter((m: any) => m.type === 'assignment'));
        }).catch(() => {});
    };

    const toggleExpand = async (m: any) => {
        if (expandedId === m.id) { setExpandedId(null); return; }
        setExpandedId(m.id);
        setDetailTab('instructions');
        setNewComment('');
        setGradingId(null);
        try { const r = await teacherApi.getComments(m.id); setComments(r.data.data || []); } catch {}
        try { const r = await teacherApi.getSubmissions(m.id); setSubmissions(r.data.data || []); } catch {}
    };

    useEffect(() => { load(); }, []);
    useEffect(() => {
        if (selectedCourse) {
            setSearchParams({ courseId: selectedCourse.toString() }, { replace: true });
            loadAssignments(selectedCourse);
            setExpandedId(null);
            teacherApi.getCourse(selectedCourse).then(r => {
                setEnrollments(r.data?.data?.enrollments || []);
            }).catch(() => setEnrollments([]));
        }
    }, [selectedCourse]);

    const activeCourseData = courses.find(c => c.id === selectedCourse);

    const filtered = assignments.filter(m => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return m.title?.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q);
        }
        return true;
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        const lines = form.content.split('\n');
        let title = lines[0].trim();
        const description = lines.slice(1).join('\n').trim();

        if (!title && file) title = file.name;
        if (!title) { showAlert('Error', 'Please enter a title or attach a file', 'error'); return; }
        if (!selectedCourse) { showAlert('Error', 'No course selected', 'error'); return; }
        
        setSubmitting(true);
        const fd = new FormData();
        fd.append('courseIds', String(selectedCourse));
        fd.append('type', 'assignment');
        fd.append('title', title);
        if (description) fd.append('description', description);
        if (form.dueDate) fd.append('dueDate', form.dueDate);
        if (file) fd.append('file', file);
        try {
            await teacherApi.createMaterial(fd);
            setShowModal(false);
            setForm({ content: '', dueDate: '' });
            setFile(null);
            if (selectedCourse) loadAssignments(selectedCourse);
            showAlert('Success', 'Assignment posted!');
        } catch (err: any) { showApiError(err); } finally { setSubmitting(false); }
    };

    const handleDelete = (id: number) => {
        showConfirm('Delete Assignment', 'Are you sure you want to delete this assignment and all submissions?', async () => {
            try {
                await teacherApi.deleteMaterial(id);
                if (expandedId === id) setExpandedId(null);
                if (selectedCourse) loadAssignments(selectedCourse);
                showAlert('Deleted', 'Assignment removed.', 'error');
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

    return (
        <DashboardLayout role="teacher">
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1rem 2.5rem', borderBottom: '1px solid #f1f5f9', marginBottom: '2.5rem',
                position: 'sticky', top: '0.5rem', zIndex: 10, background: '#fff', marginTop: '-1.9rem',
                borderRadius: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5rem' }}>
                    <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#3b82f6', margin: 0, letterSpacing: '-0.04em', cursor: 'pointer' }} onClick={() => navigate('/teacher/dashboard')}>Assignments</h1>
                    <nav style={{ display: 'flex', gap: '3rem', fontSize: '0.9rem', fontWeight: 700, alignItems: 'center' }}>
                        <span style={{ color: '#3b82f6', borderBottom: '3px solid #3b82f6', paddingBottom: 6, cursor: 'pointer' }}>Manage</span>
                        <div style={{ position: 'relative' }} ref={menuRef}>
                            <div style={{ color: isMenuOpen ? '#3b82f6' : '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', background: isMenuOpen ? '#eff6ff' : 'transparent', padding: '4px 8px', borderRadius: '8px', transition: 'all 0.2s' }} onClick={() => setIsMenuOpen(!isMenuOpen)}>
                                <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeCourseData?.courseCode || 'Switch Classroom'}</span>
                                <ChevronRight size={14} style={{ transform: isMenuOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                            </div>
                            {isMenuOpen && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '10px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.12)', width: '280px', padding: '8px', zIndex: 100 }}>
                                    <div style={{ padding: '8px 12px', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Classrooms</div>
                                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        {courses.map(c => (
                                            <div key={c.id} onClick={() => { setSelectedCourse(c.id); setIsMenuOpen(false); }} style={{ padding: '10px 12px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s', background: selectedCourse === c.id ? '#eff6ff' : 'transparent', color: selectedCourse === c.id ? '#3b82f6' : '#334155', display: 'flex', flexDirection: 'column', gap: '2px' }}>
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
                        <input style={{ background: '#f1f5f9', border: 'none', borderRadius: 999, padding: '0.5rem 1rem 0.5rem 2.2rem', fontSize: '0.85rem', width: 240, outline: 'none', fontFamily: 'inherit', fontWeight: 500 }} placeholder="Search assignments…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <Avatar avatarUrl={user?.avatar} firstName={user?.firstName} lastName={user?.lastName} size={36} />
                </div>
            </div>

            {loading ? (
                <div className="loading-screen" style={{ padding: '5rem 0' }}><div className="spinner" style={{ marginBottom: '1rem' }} /><p style={{ color: '#94a3b8' }}>Loading assignments...</p></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>Assignments</h2>
                                <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>Review and grade work for <strong>{activeCourseData?.courseName || activeCourseData?.courseCode}</strong>.</p>
                            </div>
                            <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: '0.85rem', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                                <Plus size={16} /> New Assignment
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {filtered.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '5rem', background: '#fafbfc', borderRadius: 24, border: '2px dashed #e2e8f0' }}>
                                    <BookOpen size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>No assignments yet</h3>
                                    <p style={{ color: '#64748b' }}>Create your first assignment to start tracking student progress.</p>
                                </div>
                            ) : (
                                filtered.map(m => {
                                    const isUrgent = m.dueDate && new Date(m.dueDate).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;
                                    const isPast = m.dueDate && new Date(m.dueDate) < new Date();
                                    const isExpanded = expandedId === m.id;
                                    return (
                                        <div key={m.id} style={{ borderRadius: 20, border: `1px solid ${isExpanded ? '#3b82f6' : '#f1f5f9'}`, overflow: 'hidden', background: '#fff', transition: 'all .2s', boxShadow: isExpanded ? '0 10px 25px rgba(59,130,246,.08)' : '0 1px 3px rgba(0,0,0,0.04)' }}>
                                            <div onClick={() => toggleExpand(m)} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.15rem 1.5rem', background: isExpanded ? '#f8fafc' : '#fff', cursor: 'pointer', borderLeft: `6px solid ${isPast ? '#ef4444' : isUrgent ? '#f97316' : '#3b82f6'}` }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 4 }}>
                                                        <span style={{ fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 6, background: isPast ? '#fef2f2' : isUrgent ? '#fff7ed' : '#eff6ff', color: isPast ? '#dc2626' : isUrgent ? '#ea580c' : '#2563eb' }}>{isPast ? 'OVERDUE' : isUrgent ? 'URGENT' : 'OPEN'}</span>
                                                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={12} /> {m.dueDate ? `Due ${new Date(m.dueDate).toLocaleDateString()}` : 'No deadline'}</span>
                                                    </div>
                                                    <h3 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0, color: '#0f172a' }}>{m.title}</h3>
                                                </div>
                                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: isExpanded ? '#eff6ff' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isExpanded ? '#3b82f6' : '#94a3b8', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                                    <ChevronDown size={20} />
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div style={{ padding: '2rem', background: '#fff', borderTop: '1px solid #f1f5f9' }}>
                                                    <div style={{ display: 'flex', gap: '2rem', borderBottom: '2px solid #f1f5f9', marginBottom: '2rem' }}>
                                                        {['Instructions', 'Submissions'].map(t => {
                                                            const active = detailTab === t.toLowerCase();
                                                            return (
                                                                <button key={t} onClick={(e) => { e.stopPropagation(); setDetailTab(t.toLowerCase() as any); }} style={{ padding: '0.6rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: active ? '#3b82f6' : '#94a3b8', borderBottom: `2px solid ${active ? '#3b82f6' : 'transparent'}`, marginBottom: -2, transition: 'all .2s', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                    {t === 'Instructions' ? <FileText size={16} /> : <Users size={16} />}
                                                                    {t} {t === 'Submissions' && <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: 999, background: active ? '#eff6ff' : '#f1f5f9', color: active ? '#3b82f6' : '#64748b' }}>{submissions.length}</span>}
                                                                </button>
                                                            );
                                                        })}
                                                        <div style={{ flex: 1 }} />
                                                        <button onClick={() => handleDelete(m.id)} style={{ padding: '0 1rem', background: 'none', border: 'none', color: '#ef4444', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Trash2 size={16} /> Delete</button>
                                                    </div>

                                                    {detailTab === 'instructions' ? (
                                                        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                                            {m.description && <div style={{ fontSize: '1.05rem', color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: 16, border: '1px solid #f1f5f9' }}>{m.description}</div>}
                                                            {m.fileName && <FileCard fileName={m.fileName} fileSize={m.fileSize} onDownload={() => downloadFile('material', m.id, m.fileName)} />}
                                                            <div style={{ marginTop: '2.5rem' }}>
                                                                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>Discussion</h4>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                                                    {comments.map((c: any) => (
                                                                        <div key={c.id} style={{ display: 'flex', gap: '1rem' }}>
                                                                            <Avatar firstName={c.user?.firstName} lastName={c.user?.lastName} size={36} />
                                                                            <div style={{ flex: 1 }}>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: 2 }}>
                                                                                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }}>{c.user?.firstName} {c.user?.lastName}</span>
                                                                                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                                                                                </div>
                                                                                <div style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 }}>{c.content}</div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                                                        <Avatar firstName={user?.firstName} lastName={user?.lastName} size={36} />
                                                                        <div style={{ flex: 1, position: 'relative' }}>
                                                                            <input style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 12, padding: '0.75rem 3.5rem 0.75rem 1rem', fontSize: '0.9rem', outline: 'none' }} placeholder="Add a comment..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }} />
                                                                            <button onClick={handleAddComment} disabled={!newComment.trim()} style={{ position: 'absolute', right: '0.5rem', top: '0.5rem', bottom: '0.5rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '0 1rem', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', opacity: newComment.trim() ? 1 : 0.5 }}>Post</button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.3s ease-out' }}>
                                                            {submissions.length === 0 ? (
                                                                <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#fafbfc', borderRadius: 20, border: '2px dashed #e2e8f0' }}>
                                                                    <Users size={32} color="#94a3b8" style={{ marginBottom: '1rem' }} />
                                                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>No submissions yet</h4>
                                                                    <p style={{ color: '#64748b' }}>Students haven't uploaded any work yet.</p>
                                                                </div>
                                                            ) : (
                                                                <div style={{ display: 'grid', gap: '1rem' }}>
                                                                    {submissions.map((s: any) => (
                                                                        <div key={s.id} style={{ padding: '1.25rem 1.5rem', background: '#fff', borderRadius: 20, border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                                                                <Avatar firstName={s.student?.firstName} lastName={s.student?.lastName} size={48} />
                                                                                <div>
                                                                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{s.student?.firstName} {s.student?.lastName}</div>
                                                                                    <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={14} /> {new Date(s.createdAt).toLocaleString()}</div>
                                                                                </div>
                                                                            </div>
                                                                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                                                {s.filePath && <button onClick={() => downloadFile('submission', s.id, s.fileName)} style={{ padding: '0.7rem 1.25rem', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Download size={16} /> Download</button>}
                                                                                <button onClick={() => { setGradingId(s.id); setGradeVal(s.grade || ''); setFeedbackVal(s.feedback || ''); }} style={{ padding: '0.6rem 1.25rem', borderRadius: 10, background: s.grade ? '#eff6ff' : '#3b82f6', color: s.grade ? '#3b82f6' : '#fff', border: 'none', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>{s.grade ? `Graded: ${s.grade}%` : 'Grade Now'}</button>
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
                                })
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ background: '#fff', borderRadius: 20, padding: '1.5rem', border: '1px solid #f1f5f9' }}>
                            <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: '1rem' }}>Class Stats</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: 12 }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Assignments</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{assignments.length}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: 12 }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Students</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{enrollments.length}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Grading Modal */}
            {gradingId && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(4px)' }} onClick={() => setGradingId(null)} />
                    <div style={{ position: 'relative', background: '#fff', borderRadius: 24, padding: '2rem', width: '100%', maxWidth: 450, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>Grade Submission</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Grade (0-100)</label>
                                <input type="number" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 12, border: '1px solid #e2e8f0', outline: 'none' }} value={gradeVal} onChange={e => setGradeVal(e.target.value)} placeholder="Enter grade..." />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Feedback (Optional)</label>
                                <textarea style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 12, border: '1px solid #e2e8f0', outline: 'none', minHeight: 100 }} value={feedbackVal} onChange={e => setFeedbackVal(e.target.value)} placeholder="Write feedback..." />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                <button onClick={() => setGradingId(null)} style={{ flex: 1, padding: '0.75rem', borderRadius: 12, border: 'none', background: '#f1f5f9', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                                <button onClick={() => handleGrade(gradingId, gradeVal, feedbackVal)} style={{ flex: 1, padding: '0.75rem', borderRadius: 12, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Submit Grade</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(8px)' }} onClick={() => setShowModal(false)} />
                    <div style={{ position: 'relative', background: '#fff', borderRadius: 28, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 60px rgba(0,0,0,0.2)' }}>
                        <div style={{ padding: '2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>New Assignment</h3>
                            <button onClick={() => setShowModal(false)} style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreate} style={{ padding: '2rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>Assignment Details</label>
                                    <textarea style={{ width: '100%', border: '2px solid #f1f5f9', borderRadius: 16, padding: '1rem', minHeight: 150, fontFamily: 'inherit', outline: 'none' }} placeholder={"Assignment Title (First line)\nInstructions and requirements (Rest of lines)"} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>Due Date</label>
                                        <input type="datetime-local" style={{ width: '100%', border: '2px solid #f1f5f9', borderRadius: 16, padding: '0.85rem 1rem', outline: 'none' }} value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>Max Points</label>
                                        <input type="number" defaultValue="100" style={{ width: '100%', border: '2px solid #f1f5f9', borderRadius: 16, padding: '0.85rem 1rem', outline: 'none' }} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>Handout File</label>
                                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', border: '2px dashed #e2e8f0', borderRadius: 20, cursor: 'pointer', background: file ? '#f0f9ff' : '#fafbfc' }}>
                                        <input type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
                                        <Upload size={24} color={file ? '#3b82f6' : '#94a3b8'} style={{ marginBottom: 8 }} />
                                        <div style={{ fontWeight: 700, color: file ? '#3b82f6' : '#475569' }}>{file ? file.name : 'Upload instruction file'}</div>
                                    </label>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2.5rem' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.85rem 1.5rem', borderRadius: 12, border: 'none', background: '#f1f5f9', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" disabled={submitting} style={{ padding: '0.85rem 2.5rem', borderRadius: 12, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>{submitting ? 'Creating...' : 'Post Assignment'}</button>
                            </div>
                        </form>
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

export default TeacherAssignments;
