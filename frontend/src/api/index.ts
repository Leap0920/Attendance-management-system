import api from './axiosInstance';

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { firstName: string; lastName: string; email: string; password: string; role?: string; studentId?: string }) =>
    api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
};

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (role?: string) => api.get('/admin/users', { params: { role } }),
  createUser: (data: any) => api.post('/admin/users', data),
  updateUser: (id: number, data: any) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),
  getAuditLogs: (page = 0, size = 20) =>
    api.get('/admin/audit-logs', { params: { page, size } }),
};

export const teacherApi = {
  getDashboard: () => api.get('/teacher/dashboard'),
  getCourses: () => api.get('/teacher/courses'),
  createCourse: (data: any) => api.post('/teacher/courses', data),
  getCourse: (id: number) => api.get(`/teacher/courses/${id}`),
  updateCourse: (id: number, data: any) => api.put(`/teacher/courses/${id}`, data),
  deleteCourse: (id: number) => api.delete(`/teacher/courses/${id}`),

  createAttendance: (data: any) => api.post('/teacher/attendance/create', data),
  closeAttendance: (id: number) => api.post(`/teacher/attendance/${id}/close`),
  extendAttendance: (id: number, extraMinutes: number) =>
    api.post(`/teacher/attendance/${id}/extend`, { extraMinutes }),
  getSessions: () => api.get('/teacher/attendance/sessions'),
  getRecords: (sessionId: number) => api.get(`/teacher/attendance/records/${sessionId}`),
  updateRecord: (id: number, data: any) => api.put(`/teacher/attendance/records/${id}`, data),

  getMaterials: (courseId: number) => api.get('/teacher/materials', { params: { courseId } }),
  createMaterial: (data: FormData) =>
    api.post('/teacher/materials', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteMaterial: (id: number) => api.delete(`/teacher/materials/${id}`),

  sendMessage: (data: any) => api.post('/teacher/messages/send', data),
  sendGroupMessage: (data: any) => api.post('/teacher/messages/group', data),
  getGroupMessages: (courseId: number) => api.get(`/teacher/messages/group/${courseId}`),
  getDmMessages: (userId: number) => api.get('/teacher/messages/dm', { params: { userId } }),
  broadcast: (data: any) => api.post('/teacher/messages/broadcast', data),

  getReport: (courseId: number) => api.get('/teacher/reports', { params: { courseId } }),
};

export const studentApi = {
  getDashboard: () => api.get('/student/dashboard'),
  getCourses: () => api.get('/student/courses'),
  joinCourse: (joinCode: string) => api.post('/student/courses/join', { joinCode }),
  getCourse: (id: number) => api.get(`/student/courses/${id}`),
  leaveCourse: (id: number) => api.post(`/student/courses/${id}/leave`),

  submitAttendance: (data: { sessionId: number; attendanceCode: string }) =>
    api.post('/student/attendance/submit', data),

  getMaterials: (courseId: number) => api.get('/student/materials', { params: { courseId } }),
  getMessages: () => api.get('/student/messages'),
  sendMessage: (data: any) => api.post('/student/messages/send', data),
  getGroupMessages: (courseId: number) => api.get(`/student/messages/group/${courseId}`),
  getDmMessages: (userId: number) => api.get('/student/messages/dm', { params: { userId } }),
  sendGroupMessage: (data: any) => api.post('/student/messages/group', data),
};
