import { api } from '../api/api';

export interface QuestionOption {
  id: number;
  text: string;
  correctAnswer?: boolean;
  orderIndex: number;
}

export interface Question {
  id: number;
  testId: number;
  questionTypeId: number;
  typeName: string;
  textQuestion: string;
  options: QuestionOption[];
}

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

export interface UserAnswerRequest {
  testId: number;
  answers: {
    questionId: number;
    selectedOptionIds: number[];
  }[];
}

class TestService {
  /**
   * Получить полные данные теста со всеми вопросами и вариантами ответов
   */
  async getTestById(testId: number): Promise<TestFullResponse> {
    const response = await api.get<TestFullResponse>(`/onboarding/test/${testId}`);
    return response.data;
  }

  /**
   * Получить список тестов для конкретного курса (без вопросов)
   */
  async getTestsByCourse(courseId: number) {
    const response = await api.get(`/onboarding/course/${courseId}/tests`);
    return response.data;
  }

  /**
   * Отправить результаты прохождения теста
   */
    async submitTestResults(testId: number, userAnswers: Record<number, number[]>) {
    const payload = {
        testId: testId,
        answers: Object.entries(userAnswers).map(([qId, optIds]) => ({
        questionId: Number(qId),
        selectedOptionIds: optIds,
        answerText: ""
        }))
    };

    const response = await api.post('/onboarding/test/submit', payload);
    return response.data;
    }
}

export const testService = new TestService();