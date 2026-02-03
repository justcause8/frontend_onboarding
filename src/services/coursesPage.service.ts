import { api } from '../api/api';

export interface Course {
  id: number;
  title: string;
  description: string;
  orderIndex: number;
  status: 'not_started' | 'in_process' | 'completed' | 'failed';
  stageId: number | null;
  materials: Material[];
  tests: TestShort[];
}

export interface Material {
  id: number;
  urlDocument: string;
}

export interface TestShort {
  id: number;
  title: string;
  passingScore: number;
}

export const coursesService = {
  // Получить ID маршрута пользователя
  async getMyRouteId(): Promise<number | null> {
    const res = await api.get<{ routeId: number | null }>('/onboarding/route/my-route');
    return res.data.routeId;
  },

  // Получить полный маршрут с этапами
  async getRoute(routeId: number): Promise<any> {
    const res = await api.get(`/onboarding/route/${routeId}`);
    return res.data;
  },

  // Получить детальную информацию о курсе
  async getCourse(courseId: number): Promise<Course> {
    const res = await api.get<Course>(`/onboarding/course/${courseId}`);
    return res.data;
  },

  // Получить статус курса для текущего пользователя
  async getUserCourseStatus(courseId: number): Promise<string> {
    try {
      const res = await api.get<{ courseId: number, status: string }>(
        `/onboarding/course/${courseId}/status`
      );
      return res.data.status;
    } catch (error) {
      console.error(`Ошибка получения статуса курса ${courseId}:`, error);
      return 'not_started'; // По умолчанию
    }
  },

  // Начать курс
  async startCourse(courseId: number): Promise<void> {
    await api.post(`/onboarding/course/${courseId}/start`);
  },

  // Получить все курсы пользователя с правильными статусами
  async getAllCourses(): Promise<Course[]> {
    const routeId = await coursesService.getMyRouteId();
    if (!routeId) return [];

    const route = await coursesService.getRoute(routeId);

    // Создаем массив курсов без статусов
    const allCourses: Course[] = [];
    route?.stages?.forEach((stage: any) => {
      stage.courses?.forEach((c: any) => {
        allCourses.push({
          id: c.id,
          title: c.title,
          description: '',
          orderIndex: c.orderIndex,
          status: 'not_started',
          stageId: stage.id,
          materials: [],
          tests: []
        });
      });
    });

    // Загружаем статусы для каждого курса параллельно
    const coursesWithStatus = await Promise.all(
      allCourses.map(async (course) => {
        try {
          // Получаем реальный статус пользователя для этого курса
          const userStatus = await this.getUserCourseStatus(course.id);
          
          // Загружаем детали курса
          const details = await this.getCourse(course.id);
          
          return {
            ...course,
            description: details.description || 'Описание отсутствует',
            materials: details.materials || [],
            tests: details.tests || [],
            status: (userStatus as any) || 'not_started' // Используем статус пользователя
          };
        } catch (error) {
          console.error(`Ошибка загрузки курса ${course.id}:`, error);
          return {
            ...course,
            description: 'Не удалось загрузить описание',
            materials: [],
            tests: [],
            status: 'not_started'
          };
        }
      })
    );

    // Сортируем по порядку
    return coursesWithStatus.sort((a, b) => a.orderIndex - b.orderIndex);
  },

  // Получить прогресс пользователя
  async getUserProgress(): Promise<{ courseProgress: Array<{ courseId: number, status: string }> }> {
    const res = await api.get('/onboarding/progress/user');
    return res.data;
  }
};