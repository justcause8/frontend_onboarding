import { useEffect, useState, useRef } from 'react';
import { usePageTitle } from '../../../contexts/PageTitleContext';
import { adaptationService, type AdaptationRoute as TrainingCourse } from '../adaptation.service';
import './TrainingCourses.css';
import { useNavigate } from 'react-router-dom';

const IconMenu = () => <span className="icon-dots">•••</span>;
const IconLock = () => <span className="icon-emoji">🔒</span>;
const IconEdit = () => <span className="icon-emoji">✏️</span>;
const IconTrash = () => <span className="icon-emoji">🗑️</span>;

export const TrainingCourses = () => {
    const { setDynamicTitle } = usePageTitle();
    const [courses, setCourses] = useState<TrainingCourse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    // Обучающие курсы — активный таб
    const [activeTab, setActiveTab] = useState('courses');

    // Состояние выпадающего меню
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setDynamicTitle('Администрирование');
        loadCourses();

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [setDynamicTitle]);

    const loadCourses = async () => {
        try {
            setIsLoading(true);
            const data = await adaptationService.getAllRoutes(); 
            setCourses(data);
        } catch (error) {
            console.error('Ошибка загрузки курсов', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = () => {
        navigate('/trainingEdit');
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот курс?')) return;
        // await courseService.delete(id);
        setCourses(prev => prev.filter(c => c.id !== id));
        setOpenMenuId(null);
    };

    const handleStatusChange = async (id: number, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'archived' : 'active';
        // await courseService.update(id, { status: newStatus });
        setCourses(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
        setOpenMenuId(null);
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'Открыт';
            case 'archived': return 'Закрыт';
            default: return status;
        }
    };

    return (
        <div className="admin-page">
            <div className="admin-content">
                <div className="actions-bar">
                    <button className="create-course-btn" onClick={handleCreate}>
                        Создать обучающий курс
                    </button>
                </div>

                {isLoading ? (
                    <div className="loading-state">Загрузка данных...</div>
                ) : (
                    <div className="table-wrapper">
                        <table className="courses-table">
                            <thead>
                                <tr>
                                    <th className="col-name">Название</th>
                                    <th className="col-status">Статус</th>
                                    <th className="col-actions"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {courses.map((course) => (
                                    <tr key={course.id}>
                                        <td>{course.title}</td>
                                        <td>
                                            <span className={`status-text status-${course.status}`}>
                                                {getStatusLabel(course.status)}
                                            </span>
                                        </td>
                                        <td className="menu-cell">
                                            <button
                                                className="dots-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(openMenuId === course.id ? null : course.id);
                                                }}
                                            >
                                                <IconMenu />
                                            </button>

                                            {openMenuId === course.id && (
                                                <div className="course-dropdown" ref={menuRef}>
                                                    <div className="dropdown-option" onClick={() => handleStatusChange(course.id, course.status)}>
                                                        <IconLock /> {course.status === 'active' ? 'Закрыть' : 'Открыть'}
                                                    </div>
                                                    <div className="dropdown-option" onClick={() => navigate(`/edit-course/${course.id}`)}>
                                                        <IconEdit /> Изменить
                                                    </div>
                                                    <div className="dropdown-option delete-option" onClick={() => handleDelete(course.id)}>
                                                        <IconTrash /> Удалить
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrainingCourses;