import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adaptationService } from '../../services/adaptationRoute.service';
import type { OnboardingRoute, UserProgress } from '../../services/adaptationRoute.service';
import { usePageTitle } from '../../contexts/PageTitleContext';
import LoadingSpinner from '../../components/loading/LoadingSpinner';
import ErrorState from '../../components/error/ErrorState';
import EmptyState from '../../components/empty/EmptyState';
import './AdaptationPage.css';
import done from '@/assets/done.svg';
import exclamationmark from '@/assets/exclamation-mark.png';

const emptyProgress: UserProgress = {
  totalCourses: 0,
  completedCourses: 0,
  totalStages: 0,
  completedStages: 0,
  stageProgress: [],
};

const AdaptationPage = () => {
  const navigate = useNavigate();
  const { setDynamicTitle } = usePageTitle();

  const [route, setRoute] = useState<OnboardingRoute | null>(null);
  const [progress, setProgress] = useState<UserProgress>(emptyProgress);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDynamicTitle('');
    
    return () => setDynamicTitle('');
  }, [setDynamicTitle]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const routeId = await adaptationService.getMyRouteId();

      if (!routeId) {
        setRoute(null);
        setProgress(emptyProgress);
        return;
      }

      const [progressData, routeData] = await Promise.all([
        adaptationService.getUserProgress(),
        adaptationService.getRoute(routeId),
      ]);

      setProgress(progressData);
      setRoute(routeData);
    } catch (e) {
      console.error('Ошибка загрузки', e);
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  if (!route) {
    return (
      <EmptyState
        title="Маршрут адаптации не назначен"
        description="Обратитесь к HR-специалисту или Наставнику."
      />
    );
  }


  const handleStartStage = async (stageId: number) => {
    if (!route) return;

    const stage = route.stages.find(s => s.id === stageId);
    if (!stage || stage.courses.length === 0) {
      alert('В этапе нет курсов');
      return;
    }

    const firstCourse = [...stage.courses].sort(
      (a, b) => a.orderIndex - b.orderIndex
    )[0];

    await adaptationService.startCourse(firstCourse.id);
    await adaptationService.recalcStatuses();
    await loadData();

    navigate(`/courses/course/${firstCourse.id}`);
  };

  const getStageStatus = (stageId: number) => {
    return (
      progress.stageProgress.find(s => s.stageId === stageId)?.status ??
      'current'
    );
  };
  
  const percent =
    progress.totalCourses > 0
      ? Math.round(
          (progress.completedCourses / progress.totalCourses) * 100
        )
      : 0;

  const percentStages =
    progress.totalStages > 0
      ? Math.round(
          (progress.completedStages / progress.totalStages) * 100
        )
      : 0;

  return (
    <div>
      {route ? (
        <>
          <section className="card progress-card text">
            <h2>Ваш общий прогресс</h2>
            <div className="progress-items">
              <div className="progress-item">
                <div className="progress-circle">{percentStages}%</div>
                <div>
                  <p>Этапы: {progress.completedStages} / {progress.totalStages}</p>
                </div>
              </div>

              <div className="progress-item">
                <div className="progress-circle">{percent}%</div>
                <div>
                  <p>Курсы: {progress.completedCourses} / {progress.totalCourses}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Динамические этапы */}
          <section className="card plan-card text">
            <h2>Этапы вашего маршрута</h2>
            <div className="stepper">
              {[...route.stages]
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((stage) => {
                  const sortedCourses = [...stage.courses].sort(
                    (a, b) => a.orderIndex - b.orderIndex
                  );
                  const status = getStageStatus(stage.id);
                  
                  let iconContent: React.ReactNode;
                  if (status === 'completed') {
                    iconContent = <img src={done} className="step-icon-img" />;
                  } else if (status === 'failed') {
                    iconContent = <img src={exclamationmark} className="step-icon-img" />;
                  } else {
                    iconContent = stage.orderIndex;
                  }

                  return (
                    <div key={stage.id} className={`step ${status}`}>
                      <div className="step-icon">
                        {iconContent}
                      </div>
                      <div className="card-item step-item">
                        <div className="step-header">
                          <h4>{stage.title}</h4>
                          <span className={`stage-badge ${status}`}>
                            {status === 'completed' && 'Завершен'}
                            {status === 'current' && 'Текущий'}
                            {status === 'failed' && 'Начат'}
                            {!status && 'Не начат'}
                          </span>
                        </div>
                        
                        {stage.description && <p>{stage.description}</p>}
                        
                        {sortedCourses.map(course => (
                          <div key={course.id} className="course-item">
                            <span className="course-title">{course.title}</span>
                            {course.status && (
                              <span className={`course-status ${course.status}`}>
                                {course.status === 'completed' ? '✓' : 
                                course.status === 'in_progress' ? '▶' : '○'}
                              </span>
                            )}
                          </div>
                        ))}
                        
                        {(status === 'current' || status === 'failed') && (
                          <div className="step-footer">
                            <button 
                              className={`btn ${status === 'current' ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => handleStartStage(stage.id)}
                            >
                              {status === 'current' ? 'Начать этап' : 'Продолжить этап'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        </>
      ) : (
        <div className="empty-state">
          <h4>Маршрут адаптации не назначен</h4>
          <p>Обратитесь к HR-специалисту или Наставнику.</p>
        </div>
      )}
    </div>
  );
};

export default AdaptationPage;