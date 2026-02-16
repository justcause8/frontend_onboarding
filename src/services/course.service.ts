import { api } from '../api/api';
import type { Material } from '../services/material.service';
import { extractFileNameFromUrl } from '../utils/fileUtils';

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

const prepareCoursePayload = (data: Partial<Course>) => {
  return {
    ...data,
    materials: data.materials?.map(m => ({
      id: m.id,
      title: m.title || extractFileNameFromUrl(m.urlDocument),
      urlDocument: m.urlDocument,
      isExternalLink: m.isExternalLink,
      category: m.category || 'Общее'
    })),
    testIds: data.testIds || data.tests?.map(t => t.id) || []
  };
};

export const courseService = {
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

  /** Получить список всех курсов текущего пользователя через маршрут */
  async getAllUserCourses(): Promise<Course[]> {
    try {
      const routeRes = await api.get<{ routeId: number | null }>('/onboarding/route/my-route');
      const routeId = routeRes.data.routeId;

      if (!routeId) return [];

      const routeData = await api.get(`/onboarding/route/${routeId}`);
      const stages = routeData.data.stages || [];

      const initialList: any[] = [];
      stages.forEach((stage: any) => {
        if (stage.courses) {
          stage.courses.forEach((c: any) => initialList.push({ ...c, stageId: stage.id }));
        }
      });

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

  async createCourse(data: Partial<Course>): Promise<{ id: number }> {
    const payload = prepareCoursePayload(data);
    const res = await api.post('/onboarding/course/create', payload);
    return res.data;
  },

  async updateCourse(courseId: number, data: Partial<Course>): Promise<void> {
    const payload = prepareCoursePayload(data);
    await api.put(`/onboarding/course/${courseId}`, payload);
  },

  async linkCourseToStage(course: Course, stageId: number | null, orderIndex: number) {
    // Используем ту же очистку данных
    const payload = prepareCoursePayload({
      ...course,
      stageId: stageId,
      orderIndex: orderIndex
    });
    
    return api.put(`/onboarding/course/${course.id}`, payload);
  },
};