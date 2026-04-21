import { useEffect, useState } from 'react';
import { taskService, type OnboardingTask, type TaskSubmission } from '../../services/task.service';
import { usePageTitle } from '../../contexts/PageTitleContext';
import LoadingSpinner from '../../components/loading/LoadingSpinner';
import EmptyState from '../../components/empty/EmptyState';
import { stripMarkdown } from '../../utils/markdownUtils';
import { getFileIcon, extractFileNameFromUrl } from '../../utils/fileUtils';
import './OnboardingTaskPage.css';

const STATUS_LABELS: Record<string, string> = {
    pending: 'На проверке',
    approved: 'Принято',
    rejected: 'Не принято',
};

const statusBadgeClass = (status: string) => {
    if (status === 'approved') return 'badge badge--success';
    if (status === 'rejected') return 'badge badge--danger';
    return 'badge badge--warning';
};

const formatDateTime = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '—';
    const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const UserOnboardingTasksPage = () => {
    const { setDynamicTitle } = usePageTitle();

    const [tasks, setTasks] = useState<OnboardingTask[]>([]);
    const [submissions, setSubmissions] = useState<Record<number, TaskSubmission | null>>({});
    const [loading, setLoading] = useState(true);
    const [activeTask, setActiveTask] = useState<OnboardingTask | null>(null);

    // form state
    const [answerText, setAnswerText] = useState('');
    const [fileUrl, setFileUrl] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setDynamicTitle('Задания');
        return () => setDynamicTitle('');
    }, [setDynamicTitle]);

    const loadAll = async () => {
        try {
            const allTasks = await taskService.getUserTasks();
            setTasks(allTasks);
            const subEntries = await Promise.all(
                allTasks.map(async t => {
                    try {
                        const subs = await taskService.getSubmissionsByTask(t.id);
                        return [t.id, subs.length > 0 ? subs[subs.length - 1] : null] as const;
                    } catch {
                        return [t.id, null] as const;
                    }
                })
            );
            setSubmissions(Object.fromEntries(subEntries));
        } catch {
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAll(); }, []);

    useEffect(() => {
        if (!activeTask) return;
        const sub = submissions[activeTask.id];
        setAnswerText(sub?.answerText ?? '');
        setFileUrl(sub?.fileUrl ?? '');
        setEditMode(false);
    }, [activeTask]);

    const handleSubmit = async () => {
        if (!activeTask) return;
        setSaving(true);
        try {
            const sub = submissions[activeTask.id];
            if (sub) {
                await taskService.updateSubmissionAnswer(sub.id, {
                    answerText: answerText || '',
                    fileUrl: fileUrl || null,
                });
            } else {
                await taskService.createSubmission({
                    fkTaskId: activeTask.id,
                    answerText: answerText || null,
                    fileUrl: fileUrl || null,
                });
            }
            setEditMode(false);
            // Reload submissions for this task
            const subs = await taskService.getSubmissionsByTask(activeTask.id);
            const newSub = subs.length > 0 ? subs[subs.length - 1] : null;
            setSubmissions(prev => ({ ...prev, [activeTask.id]: newSub }));
        } catch {
            alert('Ошибка при сохранении ответа');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!activeTask) return;
        const sub = submissions[activeTask.id];
        if (!sub) return;
        if (!window.confirm('Удалить ответ?')) return;
        setSaving(true);
        try {
            await taskService.deleteSubmission(sub.id);
            setSubmissions(prev => ({ ...prev, [activeTask.id]: null }));
            setAnswerText('');
            setFileUrl('');
            setEditMode(false);
        } catch {
            alert('Ошибка при удалении');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    if (tasks.length === 0) return (
        <EmptyState
            title="Заданий нет"
            description="Вам пока не назначено ни одного задания."
        />
    );

    const activeSub = activeTask ? submissions[activeTask.id] : null;

    const renderTaskBtn = (task: OnboardingTask) => {
        const sub = submissions[task.id];
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
    };

    const activeTasks = tasks.filter(t => t.status === 'active');
    const inactiveTasks = tasks.filter(t => t.status !== 'active');

    return (
        <div className="text">
            <div className="card answers-card">
                <div className="answers-attempts-list">
                    {activeTasks.map(renderTaskBtn)}
                    {inactiveTasks.length > 0 && activeTasks.length > 0 && (
                        <p className="answers-empty" style={{ fontSize: '13px', margin: '8px 0 4px' }}>Закрытые задания</p>
                    )}
                    {inactiveTasks.map(renderTaskBtn)}
                </div>

                {activeTask && (
                    <div className="answers-test-block task-detail-block">
                        <div className="answers-test-header">
                            <div>
                                <h4 className="answers-test-title">{stripMarkdown(activeTask.description)}</h4>
                                <div className="task-accordion-meta">
                                    {activeSub?.updatedAt && (
                                        <span className="text-info">Изменено: {formatDateTime(activeSub.updatedAt)}</span>
                                    )}
                                </div>
                            </div>
                            {activeSub && (
                                <span className={`${statusBadgeClass(activeSub.status)} task-status-badge`}>
                                    {STATUS_LABELS[activeSub.status] ?? activeSub.status}
                                </span>
                            )}
                        </div>

                        {/* Комментарий проверяющего */}
                        {activeSub && activeSub.mentorComment && (
                            <div className="task-mentor-prev">
                                <h4>Комментарий проверяющего</h4>
                                <p className="task-mentor-comment">
                                    {activeSub.mentorComment.split('\n').filter(l => !l.startsWith('[Файл от проверяющего]:')).join('\n').trim()}
                                </p>
                                {(() => {
                                    const fileLine = activeSub.mentorComment.split('\n').find(l => l.startsWith('[Файл от проверяющего]:'));
                                    const url = fileLine ? fileLine.replace('[Файл от проверяющего]:', '').trim() : null;
                                    return url ? (
                                        <a href={url} target="_blank" rel="noopener noreferrer" download className="card-item material-item">
                                            <div className="material-content">
                                                <p className="task-file-name">{extractFileNameFromUrl(url)}</p>
                                                <img src={getFileIcon(url, false)} alt="" />
                                            </div>
                                        </a>
                                    ) : null;
                                })()}
                            </div>
                        )}

                        <hr className="task-divider" />

                        {/* Мой ответ */}
                        <div className="section-header" style={{ marginBottom: '12px' }}>
                            <h4>Мой ответ</h4>
                            {activeSub && !editMode && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="btn btn-secondary" onClick={() => setEditMode(true)}>Изменить</button>
                                    <button className="btn btn-secondary" onClick={handleDelete} disabled={saving}>Удалить</button>
                                </div>
                            )}
                        </div>

                        {!activeSub && !editMode && (
                            <div className="task-empty-answer">
                                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '12px' }}>
                                    Вы ещё не отправили ответ на это задание.
                                </p>
                                <button className="btn btn-primary" onClick={() => setEditMode(true)}>Ответить</button>
                            </div>
                        )}

                        {activeSub && !editMode && (
                            <div className="task-answer-view">
                                {activeSub.answerText && (
                                    <div className="task-answer-block">
                                        <span className="meta-item" style={{ marginBottom: '8px', display: 'inline-block' }}>Текстовый ответ</span>
                                        <p className="task-answer-text">{activeSub.answerText}</p>
                                    </div>
                                )}
                                {activeSub.fileUrl && (
                                    <div className="task-file-block">
                                        <a href={activeSub.fileUrl} target="_blank" rel="noopener noreferrer" download className="card-item material-item">
                                            <div className="material-content">
                                                <p className="task-file-name">{extractFileNameFromUrl(activeSub.fileUrl)}</p>
                                                <img src={getFileIcon(activeSub.fileUrl, false)} alt="" />
                                            </div>
                                        </a>
                                    </div>
                                )}
                                {!activeSub.answerText && !activeSub.fileUrl && (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Ответ пуст</p>
                                )}
                            </div>
                        )}

                        {editMode && (
                            <div className="task-answer-form">
                                <div className="input-item">
                                    <h4>Текстовый ответ</h4>
                                    <textarea
                                        className="textarea-field"
                                        placeholder="Введите ваш ответ..."
                                        value={answerText}
                                        onChange={e => setAnswerText(e.target.value)}
                                        rows={5}
                                    />
                                </div>
                                <div className="input-item">
                                    <h4>Ссылка на файл (необязательно)</h4>
                                    <input
                                        className="input-field"
                                        placeholder="https://..."
                                        value={fileUrl}
                                        onChange={e => setFileUrl(e.target.value)}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                                        {saving ? 'Сохранение...' : 'Отправить'}
                                    </button>
                                    <button className="btn btn-secondary" onClick={() => {
                                        setEditMode(false);
                                        setAnswerText(activeSub?.answerText ?? '');
                                        setFileUrl(activeSub?.fileUrl ?? '');
                                    }}>
                                        Отмена
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserOnboardingTasksPage;
