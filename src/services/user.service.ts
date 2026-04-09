import { api } from '../api/api';

export interface UserShort {
  id: number;
  fullName: string;
  department?: string;
  position: string;
  role?: string;
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
  userId: number;
  fullName: string;
  department: string;
  position: string;
  progress: UserProgress;
}

export const userService = {
  /** Получить всех пользователей */
  async getAllUsers(): Promise<UserShort[]> {
    const res = await api.get<any[]>('/onboarding/users');
    return res.data.map(u => ({
      id: u.id,
      fullName: u.fullName || u.name,
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

  /** Получить прогресс конкретного пользователя по ID (для HR/Наставника) */
  async getUserProgressById(userId: number): Promise<UserProgress> {
    const res = await api.get<UserProgress>(`/onboarding/user/${userId}/progress`);
    return res.data;
  },

  /** Получить отчет по всем сотрудникам (для страницы отчетов) */
  async getAllUsersProgressReport(): Promise<UserReportItem[]> {
    const res = await api.get<UserReportItem[]>('/onboarding/reports/progress-all');
    return res.data;
  },

  /** Принудительный пересчет статусов системой */
  async recalcStatuses() {
    return api.post('/onboarding/recalculate-statuses');
  }
};