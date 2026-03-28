import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { studentApi } from '../../api';

const StudentMaterials: React.FC = () => {
    const [courses, setCourses] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
    const [typeFilter, setTypeFilter] = useState('');

    useEffect(() => {
        studentApi.getCourses().then(res => {
            const data = res.data.data || [];
            const courseList = data.map((d: any) => d.course);
            setCourses(courseList);
            if (courseList.length > 0) setSelectedCourse(courseList[0].id);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            studentApi.getMaterials(selectedCourse).then(res => setMaterials(res.data.data || [])).catch(() => { });
        }
    }, [selectedCourse]);

    const filtered = typeFilter ? materials.filter(m => m.type === typeFilter) : materials;
    const typeIcons: Record<string, string> = { file: '📄', link: '🔗', announcement: '📢', assignment: '📝' };
    const typeColors: Record<string, string> = { file: 'var(--accent-blue)', link: 'var(--accent-purple)', announcement: 'var(--accent-yellow)', assignment: 'var(--accent-red)' };

    return (
        <DashboardLayout role="student">
            <div className="page-header">
                <div><h1 className="page-title">Course Materials</h1><p className="page-subtitle">Access files, links, and announcements</p></div>
            </div>

            {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
                <>
                    {/* Stats */}
                    <div className="stats-grid">
                        <div className="stat-card blue"><div className="stat-value">{materials.length}</div><div className="stat-label">Total Materials</div></div>
                        <div className="stat-card red"><div className="stat-value">{materials.filter(m => m.type === 'assignment' && m.dueDate && new Date(m.dueDate) > new Date()).length}</div><div className="stat-label">Pending Assignments</div></div>
                    </div>

                    {/* Filters */}
                    <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <select className="form-input" style={{ maxWidth: '250px' }} value={selectedCourse || ''} onChange={e => setSelectedCourse(Number(e.target.value))}>
                                {courses.map((c: any) => <option key={c.id} value={c.id}>{c.courseCode} — {c.courseName}</option>)}
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
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '1.5rem' }}>{typeIcons[m.type] || '📄'}</span>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ marginBottom: '0.25rem' }}>
                                        {m.isPinned && <span style={{ color: 'var(--accent-yellow)', marginRight: '0.5rem' }}>📌</span>}
                                        {m.title}
                                    </h4>
                                    {m.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{m.description}</p>}
                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>{m.type}</span>
                                        {m.fileName && <span>📎 {m.fileName}</span>}
                                        {m.externalLink && <a href={m.externalLink} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)' }}>🔗 Open Link</a>}
                                        {m.dueDate && <span style={{ color: new Date(m.dueDate) < new Date() ? 'var(--accent-red)' : 'var(--text-muted)' }}>⏰ Due: {new Date(m.dueDate).toLocaleDateString()}</span>}
                                        <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}><p style={{ color: 'var(--text-secondary)' }}>No materials found</p></div>}
                </>
            )}
        </DashboardLayout>
    );
};

export default StudentMaterials;
