import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { teacherApi } from '../../api';
import { showAlert, showConfirm, showApiError } from '../../utils/feedback';

const DAYS = [
  { key: 'M', label: 'M' },
  { key: 'T', label: 'T' },
  { key: 'W', label: 'W' },
  { key: 'Th', label: 'Th' },
  { key: 'F', label: 'F' },
  { key: 'S', label: 'S' },
];

const COURSE_PATTERNS = [
  'linear-gradient(135deg, #4285F4 0%, #5B9CF4 100%)',
  'linear-gradient(135deg, #EA4335 0%, #FF6B5B 100%)',
  'linear-gradient(135deg, #34A853 0%, #4FC36B 100%)',
  'linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%)',
  'linear-gradient(135deg, #FF5722 0%, #FF8A65 100%)',
  'linear-gradient(135deg, #00BCD4 0%, #4DD0E1 100%)',
];

const getPattern = (index: number) => COURSE_PATTERNS[index % COURSE_PATTERNS.length];

const TeacherCourses: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [form, setForm] = useState({ courseCode: '', courseName: '', section: '', room: '' });
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');

  useEffect(() => {
    teacherApi.getCourses().then(res => { setCourses(res.data.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const formatTime12 = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const buildSchedule = () => {
    if (selectedDays.length === 0) return '';
    return `${selectedDays.join('')} ${formatTime12(startTime)} - ${formatTime12(endTime)}`;
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await teacherApi.createCourse({ ...form, schedule: buildSchedule() });
      setShowModal(false);
      setForm({ courseCode: '', courseName: '', section: '', room: '' });
      setSelectedDays([]);
      setStartTime('09:00');
      setEndTime('10:30');
      loadCourses();
    } catch { }
  };

  const loadCourses = () => {
    teacherApi.getCourses().then(res => setCourses(res.data.data || []));
  };

  const handleArchive = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Archive this course?')) return;
    showConfirm('Archive Course', 'Archive this course?', async () => {
      try {
        await teacherApi.archiveCourse(id);
        showAlert('Archived', 'Course archived.');
        loadCourses();
      } catch (err: any) { showApiError(err); }
    });
  };

  const handleUnarchive = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await teacherApi.unarchiveCourse(id);
      showAlert('Success', 'Course unarchived.');
      loadCourses();
    } catch (err: any) { showApiError(err); }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    showConfirm('Delete Course', 'Are you sure you want to delete this course? This cannot be undone.', async () => {
      try {
        await teacherApi.deleteCourse(id);
        showAlert('Deleted', 'Course removed.', 'error');
        loadCourses();
      } catch (err: any) { showApiError(err); }
    });
  };

  return (
    <DashboardLayout role="teacher">
      <div className="page-header">
        <div><h1 className="page-title">My Courses</h1></div>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowModal(true)}>+ Create Course</button>
      </div>

      <div className="tabs-container" style={{ marginBottom: '1.5rem' }}>
        <button className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>Active</button>
        <button className={`tab-btn ${activeTab === 'archived' ? 'active' : ''}`} onClick={() => setActiveTab('archived')}>Archived</button>
      </div>

      {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
        <div className="course-grid">
          {courses.filter(c => c.status === activeTab).map((c, idx) => (
            <div key={c.id} className="course-card" onClick={() => navigate(`/teacher/courses/${c.id}`)}>
              <div className="course-card-header" style={{ background: c.coverColor ? `linear-gradient(135deg, ${c.coverColor}, ${c.coverColor}cc)` : getPattern(idx) }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ overflow: 'hidden' }}>
                    <h3 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.courseName}</h3>
                    <p style={{ fontSize: '0.8rem', opacity: 0.9 }}>{c.courseCode} {c.section ? `• ${c.section}` : ''}</p>
                  </div>
                  <div className="course-card-actions" style={{ display: 'flex', gap: '0.4rem' }}>
                    {c.status === 'active' ? (
                      <button className="btn-icon" title="Archive" onClick={(e) => handleArchive(e, c.id)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}>📦</button>
                    ) : (
                      <button className="btn-icon" title="Unarchive" onClick={(e) => handleUnarchive(e, c.id)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}>📤</button>
                    )}
                    <button className="btn-icon" title="Delete" onClick={(e) => handleDelete(e, c.id)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}>🗑</button>
                  </div>
                </div>
              </div>
              <div className="course-card-body">
                <p>{c.schedule || 'No schedule set'}</p>
              </div>
              <div className="course-card-footer">
                <span className="join-code">{c.joinCode}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{c.room || ''}</span>
              </div>
            </div>
          ))}
          {courses.filter(c => c.status === activeTab).length === 0 && (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', gridColumn: '1 / -1' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                {activeTab === 'active' ? 'No active courses yet. Create your first course!' : 'No archived courses.'}
              </p>
              {activeTab === 'active' && (
                <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowModal(true)}>+ Create Course</button>
              )}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Course</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Course Name</label>
                <input className="form-input" value={form.courseName} onChange={e => setForm({ ...form, courseName: e.target.value })} required placeholder="Introduction to Programming" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group"><label className="form-label">Course Code</label><input className="form-input" value={form.courseCode} onChange={e => setForm({ ...form, courseCode: e.target.value })} required placeholder="CS101" /></div>
                <div className="form-group"><label className="form-label">Section</label><input className="form-input" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} placeholder="Section A" /></div>
              </div>
              <div className="form-group">
                <label className="form-label">Schedule</label>
                <div className="day-picker" style={{ marginBottom: '0.75rem' }}>
                  {DAYS.map(d => (
                    <div key={d.key} className={`day-chip ${selectedDays.includes(d.key) ? 'selected' : ''}`} onClick={() => toggleDay(d.key)}>
                      {d.label}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Start Time</label>
                    <input className="form-input" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>End Time</label>
                    <input className="form-input" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="form-group"><label className="form-label">Room</label><input className="form-input" value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} placeholder="Room 301" /></div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TeacherCourses;
