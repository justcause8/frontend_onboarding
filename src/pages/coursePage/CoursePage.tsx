import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService } from '../../services/course.service'; 
import type { Course, Material, TestShort } from '../../services/course.service'; 

import { usePageTitle } from '../../contexts/PageTitleContext';
import { extractFileNameFromUrl } from '../../utils/fileUtils';
import LoadingSpinner from '../../components/loading/LoadingSpinner';
import ErrorState from '../../components/error/ErrorState';
import './CoursePage.css';
import link from '@/assets/link.svg';

const CoursePage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setDynamicTitle } = usePageTitle();

  const loadCourse = useCallback(async () => {
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
  }, [courseId, setDynamicTitle]);

  useEffect(() => {
    loadCourse();
    return () => {
      setDynamicTitle('');
    };
  }, [loadCourse]);

  const handleRetry = () => {
      loadCourse();
    };

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
    return <LoadingSpinner />;
  }

  if (error || !course) {
    return (
      <ErrorState 
        message={error || 'Курс не найден'} 
        onRetry={handleRetry}
        showBackButton={true}
      />
    );
  }

  return (
    <>
    <div className="text">
      <section className="card course-section">
        <h2>Основная информация</h2>
        <p>Тут очень большой текст Тут очень большой текст Тут очень большой текст
           Тут очень большой текст Тут очень большой текст Тут очень большой текст
            Тут очень большой текст Тут очень большой текст Тут очень большой текст
             Тут очень большой текст Тут очень большой текст Тут очень большой текст
              Тут очень большой текст Тут очень большой текст Тут очень большой текст
               Тут очень большой текст Тут очень большой текст Тут очень большой текст
                Тут очень большой текст Тут очень большой текст Тут очень большой текст
                 Тут очень большой текст Тут очень большой текст Тут очень большой текст
                  Тут очень большой текст Тут очень большой текст Тут очень большой текст
                   Тут очень большой текст Тут очень большой текст Тут очень большой текст
                    Тут очень большой текст Тут очень большой текст Тут очень большой текст
                     Тут очень большой текст Тут очень большой текст Тут очень большой текст
                     {course.description || 'Описание отсутствует'}</p>
      </section>

      {course.materials.length > 0 && (
        <section className="card course-section">
          <h2>Дополнительная информация</h2>
          <div className="card-item-list">
            {course.materials.map((material: Material, index: number) => {
              const fileName = getMaterialTitle(material.urlDocument, material.title, index);
              return (
                <div key={material.id} className="card-item material-item">
                  <a
                    href={material.urlDocument} 
                    target="_blank" 
                    rel="noreferrer"
                    title={`Открыть ${fileName}`}
                  >
                    <div className="material-content">
                      <p>{fileName}</p>
                      <img src={link} alt='Открыть'/>
                    </div>
                  </a>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {course.tests.length > 0 && (
        <section className="card course-section">
          <h2>Тесты по курсу</h2>
          <div className="card-item-list">
            {course.tests.map((test: TestShort) => (
              <div key={test.id} className="card-item test-item">
                <div>
                  <h4>{test.title}</h4>
                  <div className="text-info">
                    Проходной балл: {test.passingScore}
                  </div>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => navigate(`/courses/course/${courseId}/test/${test.id}`)}
                >
                  Пройти тест
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>

    <div className="card-footer">
      <button className="btn btn-secondary" onClick={() => navigate('/courses')}>
        Вернуться к курсам
      </button>

      {course.tests.length > 0 && (
        <button
          className="btn btn-primary"
          onClick={() => navigate(`/courses/course/${courseId}/test/${course.tests[0].id}`)}
        >
          Пройти тест
        </button>
      )}
    </div>
    </>
  );
};

export default CoursePage;