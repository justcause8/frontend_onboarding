import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adaptationService } from '../../services/adaptation.service';
import { userService, type UserProgress } from '../../services/user.service';
import { courseService } from '../../services/course.service';
import type { OnboardingRoute } from '../../services/adaptation.service';
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
    setDynamicTitle('Мой план адаптации');
    return () => setDynamicTitle('');
  }, [setDynamicTitle]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const routeId = await userService.getMyRouteId();

      if (!routeId) {
        setRoute(null);
        setProgress(emptyProgress);
        return;
      }

      const [progressData, routeData] = await Promise.all([
        userService.getUserProgress(),
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

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

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
    if (!stage || !stage.courses || stage.courses.length === 0) {
      alert('В этапе нет курсов');
      return;
    }

    const firstCourse = [...stage.courses].sort(
      (a, b) => a.orderIndex - b.orderIndex
    )[0];

    try {
        await courseService.startCourse(firstCourse.id);
        await userService.recalcStatuses();
        await loadData();
        navigate(`/courses/course/${firstCourse.id}`);
    } catch (err) {
        console.error("Ошибка при старте курса", err);
    }
  };

  const getStageStatus = (stageId: number): 'completed' | 'failed' | 'in_process' | 'not_started' => {
    return (
      progress.stageProgress.find(s => s.stageId === stageId)?.status ??
      'not_started'
    );
  };
  
  const percent = progress.totalCourses > 0
      ? Math.round((progress.completedCourses / progress.totalCourses) * 100) : 0;

  const percentStages = progress.totalStages > 0
      ? Math.round((progress.completedStages / progress.totalStages) * 100) : 0;

  // Находим первый этап, который еще не завершен, чтобы разрешить его начать
  const firstIncompleteStage = [...route.stages]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .find(s => getStageStatus(s.id) !== 'completed');

  return (
    <div>
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

      <section className="card plan-card text">
        <h2>Этапы вашего маршрута</h2>
        <div className="stepper">
          {[...route.stages]
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((stage) => {
              const status = getStageStatus(stage.id);
              const sortedCourses = [...stage.courses].sort((a, b) => a.orderIndex - b.orderIndex);

              // Кнопка доступна если: этап в процессе, завален ИЛИ это самый первый не начатый этап
              const canStart = status === 'in_process' || 
                               status === 'failed' || 
                               (status === 'not_started' && firstIncompleteStage?.id === stage.id);
              
              let iconContent: React.ReactNode;
              if (status === 'completed') {
                  iconContent = <img src={done} className="step-icon-img" alt="done" />;
              } else if (status === 'failed') {
                  iconContent = <img src={exclamationmark} className="step-icon-img" alt="failed" style={{ filter: 'brightness(0) invert(1)' }} />;
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
                            {status === 'in_process' && 'Текущий'}
                            {status === 'failed' && 'Не пройден'}
                            {status === 'not_started' && 'Не начат'}
                        </span>
                    </div>
                    
                    {stage.description && <p>{stage.description}</p>}
                    
                    <div className="courses-list-mini">
                        {sortedCourses.map(course => (
                        <div key={course.id} className="course-item">
                            <span className="course-title">{course.title}</span>
                            {course.status && (
                            <span className={`course-status ${course.status}`}>
                                {course.status === 'completed' ? '✓' : 
                                course.status === 'in_process' ? '▶' : '○'}
                            </span>
                            )}
                        </div>
                        ))}
                    </div>
                    
                    {/* Исправленное условие: используем canStart */}
                    {canStart && (
                      <div className="step-footer">
                          <button 
                              className={`btn ${status === 'failed' ? 'btn-secondary' : 'btn-primary'}`}
                              onClick={() => handleStartStage(stage.id)}
                          >
                              {status === 'not_started' && 'Начать этап'}
                              {status === 'in_process' && 'Продолжить этап'}
                              {status === 'failed' && 'Попробовать снова'}
                          </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </section>
    </div>
  );
};

export default AdaptationPage;