import { api } from '../api/api';
import type { UserShort } from './user.service';

export interface Stage {
  id: number;
  title: string;
  description: string;
  orderIndex: number;
  courses: any[]; 
}

export interface OnboardingRoute {
  id: number;
  title: string;
  description: string;
  status: string;
  mentor?: UserShort; 
  stages: Stage[];
  assignedEmployees?: UserShort[]; 
}

export const adaptationService = {
  /** Все планы (Админка) */
  async getAllRoutes(): Promise<OnboardingRoute[]> {
    const res = await api.get<OnboardingRoute[]>('/onboarding/routes');
    return res.data;
  },

  /** Детали конкретного плана со стадиями */
  async getRoute(routeId: number): Promise<OnboardingRoute> {
    const res = await api.get<OnboardingRoute>(`/onboarding/route/${routeId}`);
    return res.data;
  },

  async createRoute(data: any): Promise<{ routeId: number }> {
    const res = await api.post<{ routeId: number }>('/onboarding/route/create', data);
    return res.data; 
  },

  async updateRoute(id: number, data: any) {
    return api.put(`/onboarding/route/${id}`, data);
  },

  async deleteRoute(id: number) {
    return api.delete(`/onboarding/route/${id}`);
  },

  // Работа с этапами
  async addStages(routeId: number, stages: any[]) {
    return api.post('/onboarding/route/add-stages', { routeId, stages });
  },

  async deleteStage(stageId: number) {
    return api.delete(`/onboarding/stage/${stageId}`);
  },

  /** Обновить данные этапа */
  async updateStage(stageId: number, data: { title?: string; description?: string; orderIndex?: number }) {
    return api.put(`/onboarding/stage/${stageId}`, data);
  },
};