import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../../contexts/PageTitleContext';
import { taskService, type OnboardingTask } from '../../../services/task.service';
import LoadingSpinner from '../../../components/loading/LoadingSpinner';
import { AdminTable } from '../../../components/adminTable/AdminTable';
import { ActionMenu, ActionMenuItem, ICONS } from '../../../components/actionMenu/ActionMenu';
import { stripMarkdown } from '../../../utils/markdownUtils';

const AdminOnboardingTasks = () => {
    const { setDynamicTitle } = usePageTitle();
    const navigate = useNavigate();

    const [tasks, setTasks] = useState<OnboardingTask[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setDynamicTitle('Задания');
        taskService.getAllTasks()
            .then(data => setTasks(data))
            .catch(() => {})
            .finally(() => setLoading(false));
        return () => setDynamicTitle('');
    }, [setDynamicTitle]);

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

    const columns = [
        { header: 'Описание', width: '50%' },
        { header: 'Тип', width: '20%' },
        { header: 'Статус', width: '20%' },
        { header: '', width: '10%' },
    ];

    if (loading) return <LoadingSpinner />;

    return (
        <div className="card">
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
        </div>
    );
};

export default AdminOnboardingTasks;
