import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService, type UserShort, type ExternalUser } from '../../../services/user.service';
import { usePageTitle } from '../../../contexts/PageTitleContext';
import LoadingSpinner from '../../../components/loading/LoadingSpinner';
import { ActionMenu, ActionMenuItem, ICONS } from '../../../components/actionMenu/ActionMenu';
import searchIcon from '@/assets/search.svg';
import cross from '@/assets/cross.png';
import '../adminMaterialsPage/AdminEditMaterialsPage.css';

const ROLES: { value: string; label: string }[] = [
    { value: 'SuperAdmin', label: 'Админ' },
    { value: 'HrAdmin',    label: 'HR-специалист' },
    { value: 'Mentor',     label: 'Наставник' },
    { value: 'User',       label: 'Пользователь' },
];

const getRoleLabel = (role?: string) =>
    ROLES.find(r => r.value === role)?.label ?? role ?? '—';

const AdminEditUsersPage = () => {
    const { setDynamicTitle } = usePageTitle();
    const navigate = useNavigate();

    const [users, setUsers] = useState<UserShort[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    // Поиск в AD
    const [adQuery, setAdQuery] = useState('');
    const [adResults, setAdResults] = useState<ExternalUser[]>([]);
    const [adSearching, setAdSearching] = useState(false);
    const [adDropdownOpen, setAdDropdownOpen] = useState(false);
    const [selectedAdUser, setSelectedAdUser] = useState<ExternalUser | null>(null);
    const [importing, setImporting] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await userService.getAllUsers();
            setUsers(data);
        } catch {
            alert('Ошибка загрузки пользователей');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setDynamicTitle('Управление пользователями');
        loadData();
        return () => setDynamicTitle('');
    }, [setDynamicTitle, loadData]);

    // Поиск в AD с debounce
    useEffect(() => {
        if (adQuery.trim().length < 2) {
            setAdResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                setAdSearching(true);
                const results = await userService.searchExternalUsers(adQuery.trim());
                setAdResults(results);
                setAdDropdownOpen(true);
            } catch {
                setAdResults([]);
            } finally {
                setAdSearching(false);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [adQuery]);

    const SYNC_INTERVAL_MS = 1 * 60 * 1000; // 1 минут

    useEffect(() => {
        const sync = async () => {
            try {
                await userService.syncAllFromRims();
                await loadData();
            } catch {
                // синхронизация фоновая — ошибки не показываем
            }
        };
        const id = setInterval(sync, SYNC_INTERVAL_MS);
        return () => clearInterval(id);
    }, [loadData]);

    const handleImport = async () => {
        if (!selectedAdUser) return;
        try {
            setImporting(true);
            const result = await userService.importUserFromRims(selectedAdUser.uid as string);
            if (result.user.alreadyExisted) {
                alert(`Пользователь "${result.user.name}" уже существует в системе`);
            } else {
                alert(result.message);
            }
            setSelectedAdUser(null);
            setAdQuery('');
            await loadData();
        } catch {
            alert('Ошибка при добавлении пользователя');
        } finally {
            setImporting(false);
        }
    };

    const handleRoleChange = async (user: UserShort, role: string) => {
        const roleLabel = getRoleLabel(role);
        if (!window.confirm(`Изменить роль "${user.fullName}" на "${roleLabel}"?`)) return;
        try {
            await userService.updateUserRole(user.id, role);
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role } : u));
        } catch {
            alert('Ошибка при изменении роли');
        }
    };

    const handleDelete = async (user: UserShort) => {
        if (!window.confirm(`Удалить пользователя "${user.fullName}"?`)) return;
        try {
            await userService.deleteUser(user.id);
            setUsers(prev => prev.filter(u => u.id !== user.id));
        } catch {
            alert('Ошибка при удалении');
        }
    };

    const filtered = users.filter(u =>
        u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        (u.department || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.position || '').toLowerCase().includes(search.toLowerCase())
    );

    if (loading && users.length === 0) return <LoadingSpinner />;

    return (
        <div className="text">

            {/* Добавление пользователя из RIMS */}
            <section className="card">
                <h2>Добавить сотрудника из RIMS</h2>
                <div className="input-with-button mt-8">
                    <div className="input-search-wrapper" style={{ flex: 1 }}>
                        <input
                            className="input-field"
                            placeholder="Введите ФИО или логин..."
                            value={adQuery}
                            onChange={e => {
                                setAdQuery(e.target.value);
                                setSelectedAdUser(null);
                                setAdDropdownOpen(true);
                            }}
                            onFocus={() => adResults.length > 0 && setAdDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setAdDropdownOpen(false), 150)}
                        />
                        <img src={searchIcon} alt="" className="input-search-icon" />
                        {adDropdownOpen && adResults.length > 0 && (
                            <div className="search-results">
                                {adResults.map(u => (
                                    <div
                                        key={u.uid}
                                        className="search-item search-item--row"
                                        onMouseDown={e => e.preventDefault()}
                                        onClick={() => {
                                            setSelectedAdUser(u);
                                            setAdQuery(u.fullName);
                                            setAdDropdownOpen(false);
                                        }}
                                    >
                                        <span>{u.fullName}<small>{u.jobTitle}</small></span>
                                        {u.department && <small className="search-item-dept">{u.department}</small>}
                                    </div>
                                ))}
                            </div>
                        )}
                        {adSearching && (
                            <div className="search-results">
                                <div className="search-item" style={{ color: 'var(--text-secondary)' }}>Поиск...</div>
                            </div>
                        )}
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={handleImport}
                        disabled={!selectedAdUser || importing}
                    >
                        {importing ? 'Добавление...' : 'Добавить'}
                    </button>
                </div>

                {selectedAdUser && (
                    <div className="selected-employees-list mt-8">
                        <div className="employee-row employee-row--mentor">
                            <div className="employee-row-info">
                                <span className="employee-name">{selectedAdUser.fullName}</span>
                                <span className="employee-dept">{selectedAdUser.jobTitle} · {selectedAdUser.department}</span>
                                <span className="employee-dept">{selectedAdUser.email}</span>
                            </div>
                            <img
                                src={cross}
                                className="chip-remove-icon"
                                alt="x"
                                onClick={() => { setSelectedAdUser(null); setAdQuery(''); }}
                            />
                        </div>
                    </div>
                )}
            </section>

            {/* Таблица пользователей */}
            <section className="card no-padding">
                <div className="table-header-row">
                    <h2>Пользователи</h2>
