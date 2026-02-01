import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdaptationPage.css';
import { adaptationService } from '../../services/adaptationRoute.service';
import type { OnboardingRoute, UserProgress } from '../../services/adaptationRoute.service';

const emptyProgress: UserProgress = {
  totalCourses: 0,
  completedCourses: 0,
  totalStages: 0,
  completedStages: 0,
  stageProgress: [],
};

const AdaptationPage = () => {
  const navigate = useNavigate();

  const [route, setRoute] = useState<OnboardingRoute | null>(null);
  const [progress, setProgress] = useState<UserProgress>(emptyProgress);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);

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
      console.error('Ошибка загрузки адаптации', e);
      setProgress(emptyProgress);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

    navigate(`/course/${firstCourse.id}`);
  };

  const getStageStatus = (stageId: number) => {
    return (
      progress.stageProgress.find(s => s.stageId === stageId)?.status ??
      'current'
    );
  };

  if (loading) {
    return <div className="main-content">Загрузка...</div>;
  }
  // console.log(loading);
  
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
      <section className="card progress-card">
        <h2>Ваш общий прогресс</h2>
          <div className="progress-items">
            <div className="progress-item">
              <div className="progress-circle">{percentStages}%</div>
              <div>
                Этапы: {progress.completedStages} /{' '}
                {progress.totalStages}
              </div>
            </div>

            <div className="progress-item">
              <div className="progress-circle">{percent}%</div>
              <div>
                Курсы: {progress.completedCourses} /{' '}
                {progress.totalCourses}
              </div>
            </div>
          </div>
      </section>

      {/* Динамические этапы */}
      {route ? (
        <section className="card plan-card">
          <h2>Этапы вашего маршрута</h2>
          <div className="stepper">
            {[...route.stages]
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((stage) => {

                const sortedCourses = [...stage.courses].sort(
                  (a, b) => a.orderIndex - b.orderIndex
                );
                const status = getStageStatus(stage.id);
                let iconContent: string | number = stage.orderIndex;
                if (status === 'completed') iconContent = '✓';
                else if (status === 'failed') iconContent = '!';

                let statusText = '';
                if (status === 'completed') {
                  statusText = 'Этап завершён';
                } else if (status === 'failed') {
                  statusText = 'Этап начат, но не завершён. Продолжите обучение.';
                } else {
                  statusText = 'Этап ещё не начат';
                }

                return (
                  <div key={stage.id} className={`step ${status}`}>
                    <div className="step-icon">
                      {iconContent}
                    </div>
                    <div className="step-content">
                      <h4>{stage.title}</h4>

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

                      <div className="step-footer">
                        <p className="stage-status">{statusText}</p>

                        {status === 'current' && (
                          <button
                            className="btn btn-primary"
                            onClick={() => handleStartStage(stage.id)}
                          >
                            Начать этап
                          </button>
                        )}

                        {status === 'failed' && (
                          <button
                            className="btn btn-secondary"
                            onClick={() => handleStartStage(stage.id)}
                          >
                            Продолжить этап
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      ) : (
        <section className="card plan-card">
          <h2>Маршрут адаптации не назначен</h2>
          <p>Обратитесь к HR-специалисту или Наставнику.</p>
        </section>
      )}
    </div>
  );
};

export default AdaptationPage;