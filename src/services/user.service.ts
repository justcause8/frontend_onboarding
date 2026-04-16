import { api } from '../api/api';

export interface UserShort {
  id: string;
  fullName: string;
  department?: string;
  position: string;
  role?: string;
  email?: string;
}

export interface StageProgressItem {
  stageId: number;
  status: 'not_started' | 'current' | 'completed' | 'failed';
}

export interface UserProgress {
  totalCourses: number;
  completedCourses: number;
  totalStages: number;
  completedStages: number;
  percentCourses: number; 
  percentStages: number; 
  stageProgress: StageProgressItem[];
}

export interface UserReportItem {
  userId: string;
  fullName: string;
  department: string;
  position: string;
  progress: UserProgress;
}

export interface TotalReportsResponse {
  totalEmployees: number;
  passedCount: number;
  inProgressCount: number;
  avgTestScore: number;
  avgDaysToComplete: number;
  avgCoursesProgress: number;
  departments: string[];
}

export interface EmployeeReportDetail {
  userId: number;
  fullName: string;
  department: string;
  position: string;
  routeTitle: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  completionPercent: number;
  completedCourses: number;
  totalCourses: number;
  completedTests: number;
  totalTests: number;
  avgTestScore: number;
  completedTasks: number;
  totalTasks: number;
}

export const userService = {
  /** Получить всех пользователей */
  async getAllUsers(): Promise<UserShort[]> {
    const res = await api.get<any[]>('/onboarding/users');
    return res.data.map(u => ({
      id: u.uid ?? u.guid ?? u.id,
      fullName: u.fullName || u.name,
      email: u.email,
      department: u.department,
      position: u.position || u.jobTitle || 'Сотрудник',
      role: u.role
    }));
  },

  /** Получить ID плана текущего пользователя */
  async getMyRouteId(): Promise<number | null> {
    const res = await api.get<{ routeId: number | null }>('/onboarding/route/my-route');
    return res.data.routeId;
  },

  /** Общий прогресс пользователя (для прогресс-баров) */
  async getUserProgress(): Promise<UserProgress> {
    const res = await api.get<UserProgress>('/onboarding/user-progress');
    return res.data;
  },

  /** Получить прогресс конкретного пользователя по GUID (для HR/Наставника) */
  async getUserProgressById(userId: string): Promise<UserProgress> {
    const res = await api.get<UserProgress>(`/onboarding/user/${userId}/progress`);
    return res.data;
  },

  /** Получить сводный отчет (агрегаты + отделы) */
  async getTotalReport(): Promise<TotalReportsResponse> {
    const res = await api.get<TotalReportsResponse>('/onboarding/reports/total');
    return res.data;
  },

  /** Получить детальный отчет по конкретному сотруднику */
  async getEmployeeReport(userId: string): Promise<EmployeeReportDetail> {
    const res = await api.get<EmployeeReportDetail>(`/onboarding/reports/user/${userId}`);
    return res.data;
  },

  /** Принудительный пересчет статусов системой */
  async recalcStatuses() {
    return api.post('/onboarding/recalculate-statuses');
  },

  /** Удалить пользователя из системы онбординга */
  async deleteUser(userId: string): Promise<void> {
    await api.delete(`/onboarding/user/${userId}`);
  },

  /** Синхронизировать всех пользователей из RIMS */
  async syncAllFromRims(): Promise<void> {
    await api.post('/onboarding/users/sync-all-from-rims');
  },

  /** Индивидуальная синхронизация одного пользователя из RIMS */
  async syncUserFromRims(userId: string): Promise<void> {
    await api.post(`/onboarding/user/${userId}/sync-from-rims`);
  },

  /** Изменить роль пользователя */
  async updateUserRole(userId: string, role: string) {
      return api.put(`/onboarding/user/${userId}`, { role });
  },

  /** Поиск пользователей во внешнем AD/RIMS по части ФИО или логина */
  async searchExternalUsers(query: string): Promise<ExternalUser[]> {
    const res = await api.get<ExternalUser[]>(`/rims/user/search`, { params: { q: query } });
    return res.data;
  },

  /** Импорт пользователя из RIMS в систему онбординга */
  async importUserFromRims(rimsUserId: string): Promise<ImportUserResult> {
    const res = await api.post<ImportUserResult>(`/onboarding/user/import-from-rims/${rimsUserId}`);
    return res.data;
  },
};

export interface ExternalUser {
  id: string;
  login: string;
  fullName: string;
  jobTitle: string;
  department: string;
  uid: string;
  email: string;
}

export interface ImportUserResult {
  message: string;
  user: {
    onboardingUserId: number;
    name: string;
    email: string;
    department: string;
    jobTitle: string;
    role: string;
    alreadyExisted: boolean;
  };
}