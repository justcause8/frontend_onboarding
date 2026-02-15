import { api } from '../api/api';

export interface Material {
  id: number;
  urlDocument: string;
  title: string;
  isExternalLink: boolean;
  category?: string;
}

export interface TestShort {
  id: number;
  title: string;
  passingScore: number;
}

export type CourseStatus = 'not_started' | 'in_process' | 'completed' | 'failed';

export interface Course {
  id: number;
  title: string;
  description: string;
  orderIndex: number;
  status: CourseStatus | string;
  stageId: number | null;
  materials: Material[];
  tests: TestShort[];
  testIds?: number[];
}

export const courseService = {
  async getGeneralMaterials(): Promise<Material[]> {
    const res = await api.get<Material[]>('/onboarding/materials/general');
    return res.data;
  },
  
  getFileUrl(relativePath: string): string {
    const baseUrl = api.defaults.baseURL;
    return `${baseUrl}/Files/download?path=${encodeURIComponent(relativePath)}`;
  },
  
  /** Загрузить физический файл на сервер */
  async uploadFile(file: File, subFolder: string = 'Materials'): Promise<{ relativePath: string, fileName: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await api.post(`/Files/upload?subFolder=${subFolder}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  /** Создать новый курс */
  async createCourse(data: Partial<Course>): Promise<{ id: number }> {
    const res = await api.post('/onboarding/course/create', data);
    return res.data;
  },

  /** Обновить курс */
  async updateCourse(courseId: number, data: Partial<Course>): Promise<void> {
    await api.put(`/onboarding/course/${courseId}`, data);
  },

  /** Получить полную информацию о курсе */
  async getCourseById(courseId: number): Promise<Course> {
    const res = await api.get<Course>(`/onboarding/course/${courseId}`);
    return res.data;
  },

  /** Удалить курс */
  async deleteCourse(courseId: number): Promise<void> {
    await api.delete(`/onboarding/course/${courseId}`);
  },

  /** Получить абсолютно все курсы из БД (для таблицы админа) */
  async getAllCoursesAdmin(): Promise<Course[]> {
    const res = await api.get<Course[]>('/onboarding/courses');
    return res.data;
  },

  /** Начать прохождение курса пользователем */
  async startCourse(courseId: number): Promise<void> {
    await api.post(`/onboarding/course/${courseId}/start`);
  },

  /** Получить статус конкретного курса для текущего юзера */
  async getUserCourseStatus(courseId: number): Promise<CourseStatus> {
    try {
      const res = await api.get<{ status: CourseStatus }>(`/onboarding/course/${courseId}/status`);
      return res.data.status;
    } catch (error) {
      console.error(`Ошибка получения статуса курса ${courseId}:`, error);
      return 'not_started';
    }
  },

  /** 
   * Получить список всех курсов текущего пользователя.
   * Логика: берет маршрут юзера -> достает курсы из этапов -> обогащает их статусами и деталями.
   */
  async getAllUserCourses(): Promise<Course[]> {
    try {
      // 1. Получаем маршрут (используем эндпоинт из API)
      const routeRes = await api.get<{ routeId: number | null }>('/onboarding/route/my-route');
      const routeId = routeRes.data.routeId;

      if (!routeId) return [];

      // 2. Получаем структуру маршрута
      const routeData = await api.get(`/onboarding/route/${routeId}`);
      const stages = routeData.data.stages || [];

      // 3. Собираем плоский список курсов из всех этапов
      const initialList: any[] = [];
      stages.forEach((stage: any) => {
        if (stage.courses) {
          stage.courses.forEach((c: any) => initialList.push({ ...c, stageId: stage.id }));
        }
      });

      // 4. Загружаем детали и статусы для каждого курса параллельно
      const fullCourses = await Promise.all(
        initialList.map(async (base) => {
          try {
            const [status, details] = await Promise.all([
              this.getUserCourseStatus(base.id),
              this.getCourseById(base.id)
            ]);
            return {
              ...details,
              status,
              stageId: base.stageId
            };
          } catch {
            return { ...base, status: 'not_started', materials: [], tests: [] };
          }
        })
      );

      return fullCourses.sort((a, b) => a.orderIndex - b.orderIndex);
    } catch (error) {
      console.error('Ошибка в getAllUserCourses:', error);
      return [];
    }
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
};