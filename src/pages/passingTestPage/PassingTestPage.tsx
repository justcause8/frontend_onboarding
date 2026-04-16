import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../contexts/PageTitleContext';

import { testService } from '../../services/test.service';
import type { TestFullResponse, Question, QuestionOption } from '../../services/test.service';
import { courseService } from '../../services/course.service';

import LoadingSpinner from '../../components/loading/LoadingSpinner';
import TestResultModal from '../../components/modals/testResultModal/TestResultModal';
import './PassingTestPage.css';
import done from '@/assets/icons/done.svg';

type UserAnswers = Record<number, number[]>;

const PassingTestPage = () => {
  const { courseId, testId } = useParams<{ courseId: string; testId: string }>();
  const { setDynamicTitle } = usePageTitle();
  const navigate = useNavigate();

  const [test, setTest] = useState<TestFullResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState<UserAnswers>(() => {
    if (!testId) return {};
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
    message: string;
    isCourseCompleted: boolean;
  } | null>(null);

  const loadTest = useCallback(async (mode: 'auto' | 'retake' | 'full' = 'auto') => {
    try {
      setLoading(true);
      if (!testId || !courseId) return;

      let testData: TestFullResponse = null!;
      const courseData = await courseService.getCourseById(Number(courseId));

      if (mode === 'full') {
        testData = await testService.getTestById(Number(testId));
      } else if (mode === 'retake') {
        testData = await testService.getTestForRetake(Number(testId));
        // Если все вопросы были отвечены правильно — грузим полный тест
        if (!testData.questions || testData.questions.length === 0) {
          testData = await testService.getTestById(Number(testId));
          setTestResult({ isPassed: true, message: 'Все вопросы пройдены правильно! Вы можете пройти тест заново.', isCourseCompleted: false });
          setIsSubmitted(true);
        }
      } else {
        // auto: проверяем наличие предыдущей попытки
        const attempt = await testService.getMyAttempt(Number(testId));
        if (attempt) {
          const retakeData = await testService.getTestForRetake(Number(testId));
          testData = (!retakeData.questions || retakeData.questions.length === 0)
            ? await testService.getTestById(Number(testId))
            : retakeData;
          if (!retakeData.questions || retakeData.questions.length === 0) {
            setTestResult({ isPassed: true, message: 'Все вопросы пройдены правильно! Вы можете пройти тест заново.', isCourseCompleted: false });
            setIsSubmitted(true);
          }
        } else {
          testData = await testService.getTestById(Number(testId));
        }
      }

      if (testData.status === 'archived') {
        navigate(`/courses/course/${courseId}`, { replace: true });
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
  }, [testId, courseId, setDynamicTitle, navigate]);

  useEffect(() => {
    loadTest('auto');
    return () => setDynamicTitle('');
  }, [loadTest, setDynamicTitle]);

  useEffect(() => {
    if (!testId) return;
    if (Object.keys(userAnswers).length > 0) {
      localStorage.setItem(`test_answers_${testId}`, JSON.stringify(userAnswers));
    }
  }, [userAnswers, testId]);

  const handleOptionSelect = (questionId: number, optionId: number, isMultiple: boolean) => {
    setUserAnswers(prev => {
      const currentAnswers = prev[questionId] || [];
      if (isMultiple) {
        const newAnswers = currentAnswers.includes(optionId)
          ? currentAnswers.filter(id => id !== optionId)
          : [...currentAnswers, optionId];
        return { ...prev, [questionId]: newAnswers };
      } else {
        return { ...prev, [questionId]: [optionId] };
      }
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (!testId) return;

      const response = await testService.submitTestResults(Number(testId), userAnswers);

      if (testId) localStorage.removeItem(`test_answers_${testId}`);
      setTestResult({
        isPassed: response.isPassed,
        message: response.message,
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

  const clearSavedAnswers = () => {
    if (testId) localStorage.removeItem(`test_answers_${testId}`);
  };

  // Повторить только неправильные вопросы
  const handleRetry = () => {
    clearSavedAnswers();
    setIsSubmitted(false);
    setTestResult(null);
    setUserAnswers({});
    loadTest('retake');
  };

  // Пройти весь тест заново
  const handleRestartFull = () => {
    clearSavedAnswers();
    setIsSubmitted(false);
    setTestResult(null);
    setUserAnswers({});
    loadTest('full');
  };

  if (loading && !isSubmitted) return <LoadingSpinner />;
  if (!test) return <div className="card">Тест не найден</div>;

  return (
    <div className="test-passing-container">
      <TestResultModal
        isOpen={isSubmitted && testResult !== null}
        isPassed={testResult?.isPassed ?? false}
        isCourseCompleted={testResult?.isCourseCompleted ?? false}
        message={testResult?.message ?? ''}
        courseId={courseId}
        onRetry={handleRetry}
        onRestartFull={handleRestartFull}
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
                      <div className={`control ${isMultiple ? 'checkbox' : 'radio'}`}>
                        {isSelected && (
                          isMultiple ? (
                            <img src={done} className="control-icon" alt="done" />
                          ) : (
                            <div className="control-inner" />
                          )
                        )}
                      </div>
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
          disabled={Object.keys(userAnswers).length < (test.questions?.length || 0)}
        >
          Завершить тест
        </button>
      </div>
    </div>
  );
};

export default PassingTestPage;
