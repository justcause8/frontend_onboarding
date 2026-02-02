import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { coursesService } from '../../services/coursesPage.service';
import type { Course } from '../../services/coursesPage.service';
import { usePageTitle } from '../../contexts/PageTitleContext';
import './CoursesPage.css';

const CoursesPage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasRoute, setHasRoute] = useState<boolean>(false);
  const [loadingCourseId, setLoadingCourseId] = useState<number | null>(null);
  const navigate = useNavigate();
  const { setDynamicTitle } = usePageTitle();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const allCourses = await coursesService.getAllCourses();
        setCourses(allCourses);
        setHasRoute(allCourses.length > 0);
      } catch {
        setError('Не удалось загрузить курсы. Попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };
    load();
    setDynamicTitle('');
    
    return () => setDynamicTitle('');
  }, [setDynamicTitle]);

  const handleStartCourse = async (courseId: number) => {
    try {
      setLoadingCourseId(courseId);
      await coursesService.startCourse(courseId);
      navigate(`/courses/course/${courseId}`);
    } catch {
      alert('Не удалось начать курс');
    } finally {
      setLoadingCourseId(null);
    }
  };

  const handleTakeTest = (testId: number) => {
    navigate(`/test/${testId}`);
  };

  const getImagePlaceholder = (courseId: number): string => {
    const images = ['📘','📗','📕','📒'];
    return images[courseId % images.length];
  };

  if (loading) return <div className="loading-container">Загрузка курсов...</div>;
  if (error) return <div className="error-container">{error}</div>;

  return (
    <div>
      {!hasRoute ? (
        <div className="empty-state">
          <h4>Маршрут адаптации не назначен</h4>
          <p>Обратитесь к HR-специалисту или Наставнику.</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="empty-state">
          <h4>Курсы пока не назначены</h4>
          <p>В вашем маршруте адаптации пока нет назначенных курсов.</p>
        </div>
      ) : (
        <section className="courses-grid">
          {courses.map(course => (
            <article key={course.id} className="courses-card">
              <div className="card-image">{getImagePlaceholder(course.id)}</div>
              <div className="card-content text">
                <h4>{course.title}</h4>
                <p>{course.description || 'Описание отсутствует'}</p>

                {course.tests.length > 0 && (
                  <div className="card-tests">
                    {course.tests.slice(0, 2).map(test => (
                      <div key={test.id}>{test.title}</div>
                    ))}
                    {course.tests.length > 2 && <div>...и еще {course.tests.length - 2} теста</div>}
                  </div>
                )}

                <div className={`card-actions ${course.tests.length > 0 ? 'has-test' : ''}`}>
                  {course.tests.length > 0 && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleTakeTest(course.tests[0].id)}
                    >
                      Пройти тест
                    </button>
                  )}

                  <button
                    className="btn btn-primary"
                    disabled={loadingCourseId === course.id}
                    onClick={() => handleStartCourse(course.id)}
                  >
                    Изучить курс
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
};

export default CoursesPage;