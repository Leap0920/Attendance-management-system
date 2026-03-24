import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { teacherApi } from '../../api';

const TeacherCourses: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ courseCode: '', courseName: '', description: '', section: '', schedule: '', room: '' });

  useEffect(() => {
    teacherApi.getCourses().then(res => { setCourses(res.data.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await teacherApi.createCourse(form);
      setShowModal(false);
      setForm({ courseCode: '', courseName: '', description: '', section: '', schedule: '', room: '' });
      teacherApi.getCourses().then(res => setCourses(res.data.data || []));
    } catch {}
  };

  return (
    <DashboardLayout role="teacher">
      <div className="page-header">
        <div><h1 className="page-title">My Courses</h1></div>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowModal(true)}>+ Create Course</button>
      </div>

      {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
        <div className="course-grid">
          {courses.map(c => (
            <div key={c.id} className="course-card">
              <div className="course-card-header" style={{ background: c.coverColor }}>
                <h3>{c.courseName}</h3>
                <p>{c.courseCode} {c.section ? `• ${c.section}` : ''}</p>
              </div>
              <div className="course-card-body"><p>{c.description || 'No description'}</p></div>
              <div className="course-card-footer">
                <span className="join-code">{c.joinCode}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{c.room || ''}</span>
              </div>
            </div>
          ))}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group"><label className="form-label">Course Code</label><input className="form-input" value={form.courseCode} onChange={e => setForm({...form, courseCode: e.target.value})} required /></div>
                <div className="form-group"><label className="form-label">Section</label><input className="form-input" value={form.section} onChange={e => setForm({...form, section: e.target.value})} /></div>
              </div>
              <div className="form-group"><label className="form-label">Course Name</label><input className="form-input" value={form.courseName} onChange={e => setForm({...form, courseName: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group"><label className="form-label">Schedule</label><input className="form-input" value={form.schedule} onChange={e => setForm({...form, schedule: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Room</label><input className="form-input" value={form.room} onChange={e => setForm({...form, room: e.target.value})} /></div>
              </div>
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
