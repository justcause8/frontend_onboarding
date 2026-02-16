import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../../../contexts/PageTitleContext';
import { courseService, type Course } from '../../../../services/course.service';
import LoadingSpinner from '../../../../components/loading/LoadingSpinner';
import { AdminTable } from '../../../../components/adminTable/AdminTable';
import { ActionMenu, ActionMenuItem, ICONS } from '../../../../components/actionMenu/ActionMenu';
import { extractFileNameFromUrl } from '../../../../utils/fileUtils';
import '../../adminPagesWithTables.css';

export const AdminCourses = () => {
    const { setDynamicTitle } = usePageTitle();
    const navigate = useNavigate();
    
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Сортировка: "active" курсы выше "archived"
    const sortCourses = (data: Course[]) => {
        return [...data].sort((a, b) => {
            if (a.status === 'active' && b.status !== 'active') return -1;
            if (a.status !== 'active' && b.status === 'active') return 1;
            return 0;
        });
    };

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const data = await courseService.getAllCoursesAdmin();
            setCourses(sortCourses(data));
            setDynamicTitle('Редактирование обучающих курсов');
        } catch (error) {
            console.error('Ошибка загрузки курсов:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            setDynamicTitle('');
        };
    }, [setDynamicTitle]);

    const handleStatusChange = async (id: number, currentStatus: string) => {
        const courseToUpdate = courses.find(c => c.id === id);
        if (!courseToUpdate) return;

        try {
            const newStatus = currentStatus === 'active' ? 'archived' : 'active';
            
            const payload: Partial<Course> = {
                title: courseToUpdate.title,
                description: courseToUpdate.description,
                orderIndex: courseToUpdate.orderIndex,
                status: newStatus,
                stageId: courseToUpdate.stageId,
                testIds: courseToUpdate.tests?.map(t => t.id) || [],
                materials: courseToUpdate.materials?.map(m => ({
                    id: m.id, 
                    title: m.title || extractFileNameFromUrl(m.urlDocument),
                    urlDocument: m.urlDocument,
                    isExternalLink: m.isExternalLink,
                    category: m.category
                })) || []
            };

            await courseService.updateCourse(id, payload);
            
            setCourses(prev => {
                const updated = prev.map(c => c.id === id ? { ...c, status: newStatus } : c);
                return sortCourses(updated);
            });
        } catch (e) {
            console.error("Ошибка при обновлении статуса:", e);
            alert("Не удалось изменить статус курса");
        }
        setOpenMenuId(null);
    };
    
    const handleDelete = async (id: number) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот курс?')) return;
        try {
            await courseService.deleteCourse(id);
            setCourses(prev => prev.filter(c => c.id !== id));
        } catch (error) {
            console.error("Ошибка при удалении:", error);
            alert("Не удалось удалить курс");
        }
        setOpenMenuId(null);
    };

    const columns = [
        { header: 'Название', width: '60%' },
        { header: 'Статус', width: '20%' },
        { header: '', width: '10%' }
    ];

    if (loading) return <LoadingSpinner />;

    return (
        <div className="card">
            <button 
                className="btn btn-primary create-btn" 
                onClick={() => navigate('/edit/courses/new')}
            >
                Создать обучающий курс
            </button>

            <AdminTable 
                columns={columns}
                data={courses}
                emptyText="Список курсов пуст"
                renderRow={(course) => (
                    <tr key={course.id} className={course.status === 'archived' ? 'row-archived' : ''}>
                        <td>
                            <span className="route-title">
                                {course.title}
                            </span>
                        </td>
                        <td>
                            <span className={`status-badge status-${course.status}`}>
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
                                    onClick={() => navigate(`/edit/courses/${course.id}`)}
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