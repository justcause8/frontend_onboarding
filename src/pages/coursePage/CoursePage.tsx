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

  const formatDisplayTitle = (material: Material, index: number): string => {
    if (material.title && 
        material.title !== 'Документ' && 
        material.title !== 'Внешняя ссылка' &&
        material.title.trim() !== "") {
      return material.title;
    }

    let fileName = extractFileNameFromUrl(material.urlDocument);

    if (!material.isExternalLink && fileName.includes('_')) {
      const parts = fileName.split('_');
      if (parts.length > 1) {
        fileName = parts.slice(1).join('_');
      }
    }

    return fileName || `Материал ${index + 1}`;
  };

  // Функция для обработки открытия материала
  const handleOpenMaterial = (material: Material) => {
    if (material.isExternalLink) {
      window.open(material.urlDocument, '_blank', 'noreferrer');
    } else {
      const fileUrl = courseService.getFileUrl(material.urlDocument);
      window.open(fileUrl, '_blank');
    }
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
        <p>{course.description || 'Описание отсутствует'}</p>
      </section>

      {course.materials.length > 0 && (
        <section className="card course-section">
          <h2>Дополнительная информация</h2>
          <div className="card-item-list">
            {course.materials.map((material: Material, index: number) => {
              const displayTitle = formatDisplayTitle(material, index);
              
              return (
                <div 
                  key={material.id} 
                  className="card-item material-item"
                  onClick={() => handleOpenMaterial(material)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="material-content">
                    <p>{displayTitle}</p>
                    <img src={link} alt='Открыть'/>
                  </div>
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