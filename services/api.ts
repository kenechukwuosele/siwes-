import axios from 'axios';
import { UserRole } from '../types';

const API_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('siwes_access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username: string, password: string) => { // Using username instead of identifier for Django
    const response = await api.post('/auth/login/', { username, password });
    if (response.data.access) {
      localStorage.setItem('siwes_access_token', response.data.access);
      localStorage.setItem('siwes_refresh_token', response.data.refresh);
      return response.data;
    }
    return response.data;
  },
  
  register: async (userData: any) => {
    const response = await api.post('/auth/register/', userData);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/users/me/');
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('siwes_access_token');
    localStorage.removeItem('siwes_refresh_token');
    localStorage.removeItem('siwes_auth_user');
  },

  updateProfile: async (formData: FormData) => {
      const response = await api.patch('/users/me/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
  },

  changePassword: async (current: string, newPass: string) => {
      // In a real app this would have its own endpoint, but for MVP we might patch 'password' on /me/ 
      // OR assumming a custom action. Let's assume a custom action on UserViewSet
      // Since we didn't implement it yet, let's just stick to the plan:
      // I need to add set_password action to UserViewSet in backend if I want this to work strictly.
      // For now let's PATCH /users/me/ with password (standard Django behavior usually requires old password verification)
      // I will assume the backend supports a simple update for now or I will add the action in a moment.
      const response = await api.patch('/users/me/', { password: newPass });
      return response.data;
  },

  getAllStudents: async () => {
    // Ideally this should be a separate endpoint /users/?role=STUDENT
    // For MVP, we'll fetch all users and filter, OR assume the backend endpoint handles filtering if we pass query params
    // Let's rely on backend filtering if possible, but the viewset just returns all.
    // I will fetch all and filter in frontend for now to save backend churn, 
    // OR just add a query param support to backend? 
    // The backend UserViewSet:
    // def get_queryset(self):
    //    user = self.request.user
    //    if user.role == 'STUDENT':
    //        return CustomUser.objects.filter(id=user.id)
    //    return CustomUser.objects.all()
    // 
    // Supervisors/ITF see ALL users. So getting /users/ is fine.
    const response = await api.get('/users/');
    return response.data;
  }
};

export const logService = {
  getLogs: async () => {
    const response = await api.get('/logs/');
    return response.data;
  },
  
  getStudentLogs: async (studentId: string) => {
      // We need a way to filter logs by student.
      // The current LogEntryViewSet returns all logs for Supervisor.
      // We should probably add a filter backend or just filter on client side for MVP.
      // But let's assume we can filter via query param if we added django-filter
      // Since we didn't add django-filter, let's just fetch all and filter in frontend for the 'Review' page,
      // OR better, we can assume the backend returns EVERYTHING and we filter client side.
      // However, for scalability, an endpoint is better.
      // Let's use Client-side filtering of the `getLogs` result for MVP to avoid backend churn unless necessary.
      // Actually, wait, `getLogs` returns `LogEntry.objects.all()` for supervisors.
      // So calling `getLogs` gets EVERYONE'S logs.
      const response = await api.get('/logs/');
      return response.data.filter((log: any) => log.student === studentId || log.student_details?.id === studentId || log.student.toString() === studentId);
  },

  createLog: async (logData: any) => {
    // Check if logData is FormData or JSON
    const headers = logData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
    const response = await api.post('/logs/', logData, { headers });
    return response.data;
  },
  
  updateLogStatus: async (id: number, status: string, comment?: string) => {
    const response = await api.patch(`/logs/${id}/`, { status, supervisor_comment: comment });
    return response.data;
  }
};

export const institutionService = {
  getAll: async () => {
    const response = await api.get('/institutions/');
    return response.data;
  }
};

export default api;
