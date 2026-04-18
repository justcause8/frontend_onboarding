import React, { useEffect, useState } from 'react';
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
import '../../components/statCard/StatCard.css';

import done from '@/assets/icons/done.svg';
import exclamationmark from '@/assets/icons/exclamation-mark.png';

const emptyProgress: UserProgress = {
  totalCourses: 0,
  completedCourses: 0,
  totalStages: 0,
  completedStages: 0,
  percentCourses: 0,
  percentStages: 0,
  stageProgress: [],
};

const STATUS_LABEL: Record<string, string> = {
  completed:  'Завершён',
  current:    'В процессе',
  failed:     'Не пройден',
  not_started:'Не начат',
  in_process: 'В процессе',
};

const AdaptationPage = () => {
  const navigate = useNavigate();
  const { setDynamicTitle } = usePageTitle();

  const [route,          setRoute]          = useState<OnboardingRoute | null>(null);
  const [progress,       setProgress]       = useState<UserProgress>(emptyProgress);
  const [courseStatuses, setCourseStatuses] = useState<Record<number, string>>({});
  const [loading,        setLoading]        = useState(true);
  const [loadingCourseId,setLoadingCourseId]= useState<number | null>(null);
  const [error,          setError]          = useState<string | null>(null);

  useEffect(() => {
    setDynamicTitle('Мой план адаптации');
    return () => setDynamicTitle('');
  }, [setDynamicTitle]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      await userService.recalcStatuses();
      const routeId = await userService.getMyRouteId();
      if (!routeId) { setRoute(null); setProgress(emptyProgress); return; }

      const [progressData, routeData] = await Promise.all([
        userService.getUserProgress(),
        adaptationService.getRoute(routeId),
      ]);

      const allCourseIds: number[] = routeData.stages.flatMap((s: any) =>
        (s.courses || []).map((c: any) => c.id)
      );
      const entries = await Promise.all(
        allCourseIds.map(async (id) => [id, await courseService.getUserCourseStatus(id)] as const)
      );

      setProgress(progressData);
      setRoute(routeData);
      setCourseStatuses(Object.fromEntries(entries));
    } catch (e) {
      console.error('Ошибка загрузки', e);
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return <LoadingSpinner />;
  if (error)   return <ErrorState message={error} onRetry={loadData} />;
  if (!route)  return (
    <EmptyState title="План адаптации не назначен" description="Обратитесь к HR-специалисту или Наставнику." />
  );

  const handleOpenCourse = async (courseId: number) => {
    try {
      setLoadingCourseId(courseId);
      await courseService.startCourse(courseId);
      await userService.recalcStatuses();
      navigate(`/courses/course/${courseId}`);
    } catch (err) {
      console.error('Ошибка при открытии курса', err);
    } finally {
      setLoadingCourseId(null);
    }
  };

  const getStageStatus = (stageId: number): 'completed' | 'failed' | 'current' | 'not_started' | 'in_process' => {
    const s = progress.stageProgress?.find(item => item.stageId === stageId);
      if (!s) return 'not_started';
      
      return s.status as any; 
  };

  const percent = progress.percentCourses ?? (progress as any).PercentCourses ?? 0;
  const percentStages = progress.percentStages ?? (progress as any).PercentStages ?? 0;

  const sortedStages = [...route.stages].sort((a, b) => a.orderIndex - b.orderIndex);
  const firstActiveIdx = sortedStages.findIndex(s => getStageStatus(s.id) !== 'completed');

  return (
    <div>
      {/* Прогресс */}
      <section className="card text">
        <h2>Мой прогресс</h2>
        <div className="emp-progress-section">
          <div className="emp-donut-box">
            <div className="emp-donut" style={{ '--p': percentStages } as React.CSSProperties}>
              <span>{percentStages}%</span>
            </div>
            <span className="emp-donut-label">Прогресс по этапам</span>
          </div>
          <div className="emp-donut-box">
            <div className="emp-donut" style={{ '--p': percent } as React.CSSProperties}>
              <span>{percent}%</span>
            </div>
            <span className="emp-donut-label">Прогресс по курсам</span>
          </div>
          <div className="emp-progress-block">
            <div className="emp-progress-row">
              <span className="emp-progress-percent">{percentStages} %</span>
              <div className="emp-progress-track">
                <div className="emp-progress-fill" style={{ width: `${percentStages}%` }} />
              </div>
            </div>
            <span className="emp-progress-label">Прогресс обучения</span>
          </div>
        </div>
      </section>

      {/* Этапы */}
      <section className="card text">
        <h2>Этапы плана адаптации</h2>
        <div className="stepper">
          {sortedStages.map((stage, idx) => {
            const status = getStageStatus(stage.id);
            const isActive = idx === firstActiveIdx || status === 'current' || status === 'failed';
            const sortedCourses = [...stage.courses]
              .filter((c: any) => c.status !== 'archived')
              .sort((a, b) => a.orderIndex - b.orderIndex);

            return (
              <div key={stage.id} className={`step step--${status}`}>

                <div className="step-num">
                  {status === 'completed' ? (
                    <img src={done} className="step-icon-img" alt="done" />
                  ) : status === 'failed' ? (
                    <img src={exclamationmark} className="step-icon-img" alt="failed" />
                  ) : (
                    stage.orderIndex
                  )}
                </div>

                {/* Карточка этапа */}
                <div className="step-body">
                  <div className="step-head">
                    <div className="step-head-left">
                      <span className="step-title">{stage.title}</span>
                      {stage.description && (
                        <span className="step-desc">{stage.description}</span>
                      )}
                    </div>
                    <span className={`badge ${status === 'completed' ? 'badge--success' : status === 'failed' ? 'badge--danger' : status === 'current' || status === 'in_process' ? 'badge--warning' : 'badge--neutral'}`}>
                      {STATUS_LABEL[status]}
                    </span>
                  </div>

                  {sortedCourses.length > 0 && (
                    <div className="course-list">
                      {sortedCourses.map(course => {
                        const cs = courseStatuses[course.id] || 'not_started';
                        const btnLabel = loadingCourseId === course.id ? '...'
                          : cs === 'completed'  ? 'Повторить'
                          : cs === 'in_process' ? 'Продолжить'
                          : 'Начать';

                        return (
                          <div key={course.id} className={`course-row course-row--${cs}`}>
                            <div className="course-row-left">
                              <span className={`course-dot course-dot--${cs}`} />
                              <span className="course-row-title">{course.title}</span>
                            </div>
                            <div className="course-row-right">
                              {/* <span className={`course-chip course-chip--${cs}`}>
                                {STATUS_LABEL[cs] ?? cs}
                              </span> */}
                              {isActive && (
                                <button
                                  className={`btn-go btn-go--${cs}`}
                                  disabled={loadingCourseId === course.id}
                                  onClick={() => handleOpenCourse(course.id)}
                                >
                                  {btnLabel}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {sortedCourses.length === 0 && isActive && (
                    <p className="step-no-courses">Курсы для этого этапа ещё не назначены</p>
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
