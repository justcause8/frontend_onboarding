import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../../../../contexts/PageTitleContext';
import { taskService, type OnboardingTask, type TaskSubmission } from '../../../../services/task.service';
import { userService, type UserShort } from '../../../../services/user.service';
import LoadingSpinner from '../../../../components/loading/LoadingSpinner';
import { AdminTable } from '../../../../components/adminTable/AdminTable';
import { ActionMenu, ActionMenuItem, ICONS } from '../../../../components/actionMenu/ActionMenu';
import { MarkdownEditor, MarkdownViewer } from '../../../../components/markdownEditor/MarkdownEditor';
import { stripMarkdown } from '../../../../utils/markdownUtils';
import { getFileIcon, extractFileNameFromUrl } from '../../../../utils/fileUtils';
import searchIcon from '@/assets/icons/search.svg';
import downIcon from '@/assets/editMode/DownIcon.png';
import '../../AdminUserReportsPage/AdminEditUserReportPage.css';
import '../../../materialsPage/MaterialsPage.css';
import './AdminOnboardingTasks.css';

type Tab = 'list' | 'review';

interface SubmissionWithTask extends TaskSubmission {
    task: OnboardingTask;
    userName?: string;
    userDepartment?: string;
    userId?: number;
}

interface UserWithSubmissions {
    user: UserShort;
    submissions: SubmissionWithTask[];
}

interface DepartmentGroup {
    department: string;
    users: UserWithSubmissions[];
}

const formatDateTime = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '—';
    const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const subStatusBadge = (status: string) =>
    status === 'approved' ? 'badge badge--success'
    : status === 'rejected' ? 'badge badge--danger'
    : 'badge badge--warning';

const subStatusLabel = (status: string) =>
    status === 'approved' ? 'Принято'
    : status === 'rejected' ? 'Не принято'
    : 'На проверке';

