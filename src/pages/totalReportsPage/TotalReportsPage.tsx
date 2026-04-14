import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService, type TotalReportsResponse } from '../../services/user.service';
import { usePageTitle } from '../../contexts/PageTitleContext';
import LoadingSpinner from '../../components/loading/LoadingSpinner';
import ErrorState from '../../components/error/ErrorState';
import searchIcon from '@/assets/search.svg';
import { StatCard, StatCardsGrid } from '../../components/statCard/StatCard';
import '../editPages/adminMaterialsPage/AdminEditMaterialsPage.css';
import './TotalReportsPage.css';
import '../employeesPage/EmployeesPage.css';

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

    const [data, setData] = useState<TotalReportsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [activeDept, setActiveDept] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await userService.getTotalReport();
            setData(result);
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

    if (loading) return <LoadingSpinner />;
    if (error || !data) return <ErrorState message={error ?? 'Нет данных'} onRetry={loadData} />;

    const filtered = data.employees.filter(e => {
        const matchSearch =
            e.fullName.toLowerCase().includes(search.toLowerCase()) ||
            (e.department || '').toLowerCase().includes(search.toLowerCase()) ||
            (e.position || '').toLowerCase().includes(search.toLowerCase());
        const matchDept = activeDept === null || e.department === activeDept;
        return matchSearch && matchDept;
    });

    return (
        <div className="text">
            {/* Сводная статистика */}
            <section className="card">
                <h2>Общая статистика</h2>
                <StatCardsGrid>
                    <StatCard label="Сотрудников на адаптации" value={data.totalEmployees} />
                    <StatCard label="Завершили адаптацию" value={data.passedCount} />
                    <StatCard label="В процессе" value={data.inProgressCount} />
                    <StatCard label="Средний балл тестов" value={data.avgTestScore} />
                    <StatCard label="Среднее время (дней)" value={data.avgDaysToComplete} />
                    <StatCard label="Прогресс по курсам" value={`${data.avgCoursesProgress}%`} />
                </StatCardsGrid>
            </section>

            {/* Таблица сотрудников */}
            <section className="card employees-section">
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

                {data.departments.length > 0 && (
                    <div className="reports-dept-tabs">
                        <button
                            className={`dept-tab${activeDept === null ? ' dept-tab--active' : ''}`}
                            onClick={() => setActiveDept(null)}
                        >
                            Все
                        </button>
                        {data.departments.map(dept => (
                            <button
                                key={dept}
                                className={`dept-tab${activeDept === dept ? ' dept-tab--active' : ''}`}
                                onClick={() => setActiveDept(activeDept === dept ? null : dept)}
                            >
                                {dept}
                            </button>
                        ))}
                    </div>
                )}

                <div className="users-table-scroll">
                    <table className="admin-table reports-table">
                        <thead>
                            <tr>
                                <th>ФИО</th>
                                <th>Отдел</th>
                                <th>Должность</th>
                                <th>Маршрут</th>
                                <th className="col-status">Статус</th>
                                <th>Курсов пройдено</th>
                                <th>Прогресс</th>
                                <th>Ср. балл</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8}>
                                        <p className="sub-text reports-empty">Данные не найдены</p>
                                    </td>
                                </tr>
                            ) : filtered.map(emp => (
                                <tr key={emp.userId}>
                                    <td><div className="main-text">{emp.fullName}</div></td>
                                    <td><span className="sub-text">{emp.department || '—'}</span></td>
                                    <td><span className="sub-text">{emp.position || '—'}</span></td>
                                    <td><span className="sub-text">{emp.routeTitle || '—'}</span></td>
                                    <td className="col-status">
                                        <span className={`status-table-badge status-${emp.status}`}>
                                            {STATUS_LABELS[emp.status] ?? emp.status}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="sub-text">{emp.completedCourses} из {emp.totalCourses}</span>
                                    </td>
                                    <td>
                                        <span className="category-badge">{emp.percentCourses}%</span>
                                    </td>
                                    <td>
                                        <span className="sub-text">{emp.avgTestScore > 0 ? emp.avgTestScore : '—'}</span>
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
