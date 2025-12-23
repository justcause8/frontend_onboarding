import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { api } from '../api/api';

// Типы
interface Course {
  id: number;
  title: string;
  description: string;
  orderIndex: number;
  status: string;
  stageId: number | null;
  materials: Material[];
  tests: TestShort[];
}

interface Material {
  id: number;
  urlDocument: string;
}

interface TestShort {
  id: number;
  title: string;
  passingScore: number;
}

const CoursesPage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasRoute, setHasRoute] = useState<boolean>(false);
  const [loadingCourseId, setLoadingCourseId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      setHasRoute(false);
      
      // 1. Получаем ID маршрута пользователя
      const routeRes = await api.get<{ routeId: number | null }>('/onboarding/route/my-route');
      const routeId = routeRes.data.routeId;
      
      // Если маршрут не назначен
      if (routeId === null) {
        setCourses([]);
        setHasRoute(false);
        setLoading(false);
        return;
      }
      
      setHasRoute(true);
      
      // 2. Получаем маршрут с этапами
      const routeResFull = await api.get(`/onboarding/route/${routeId}`);
      const route = routeResFull.data;
      
      // 3. Собираем все курсы из всех этапов
      const allCourses: Course[] = [];
      
      if (route?.stages) {
        route.stages.forEach((stage: any) => {
          if (stage.courses && stage.courses.length > 0) {
            stage.courses.forEach((courseShort: any) => {
              allCourses.push({
                id: courseShort.id,
                title: courseShort.title,
                description: '', // Пока пустое, загрузим позже
                orderIndex: courseShort.orderIndex,
                status: 'Active',
                stageId: stage.id,
                materials: [],
                tests: []
              });
            });
          }
        });
      }
      
      if (allCourses.length === 0) {
        setCourses([]);
        setLoading(false);
        return;
      }
      
      // 4. Загружаем детальную информацию для каждого курса
      const detailedCourses = await Promise.all(
        allCourses.map(async (course) => {
          try {
            const courseDetails = await api.get<Course>(`/onboarding/course/${course.id}`);
            return {
              ...course,
              description: courseDetails.data.description || 'Описание отсутствует',
              materials: courseDetails.data.materials || [],
              tests: courseDetails.data.tests || []
            };
          } catch (err) {
            console.error(`Ошибка загрузки курса ${course.id}:`, err);
            return {
              ...course,
              description: 'Не удалось загрузить описание курса',
              materials: [],
              tests: []
            };
          }
        })
      );
      
      // Сортируем курсы по порядковому номеру
      detailedCourses.sort((a, b) => a.orderIndex - b.orderIndex);
      setCourses(detailedCourses);
      
    } catch (err: any) {
      console.error('Ошибка загрузки курсов:', err);
      
      // Обработка ошибок
      if (err.response?.status === 404) {
        // Если маршрут не найден (не назначен)
        setHasRoute(false);
        setError(null); // Сбрасываем ошибку, так как это нормальная ситуация
      } else {
        setError('Не удалось загрузить курсы. Попробуйте позже.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartCourse = async (courseId: number) => {
    try {
      setLoadingCourseId(courseId);
      
      // 1. Вызываем эндпоинт для начала курса
      const response = await api.post(`/onboarding/course/${courseId}/start`);
      
      if (response.status === 200) {
        console.log(`Курс ${courseId} успешно начат`);
      } else {
        console.warn(`Не удалось начать курс ${courseId}:`, response.data);
      }
    } 
    catch (err: any) {
        console.error(`Ошибка при начале курса ${courseId}:`, err);
        
        // Если ошибка 400, но в response.data есть информация
        if (err.response?.data?.Success === false) {
            // Курс не удалось начать, но показываем ошибку только если это не "уже начат"
            if (err.response.data.Message !== "Не удалось начать курс") {
                alert(err.response.data.Message || 'Ошибка при начале курса');
            }
        }
    } 
    finally {
      setLoadingCourseId(null);
      navigate(`/course/${courseId}`);
    }
    
    // 2. Переходим на страницу курса (в любом случае)
    navigate(`/course/${courseId}`);
  };

  const handleTakeTest = (courseId: number, testId: number) => {
    navigate(`/test/${testId}`);
  };

  const getImagePlaceholder = (courseId: number): string => {
    const images = [
      '📘', '📗', '📕', '📒'
    ];
    return images[courseId % images.length];
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <main className="main-content">
          <Header title="Ваши курсы" />
          <div className="loading-container" style={{ 
            padding: '40px', 
            textAlign: 'center',
            color: 'var(--text-secondary)' 
          }}>
            <p>Загрузка курсов...</p>
          </div>
        </main>
      </div>
    );
  }

  // Если есть ошибка (кроме "маршрут не назначен")
  if (error) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <main className="main-content">
          <Header title="Мои курсы" />
          <div className="error-container" style={{ 
            padding: '40px', 
            textAlign: 'center' 
          }}>
            <p style={{ 
              color: 'var(--red-color)', 
              marginBottom: '20px' 
            }}>
              {error}
            </p>
            <button 
              className="btn btn-primary" 
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--primary-color)',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Попробовать снова
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="main-content">
        <Header title="Ваши курсы" />
        
        {/* Если маршрут не назначен */}
        {!hasRoute ? (
          <div className="empty-state" style={{ 
            padding: '60px 40px', 
            textAlign: 'center',
            backgroundColor: 'var(--bg-light)',
            borderRadius: '12px',
            marginTop: '20px'
          }}>
            <div style={{
              fontSize: '64px',
              marginBottom: '20px',
              color: 'var(--text-secondary)'
            }}>
            </div>
            <h3 style={{ 
              fontSize: '24px', 
              color: 'var(--text-primary)', 
              marginBottom: '12px',
              fontWeight: '600'
            }}>
              Маршрут адаптации не назначен
            </h3>
            <p style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '16px',
              lineHeight: '1.6',
              maxWidth: '600px',
              margin: '0 auto 30px'
            }}>
              Обратитесь к HR-специалисту или ментору для назначения плана адаптации.
              После назначения маршрута здесь появятся доступные курсы.
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/contacts')}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'var(--primary-color)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Контакты HR
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => navigate('/mentors')}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'white',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Найти ментора
              </button>
            </div>
          </div>
        ) : courses.length === 0 ? (
          // Если маршрут назначен, но курсов нет
          <div className="empty-state" style={{ 
            padding: '60px 40px', 
            textAlign: 'center',
            backgroundColor: 'var(--bg-light)',
            borderRadius: '12px',
            marginTop: '20px'
          }}>
            <div style={{
              fontSize: '64px',
              marginBottom: '20px',
              color: 'var(--text-secondary)'
            }}>
            </div>
            <h3 style={{ 
              fontSize: '24px', 
              color: 'var(--text-primary)', 
              marginBottom: '12px',
              fontWeight: '600'
            }}>
              Курсы пока не назначены
            </h3>
            <p style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '16px',
              lineHeight: '1.6',
              maxWidth: '600px',
              margin: '0 auto 30px'
            }}>
              В вашем маршруте адаптации пока нет назначенных курсов.
              Обратитесь к ментору для добавления курсов в план адаптации.
            </p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/mentors')}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--primary-color)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Связаться с ментором
            </button>
          </div>
        ) : (
          // Если есть курсы - показываем их
          <section className="courses-grid">
            {courses.map(course => (
              <article key={course.id} className="course-card">
                <div className="card-image">
                  <div style={{
                    height: '160px',
                    backgroundColor: 'var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)',
                    fontSize: '48px'
                  }}>
                    {getImagePlaceholder(course.id)}
                  </div>
                </div>
                <div className="card-content">
                  <h3 style={{
                    fontSize: '18px',
                    marginBottom: '8px',
                    color: 'var(--text-primary)'
                  }}>
                    {course.title}
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    marginBottom: '20px',
                    flexGrow: '1'
                  }}>
                    {course.description || 'Описание отсутствует'}
                  </p>

                  
                  {course.tests.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <strong style={{ fontSize: '13px' }}>Тесты:</strong>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {course.tests.slice(0, 2).map(test => (
                          <div key={test.id} style={{ marginTop: '4px' }}>
                            📝 {test.title}
                          </div>
                        ))}
                        {course.tests.length > 2 && (
                          <div style={{ marginTop: '4px', fontSize: '11px' }}>
                            ...и еще {course.tests.length - 2} теста
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="card-actions">
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleStartCourse(course.id)}
                      disabled={loadingCourseId === course.id}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: loadingCourseId === course.id 
                          ? 'var(--border-color)' 
                          : 'var(--primary-color)',
                        color: 'white',
                        cursor: loadingCourseId === course.id ? 'wait' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        width: '100%',
                        opacity: loadingCourseId === course.id ? 0.7 : 1
                      }}
                    >
                      {loadingCourseId === course.id ? (
                        <>
                          <span style={{ 
                            display: 'inline-block',
                            marginRight: '8px',
                            animation: 'spin 1s linear infinite'
                          }}>
                          </span>
                        </>
                      ) : 'Изучить курс'}
                    </button>
                    
                    {course.tests.length > 0 && (
                      <button 
                        className="btn btn-secondary"
                        onClick={() => handleTakeTest(course.id, course.tests[0].id)}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-light)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          width: '100%'
                        }}
                      >
                        Пройти тест
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
};

export default CoursesPage;