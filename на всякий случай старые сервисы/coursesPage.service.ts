// import { api } from '../api/api';

// export interface Course {
//   id: number;
//   title: string;
//   description: string;
//   orderIndex: number;
//   status: 'not_started' | 'in_process' | 'completed' | 'failed';
//   stageId: number | null;
//   materials: Material[];
//   tests: TestShort[];
// }

// export interface Material {
//   id: number;
//   urlDocument: string;
// }

// export interface TestShort {
//   id: number;
//   title: string;
//   passingScore: number;
// }

// export const coursesService = {
//   // Получить ID маршрута пользователя
//   async getMyRouteId(): Promise<number | null> {
//     const res = await api.get<{ routeId: number | null }>('/onboarding/route/my-route');
//     return res.data.routeId;
//   },

//   // Получить полный маршрут с этапами
//   async getRoute(routeId: number): Promise<any> {
//     const res = await api.get(`/onboarding/route/${routeId}`);
//     return res.data;
//   },

//   // Получить детальную информацию о курсе
//   async getCourse(courseId: number): Promise<Course> {
//     const res = await api.get<Course>(`/onboarding/course/${courseId}`);
//     return res.data;
//   },

//   // Получить статус курса для текущего пользователя
//   async getUserCourseStatus(courseId: number): Promise<'not_started' | 'in_process' | 'completed' | 'failed'> {
//     try {
//       const res = await api.get<{ courseId: number, status: 'not_started' | 'in_process' | 'completed' | 'failed' }>(
//         `/onboarding/course/${courseId}/status`
//       );
//       return res.data.status;
//     } catch (error) {
//       console.error(`Ошибка получения статуса курса ${courseId}:`, error);
//       return 'not_started';
//     }
//   },

//   // Начать курс
//   async startCourse(courseId: number): Promise<void> {
//     await api.post(`/onboarding/course/${courseId}/start`);
//   },

//   // Получить все курсы пользователя с правильными статусами
//   async getAllCourses(): Promise<Course[]> {
//     try {
//       // 1. Получаем ID маршрута текущего пользователя
//       const routeId = await this.getMyRouteId();
//       if (!routeId) {
//         console.warn('Маршрут не найден для текущего пользователя');
//         return [];
//       }

//       // 2. Загружаем структуру маршрута (этапы -> курсы)
//       const route = await this.getRoute(routeId);
//       if (!route || !route.stages) {
//         return [];
//       }

//       // 3. Собираем "плоский" список всех курсов из всех этапов
//       const initialCoursesList: { id: number; title: string; orderIndex: number; stageId: number }[] = [];
      
//       route.stages.forEach((stage: any) => {
//         if (stage.courses && Array.isArray(stage.courses)) {
//           stage.courses.forEach((course: any) => {
//             initialCoursesList.push({
//               id: course.id,
//               title: course.title,
//               orderIndex: course.orderIndex,
//               stageId: stage.id
//             });
//           });
//         }
//       });

//       // 4. Для каждого курса параллельно загружаем статус пользователя и полные детали (тесты, материалы)
//       const coursesWithFullData = await Promise.all(
//         initialCoursesList.map(async (baseCourse) => {
//           try {
//             // Запускаем запросы статуса и деталей одновременно для экономии времени
//             const [userStatus, details] = await Promise.all([
//               this.getUserCourseStatus(baseCourse.id),
//               this.getCourse(baseCourse.id)
//             ]);

//             const fullCourse: Course = {
//               id: baseCourse.id,
//               title: baseCourse.title,
//               orderIndex: baseCourse.orderIndex,
//               stageId: baseCourse.stageId,
//               description: details.description || 'Описание отсутствует',
//               status: userStatus, // Здесь придет 'not_started' | 'in_process' | 'completed' | 'failed'
//               materials: details.materials || [],
//               tests: details.tests || []
//             };

//             return fullCourse;
//           } catch (error) {
//             console.error(`Ошибка при загрузке данных для курса ${baseCourse.id}:`, error);
            
//             // Возвращаем минимально рабочую версию курса, чтобы страница не "падала" целиком
//             return {
//               id: baseCourse.id,
//               title: baseCourse.title,
//               orderIndex: baseCourse.orderIndex,
//               stageId: baseCourse.stageId,
//               description: 'Не удалось загрузить данные курса',
//               status: 'not_started' as const,
//               materials: [],
//               tests: []
//             };
//           }
//         })
//       );

//       // 5. Сортируем курсы по их порядковому номеру
//       return coursesWithFullData.sort((a, b) => a.orderIndex - b.orderIndex);

//     } catch (error) {
//       console.error('Критическая ошибка в getAllCourses:', error);
//       throw error; // Пробрасываем ошибку, чтобы компонент показал ErrorState
//     }
//   },

//   // Получить прогресс пользователя
//   async getUserProgress(): Promise<{ courseProgress: Array<{ courseId: number, status: string }> }> {
//     const res = await api.get('/onboarding/progress/user');
//     return res.data;
//   }
// };