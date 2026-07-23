import axios from "axios";
import { UserRole } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to attach the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("siwes_access_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username: string, password: string) => {
    // Using username instead of identifier for Django
    const response = await api.post("/auth/login/", { username, password });
    if (response.data.access) {
      localStorage.setItem("siwes_access_token", response.data.access);
      localStorage.setItem("siwes_refresh_token", response.data.refresh);
      return response.data;
    }
    return response.data;
  },

  register: async (userData: any) => {
    const response = await api.post("/auth/register/", userData);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get("/users/me/");
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("siwes_access_token");
    localStorage.removeItem("siwes_refresh_token");
    localStorage.removeItem("siwes_auth_user");
  },

  updateProfile: async (formData: FormData) => {
    const response = await api.patch("/users/me/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  changePassword: async (current: string, newPass: string) => {
    const response = await api.post("/users/change_password/", {
      current_password: current,
      new_password: newPass,
    });
    return response.data;
  },

  getNotifications: async () => {
    const response = await api.get("/users/notifications/");
    return response.data;
  },

  markNotificationRead: async (id: number) => {
    await api.post(`/users/notifications/${id}/read/`);
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
    const response = await api.get("/users/");
    return response.data;
  },

  getUsers: async () => {
    const response = await api.get("/users/");
    return response.data;
  },

  getAssignmentSettings: async () => {
    const response = await api.get("/users/assignment_settings/");
    return response.data;
  },

  assignSupervisor: async (studentId: string, supervisorId: string, force = false, reason = '') => {
    const response = await api.post(`/users/${studentId}/assign-supervisor/`, {
      supervisor_id: supervisorId,
      force,
      reason,
    });
    return response.data;
  },

  getSupervisorInvitations: async () => (await api.get('/users/supervisor-invitations/')).data,
  inviteSupervisors: async (supervisors: any[]) => (await api.post('/users/supervisor-invitations/', { supervisors })).data,
  importSupervisorCsv: async (csvFile: File) => {
    const formData = new FormData();
    formData.append('csv_file', csvFile);
    return (await api.post('/users/supervisor-invitations/import/', formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  },
  activateSupervisor: async (token: string, password: string) => (await api.post('/auth/activate-supervisor/', { token, password })).data,
};

// Transform backend snake_case log data to frontend camelCase format
const transformLog = (log: any) => ({
  id: log.id?.toString() || "",
  studentId:
    log.student?.toString() || log.student_details?.id?.toString() || "",
  date: log.date || "",
  weekNumber: log.week_number || 0,
  activityDescription: log.activity_description || "",
  hasEvidence: Boolean(log.evidence_available || log.evidence_items?.length),
  evidenceIds: (log.evidence_items || []).map((item: any) => item.id.toString()),
  status: log.status || "PENDING",
  syncStatus: "SYNCED",
  supervisorComment: log.supervisor_comment || undefined,
  timestamp: log.created_at ? new Date(log.created_at).getTime() : Date.now(),
  lastModified: log.updated_at
    ? new Date(log.updated_at).getTime()
    : Date.now(),
});

export const logService = {
  getLogs: async () => {
    const response = await api.get("/logs/");
    return response.data.map(transformLog);
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
    const response = await api.get("/logs/");
    const transformedLogs = response.data.map(transformLog);
    return transformedLogs.filter((log: any) => log.studentId === studentId);
  },

  createLog: async (logData: any) => {
    // Check if logData is FormData or JSON
    const headers =
      logData instanceof FormData
        ? { "Content-Type": "multipart/form-data" }
        : {};
    const response = await api.post("/logs/", logData, { headers });
    return response.data;
  },

  updateLogStatus: async (id: number, status: string, comment?: string) => {
    const response = await api.patch(`/logs/${id}/`, {
      status,
      supervisor_comment: comment,
    });
    return response.data;
  },

  updateLog: async (id: number, logData: FormData | Record<string, unknown>) => {
    const headers = logData instanceof FormData ? { "Content-Type": "multipart/form-data" } : {};
    const response = await api.patch(`/logs/${id}/`, logData, { headers });
    return response.data;
  },

  deleteLog: async (id: number) => {
    await api.delete(`/logs/${id}/`);
  },

  getEvidence: async (id: number, evidenceId?: string) => {
    const response = await api.get(evidenceId ? `/logs/${id}/evidence/${evidenceId}/` : `/logs/${id}/evidence/`, { responseType: "blob" });
    return response.data as Blob;
  },
};

export const institutionService = {
  getAll: async () => {
    const response = await api.get("/institutions/");
    return response.data;
  },
};

export default api;
