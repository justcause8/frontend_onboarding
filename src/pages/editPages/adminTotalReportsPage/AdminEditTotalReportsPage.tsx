import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import nextRight from '@/assets/icons/next-right.png';
import nextLeft from '@/assets/icons/next-left.png';
import { userService, type TotalReportsResponse, type EmployeeReportDetail } from '../../../services/user.service';
import { usePageTitle } from '../../../contexts/PageTitleContext';
import LoadingSpinner from '../../../components/loading/LoadingSpinner';
import ErrorState from '../../../components/error/ErrorState';
import searchIcon from '@/assets/icons/search.svg';
import { StatCard, StatDonutCard, StatCardsGrid } from '../../../components/statCard/StatCard';
import '../../editPages/adminMaterialsPage/AdminEditMaterialsPage.css';
import './AdminEditTotalReportsPage.css';
import '../../../components/adminTable/AdminTable.css';
import '../../employeesPage/EmployeesPage.css';

const STATUS_LABELS: Record<string, string> = {
    completed: 'Завершена',
    in_progress: 'В процессе',
    in_process: 'В процессе',
    not_started: 'Не начат',
    failed: 'Не пройдена',
};

const TotalReportsPage = () => {
    const { setDynamicTitle } = usePageTitle();
    const navigate = useNavigate();

    const [summary, setSummary] = useState<TotalReportsResponse | null>(null);
    const [employees, setEmployees] = useState<EmployeeReportDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [activeDept, setActiveDept] = useState<string | null>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const tabsRef = useRef<HTMLDivElement>(null);

    const updateScrollState = () => {
        const el = tabsRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 0);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };

    const scroll = (dir: 'left' | 'right') => {
        tabsRef.current?.scrollBy({ left: dir === 'right' ? 200 : -200, behavior: 'smooth' });
    };

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Загружаем сводку и список пользователей параллельно
            const [totalReport, users] = await Promise.all([
                userService.getTotalReport(),
                userService.getAllUsers(),
            ]);
            setSummary(totalReport);

            // Запрашиваем отчёт только для пользователей с ролью User
            const onboardingUsers = users.filter(u => u.role === 'User');
            const reports = await Promise.allSettled(
                onboardingUsers.map(u =>
                    userService.getEmployeeReport(u.id).then(r => ({ ...r, userUid: u.id }))
                )
            );

            const details: EmployeeReportDetail[] = reports
                .filter((r): r is PromiseFulfilledResult<EmployeeReportDetail> => r.status === 'fulfilled')
                .map(r => r.value);

            setEmployees(details);
        } catch {
            setError('Не удалось загрузить отчёт. Попробуйте позже.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setDynamicTitle('Отчёты по сотрудникам');
        loadData();
        return () => setDynamicTitle('');
    }, [setDynamicTitle, loadData]);

    useEffect(() => {
        updateScrollState();
        const el = tabsRef.current;
        if (!el) return;
        el.addEventListener('scroll', updateScrollState);
        const ro = new ResizeObserver(updateScrollState);
        ro.observe(el);
        return () => { el.removeEventListener('scroll', updateScrollState); ro.disconnect(); };
    }, [summary]);

    if (loading) return <LoadingSpinner />;
    if (error || !summary) return <ErrorState message={error ?? 'Нет данных'} onRetry={loadData} />;

    const filtered = employees.filter(e => {
        const matchSearch =
            e.fullName.toLowerCase().includes(search.toLowerCase()) ||
            (e.department || '').toLowerCase().includes(search.toLowerCase());
        const matchDept = activeDept === null || e.department === activeDept;
        return matchSearch && matchDept;
    });

    return (
        <div className="text">
            {/* Сводная статистика */}
            <section className="card page-section">
                <h2>Общая статистика</h2>
                <StatCardsGrid>
                    <StatCard label="Сотрудников на адаптации" value={summary.totalEmployees} />
                    <StatCard label="Завершили адаптацию" value={summary.passedCount} />
                    <StatCard label="В процессе" value={summary.inProgressCount} />
                    <StatDonutCard label="Средний балл тестов" value={summary.avgTestScore} />
                    <StatCard label="Среднее время (дней)" value={summary.avgDaysToComplete} />
                    <StatDonutCard label="Прогресс по модулям" value={`${summary.avgCoursesProgress}%`} />
                </StatCardsGrid>
            </section>

            {/* Таблица сотрудников */}
            <section className="card page-section employees-section">
                <div className="section-header">
                    <h2>Сотрудники</h2>
                    <div className="input-search-wrapper dept-search">
                        <input
                            className="input-field"
                            placeholder="Поиск..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <img src={searchIcon} alt="" className="input-search-icon" />
                    </div>
                </div>

                {summary.departments.length > 0 && (
                    <div className="department-tabs-wrapper">
                        {canScrollLeft && (
                            <button className="dept-scroll-btn" onClick={() => scroll('left')}>
                                <img src={nextLeft} alt="<-" />
                            </button>
                        )}
                        <div className="department-tabs" ref={tabsRef}>
                            <button
                                className={`dept-tab${activeDept === null ? ' dept-tab--active' : ''}`}
                                onClick={() => setActiveDept(null)}
                            >
                                Все
                            </button>
                            {summary.departments.map(dept => (
                                <button
                                    key={dept}
                                    className={`dept-tab${activeDept === dept ? ' dept-tab--active' : ''}`}
                                    onClick={() => setActiveDept(activeDept === dept ? null : dept)}
                                >
                                    {dept}
                                </button>
                            ))}
                        </div>
                        {canScrollRight && (
                            <button className="dept-scroll-btn" onClick={() => scroll('right')}>
                                <img src={nextRight} alt="->" />
                            </button>
                        )}
                    </div>
                )}

                <div className="users-table-scroll">
                    <table className="admin-table reports-table">
                        <thead>
                            <tr>
                                <th>ФИО</th>
                                <th>Отдел</th>
                                <th>План адаптации</th>
                                <th className="col-status">Статус</th>
                                <th>Прогресс</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5}>
                                        <p className="sub-text reports-empty">Данные не найдены</p>
                                    </td>
                                </tr>
                            ) : filtered.map(emp => (
                                <tr key={emp.userId} className="table-row-clickable" onClick={() => navigate(`/edit/total-reports/${emp.userUid}`)}>
                                    <td><div className="main-text">{emp.fullName}</div></td>
                                    <td><span className="sub-text">{emp.department || '—'}</span></td>
                                    <td><span className="sub-text">{emp.routeTitle || '—'}</span></td>
                                    <td className="col-status">
                                        <span className={`badge ${emp.status === 'completed' ? 'badge--success' : emp.status === 'failed' ? 'badge--danger' : emp.status === 'in_progress' || emp.status === 'in_process' ? 'badge--warning' : 'badge--neutral'}`}>
                                            {STATUS_LABELS[emp.status] ?? emp.status}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="badge">{emp.completionPercent}%</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default TotalReportsPage;
