import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import nextRight from '@/assets/icons/next-right.png';
import nextLeft from '@/assets/icons/next-left.png';
import { userService, type EmployeeReportDetail } from '../../../services/user.service';
import { testService, type UserTestAttemptsReport, type TestAttemptDetail } from '../../../services/test.service';
import { adaptationService } from '../../../services/adaptation.service';
import { courseService } from '../../../services/course.service';
import { taskService, type OnboardingTask, type TaskSubmission } from '../../../services/task.service';
import { usePageTitle } from '../../../contexts/PageTitleContext';
import LoadingSpinner from '../../../components/loading/LoadingSpinner';
import ErrorState from '../../../components/error/ErrorState';
import searchIcon from '@/assets/icons/search.svg';
import { stripMarkdown } from '../../../utils/markdownUtils';
import { MarkdownViewer } from '../../../components/markdownEditor/MarkdownEditor';
import { getFileIcon, extractFileNameFromUrl } from '../../../utils/fileUtils';
import '../../employeesPage/EmployeesPage.css';
import './AdminEditUserReportPage.css';
import '../../../components/statCard/StatCard.css';

const STATUS_LABELS: Record<string, string> = {
    completed: 'Завершен',
    in_progress: 'В процессе',
    in_process: 'В процессе',
    not_started: 'Не начат',
    failed: 'Не пройдена',
};

const statusBadgeClass = (status: string) => {
    if (status === 'completed') return 'badge badge--success';
    if (status === 'failed') return 'badge badge--danger';
    if (status === 'in_progress' || status === 'in_process') return 'badge badge--warning';
    return 'badge badge--neutral';
};