const AdminOnboardingTasks = () => {
    const { setDynamicTitle } = usePageTitle();
    const navigate = useNavigate();

    const [searchParams] = useSearchParams();
    const [tab, setTab] = useState<Tab>(() =>
        searchParams.get('tab') === 'review' ? 'review' : 'list'
    );

    // --- Список заданий ---
    const [tasks, setTasks] = useState<OnboardingTask[]>([]);
    const [loading, setLoading] = useState(true);

    // --- Проверка ответов ---
    const [departments, setDepartments] = useState<DepartmentGroup[]>([]);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [reviewLoaded, setReviewLoaded] = useState(false);
    const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [activeSubmission, setActiveSubmission] = useState<SubmissionWithTask | null>(null);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewSaving, setReviewSaving] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'submitted' | 'approved' | 'rejected' | 'all'>('submitted');
    const [userSearch, setUserSearch] = useState('');

    useEffect(() => {
        setDynamicTitle('Задания');
        taskService.getAllTasks()
            .then(data => setTasks(data))
            .catch(() => {})
            .finally(() => setLoading(false));
        return () => setDynamicTitle('');
    }, [setDynamicTitle]);

    const loadReview = async (autoUserId?: number) => {
        setReviewLoading(true);
        try {
            const [allTasks, allUsers] = await Promise.all([
                tasks.length > 0 ? Promise.resolve(tasks) : taskService.getAllTasks(),
                userService.getAllUsers(),
            ]);

            const userMap: Record<number, UserShort> = {};
            allUsers.forEach(u => {
                const id = u.numericId ?? Number(u.id);
                if (!isNaN(id)) userMap[id] = u;
            });

            const results = await Promise.allSettled(
                allTasks.map(t =>
                    taskService.getSubmissionsByTask(t.id).then(subs =>
                        subs.map(s => {
                            const user = s.fkUserId ? userMap[s.fkUserId] : undefined;
                            return {
                                ...s,
                                task: t,
                                userName: user?.fullName,
                                userDepartment: user?.department,
                                userId: s.fkUserId,
                            } as SubmissionWithTask;
                        })
                    )
                )
            );

            const flat: SubmissionWithTask[] = [];
            results.forEach(r => { if (r.status === 'fulfilled') flat.push(...r.value); });

            // Группируем: отдел → пользователи → ответы
            const deptMap: Record<string, Record<number, { user: UserShort; subs: SubmissionWithTask[] }>> = {};
            flat.forEach(s => {
                const dept = s.userDepartment || 'Без отдела';
                const uid = s.userId ?? 0;
                if (!deptMap[dept]) deptMap[dept] = {};
                if (!deptMap[dept][uid]) {
                    const user = uid && userMap[uid] ? userMap[uid] : { id: String(uid), fullName: s.userName || 'Неизвестный', position: '' };
                    deptMap[dept][uid] = { user, subs: [] };
                }
                deptMap[dept][uid].subs.push(s);
            });

            const grouped: DepartmentGroup[] = Object.entries(deptMap)
                .sort(([a], [b]) => a.localeCompare(b, 'ru'))
                .map(([department, usersMap]) => ({
                    department,
                    users: Object.values(usersMap)
                        .sort((a, b) => a.user.fullName.localeCompare(b.user.fullName, 'ru'))
                        .map(({ user, subs }) => ({ user, submissions: subs })),
                }));

            setDepartments(grouped);

            // Авто-открыть нужного сотрудника
            const targetId = autoUserId ?? (searchParams.get('userId') ? Number(searchParams.get('userId')) : null);
            if (targetId) {
                // Найти отдел этого сотрудника и раскрыть его
                for (const dept of grouped) {
                    const found = dept.users.find(u => {
                        const id = (u.user.numericId ?? Number(u.user.id));
                        return id === targetId;
                    });
                    if (found) {
                        setExpandedDepts(new Set([dept.department]));
                        setSelectedUserId(targetId);
                        // Выбрать первый pending ответ этого пользователя
                        const pending = found.submissions.find(s => s.status === 'submitted') ?? found.submissions[0] ?? null;
                        if (pending) setActiveSubmission(pending);
                        break;
                    }
                }
            } else {
                // По умолчанию открыть первый отдел
                if (grouped.length > 0) {
                    setExpandedDepts(new Set([grouped[0].department]));
                }
            }

            setReviewLoaded(true);
        } catch {
        } finally {
            setReviewLoading(false);
        }
    };

    useEffect(() => {
        if (tab === 'review' && !reviewLoaded) {
            loadReview();
        }
    }, [tab]);

    useEffect(() => {
        if (!activeSubmission) return;
        const clean = activeSubmission.mentorComment
            ?.split('\n').filter(l => !l.startsWith('[Файл от проверяющего]:')).join('\n').trim() ?? '';
        setReviewComment(clean);
    }, [activeSubmission]);

    const handleStatusChange = async (id: number, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
            const task = tasks.find(t => t.id === id)!;
            await taskService.updateTask(id, {
                description: task.description,
                taskType: task.taskType,
                status: newStatus,
            });
            setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus as 'active' | 'inactive' } : t));
        } catch {
            alert('Не удалось изменить статус задания');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Удалить задание?')) return;
        try {
            await taskService.deleteTask(id);
            setTasks(prev => prev.filter(t => t.id !== id));
        } catch {
            alert('Не удалось удалить задание');
        }
    };

    const handleReview = async (status: 'approved' | 'rejected') => {
        if (!activeSubmission) return;
        setReviewSaving(true);
        try {
            await taskService.reviewSubmission(activeSubmission.id, {
                mentorComment: reviewComment,
                status,
            });
            const updated: SubmissionWithTask = { ...activeSubmission, status, mentorComment: reviewComment, updatedAt: new Date().toISOString() };
            setDepartments(prev => prev.map(dept => ({
                ...dept,
                users: dept.users.map(u => ({
                    ...u,
                    submissions: u.submissions.map(s => s.id === activeSubmission.id ? updated : s),
                })),
            })));
            setActiveSubmission(updated);
        } catch {
            alert('Ошибка при сохранении');
        } finally {
            setReviewSaving(false);
        }
    };

    const toggleDept = (dept: string) => {
        setExpandedDepts(prev => {
            const next = new Set(prev);
            if (next.has(dept)) next.delete(dept);
            else next.add(dept);
            return next;
        });
    };

    const columns = [
        { header: 'Описание', width: '50%' },
        { header: 'Тип', width: '20%' },
        { header: 'Статус', width: '20%' },
        { header: '', width: '10%' },
    ];

    const pendingCount = departments.flatMap(d => d.users.flatMap(u => u.submissions)).filter(s => s.status === 'submitted').length;

    // Получить ответы выбранного пользователя с фильтром
    const selectedUserSubs: SubmissionWithTask[] = selectedUserId
        ? departments.flatMap(d => d.users)
            .find(u => (u.user.numericId ?? Number(u.user.id)) === selectedUserId)
            ?.submissions.filter(s => filterStatus === 'all' || s.status === filterStatus) ?? []
        : [];

    return (
        <div className="text">
            {/* Вкладки */}
            <div className="review-tabs-bar">
                <button
                    className={`review-tab${tab === 'list' ? ' review-tab--active' : ''}`}
                    onClick={() => setTab('list')}
                >
                    Список заданий
                </button>
                <button
                    className={`review-tab${tab === 'review' ? ' review-tab--active' : ''}`}
                    onClick={() => setTab('review')}
                >
                    Проверка ответов
                    {pendingCount > 0 && (
                        <span className="count-badge review-tab-count">{pendingCount}</span>
                    )}
                </button>
            </div>

            {/* === Список заданий === */}
            {tab === 'list' && (
                <div className="card">
                    {loading ? <LoadingSpinner /> : (
                        <>
                            <button
                                className="btn btn-primary create-btn"
                                onClick={() => navigate('/edit/tasks/new')}
                            >
                                Добавить задание
                            </button>
                            <AdminTable
                                columns={columns}
                                data={tasks}
                                emptyText="Задания не найдены"
                                renderRow={(task) => (
                                    <tr key={task.id} className={task.status === 'inactive' ? 'row-archived' : ''}>
                                        <td><span className="route-title">{stripMarkdown(task.description)}</span></td>
                                        <td>{task.taskType === 'general' ? 'Общее' : 'Индивидуальное'}</td>
                                        <td>
                                            <span className={task.status === 'active' ? 'badge badge--success' : 'badge badge--neutral'}>
                                                {task.status === 'active' ? 'Открыт' : 'Закрыт'}
                                            </span>
                                        </td>
                                        <td className="action-cell">
                                            <ActionMenu>
                                                <ActionMenuItem
                                                    icon={task.status === 'active' ? ICONS.lock : ICONS.unlock}
                                                    label={task.status === 'active' ? 'Закрыть' : 'Открыть'}
                                                    onClick={() => handleStatusChange(task.id, task.status)}
                                                />
                                                <ActionMenuItem
                                                    icon={ICONS.edit}
                                                    label="Редактировать"
                                                    onClick={() => navigate(`/edit/tasks/${task.id}`)}
                                                />
                                                <ActionMenuItem
                                                    icon={ICONS.delete}
                                                    label="Удалить"
                                                    className="delete"
                                                    onClick={() => handleDelete(task.id)}
                                                />
                                            </ActionMenu>
                                        </td>
                                    </tr>
                                )}
                            />
                        </>
                    )}
                </div>
            )}

            {/* === Проверка ответов === */}
            {tab === 'review' && (
                <div className="card answers-card">
                    {/* Фильтр по статусу */}
                    <div className="department-tabs-wrapper" style={{ marginBottom: '16px' }}>
                        <div className="department-tabs">
                            {(['submitted', 'approved', 'rejected', 'all'] as const).map(s => (
                                <button
                                    key={s}
                                    className={`dept-tab${filterStatus === s ? ' dept-tab--active' : ''}`}
                                    onClick={() => { setFilterStatus(s); setActiveSubmission(null); setSelectedUserId(null); }}
                                >
                                    {s === 'submitted' ? 'На проверке' : s === 'approved' ? 'Принято' : s === 'rejected' ? 'Не принято' : 'Все'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {reviewLoading && <LoadingSpinner />}

                    {!reviewLoading && (
                        <>
                            {/* Поиск */}
                            <div className="section-header" style={{ marginBottom: '12px' }}>
                                <h2>Сотрудники</h2>
                                <div className="input-search-wrapper">
                                    <input
                                        className="input-field"
                                        placeholder="Поиск по сотруднику..."
                                        value={userSearch}
                                        onChange={e => { setUserSearch(e.target.value); setSelectedUserId(null); setActiveSubmission(null); }}
                                    />
                                    <img src={searchIcon} alt="" className="input-search-icon" />
                                </div>
                            </div>

                            {/* Отделы как dept-tab */}
                            {departments.filter(d =>
                                d.users.some(u =>
                                    u.submissions.some(s => filterStatus === 'all' || s.status === filterStatus) &&
                                    u.user.fullName.toLowerCase().includes(userSearch.toLowerCase())
                                )
                            ).length === 0 && (
                                <p className="answers-empty">Ответов нет</p>
                            )}

                            {departments.map(dept => {
                                const visibleUsers = dept.users.filter(u =>
                                    u.submissions.some(s => filterStatus === 'all' || s.status === filterStatus) &&
                                    u.user.fullName.toLowerCase().includes(userSearch.toLowerCase())
                                );
                                if (visibleUsers.length === 0) return null;
                                const isDeptOpen = expandedDepts.has(dept.department);

                                return (
                                    <div key={dept.department} style={{ marginBottom: '8px' }}>
                                        {/* Вкладка отдела */}
                                        <div className="department-tabs-wrapper" style={{ marginBottom: isDeptOpen ? '10px' : '0' }}>
                                            <div className="department-tabs">
                                                <button
                                                    className={`dept-tab${isDeptOpen ? ' dept-tab--active' : ''}`}
                                                    onClick={() => toggleDept(dept.department)}
                                                >
                                                    {dept.department}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Сотрудники отдела — каждый раскрывается inline */}
                                        {isDeptOpen && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {visibleUsers.map(u => {
                                                    const uid = u.user.numericId ?? Number(u.user.id);
                                                    const isExpanded = selectedUserId === uid;
                                                    const userSubs = u.submissions.filter(s => filterStatus === 'all' || s.status === filterStatus);
                                                    const pendingCount = u.submissions.filter(s => s.status === 'submitted').length;

                                                    return (
                                                        <div key={uid} className="review-user-row">
                                                            {/* Строка сотрудника */}
                                                            <button
                                                                className={`review-user-row-btn${isExpanded ? ' review-user-row-btn--open' : ''}`}
                                                                onClick={() => { setSelectedUserId(isExpanded ? null : uid); setActiveSubmission(null); }}
                                                            >
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                                                                    <span className="review-user-row-name">{u.user.fullName}</span>
                                                                    {u.user.position && (
                                                                        <span className="review-user-row-pos">{u.user.position}</span>
                                                                    )}
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>

                                                                    
                                                                    <span className={`search-arrow ${isExpanded ? 'open' : ''}`} style={{ position: 'static', transform: 'none' }}>
                                                                        <img 
                                                                            src={downIcon}
                                                                            alt="" 
                                                                            className="search-dropdown" 
                                                                        />
                                                                    </span>
                                                                </div>
                                                            </button>

                                                            {/* Задания сотрудника */}
                                                            {isExpanded && (
                                                                <>
                                                                    {userSubs.map(s => {
                                                                        const isActive = activeSubmission?.id === s.id;
                                                                        return (
                                                                            <button
                                                                                key={s.id}
                                                                                className={`task-attempt-btn${isActive ? ' task-attempt-btn--active' : ''}`}
                                                                                onClick={() => setActiveSubmission(isActive ? null : s)}
                                                                            >
                                                                                <span className="task-title-truncated">{stripMarkdown(s.task.description)}</span>
                                                                                <div className="task-attempt-meta">
                                                                                    <span className="meta-item meta-item--white" style={{ fontSize: '11px' }}>
                                                                                        {s.task.taskType === 'general' ? 'Общее' : 'Индивидуальное'}
                                                                                    </span>
                                                                                    <span className={`${subStatusBadge(s.status)} task-status-badge`}>{subStatusLabel(s.status)}</span>
                                                                                </div>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Детальная панель выбранного задания */}
                            {activeSubmission && (() => {
                                            const mentorFileLine = activeSubmission.mentorComment?.split('\n').find(l => l.startsWith('[Файл от проверяющего]:'));
                                            const mentorFileUrl = mentorFileLine ? mentorFileLine.replace('[Файл от проверяющего]:', '').trim() : null;
                                            const cleanMentorComment = activeSubmission.mentorComment
                                                ?.split('\n').filter(l => !l.startsWith('[Файл от проверяющего]:')).join('\n').trim() ?? null;

                                            return (
                                                <div className="answers-test-block task-detail-block" style={{ marginTop: '12px' }}>
                                                    <div className="answers-test-header">
                                                        <div>
                                                            <h4 className="answers-test-title">{stripMarkdown(activeSubmission.task.description)}</h4>
                                                            <div className="task-accordion-meta">
                                                                {activeSubmission.userName && (
                                                                    <span className="meta-item meta-item--white">{activeSubmission.userName}</span>
                                                                )}
                                                                {activeSubmission.createdAt && (
                                                                    <span className="text-info">Отправлено: {formatDateTime(activeSubmission.createdAt)}</span>
                                                                )}
                                                                {activeSubmission.updatedAt && (
                                                                    <span className="text-info">Изменено: {formatDateTime(activeSubmission.updatedAt)}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className={`${subStatusBadge(activeSubmission.status)} badge badge--success`}>
                                                            {subStatusLabel(activeSubmission.status)}
                                                        </span>
                                                    </div>

                                                    {activeSubmission.answerText && (
                                                        <div className="input-item">
                                                            <h4>Ответ сотрудника</h4>
                                                            <textarea
                                                                className="textarea-field task-readonly-textarea"
                                                                value={activeSubmission.answerText}
                                                                readOnly
                                                                rows={3}
                                                            />
                                                        </div>
                                                    )}

                                                    {activeSubmission.fileUrl && (
                                                        <div className="task-file-block">
                                                            <h4>Файл сотрудника</h4>
                                                            <a href={activeSubmission.fileUrl} target="_blank" rel="noopener noreferrer" download className="card-item material-item">
                                                                <div className="material-content">
                                                                    <p className="task-file-name">{extractFileNameFromUrl(activeSubmission.fileUrl)}</p>
                                                                    <img src={getFileIcon(activeSubmission.fileUrl, false)} alt="" />
                                                                </div>
                                                            </a>
                                                        </div>
                                                    )}

                                                    {!activeSubmission.answerText && !activeSubmission.fileUrl && (
                                                        <p className="answers-empty">Ответ пуст</p>
                                                    )}

                                                    <hr className="task-divider" />

                                                    {(cleanMentorComment || mentorFileUrl) && (
                                                        <div className="task-mentor-prev">
                                                            <h4>Предыдущий комментарий</h4>
                                                            {cleanMentorComment && (
                                                                <MarkdownViewer 
                                                                    content={cleanMentorComment} 
                                                                    className="task-mentor-comment" 
                                                                />
                                                            )}
                                                            {mentorFileUrl && (
                                                                <a href={mentorFileUrl} target="_blank" rel="noopener noreferrer" download className="card-item material-item">
                                                                    <div className="material-content">
                                                                        <p className="task-file-name">{extractFileNameFromUrl(mentorFileUrl)}</p>
                                                                        <img src={getFileIcon(mentorFileUrl, false)} alt="" />
                                                                    </div>
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="input-item">
                                                        <h4>Комментарий</h4>
                                                        <MarkdownEditor
                                                            value={reviewComment}
                                                            onChange={setReviewComment}
                                                            placeholder="Введите комментарий..."
                                                            minHeight="80px"
                                                            className="md-editor--white"
                                                        />
                                                    </div>

                                                    <div className="task-review-actions">
                                                        <button
                                                            className="btn btn-secondary"
                                                            disabled={reviewSaving}
                                                            onClick={() => handleReview('rejected')}
                                                        >
                                                            Отправить на доработку
                                                        </button>
                                                        <button
                                                            className="btn btn-primary"
                                                            disabled={reviewSaving}
                                                            onClick={() => handleReview('approved')}
                                                        >
                                                            Принять
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminOnboardingTasks;
