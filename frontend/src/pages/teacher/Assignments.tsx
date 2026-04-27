import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Avatar from '../../components/Avatar';
import { teacherApi, fileApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { showAlert, showConfirm, showApiError } from '../../utils/feedback';
import { Search, FileText, Download, Plus, X, Upload, ArrowUpRight, ChevronRight, Users, Clock, Filter, CheckCircle2, AlertCircle, History, Trash2 } from 'lucide-react';

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
    const [statusFilter, setStatusFilter] = useState<'all' | 'urgent' | 'done' | 'overdue'>('all');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ content: '', dueDate: '' });
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [targetCourses, setTargetCourses] = useState<number[]>([]);
    const menuRef = useRef<HTMLDivElement>(null);

    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [detailTab, setDetailTab] = useState<'instructions' | 'submissions'>('instructions');

    const [gradingId, setGradingId] = useState<number | null>(null);
    const [gradeVal, setGradeVal] = useState('');
    const [feedbackVal, setFeedbackVal] = useState('');
    const [submissionFilter, setSubmissionFilter] = useState<'all' | 'submitted' | 'missing' | 'graded'>('all');
    const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewType, setPreviewType] = useState<'image' | 'pdf' | 'other' | null>(null);
    const [previewName, setPreviewName] = useState('');

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

    const handleViewAssignment = async (m: any) => {
        setSelectedAssignment(m);
        setDetailTab('instructions');
        setNewComment('');
        setGradingId(null);
        setSubmissionFilter('all');
        try { const r = await teacherApi.getComments(m.id); setComments(r.data.data || []); } catch {}
        try { const r = await teacherApi.getSubmissions(m.id); setSubmissions(r.data.data || []); } catch {}
    };

    const getFullSubmissionList = () => {
        return enrollments.map(e => {
            const student = e.student;
            const sub = submissions.find(s => s.student?.id === student.id);
            let status: 'missing' | 'submitted' | 'graded' = 'missing';
            if (sub) {
                status = (sub.grade !== null && sub.grade !== undefined) ? 'graded' : 'submitted';
            }
            return { student, submission: sub, status };
        }).filter(item => {
            if (submissionFilter === 'all') return true;
            if (submissionFilter === 'submitted') return item.status === 'submitted' || item.status === 'graded';
            if (submissionFilter === 'missing') return item.status === 'missing';
            if (submissionFilter === 'graded') return item.status === 'graded';
            return true;
        });
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
            if (!(m.title?.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q))) return false;
        }

        const isUrgent = m.dueDate && new Date(m.dueDate).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000 && new Date(m.dueDate) > new Date();
        const isPast = m.dueDate && new Date(m.dueDate) < new Date();
        const isDone = enrollments.length > 0 && (m.submissionCount || 0) >= enrollments.length;

        if (statusFilter === 'urgent') return isUrgent;
        if (statusFilter === 'overdue') return isPast;
        if (statusFilter === 'done') return isDone;

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
        fd.append('courseIds', targetCourses.join(','));
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
        if (!newComment.trim() || !selectedAssignment) return;
        try {
            await teacherApi.addComment(selectedAssignment.id, { content: newComment.trim(), isPrivate: false });
            setNewComment('');
            const r = await teacherApi.getComments(selectedAssignment.id);
            setComments(r.data.data || []);
        } catch (err: any) { showApiError(err); }
    };

    const handleGrade = async (subId: number, grade: string, feedback: string) => {
        try {
            await teacherApi.gradeSubmission(subId, { grade, feedback });
            if (selectedAssignment) { 
                const r = await teacherApi.getSubmissions(selectedAssignment.id); 
                setSubmissions(r.data.data || []); 
                if (selectedCourse) loadAssignments(selectedCourse);
            }
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
                                <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 1.25rem 0' }}>Review and grade work for <strong>{activeCourseData?.courseName || activeCourseData?.courseCode}</strong>.</p>
                                
                                <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.4rem', borderRadius: 14, width: 'fit-content' }}>
                                    {[
                                        { id: 'all', label: 'All', icon: <History size={14} /> },
                                        { id: 'urgent', label: 'Urgent', icon: <Clock size={14} /> },
                                        { id: 'overdue', label: 'Overdue', icon: <AlertCircle size={14} /> },
                                        { id: 'done', label: 'Completed', icon: <CheckCircle2 size={14} /> }
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => setStatusFilter(f.id as any)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                padding: '0.5rem 1rem', borderRadius: 10, border: 'none',
                                                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                                                transition: 'all .2s',
                                                background: statusFilter === f.id ? '#fff' : 'transparent',
                                                color: statusFilter === f.id ? '#3b82f6' : '#64748b',
                                                boxShadow: statusFilter === f.id ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
                                            }}
                                        >
                                            {f.icon} {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <button onClick={() => { setShowModal(true); setTargetCourses(selectedCourse ? [selectedCourse] : []); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: '0.85rem', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                                <Plus size={16} /> New Assignment
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {filtered.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '5rem', background: '#fafbfc', borderRadius: 24, border: '2px dashed #e2e8f0' }}>
                                    <Filter size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>No assignments found</h3>
                                    <p style={{ color: '#64748b' }}>Try changing your filter or classroom.</p>
                                </div>
                            ) : (
                                filtered.map(m => {
                                    const isUrgent = m.dueDate && new Date(m.dueDate).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000 && new Date(m.dueDate) > new Date();
                                    const isPast = m.dueDate && new Date(m.dueDate) < new Date();
                                    const isDone = enrollments.length > 0 && (m.submissionCount || 0) >= enrollments.length;
                                    
                                    return (
                                        <div key={m.id} style={{ borderRadius: 16, border: '1px solid #f1f5f9', overflow: 'hidden', background: '#fff', transition: 'all .3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', animation: 'slideUp 0.4s ease-out forwards' }}>
                                            <div onClick={() => handleViewAssignment(m)} 
                                                onMouseEnter={e => { e.currentTarget.parentElement!.style.transform = 'translateY(-2px)'; e.currentTarget.parentElement!.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
                                                onMouseLeave={e => { e.currentTarget.parentElement!.style.transform = 'translateY(0)'; e.currentTarget.parentElement!.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
                                                style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.15rem 1.5rem', background: '#fff', cursor: 'pointer', borderLeft: `6px solid ${isDone ? '#10b981' : isPast ? '#ef4444' : isUrgent ? '#f97316' : '#3b82f6'}` }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 4 }}>
                                                        {(isDone || isPast || isUrgent) && (
                                                            <span style={{ fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 6, background: isDone ? '#f0fdf4' : isPast ? '#fef2f2' : isUrgent ? '#fff7ed' : '#eff6ff', color: isDone ? '#10b981' : isPast ? '#dc2626' : isUrgent ? '#ea580c' : '#2563eb' }}>
                                                                {isDone ? 'COMPLETED' : isPast ? 'OVERDUE' : isUrgent ? 'URGENT' : ''}
                                                            </span>
                                                        )}
                                                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={12} /> {m.dueDate ? `Due ${new Date(m.dueDate).toLocaleDateString()}` : 'No deadline'}</span>
                                                    </div>
                                                    <h3 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0, color: '#0f172a' }}>{m.title}</h3>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Submissions</div>
                                                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{m.submissionCount || 0} / {enrollments.length}</div>
                                                    </div>
                                                    <ChevronRight size={18} color="#cbd5e1" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ background: '#fff', borderRadius: 24, padding: '1.75rem', border: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <Users size={18} color="#3b82f6" />
                                <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', margin: 0 }}>Class Overview</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Total Students</span>
                                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{enrollments.length}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Active Assignments</span>
                                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{assignments.length}</span>
                                </div>
                                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                                    <button onClick={() => navigate(`/teacher/reports?courseId=${selectedCourse}`)} style={{ width: '100%', padding: '0.85rem', borderRadius: 14, border: '1px solid #3b82f6', color: '#3b82f6', background: '#fff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                        <ArrowUpRight size={16} /> View Full Report
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowModal(false)}>
                    <div style={{ position: 'relative', background: '#fff', width: '100%', maxWidth: '650px', maxHeight: '90vh', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'scaleIn 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
                        
                        {/* Header */}
                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>New Assignment</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Post instructions and materials to your sections</p>
                            </div>
                            <button onClick={() => setShowModal(false)} style={{ border: 'none', background: '#f8fafc', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}><X size={20} color="#64748b" /></button>
                        </div>

                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            {/* Scrollable Body */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }} className="modal-scroll-area">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>Title & Instructions</label>
                                        <textarea 
                                            required 
                                            style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 16, padding: '1.25rem', fontSize: '0.95rem', minHeight: 150, outline: 'none', transition: 'all 0.2s', fontFamily: 'inherit', background: '#f8fafc' }} 
                                            onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#fff'; }}
                                            onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                                            placeholder="Assignment title (first line)&#10;Detailed instructions..." 
                                            value={form.content} 
                                            onChange={e => setForm({ ...form, content: e.target.value })} 
                                        />
                                    </div>

                                    <div className="responsive-modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Due Date</label>
                                                <input 
                                                    type="datetime-local" 
                                                    style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 16, padding: '0.85rem 1.25rem', fontSize: '0.9rem', outline: 'none', background: '#f8fafc' }} 
                                                    value={form.dueDate} 
                                                    onChange={e => setForm({ ...form, dueDate: e.target.value })} 
                                                />
                                            </div>
                                            
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Target Sections</label>
                                                <div style={{ maxHeight: '160px', overflowY: 'auto', padding: '1rem', background: '#f8fafc', borderRadius: 16, border: '1.5px solid #e2e8f0' }}>
                                                    {courses.map(c => (
                                                        <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s', background: targetCourses.includes(c.id) ? '#eff6ff' : 'transparent', marginBottom: '4px' }}>
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
                                                {targetCourses.length === 0 && <p style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700, marginTop: '8px' }}>* Select at least one section</p>}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Attachment</label>
                                            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', border: '2px dashed #e2e8f0', borderRadius: 20, cursor: 'pointer', background: file ? '#f0f9ff' : '#f8fafc', transition: 'all 0.2s', flex: 1, minHeight: '180px' }}
                                                onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                                                onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                                            >
                                                <input type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
                                                <div style={{ width: 48, height: 48, borderRadius: '50%', background: file ? '#e0f2fe' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                                                    <Upload size={22} color={file ? '#3b82f6' : '#94a3b8'} />
                                                </div>
                                                <div style={{ fontWeight: 700, color: file ? '#0369a1' : '#475569', fontSize: '0.85rem', textAlign: 'center' }}>{file ? file.name : 'Upload instruction file'}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 6 }}>PDF, DOCX, ZIP or Images (10MB)</div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', padding: '1.5rem 2rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.85rem 2rem', borderRadius: 16, border: 'none', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>Cancel</button>
                                <button type="submit" disabled={submitting} style={{ padding: '0.85rem 2.5rem', borderRadius: 16, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(59,130,246,0.3)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>{submitting ? 'Creating...' : 'Create Assignment'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Full Screen Assignment Detail Modal */}
            {selectedAssignment && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: '#fff', display: 'flex', flexDirection: 'column', animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                    {/* Header */}
                    <div style={{ padding: '1rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '2rem', background: '#fff' }}>
                        <button onClick={() => setSelectedAssignment(null)} style={{ border: 'none', background: '#f1f5f9', borderRadius: 12, padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, cursor: 'pointer' }}>
                            <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} /> Back
                        </button>
                        <div style={{ flex: 1 }}>
                            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>{selectedAssignment.title}</h2>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedAssignment.dueDate ? `Due ${new Date(selectedAssignment.dueDate).toLocaleString()}` : 'No deadline'}</div>
                        </div>
                        <button onClick={() => { handleDelete(selectedAssignment.id); setSelectedAssignment(null); }} style={{ border: 'none', background: 'none', color: '#ef4444', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <Trash2 size={18} /> Delete Assignment
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 420px' }}>
                        {/* Left Side: Submissions */}
                        <div style={{ padding: '2rem', borderRight: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {(['all', 'submitted', 'missing', 'graded'] as const).map(f => (
                                        <button key={f} onClick={() => setSubmissionFilter(f)} style={{ padding: '0.4rem 1rem', borderRadius: 20, border: '1px solid', borderColor: submissionFilter === f ? '#3b82f6' : '#e2e8f0', background: submissionFilter === f ? '#3b82f6' : '#fff', color: submissionFilter === f ? '#fff' : '#64748b', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>{f}</button>
                                    ))}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>{getFullSubmissionList().length} Students</div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {getFullSubmissionList().map(({ student, submission, status }) => (
                                    <div key={student.id} style={{ padding: '1rem 1.5rem', background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <Avatar firstName={student.firstName} lastName={student.lastName} size={40} />
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{student.firstName} {student.lastName}</div>
                                                <div style={{ fontSize: '0.7rem', color: status === 'missing' ? '#ef4444' : '#10b981', fontWeight: 800, textTransform: 'uppercase' }}>
                                                    {status === 'missing' ? (
                                                        selectedAssignment.dueDate && new Date(selectedAssignment.dueDate) < new Date() ? 'MISSING' : ''
                                                    ) : status}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                            {submission ? (
                                                <>
                                                    {submission.fileName && <button onClick={() => handlePreview('submission', submission.id, submission.fileName)} style={{ padding: '0.5rem 1rem', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><FileText size={14} color="#3b82f6" /> View Work</button>}
                                                    <button onClick={() => { setGradingId(submission.id); setGradeVal(submission.grade || ''); setFeedbackVal(submission.feedback || ''); }} style={{ padding: '0.5rem 1.25rem', borderRadius: 8, background: status === 'graded' ? '#eff6ff' : '#3b82f6', color: status === 'graded' ? '#3b82f6' : '#fff', border: 'none', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>{status === 'graded' ? `Grade: ${submission.grade}%` : 'Grade Now'}</button>
                                                </>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>No submission</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {getFullSubmissionList().length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '3rem', background: '#fafbfc', borderRadius: 16, border: '1px dashed #e2e8f0' }}>
                                        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No students match this filter.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Side: Instructions & Discussion */}
                        <div style={{ padding: '2rem', background: '#fafbfc' }}>
                            <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                                <button onClick={() => setDetailTab('instructions')} style={{ paddingBottom: '0.75rem', border: 'none', background: 'none', fontSize: '0.85rem', fontWeight: 700, color: detailTab === 'instructions' ? '#3b82f6' : '#94a3b8', borderBottom: `2px solid ${detailTab === 'instructions' ? '#3b82f6' : 'transparent'}`, cursor: 'pointer' }}>Instructions</button>
                                <button onClick={() => setDetailTab('submissions')} style={{ paddingBottom: '0.75rem', border: 'none', background: 'none', fontSize: '0.85rem', fontWeight: 700, color: detailTab === 'submissions' ? '#3b82f6' : '#94a3b8', borderBottom: `2px solid ${detailTab === 'submissions' ? '#3b82f6' : 'transparent'}`, cursor: 'pointer' }}>Discussion</button>
                            </div>

                            {detailTab === 'instructions' ? (
                                <div style={{ animation: 'fadeIn 0.2s' }}>
                                    {selectedAssignment.description && <div style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '1.5rem', padding: '1rem', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>{selectedAssignment.description}</div>}
                                    {selectedAssignment.fileName && <FileCard fileName={selectedAssignment.fileName} fileSize={selectedAssignment.fileSize} onDownload={() => handlePreview('material', selectedAssignment.id, selectedAssignment.fileName)} />}
                                </div>
                            ) : (
                                <div style={{ animation: 'fadeIn 0.2s', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.85rem', overflowY: 'auto', marginBottom: '1rem', paddingRight: '0.5rem' }}>
                                        {comments.map((c: any) => (
                                            <div key={c.id} style={{ display: 'flex', gap: '0.75rem' }}>
                                                <Avatar firstName={c.user?.firstName} lastName={c.user?.lastName} size={32} />
                                                <div style={{ flex: 1, background: '#fff', padding: '0.75rem', borderRadius: '0 12px 12px 12px', border: '1px solid #e2e8f0' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                        <span style={{ fontWeight: 700, fontSize: '0.75rem' }}>{c.user?.firstName} {c.user?.lastName}</span>
                                                        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.4 }}>{c.content}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {comments.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic', marginTop: '2rem' }}>No comments yet.</p>}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 12, padding: '0.6rem 1rem', fontSize: '0.85rem', outline: 'none', background: '#fff' }} placeholder="Add a comment..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }} />
                                        <button onClick={handleAddComment} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 12, padding: '0 1rem', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>Post</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Inline Grading Modal */}
            {gradingId && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                    <div style={{ background: '#fff', width: '100%', maxWidth: 450, borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', padding: '2rem' }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', fontWeight: 800 }}>Grade Submission</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Score (0-100)</label>
                                <input type="number" min="0" max="100" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: '1rem', fontWeight: 700, outline: 'none' }} value={gradeVal} onChange={e => setGradeVal(e.target.value)} placeholder="e.g. 95" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Feedback (Optional)</label>
                                <textarea style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: '0.9rem', minHeight: 100, outline: 'none', resize: 'vertical' }} value={feedbackVal} onChange={e => setFeedbackVal(e.target.value)} placeholder="Well done! Very thorough analysis..." />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                <button onClick={() => setGradingId(null)} style={{ flex: 1, padding: '0.85rem', borderRadius: 12, border: 'none', background: '#f1f5f9', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                                <button onClick={() => handleGrade(gradingId, gradeVal, feedbackVal)} style={{ flex: 1, padding: '0.85rem', borderRadius: 12, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Save Grade</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* File Preview Modal */}
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

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.985); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </DashboardLayout>
    );
};

export default TeacherAssignments;
