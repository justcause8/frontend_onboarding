import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import nextRight from '@/assets/icons/next-right.png';
import nextLeft from '@/assets/icons/next-left.png';
import { userService, type EmployeeReportDetail } from '../../services/user.service';
import { testService, type UserTestAttemptsReport, type TestAttemptDetail } from '../../services/test.service';
import { adaptationService } from '../../services/adaptation.service';
import { courseService } from '../../services/course.service';
import { taskService, type OnboardingTask, type TaskSubmission } from '../../services/task.service';
import { usePageTitle } from '../../contexts/PageTitleContext';
import LoadingSpinner from '../../components/loading/LoadingSpinner';
import ErrorState from '../../components/error/ErrorState';
import searchIcon from '@/assets/icons/search.svg';
import { getFileIcon, extractFileNameFromUrl } from '../../utils/fileUtils';
import '../employeesPage/EmployeesPage.css';
import './AdminEditUserReportPage.css';
import '../../components/statCard/StatCard.css';

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

    // Карточка ответов
    const [showAnswers, setShowAnswers] = useState(false);
    const [showTasks, setShowTasks] = useState(false);

    // Задания
    const [taskStages, setTaskStages] = useState<{ id: number; title: string }[]>([]);
    const [activeStageId, setActiveStageId] = useState<number | null>(null);
    const [stageTasks, setStageTasks] = useState<OnboardingTask[]>([]);
    const [taskSubmissions, setTaskSubmissions] = useState<Record<number, TaskSubmission | null>>({});
    const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
    const [activeTask, setActiveTask] = useState<OnboardingTask | null>(null);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewFileUrl, setReviewFileUrl] = useState('');
    const [reviewSaving, setReviewSaving] = useState(false);
    const [tasksLoading, setTasksLoading] = useState(false);
    const [taskStageSearch, setTaskStageSearch] = useState('');
    const [canScrollLeftTasks, setCanScrollLeftTasks] = useState(false);
    const [canScrollRightTasks, setCanScrollRightTasks] = useState(false);
    const tabsTasksRef = useRef<HTMLDivElement>(null);
    const [courses, setCourses] = useState<CourseWithTests[]>([]);
    const [courseSearch, setCourseSearch] = useState('');
    const [activeTestId, setActiveTestId] = useState<number | null>(null);
    const [attemptsReport, setAttemptsReport] = useState<UserTestAttemptsReport | null>(null);
    const [attemptsLoading, setAttemptsLoading] = useState(false);
    const [activeAttemptId, setActiveAttemptId] = useState<number | null>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const tabsRef = useRef<HTMLDivElement>(null);

    const updateScrollState = () => {
        const el = tabsRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 0);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };

    const scrollTabs = (dir: 'left' | 'right') => {
        tabsRef.current?.scrollBy({ left: dir === 'right' ? 200 : -200, behavior: 'smooth' });
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

    // Загружаем план адаптации сотрудника для получения модулей с тестами
    useEffect(() => {
        if (!showAnswers || !report || !userId) return;
        const load = async () => {
            try {
                // Ищем план адаптации по названию из отчёта среди всех планов
                const routes = await adaptationService.getAllRoutes();
                const found = routes.find(r => r.title === report.routeTitle) ?? routes[0];
                const routeId: number | null = found?.id ?? null;

                if (!routeId) return;

                // Загружаем полный план адаптации, затем каждый модуль отдельно для получения тестов
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
            } catch { /* ошибка — оставляем пустой список */ }
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

    // Загружаем попытки при смене активного теста
    useEffect(() => {
        if (!activeTestId || !userId) return;
        setAttemptsLoading(true);
        setAttemptsReport(null);
        setActiveAttemptId(null);
        testService.getUserTestAttempts(activeTestId, userId)
            .then(data => {
                setAttemptsReport(data);
                // Открываем последнюю попытку по умолчанию
                if (data.attempts.length > 0) {
                    setActiveAttemptId(data.attempts[data.attempts.length - 1].attemptId);
                }
            })
            .catch(() => setAttemptsReport(null))
            .finally(() => setAttemptsLoading(false));
    }, [activeTestId, userId]);

    // Загружаем этапы и задания сотрудника при открытии блока заданий
    useEffect(() => {
        if (!showTasks || !report) return;
        const load = async () => {
            setTasksLoading(true);
            try {
                const routes = await adaptationService.getAllRoutes();
                const found = routes.find(r => r.title === report.routeTitle) ?? routes[0];
                if (!found) return;
                const fullRoute = await adaptationService.getRoute(found.id);
                const stages = fullRoute.stages.map((s: any) => ({ id: s.id, title: s.title }));
                setTaskStages(stages);
                if (stages.length > 0) setActiveStageId(stages[0].id);
            } catch { /* ignore */ } finally {
                setTasksLoading(false);
            }
        };
        load();
    }, [showTasks, report]);

    // Загружаем задания при смене этапа
    useEffect(() => {
        if (!activeStageId) return;
        const load = async () => {
            setTasksLoading(true);
            try {
                const tasks = await taskService.getTasksByStage(activeStageId);
                setStageTasks(tasks);
                setActiveTask(tasks.length > 0 ? tasks[0] : null);
                const subResults = await Promise.allSettled(
                    tasks.map(t => taskService.getSubmissionsByTask(t.id)
                        .then(subs => ({ taskId: t.id, sub: subs.length > 0 ? subs[subs.length - 1] : null })))
                );
                const map: Record<number, TaskSubmission | null> = {};
                subResults.forEach(r => { if (r.status === 'fulfilled') map[r.value.taskId] = r.value.sub; });
                setTaskSubmissions(map);
            } catch { /* ignore */ } finally {
                setTasksLoading(false);
            }
        };
        load();
    }, [activeStageId]);

    // Сброс комментария при смене задания
    useEffect(() => {
        const sub = activeTask ? taskSubmissions[activeTask.id] : null;
        setReviewComment(sub?.mentorComment ?? '');
        setReviewFileUrl('');
    }, [activeTask, taskSubmissions]);

    // Скролл вкладок заданий
    const updateScrollStateTasks = () => {
        const el = tabsTasksRef.current;
        if (!el) return;
        setCanScrollLeftTasks(el.scrollLeft > 0);
        setCanScrollRightTasks(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };

    const scrollTaskTabs = (dir: 'left' | 'right') => {
        tabsTasksRef.current?.scrollBy({ left: dir === 'right' ? 200 : -200, behavior: 'smooth' });
    };

    const handleReview = async (task: OnboardingTask, comment: string, fileUrl: string, status: 'approved' | 'rejected') => {
        const sub = taskSubmissions[task.id];
        if (!sub) return;
        setReviewSaving(true);
        const fullComment = fileUrl
            ? `${comment}\n[Файл от проверяющего]: ${fileUrl}`.trim()
            : comment;
        try {
            await taskService.reviewSubmission(sub.id, { mentorComment: fullComment, status });
            const reviewedAt = new Date().toISOString();
            setTaskSubmissions(prev => ({
                ...prev,
                [task.id]: { ...sub, status, mentorComment: fullComment, updatedAt: reviewedAt },
            }));
        } catch { alert('Ошибка при сохранении'); } finally {
            setReviewSaving(false);
        }
    };

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
                        <span className="emp-metric-value">{formatDate(report.endDate)}</span>
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
                        className={`btn ${showAnswers ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => setShowAnswers(v => !v)}
                    >
                        Ответы тестов
                    </button>
                    <button
                        className={`btn ${showTasks ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => setShowTasks(v => !v)}
                    >
                        Задания
                    </button>
                </div>
            </div>

            {/* Карточка заданий */}
            {showTasks && (
                <div className="card answers-card">
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

                    {/* Вкладки этапов */}
                    <div className="department-tabs-wrapper">
                        {canScrollLeftTasks && (
                            <button className="dept-scroll-btn" onClick={() => scrollTaskTabs('left')}>
                                <img src={nextLeft} alt="<-" />
                            </button>
                        )}
                        <div className="department-tabs" ref={tabsTasksRef} onScroll={updateScrollStateTasks}>
                            {taskStages
                                .filter(s => s.title.toLowerCase().includes(taskStageSearch.toLowerCase()))
                                .map(s => (
                                    <button
                                        key={s.id}
                                        className={`dept-tab${activeStageId === s.id ? ' dept-tab--active' : ''}`}
                                        onClick={() => { setActiveStageId(s.id); setExpandedTaskId(null); }}
                                    >
                                        {s.title}
                                    </button>
                                ))}
                        </div>
                        {canScrollRightTasks && (
                            <button className="dept-scroll-btn" onClick={() => scrollTaskTabs('right')}>
                                <img src={nextRight} alt="->" />
                            </button>
                        )}
                    </div>

                    {tasksLoading && <LoadingSpinner />}

                    {!tasksLoading && stageTasks.length === 0 && (
                        <p className="answers-empty">Заданий для этого этапа нет</p>
                    )}

                    {!tasksLoading && stageTasks.length > 0 && (() => {
                        const activeSub = activeTask ? taskSubmissions[activeTask.id] : null;
                        const mentorFileLine = activeSub?.mentorComment?.split('\n').find(l => l.startsWith('[Файл от проверяющего]:'));
                        const mentorFileUrlParsed = mentorFileLine ? mentorFileLine.replace('[Файл от проверяющего]:', '').trim() : null;
                        const cleanMentorComment = activeSub?.mentorComment
                            ? activeSub.mentorComment.split('\n').filter(l => !l.startsWith('[Файл от проверяющего]:')).join('\n').trim()
                            : null;

                        return (
                        <>
                            {/* Список кнопок заданий */}
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
                                            <span className="task-title-truncated">{task.description}</span>
                                            <span className="meta-item meta-item--white">{task.taskType === 'general' ? 'Общее' : 'Индивидуальное'}</span>
                                            {sub?.updatedAt
                                                ? <span className="answers-attempt-date">{formatDateTime(sub.updatedAt)}</span>
                                                : <span />
                                            }
                                            <span className={`${subStatusBadge} task-status-badge`}>{subStatusLabel}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Детализация выбранного задания */}
                            {activeTask && (
                                <div className="answers-test-block task-detail-block">
                                    <div className="answers-test-header">
                                        <div>
                                            <h4 className="answers-test-title">{activeTask.description}</h4>
                                            <div className="task-accordion-meta">
                                                {activeSub?.updatedAt && (
                                                    <span className="text-info">Изменено: {formatDateTime(activeSub.updatedAt)}</span>
                                                )}
                                            </div>
                                        </div>
                                        {activeSub && (
                                            <span className={`${activeSub.status === 'approved' ? 'badge badge--success' : activeSub.status === 'rejected' ? 'badge badge--danger' : 'badge badge--warning'} task-status-badge`}>
                                                {activeSub.status === 'approved' ? 'Принято' : activeSub.status === 'rejected' ? 'Не принято' : 'На проверке'}
                                            </span>
                                        )}
                                    </div>

                                    {activeSub ? (
                                        <>
                                            <div className="task-answer-type">
                                                <span className="meta-item meta-item--white">
                                                    Ответ представлен в виде:{' '}
                                                    {activeSub.answerText && activeSub.fileUrl ? 'текст и файл' : activeSub.fileUrl ? 'файл' : 'текст'}
                                                </span>
                                            </div>

                                            {activeSub.answerText && (
                                                <div className="input-item">
                                                    <h4>Ответ сотрудника</h4>
                                                    <textarea
                                                        className="textarea-field task-readonly-textarea"
                                                        value={activeSub.answerText}
                                                        readOnly
                                                        rows={4}
                                                    />
                                                </div>
                                            )}

                                            {activeSub.fileUrl && (
                                                <div className="task-file-block">
                                                    <h4>Файл сотрудника</h4>
                                                    <a href={activeSub.fileUrl} target="_blank" rel="noopener noreferrer" download className="card-item material-item">
                                                        <div className="material-content">
                                                            <p className="task-file-name">{extractFileNameFromUrl(activeSub.fileUrl)}</p>
                                                            <img src={getFileIcon(activeSub.fileUrl, !activeSub.fileUrl.match(/\.(pdf|doc|docx|xls|xlsx|png|jpg|jpeg|gif|zip|rar)$/i))} alt="" />
                                                        </div>
                                                    </a>
                                                </div>
                                            )}

                                            {!activeSub.answerText && !activeSub.fileUrl && (
                                                <p className="answers-empty">Ответ пуст</p>
                                            )}

                                            <hr className="task-divider" />

                                            {cleanMentorComment && (
                                                <div className="task-mentor-prev">
                                                    {mentorFileUrlParsed && (
                                                        <a href={mentorFileUrlParsed} target="_blank" rel="noopener noreferrer" download className="card-item material-item">
                                                            <div className="material-content">
                                                                <p className="task-file-name">{extractFileNameFromUrl(mentorFileUrlParsed)}</p>
                                                                <img src={getFileIcon(mentorFileUrlParsed, !mentorFileUrlParsed.match(/\.(pdf|doc|docx|xls|xlsx|png|jpg|jpeg|gif|zip|rar)$/i))} alt="" />
                                                            </div>
                                                        </a>
                                                    )}
                                                    {activeSub.updatedAt && (
                                                        <p className="text-info task-review-date">Дата проверки: {formatDateTime(activeSub.updatedAt)}</p>
                                                    )}
                                                </div>
                                            )}

                                            <div className="input-item">
                                                <h4>Добавить комментарий</h4>
                                                <textarea
                                                    className="textarea-field"
                                                    placeholder="Введите комментарий..."
                                                    value={reviewComment}
                                                    onChange={e => setReviewComment(e.target.value)}
                                                    rows={3}
                                                />
                                            </div>
                                            <div className="input-item">
                                                <h4>Добавить материал (необязательно)</h4>
                                                <input
                                                    className="input-field"
                                                    placeholder="https://..."
                                                    value={reviewFileUrl}
                                                    onChange={e => setReviewFileUrl(e.target.value)}
                                                />
                                            </div>
                                            <div className="task-review-actions">
                                                <button
                                                    className="btn btn-secondary"
                                                    disabled={reviewSaving}
                                                    onClick={() => handleReview(activeTask, reviewComment, reviewFileUrl, 'rejected')}
                                                >
                                                    Не принять
                                                </button>
                                                <button
                                                    className="btn btn-primary"
                                                    disabled={reviewSaving}
                                                    onClick={() => handleReview(activeTask, reviewComment, reviewFileUrl, 'approved')}
                                                >
                                                    Принять
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="answers-empty">Сотрудник ещё не отправил ответ</p>
                                    )}
                                </div>
                            )}
                        </>
                        );
                    })()}
                </div>
            )}

            {/* Карточка ответов по тестам */}
            {showAnswers && (
                <div className="card answers-card">
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

                    {/* Вкладки тестов по модулям */}
                    <div className="department-tabs-wrapper">
                        {canScrollLeft && (
                            <button className="dept-scroll-btn" onClick={() => scrollTabs('left')}>
                                <img src={nextLeft} alt="←" />
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
                                <img src={nextRight} alt="→" />
                            </button>
                        )}
                    </div>

                    {attemptsLoading && <LoadingSpinner />}

                    {!attemptsLoading && attemptsReport && (
                        <div className="answers-test-block">
                            {/* Шапка теста */}
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

                            {/* Список попыток */}
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

                            {/* Детализация выбранной попытки */}
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

            <div className="card-footer">
                <button className="btn btn-secondary" onClick={() => navigate(-1)}>Назад</button>
            </div>
        </div>
    );
};

export default AdminEditUserReportPage;
