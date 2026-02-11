import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../../../contexts/PageTitleContext';
import { adaptationService } from '../../../../services/adaptation.service';
import type { OnboardingRoute } from '../../../../services/adaptation.service';
import LoadingSpinner from '../../../../components/loading/LoadingSpinner';
import { AdminTable } from '../../../../components/adminTable/AdminTable';
import { ActionMenu, ActionMenuItem, ICONS } from '../../../../components/actionMenu/ActionMenu';
import '../../adminPagesWithTables.css';

export const AdminAdaptationRoute = () => {
    const { setDynamicTitle } = usePageTitle();
    const navigate = useNavigate();
    
    const [routes, setRoutes] = useState<OnboardingRoute[]>([]);
    const [loading, setLoading] = useState(true);
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Вспомогательная функция для сортировки: активные сверху
    const sortRoutes = (data: OnboardingRoute[]) => {
        return [...data].sort((a, b) => {
            if (a.status === 'active' && b.status !== 'active') return -1;
            if (a.status !== 'active' && b.status === 'active') return 1;
            return 0;
        });
    };
    
    useEffect(() => {
    const fetchRoutes = async () => {
        try {
            setLoading(true);
            const data = await adaptationService.getAllRoutes();
            setRoutes(sortRoutes(data));
            setDynamicTitle('Редактирование адаптационных маршрутов'); 
        } catch (error) {
            console.error('Ошибка загрузки:', error);
        } finally {
            setLoading(false);
        }
    };
    fetchRoutes();

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
        try {
            const newStatus = currentStatus === 'active' ? 'archived' : 'active';
            
            await adaptationService.updateRoute(id, { status: newStatus });
            
            setRoutes(prev => {
                const updated = prev.map(r => r.id === id ? { ...r, status: newStatus } : r);
                return sortRoutes(updated);
            });
        } catch (e) {
            alert("Не удалось изменить статус маршрута");
        }
        setOpenMenuId(null);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Вы уверены?')) return;
        await adaptationService.deleteRoute(id);
        setRoutes(prev => prev.filter(r => r.id !== id));
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
            <button className="btn btn-primary create-btn" onClick={() => navigate('/edit/adaptationRoutes/new')}>
                Создать адаптационный маршрут
            </button>

            <AdminTable 
                columns={columns}
                data={routes}
                renderRow={(route) => (
                    // Добавляем класс row-archived для визуального отделения
                    <tr key={route.id} className={route.status === 'archived' ? 'row-archived' : ''}>
                        <td>
                            <span className="route-title">
                                {route.title}
                                {route.status === 'archived' && <small style={{marginLeft: '10px', color: '#888'}}></small>}
                            </span>
                        </td>
                        <td>
                            {/* Стилизуем текст статуса */}
                            <span className={`status-badge status-${route.status}`}>
                                {route.status === 'active' ? 'Открыт' : 'Закрыт'}
                            </span>
                        </td>
                        <td className="action-cell">
                            <ActionMenu>
                                <ActionMenuItem 
                                    icon={route.status === 'active' ? ICONS.lock : ICONS.unlock}
                                    label={route.status === 'active' ? 'Закрыть' : 'Открыть'}
                                    onClick={() => handleStatusChange(route.id, route.status)}
                                />
                                <ActionMenuItem 
                                    icon={ICONS.edit}
                                    label="Изменить"
                                    onClick={() => navigate(`/edit/adaptationRoutes/${route.id}`)}
                                />
                                <ActionMenuItem 
                                    icon={ICONS.delete}
                                    label="Удалить"
                                    className="delete"
                                    onClick={() => handleDelete(route.id)}
                                />
                            </ActionMenu>
                        </td>
                    </tr>
                )}
            />
        </div>
    );
};

export default AdminAdaptationRoute;