import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { teacherApi } from '../../api';

const TeacherReports: React.FC = () => {
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
    const [report, setReport] = useState<any>(null);
    const [loadingReport, setLoadingReport] = useState(false);

    useEffect(() => {
        teacherApi.getCourses().then(res => {
            const c = res.data.data || [];
            setCourses(c);
            if (c.length > 0) setSelectedCourse(c[0].id);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            setLoadingReport(true);
            teacherApi.getReport(selectedCourse).then(res => {
                setReport(res.data.data);
                setLoadingReport(false);
            }).catch(() => setLoadingReport(false));
        }
    }, [selectedCourse]);

    const exportCsv = () => {
        if (!report) return;
        const headers = ['Name', 'Student ID', 'Email', 'Present', 'Late', 'Absent', 'Rate (%)'];
        const rows = report.students.map((s: any) => [s.name, s.studentId || '', s.email, s.present, s.late, s.absent, s.rate]);
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_report_${report.course?.courseCode || 'course'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getRateColor = (rate: number) => {
        if (rate >= 80) return 'var(--accent-green)';
        if (rate >= 60) return 'var(--accent-yellow)';
        return 'var(--accent-red)';
    };

    return (
        <DashboardLayout role="teacher">
            <div className="page-header">
                <div><h1 className="page-title">Attendance Reports</h1><p className="page-subtitle">View attendance statistics and export reports</p></div>
                {report && <button className="btn btn-primary" style={{ width: 'auto' }} onClick={exportCsv}>Export CSV</button>}
            </div>

            {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
                <>
                    {/* Course Selector */}
                    <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <label className="form-label" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>Select Course:</label>
                            <select className="form-input" style={{ maxWidth: '400px' }} value={selectedCourse || ''} onChange={e => setSelectedCourse(Number(e.target.value))}>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.courseCode} — {c.courseName}</option>)}
                            </select>
                        </div>
                    </div>

                    {loadingReport ? <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div> : report && (
                        <>
                            {/* Summary Stats */}
                            <div className="stats-grid">
                                <div className="stat-card blue"><div className="stat-value">{report.totalStudents}</div><div className="stat-label">Enrolled Students</div></div>
                                <div className="stat-card purple"><div className="stat-value">{report.totalSessions}</div><div className="stat-label">Total Sessions</div></div>
                                <div className="stat-card green">
                                    <div className="stat-value">
                                        {report.students?.length > 0 ? Math.round(report.students.reduce((a: number, s: any) => a + s.rate, 0) / report.students.length * 10) / 10 : 0}%
                                    </div>
                                    <div className="stat-label">Avg Attendance Rate</div>
                                </div>
                            </div>

                            {/* Report Table */}
                            <div className="glass-card">
                                <h3 style={{ marginBottom: '1rem' }}>Student Attendance Report</h3>
                                <div className="data-table-wrapper">
                                    <table className="data-table">
                                        <thead><tr><th>Student</th><th>Student ID</th><th>Email</th><th>Present</th><th>Late</th><th>Absent</th><th>Rate</th></tr></thead>
                                        <tbody>
                                            {report.students?.map((s: any) => (
                                                <tr key={s.id}>
                                                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                                                    <td>{s.studentId || '—'}</td>
                                                    <td style={{ color: 'var(--text-secondary)' }}>{s.email}</td>
                                                    <td><span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{s.present}</span></td>
                                                    <td><span style={{ color: 'var(--accent-yellow)', fontWeight: 600 }}>{s.late}</span></td>
                                                    <td><span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>{s.absent}</span></td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div className="progress-bar-bg">
                                                                <div className="progress-bar-fill" style={{ width: `${s.rate}%`, background: getRateColor(s.rate) }}></div>
                                                            </div>
                                                            <span style={{ fontWeight: 700, color: getRateColor(s.rate), fontSize: '0.85rem', minWidth: '45px' }}>{s.rate}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!report.students || report.students.length === 0) && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No students enrolled</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </DashboardLayout>
    );
};

export default TeacherReports;