const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '—';
    const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateTime = (dateStr: string): string => {
    const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

interface CourseWithTests {
    courseId: number;
    courseTitle: string;
    tests: { id: number; title: string }[];
}

const AdminEditUserReportPage = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { setDynamicTitle } = usePageTitle();

    const [report, setReport] = useState<EmployeeReportDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showAnswers, setShowAnswers] = useState(false);
    const [courses, setCourses] = useState<CourseWithTests[]>([]);
    const [courseSearch, setCourseSearch] = useState('');
    const [activeTestId, setActiveTestId] = useState<number | null>(null);
    const [attemptsReport, setAttemptsReport] = useState<UserTestAttemptsReport | null>(null);
    const [attemptsLoading, setAttemptsLoading] = useState(false);
    const [activeAttemptId, setActiveAttemptId] = useState<number | null>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const tabsRef = useRef<HTMLDivElement>(null);

    // Tasks block
    const [showTasks, setShowTasks] = useState(false);
    const [taskStages, setTaskStages] = useState<{ id: number; title: string }[]>([]);
    const [activeStageId, setActiveStageId] = useState<number | null>(null);
    const [stageTasks, setStageTasks] = useState<OnboardingTask[]>([]);
    const [taskSubmissions, setTaskSubmissions] = useState<Record<number, TaskSubmission | null>>({});
    const [activeTask, setActiveTask] = useState<OnboardingTask | null>(null);
    const [tasksLoading, setTasksLoading] = useState(false);
    const [taskStageSearch, setTaskStageSearch] = useState('');
    const [canScrollLeftTasks, setCanScrollLeftTasks] = useState(false);
    const [canScrollRightTasks, setCanScrollRightTasks] = useState(false);
    const tabsTasksRef = useRef<HTMLDivElement>(null);

    const updateScrollState = () => {
        const el = tabsRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 0);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };

    const scrollTabs = (dir: 'left' | 'right') => {
        tabsRef.current?.scrollBy({ left: dir === 'right' ? 200 : -200, behavior: 'smooth' });
    };

    const updateScrollStateTasks = () => {
        const el = tabsTasksRef.current;
        if (!el) return;
        setCanScrollLeftTasks(el.scrollLeft > 0);
        setCanScrollRightTasks(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };

    const scrollTasksTabs = (dir: 'left' | 'right') => {
        tabsTasksRef.current?.scrollBy({ left: dir === 'right' ? 200 : -200, behavior: 'smooth' });
    };

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        userService.getEmployeeReport(userId)
            .then(data => {
                setReport(data);
                setDynamicTitle(data.fullName);
            })
            .catch(() => setError('Не удалось загрузить отчёт сотрудника'))
            .finally(() => setLoading(false));
        return () => setDynamicTitle('');
    }, [userId, setDynamicTitle]);

    useEffect(() => {
        if (!showAnswers || !report || !userId) return;
        const load = async () => {
            try {
                const routes = await adaptationService.getAllRoutes();
                const found = routes.find(r => r.title === report.routeTitle) ?? routes[0];
                const routeId: number | null = found?.id ?? null;
                if (!routeId) return;

                const fullRoute = await adaptationService.getRoute(routeId);
                const courseIds: { id: number; title: string }[] = [];
                fullRoute.stages.forEach(stage => {
                    stage.courses.forEach((c: any) => courseIds.push({ id: c.id, title: c.title }));
                });

                const courseDetails = await Promise.allSettled(
                    courseIds.map(c => courseService.getCourseById(c.id))
                );

                const list: CourseWithTests[] = [];
                courseDetails.forEach((result, i) => {
                    if (result.status === 'fulfilled' && result.value.tests?.length) {
                        list.push({
                            courseId: courseIds[i].id,
                            courseTitle: courseIds[i].title,
                            tests: result.value.tests.map(t => ({ id: t.id, title: t.title })),
                        });
                    }
                });
                setCourses(list);
                if (list.length > 0 && list[0].tests.length > 0) {
                    setActiveTestId(list[0].tests[0].id);
                }
            } catch { /* ignore */ }
        };
        load();
    }, [showAnswers, report, userId]);

    useEffect(() => {
        updateScrollState();
        const el = tabsRef.current;
        if (!el) return;
        el.addEventListener('scroll', updateScrollState);
        const ro = new ResizeObserver(updateScrollState);
        ro.observe(el);
        return () => { el.removeEventListener('scroll', updateScrollState); ro.disconnect(); };
    }, [courses]);

    useEffect(() => {
        updateScrollStateTasks();
        const el = tabsTasksRef.current;
        if (!el) return;
        el.addEventListener('scroll', updateScrollStateTasks);
        const ro = new ResizeObserver(updateScrollStateTasks);
        ro.observe(el);
        return () => { el.removeEventListener('scroll', updateScrollStateTasks); ro.disconnect(); };
    }, [taskStages]);

    useEffect(() => {
        if (!showTasks || !report) return;
        const load = async () => {
            setTasksLoading(true);
            try {
                const routes = await adaptationService.getAllRoutes();
                const found = routes.find(r => r.title === report.routeTitle) ?? routes[0];
                const routeId: number | null = found?.id ?? null;
                if (!routeId) return;
                const fullRoute = await adaptationService.getRoute(routeId);
                const stages = fullRoute.stages.map((s: any) => ({ id: s.id, title: s.title }));
                setTaskStages(stages);
                if (stages.length > 0) setActiveStageId(stages[0].id);
            } catch { /* ignore */ } finally {
                setTasksLoading(false);
            }
        };
        load();
    }, [showTasks, report]);

    useEffect(() => {
        if (!activeStageId || !report) return;
        taskService.getTasksByStageAdmin(activeStageId)
            .then(data => {
                const visible = data.filter(t =>
                    t.status === 'active' &&
                    // eslint-disable-next-line eqeqeq
                    (t.taskType === 'general' || t.fkUserId == report.userId)
                );
                setStageTasks(visible);
                setActiveTask(null);
            })
            .catch(() => setStageTasks([]));
    }, [activeStageId, report]);

    useEffect(() => {
        if (stageTasks.length === 0 || !report) return;
        Promise.all(
            stageTasks.map(t =>
                taskService.getSubmissionsByTask(t.id)
                    .then(subs => {
                        // eslint-disable-next-line eqeqeq
                        const byUser = subs.filter(s => s.fkUserId == report.userId);
                        return [t.id, byUser.length > 0 ? byUser[byUser.length - 1] : null] as const;
                    })
                    .catch(() => [t.id, null] as const)
            )
        ).then(entries => setTaskSubmissions(Object.fromEntries(entries)));
    }, [stageTasks, report]);

    useEffect(() => {
        if (!activeTestId || !userId) return;
        setAttemptsLoading(true);
        setAttemptsReport(null);
        setActiveAttemptId(null);
        testService.getUserTestAttempts(activeTestId, userId)
            .then(data => {
                setAttemptsReport(data);
                if (data.attempts.length > 0) {
                    setActiveAttemptId(data.attempts[data.attempts.length - 1].attemptId);
                }
            })
            .catch(() => setAttemptsReport(null))
            .finally(() => setAttemptsLoading(false));
    }, [activeTestId, userId]);

    if (loading) return <LoadingSpinner />;
    if (error || !report) return <ErrorState message={error ?? 'Нет данных'} onRetry={() => navigate(-1)} />;

    const filteredCourses = courses.filter(c =>
        c.courseTitle.toLowerCase().includes(courseSearch.toLowerCase())
    );

    const activeAttempt: TestAttemptDetail | undefined =
        attemptsReport?.attempts.find(a => a.attemptId === activeAttemptId);

    return (
        <div className="text">
            <div className="emp-report-card">
                <div className="emp-report-header">
                    <div>
                        <h2 className="emp-report-name">{report.fullName}</h2>
                        <div className="emp-report-meta">
                            {report.department && <span className="meta-item">{report.department}</span>}
                            {report.position && <span className="meta-item">{report.position}</span>}
                            {report.routeTitle && <span className="meta-item">План адаптации: {report.routeTitle}</span>}
                        </div>
                    </div>
                    <span className={statusBadgeClass(report.status)}>
                        {STATUS_LABELS[report.status] ?? report.status}
                    </span>
                </div>

                <hr className="emp-section-divider" />

                <div className="emp-progress-section">
                    <div className="emp-metric-box">
                        <span className="emp-metric-label">Начало адаптации</span>
                        <span className="emp-metric-value">{formatDate(report.startDate)}</span>
                    </div>
                    <div className="emp-metric-box">
                        <span className="emp-metric-label">Завершение адаптации</span>
                        <span className="emp-metric-value">{report.status === 'completed' ? formatDate(report.endDate) : '—'}</span>
                    </div>
                    <div className="emp-progress-block">
                        <div className="emp-progress-row">
                            <span className="emp-progress-percent">{report.completionPercent} %</span>
                            <div className="emp-progress-track">
                                <div className="emp-progress-fill" style={{ width: `${report.completionPercent}%` }} />
                            </div>
                        </div>
                        <span className="emp-progress-label">Прогресс обучения</span>
                    </div>
                </div>

                <hr className="emp-section-divider" />

                <div className="emp-metrics-section">
                    <div className="emp-metric-box">
                        <span className="emp-metric-label">Пройдено модулей</span>
                        <span className="emp-metric-value">{report.completedCourses} из {report.totalCourses}</span>
                    </div>
                    <div className="emp-metric-box">
                        <span className="emp-metric-label">Пройдено тестов</span>
                        <span className="emp-metric-value">{report.completedTests} из {report.totalTests}</span>
                    </div>
                    <div className="emp-donut-box">
                        <div className="emp-donut" style={{ '--p': report.avgTestScore } as React.CSSProperties}>
                            <span>{report.avgTestScore}</span>
                        </div>
                        <span className="emp-donut-label">% верных ответов по тестам</span>
                    </div>
                    <div className="emp-metric-box">
                        <span className="emp-metric-label">Выполнено заданий</span>
                        <span className="emp-metric-value">{report.completedTasks} из {report.totalTasks}</span>
                    </div>
                </div>

                <div className="emp-report-actions">
                    <button
                        className={`btn ${showAnswers ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setShowAnswers(v => !v)}
                    >
                        Ответы тестов
                    </button>
                    <button
                        className={`btn ${showTasks ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setShowTasks(v => !v)}
                    >
                        Задания
                    </button>
                </div>
            </div>

            {showAnswers && (
                <div className="card answers-card page-section">
                    <div className="section-header">
                        <h2>Ответы по тестам</h2>
                        <div className="input-search-wrapper">
                            <input
                                className="input-field"
                                placeholder="Поиск по модулю..."
                                value={courseSearch}
                                onChange={e => setCourseSearch(e.target.value)}
                            />
                            <img src={searchIcon} alt="" className="input-search-icon" />
                        </div>
                    </div>

                    <div className="department-tabs-wrapper">
                        {canScrollLeft && (
                            <button className="dept-scroll-btn" onClick={() => scrollTabs('left')}>
                                <img src={nextLeft} alt="<-" />
                            </button>
                        )}
                        <div className="department-tabs" ref={tabsRef}>
                            {filteredCourses.map(c =>
                                c.tests.map(t => (
                                    <button
                                        key={t.id}
                                        className={`dept-tab${activeTestId === t.id ? ' dept-tab--active' : ''}`}
                                        onClick={() => setActiveTestId(t.id)}
                                    >
                                        {c.courseTitle}
                                    </button>
                                ))
                            )}
                        </div>
                        {canScrollRight && (
                            <button className="dept-scroll-btn" onClick={() => scrollTabs('right')}>
                                <img src={nextRight} alt="->" />
                            </button>
                        )}
                    </div>

                    {attemptsLoading && <LoadingSpinner />}

                    {!attemptsLoading && attemptsReport && (
                        <div className="answers-test-block">
                            <div className="answers-test-header">
                                <div>
                                    <h4 className="answers-test-title">{attemptsReport.testTitle}</h4>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                                        <span className="meta-item meta-item--white">Проходной балл: {attemptsReport.passingScore}%</span>
                                        <span className="meta-item meta-item--white">Попыток: {attemptsReport.totalAttempts}</span>
                                    </div>
                                </div>
                                <span className={attemptsReport.everPassed ? 'badge badge--success' : 'badge badge--danger'}>
                                    {attemptsReport.everPassed ? 'Завершен' : 'Не завершен'}
                                </span>
                            </div>

                            <div className="answers-attempts-list">
                                {attemptsReport.attempts.map(attempt => (
                                    <button
                                        key={attempt.attemptId}
                                        className={`answers-attempt-btn${activeAttemptId === attempt.attemptId ? ' answers-attempt-btn--active' : ''}`}
                                        onClick={() => setActiveAttemptId(attempt.attemptId)}
                                    >
                                        <span className="answers-attempt-num">Попытка {attempt.attemptNumber}</span>
                                        <span className="answers-attempt-score">{attempt.score}%</span>
                                        <span className="answers-attempt-date">{formatDateTime(attempt.finishedAt)}</span>
                                        <span className={attempt.isPassed ? 'badge badge--success' : 'badge badge--danger'}>
                                            {attempt.isPassed ? 'Верная' : 'Не верная'}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {activeAttempt && (
                                <div className="answers-questions-list">
                                    {activeAttempt.questions.map((q, idx) => (
                                        <div key={q.questionId} className={`answers-question-box${q.isCorrect ? ' answers-question-box--correct' : ' answers-question-box--wrong'}`}>
                                            <div className="answers-question-header">
                                                <div className="question-number">Вопрос {idx + 1}</div>
                                                <p className="answers-question-text">{q.questionText}</p>
                                                <span className={q.isCorrect ? 'badge badge--success' : 'badge badge--danger'}>
                                                    {q.isCorrect ? 'Верно' : 'Неверно'}
                                                </span>
                                            </div>

                                            <div className="answers-options-block">
                                                <div className="answers-options-col">
                                                    <span className="meta-item">Ответ сотрудника</span>
                                                    {q.userSelectedOptions.map((opt, i) => (
                                                        <span key={i} className={`answers-option-chip ${q.isCorrect ? 'badge--success' : 'badge--danger'}`}>{opt}</span>
                                                    ))}
                                                    {q.userAnswerText && <span className="answers-option-chip badge--danger">{q.userAnswerText}</span>}
                                                </div>
                                                {!q.isCorrect && (
                                                    <div className="answers-options-col">
                                                        <span className="meta-item">Правильный ответ</span>
                                                        {q.correctOptions.map((opt, i) => (
                                                            <span key={i} className="answers-option-chip badge--success">{opt}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {!attemptsLoading && !attemptsReport && activeTestId && (
                        <p className="answers-empty">Данные о попытках не найдены</p>
                    )}
                </div>
            )}

            {showTasks && (
                <div className="card answers-card page-section">
                    <div className="section-header">
                        <h2>Задания</h2>
                        <div className="input-search-wrapper">
                            <input
                                className="input-field"
                                placeholder="Поиск по этапу..."
                                value={taskStageSearch}
                                onChange={e => setTaskStageSearch(e.target.value)}
                            />
                            <img src={searchIcon} alt="" className="input-search-icon" />
                        </div>
                    </div>

                    {tasksLoading && <LoadingSpinner />}

                    {!tasksLoading && taskStages.length > 0 && (
                        <div className="department-tabs-wrapper">
                            {canScrollLeftTasks && (
                                <button className="dept-scroll-btn" onClick={() => scrollTasksTabs('left')}>
                                    <img src={nextLeft} alt="<-" />
                                </button>
                            )}
                            <div className="department-tabs" ref={tabsTasksRef}>
                                {taskStages
                                    .filter(s => s.title.toLowerCase().includes(taskStageSearch.toLowerCase()))
                                    .map(s => (
                                        <button
                                            key={s.id}
                                            className={`dept-tab${activeStageId === s.id ? ' dept-tab--active' : ''}`}
                                            onClick={() => setActiveStageId(s.id)}
                                        >
                                            {stripMarkdown(s.title)}
                                        </button>
                                    ))
                                }
                            </div>
                            {canScrollRightTasks && (
                                <button className="dept-scroll-btn" onClick={() => scrollTasksTabs('right')}>
                                    <img src={nextRight} alt="->" />
                                </button>
                            )}
                        </div>
                    )}

                    {!tasksLoading && stageTasks.length === 0 && activeStageId && (
                        <p className="answers-empty">Заданий в этом этапе нет</p>
                    )}

                    {!tasksLoading && stageTasks.length > 0 && (
                        <>
                            <div className="answers-attempts-list">
                                {stageTasks.map(task => {
                                    const sub = taskSubmissions[task.id];
                                    const isActive = activeTask?.id === task.id;
                                    const subStatusBadge = sub
                                        ? sub.status === 'approved' ? 'badge badge--success'
                                        : sub.status === 'rejected' ? 'badge badge--danger'
                                        : 'badge badge--warning'
                                        : 'badge badge--neutral';
                                    const subStatusLabel = sub
                                        ? sub.status === 'approved' ? 'Принято'
                                        : sub.status === 'rejected' ? 'Не принято'
                                        : 'На проверке'
                                        : 'Нет ответа';
                                    return (
                                        <button
                                            key={task.id}
                                            className={`task-attempt-btn${isActive ? ' task-attempt-btn--active' : ''}`}
                                            onClick={() => setActiveTask(isActive ? null : task)}
                                        >
                                            <span className="task-title-truncated">{stripMarkdown(task.description)}</span>
                                            <div className="task-attempt-meta">
                                                <span className="meta-item meta-item--white">{task.taskType === 'general' ? 'Общее' : 'Индивидуальное'}</span>
                                                <span className={`${subStatusBadge} task-status-badge`}>{subStatusLabel}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {activeTask && (() => {
                                const sub = taskSubmissions[activeTask.id];
                                const cleanMentorComment = sub?.mentorComment ?? null;

                                return (
                                    <div className="answers-test-block task-detail-block">
                                        <div className="answers-test-header">
                                            <div>
                                                <MarkdownViewer content={activeTask.description} className="answers-test-title" />
                                                <div className="task-accordion-meta">
                                                    {sub?.createdAt && (
                                                        <span className="text-info">Ответ отправлен: {formatDateTime(sub.createdAt)}</span>
                                                    )}
                                                    {sub?.reviewedAt && (
                                                        <span className="text-info">Проверено: {formatDateTime(sub.reviewedAt)}</span>
                                                    )}
                                                </div>
                                            </div>
                                            {sub && (
                                                <span className={`${sub.status === 'approved' ? 'badge badge--success' : sub.status === 'rejected' ? 'badge badge--danger' : 'badge badge--warning'} task-status-badge`}>
                                                    {sub.status === 'approved' ? 'Принято' : sub.status === 'rejected' ? 'Не принято' : 'На проверке'}
                                                </span>
                                            )}
                                        </div>

                                        {sub?.answerText && (
                                            <div className="input-item">
                                                <h4>Ответ сотрудника</h4>
                                                <div className="input-field"><MarkdownViewer content={sub.answerText} /></div>
                                            </div>
                                        )}

                                        {sub?.fileUrl && (
                                            <div className="task-file-block">
                                                <h4>Файл сотрудника</h4>
                                                <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" download className="card-item material-item">
                                                    <div className="material-content">
                                                        <p className="task-file-name">{extractFileNameFromUrl(sub.fileUrl)}</p>
                                                        <img src={getFileIcon(sub.fileUrl, false)} alt="" />
                                                    </div>
                                                </a>
                                            </div>
                                        )}

                                        {!sub && (
                                            <p className="answers-empty">Ответ не отправлен</p>
                                        )}

                                        {sub && !sub.answerText && !sub.fileUrl && (
                                            <p className="answers-empty">Ответ пуст</p>
                                        )}

                                        {cleanMentorComment && (
                                            <>
                                                <hr className="task-divider" />
                                                <div className="task-mentor-prev">
                                                    <h4>Комментарий проверяющего</h4>
                                                    <div className="input-field"><MarkdownViewer content={cleanMentorComment} /></div>
                                                </div>
                                            </>
                                        )}

                                        {sub && sub.status === 'submitted' && (
                                            <>
                                                <hr className="task-divider" />
                                                <div className="task-review-actions">
                                                    <button
                                                        className="btn btn-primary"
                                                        onClick={() => navigate(`/edit/tasks?tab=review&userId=${report.userId}`)}
                                                    >
                                                        Перейти к проверке
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })()}
                        </>
                    )}
                </div>
            )}

            <div className="card-footer">
                <button className="btn btn-secondary" onClick={() => navigate(-1)}>Назад</button>
            </div>
        </div>
    );
};

export default AdminEditUserReportPage;
