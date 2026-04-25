import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { taskService, type OnboardingTask, type TaskSubmission } from '../../services/task.service';
import { usePageTitle } from '../../contexts/PageTitleContext';
import LoadingSpinner from '../../components/loading/LoadingSpinner';
import EmptyState from '../../components/empty/EmptyState';
import { stripMarkdown } from '../../utils/markdownUtils';
import { getFileIcon, extractFileNameFromUrl } from '../../utils/fileUtils';
import { materialService } from '../../services/material.service';
import { MarkdownEditor, MarkdownViewer } from '../../components/markdownEditor/MarkdownEditor';
import cross from '@/assets/icons/cross.png';
import './UserOnboardingTasksPage.css';

const STATUS_LABELS: Record<string, string> = {
    pending: 'На проверке',
    submitted: 'На проверке',
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
    const location = useLocation();

    const [tasks, setTasks] = useState<OnboardingTask[]>([]);
    const [submissions, setSubmissions] = useState<Record<number, TaskSubmission | null>>({});
    const [loading, setLoading] = useState(true);
    const [activeTask, setActiveTask] = useState<OnboardingTask | null>(null);

    // form state
    const [answerText, setAnswerText] = useState('');
    const [fileUrl, setFileUrl] = useState('');
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPendingFile(file);
        setFileUrl('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

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
        const taskId = (location.state as any)?.taskId;
        if (taskId && tasks.length > 0) {
            const found = tasks.find(t => t.id === taskId);
            if (found) setActiveTask(found);
        }
    }, [tasks, location.state]);

    useEffect(() => {
        if (!activeTask) return;
        const sub = submissions[activeTask.id];
        setAnswerText(sub?.answerText ?? '');
        setFileUrl(sub?.fileUrl ?? '');
        setPendingFile(null);
        setEditMode(false);
    }, [activeTask]);

    const handleSubmit = async () => {
        if (!activeTask) return;
        setSaving(true);
        try {
            let resolvedFileUrl = fileUrl || null;
            if (pendingFile) {
                const res = await materialService.uploadFile(pendingFile, 'Onbording/Tasks');
                resolvedFileUrl = materialService.getFileUrl(res.relativePath);
                setPendingFile(null);
            }

            const sub = submissions[activeTask.id];
            if (sub) {
                await taskService.updateSubmissionAnswer(sub.id, {
                    answerText: answerText || '',
                    fileUrl: resolvedFileUrl,
                });
            } else {
                await taskService.createSubmission({
                    fkTaskId: activeTask.id,
                    answerText: answerText || null,
                    fileUrl: resolvedFileUrl,
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
            <section className="card page-section">
                <h2>Мои задания</h2>
                <div className="answers-attempts-list">
                    {activeTasks.map(renderTaskBtn)}
                    {inactiveTasks.length > 0 && activeTasks.length > 0 && (
                        <p className="answers-empty tasks-section-label">Закрытые задания</p>
                    )}
                    {inactiveTasks.map(renderTaskBtn)}
                </div>
            </section>

            {activeTask && (
                <section className="card">
                    <div className="answers-test-block">
                        <div className="answers-test-header">
                            <div>
                                <MarkdownViewer content={activeTask.description} className="answers-test-title" />
                                <div className="task-accordion-meta">
                                    {activeSub?.createdAt && (
                                        <span className="text-info">Отправлено: {formatDateTime(activeSub.createdAt)}</span>
                                    )}
                                    {activeSub?.updatedAt && (
                                        <span className="text-info">Изменено: {formatDateTime(activeSub.updatedAt)}</span>
                                    )}
                                </div>
                            </div>
                            {activeSub && (
                                <span className={statusBadgeClass(activeSub.status)}>
                                    {STATUS_LABELS[activeSub.status] ?? activeSub.status}
                                </span>
                            )}
                        </div>

                        {activeSub?.mentorComment && (
                            <div className="task-mentor-prev">
                                <h4>Комментарий проверяющего</h4>
                                <div className="input-field"><MarkdownViewer content={activeSub.mentorComment} /></div>
                            </div>
                        )}

                        <hr className="task-divider" />

                        {activeSub?.answerText && !editMode && (
                            <div className="input-item">
                                <h4>Мой ответ</h4>
                                <div className="input-field"><MarkdownViewer content={activeSub.answerText} /></div>
                            </div>
                        )}

                        {activeSub?.fileUrl && !editMode && (
                            <div className="task-file-block">
                                <h4>Мой ответ</h4>
                                <a href={activeSub.fileUrl} target="_blank" rel="noopener noreferrer" download className="card-item material-item">
                                    <div className="material-content">
                                        <p className="task-file-name">{extractFileNameFromUrl(activeSub.fileUrl)}</p>
                                        <img src={getFileIcon(activeSub.fileUrl, false)} alt="" />
                                    </div>
                                </a>
                            </div>
                        )}

                        {!activeSub && !editMode && (
                            <p className="answers-empty">Вы ещё не отправили ответ на это задание.</p>
                        )}

                        {activeSub && !activeSub.answerText && !activeSub.fileUrl && !editMode && (
                            <p className="answers-empty">Ответ пуст</p>
                        )}

                        {!editMode && (
                            <div className="task-review-actions task-review-actions--top-gap">
                                {activeSub ? (
                                    <>
                                        <button className="btn btn-secondary" onClick={() => setEditMode(true)}>Изменить</button>
                                        <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>Удалить</button>
                                    </>
                                ) : (
                                    <button className="btn btn-primary" onClick={() => setEditMode(true)}>Ответить</button>
                                )}
                            </div>
                        )}

                        {editMode && (
                            <div className="task-answer-form">
                                <div className="input-item">
                                    <h4>Мой ответ</h4>
                                    <MarkdownEditor
                                        value={answerText}
                                        onChange={setAnswerText}
                                        placeholder="Введите ваш ответ..."
                                        minHeight="120px"
                                        className="md-editor--white"
                                    />
                                </div>
                                <div className="input-item">
                                    <h4>Файл (необязательно)</h4>
                                    <input type="file" ref={fileInputRef} hidden onChange={handleFileSelect} />
                                    <div className="upload-zone">
                                        <button className="btn-dashed" onClick={() => fileInputRef.current?.click()}>
                                            Выбор файла
                                        </button>
                                    </div>
                                    {(pendingFile || fileUrl) && (
                                        <div className="courses-grid">
                                            {pendingFile && (
                                                <div className="course-item-mini course-item-mini--pending">
                                                    <span className="truncate-text">{pendingFile.name}</span>
                                                    <img src={cross} className="remove-icon" onClick={() => setPendingFile(null)} alt="remove" />
                                                </div>
                                            )}
                                            {fileUrl && !pendingFile && (
                                                <div className="course-item-mini">
                                                    <span className="truncate-text">{extractFileNameFromUrl(fileUrl)}</span>
                                                    <img src={cross} className="remove-icon" onClick={() => setFileUrl('')} alt="remove" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="task-form-actions">
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
                </section>
            )}
        </div>
    );
};

export default UserOnboardingTasksPage;
