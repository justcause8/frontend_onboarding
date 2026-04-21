import { api } from '../api/api';

export interface OnboardingTask {
  id: number;
  fkOnboardingStageId: number;
  fkUserId: number | null;
  description: string;
  taskType: 'individual' | 'general';
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskSubmission {
  id: number;
  fkTaskId: number;
  fkUserId?: number;
  answerText: string | null;
  fileUrl: string | null;
  status: 'pending' | 'approved' | 'rejected';
  mentorComment: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const taskService = {
  async getAllTasks(): Promise<OnboardingTask[]> {
    const res = await api.get<OnboardingTask[]>('/onboarding/tasks');
    return res.data;
  },

  async getTasksByStage(stageId: number): Promise<OnboardingTask[]> {
    const res = await api.get<OnboardingTask[]>(`/onboarding/stage/${stageId}/tasks`);
    return res.data;
  },

  async getTask(taskId: number): Promise<OnboardingTask> {
    const res = await api.get<OnboardingTask>(`/onboarding/task/${taskId}`);
    return res.data;
  },

  async createTask(data: {
    fkOnboardingStageId: number;
    fkUserId: number | null;
    description: string;
    taskType: 'individual' | 'general';
    status: 'active' | 'inactive';
  }): Promise<OnboardingTask> {
    const res = await api.post<OnboardingTask>('/onboarding/task', data);
    return res.data;
  },

  async updateTask(taskId: number, data: { description?: string; taskType?: string }): Promise<void> {
    await api.put(`/onboarding/task/${taskId}`, data);
  },

  async deleteTask(taskId: number): Promise<void> {
    await api.delete(`/onboarding/task/${taskId}`);
  },

  // Submissions
  async getSubmissionsByTask(taskId: number): Promise<TaskSubmission[]> {
    const res = await api.get<TaskSubmission[]>(`/onboarding/task/${taskId}/submissions`);
    return res.data;
  },

  async getSubmission(submissionId: number): Promise<TaskSubmission> {
    const res = await api.get<TaskSubmission>(`/onboarding/submission/${submissionId}`);
    return res.data;
  },

  async createSubmission(data: {
    fkTaskId: number;
    answerText: string | null;
    fileUrl: string | null;
  }): Promise<TaskSubmission> {
    const res = await api.post<TaskSubmission>('/onboarding/submission', data);
    return res.data;
  },

  async updateSubmissionAnswer(submissionId: number, data: { answerText: string; fileUrl?: string | null }): Promise<void> {
    await api.put(`/onboarding/submission/${submissionId}/answer`, data);
  },

  async reviewSubmission(submissionId: number, data: { mentorComment: string; status: 'approved' | 'rejected' }): Promise<void> {
    await api.put(`/onboarding/submission/${submissionId}/review`, data);
  },

  async deleteSubmission(submissionId: number): Promise<void> {
    await api.delete(`/onboarding/submission/${submissionId}`);
  },
};
