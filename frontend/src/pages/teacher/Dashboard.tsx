import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Clock, 
  BookOpen, 
  Users, 
  CheckCircle2, 
  Radio, 
  MapPin, 
  MoreHorizontal,
  X,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  CircleDashed,
  ExternalLink,
  Calendar,
  UserCheck
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { teacherApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { showAlert, showConfirm, showApiError } from '../../utils/feedback';
import Avatar from '../../components/Avatar';

/* ── helpers ───────────────────────────────────────────────── */

const DAYS = [
  { key: 'M', label: 'M' },
  { key: 'T', label: 'T' },
  { key: 'W', label: 'W' },
  { key: 'Th', label: 'Th' },
  { key: 'F', label: 'F' },
  { key: 'S', label: 'S' },
];

const COURSE_GRADIENTS = [
  'linear-gradient(135deg, #4285F4 0%, #5B9CF4 100%)',
  'linear-gradient(135deg, #F4A742 0%, #F6C86B 100%)',
  'linear-gradient(135deg, #7B68EE 0%, #9B8FFF 100%)',
  'linear-gradient(135deg, #EA4335 0%, #FF6B5B 100%)',
  'linear-gradient(135deg, #34A853 0%, #4FC36B 100%)',
  'linear-gradient(135deg, #00BCD4 0%, #4DD0E1 100%)',
  'linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%)',
  'linear-gradient(135deg, #FF5722 0%, #FF8A65 100%)',
];

const CATEGORY_COLORS = [
  '#4285F4', '#F4A742', '#7B68EE', '#EA4335',
  '#34A853', '#00BCD4', '#9C27B0', '#FF5722',
];

const getGradient = (index: number) => COURSE_GRADIENTS[index % COURSE_GRADIENTS.length];
const getCategoryLabel = (index: number) => [
  'ENGINEERING', 'SOCIAL SCIENCES', 'MANDATORY', 'COMPUTER SCIENCE',
  'BUSINESS', 'ARTS', 'EDUCATION', 'GENERAL',
][index % 8];
const getCategoryColor = (index: number) => CATEGORY_COLORS[index % CATEGORY_COLORS.length];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatTime12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

/* ── Live Clock ────────────────────────────────────────────── */
const LiveClock: React.FC = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = now.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  const mins = now.getMinutes().toString().padStart(2, '0');
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="td-clock-display">
      <span className="td-clock-label">LOCAL TIME</span>
      <div className="td-clock-time">{h12}:{mins} <span className="td-clock-ampm">{ampm}</span></div>
      <span className="td-clock-date">{dayNames[now.getDay()]}, {monthNames[now.getMonth()]} {now.getDate()}</span>
    </div>
  );
};

