import React from 'react';
import { useNavigate } from 'react-router-dom';
import './TestResultModal.css';
import done from '@/assets/icons/done.svg';
import cross from '@/assets/icons/cross.png';

interface TestResultModalProps {
  isOpen: boolean;
  isPassed: boolean;
  isCourseCompleted: boolean;
  courseId: string | undefined;
  onRetry: () => void;
}

const TestResultModal: React.FC<TestResultModalProps> = ({
  isOpen,
  isPassed,
  isCourseCompleted,
  courseId,
  onRetry,
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
            : 'Тест не пройден'}
        </h1>

        <div className="modal-actions">
          {isPassed ? (
            <div className="button-row">
              <button className="btn btn-secondary" onClick={() => navigate(`/courses/course/${courseId}`)}>
                Вернуться к курсу
              </button>
              <button className="btn btn-primary" onClick={() => navigate('/')}>
                К плану адаптации
              </button>
            </div>
          ) : (
            <div className="button-row">
              <button className="btn btn-secondary" onClick={() => navigate(`/courses/course/${courseId}`)}>
                Вернуться к курсу
              </button>
              <button className="btn btn-primary" onClick={onRetry}>
                Пройти снова
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestResultModal;
