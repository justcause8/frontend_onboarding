// import { api } from '../api/api';

// export interface CourseShort {
//   id: number;
//   title: string;
//   orderIndex: number;
//   status?: 'not_started' | 'in_process' | 'completed' | 'failed';
// }

// export interface Stage {
//   id: number;
//   title: string;
//   description: string;
//   orderIndex: number;
//   courses: CourseShort[];
// }

// export interface OnboardingRoute {
//   id: number;
//   title: string;
//   stages: Stage[];
// }

// export interface StageProgressItem {
//   stageId: number;
//   status: 'completed' | 'failed' | 'in_process' | 'not_started';
// }

// export interface UserProgress {
//   totalCourses: number;
//   completedCourses: number;
//   totalStages: number;
//   completedStages: number;
//   stageProgress: StageProgressItem[];
// }

// export const adaptationService = {
//   async getMyRouteId(): Promise<number | null> {
//     const res = await api.get<{ routeId: number | null }>(
//       '/onboarding/route/my-route'
//     );
//     return res.data.routeId;
//   },

//   async getUserProgress(): Promise<UserProgress> {
//     const res = await api.get<UserProgress>(
//       '/onboarding/user-progress'
//     );
//     return res.data;
//   },

//   async getRoute(routeId: number): Promise<OnboardingRoute> {
//     const res = await api.get<OnboardingRoute>(
//       `/onboarding/route/${routeId}`
//     );
//     return res.data;
//   },

//   async startCourse(courseId: number) {
//     return api.post(`/onboarding/course/${courseId}/start`);
//   },

//   async recalcStatuses() {
//     await api.post('/onboarding/recalculate-statuses');
//   },
// };
