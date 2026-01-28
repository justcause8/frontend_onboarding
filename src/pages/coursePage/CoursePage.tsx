import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/sidebar/Sidebar';
import Header from '../../components/header/Header';
import { api } from '../../api/api';

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
  title?: string;
}

interface TestShort {
  id: number;
  title: string;
  passingScore: number;
}

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
        
        if (!courseId) {
          throw new Error('ID курса не указан');
        }
        
        // Загружаем информацию о курсе
        const courseRes = await api.get<Course>(`/onboarding/course/${courseId}`);
        setCourse(courseRes.data);
        
      } catch (err: any) {
        console.error('Ошибка загрузки курса:', err);
        setError('Не удалось загрузить информацию о курсе. Попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [courseId]);

  const handleTakeTest = (testId: number) => {
    navigate(`/test/${testId}`);
  };

  const handleBackToCourses = () => {
    navigate('/courses');
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <main className="main-content">
          <Header title="Загрузка курса..." />
          <div className="loading-container" style={{ 
            padding: '40px', 
            textAlign: 'center',
            color: 'var(--text-secondary)' 
          }}>
            <p>Загрузка информации о курсе...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <main className="main-content">
          <Header title="Ошибка" />
          <div className="error-container" style={{ 
            padding: '40px', 
            textAlign: 'center' 
          }}>
            <p style={{ 
              color: 'var(--red-color)', 
              marginBottom: '20px' 
            }}>
              {error || 'Курс не найден'}
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
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
              <button 
                className="btn btn-secondary" 
                onClick={handleBackToCourses}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'white',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                Вернуться к курсам
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="main-content">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px'
        }}>
          <Header title={course.title} /></div>
        
        <div className="course-content" style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {/* Основная информация */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{
              fontSize: '18px',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '2px solid var(--primary-color)'
            }}>
              Основная информация
            </h2>
            <div style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: 'var(--text-secondary)'
            }}>
              {course.description || 'Описание отсутствует'}
            </div>
          </section>

          {/* Дополнительная информация (Материалы) */}
          {course.materials.length > 0 && (
            <section style={{ marginBottom: '40px' }}>
              <h2 style={{
                fontSize: '18px',
                color: 'var(--text-primary)',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '2px solid var(--primary-color)'
              }}>
                Дополнительная информация
              </h2>
              <div style={{
                display: 'grid',
                gap: '12px'
              }}>
                {course.materials.map((material, index) => (
                  <div key={material.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px',
                    backgroundColor: 'var(--bg-light)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{
                      marginRight: '12px',
                      fontSize: '20px'
                    }}>
                    
                    </div>
                    <div style={{ flex: '1' }}>
                      <div style={{
                        fontWeight: '600',
                        marginBottom: '4px',
                        color: 'var(--text-primary)'
                      }}>
                        {material.title || `Материал ${index + 1}`}
                      </div>
                      <a 
                        href={material.urlDocument}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: 'var(--primary-color)',
                          textDecoration: 'none',
                          fontSize: '14px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        Открыть документ
                        <span style={{ fontSize: '12px' }}>↗</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Тесты */}
          {course.tests.length > 0 && (
            <section>
              <h2 style={{
                fontSize: '18px',
                color: 'var(--text-primary)',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '2px solid var(--primary-color)'
              }}>
                Тесты по курсу
              </h2>
              <div style={{
                display: 'grid',
                gap: '12px'
              }}>
                {course.tests.map(test => (
                  <div key={test.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    backgroundColor: 'var(--bg-light)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{
                        marginRight: '12px',
                        fontSize: '20px'
                      }}>
                      
                      </div>
                      <div>
                        <div style={{
                          fontWeight: '600',
                          marginBottom: '4px',
                          color: 'var(--text-primary)'
                        }}>
                          {test.title}
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: 'var(--text-secondary)'
                        }}>
                          Проходной балл: {test.passingScore}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleTakeTest(test.id)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'white',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-light)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                      }}
                    >
                      Пройти тест
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Кнопки действий внизу страницы */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '24px',
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <button 
            onClick={handleBackToCourses}
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
            ← Вернуться к курсам
          </button>
          
          {course.tests.length > 0 && (
            <button 
              onClick={() => handleTakeTest(course.tests[0].id)}
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
              Пройти тест по курсу →
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default CoursePage;