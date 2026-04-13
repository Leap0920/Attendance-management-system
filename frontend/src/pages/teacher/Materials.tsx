import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { teacherApi } from '../../api';
import { showAlert, showConfirm, showApiError } from '../../utils/feedback';

const TeacherMaterials: React.FC = () => {
    const [courses, setCourses] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
    const [typeFilter, setTypeFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ type: 'file', content: '', externalLink: '', dueDate: '', forCourses: [] as number[] });
    const [file, setFile] = useState<File | null>(null);
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [forwardMaterialId, setForwardMaterialId] = useState<number | null>(null);
    const [forwardCourses, setForwardCourses] = useState<number[]>([]);

    const load = () => {
        teacherApi.getCourses().then(res => {
            const c = res.data.data || [];
            setCourses(c);
            if (c.length > 0 && !selectedCourse) { 
                setSelectedCourse(c[0].id);
                setForm(prev => ({ ...prev, forCourses: [c[0].id] }));
            }
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    const loadMaterials = (courseId: number) => {
        teacherApi.getMaterials(courseId).then(res => setMaterials(res.data.data || [])).catch(() => { });
    };

    useEffect(() => { load(); }, []);

    useEffect(() => {
        if (selectedCourse) {
            loadMaterials(selectedCourse);
        }
    }, [selectedCourse]);

    const filtered = typeFilter ? materials.filter(m => m.type === typeFilter) : materials;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Split content into title and description (first line is title)
        const lines = form.content.split('\n');
        const title = lines[0].trim();
        const description = lines.slice(1).join('\n').trim();

        if (!title) {
            showAlert('Error', 'Please enter some content', 'error');
            return;
        }

        const fd = new FormData();
        fd.append('courseIds', (selectedCourse ? [selectedCourse] : []).join(','));
        fd.append('type', form.type);
        fd.append('title', title);
        if (description) fd.append('description', description);
        if (form.externalLink) fd.append('externalLink', form.externalLink);
        if (form.dueDate) fd.append('dueDate', form.dueDate);
        if (file) fd.append('file', file);
        try {
            await teacherApi.createMaterial(fd);
            setShowModal(false);
            setForm({ type: 'file', content: '', externalLink: '', dueDate: '', forCourses: selectedCourse ? [selectedCourse] : [] });
            setFile(null);
            load();
            showAlert('Success', 'Material shared!');
        } catch (err: any) { showApiError(err); }
    };

    const handleForward = async () => {
        if (!forwardMaterialId || forwardCourses.length === 0) return;
        try {
            await teacherApi.shareMaterial(forwardMaterialId, forwardCourses.join(','));
            setShowForwardModal(false);
            setForwardMaterialId(null);
            setForwardCourses([]);
            load();
            showAlert('Success', 'Material forwarded successfully!');
        } catch (err: any) { showApiError(err); }
    };

    const handleDelete = async (id: number) => {
        showConfirm('Delete Material', 'Delete this material?', async () => {
            try {
                await teacherApi.deleteMaterial(id);
                load();
                showAlert('Deleted', 'Material removed.', 'error');
            } catch (err: any) { showApiError(err); }
        });
    };

    return (
        <DashboardLayout role="teacher">
            <div className="page-header">
                <div><h1 className="page-title">Course Materials</h1><p className="page-subtitle">Manage files, links, and announcements</p></div>
                <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowModal(true)}>+ Add Material</button>
            </div>

            {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
                <>
                    {/* Filters */}
                    <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <select className="form-input" style={{ maxWidth: '250px' }} value={selectedCourse || ''} onChange={e => setSelectedCourse(Number(e.target.value))}>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.courseCode} {c.section ? `- ${c.section}` : ''}</option>)}
                            </select>
                            <select className="form-input" style={{ maxWidth: '180px' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                                <option value="">All Types</option>
                                <option value="file">Files</option>
                                <option value="link">Links</option>
                                <option value="announcement">Announcements</option>
                                <option value="assignment">Assignments</option>
                            </select>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                {filtered.length} item{filtered.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>

                    {/* Resource Stream */}
                    <div className="classroom-stream">
                        {/* Announce Box Placeholder */}
                        <div className="stream-item" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowModal(true)}>
                            <div className="stream-avatar" style={{ width: 32, height: 32 }}>{courses.find(c => c.id === selectedCourse)?.teacherName?.[0] || 'T'}</div>
                            <span style={{ fontSize: '0.85rem' }}>Announce something to your class...</span>
                        </div>

                        {filtered.length > 0 ? filtered.map(m => (
                            <div key={m.id} className="stream-item">
                                <div className="stream-actions">
                                    <button className="btn-icon" title="Forward" onClick={() => {
                                        setForwardMaterialId(m.id);
                                        setForwardCourses([]);
                                        setShowForwardModal(true);
                                    }} style={{ border: 'none', background: 'transparent', color: 'var(--primary)' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>
                                    </button>
                                    <button className="btn-icon" title="Delete" onClick={() => handleDelete(m.id)} style={{ border: 'none', background: 'transparent' }}>⋮</button>
                                </div>

                                {m.type === 'announcement' ? (
                                    <>
                                        <div className="stream-header">
                                            <div className="stream-avatar">{m.teacher?.firstName?.[0]}{m.teacher?.lastName?.[0]}</div>
                                            <div className="stream-info">
                                                <div className="stream-author">{m.teacher?.firstName} {m.teacher?.lastName}</div>
                                                <div className="stream-date">{new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                                            </div>
                                        </div>
                                        <div className="stream-content">
                                            {m.title && <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{m.title}</div>}
                                            {m.description}
                                        </div>
                                        <div className="comment-input-area">
                                            <div className="comment-avatar">T</div>
                                            <button className="comment-trigger">Add comment</button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="stream-item-material">
                                        <div className="material-badge">
                                            {m.type === 'file' && (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                                            )}
                                            {m.type === 'link' && (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                            )}
                                            {m.type === 'assignment' && (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                                            )}
                                        </div>
                                        <div className="stream-info">
                                            <h4>{m.teacher?.firstName} {m.teacher?.lastName} posted a new {m.type}: {m.title}</h4>
                                            <p>{new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )) : (
                            <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                                <h3 style={{ marginBottom: '0.5rem' }}>No materials found</h3>
                                <p style={{ color: 'var(--text-secondary)' }}>Shared files and resources for this course will appear here.</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3 className="modal-title">Add Material</h3><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
                        <form onSubmit={handleCreate}>
                            <div className="form-group"><label className="form-label">Type</label>
                                <select className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                    <option value="file">File Upload</option>
                                    <option value="link">External Link</option>
                                    <option value="announcement">Announcement</option>
                                    <option value="assignment">Assignment</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Title / Description</label>
                                <textarea 
                                    className="form-input" 
                                    rows={5} 
                                    placeholder="Enter title on the first line, then details below..." 
                                    value={form.content} 
                                    onChange={e => setForm({ ...form, content: e.target.value })} 
                                    required 
                                />
                            </div>
                            {form.type === 'file' && <div className="form-group"><label className="form-label">File</label><input type="file" className="form-input" onChange={e => setFile(e.target.files?.[0] || null)} /></div>}
                            {form.type === 'link' && <div className="form-group"><label className="form-label">URL</label><input className="form-input" value={form.externalLink} onChange={e => setForm({ ...form, externalLink: e.target.value })} placeholder="https://..." /></div>}
                            {form.type === 'assignment' && <div className="form-group"><label className="form-label">Due Date</label><input className="form-input" type="datetime-local" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>}

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Add Material</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Forward Modal */}
            {showForwardModal && (
                <div className="modal-overlay" onClick={() => setShowForwardModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Forward to Other Sections</h3>
                            <button className="modal-close" onClick={() => setShowForwardModal(false)}>×</button>
                        </div>
                        <div style={{ padding: '1rem 0' }}>
                            <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Select sections to forward this material to:</p>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {courses.filter(c => c.id !== selectedCourse).map(c => (
                                    <label key={c.id} className={`chip-select ${forwardCourses.includes(c.id) ? 'selected' : ''}`}>
                                        <input type="checkbox" checked={forwardCourses.includes(c.id)} onChange={e => {
                                            setForwardCourses(prev => e.target.checked ? [...prev, c.id] : prev.filter(x => x !== c.id));
                                        }} style={{ display: 'none' }} />
                                        {c.courseCode} {c.section}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowForwardModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleForward} disabled={forwardCourses.length === 0} style={{ width: 'auto' }}>Forward Material</button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default TeacherMaterials;
