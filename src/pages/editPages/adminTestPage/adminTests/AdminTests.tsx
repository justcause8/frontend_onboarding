import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../../../contexts/PageTitleContext';

import { testService, type Test } from '../../../../services/test.service';

import LoadingSpinner from '../../../../components/loading/LoadingSpinner';
import { AdminTable } from '../../../../components/adminTable/AdminTable';
import { ActionMenu, ActionMenuItem, ICONS } from '../../../../components/actionMenu/ActionMenu';
import '../../adminPagesWithTables.css';

export const AdminTests = () => {
    const { setDynamicTitle } = usePageTitle();
    const navigate = useNavigate();
    
    const [tests, setTests] = useState<Test[]>([]);
    const [loading, setLoading] = useState(true);
    const menuRef = useRef<HTMLDivElement>(null);

    // Сортировка: активные сверху
    const sortTests = (data: Test[]) => {
        return [...data].sort((a, b) => {
            if (a.status === 'active' && b.status !== 'active') return -1;
            if (a.status !== 'active' && b.status === 'active') return 1;
            return 0;
        });
    };

    useEffect(() => {
        const fetchTests = async () => {
            try {
                setLoading(true);
                const data = await testService.getAllTests(); 
                setTests(sortTests(data));
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
        try {
            const newStatus = currentStatus === 'active' ? 'archived' : 'active';
            // ИСПРАВЛЕНО: Вызов из testService
            await testService.updateTest(id, { status: newStatus });
            
            setTests(prev => {
                const updated = prev.map(t => t.id === id ? { ...t, status: newStatus } : t);
                return sortTests(updated);
            });
        } catch (e) {
            alert("Не удалось изменить статус теста");
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот тест?')) return;
        try {
            // ИСПРАВЛЕНО: Вызов из testService
            await testService.deleteTest(id);
            setTests(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            alert("Ошибка при удалении теста");
        }
    };

    // Остальной код (columns, renderRow, JSX) остается без изменений
    const columns = [
        { header: 'Название теста', width: '60%' },
        { header: 'Статус', width: '20%' },
        { header: '', width: '10%' }
    ];

    if (loading) return <LoadingSpinner />;

    return (
        <div className="card">
            <button 
                className="btn btn-primary create-btn" 
                onClick={() => navigate('/edit/tests/new')}
            >
                Создать новый тест
            </button>

            <AdminTable 
                columns={columns}
                data={tests}
                emptyText="Тесты в базе данных не найдены"
                renderRow={(test) => (
                    <tr key={test.id} className={test.status === 'archived' ? 'row-archived' : ''}>
                        <td><span className="route-title">{test.title}</span></td>
                        <td>
                            <span className={`status-badge status-${test.status}`}>
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
                                    onClick={() => navigate(`/edit/tests/${test.id}`)}
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