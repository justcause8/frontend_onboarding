import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userService, type EmployeeReportDetail } from '../../services/user.service';
import { usePageTitle } from '../../contexts/PageTitleContext';
import LoadingSpinner from '../../components/loading/LoadingSpinner';
import ErrorState from '../../components/error/ErrorState';
import { StatCard, StatCardsGrid } from '../../components/statCard/StatCard';
import './AdminEditUserReportPage.css';

const STATUS_LABELS: Record<string, string> = {
    completed: 'Завершена',
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
            <section className="card user-report-header">
                <div className="user-report-info">
                    <h2>{report.fullName}</h2>
                    <div className="user-report-meta">
                        {report.department && <span className="sub-text">{report.department}</span>}
                        {report.position && <span className="sub-text">{report.position}</span>}
                        {report.routeTitle && <span className="sub-text">Маршрут: {report.routeTitle}</span>}
                    </div>
                </div>
                <span className={`status-table-badge status-${report.status}`}>
                    {STATUS_LABELS[report.status] ?? report.status}
                </span>
            </section>

            <section className="card">
                <h2>Прогресс адаптации</h2>
                <div className="user-report-progress">
                    <span className="user-report-percent">{report.completionPercent}%</span>
                    <div className="user-report-track">
                        <div className="user-report-fill" style={{ width: `${report.completionPercent}%` }} />
                    </div>
                </div>
                <div className="user-report-dates">
                    <span className="sub-text">Начало: {formatDate(report.startDate)}</span>
                    <span className="sub-text">Завершение: {formatDate(report.endDate)}</span>
                </div>
            </section>

            <section className="card">
                <h2>Показатели</h2>
                <StatCardsGrid>
                    <StatCard label="Курсов пройдено" value={`${report.completedCourses} / ${report.totalCourses}`} />
                    <StatCard label="Тестов пройдено" value={`${report.completedTests} / ${report.totalTests}`} />
                    <StatCard label="Заданий выполнено" value={`${report.completedTasks} / ${report.totalTasks}`} />
                    <StatCard label="Средний балл тестов" value={report.avgTestScore} />
                </StatCardsGrid>
            </section>

            <div className="card-footer">
                <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                    Назад
                </button>
            </div>
        </div>
    );
};

export default AdminEditUserReportPage;
