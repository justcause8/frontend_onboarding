import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService } from '../../services/course.service';
import type { Course, TestShort } from '../../services/course.service';
import { materialService, type Material } from '../../services/material.service';
import { testService, type TestAttempt } from '../../services/test.service';
import { adaptationService } from '../../services/adaptation.service';
import { userService } from '../../services/user.service';

import { usePageTitle } from '../../contexts/PageTitleContext';
import { extractFileNameFromUrl, getFileIcon } from '../../utils/fileUtils';
import { MarkdownViewer } from '../../components/markdownEditor/MarkdownEditor';
import LoadingSpinner from '../../components/loading/LoadingSpinner';
import ErrorState from '../../components/error/ErrorState';
import './CoursePage.css';

const CoursePage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [attempts, setAttempts] = useState<Record<number, TestAttempt | null>>({});
  const [nextTarget, setNextTarget] = useState<{ courseId: number; label: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setDynamicTitle } = usePageTitle();
  const [availableFiles, setAvailableFiles] = useState<Record<string, boolean>>({});

  const loadCourse = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!courseId) throw new Error('ID курса не указан');

      const data = await courseService.getCourseById(Number(courseId));
      setCourse(data);
      setDynamicTitle(data.title);

      const entries = await Promise.all(
        data.tests.map(async (t: TestShort) => [t.id, await testService.getMyAttempt(t.id)] as const)
      );
      setAttempts(Object.fromEntries(entries));

      // Проверяем доступность файлов материалов
      if (data.materials?.length) {
        const results: Record<string, boolean> = {};
        await Promise.all(
          data.materials.map(async (m: Material) => {
            results[m.urlDocument] = m.isExternalLink
              ? true
              : await materialService.checkFileExists(m.urlDocument);
          })
        );
        setAvailableFiles(results);
      }

      // Загружаем маршрут для поиска следующего курса/этапа
      if (data.stageId) {
        try {
          const routeId = await userService.getMyRouteId();
          if (routeId) {
            const route = await adaptationService.getRoute(routeId);
            const sorted = [...route.stages].sort((a, b) => a.orderIndex - b.orderIndex);
            const currentStageIdx = sorted.findIndex(s => s.id === data.stageId);
            if (currentStageIdx !== -1) {
              const currentStage = sorted[currentStageIdx];
              const stageCourses = [...(currentStage.courses || [])].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
              const currentCourseIdx = stageCourses.findIndex((c: any) => c.id === Number(courseId));

              if (currentCourseIdx !== -1 && currentCourseIdx + 1 < stageCourses.length) {
                // Следующий курс в этом же этапе
                const next = stageCourses[currentCourseIdx + 1];
                setNextTarget({ courseId: next.id, label: 'Следующий курс' });
              } else if (currentStageIdx + 1 < sorted.length) {
                // Первый курс следующего этапа
                const nextStage = sorted[currentStageIdx + 1];
                const nextStageCourses = [...(nextStage.courses || [])].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
                if (nextStageCourses.length > 0) {
                  setNextTarget({ courseId: nextStageCourses[0].id, label: 'Следующий этап' });
                }
              }
            }
          }
        } catch {
        }
      }
    } catch (e) {
      console.error(e);
      setError('Не удалось загрузить информацию о курсе');
    } finally {
      setLoading(false);
    }
  }, [courseId, setDynamicTitle]);

  useEffect(() => {
    loadCourse();
    return () => { setDynamicTitle(''); };
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

  const handleOpenMaterial = (material: Material) => {
    const url = material.urlDocument || '';
    const isExternal = material.isExternalLink ||
      url.startsWith('http://') ||
      url.startsWith('https://');

    if (isExternal) {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      window.open(fullUrl, '_blank', 'noreferrer');
    } else {
      const fileUrl = materialService.getFileUrl(url);
      window.open(fileUrl, '_blank');
    }
  };

  const formatAttemptDate = (dateStr: string | undefined | null): string => {
    if (!dateStr) return '';
    const normalized = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

  if (course.status === 'archived') {
    return (
      <>
        <section className="card text page-section">
          <h2>Курс недоступен</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Этот курс был закрыт администратором и больше не доступен для прохождения.
          </p>
        </section>
        <div className="card-footer">
          <button className="btn btn-secondary" onClick={() => navigate('/courses')}>
            Вернуться к курсам
          </button>
        </div>
      </>
    );
  }

  return (
    <>
    <div className="text">
      <section className="card page-section">
        <h2>Основная информация</h2>
        {course.description
          ? <MarkdownViewer content={course.description} />
          : <p>Описание отсутствует</p>
        }
      </section>

      {course.materials.length > 0 && (
        <section className="card page-section">
          <h2>Дополнительная информация</h2>
          <div className="card-item-list">
            {course.materials.map((material: Material, index: number) => {
              const isExists = availableFiles[material.urlDocument] !== false;
              if (!isExists) return null;
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
                    <img src={getFileIcon(material.urlDocument, material.isExternalLink)} alt='Открыть'/>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {course.tests.length > 0 && (
        <section className="card page-section">
          <h2>Тесты по курсу</h2>
          <div className="card-item-list">
            {course.tests.map((test: TestShort) => {
              const isArchived = test.status === 'archived';
              const attempt = attempts[test.id];
              return (
                <div key={test.id} className={`card-item test-item${isArchived ? ' test-item--archived' : ''}`}>
                  <div className="test-item-info">
                    <h4>{test.title}</h4>
                    {isArchived ? (
                      <span className="test-archived-label">Тест недоступен</span>
                    ) : (
                      <>
                        <div className="text-info">Проходной балл: {test.passingScore}</div>
                        {attempt && (
                          <div className="test-attempt-result">
                            <span className={attempt.isPassed ? 'badge badge--success' : 'badge badge--danger'}>
                              {attempt.isPassed ? 'Пройден' : 'Не пройден'}
                            </span>
                            <span className={`test-attempt-score ${attempt.isPassed ? 'passed' : 'failed'}`}>
                              {attempt.score} балл(ов)
                            </span>
                            <span className="test-attempt-date">{formatAttemptDate(attempt.attemptDate)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {!isArchived && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        const isRetry = attempt && !attempt.isPassed;
                        navigate(`/courses/course/${courseId}/test/${test.id}${isRetry ? '?retry=1' : ''}`);
                      }}
                    >
                      {attempt ? 'Пройти снова' : 'Пройти тест'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>

    <div className="card-footer">
      <button className="btn btn-secondary" onClick={() => navigate('/courses')}>
        Вернуться к курсам
      </button>
      {(() => {
        const activeTests = course.tests.filter((t: TestShort) => t.status !== 'archived');
        const isCourseCompleted = activeTests.length === 0
          ? (course.status === 'completed' || course.status === 'in_process')
          : activeTests.every(t => attempts[t.id]?.isPassed === true);
        if (!isCourseCompleted || !nextTarget) return null;

        return (
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/courses/course/${nextTarget.courseId}`)}
          >
            {nextTarget.label}
          </button>
        );
      })()}
    </div>
    </>
  );
};

export default CoursePage;
