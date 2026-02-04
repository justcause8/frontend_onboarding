import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { testService  } from '../../services/passingTestPage.service';
import LoadingSpinner from '../../components/loading/LoadingSpinner';
import './PassingTestPage.css';

type UserAnswers = Record<number, number[]>;

const PassingTestPage = () => {
  const { courseId, testId } = useParams<{ courseId: string; testId: string }>();
  const { setDynamicTitle } = usePageTitle();
  const navigate = useNavigate();

  const [test, setTest] = useState<any>(null);
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
        const testData = await testService.getTestById(Number(testId));
        setTest(testData);
        setDynamicTitle(testData.title);
      } catch (error) {
        console.error("Ошибка загрузки теста:", error);
        setDynamicTitle('Ошибка');
      } finally {
        setLoading(false);
      }
    };

    fetchTestData();
    return () => setDynamicTitle('');
  }, [testId, setDynamicTitle]);

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
      
      setTestResult({
        isPassed: response.isPassed,
        message: response.message,
        isCourseCompleted: response.isCourseCompleted // Сохраняем из ответа
      });
      setIsSubmitted(true);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !isSubmitted) return <LoadingSpinner />;
  if (!test) return <div className="card">Тест не найден</div>;

  return (
    <div className="test-passing-container">
      {isSubmitted && testResult && (
        <div className="modal-overlay">
          <div className={`card modal-content ${testResult.isPassed ? 'success-card' : 'failed-card'}`}>
            <div className="result-icon">
              {testResult.isPassed ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              )}
            </div>
            
            <h2>
              {testResult.isPassed 
                ? (testResult.isCourseCompleted ? 'Курс завершен!' : 'Тест пройден!') 
                : 'Нужно потренироваться'}
            </h2>
            <p>{testResult.message}</p>

            <div className="modal-actions">
              {testResult.isPassed ? (
                // --- СЛУЧАЙ: УСПЕХ ---
                <>
                  {testResult.isCourseCompleted ? (
                    // Если весь курс завершен - ведем на главную (AdaptationPage)
                    <button className="btn btn-primary" onClick={() => navigate('/')}>
                      Вернуться к плану адаптации
                    </button>
                  ) : (
                    // Если курс еще не до конца пройден - возвращаемся в курс
                    <button className="btn btn-primary" onClick={() => navigate(`/courses/course/${courseId}`)}>
                      Продолжить курс
                    </button>
                  )}
                  <button className="btn btn-secondary" onClick={() => navigate('/courses')}>
                    К списку курсов
                  </button>
                </>
              ) : (
                // --- СЛУЧАЙ: ПРОВАЛ ---
                <>
                  <button className="btn btn-primary" onClick={() => {
                    setIsSubmitted(false);
                    setTestResult(null);
                    setUserAnswers({}); 
                  }}>
                    Попробовать снова
                  </button>
                  <button className="btn btn-secondary" onClick={() => navigate(`/courses/course/${courseId}`)}>
                    Вернуться к курсу
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card test-header">
        <h1>{test.title}</h1>
        <p>{test.description}</p>
        <div className="test-info-badge">
          Вопросов: {test.questionsCount} | Проходной балл: {test.passingScore}
        </div>
      </div>

      <div className="questions-list">
        {test.questions?.map((question: any, index: number) => {
          const isMultiple = question.questionTypeId === 3 || question.typeName?.toLowerCase() === 'multiple';

          return (
            <div key={question.id} className="card question-card">
              <div className="question-number">Вопрос {index + 1}</div>
              <h3 className="question-text">
                {question.textQuestion}
                <span className="type-hint">
                  {isMultiple ? ' (несколько вариантов)' : ' (один вариант)'}
                </span>
              </h3>
              
              <div className="options-list">
                {question.options.map((option: any) => {
                  const isSelected = userAnswers[question.id]?.includes(option.id);
                  return (
                    <div 
                      key={option.id} 
                      className={`card-item option-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleOptionSelect(question.id, option.id, isMultiple)}
                    >
                      <div className={`control ${isMultiple ? 'checkbox' : 'radio'}`}>
                        {isSelected && <div className="control-inner" />}
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

      <div className="test-footer">
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          Отмена
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