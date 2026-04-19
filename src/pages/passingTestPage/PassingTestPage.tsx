import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../../contexts/PageTitleContext';

import { testService } from '../../services/test.service';
import type { TestFullResponse, Question, QuestionOption } from '../../services/test.service';
import { courseService } from '../../services/course.service';

import LoadingSpinner from '../../components/loading/LoadingSpinner';
import TestResultModal from '../../components/modals/testResultModal/TestResultModal';
import './PassingTestPage.css';

type UserAnswers = Record<number, number[]>;

const PassingTestPage = () => {
  const { courseId, testId } = useParams<{ courseId: string; testId: string }>();
  const { setDynamicTitle } = usePageTitle();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [test, setTest] = useState<TestFullResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState<UserAnswers>(() => {
    if (!testId || searchParams.get('retry') === '1') return {};
    try {
      const saved = localStorage.getItem(`test_answers_${testId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [testResult, setTestResult] = useState<{
    isPassed: boolean;
    isCourseCompleted: boolean;
  } | null>(null);
  // 0 = первый вход (полный тест), >0 = повторная попытка (только неверные)
  const [retryCount, setRetryCount] = useState(() => searchParams.get('retry') === '1' ? 1 : 0);

  const loadTest = useCallback(async () => {
    try {
      setLoading(true);
      if (!testId || !courseId) return;

      const isRetry = retryCount > 0;

      if (isRetry) setUserAnswers({});

      const [courseData, testData] = await Promise.all([
        courseService.getCourseById(Number(courseId)),
        isRetry
          ? testService.getTestForRetake(Number(testId))
          : testService.getTestById(Number(testId)),
      ]);

      if (testData.status === 'archived') {
        navigate(`/courses/course/${courseId}`, { replace: true });
        return;
      }

      // При retry: если 0 вопросов — все ошибки уже исправлены
      if (isRetry && (!testData.questions || testData.questions.length === 0)) {
        setTest(testData);
        setDynamicTitle(`${courseData.title} | ${testData.title}`);
        setTestResult({ isPassed: true, isCourseCompleted: false });
        setIsSubmitted(true);
        return;
      }

      setTest(testData);
      setDynamicTitle(`${courseData.title} | ${testData.title}`);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      setDynamicTitle('Ошибка | Тест');
    } finally {
      setLoading(false);
    }
  }, [testId, courseId, retryCount, setDynamicTitle, navigate]);

  useEffect(() => {
    loadTest();
    return () => setDynamicTitle('');
  }, [loadTest, setDynamicTitle]);

  useEffect(() => {
    if (!testId || Object.keys(userAnswers).length === 0) return;
    localStorage.setItem(`test_answers_${testId}`, JSON.stringify(userAnswers));
  }, [userAnswers, testId]);

  const handleOptionSelect = (questionId: number, optionId: number, isMultiple: boolean) => {
    setUserAnswers(prev => {
      const current = prev[questionId] || [];
      if (isMultiple) {
        const next = current.includes(optionId)
          ? current.filter(id => id !== optionId)
          : [...current, optionId];
        return { ...prev, [questionId]: next };
      }
      return { ...prev, [questionId]: [optionId] };
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (!testId) return;

      const response = await testService.submitTestResults(Number(testId), userAnswers);
      localStorage.removeItem(`test_answers_${testId}`);

      setTestResult({
        isPassed: response.isPassed,
        isCourseCompleted: response.isCourseCompleted,
      });
      setIsSubmitted(true);
    } catch (error) {
      console.error('Ошибка при отправке теста:', error);
      alert('Не удалось отправить результаты теста');
    } finally {
      setLoading(false);
    }
  };

  // После неудачи — грузим retake (только неверные вопросы)
  const handleRetry = () => {
    if (testId) localStorage.removeItem(`test_answers_${testId}`);
    setIsSubmitted(false);
    setTestResult(null);
    setUserAnswers({});
    setRetryCount(c => c + 1);
  };

  if (loading && !isSubmitted) return <LoadingSpinner />;
  if (!test) return <div className="card">Тест не найден</div>;

  return (
    <div className="test-passing-container">
      <TestResultModal
        isOpen={isSubmitted && testResult !== null}
        isPassed={testResult?.isPassed ?? false}
        isCourseCompleted={testResult?.isCourseCompleted ?? false}
        courseId={courseId}
        onRetry={handleRetry}
      />

      <div className="card text">
        <h1>{test.title}</h1>
        {test.description && <p>{test.description}</p>}
        <div className="text-info">
          Вопросов: {test.questionsCount} | Проходной балл: {test.passingScore}
        </div>
      </div>

      <div className="questions-list">
        {test.questions?.map((question: Question, index: number) => {
          const isMultiple = question.questionTypeId === 3 || question.typeName?.toLowerCase() === 'multiple';
          return (
            <div key={question.id} className="card text">
              <div className="question-number">Вопрос {index + 1}
                <span className="type-hint">
                  {isMultiple ? ' (выберите несколько вариантов)' : ' (выберите один вариант)'}
                </span>
              </div>
              <h2>{question.textQuestion}</h2>
              <div className="card-item-list">
                {question.options.map((option: QuestionOption) => {
                  const isSelected = userAnswers[question.id]?.includes(option.id);
                  return (
                    <div
                      key={option.id}
                      className={`card-item option-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleOptionSelect(question.id, option.id, isMultiple)}
                    >
                      <div className={`control ${isMultiple ? 'checkbox' : 'radio'}`} />
                      <span className="option-text">{option.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card-footer">
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          Назад к курсу
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={
            !test.questions || 
            test.questions.some(q => !userAnswers[q.id] || userAnswers[q.id].length === 0)
          }
        >
          Завершить тест
        </button>
      </div>
    </div>
  );
};

export default PassingTestPage;
