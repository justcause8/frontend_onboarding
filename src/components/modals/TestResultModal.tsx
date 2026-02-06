import React from 'react';
import { useNavigate } from 'react-router-dom';
import './TestResultModal.css';
import done from '@/assets/done.svg';
import cross from '@/assets/cross.png';

interface TestResultModalProps {
  isOpen: boolean;
  isPassed: boolean;
  isCourseCompleted: boolean;
  message: string;
  courseId: string | undefined;
  onRetry: () => void;
}

const TestResultModal: React.FC<TestResultModalProps> = ({
  isOpen,
  isPassed,
  isCourseCompleted,
  message,
  courseId,
  onRetry
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className={`card text modal-content ${isPassed ? 'success-card' : 'failed-card'}`}>
        <div className="result-icon">
          {isPassed ? (
            <img src={done} alt="Успех" className="modal-done-icon" />
          ) : (
            <img src={cross} alt="Ошибка" className="modal-faild-icon" />
          )}
        </div>

        <h1>
          {isPassed 
            ? (isCourseCompleted ? 'Курс завершен!' : 'Тест пройден!') 
            : 'Нужно потренироваться'}
        </h1>
        <p className="modal-message">{message}</p>

        <div className="modal-actions">
          {isPassed ? (
            isCourseCompleted ? (
              <button className="btn btn-primary single-btn" onClick={() => navigate('/')}>
                Вернуться к плану адаптации
              </button>
            ) : (
              <div className="button-row">
                <button className="btn btn-secondary" onClick={() => navigate('/courses')}>
                  К списку курсов
                </button>
                <button className="btn btn-primary" onClick={() => navigate(`/courses/course/${courseId}`)}>
                  Продолжить курс
                </button>
              </div>
            )
          ) : (
            <div className="button-row">
              <button className="btn btn-secondary" onClick={() => navigate(`/courses/course/${courseId}`)}>
                Вернуться к курсу
              </button>
              <button className="btn btn-primary" onClick={onRetry}>
                Попробовать снова
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestResultModal;