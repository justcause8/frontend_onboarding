import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../../../contexts/PageTitleContext';
import { adaptationService, type AdaptationRoute as Test } from '../../../../services/adaptation.service';
import LoadingSpinner from '../../../../components/loading/LoadingSpinner';
import { AdminTable } from '../../../../components/adminTable/AdminTable';
import { ActionMenu, ActionMenuItem, ICONS } from '../../../../components/actionMenu/ActionMenu';
import './AdminTests.css'; 

export const AdminTests = () => {
    const { setDynamicTitle } = usePageTitle();
    const navigate = useNavigate();
    
    const [tests, setTests] = useState<Test[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTests = async () => {
            try {
                setLoading(true);
                // В будущем здесь будет вызов именно тестов, например: testService.getAll()
                const data = await adaptationService.getAllRoutes(); 
                setTests(data);
                setDynamicTitle('Редактирование тестов');
            } catch (error) {
                console.error('Ошибка загрузки тестов:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTests();

        return () => setDynamicTitle('');
    }, [setDynamicTitle]);

    const handleStatusChange = async (id: number, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'archived' : 'active';
        try {
            // await testService.update(id, { status: newStatus });
            setTests(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот тест?')) return;
        try {
            // await testService.delete(id);
            setTests(prev => prev.filter(t => t.id !== id));
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
            <button className="btn btn-primary create-btn" onClick={() => navigate('/testPageEdit')}>
                Создать тест
            </button>

            <AdminTable 
                columns={columns}
                data={tests}
                emptyText="Список тестов пуст"
                renderRow={(test) => (
                    <tr key={test.id}>
                        <td><span className="route-title">{test.title}</span></td>
                        <td>
                            <span className={`status-text text-${test.status}`}>
                                {test.status === 'active' ? 'Открыт' : 'Закрыт'}
                            </span>
                        </td>
                        <td className="action-cell">
                            <ActionMenu>
                                <ActionMenuItem 
                                    icon={test.status === 'active' ? ICONS.lock : ICONS.unlock}
                                    label={test.status === 'active' ? 'Закрыть' : 'Открыть'}
                                    onClick={() => handleStatusChange(test.id, test.status)}
                                />
                                <ActionMenuItem 
                                    icon={ICONS.edit}
                                    label="Изменить"
                                    onClick={() => navigate(`/edit-test/${test.id}`)}
                                />
                                <ActionMenuItem 
                                    icon={ICONS.delete}
                                    label="Удалить"
                                    className="delete"
                                    onClick={() => handleDelete(test.id)}
                                />
                            </ActionMenu>
                        </td>
                    </tr>
                )}
            />
        </div>
    );
};

export default AdminTests;