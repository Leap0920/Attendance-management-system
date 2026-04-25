import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { studentApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { showAlert } from '../../utils/feedback';
import Avatar from '../../components/Avatar';
import { CheckCircle2, AlertCircle, Target, BookOpen, Search } from 'lucide-react';

const StudentAttendance: React.FC = () => {
    const { user } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [codes, setCodes] = useState<Record<number, string>>({});
    const [submitting, setSubmitting] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const load = () => {
        studentApi.getDashboard().then(res => {
            setData(res.data.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const submitAttendance = async (sessionId: number) => {
        const code = codes[sessionId];
        if (!code?.trim()) { showAlert('Error', 'Enter attendance code', 'error'); return; }
        if (submitting) return;
        setSubmitting(sessionId);
        try {
            const res = await studentApi.submitAttendance({ sessionId, attendanceCode: code });
            showAlert('Success', res.data.message || 'Attendance submitted!', 'success');
            setCodes(prev => ({ ...prev, [sessionId]: '' }));
            load();
        } catch (err: any) {
            showAlert('Error', err.response?.data?.message || 'Failed to submit', 'error');
        } finally { setSubmitting(null); }
    };

    const getAvatarUrl = (avatar?: unknown) => {
        if (typeof avatar !== 'string') return undefined;
        const v = avatar.trim();
        if (!v) return undefined;
        if (v.startsWith('http')) return v;
        return `http://${window.location.hostname}:8080${v.startsWith('/') ? v : `/${v}`}`;
    };

    const activeSessions = data?.activeSessions || [];
    const courses = data?.courses || [];

    let totalPresent = 0, totalAll = 0;
    courses.forEach((c: any) => {
        totalAll += c.totalSessions || 0;
        totalPresent += c.presentCount || 0;
    });
    const totalAbsent = totalAll - totalPresent;
    const overallRate = totalAll > 0 ? Math.round((totalPresent / totalAll) * 1000) / 10 : 100;

    const filteredCourses = courses.filter((c: any) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            c.course?.courseName?.toLowerCase().includes(q) ||
            c.course?.courseCode?.toLowerCase().includes(q)
        );
    });

    return (
        <DashboardLayout role="student">
            {/* ── Top Bar ──────────────────────────────────────── */}
            <div className="td-topbar shadow-sm">
                <span className="ta-brand font-extrabold text-xl tracking-tight text-gray-800">My Attendance</span>
                <div className="td-topbar-actions" style={{ marginLeft: 'auto' }}>
                    {/* Add any specific actions here if needed */}
                </div>
                <Avatar firstName={user?.firstName} lastName={user?.lastName} avatarUrl={getAvatarUrl(user?.avatar)} size={38} />
            </div>

            {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
                <>
                    {/* ── Stats Row ─────────────────────────────────── */}
                    <div className="ta-stats-row mt-4">
                        <div className="ta-stat-card hover:translate-y-[-2px] transition-transform">
                            <div className="ta-stat-top">
                                <span className="ta-stat-label">Present</span>
                                <div className="ta-stat-icon-box ta-stat-icon-green">
                                    <CheckCircle2 size={18} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div className="ta-stat-value">{totalPresent}</div>
                            <span className="ta-stat-badge ta-stat-green">CLASSES ATTENDED</span>
                        </div>
                        <div className="ta-stat-card hover:translate-y-[-2px] transition-transform">
                            <div className="ta-stat-top">
                                <span className="ta-stat-label">Absent / Late</span>
                                <div className="ta-stat-icon-box ta-stat-icon-red">
                                    <AlertCircle size={18} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div className="ta-stat-value">{totalAbsent}</div>
                            <span className="ta-stat-badge ta-stat-neutral" style={{ color: 'var(--accent-red)', background: '#fee2e2' }}>RECORDED ABSENCES</span>
                        </div>
                        <div className="ta-stat-card hover:translate-y-[-2px] transition-transform">
                            <div className="ta-stat-top">
                                <span className="ta-stat-label">Overall Rate</span>
                                <div className="ta-stat-icon-box ta-stat-icon-blue">
                                    <Target size={18} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div className="ta-stat-value">{overallRate}%</div>
                            <span className="ta-stat-badge ta-stat-blue">CUMULATIVE AVERAGE</span>
                        </div>
                    </div>

                    {/* ── Active Sessions ───────────────────────────── */}
                    {activeSessions.length > 0 && (
                        <div className="ta-active-section mt-8">
                            <div className="ta-active-header">
                                <h2>Active Sessions</h2>
                                <span className="ta-live-indicator"><span className="td-live-dot-sm bg-orange-500 mr-2"></span>LIVE INDICATOR</span>
                            </div>
                            {activeSessions.map((s: any) => (
                                <div key={s.session.id} className="ta-active-card hover:shadow-md transition-shadow">
                                    <div className="ta-active-info">
                                        <span className="ta-active-ongoing bg-orange-100 text-orange-600">ONGOING NOW</span>
                                        <h3 className="text-xl font-bold">{s.courseName}</h3>
                                        <p className="text-muted">{s.session.sessionTitle || 'Regular Session'} • {s.session.durationMinutes} mins</p>
                                    </div>
                                    <div className="ta-access-code w-full max-w-sm">
                                        {s.alreadySubmitted ? (
                                            <div className="flex flex-col items-center justify-center p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 w-full h-full">
                                                <CheckCircle2 size={24} className="mb-1" />
                                                <span className="font-bold tracking-widest uppercase">Verified</span>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="ta-code-label">ENTER JOIN CODE</span>
                                                <div className="flex gap-2">
                                                    <input 
                                                        className="form-input text-center text-xl font-mono tracking-widest font-bold placeholder:font-sans placeholder:tracking-normal w-full" 
                                                        placeholder="EX: 123456" 
                                                        value={codes[s.session.id] || ''}
                                                        onChange={e => setCodes({ ...codes, [s.session.id]: e.target.value.toUpperCase() })}
                                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitAttendance(s.session.id); } }} 
                                                        maxLength={6}
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="ta-active-actions">
                                        {!s.alreadySubmitted && (
                                            <button 
                                                className="btn btn-primary h-full px-8 font-bold text-lg" 
                                                disabled={submitting === s.session.id || (codes[s.session.id] || '').length < 3}
                                                onClick={() => submitAttendance(s.session.id)}
                                            >
                                                {submitting === s.session.id ? 'Verifying…' : 'Submit'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── All Sessions Table (Course Breakdown) ─────── */}
                    <div className="ta-table-section mt-8">
                        <div className="ta-table-header">
                            <h2>Course Breakdown</h2>
                            <div className="td-search-wrapper" style={{ maxWidth: '280px' }}>
                                <Search className="td-search-icon" size={16} />
                                <input 
                                    className="td-search-input" 
                                    placeholder="Search by course code or name..." 
                                    value={searchQuery} 
                                    onChange={e => setSearchQuery(e.target.value)} 
                                />
                            </div>
                        </div>
                        <div className="data-table-wrapper">
                            <table className="data-table relative z-10 w-full">
                                <thead>
                                    <tr>
                                        <th>COURSE</th>
                                        <th className="text-center">TOTAL SESSIONS</th>
                                        <th className="text-center">PRESENT</th>
                                        <th>ATTENDANCE RATE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCourses.map((c: any) => (
                                        <tr key={c.course.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.course.courseName}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.course.courseCode}</div>
                                            </td>
                                            <td className="text-center">
                                                <span className="inline-flex items-center justify-center min-w-[28px] h-7 bg-gray-100 rounded-md text-sm font-bold text-gray-600">
                                                    {c.totalSessions}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className="inline-flex items-center justify-center min-w-[28px] h-7 bg-green-50 border border-green-200 text-green-600 rounded-md text-sm font-bold">
                                                    {c.presentCount}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div className="progress-bar-bg flex-1 max-w-[200px] h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className="progress-bar-fill h-full rounded-full transition-all duration-1000" 
                                                            style={{ 
                                                                width: `${c.attendanceRate}%`, 
                                                                background: c.attendanceRate >= 80 ? 'var(--accent-green)' : c.attendanceRate >= 60 ? 'var(--accent-yellow)' : 'var(--accent-red)' 
                                                            }}
                                                        />
                                                    </div>
                                                    <span style={{ fontWeight: 800, fontSize: '0.85rem', width: '45px' }} className={c.attendanceRate >= 80 ? 'text-green-600' : c.attendanceRate >= 60 ? 'text-yellow-600' : 'text-red-500'}>
                                                        {c.attendanceRate}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredCourses.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center text-gray-500">
                                                <BookOpen size={32} className="mx-auto mb-3 text-gray-300" />
                                                <p className="font-medium text-gray-600">No courses found matching your search.</p>
                                                <p className="text-sm mt-1">Try adjusting your filters or enroll in a new class.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </DashboardLayout>
    );
};

export default StudentAttendance;
