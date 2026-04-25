import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  MapPin, 
  Clock, 
  X, 
  BookOpen, 
  ArrowRight
} from 'lucide-react';
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
      <div className="page-header mb-8">
        <div>
          <h1 className="page-title text-3xl font-extrabold tracking-tight">My Courses</h1>
          <p className="page-subtitle text-muted opacity-80">Track your learning journey and join new classrooms</p>
        </div>
        <button className="btn btn-primary shadow-sm hover:shadow-md transition-all active:scale-95" style={{ width: 'auto' }} onClick={() => setShowJoin(true)}>
          <Plus size={18} className="mr-2" />
          Join Course
        </button>
      </div>

      {loading ? (
        <div className="loading-screen py-12">
          <div className="spinner mb-4"></div>
          <p className="text-muted text-sm">Synchronizing your curriculum...</p>
        </div>
      ) : (
        <div className="course-grid">
          {courses.map((cd: any) => (
            <div key={cd.course?.id} className="course-card group hover:shadow-xl hover:translate-y-[-4px] transition-all cursor-pointer border border-transparent hover:border-blue-100" onClick={() => navigate(`/student/courses/${cd.course?.id}`)}>
              <div className="course-card-header h-32 relative overflow-hidden flex flex-col justify-end p-4 text-white" style={{ background: cd.course?.coverColor || 'var(--accent-blue)' }}>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black/0 to-black/20" />
                <h3 className="relative z-10 m-0 text-lg font-bold group-hover:translate-x-1 transition-transform">{cd.course?.courseName}</h3>
                <p className="relative z-10 m-0 text-sm opacity-90 font-mono">{cd.course?.courseCode}</p>
                <div className="teacher-avatar shadow-lg border-2 border-white/20 group-hover:scale-110 transition-transform">
                  {cd.course?.teacher ? (
                    <>{cd.course?.teacher?.firstName?.[0]}{cd.course?.teacher?.lastName?.[0]}</>
                  ) : 'TBA'}
                </div>
              </div>
              <div className="course-card-body p-4 min-h-[100px]">
                <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                  {cd.course?.description || 'No description provided for this course. Explore the classroom to view materials and announcements.'}
                </p>
              </div>
              <div className="course-card-footer px-4 py-3 bg-gray-50 border-t flex flex-col gap-2">
                <div className="flex items-center gap-2 text-muted text-xs font-medium">
                  <MapPin size={14} className="opacity-70" />
                  <span>{cd.course?.room || 'Remote/TBA'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted text-xs font-medium">
                  <Clock size={14} className="opacity-70" />
                  <span>{cd.course?.schedule || 'No schedule set'}</span>
                </div>
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight size={20} className="text-blue-500" />
                </div>
              </div>
            </div>
          ))}
          {courses.length === 0 && (
            <div className="empty-state bg-white/50 backdrop-blur-sm border-2 border-dashed border-gray-200" style={{ gridColumn: '1 / -1', padding: '6rem 2rem', borderRadius: 'var(--radius-xl)' }}>
              <div className="bg-gray-50 p-6 rounded-full inline-block mb-6 shadow-inner">
                <BookOpen size={48} className="text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No courses yet</h3>
              <p className="text-muted max-w-sm mx-auto mb-8">
                Your academic list is currently empty. Get a join code from your instructor to get started!
              </p>
              <button className="btn btn-primary shadow-sm hover:translate-y-[-2px] transition-all" style={{ width: 'auto' }} onClick={() => setShowJoin(true)}>
                <Plus size={18} className="mr-2" /> Join Your First Course
              </button>
            </div>
          )}
        </div>
      )}

      {showJoin && (
        <div className="modal-overlay" onClick={() => setShowJoin(false)}>
          <div className="modal shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header border-b pb-4">
              <h3 className="modal-title">Join a Classroom</h3>
              <button className="modal-close hover:rotate-90 transition-transform" onClick={() => setShowJoin(false)}><X size={20} /></button>
            </div>
            <div className="mt-6 mb-8 text-center">
                <p className="text-sm text-muted">
                Enter the unique 6-character code provided by your teacher to enroll in their course.
                </p>
            </div>
            <form onSubmit={handleJoin}>
              <div className="form-group">
                <label className="form-label text-[10px] uppercase font-black tracking-widest text-centered text-blue-600 mb-2 block">Instructional Join Code</label>
                <input 
                  className="form-input focus:ring-4 focus:ring-blue-100 transition-all border-2" 
                  autoFocus
                  value={joinCode} 
                  onChange={e => setJoinCode(e.target.value.toUpperCase())} 
                  required
                  style={{ 
                    fontFamily: 'var(--mono)', 
                    fontSize: '1.75rem', 
                    letterSpacing: '0.6rem', 
                    textAlign: 'center',
                    padding: '1.25rem',
                    textTransform: 'uppercase',
                    borderRadius: '16px'
                  }} 
                  placeholder="CODE24" 
                  maxLength={6}
                />
              </div>
              <div className="modal-actions gap-4 mt-8">
                <button type="button" className="btn btn-secondary py-3 flex-1 transition-colors" onClick={() => setShowJoin(false)}>Discard</button>
                <button type="submit" className="btn btn-primary py-3 flex-1 shadow-sm hover:shadow-md transition-all active:scale-95" disabled={submitting || joinCode.length < 6}>
                  {submitting ? 'Authenticating...' : 'Enter Course'}
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

