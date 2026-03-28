import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { studentApi } from '../../api';

const StudentCourseDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        studentApi.getCourse(Number(id)).then(res => {
            setData(res.data.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [id]);

    if (loading) return <DashboardLayout role="student"><div className="loading-screen"><div className="spinner"></div></div></DashboardLayout>;
    if (!data) return <DashboardLayout role="student"><p>Course not found</p></DashboardLayout>;

    const { course, materials = [], attendanceRecords = [] } = data;
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter((r: any) => r.status === 'present').length;
    const late = attendanceRecords.filter((r: any) => r.status === 'late').length;
    const absent = attendanceRecords.filter((r: any) => r.status === 'absent').length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 100;

    return (
        <DashboardLayout role="student">
            {/* Course Header */}
            <div className="detail-header" style={{ borderLeft: `4px solid ${course.coverColor}`, background: `linear-gradient(135deg, ${course.coverColor}15, transparent)` }}>
                <h1 className="page-title">{course.courseCode} — {course.courseName}</h1>
                <p className="page-subtitle">{course.description || 'No description'}</p>
                <div className="meta-row">
                    {course.section && <span className="badge badge-active">{course.section}</span>}
                    {course.schedule && <span className="meta-item">🕐 {course.schedule}</span>}
                    {course.room && <span className="meta-item">🏫 {course.room}</span>}
                </div>
            </div>

            {/* Attendance Stats */}
            <div className="stats-grid">
                <div className="stat-card green"><div className="stat-value">{present}</div><div className="stat-label">Present</div></div>
                <div className="stat-card yellow"><div className="stat-value">{late}</div><div className="stat-label">Late</div></div>
                <div className="stat-card red"><div className="stat-value">{absent}</div><div className="stat-label">Absent</div></div>
                <div className="stat-card blue">
                    <div className="stat-value">{rate}%</div>
                    <div className="stat-label">Attendance Rate</div>
                </div>
            </div>

            {/* Attendance History */}
            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Attendance History</h3>
                {attendanceRecords.length > 0 ? (
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead><tr><th>Session</th><th>Status</th><th>Date</th></tr></thead>
                            <tbody>
                                {attendanceRecords.map((r: any) => (
                                    <tr key={r.id}>
                                        <td>{r.session?.sessionTitle || 'Session'}</td>
                                        <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : new Date(r.session?.startTime).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No attendance records yet</p>}
            </div>

            {/* Recent Materials */}
            {materials.length > 0 && (
                <div className="glass-card">
                    <h3 style={{ marginBottom: '1rem' }}>Recent Materials</h3>
                    {materials.slice(0, 5).map((m: any) => (
                        <div key={m.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-glass)' }}>
                            <span style={{ fontSize: '1.25rem' }}>{m.type === 'file' ? '📄' : m.type === 'link' ? '🔗' : m.type === 'assignment' ? '📝' : '📢'}</span>
                            <div>
                                <div style={{ fontWeight: 500 }}>{m.title}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(m.createdAt).toLocaleDateString()}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
};

export default StudentCourseDetail;