/* ── Session Timer ─────────────────────────────────────────── */
const SessionTimer: React.FC<{ endTime: string; onExpire: () => void }> = ({ endTime, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const end = new Date(endTime).getTime();
    const update = () => {
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) { onExpire(); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [endTime, onExpire]);

  return (
    <div className="td-session-timer">
      <Clock size={14} strokeWidth={2.5} />
      {timeLeft}
    </div>
  );
};

/* ── Main Component ────────────────────────────────────────── */
const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAttendance, setShowAttendance] = useState(false);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);

  // Forms
  const [attendForm, setAttendForm] = useState({ courseId: '', sessionTitle: '', duration: '10' });
  const [courseForm, setCourseForm] = useState({ courseName: '', courseCode: '', section: '', schedule: '', room: '' });
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [targetReopenSession, setTargetReopenSession] = useState<{ id: number; title: string } | null>(null);
  const [reopenDuration, setReopenDuration] = useState('10');
  const [reopeningId, setReopeningId] = useState<number | null>(null);

  // Courses carousel
  const coursesScrollRef = useRef<HTMLDivElement>(null);

  const loadDashboard = useCallback(() => {
    teacherApi.getDashboard().then(res => {
      setData(res.data?.data || { courses: [], activeSessions: [], recentSessions: [], totalCourses: 0, totalStudents: 0, totalSessions: 0 });
      setLoadError(null);
      setLoading(false);
    }).catch(() => {
      setLoadError('Unable to load teacher dashboard. Please refresh.');
      setData({ courses: [], activeSessions: [], recentSessions: [], totalCourses: 0, totalStudents: 0, totalSessions: 0 });
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadDashboard();
    const pollInterval = setInterval(() => {
      if (data?.activeSessions?.length > 0) {
        teacherApi.getDashboard().then(res => setData(res.data.data)).catch(() => {});
      }
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [data?.activeSessions?.length, loadDashboard]);

  /* ── actions ──────────────────────────────────────────────── */
  const buildSchedule = () => {
    if (selectedDays.length === 0) return '';
    return `${selectedDays.join('')} ${formatTime12(startTime)} - ${formatTime12(endTime)}`;
  };

  const startSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await teacherApi.createAttendance({
        courseId: Number(attendForm.courseId),
        sessionTitle: attendForm.sessionTitle,
        duration: Number(attendForm.duration),
        allowLate: true,
      });
      setShowAttendance(false);
      setAttendForm({ courseId: '', sessionTitle: '', duration: '10' });
      const code = res.data?.data?.attendanceCode || '';
      showAlert('Success', `Attendance session started! Code: ${code}`, 'success');
      loadDashboard();
    } catch (err: any) { showApiError(err, 'Error creating session'); }
  };

  const closeSession = async (id: number) => {
    showConfirm('Confirm Action', 'Close this attendance session? Absent students will be automatically marked.', async () => {
      try {
        await teacherApi.closeAttendance(id);
        showAlert('Success', 'Session closed successfully.', 'success');
        loadDashboard();
      } catch (err: any) { showApiError(err, 'Error closing session'); }
    });
  };

  const confirmReopen = async () => {
    if (!targetReopenSession) return;
    try {
      setReopeningId(targetReopenSession.id);
      const res = await teacherApi.reopenAttendance(targetReopenSession.id, Number(reopenDuration));
      const code = res.data?.data?.attendanceCode || '';
      showAlert('Success', `Session reopened! New code: ${code}`, 'success');
      setShowReopenModal(false);
      setTargetReopenSession(null);
      loadDashboard();
    } catch (err: any) { showApiError(err, 'Error reopening session'); }
    finally { setReopeningId(null); }
  };

  const openReopenModal = (id: number, title: string) => {
    setTargetReopenSession({ id, title });
    setReopenDuration('10');
    setShowReopenModal(true);
  };

  const createCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await teacherApi.createCourse({ ...courseForm, schedule: buildSchedule() });
      setShowCreateCourse(false);
      setCourseForm({ courseName: '', courseCode: '', section: '', schedule: '', room: '' });
      setSelectedDays([]);
      setStartTime('09:00');
      setEndTime('10:30');
      showAlert('Success', 'Course created successfully!', 'success');
      loadDashboard();
    } catch (err: any) { showApiError(err, 'Error creating course'); }
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const scrollCourses = (dir: number) => {
    if (coursesScrollRef.current) {
      coursesScrollRef.current.scrollBy({ left: dir * 320, behavior: 'smooth' });
    }
  };

  /* ── computed ─────────────────────────────────────────────── */
  const totalCourses = data?.totalCourses || data?.courses?.length || 0;
  const totalStudents = data?.totalStudents || 0;
  const totalSessions = data?.totalSessions || 0;
  const activeSessionsCount = data?.activeSessions?.length || 0;
  const activeCourses = data?.courses?.filter((c: any) => c.status === 'active') || [];

  // Search filter
  const filteredCourses = activeCourses.filter((c: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.courseName?.toLowerCase().includes(q) ||
      c.courseCode?.toLowerCase().includes(q) ||
      c.section?.toLowerCase().includes(q)
    );
  });

  const teacherName = data?.teacherName || user?.firstName || 'Teacher';

  const getAvatarUrl = (avatar?: unknown) => {
    if (typeof avatar !== 'string') return undefined;
    const value = avatar.trim();
    if (!value) return undefined;
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    return `http://${window.location.hostname}:8080${value.startsWith('/') ? value : `/${value}`}`;
  };

  /* ── render ──────────────────────────────────────────────── */
  return (
    <DashboardLayout role="teacher">
      {loading ? (
        <div className="loading-screen"><div className="spinner"></div></div>
      ) : loadError ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Dashboard unavailable</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{loadError}</p>
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => { setLoading(true); loadDashboard(); }}>Retry</button>
        </div>
      ) : (
        <>
          {/* ── Top Bar ──────────────────────────────────────── */}
          <div className="td-topbar">
            <div className="td-search-wrapper focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <Search className="td-search-icon" size={16} />
              <input
                className="td-search-input"
                placeholder="Search courses, students, sessions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="td-topbar-actions">
              <button className="btn btn-primary td-topbar-btn shadow-sm hover:shadow-md transition-all active:scale-95" onClick={() => setShowAttendance(true)}>
                <Plus size={14} strokeWidth={2.5} />
                New Session
              </button>
              <button className="btn btn-primary td-topbar-btn shadow-sm hover:shadow-md transition-all active:scale-95" onClick={() => setShowCreateCourse(true)}>
                <Plus size={14} strokeWidth={2.5} />
                Create Course
              </button>
            </div>
            <div className="td-topbar-profile">
              <span className="td-topbar-name">{user?.firstName} {user?.lastName}</span>
              <span className="td-topbar-role">{user?.role === 'teacher' ? 'Senior Instructor' : user?.role}</span>
            </div>
            <Avatar
              firstName={user?.firstName}
              lastName={user?.lastName}
              avatarUrl={getAvatarUrl(user?.avatar)}
              size={38}
            />
          </div>

          {/* ── Welcome Banner ────────────────────────────────── */}
          <div className="td-welcome-banner">
            <div className="td-welcome-left">
              <h1 className="td-welcome-title">Welcome back, {teacherName}!</h1>
              <p className="td-welcome-sub">
                Your editorial intelligence dashboard is ready. You have {activeSessionsCount} active session{activeSessionsCount !== 1 ? 's' : ''} running currently.
              </p>
            </div>
            <LiveClock />
          </div>

          {/* ── Stats Grid ────────────────────────────────────── */}
          <div className="td-stats-grid">
            <div className="td-stat-card hover:translate-y-[-2px] transition-all duration-300 shadow-sm hover:shadow-md">
              <div className="td-stat-icon td-stat-icon-blue">
                <BookOpen size={20} />
              </div>
              <div className="td-stat-label">Active Courses</div>
              <div className="td-stat-value">{totalCourses}</div>
              <div className="td-stat-trend td-stat-trend-up">
                <TrendingUp size={12} strokeWidth={2.5} />
                12% from last month
              </div>
            </div>
            <div className="td-stat-card hover:translate-y-[-2px] transition-all duration-300 shadow-sm hover:shadow-md">
              <div className="td-stat-icon td-stat-icon-green">
                <Users size={20} />
              </div>
              <div className="td-stat-label">Total Students</div>
              <div className="td-stat-value">{totalStudents}</div>
              <div className="td-stat-trend td-stat-trend-neutral">
                <CircleDashed size={12} strokeWidth={2.5} />
                Stable enrollment
              </div>
            </div>
            <div className="td-stat-card hover:translate-y-[-2px] transition-all duration-300 shadow-sm hover:shadow-md">
              <div className="td-stat-icon td-stat-icon-purple">
                <CheckCircle2 size={20} />
              </div>
              <div className="td-stat-label">Sessions Created</div>
              <div className="td-stat-value">{totalSessions}</div>
              <div className="td-stat-trend td-stat-trend-up">
                <TrendingUp size={12} strokeWidth={2.5} />
                Increased activity
              </div>
            </div>
            <div className="td-stat-card hover:translate-y-[-2px] transition-all duration-300 shadow-sm hover:shadow-md border-2 border-blue-50">
              <div className="td-stat-icon td-stat-icon-orange">
                <Radio size={20} />
              </div>
              <div className="td-stat-label">Active Sessions</div>
              <div className="td-stat-value">{activeSessionsCount}</div>
              <div className="td-stat-trend td-stat-trend-live">
                <span className="td-live-dot-sm"></span>
                Currently Live
              </div>
            </div>

          </div>

          {/* ── Active Sessions + Recently Closed ─────────────── */}
          <div className="td-sessions-grid">
            {/* Active Sessions */}
            <div className="td-sessions-panel td-sessions-active">
              <div className="td-sessions-header">
                <h3>Active Attendance Sessions</h3>
                <button className="td-link-btn group hover:text-blue-600 transition-colors" onClick={() => navigate('/teacher/attendance')}>
                  View All <ArrowRight size={14} className="inline group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
              {data.activeSessions?.length > 0 ? data.activeSessions.map((s: any, i: number) => (
                <div key={i} className="td-active-session-card hover:border-blue-200 transition-all shadow-sm hover:shadow-md">
                  <div className="td-as-top">
                    <div className="td-as-info">
                      <h4>{s.courseName}</h4>
                      <p>
                        <MapPin size={12} className="inline" />
                        {s.session?.sessionTitle || 'Regular Session'}
                      </p>
                    </div>
                    <div className="td-as-actions">
                      <span className="td-live-badge">LIVE NOW</span>
                      <button className="btn btn-danger btn-sm td-close-btn hover:bg-red-600 transition-colors" onClick={() => closeSession(s.session.id)}>
                        <X size={12} strokeWidth={2.5} />
                        Close Session
                      </button>
                      <button className="btn btn-secondary btn-sm hover:bg-gray-200 transition-colors" onClick={() => navigate('/teacher/attendance')} style={{ width: 'auto' }}>
                        <ExternalLink size={12} className="inline" />
                        Monitor Real-time
                      </button>
                    </div>
                  </div>
                  <div className="td-as-bottom">
                    <div className="td-as-code-section">
                      <span className="td-code-label">JOIN CODE</span>
                      <div className="td-code-display active:scale-95 transition-transform"
                        onClick={() => {
                          navigator.clipboard.writeText(s.session?.attendanceCode || '');
                          showAlert('Copied', 'Join code copied to clipboard!', 'success');
                        }}
                        title="Click to copy"
                      >
                        {s.session?.attendanceCode}
                      </div>
                    </div>
                    <div className="td-as-timer-section">
                      <span className="td-code-label">TIME LEFT</span>
                      <SessionTimer endTime={s.session.endTime} onExpire={loadDashboard} />
                    </div>
                  </div>
                  <div className="td-as-footer">
                    <div className="td-as-avatars">
                      {Array.from({ length: Math.min(s.submissions || 0, 3) }).map((_, ai) => (
                        <div key={ai} className="td-mini-avatar" style={{ background: COURSE_GRADIENTS[ai % COURSE_GRADIENTS.length], marginLeft: ai > 0 ? '-8px' : '0' }}>
                          {String.fromCharCode(65 + ai)}{String.fromCharCode(65 + ai + 1)}
                        </div>
                      ))}
                      {(s.submissions || 0) > 3 && (
                        <div className="td-mini-avatar td-mini-avatar-more" style={{ marginLeft: '-8px' }}>+{s.submissions - 3}</div>
                      )}
                    </div>
                    <span className="td-as-joined"><UserCheck size={12} className="inline mr-1" /> {s.submissions || 0} students joined so far</span>
                  </div>
                </div>
              )) : (
                <div className="td-empty-sessions">
                  <Calendar size={32} strokeWidth={1.5} color="var(--text-muted)" />
                  <p>No active sessions</p>
                  <span>Click "+ New Session" to start attendance.</span>
                </div>
              )}
            </div>

            {/* Recently Closed */}
            <div className="td-sessions-panel td-sessions-recent">
              <div className="td-sessions-header">
                <h3>Recently Closed</h3>
                <button className="td-more-btn transition-colors hover:bg-gray-100" title="More">
                  <MoreHorizontal size={18} />
                </button>
              </div>
              {data.recentSessions?.length > 0 ? data.recentSessions.slice(0, 4).map((s: any, i: number) => (
                <div
                  key={i}
                  className="td-recent-item group hover:bg-blue-50 transition-colors"
                  onClick={() => openReopenModal(s.session.id, s.session.sessionTitle || 'Regular Session')}
                  title="Click to reopen"
                >
                  <div className="td-recent-icon group-hover:scale-110 transition-transform">
                    <Clock size={18} />
                  </div>
                  <div className="td-recent-info">
                    <h4>{s.courseName?.length > 18 ? s.courseName.substring(0, 18) + '...' : s.courseName}</h4>
                    <span>Closed {timeAgo(s.session.startTime)} · {s.submissions} Present</span>
                  </div>
                </div>
              )) : (
                <div className="td-empty-sessions" style={{ padding: '1.5rem' }}>
                  <p>No recent sessions</p>
                </div>
              )}
              {data.recentSessions?.length > 0 && (
                <button className="td-full-history-btn hover:bg-gray-100 transition-colors" onClick={() => navigate('/teacher/attendance')}>
                  Full Session History
                </button>
              )}
            </div>
          </div>

          {/* ── My Courses ────────────────────────────────────── */}
          <div className="td-courses-section">
            <div className="td-courses-header">
              <h3>My Courses</h3>
              <div className="td-courses-nav">
                <button className="td-nav-arrow hover:bg-blue-100 transition-colors" onClick={() => scrollCourses(-1)} aria-label="Scroll left">
                  <ArrowLeft size={16} strokeWidth={2.5} />
                </button>
                <button className="td-nav-arrow hover:bg-blue-100 transition-colors" onClick={() => scrollCourses(1)} aria-label="Scroll right">
                  <ArrowRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            <div className="td-courses-scroll" ref={coursesScrollRef}>
              {filteredCourses.map((c: any, idx: number) => {
                const courseData = (data?.courses || []).find((cc: any) => cc.id === c.id);
                return (
                  <div
                    key={c.id}
                    className="td-course-card premium-card animate-slide-up"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                    onClick={() => navigate(`/teacher/materials?courseId=${c.id}`)}
                  >
                    <div 
                      className="td-course-cover" 
                      style={{ 
                        background: c.coverColor ? `linear-gradient(135deg, ${c.coverColor}, ${adjustColor(c.coverColor, 30)})` : getGradient(idx),
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '-10px',
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        filter: 'blur(20px)'
                      }} />
                      
                      <span className="td-course-category" style={{ 
                        background: 'rgba(255, 255, 255, 0.2)', 
                        backdropFilter: 'blur(4px)',
                        color: '#fff',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        fontWeight: 800,
                        fontSize: '0.65rem',
                        letterSpacing: '1px'
                      }}>
                        {getCategoryLabel(idx)}
                      </span>
                    </div>
                    <div className="td-course-body" style={{ 
                      background: 'rgba(255, 255, 255, 0.8)', 
                      backdropFilter: 'blur(10px)'
                    }}>
                      <h4 style={{ fontWeight: 800, color: '#0f172a' }}>{c.courseName}</h4>
                      <p className="td-course-desc" style={{ fontWeight: 600, color: '#64748b' }}>
                        {c.courseCode} · {c.section || 'General'}
                      </p>
                      <div className="td-course-meta" style={{ marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.75rem' }}>
                          <Calendar size={12} className="inline mr-1 text-blue-500" />
                          {c.schedule?.split(' ')[0] || 'No schedule'}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.75rem' }}>
                          <Users size={12} className="inline mr-1 text-purple-500" />
                          {courseData?.enrollmentCount || '0'} Students
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredCourses.length === 0 && (
                <div className="td-no-courses">
                  <p>No courses found. {searchQuery ? 'Try a different search.' : 'Create your first course!'}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Start Attendance Modal ───────────────────────────── */}
      {showAttendance && (
        <div className="modal-overlay" onClick={() => setShowAttendance(false)}>
          <div className="modal shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Start Attendance Session</h3>
              <button className="modal-close hover:rotate-90 transition-transform" onClick={() => setShowAttendance(false)}><X size={20} /></button>
            </div>
            <form onSubmit={startSession}>
              <div className="form-group">
                <label className="form-label">Course</label>
                <select className="form-input focus:ring-2 focus:ring-blue-100 transition-all" value={attendForm.courseId} onChange={e => setAttendForm({ ...attendForm, courseId: e.target.value })} required>
                  <option value="">Select course...</option>
                  {data?.courses?.map((c: any) => <option key={c.id} value={c.id}>{c.courseCode} {c.section ? `- ${c.section}` : ''}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Session Title (optional)</label>
                <input className="form-input focus:ring-2 focus:ring-blue-100 transition-all" value={attendForm.sessionTitle} onChange={e => setAttendForm({ ...attendForm, sessionTitle: e.target.value })} placeholder="e.g. Week 5" />
              </div>
              <div className="form-group">
                <label className="form-label">Duration (minutes)</label>
                <input className="form-input focus:ring-2 focus:ring-blue-100 transition-all" type="number" min="1" max="120" value={attendForm.duration} onChange={e => setAttendForm({ ...attendForm, duration: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary transition-colors" onClick={() => setShowAttendance(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary shadow-sm hover:shadow-md transition-all active:scale-95" style={{ width: 'auto' }}>Start Session</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create Course Modal ──────────────────────────────── */}
      {showCreateCourse && (
        <div className="modal-overlay" onClick={() => setShowCreateCourse(false)}>
          <div className="modal shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Course</h3>
              <button className="modal-close hover:rotate-90 transition-transform" onClick={() => setShowCreateCourse(false)}><X size={20} /></button>
            </div>
            <form onSubmit={createCourse}>
              <div className="form-group">
                <label className="form-label">Course Name</label>
                <input className="form-input focus:ring-2 focus:ring-blue-100 transition-all" value={courseForm.courseName} onChange={e => setCourseForm({ ...courseForm, courseName: e.target.value })} required placeholder="Introduction to Programming" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Course Code</label>
                  <input className="form-input focus:ring-2 focus:ring-blue-100 transition-all" value={courseForm.courseCode} onChange={e => setCourseForm({ ...courseForm, courseCode: e.target.value })} required placeholder="CS101" />
                </div>
                <div className="form-group">
                  <label className="form-label">Section</label>
                  <input className="form-input focus:ring-2 focus:ring-blue-100 transition-all" value={courseForm.section} onChange={e => setCourseForm({ ...courseForm, section: e.target.value })} placeholder="Section A" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Schedule</label>
                <div className="day-picker" style={{ marginBottom: '0.75rem' }}>
                  {DAYS.map(d => (
                    <div key={d.key} className={`day-chip ${selectedDays.includes(d.key) ? 'selected' : ''}`} onClick={() => toggleDay(d.key)}>{d.label}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Start Time</label>
                    <input className="form-input focus:ring-2 focus:ring-blue-100 transition-all" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>End Time</label>
                    <input className="form-input focus:ring-2 focus:ring-blue-100 transition-all" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Room</label>
                <input className="form-input focus:ring-2 focus:ring-blue-100 transition-all" value={courseForm.room} onChange={e => setCourseForm({ ...courseForm, room: e.target.value })} placeholder="Room 301" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary transition-colors" onClick={() => setShowCreateCourse(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary shadow-sm hover:shadow-md transition-all active:scale-95" style={{ width: 'auto' }}>Create Course</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reopen Session Modal ─────────────────────────────── */}
      {showReopenModal && (
        <div className="modal-overlay" onClick={() => setShowReopenModal(false)}>
          <div className="modal shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Reopen Session</h3>
              <button className="modal-close hover:rotate-90 transition-transform" onClick={() => setShowReopenModal(false)}><X size={20} /></button>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Reopening: <strong>{targetReopenSession?.title}</strong>.
              <br />This will clear "absent" records, allowing late students to submit.
            </p>
            <div className="form-group">
              <label className="form-label">Extended Duration (minutes)</label>
              <input type="number" className="form-input focus:ring-2 focus:ring-blue-100 transition-all" value={reopenDuration} onChange={e => setReopenDuration(e.target.value)} min="1" max="120" />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary transition-colors" onClick={() => setShowReopenModal(false)}>Cancel</button>
              <button className="btn btn-primary shadow-sm hover:shadow-md transition-all active:scale-95" style={{ width: 'auto' }} onClick={confirmReopen} disabled={reopeningId !== null}>
                {reopeningId !== null ? 'Reopening...' : 'Confirm Reopen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

/* ── Helper: lighten a hex color ───────────────────────────── */
function adjustColor(hex: string, amount: number): string {
  try {
    const h = hex.replace('#', '');
    const num = parseInt(h, 16);
    let r = Math.min(255, ((num >> 16) & 0xff) + amount);
    let g = Math.min(255, ((num >> 8) & 0xff) + amount);
    let b = Math.min(255, (num & 0xff) + amount);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  } catch {
    return hex;
  }
}

export default TeacherDashboard;
