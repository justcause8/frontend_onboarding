import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userService, type EmployeeReportDetail } from '../../services/user.service';
import { usePageTitle } from '../../contexts/PageTitleContext';
import LoadingSpinner from '../../components/loading/LoadingSpinner';
import ErrorState from '../../components/error/ErrorState';
import searchIcon from '@/assets/icons/search.svg';
import '../employeesPage/EmployeesPage.css';
import './AdminEditUserReportPage.css';

// Моковые данные ответов — заменить на реальный API когда появится эндпоинт
const MOCK_COURSES = [
    {
        id: 1,
        title: 'О компании',
        test: {
            title: 'Тест по курсу О компании',
            correct: 0,
            total: 3,
            questions: [
                {
                    id: 1,
                    text: 'Текст вопроса 1?',
                    type: 'single',
                    options: [
                        { id: 1, text: 'Вариант ответа 1', isCorrect: false, isSelected: false },
                        { id: 2, text: 'Вариант ответа 2', isCorrect: true, isSelected: false },
                    ],
                },
                {
                    id: 2,
                    text: 'Текст вопроса 2?',
                    type: 'multiple',
                    options: [
                        { id: 3, text: 'Вариант ответа 1', isCorrect: true, isSelected: true },
                        { id: 4, text: 'Вариант ответа 2', isCorrect: false, isSelected: false },
                    ],
                },
            ],
        },
    },
    {
        id: 2,
        title: 'Тестовый курс',
        test: {
            title: 'Тест по курсу Тестовый курс',
            correct: 2,
            total: 3,
            questions: [
                {
                    id: 3,
                    text: 'Вопрос из тестового курса?',
                    type: 'single',
                    options: [
                        { id: 5, text: 'Верный ответ', isCorrect: true, isSelected: true },
                        { id: 6, text: 'Неверный ответ', isCorrect: false, isSelected: false },
                    ],
                },
            ],
        },
    },
];

const STATUS_LABELS: Record<string, string> = {
    completed: 'Завершен',
    in_progress: 'В процессе',
    in_process: 'В процессе',
    not_started: 'Не начат',
    failed: 'Не пройдена',
};

const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '—';
    const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const AdminEditUserReportPage = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { setDynamicTitle } = usePageTitle();

    const [report, setReport] = useState<EmployeeReportDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showAnswers, setShowAnswers] = useState(false);
    const [activeCourseId, setActiveCourseId] = useState(MOCK_COURSES[0]?.id ?? 0);
    const [courseSearch, setCourseSearch] = useState('');

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

    if (loading) return <LoadingSpinner />;
    if (error || !report) return <ErrorState message={error ?? 'Нет данных'} onRetry={() => navigate(-1)} />;

    return (
        <div className="text">
            <div className="emp-report-card">
                <div className="emp-report-header">
                    <div>
                        <h2 className="emp-report-name">{report.fullName}</h2>
                        <div className="emp-report-meta">
                            {report.department && <span className="emp-meta-item">{report.department}</span>}
                            {report.position && <span className="emp-meta-item">{report.position}</span>}
                            {report.routeTitle && <span className="emp-meta-item">Маршрут: {report.routeTitle}</span>}
                        </div>
                    </div>
                    <span className={`emp-status-badge emp-status-${report.status}`}>
                        {STATUS_LABELS[report.status] ?? report.status}
                    </span>
                </div>

                <hr className="emp-section-divider" />

                {/* Прогресс + даты */}
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

                {/* Метрики + круговая диаграмма */}
                <div className="emp-metrics-section">
                    <div className="emp-metric-box">
                        <span className="emp-metric-label">Пройдено курсов</span>
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
                    <button className="btn btn-primary" onClick={() => setShowAnswers(v => !v)}>
                        {showAnswers ? 'Скрыть ответы' : 'Просмотр ответов'}
                    </button>
                    <button className="btn btn-primary">Просмотр заданий</button>
                </div>
            </div>

            {/* Карточка ответов по тестам */}
            {showAnswers && (() => {
                const filteredCourses = MOCK_COURSES.filter(c =>
                    c.title.toLowerCase().includes(courseSearch.toLowerCase())
                );
                const activeCourse = filteredCourses.find(c => c.id === activeCourseId) ?? filteredCourses[0];

                return (
                    <div className="card answers-card">
                        <div className="section-header">
                            <h2>Ответы по тестам</h2>
                            <div className="input-search-wrapper">
                                <input
                                    className="input-field"
                                    placeholder="Поиск по курсу..."
                                    value={courseSearch}
                                    onChange={e => setCourseSearch(e.target.value)}
                                />
                                <img src={searchIcon} alt="" className="input-search-icon" />
                            </div>
                        </div>

                        {/* Вкладки курсов */}
                        <div className="answers-course-tabs">
                            {filteredCourses.map(c => (
                                <button
                                    key={c.id}
                                    className={`answers-course-tab${activeCourse?.id === c.id ? ' answers-course-tab--active' : ''}`}
                                    onClick={() => setActiveCourseId(c.id)}
                                >
                                    {c.title}
                                </button>
                            ))}
                        </div>

                        {/* Тест активного курса */}
                        {activeCourse && (
                            <div className="answers-test-block">
                                <h4 className="answers-test-title">{activeCourse.test.title}</h4>
                                <div className="answers-questions-list">
                                    {activeCourse.test.questions.map(q => (
                                        <div key={q.id} className="answers-question-box">
                                            <p className="answers-question-text">{q.text}</p>
                                            <div className="answers-options-list">
                                                {q.options.map(opt => (
                                                    <label key={opt.id} className={`answers-option${opt.isSelected ? ' answers-option--selected' : ''}${opt.isCorrect ? ' answers-option--correct' : ''}`}>
                                                        <span className={`answers-option-mark answers-option-mark--${q.type}`} />
                                                        <span className="answers-option-text">{opt.text}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="answers-score">
                                    <span className="answers-score-correct">Правильных ответов {activeCourse.test.correct}/{activeCourse.test.total}</span>
                                    <span className="answers-score-wrong">Неправильных ответов {activeCourse.test.total - activeCourse.test.correct}/{activeCourse.test.total}</span>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            <div className="card-footer">
                <button className="btn btn-secondary" onClick={() => navigate(-1)}>Назад</button>
            </div>
        </div>
    );
};

export default AdminEditUserReportPage;
