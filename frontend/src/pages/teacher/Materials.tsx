import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { teacherApi } from '../../api';

const TeacherMaterials: React.FC = () => {
    const [courses, setCourses] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
    const [typeFilter, setTypeFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ type: 'file', title: '', description: '', externalLink: '', dueDate: '' });
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        teacherApi.getCourses().then(res => {
            const c = res.data.data || [];
            setCourses(c);
            if (c.length > 0) { setSelectedCourse(c[0].id); }
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            teacherApi.getMaterials(selectedCourse).then(res => setMaterials(res.data.data || [])).catch(() => { });
        }
    }, [selectedCourse]);

    const filtered = typeFilter ? materials.filter(m => m.type === typeFilter) : materials;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse) return;
        const fd = new FormData();
        fd.append('courseId', selectedCourse.toString());
        fd.append('type', form.type);
        fd.append('title', form.title);
        if (form.description) fd.append('description', form.description);
        if (form.externalLink) fd.append('externalLink', form.externalLink);
        if (form.dueDate) fd.append('dueDate', form.dueDate);
        if (file) fd.append('file', file);
        try {
            await teacherApi.createMaterial(fd);
            setShowModal(false);
            setForm({ type: 'file', title: '', description: '', externalLink: '', dueDate: '' });
            setFile(null);
            teacherApi.getMaterials(selectedCourse).then(res => setMaterials(res.data.data || []));
        } catch (err: any) { alert(err.response?.data?.message || 'Error'); }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Delete this material?')) {
            await teacherApi.deleteMaterial(id);
            if (selectedCourse) teacherApi.getMaterials(selectedCourse).then(res => setMaterials(res.data.data || []));
        }
    };

    const typeIcons: Record<string, string> = { file: 'F', link: 'L', announcement: 'A', assignment: 'W' };
    const typeColors: Record<string, string> = { file: 'var(--accent-blue)', link: 'var(--accent-purple)', announcement: 'var(--accent-yellow)', assignment: 'var(--accent-red)' };

    const stats = { total: materials.length, file: materials.filter(m => m.type === 'file').length, link: materials.filter(m => m.type === 'link').length, announcement: materials.filter(m => m.type === 'announcement').length, assignment: materials.filter(m => m.type === 'assignment').length };

    return (
        <DashboardLayout role="teacher">
            <div className="page-header">
                <div><h1 className="page-title">Course Materials</h1><p className="page-subtitle">Manage files, links, and announcements</p></div>
                <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowModal(true)}>+ Add Material</button>
            </div>

            {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
                <>
                    {/* Stats */}
                    <div className="stats-grid">
                        <div className="stat-card blue"><div className="stat-value">{stats.total}</div><div className="stat-label">Total</div></div>
                        <div className="stat-card cyan"><div className="stat-value">{stats.file}</div><div className="stat-label">Files</div></div>
                        <div className="stat-card purple"><div className="stat-value">{stats.link}</div><div className="stat-label">Links</div></div>
                        <div className="stat-card yellow"><div className="stat-value">{stats.announcement}</div><div className="stat-label">Announcements</div></div>
                        <div className="stat-card red"><div className="stat-value">{stats.assignment}</div><div className="stat-label">Assignments</div></div>
                    </div>

                    {/* Filters */}
                    <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <select className="form-input" style={{ maxWidth: '250px' }} value={selectedCourse || ''} onChange={e => setSelectedCourse(Number(e.target.value))}>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.courseCode} — {c.courseName}</option>)}
                            </select>
                            <select className="form-input" style={{ maxWidth: '180px' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                                <option value="">All Types</option>
                                <option value="file">Files</option>
                                <option value="link">Links</option>
                                <option value="announcement">Announcements</option>
                                <option value="assignment">Assignments</option>
                            </select>
                        </div>
                    </div>

                    {/* Materials List */}
                    {filtered.length > 0 ? filtered.map(m => (
                        <div key={m.id} className="glass-card" style={{ marginBottom: '0.75rem', borderLeft: `3px solid ${typeColors[m.type] || 'var(--accent-blue)'}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flex: 1 }}>
                                    <span style={{ width: 32, height: 32, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', color: typeColors[m.type] || 'var(--accent-blue)', background: '#f1f5f9' }}>{typeIcons[m.type] || 'F'}</span>
                                    <div>
                                        <h4 style={{ marginBottom: '0.25rem' }}>
                                            {m.isPinned && <span style={{ color: 'var(--accent-yellow)', marginRight: '0.5rem', fontSize: '0.75rem', fontWeight: 700 }}>PINNED</span>}
                                            {m.title}
                                        </h4>
                                        {m.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{m.description}</p>}
                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>{m.type}</span>
                                            {m.fileName && <span>File: {m.fileName}</span>}
                                            {m.externalLink && <a href={m.externalLink} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)' }}>Open Link</a>}
                                            {m.dueDate && <span>Due: {new Date(m.dueDate).toLocaleDateString()}</span>}
                                            <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m.id)}>Delete</button>
                            </div>
                        </div>
                    )) : <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}><p style={{ color: 'var(--text-secondary)' }}>No materials found</p></div>}
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
                            <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
                            <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
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
        </DashboardLayout>
    );
};

export default TeacherMaterials;