<div className="input-search-wrapper dept-search">
                        <input
                            className="input-field"
                            placeholder="Поиск пользователя..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <img src={searchIcon} alt="" className="input-search-icon" />
                    </div>
                </div>

                <div className="users-table-scroll">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ФИО</th>
                                <th>Отдел</th>
                                <th>Должность</th>
                                <th>Роль</th>
                                <th style={{ width: '60px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5}>
                                        <p className="sub-text" style={{ padding: '16px 0' }}>Пользователи не найдены</p>
                                    </td>
                                </tr>
                            ) : filtered.map(user => (
                                <tr key={user.id}>
                                    <td><div className="main-text">{user.fullName}</div></td>
                                    <td><span className="sub-text">{user.department || '—'}</span></td>
                                    <td><span className="sub-text">{user.position || '—'}</span></td>
                                    <td><span className="category-badge">{getRoleLabel(user.role)}</span></td>
                                    <td className="action-cell">
                                        <div className="table-actions">
                                            <ActionMenu>
                                                {ROLES.map(r => (
                                                    <ActionMenuItem
                                                        key={r.value}
                                                        checkbox
                                                        checked={user.role === r.value}
                                                        label={r.label}
                                                        onClick={() => handleRoleChange(user, r.value)}
                                                    />
                                                ))}
                                                <ActionMenuItem
                                                    icon={ICONS.delete}
                                                    label="Удалить"
                                                    onClick={() => handleDelete(user)}
                                                    className="delete"
                                                />
                                            </ActionMenu>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="card-footer">
                <button className="btn btn-secondary" onClick={() => navigate(-1)}>Назад</button>
            </div>
        </div>
    );
};

export default AdminEditUsersPage;
