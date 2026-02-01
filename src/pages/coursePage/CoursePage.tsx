import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService } from '../../services/coursePage.services';
import type { Course } from '../../services/coursePage.services';
import './CoursePage.css';

const CoursePage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
  const loadCourse = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!courseId) throw new Error('ID курса не указан');

      const data = await courseService.getCourseById(Number(courseId));
      setCourse(data);
    } catch (e) {
      console.error(e);
      setError('Не удалось загрузить информацию о курсе');
    } finally {
      setLoading(false);
    }
  };

  loadCourse();
  }, [courseId]);

  if (loading) {
    return <div className="course-state">Загрузка информации о курсе…</div>;
  }

  if (error || !course) {
    return (
      <div className="course-error">
        <p>{error || 'Курс не найден'}</p>
        <div className="course-error-actions">
          <button className="btn btn-primary" onClick={() => location.reload()}>
            Попробовать снова
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/courses')}>
            Вернуться к курсам
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="course-page">
      <div className="course-card">
        <section className="course-section">
          <h2>Основная информация</h2>
          <p>{course.description || 'Описание отсутствует'}</p>
        </section>

        {course.materials.length > 0 && (
          <section className="course-section">
            <h2>Дополнительная информация</h2>
            <div className="materials-list">
              {course.materials.map((m, i) => (
                <div key={m.id} className="material-item">
                  <div>
                    <div className="material-title">
                      {m.title || `Материал ${i + 1}`}
                    </div>
                    <a href={m.urlDocument} target="_blank" rel="noreferrer">
                      Открыть документ
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {course.tests.length > 0 && (
          <section className="course-section">
            <h2>Тесты по курсу</h2>
            <div className="tests-list">
              {course.tests.map(test => (
                <div key={test.id} className="test-item">
                  <div>
                    <div className="test-title">{test.title}</div>
                    <div className="test-score">
                      Проходной балл: {test.passingScore}
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={() => navigate(`/test/${test.id}`)}
                  >
                    Пройти тест
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="course-footer">
        <button className="btn btn-secondary" onClick={() => navigate('/courses')}>
          Вернуться к курсам
        </button>

        {course.tests.length > 0 && (
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/test/${course.tests[0].id}`)}
          >
            Пройти тест
          </button>
        )}
      </div>
    </div>
  );
};

export default CoursePage;