import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { courseService } from '../../services/course.service';
import type { Course, TestShort } from '../../services/course.service';

import { usePageTitle } from '../../contexts/PageTitleContext';
import LoadingSpinner from '../../components/loading/LoadingSpinner';
import ErrorState from '../../components/error/ErrorState';
import EmptyState from '../../components/empty/EmptyState';
import { truncate } from '../../utils/routeUtils';
import './CoursesPage.css';

const CoursesPage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasRoute, setHasRoute] = useState<boolean>(false);
  const [loadingCourseId, setLoadingCourseId] = useState<number | null>(null);
  const navigate = useNavigate();
  const { setDynamicTitle } = usePageTitle();

  // Выносим загрузку в useCallback, чтобы избежать дублирования кода
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const allCourses = await courseService.getAllUserCourses();
      setCourses(allCourses);
      setHasRoute(allCourses.length > 0 || true);
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить курсы. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    setDynamicTitle('Мои курсы');
    return () => setDynamicTitle('');
  }, [loadData, setDynamicTitle]);

  const handleRetry = () => {
    loadData();
  };

  const handleStartCourse = async (courseId: number) => {
    try {
      setLoadingCourseId(courseId);
      await courseService.startCourse(courseId);
      navigate(`/courses/course/${courseId}`);
    } catch {
      alert('Не удалось начать курс');
    } finally {
      setLoadingCourseId(null);
    }
  };

  const handleTakeTest = (course: Course) => {
    if (course.status === 'not_started') {
      alert('Сначала начните курс, чтобы пройти тест');
      return;
    }
    if (course.tests.length > 0) {
        navigate(`/courses/course/${course.id}/test/${course.tests[0].id}`);
    }
  };

  const getImagePlaceholder = (courseId: number): string => {
    const images = ['📘','📗','📕','📒'];
    return images[courseId % images.length];
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={handleRetry} />;

  return (
    <div>
      {!hasRoute ? (
        <EmptyState
          title="План адаптации не назначен"
          description="Обратитесь к HR-специалисту или Наставнику."
        />
      ) : courses.length === 0 ? (
        <EmptyState
          title="Курсы пока не назначены"
          description="В вашем плане адаптации пока нет назначенных курсов."
        />
      ) : (
        <section className="course-grid">
          {courses.map(course => (
            <article key={course.id} className="course-card">
              <div className="card-image">{getImagePlaceholder(course.id)}</div>
              <div className="card-content text">
                <div className={`course-status status-${course.status}`}>
                  {course.status === 'not_started' && 'Не начат'}
                  {course.status === 'in_process' && 'В процессе'}
                  {course.status === 'completed' && 'Завершен'}
                  {course.status === 'failed' && 'Не пройден'}
                </div>
                
                <h4>{course.title}</h4>
                <p className="course-description">
                  {course.description && course.description.length > 150
                    ? `${course.description.substring(0, 150)}...`
                    : course.description || 'Описание отсутствует'}
                </p>

                {course.tests.length > 0 && (
                  <div className="tests-container">
                    {course.tests.slice(0, 2).map((test: TestShort) => (
                      <div key={test.id} className="card-tests">
                        {test.title}
                      </div>
                    ))}
                    
                    {course.tests.length > 2 && (
                      <div className="card-tests more-tests">
                        ...и еще {course.tests.length - 2}
                      </div>
                    )}
                  </div>
                )}

                <div className={`card-actions ${course.tests.length > 0 ? 'has-test' : ''}`}>
                  {course.tests.length > 0 && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleTakeTest(course)}
                      disabled={course.status === 'not_started'}
                      title={course.status === 'not_started' ? 'Сначала начните курс' : 'Пройти тест'}
                    >
                      Пройти тест
                    </button>
                  )}

                  <button
                    className="btn btn-primary"
                    disabled={loadingCourseId === course.id}
                    onClick={() => handleStartCourse(course.id)}
                  >
                    {loadingCourseId === course.id ? 'Загрузка...' : 'Изучить курс'}
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