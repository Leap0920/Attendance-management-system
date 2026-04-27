import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import Avatar from '../../components/Avatar';
import { studentApi, fileApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { showAlert, showApiError } from '../../utils/feedback';
import { Search, Bell, FileText, Download, Play, X, Upload, ChevronRight, ChevronDown, BookOpen, ArrowUpRight, Users, MessageSquare } from 'lucide-react';

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

const StudentAssignments: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [courses, setCourses] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<number | null>(Number(searchParams.get('courseId')) || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [privateComment, setPrivateComment] = useState('');
    const [mySubmission, setMySubmission] = useState<any | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitFile, setSubmitFile] = useState<File | null>(null);
    const [submitContent, setSubmitContent] = useState('');
    const [detailTab, setDetailTab] = useState<'instructions' | 'submissions'>('instructions');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
            studentApi.getMaterials(selectedCourse).then(r => {
                const all = Array.isArray(r.data?.data) ? r.data.data : [];
                setAssignments(all.filter((m: any) => m.type === 'assignment'));
            }).catch(() => setAssignments([]));
        }
    }, [selectedCourse]);

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
        try { 
            const r = await studentApi.getSubmission(m.id); 
            setMySubmission(r.data.data || null); 
        } catch { setMySubmission(null); }
    };

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
            showAlert('Success', 'Assignment turned in!');
            const r = await studentApi.getSubmission(expandedId);
            setMySubmission(r.data.data || null);
            setSubmitFile(null);
            setSubmitContent('');
        } catch (err: any) { showApiError(err); } finally { setSubmitting(false); }
    };

    const activeCourseData = courses.find(c => c.id === selectedCourse);
    const filtered = assignments.filter(m => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return m.title?.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q);
        }
        return true;
    });

    return (
        <DashboardLayout role="student">
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1rem 2.5rem', borderBottom: '1px solid #f1f5f9', marginBottom: '2.5rem',
                position: 'sticky', top: '0.5rem', zIndex: 10, background: '#fff', marginTop: '-1.9rem',
                borderRadius: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5rem' }}>
                    <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#3b82f6', margin: 0, letterSpacing: '-0.04em', cursor: 'pointer' }} onClick={() => navigate('/student/dashboard')}>My Assignments</h1>
                    <nav style={{ display: 'flex', gap: '3rem', fontSize: '0.9rem', fontWeight: 700, alignItems: 'center' }}>
                        <span style={{ color: '#3b82f6', borderBottom: '3px solid #3b82f6', paddingBottom: 6, cursor: 'pointer' }}>Active</span>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 999, padding: '0.65rem 1.25rem 0.65rem 2.8rem', fontSize: '0.9rem', width: 250, outline: 'none', fontFamily: 'inherit', fontWeight: 500 }} placeholder="Search assignments..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <Avatar avatarUrl={user?.avatar} firstName={user?.firstName} lastName={user?.lastName} size={42} />
                </div>
            </div>

            {loading ? (
                <div className="loading-screen" style={{ padding: '5rem 0' }}><div className="spinner" style={{ marginBottom: '1rem' }} /><p style={{ color: '#94a3b8' }}>Loading assignments...</p></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>
                    <div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>Academic Tasks</h2>
                            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>Assignments for <strong>{activeCourseData?.courseName || 'this course'}</strong>.</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {filtered.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '5rem', background: '#fafbfc', borderRadius: 24, border: '2px dashed #e2e8f0' }}>
                                    <BookOpen size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>No assignments</h3>
                                    <p style={{ color: '#64748b' }}>You're all caught up! No active assignments for this classroom.</p>
                                </div>
                            ) : (
                                filtered.map(m => {
                                    const isUrgent = m.dueDate && new Date(m.dueDate).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;
                                    const isPast = m.dueDate && new Date(m.dueDate) < new Date();
                                    const isExpanded = expandedId === m.id;
                                    return (
                                        <div key={m.id} style={{ borderRadius: 20, border: `1px solid ${isExpanded ? '#3b82f6' : '#f1f5f9'}`, overflow: 'hidden', background: '#fff', transition: 'all .2s', boxShadow: isExpanded ? '0 10px 25px rgba(59,130,246,.08)' : '0 1px 3px rgba(0,0,0,0.04)' }}>
                                            <div onClick={() => toggleExpand(m)} style={{ padding: '1.25rem', background: isExpanded ? '#f8fafc' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ width: 48, height: 48, borderRadius: 12, background: isPast ? '#fef2f2' : isUrgent ? '#fff7ed' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <BookOpen size={20} color={isPast ? '#ef4444' : isUrgent ? '#f97316' : '#3b82f6'} />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                                                        <span style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4, background: isPast ? '#fef2f2' : isUrgent ? '#fff7ed' : '#eff6ff', color: isPast ? '#dc2626' : isUrgent ? '#ea580c' : '#2563eb' }}>{isPast ? 'Overdue' : isUrgent ? 'Urgent' : 'Open'}</span>
                                                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>{m.dueDate ? `Due ${new Date(m.dueDate).toLocaleDateString()}` : 'No deadline'}</span>
                                                    </div>
                                                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>{m.title}</h4>
                                                </div>
                                                <ChevronDown size={20} color="#94a3b8" style={{ transition: 'transform .2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }} />
                                            </div>

                                            {isExpanded && (
                                                <div style={{ borderTop: '1px solid #f1f5f9', background: '#fff', display: 'grid', gridTemplateColumns: '1fr 320px' }}>
                                                    <div style={{ padding: '2rem', borderRight: '1px solid #f1f5f9' }}>
                                                        <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid #f1f5f9', marginBottom: '1.5rem' }}>
                                                            <button onClick={() => setDetailTab('instructions')} style={{ paddingBottom: '0.6rem', border: 'none', background: 'none', fontSize: '0.875rem', fontWeight: 700, color: detailTab === 'instructions' ? '#3b82f6' : '#94a3b8', borderBottom: `2px solid ${detailTab === 'instructions' ? '#3b82f6' : 'transparent'}`, cursor: 'pointer' }}>Instructions</button>
                                                            <button onClick={() => setDetailTab('submissions')} style={{ paddingBottom: '0.6rem', border: 'none', background: 'none', fontSize: '0.875rem', fontWeight: 700, color: detailTab === 'submissions' ? '#3b82f6' : '#94a3b8', borderBottom: `2px solid ${detailTab === 'submissions' ? '#3b82f6' : 'transparent'}`, cursor: 'pointer' }}>My Submission</button>
                                                        </div>

                                                        {detailTab === 'instructions' ? (
                                                            <div style={{ animation: 'fadeIn .2s' }}>
                                                                {m.description && <div style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: 16, border: '1px solid #f1f5f9' }}>{m.description}</div>}
                                                                {m.fileName && <FileCard fileName={m.fileName} fileSize={m.fileSize} onDownload={() => downloadFile('material', m.id, m.fileName)} />}
                                                                <div style={{ marginTop: '2.5rem' }}>
                                                                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>Discussion</h4>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                                                        {comments.filter(c => !c.isPrivate).map((c: any) => (
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
                                                            <div style={{ animation: 'fadeIn .2s' }}>
                                                                {mySubmission ? (
                                                                    <div style={{ background: '#f8fafc', borderRadius: 20, padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                                                            <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', padding: '4px 10px', borderRadius: 6, background: mySubmission.status === 'graded' ? '#f0fdf4' : '#eff6ff', color: mySubmission.status === 'graded' ? '#16a34a' : '#3b82f6' }}>{mySubmission.status}</span>
                                                                            {mySubmission.grade !== null && <div style={{ textAlign: 'right' }}><div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Grade</div><div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b' }}>{mySubmission.grade}/100</div></div>}
                                                                        </div>
                                                                        {mySubmission.fileName && <FileCard fileName={mySubmission.fileName} fileSize={mySubmission.fileSize} onDownload={() => downloadFile('submission', mySubmission.id, mySubmission.fileName)} />}
                                                                        {mySubmission.content && <div style={{ background: '#fff', padding: '1rem', borderRadius: 12, border: '1px solid #f1f5f9', fontSize: '0.9rem', color: '#475569', marginBottom: '1rem' }}>{mySubmission.content}</div>}
                                                                        {mySubmission.feedback && <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: 12, background: '#fffbeb', border: '1px solid #fef3c7' }}><span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Instructor Feedback</span><p style={{ fontSize: '0.9rem', color: '#78350f', margin: 0 }}>{mySubmission.feedback}</p></div>}
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ background: '#f8fafc', borderRadius: 20, padding: '2rem', border: '2px dashed #e2e8f0' }}>
                                                                        <textarea style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 16, padding: '1rem', fontSize: '0.95rem', minHeight: 150, marginBottom: '1.5rem', outline: 'none' }} placeholder="Write your response here..." value={submitContent} onChange={e => setSubmitContent(e.target.value)} />
                                                                        <div style={{ marginBottom: '1.5rem' }}>
                                                                            {submitFile ? (
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.75rem', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                                                                                    <FileText size={18} color="#3b82f6" />
                                                                                    <span style={{ fontSize: '0.85rem', flex: 1, fontWeight: 600 }}>{submitFile.name}</span>
                                                                                    <X size={16} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => setSubmitFile(null)} />
                                                                                </div>
                                                                            ) : (
                                                                                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', border: '1px dashed #cbd5e1', borderRadius: 16, cursor: 'pointer', background: '#fff' }}>
                                                                                    <input type="file" style={{ display: 'none' }} onChange={e => setSubmitFile(e.target.files?.[0] || null)} />
                                                                                    <Upload size={20} color="#3b82f6" style={{ marginBottom: 4 }} />
                                                                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3b82f6' }}>Attach document</span>
                                                                                </label>
                                                                            )}
                                                                        </div>
                                                                        <button onClick={handleSubmit} disabled={submitting} style={{ width: '100%', padding: '1rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 800, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 8px 16px rgba(59,130,246,0.3)' }}>{submitting ? 'Turning in...' : 'Turn In Assignment'}</button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ padding: '2rem', background: '#fafbfc' }}>
                                                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>Private Messaging</h4>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: 300, overflowY: 'auto', marginBottom: '1.5rem' }}>
                                                            {comments.filter(c => c.isPrivate).map((c: any) => {
                                                                const isTeacher = (c.user?.role || '').toLowerCase().includes('teacher');
                                                                return (
                                                                    <div key={c.id} style={{ display: 'flex', gap: '0.75rem' }}>
                                                                        <Avatar firstName={c.user?.firstName} lastName={c.user?.lastName} size={28} variant={isTeacher ? 'blue' : 'green'} />
                                                                        <div style={{ flex: 1, background: isTeacher ? '#fffbeb' : '#fff', padding: '0.65rem 0.85rem', borderRadius: '0 12px 12px 12px', border: '1px solid #e2e8f0' }}>
                                                                            <div style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: 2 }}>{c.user?.firstName}</div>
                                                                            <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.4 }}>{c.content}</div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                            {comments.filter(c => c.isPrivate).length === 0 && <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>Private discussion with professor</p>}
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 8 }}>
                                                            <input style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 20, padding: '0.5rem 1rem', fontSize: '0.85rem', outline: 'none' }} placeholder="Message professor..." value={privateComment} onChange={e => setPrivateComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handlePrivateComment(); }} />
                                                            <button onClick={handlePrivateComment} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Play size={16} fill="#fff" /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ background: '#fff', borderRadius: 24, padding: '1.75rem', border: '1px solid #f1f5f9' }}>
                            <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', marginBottom: '1.5rem' }}>Academic Record</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Total Assigned</span>
                                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{assignments.length}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Pending Task</span>
                                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ef4444' }}>{assignments.filter(a => !a.submitted).length}</span>
                                </div>
                                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                    <button onClick={() => navigate('/student/courses')} style={{ width: '100%', padding: '0.75rem', borderRadius: 12, border: '1px solid #3b82f6', color: '#3b82f6', background: '#fff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>View All Courses</button>
                                </div>
                            </div>
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

export default StudentAssignments;
