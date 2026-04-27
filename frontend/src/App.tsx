import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminAuditLog from './pages/admin/AuditLog';
import AdminCourses from './pages/admin/Courses';
import AdminAnalytics from './pages/admin/Analytics';
import AdminSecurity from './pages/admin/Security';
import AdminHealth from './pages/admin/Health';
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherCourses from './pages/teacher/Courses';
import TeacherCourseDetail from './pages/teacher/CourseDetail';
import TeacherAttendance from './pages/teacher/Attendance';
import TeacherMaterials from './pages/teacher/Materials';
import TeacherAssignments from './pages/teacher/Assignments';
import TeacherMessages from './pages/teacher/Messages';
import TeacherReports from './pages/teacher/Reports';
import StudentDashboard from './pages/student/Dashboard';
import StudentCourses from './pages/student/Courses';
import StudentCourseDetail from './pages/student/CourseDetail';
import StudentAttendance from './pages/student/Attendance';
import StudentMaterials from './pages/student/Materials';
import StudentAssignments from './pages/student/Assignments';
import StudentMessages from './pages/student/Messages';
import './styles/index.css';

function RootRedirect() {
  const { user, loading } = useAuth();
  const normalizeRole = (role?: string) => {
    const raw = (role || '').toLowerCase();
    if (raw.startsWith('role_')) {
      const stripped = raw.replace('role_', '');
      return stripped === 'professor' ? 'teacher' : stripped;
    }
    if (raw === 'professor') return 'teacher';
    return raw;
  };
  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${normalizeRole(user.role)}`} replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<RootRedirect />} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/courses" element={<ProtectedRoute allowedRoles={['admin']}><AdminCourses /></ProtectedRoute>} />
          <Route path="/admin/audit-log" element={<ProtectedRoute allowedRoles={['admin']}><AdminAuditLog /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><AdminAnalytics /></ProtectedRoute>} />
          <Route path="/admin/security" element={<ProtectedRoute allowedRoles={['admin']}><AdminSecurity /></ProtectedRoute>} />
          <Route path="/admin/health" element={<ProtectedRoute allowedRoles={['admin']}><AdminHealth /></ProtectedRoute>} />

          {/* Teacher */}
          <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/teacher/courses" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherCourses /></ProtectedRoute>} />
          <Route path="/teacher/courses/:id" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherCourseDetail /></ProtectedRoute>} />
          <Route path="/teacher/attendance" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherAttendance /></ProtectedRoute>} />
          <Route path="/teacher/materials" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherMaterials /></ProtectedRoute>} />
          <Route path="/teacher/assignments" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherAssignments /></ProtectedRoute>} />
          <Route path="/teacher/messages" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherMessages /></ProtectedRoute>} />
          <Route path="/teacher/reports" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherReports /></ProtectedRoute>} />

          {/* Student */}
          <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/courses" element={<ProtectedRoute allowedRoles={['student']}><StudentCourses /></ProtectedRoute>} />
          <Route path="/student/courses/:id" element={<ProtectedRoute allowedRoles={['student']}><StudentCourseDetail /></ProtectedRoute>} />
          <Route path="/student/attendance" element={<ProtectedRoute allowedRoles={['student']}><StudentAttendance /></ProtectedRoute>} />
          <Route path="/student/materials" element={<ProtectedRoute allowedRoles={['student']}><StudentMaterials /></ProtectedRoute>} />
          <Route path="/student/assignments" element={<ProtectedRoute allowedRoles={['student']}><StudentAssignments /></ProtectedRoute>} />
          <Route path="/student/messages" element={<ProtectedRoute allowedRoles={['student']}><StudentMessages /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
