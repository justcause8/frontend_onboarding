import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { coursesService } from '../../services/coursesPage.service';
import type { Course } from '../../services/coursesPage.service';
import { usePageTitle } from '../../contexts/PageTitleContext';
import LoadingSpinner from '../../components/loading/LoadingSpinner';
import ErrorState from '../../components/error/ErrorState';
import EmptyState from '../../components/empty/EmptyState';
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


  const handleRetry = () => {
    setError(null);
    setLoading(true);
    const load = async () => {
      try {
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
  };

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

  const handleTakeTest = (course: Course) => {
    if (course.status === 'not_started') {
      alert('Сначала начните курс, чтобы пройти тест');
      return;
    }
    
    navigate(`/courses/course/${course.id}/test/${course.tests[0].id}`);
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
          title="Маршрут адаптации не назначен"
          description="Обратитесь к HR-специалисту или Наставнику."
        />
      ) : courses.length === 0 ? (
        <EmptyState
          title="Курсы пока не назначены"
          description="В вашем маршруте адаптации пока нет назначенных курсов."
        />
      ) : (
        <section className="courses-grid">
          {courses.map(course => (
            <article key={course.id} className="courses-card">
              <div className="card-image">{getImagePlaceholder(course.id)}</div>
              <div className="card-content text">
                {/* Статус курса */}
                <div className={`course-status status-${course.status}`}>
                  {course.status === 'not_started' && 'Не начат'}
                  {course.status === 'in_process' && 'В процессе'}
                  {course.status === 'completed' && 'Завершен'}
                  {course.status === 'failed' && 'Не пройден'}
                </div>
                
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