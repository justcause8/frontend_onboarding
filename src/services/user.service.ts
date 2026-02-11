import { api } from '../api/api';

export interface UserShort {
  id: number;
  fullName: string;
  position: string;
  role?: string;
}

export interface StageProgressItem {
  stageId: number;
  status: 'completed' | 'failed' | 'in_process' | 'not_started';
}

export interface UserProgress {
  totalCourses: number;
  completedCourses: number;
  totalStages: number;
  completedStages: number;
  stageProgress: StageProgressItem[];
}

export const userService = {
  /** Получить всех пользователей */
  async getAllUsers(): Promise<UserShort[]> {
    const res = await api.get<any[]>('/onboarding/users');
    return res.data.map(u => ({
      id: u.id,
      fullName: u.fullName || u.name,
      position: u.position || u.jobTitle || 'Сотрудник',
      role: u.role
    }));
  },

  /** Получить ID маршрута текущего пользователя */
  async getMyRouteId(): Promise<number | null> {
    const res = await api.get<{ routeId: number | null }>('/onboarding/route/my-route');
    return res.data.routeId;
  },

  /** Общий прогресс пользователя (для прогресс-баров) */
  async getUserProgress(): Promise<UserProgress> {
    const res = await api.get<UserProgress>('/onboarding/user-progress');
    return res.data;
  },

  /** Принудительный пересчет статусов системой */
  async recalcStatuses() {
    return api.post('/onboarding/recalculate-statuses');
  }
};