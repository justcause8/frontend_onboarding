import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../../../contexts/PageTitleContext';
import { adaptationService, type AdaptationRoute as TrainingCourse } from '../../../../services/adaptation.service';
import LoadingSpinner from '../../../../components/loading/LoadingSpinner';
import { AdminTable } from '../../../../components/adminTable/AdminTable';
import { ActionMenu, ActionMenuItem, ICONS } from '../../../../components/actionMenu/ActionMenu';

// Мы используем те же стили, что и в маршрутах, либо общие стили таблиц
import './AdminCourses.css'; 

export const AdminCourses = () => {
    const { setDynamicTitle } = usePageTitle();
    const navigate = useNavigate();
    
    const [courses, setCourses] = useState<TrainingCourse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setLoading(true);
                // В будущем замените на специальный сервис для курсов, если он есть
                const data = await adaptationService.getAllRoutes(); 
                setCourses(data);
                setDynamicTitle('Редактирование обучающих курсов');
            } catch (error) {
                console.error('Ошибка загрузки курсов:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();

        return () => setDynamicTitle('');
    }, [setDynamicTitle]);

    const handleStatusChange = async (id: number, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'archived' : 'active';
        try {
            // await courseService.update(id, { status: newStatus });
            setCourses(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот курс?')) return;
        try {
            // await courseService.delete(id);
            setCourses(prev => prev.filter(c => c.id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    const columns = [
        { header: 'Название', width: '60%' },
        { header: 'Статус', width: '20%' },
        { header: '', width: '10%' }
    ];

    if (loading) return <LoadingSpinner />;

    return (
        <div className="card">
            <button className="btn btn-primary create-btn" onClick={() => navigate('/trainingEdit')}>
                    Создать обучающий курс
                </button>

            <AdminTable 
                columns={columns}
                data={courses}
                emptyText="Список курсов пуст"
                renderRow={(course) => (
                    <tr key={course.id}>
                        <td><span className="route-title">{course.title}</span></td>
                        <td>
                            <span className={`status-text text-${course.status}`}>
                                {course.status === 'active' ? 'Открыт' : 'Закрыт'}
                            </span>
                        </td>
                        <td className="action-cell">
                            <ActionMenu>
                                <ActionMenuItem 
                                    icon={course.status === 'active' ? ICONS.lock : ICONS.unlock}
                                    label={course.status === 'active' ? 'Закрыть' : 'Открыть'}
                                    onClick={() => handleStatusChange(course.id, course.status)}
                                />
                                <ActionMenuItem 
                                    icon={ICONS.edit}
                                    label="Изменить"
                                    onClick={() => navigate(`/edit-course/${course.id}`)}
                                />
                                <ActionMenuItem 
                                    icon={ICONS.delete}
                                    label="Удалить"
                                    className="delete"
                                    onClick={() => handleDelete(course.id)}
                                />
                            </ActionMenu>
                        </td>
                    </tr>
                )}
            />
        </div>
    );
};

export default AdminCourses;