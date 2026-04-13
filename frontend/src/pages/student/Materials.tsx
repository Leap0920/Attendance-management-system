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

                    {/* Resource Stream */}
                    <div className="classroom-stream">
                        {filtered.length > 0 ? filtered.map(m => (
                            <div key={m.id} className="stream-item">
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
                                            <div className="comment-avatar">S</div>
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
                                <h3 style={{ marginBottom: '0.5rem' }}>No materials yet</h3>
                                <p style={{ color: 'var(--text-secondary)' }}>Files and resources for this course will appear here when shared by your teacher.</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </DashboardLayout>
    );
};

export default StudentMaterials;
