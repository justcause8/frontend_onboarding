import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../contexts/PageTitleContext';

import { testService } from '../../services/test.service';
import type { TestFullResponse, Question, QuestionOption } from '../../services/test.service';
import { courseService } from '../../services/course.service';

import LoadingSpinner from '../../components/loading/LoadingSpinner';
import TestResultModal from '../../components/modals/testResultModal/TestResultModal';
import './PassingTestPage.css';
import done from '@/assets/done.svg';

type UserAnswers = Record<number, number[]>;

const PassingTestPage = () => {
  const { courseId, testId } = useParams<{ courseId: string; testId: string }>();
  const { setDynamicTitle } = usePageTitle();
  const navigate = useNavigate();

  // ИСПРАВЛЕНО: Заменили any на TestFullResponse
  const [test, setTest] = useState<TestFullResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [testResult, setTestResult] = useState<{ 
      isPassed: boolean; 
      message: string;
      isCourseCompleted: boolean;
    } | null>(null);

  useEffect(() => {
    const fetchTestData = async () => {
      try {
        setLoading(true);
        if (!testId || !courseId) return;

        // Используем новые методы сервисов
        const [testData, courseData] = await Promise.all([
          testService.getTestById(Number(testId)),
          courseService.getCourseById(Number(courseId))
        ]);

        setTest(testData);
        setDynamicTitle(`${courseData.title} | ${testData.title}`);
      } catch (error) {
        console.error("Ошибка загрузки данных:", error);
        setDynamicTitle('Ошибка | Тест');
      } finally {
        setLoading(false);
      }
    };
    fetchTestData();
    return () => setDynamicTitle('');
  }, [testId, courseId, setDynamicTitle]);

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

      // Вызываем объединенный метод отправки результатов
      const response = await testService.submitTestResults(Number(testId), userAnswers);
      
      setTestResult({
        isPassed: response.isPassed,
        message: response.message,
        isCourseCompleted: response.isCourseCompleted
      });
      setIsSubmitted(true);
    } catch (error) {
      console.error("Ошибка при отправке теста:", error);
      alert("Не удалось отправить результаты теста");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setIsSubmitted(false);
    setTestResult(null);
    setUserAnswers({});
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
      />

      <div className="card text test-header">
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
                      {/* Логика отображения иконки (чекбокс или радиокнопка) */}
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