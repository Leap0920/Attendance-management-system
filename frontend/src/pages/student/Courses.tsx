import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { studentApi } from '../../api';
import { showAlert, showApiError } from '../../utils/feedback';

const StudentCourses: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCourses = async () => {
    try {
      const res = await studentApi.getCourses();
      setCourses(res.data.data || []);
    } catch (err: any) {
      showApiError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || submitting) return;
    
    setSubmitting(true);
    try {
      const res = await studentApi.joinCourse(joinCode);
      showAlert('Success', res.data.message || 'Successfully joined the course!', 'success');
      setShowJoin(false);
      setJoinCode('');
      fetchCourses();
    } catch (err: any) {
      showApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout role="student">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Courses</h1>
          <p className="page-subtitle">Manage your enrolled courses and join new ones</p>
        </div>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowJoin(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Join Course
        </button>
      </div>

      {loading ? (
        <div className="loading-screen">
          <div className="spinner"></div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading your courses...</p>
        </div>
      ) : (
        <div className="course-grid">
          {courses.map((cd: any) => (
            <div key={cd.course?.id} className="course-card" onClick={() => navigate(`/student/courses/${cd.course?.id}`)}>
              <div className="course-card-header" style={{ background: cd.course?.coverColor || 'var(--accent-blue)' }}>
                <h3>{cd.course?.courseName}</h3>
                <p>{cd.course?.courseCode}</p>
                <div className="teacher-avatar">
                  {cd.course?.teacher ? (
                    <>{cd.course?.teacher?.firstName?.[0]}{cd.course?.teacher?.lastName?.[0]}</>
                  ) : 'TBA'}
                </div>
              </div>
              <div className="course-card-body">
                <p style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.5rem' }}>
                  {cd.course?.description || 'No description provided for this course.'}
                </p>
              </div>
              <div className="course-card-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  <span>{cd.course?.room || 'Remote/TBA'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  <span>{cd.course?.schedule || 'No schedule set'}</span>
                </div>
              </div>
            </div>
          ))}
          {courses.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '5rem 2rem', background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-glass)' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1.5rem', opacity: 0.8 }}>📚</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No courses yet</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: '1.5rem' }}>
                You haven't enrolled in any courses yet. Get your course join code from your teacher and join now!
              </p>
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowJoin(true)}>Join Your First Course</button>
            </div>
          )}
        </div>
      )}

      {showJoin && (
        <div className="modal-overlay" onClick={() => setShowJoin(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Join a Course</h3>
              <button className="modal-close" onClick={() => setShowJoin(false)}>&times;</button>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Ask your teacher for the course code, then enter it below to join the classroom.
            </p>
            <form onSubmit={handleJoin}>
              <div className="form-group">
                <label className="form-label">Course Code</label>
                <input 
                  className="form-input" 
                  autoFocus
                  value={joinCode} 
                  onChange={e => setJoinCode(e.target.value.toUpperCase())} 
                  required
                  style={{ 
                    fontFamily: 'var(--mono)', 
                    fontSize: '1.5rem', 
                    letterSpacing: '0.4rem', 
                    textAlign: 'center',
                    padding: '1rem',
                    textTransform: 'uppercase'
                  }} 
                  placeholder="ABC123" 
                  maxLength={6}
                />
              </div>
              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowJoin(false)} style={{ width: 'auto', flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto', flex: 1 }} disabled={submitting || joinCode.length < 6}>
                  {submitting ? 'Joining...' : 'Join Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default StudentCourses;

