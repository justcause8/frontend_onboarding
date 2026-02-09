import { api } from '../api/api';

// --- ИНТЕРФЕЙСЫ ---

export interface UserShort {
  id: number;
  fullName: string;
  position: string;
  role?: string; // Для фильтрации Mentor/User
}

export interface CourseBase {
  id: number;
  title: string;
  description?: string;
  orderIndex: number;
  status: string;
  stageId?: number | null;
}

export interface Stage {
  id: number;
  title: string;
  description: string;
  orderIndex: number;
  courses: CourseBase[];
}

export interface OnboardingRoute {
  id: number;
  title: string;
  description: string;
  status: string;
  mentor?: UserShort;
  stages: Stage[];
  assignedEmployees: UserShort[];
}

// --- СЕРВИС ---

export const adaptationService = {
  
  // ==========================================
  // ПОЛЬЗОВАТЕЛИ (Для поиска и назначений)
  // ==========================================

  /** Получить всех пользователей (для поиска наставников и сотрудников) */
  async getAllUsers(): Promise<UserShort[]> {
    const res = await api.get<any[]>('/onboarding/users');
    return res.data.map(u => ({
      id: u.id,
      fullName: u.fullName || u.name, // Поддержка разных форматов имен
      position: u.position || u.jobTitle || 'Сотрудник',
      role: u.role
    }));
  },

  /** Получить информацию о конкретном пользователе */
  async getUserInfo(userId: number) {
    return api.get(`/onboarding/user/${userId}`);
  },

  // ==========================================
  // МАРШРУТЫ (Routes)
  // ==========================================

  /** Создать новый маршрут */
  async createRoute(data: { 
    title: string; 
    description: string; 
    mentorId: number; 
    userIds: number[] 
  }): Promise<{ routeId: number }> {
    const res = await api.post('/onboarding/route/create', data);
    return res.data;
  },

  /** Получить все маршруты (для таблицы администратора) */
  async getAllRoutes(): Promise<OnboardingRoute[]> {
    const res = await api.get<OnboardingRoute[]>('/onboarding/routes');
    return res.data;
  },

  /** Получить полную структуру маршрута по ID */
  async getRoute(routeId: number): Promise<OnboardingRoute> {
    const res = await api.get<OnboardingRoute>(`/onboarding/route/${routeId}`);
    return res.data;
  },

  /** Обновить основную информацию маршрута */
 async updateRoute(id: number, data: Partial<OnboardingRoute> & { mentorId?: number, userIds?: number[] }) {
    return api.put(`/onboarding/route/${id}`, data);
  },

  /** Удалить маршрут */
  async deleteRoute(id: number) {
    return api.delete(`/onboarding/route/${id}`);
  },

  /** Назначить маршрут пользователю */
  async assignRouteToUser(userId: number, routeId: number) {
    return api.post('/onboarding/route/assign-to-user', { userId, routeId });
  },

  /** Получить ID "моего" маршрута (для текущего юзера) */
  async getMyRouteId(): Promise<number | null> {
    const res = await api.get<{ routeId: number | null }>('/onboarding/route/my-route');
    return res.data.routeId;
  },

  // ==========================================
  // ЭТАПЫ (Stages)
  // ==========================================

  /** Добавить массив этапов к маршруту */
  async addStages(routeId: number, stages: { title: string; description: string; order: number }[]) {
    return api.post('/onboarding/route/add-stages', {
      routeId: routeId,
      stages: stages
    });
  },

  /** Обновить данные этапа */
  async updateStage(stageId: number, data: { title?: string; description?: string; order?: number }) {
    return api.put(`/onboarding/stage/${stageId}`, data);
  },

  /** Удалить этап */
  async deleteStage(stageId: number) {
    return api.delete(`/onboarding/stage/${stageId}`);
  },

  // ==========================================
  // КУРСЫ (Courses)
  // ==========================================

  /** Получить все существующие курсы (для поиска и привязки) */
  async getAllCourses(): Promise<CourseBase[]> {
    const res = await api.get<CourseBase[]>('/onboarding/courses');
    return res.data;
  },

  /** Создать курс (теперь stageId может быть null) */
  async createCourse(data: {
    title: string;
    description: string;
    stageId: number | null;
    orderIndex: number;
    status: string;
  }): Promise<{ id: number }> {
    const res = await api.post('/onboarding/course/create', data);
    return res.data;
  },

  /** 
   * Обновить курс или привязать его к этапу 
   * (Используется, когда мы выбрали существующий курс и "прикрепляем" его к этапу)
   */
  async linkCourseToStage(courseId: number, stageId: number | null, orderIndex: number) {
    return api.put(`/onboarding/course/${courseId}`, {
      stageId: stageId,
      orderIndex: orderIndex
    });
  },

  /** Начать прохождение курса */
  async startCourse(courseId: number) {
    return api.post(`/onboarding/course/${courseId}/start`);
  },

  /** Завершить курс */
  async completeCourse(courseId: number) {
    return api.post(`/onboarding/course/${courseId}/complete`);
  },

  /** Удалить курс */
  async deleteCourse(courseId: number) {
    return api.delete(`/onboarding/course/${courseId}`);
  },

  // ==========================================
  // СИСТЕМНЫЕ МЕТОДЫ
  // ==========================================

  /** Пересчитать статусы (для прогресс-баров) */
  async recalcStatuses() {
    return api.post('/onboarding/recalculate-statuses');
  }
};