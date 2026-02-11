import { api } from '../api/api';

// --- ИНТЕРФЕЙСЫ ---

/** Базовая информация о тесте (для списков) */
export interface Test {
  id: number;
  courseId?: number | null;
  title: string;
  description?: string;
  passingScore: number;
  status: string;
  questionsCount?: number;
}

/** Вариант ответа */
export interface QuestionOption {
  id: number;
  text: string;
  correctAnswer?: boolean;
  orderIndex: number;
}

/** Вопрос со всеми вариантами */
export interface Question {
  id: number;
  testId: number;
  questionTypeId: number;
  typeName: string;
  textQuestion: string;
  options: QuestionOption[];
}

/** Полные данные теста для его прохождения */
export interface TestFullResponse {
  id: number;
  courseId: number;
  authorId: number;
  title: string;
  description: string;
  passingScore: number;
  status: string;
  questionsCount: number;
  questions: Question[];
}

/** Структура ответа при отправке результата */
export interface UserAnswerRequest {
  testId: number;
  answers: {
    questionId: number;
    selectedOptionIds: number[];
    answerText?: string;
  }[];
}

// --- СЕРВИС ---

export const testService = {
  
  // ==========================================
  // АДМИНИСТРАТИВНЫЕ МЕТОДЫ (Admin)
  // ==========================================

  /** Создать новый тест */
  async createTest(data: Partial<TestFullResponse>): Promise<{ message: string, testId: number }> {
    const res = await api.post<{ message: string, testId: number }>('/onboarding/test', data);
    return res.data;
  },
  
  /** Получить все тесты системы */
  async getAllTests(): Promise<Test[]> {
    const res = await api.get<Test[]>('/onboarding/tests');
    return res.data;
  },

  /** Обновить данные теста (статус, название и т.д.) */
  async updateTest(id: number, data: Partial<Test>) {
    return await api.put(`/onboarding/test/${id}`, data);
  },

  /** Удалить тест */
  async deleteTest(id: number) {
    return await api.delete(`/onboarding/test/${id}`);
  },

  // ==========================================
  // ПОЛЬЗОВАТЕЛЬСКИЕ МЕТОДЫ (Passing)
  // ==========================================

  /** Получить список тестов для конкретного курса */
  async getTestsByCourse(courseId: number): Promise<Test[]> {
    const response = await api.get<Test[]>(`/onboarding/course/${courseId}/tests`);
    return response.data;
  },

  /** Получить полные данные теста со всеми вопросами (для страницы прохождения) */
  async getTestById(testId: number): Promise<TestFullResponse> {
    const response = await api.get<TestFullResponse>(`/onboarding/test/${testId}`);
    return response.data;
  },

  /** 
   * Отправить результаты прохождения теста 
   * Принимает объект, где ключ - id вопроса, а значение - массив id выбранных ответов
   */
  async submitTestResults(testId: number, userAnswers: Record<number, number[]>) {
    const payload: UserAnswerRequest = {
      testId: testId,
      answers: Object.entries(userAnswers).map(([qId, optIds]) => ({
        questionId: Number(qId),
        selectedOptionIds: optIds,
        answerText: "" // Поле требуется API, даже если пустое
      }))
    };

    const response = await api.post('/onboarding/test/submit', payload);
    return response.data;
  }
};