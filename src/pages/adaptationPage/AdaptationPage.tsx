import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adaptationService, type OnboardingRoute } from '../../services/adaptation.service';
import { userService, type UserProgress } from '../../services/user.service';
import { courseService } from '../../services/course.service';
import { taskService, type OnboardingTask, type TaskSubmission } from '../../services/task.service';
import { usePageTitle } from '../../contexts/PageTitleContext';
import LoadingSpinner from '../../components/loading/LoadingSpinner';
import { stripMarkdown } from '../../utils/markdownUtils';
import ErrorState from '../../components/error/ErrorState';
import EmptyState from '../../components/empty/EmptyState';
import { StatDonutCard, StatProgressCard } from '../../components/statCard/StatCard';
import './AdaptationPage.css';
import '../../components/statCard/StatCard.css';

import done from '@/assets/icons/done.svg';
import exclamationmark from '@/assets/icons/exclamation-mark.png';

const emptyProgress: UserProgress = {
  totalCourses: 0,
  completedCourses: 0,
  totalStages: 0,
  completedStages: 0,
  totalTasks: 0,
  completedTasks: 0,
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
  const [stageTasks,     setStageTasks]     = useState<Record<number, OnboardingTask[]>>({});
  const [taskSubmissions,setTaskSubmissions]= useState<Record<number, TaskSubmission | null>>({});
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
      const allStageIds: number[] = routeData.stages.map((s: any) => s.id);

      const [courseEntries, taskResults] = await Promise.all([
        Promise.all(allCourseIds.map(async (id) => [id, await courseService.getUserCourseStatus(id)] as const)),
        Promise.allSettled(allStageIds.map(id => taskService.getTasksByStage(id).then(tasks => ({ id, tasks })))),
      ]);

      const tasksMap: Record<number, OnboardingTask[]> = {};
      taskResults.forEach(r => {
        if (r.status === 'fulfilled') tasksMap[r.value.id] = r.value.tasks;
      });

      // load submissions for all tasks
      const allTasks = Object.values(tasksMap).flat();
      const subResults = await Promise.allSettled(
        allTasks.map(t => taskService.getSubmissionsByTask(t.id).then(subs => ({ taskId: t.id, sub: subs.length > 0 ? subs[subs.length - 1] : null })))
      );
      const subsMap: Record<number, TaskSubmission | null> = {};
      subResults.forEach(r => {
        if (r.status === 'fulfilled') subsMap[r.value.taskId] = r.value.sub;
      });

      setProgress(progressData);
      setRoute(routeData);
      setCourseStatuses(Object.fromEntries(courseEntries));
      setStageTasks(tasksMap);
      setTaskSubmissions(subsMap);
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
      console.error('Ошибка при открытии модуля', err);
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
  const total = progress.totalTasks ?? 0;
  const completed = progress.completedTasks ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;


  const sortedStages = [...route.stages].sort((a, b) => a.orderIndex - b.orderIndex);
  const firstActiveIdx = sortedStages.findIndex(s => getStageStatus(s.id) !== 'completed');

  return (
    <div>
      {/* Прогресс */}
      <section className="card text">
        <h2>Мой прогресс</h2>
        <div className="emp-progress-section">
          <StatDonutCard
            value={`${percentStages}%`}
            label="Прогресс по этапам"
            sublabel={`${progress.completedStages} / ${progress.totalStages}`}
          />
          <StatDonutCard
            value={`${percent}%`}
            label="Прогресс по модулям"
            sublabel={`${progress.completedCourses} / ${progress.totalCourses}`}
          />
          <StatProgressCard percent={percentStages} label="Прогресс обучения" />
        </div>
        <div style={{ marginTop: '12px' }}>
          <StatDonutCard
            value={`${pct}%`}
            label="Выполнено заданий"
            sublabel={`${completed} / ${total}`}
          />
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
                      <span className="step-title">{stripMarkdown(stage.title)}</span>
                      {stage.description && (
                        <span className="step-desc">{stripMarkdown(stage.description)}</span>
                      )}
                    </div>
                    <span className={`badge ${status === 'completed' ? 'badge--success' : status === 'failed' ? 'badge--danger' : status === 'current' || status === 'in_process' ? 'badge--warning' : 'badge--neutral'}`}>
                      {STATUS_LABEL[status]}
                    </span>
                  </div>

                  {sortedCourses.length > 0 && (
                    <div className="course-list">
                      <div className='subtitle'>Модули</div>
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
                              <span className="course-row-title">{stripMarkdown(course.title)}</span>
                            </div>
                            <div className="course-row-right">
                              {(isActive || cs === 'completed') && (
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

                  {(stageTasks[stage.id] ?? []).filter(t => t.status === 'active').length > 0 && (
                    <div className="course-list" style={{ marginTop: sortedCourses.length > 0 ? '8px' : '0' }}>
                      <div className='subtitle'>Задания</div>
                      {(stageTasks[stage.id] ?? []).filter(t => t.status === 'active').map(task => {
                        const sub = taskSubmissions[task.id];
                        const subStatus = sub?.status ?? 'no_answer';
                        const dotColor = subStatus === 'approved' ? 'completed' : subStatus === 'rejected' ? 'failed' : subStatus === 'submitted' ? 'in_process' : 'not_started';
                        const btnLabel = sub ? (subStatus === 'approved' ? 'Просмотр' : 'Изменить') : 'Выполнить';
                        return (
                          <div key={task.id} className={`course-row course-row--${dotColor}`}>
                            <div className="course-row-left">
                              <span className={`course-dot course-dot--${dotColor}`} />
                              <span className="course-row-title">{stripMarkdown(task.description)}</span>
                            </div>
                            <div className="course-row-right" style={{ gap: '8px' }}>
                              <button
                                className="btn-go"
                                onClick={() => navigate('/tasks', { state: { taskId: task.id } })}
                              >
                                {btnLabel}
                              </button>
                            </div>
                          </div>
                        );
                      })}
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
