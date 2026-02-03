import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService } from '../../services/coursePage.services';
import type { Course } from '../../services/coursePage.services';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { extractFileNameFromUrl } from '../../utils/fileUtils';
import './CoursePage.css';
import link from '@/assets/link.svg';

const CoursePage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setDynamicTitle } = usePageTitle();

  useEffect(() => {
  const loadCourse = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!courseId) throw new Error('ID курса не указан');

      const data = await courseService.getCourseById(Number(courseId));
      setCourse(data);
      setDynamicTitle(data.title);
    } catch (e) {
      console.error(e);
      setError('Не удалось загрузить информацию о курсе');
    } finally {
      setLoading(false);
    }
  };

  loadCourse();
    
  return () => {
      setDynamicTitle('');
    };
  }, [courseId, setDynamicTitle]);

const getMaterialTitle = (
    urlDocument: string | undefined,
    fallbackTitle: string | undefined, 
    index: number
  ) => {
    if (!urlDocument) {
      return fallbackTitle || `Материал ${index + 1}`;
    }
    
    const fileName = extractFileNameFromUrl(urlDocument);
    
    if (fileName && fileName !== 'Документ') {
      return fileName;
    }
    
    return fallbackTitle || `Материал ${index + 1}`;
  };

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
    <>
    <div className="card text">
      <section className="course-section">
        <h2>Основная информация</h2>
        <p>{course.description || 'Описание отсутствует'}</p>
      </section>

      {course.materials.length > 0 && (
        <section className="course-section">
          <h2>Дополнительная информация</h2>
          <div className="materials-list">
            {course.materials.map((material, index) => {
              const fileName = getMaterialTitle(material.urlDocument, material.title, index);
              
              return (
                <div key={material.id} className="card-item material-item">
                  <a 
                    href={material.urlDocument} 
                    target="_blank" 
                    rel="noreferrer"
                    className="material-link"
                    title={`Открыть ${fileName}`}
                  >
                    <div className="material-content">
                      <div className="material-header">
                        <p>{fileName}</p>
                        <img src={link} alt='Открыть'/>
                      </div>
                    </div>
                  </a>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {course.tests.length > 0 && (
        <section className="course-section">
          <h2>Тесты по курсу</h2>
          <div className="tests-list">
            {course.tests.map(test => (
              <div key={test.id} className="card-item test-item">
                <div>
                  <h4>{test.title}</h4>
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
    </>
  );
};

export default CoursePage;