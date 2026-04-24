import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { taskService, type OnboardingTask, type TaskSubmission } from '../../services/task.service';
import { usePageTitle } from '../../contexts/PageTitleContext';
import LoadingSpinner from '../../components/loading/LoadingSpinner';
import ErrorState from '../../components/error/ErrorState';
import './OnboardingTaskPage.css';

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

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const OnboardingTaskPage = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { setDynamicTitle } = usePageTitle();

  const [task, setTask] = useState<OnboardingTask | null>(null);
  const [submission, setSubmission] = useState<TaskSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // form state
  const [answerText, setAnswerText] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    setDynamicTitle('Задание');
    return () => setDynamicTitle('');
  }, [setDynamicTitle]);

  const load = async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      const t = await taskService.getTask(Number(taskId));
      setTask(t);

      const subs = await taskService.getSubmissionsByTask(Number(taskId));
      const my = subs.length > 0 ? subs[subs.length - 1] : null;
      setSubmission(my);
      if (my) {
        setAnswerText(my.answerText ?? '');
        setFileUrl(my.fileUrl ?? '');
      }
    } catch {
      setError('Не удалось загрузить задание');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [taskId]);

  const handleSubmit = async () => {
    if (!taskId) return;
    setSaving(true);
    try {
      if (submission) {
        await taskService.updateSubmissionAnswer(submission.id, {
          answerText: answerText || '',
          fileUrl: fileUrl || null,
        });
      } else {
        await taskService.createSubmission({
          fkTaskId: Number(taskId),
          answerText: answerText || null,
          fileUrl: fileUrl || null,
        });
      }
      setEditMode(false);
      await load();
    } catch {
      alert('Ошибка при сохранении ответа');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!submission) return;
    if (!window.confirm('Удалить ответ?')) return;
    setSaving(true);
    try {
      await taskService.deleteSubmission(submission.id);
      setSubmission(null);
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
  if (error || !task) return <ErrorState message={error ?? 'Нет данных'} onRetry={load} />;
  if (task.status !== 'active') return <ErrorState message="Это задание недоступно" onRetry={() => navigate(-1)} />;

  return (
    <div className="text">
      {/* Карточка задания */}
      <div className="card task-card">
        <div className="task-card-header">
          <div className="task-card-header-left">
            <h2>{task.description}</h2>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
              <span className="meta-item meta-item--white">
                {task.taskType === 'general' ? 'Общее' : 'Индивидуальное'}
              </span>
            </div>
          </div>
          {submission && (
            <span className={statusBadgeClass(submission.status)}>
              {STATUS_LABELS[submission.status] ?? submission.status}
            </span>
          )}
        </div>

        {submission && (
          <div className="task-meta-row">
            <span className="text-info">Последнее изменение: {formatDate(submission.updatedAt ?? submission.createdAt)}</span>
          </div>
        )}
      </div>

      {/* Карточка ответа */}
      <div className="card task-answer-card">
        <div className="section-header">
          <h2>Мой ответ</h2>
          {submission && !editMode && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setEditMode(true)}>Изменить</button>
              <button className="btn btn-secondary" onClick={handleDelete} disabled={saving}>Удалить</button>
            </div>
          )}
        </div>

        {!submission && !editMode && (
          <div className="task-empty-answer">
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '12px' }}>
              Вы ещё не отправили ответ на это задание.
            </p>
            <button className="btn btn-primary" onClick={() => setEditMode(true)}>Ответить</button>
          </div>
        )}

        {submission && !editMode && (
          <div className="task-answer-view">
            {submission.answerText && (
              <div className="task-answer-block">
                <span className="meta-item" style={{ marginBottom: '8px', display: 'inline-block' }}>Текстовый ответ</span>
                <p className="task-answer-text">{submission.answerText}</p>
              </div>
            )}
            {submission.fileUrl && (
              <div className="task-answer-block">
                <span className="meta-item" style={{ marginBottom: '8px', display: 'inline-block' }}>Файл</span>
                <a
                  href={submission.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="task-file-link"
                >
                  {submission.fileUrl.split('/').pop() || submission.fileUrl}
                </a>
              </div>
            )}
            {!submission.answerText && !submission.fileUrl && (
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
                if (submission) {
                  setAnswerText(submission.answerText ?? '');
                  setFileUrl(submission.fileUrl ?? '');
                } else {
                  setAnswerText('');
                  setFileUrl('');
                }
              }}>
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Комментарий проверяющего */}
      {submission && (submission.mentorComment || submission.status !== 'submitted') && (
        <div className="card task-feedback-card">
          <h2>Комментарий проверяющего</h2>
          {submission.mentorComment ? (
            <p className="task-mentor-comment">{submission.mentorComment}</p>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Комментарий не оставлен</p>
          )}
        </div>
      )}

      <div className="card-footer">
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Назад</button>
      </div>
    </div>
  );
};

export default OnboardingTaskPage;
