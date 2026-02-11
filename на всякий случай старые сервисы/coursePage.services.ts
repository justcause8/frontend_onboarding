// import { api } from '../api/api';

// export interface Material {
//   id: number;
//   urlDocument: string;
//   title?: string;
// }

// export interface TestShort {
//   id: number;
//   title: string;
//   passingScore: number;
// }

// export interface Course {
//   id: number;
//   title: string;
//   description: string;
//   orderIndex: number;
//   status: string;
//   stageId: number | null;
//   materials: Material[];
//   tests: TestShort[];
// }

// export const courseService = {
//   async getCourseById(courseId: number) {
//     const response = await api.get<Course>(`/onboarding/course/${courseId}`);
//     return response.data;
//   }
// };
