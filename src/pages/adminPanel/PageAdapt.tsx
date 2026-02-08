import { useEffect, useState, useRef } from 'react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { adaptationService, type AdaptationRoute } from './adaptation.service';
import { useNavigate } from 'react-router-dom';
import './PageAdapt.css';

const IconMenu = () => <span>•••</span>;
const IconLock = () => <span>🔒</span>;
const IconEdit = () => <span>✏️</span>;
const IconTrash = () => <span>🗑️</span>;

export const PageAdapt = () => {
    const { setDynamicTitle } = usePageTitle();
    const [routes, setRoutes] = useState<AdaptationRoute[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setDynamicTitle('Администрирование');
        loadRoutes();

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [setDynamicTitle]);

    const loadRoutes = async () => {
        try {
            setIsLoading(true);
            const data = await adaptationService.getAllRoutes();
            setRoutes(data);
        } catch (error) {
            console.error('Ошибка загрузки', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = () => navigate('/edit');

    const handleDelete = async (id: number) => {
        if (!window.confirm('Вы уверены?')) return;
        await adaptationService.deleteRoute(id);
        setRoutes(prev => prev.filter(r => r.id !== id));
        setOpenMenuId(null);
    };

    const handleStatusChange = async (id: number, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'archived' : 'active';
        await adaptationService.updateRoute(id, { status: newStatus });
        setRoutes(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
        setOpenMenuId(null);
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'Открыт';
            case 'archived': return 'Закрыт';
            case 'draft': return 'Черновик';
            default: return status;
        }
    };

    return (
        <div className="admin-content-inner">
            <div className="actions-bar">
                <button className="btn btn-primary create-btn" onClick={handleCreate}>
                    Создать адаптационный маршрут
                </button>
            </div>

            {isLoading ? (
                <div className="loading-placeholder">Загрузка...</div>
            ) : (
                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th style={{ width: '60%' }}>Название</th>
                                <th style={{ width: '30%' }}>Статус</th>
                                <th style={{ width: '10%' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {routes.map((route) => (
                                <tr key={route.id}>
                                    <td><span className="route-title">{route.title}</span></td>
                                    <td>
                                        <span className={`status-badge status-${route.status}`}>
                                            {getStatusLabel(route.status)}
                                        </span>
                                    </td>
                                    <td className="action-cell">
                                        <button 
                                            className="icon-btn" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuId(openMenuId === route.id ? null : route.id);
                                            }}
                                        >
                                            <IconMenu />
                                        </button>

                                        {openMenuId === route.id && (
                                            <div className="dropdown-menu" ref={menuRef}>
                                                <div className="dropdown-item" onClick={() => handleStatusChange(route.id, route.status)}>
                                                    <span className="dd-icon"><IconLock /></span>
                                                    {route.status === 'active' ? 'Закрыть' : 'Открыть'}
                                                </div>
                                                <div className="dropdown-item" onClick={() => navigate(`/edit/${route.id}`)}>
                                                    <span className="dd-icon"><IconEdit /></span>
                                                    Изменить
                                                </div>
                                                <div className="dropdown-item delete" onClick={() => handleDelete(route.id)}>
                                                    <span className="dd-icon"><IconTrash /></span>
                                                    Удалить
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
    );
};
export default PageAdapt;