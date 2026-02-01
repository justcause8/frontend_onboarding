import { api } from '../api/api';

export interface Course {
  id: number;
  title: string;
  description: string;
  orderIndex: number;
  status: string;
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

  // Начать курс
  async startCourse(courseId: number): Promise<void> {
    await api.post(`/onboarding/course/${courseId}/start`);
  },

  // Получить все курсы пользователя
  async getAllCourses(): Promise<Course[]> {
    const routeId = await coursesService.getMyRouteId();
    if (!routeId) return [];

    const route = await coursesService.getRoute(routeId);

    const allCourses: Course[] = [];
    route?.stages?.forEach((stage: any) => {
      stage.courses?.forEach((c: any) => {
        allCourses.push({
          id: c.id,
          title: c.title,
          description: '',
          orderIndex: c.orderIndex,
          status: 'Active',
          stageId: stage.id,
          materials: [],
          tests: []
        });
      });
    });

    const detailedCourses = await Promise.all(
      allCourses.map(async (course) => {
        try {
          const details = await coursesService.getCourse(course.id);
          return {
            ...course,
            description: details.description || 'Описание отсутствует',
            materials: details.materials || [],
            tests: details.tests || []
          };
        } catch {
          return { ...course, description: 'Не удалось загрузить описание', materials: [], tests: [] };
        }
      })
    );

    return detailedCourses.sort((a, b) => a.orderIndex - b.orderIndex);
  }
};