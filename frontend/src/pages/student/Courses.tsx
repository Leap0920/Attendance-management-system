import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { studentApi } from '../../api';

const StudentCourses: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinMsg, setJoinMsg] = useState('');

  useEffect(() => {
    studentApi.getCourses().then(res => { setCourses(res.data.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await studentApi.joinCourse(joinCode);
      setJoinMsg(res.data.message || 'Joined!');
      setShowJoin(false);
      setJoinCode('');
      studentApi.getCourses().then(res => setCourses(res.data.data || []));
    } catch (err: any) { setJoinMsg(err.response?.data?.message || 'Failed'); }
  };

  return (
    <DashboardLayout role="student">
      <div className="page-header">
        <div><h1 className="page-title">My Courses</h1></div>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowJoin(true)}>+ Join Course</button>
      </div>

      {joinMsg && <div className="alert alert-success">{joinMsg}</div>}

      {loading ? <div className="loading-screen"><div className="spinner"></div></div> : (
        <div className="course-grid">
          {courses.map((cd: any) => (
            <div key={cd.course?.id} className="course-card" onClick={() => navigate(`/student/courses/${cd.course?.id}`)}>
              <div className="course-card-header" style={{ background: cd.course?.coverColor }}>
                <h3>{cd.course?.courseName}</h3>
                <p>{cd.course?.courseCode}</p>
              </div>
              <div className="course-card-body">
                <p>{cd.course?.description || 'No description'}</p>
              </div>
              <div className="course-card-footer">
                <span style={{ color: 'var(--text-secondary)' }}>{cd.course?.schedule || ''}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{cd.course?.room || ''}</span>
              </div>
            </div>
          ))}
          {courses.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              No courses yet. Click "Join Course" to get started!
            </div>
          )}
        </div>
      )}

      {showJoin && (
        <div className="modal-overlay" onClick={() => setShowJoin(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Join a Course</h3>
              <button className="modal-close" onClick={() => setShowJoin(false)}>×</button>
            </div>
            <form onSubmit={handleJoin}>
              <div className="form-group">
                <label className="form-label">Enter Join Code</label>
                <input className="form-input" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} required
                  style={{ fontFamily: 'Courier New', fontSize: '1.25rem', letterSpacing: '0.3rem', textAlign: 'center' }} placeholder="ABC123" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowJoin(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Join</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default StudentCourses;
