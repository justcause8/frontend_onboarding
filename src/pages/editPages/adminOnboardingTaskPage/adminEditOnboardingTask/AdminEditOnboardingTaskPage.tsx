import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { taskService } from '../../../../services/task.service';
import { adaptationService, type OnboardingRoute } from '../../../../services/adaptation.service';
import type { UserShort } from '../../../../services/user.service';

import { usePageTitle } from '../../../../contexts/PageTitleContext';
import { MarkdownEditor } from '../../../../components/markdownEditor/MarkdownEditor';
import LoadingSpinner from '../../../../components/loading/LoadingSpinner';
import downIcon from '@/assets/editMode/DownIcon.png';
import cross from '@/assets/icons/cross.png';
import searchIcon from '@/assets/icons/search.svg';
import './AdminEditOnboardingTaskPage.css';

interface StageOption {
    id: number;
    title: string;
}

const AdminEditOnboardingTaskPage: React.FC = () => {
    const { taskId } = useParams<{ taskId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setDynamicTitle } = usePageTitle();

    const isEditMode = taskId !== 'new';
    const stageIdParam = searchParams.get('stageId');
    const returnTo = searchParams.get('returnTo');

    const [description, setDescription] = useState('');
    const [taskType, setTaskType] = useState<'general' | 'individual'>('general');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [allRoutes, setAllRoutes] = useState<OnboardingRoute[]>([]);
    const [selectedRoute, setSelectedRoute] = useState<OnboardingRoute | null>(null);
    const [routeSearch, setRouteSearch] = useState('');
    const [routeDropdownOpen, setRouteDropdownOpen] = useState(false);
    const [routeLoading, setRouteLoading] = useState(false);

    const [selectedStage, setSelectedStage] = useState<StageOption | null>(null);
    const [stageSearch, setStageSearch] = useState('');
    const [stageDropdownOpen, setStageDropdownOpen] = useState(false);

    const [selectedUser, setSelectedUser] = useState<UserShort | null>(null);
    const [userSearch, setUserSearch] = useState('');
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);

    useEffect(() => {
        setDynamicTitle(isEditMode ? 'Редактирование задания' : 'Создание задания');
        return () => setDynamicTitle('');
    }, [isEditMode, setDynamicTitle]);

    const normalizeRoute = (r: OnboardingRoute): OnboardingRoute => ({
        ...r,
        assignedEmployees: (r.assignedEmployees ?? []).map((u: any) => ({
            ...u,
            fullName: u.fullName || u.name || '',
            numericId: u.numericId ?? (typeof u.id === 'number' ? u.id : Number(u.id)),
        })),
    });

    useEffect(() => {
        const load = async () => {
            try {
                const routes = await adaptationService.getAllRoutes();
                setAllRoutes(routes);

                if (stageIdParam) {
                    const stageId = Number(stageIdParam);
                    const matchRoute = routes.find(r =>
                        r.stages?.some(s => s.id === stageId)
                    );
                    if (matchRoute) {
                        const fullRoute = normalizeRoute(await adaptationService.getRoute(matchRoute.id));
                        setSelectedRoute(fullRoute);
                        setRouteSearch(fullRoute.title);
                        const foundStage = fullRoute.stages.find(s => s.id === stageId);
                        if (foundStage) {
                            setSelectedStage(foundStage);
                            setStageSearch(foundStage.title);
                        }
                    } else {
                        for (const r of routes) {
                            const full = normalizeRoute(await adaptationService.getRoute(r.id));
                            const foundStage = full.stages.find(s => s.id === stageId);
                            if (foundStage) {
                                setSelectedRoute(full);
                                setRouteSearch(full.title);
                                setSelectedStage(foundStage);
                                setStageSearch(foundStage.title);
                                break;
                            }
                        }
                    }
                }

                if (isEditMode) {
                    const t = await taskService.getTask(Number(taskId));
                    setDescription(t.description);
                    setTaskType(t.taskType);
                    let foundFullRoute: OnboardingRoute | null = null;
                    for (const r of routes) {
                        const full = await adaptationService.getRoute(r.id);
                        if (full.stages.some(s => s.id === t.fkOnboardingStageId)) {
                            foundFullRoute = full;
                            break;
                        }
                    }
                    if (foundFullRoute) {
                        const normalizedRoute = normalizeRoute(foundFullRoute);
                        setSelectedRoute(normalizedRoute);
                        setRouteSearch(normalizedRoute.title);
                        const foundStage = normalizedRoute.stages.find(s => s.id === t.fkOnboardingStageId);
                        if (foundStage) { setSelectedStage(foundStage); setStageSearch(foundStage.title); }
                        if (t.fkUserId) {
                            const found = (normalizedRoute.assignedEmployees ?? []).find((u: any) => u.numericId === t.fkUserId || u.id === t.fkUserId);
                            if (found) { setSelectedUser(found); setUserSearch(found.fullName); }
                        }
                    }
                }
            } catch {
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [taskId, isEditMode, stageIdParam]);

    const filteredRoutes = allRoutes.filter(r =>
        r.title.toLowerCase().includes(routeSearch.toLowerCase())
    );

    const filteredStages = (selectedRoute?.stages ?? []).filter(s =>
        s.title.toLowerCase().includes(stageSearch.toLowerCase())
    );

    const filteredUsers = (selectedRoute?.assignedEmployees ?? []).filter((u: UserShort) =>
        (u.fullName ?? '').toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.department ?? '').toLowerCase().includes(userSearch.toLowerCase())
    ).slice(0, 20);

    const handleSave = async () => {
        if (!description.trim() || !selectedStage) return;
        try {
            setSaving(true);
            if (isEditMode) {
                await taskService.updateTask(Number(taskId), { description, taskType });
            } else {
                await taskService.createTask({
                    fkOnboardingStageId: selectedStage.id,
                    fkUserId: taskType === 'individual' ? (selectedUser ? (selectedUser.numericId ?? Number(selectedUser.id)) : null) : null,
                    description: description.trim(),
                    taskType,
                    status: 'active',
                });
            }
            navigate(returnTo ?? (-1 as any));
        } catch {
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <>
            <section className="card text">
                <h2>{isEditMode ? 'Редактирование задания' : 'Новое задание'}</h2>

                {/* Выбор маршрута */}
                <div className="input-item">
                    <h4>Маршрут адаптации</h4>
                    <div style={{ position: 'relative' }}>
                        <input
                            className="input-field"
                            placeholder="Выбрать маршрут..."
                            value={routeSearch}
                            onChange={e => {
                                setRouteSearch(e.target.value);
                                setRouteDropdownOpen(true);
                                setSelectedRoute(null);
                                setSelectedStage(null);
                                setStageSearch('');
                            }}
                            onFocus={() => setRouteDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setRouteDropdownOpen(false), 150)}
                        />
                        <div
                            className={`search-arrow${routeDropdownOpen ? ' open' : ''}`}
                            onClick={() => setRouteDropdownOpen(v => !v)}
                        >
                            <img className="search-dropdown" src={downIcon} alt="" />
                        </div>
                        {routeDropdownOpen && filteredRoutes.length > 0 && (
                            <div className="search-results">
                                {filteredRoutes.map(r => (
                                    <div
                                        key={r.id}
                                        className={`search-item${selectedRoute?.id === r.id ? ' selected' : ''}`}
                                        onMouseDown={e => e.preventDefault()}
                                        onClick={async () => {
                                            setRouteSearch(r.title);
                                            setRouteDropdownOpen(false);
                                            setSelectedStage(null);
                                            setStageSearch('');
                                            setRouteLoading(true);
                                            try {
                                                const full = await adaptationService.getRoute(r.id);
                                                setSelectedRoute(normalizeRoute(full));
                                            } finally {
                                                setRouteLoading(false);
                                            }
                                        }}
                                    >
                                        {r.title}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Выбор этапа */}
                <div className="input-item">
                    <h4>Этап адаптации</h4>
                    <div style={{ position: 'relative' }}>
                        <input
                            className="input-field"
                            placeholder={routeLoading ? 'Загрузка этапов...' : selectedRoute ? 'Выбрать этап...' : 'Сначала выберите маршрут'}
                            value={stageSearch}
                            disabled={!selectedRoute || routeLoading}
                            onChange={e => {
                                setStageSearch(e.target.value);
                                setStageDropdownOpen(true);
                                setSelectedStage(null);
                            }}
                            onFocus={() => setStageDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setStageDropdownOpen(false), 150)}
                        />
                        <div
                            className={`search-arrow${stageDropdownOpen ? ' open' : ''}`}
                            onClick={() => selectedRoute && setStageDropdownOpen(v => !v)}
                        >
                            <img className="search-dropdown" src={downIcon} alt="" />
                        </div>
                        {stageDropdownOpen && filteredStages.length > 0 && (
                            <div className="search-results">
                                {filteredStages.map(s => (
                                    <div
                                        key={s.id}
                                        className={`search-item${selectedStage?.id === s.id ? ' selected' : ''}`}
                                        onMouseDown={e => e.preventDefault()}
                                        onClick={() => {
                                            setSelectedStage(s);
                                            setStageSearch(s.title);
                                            setStageDropdownOpen(false);
                                        }}
                                    >
                                        {s.title}
                                    </div>
                                ))}
                                {filteredStages.length === 0 && (
                                    <div className="search-item disabled">Этапы не найдены</div>
                                )}
                            </div>
                        )}
                    </div>
                    {selectedStage && (
                        <div className="selected-employees-list">
                            <div className="employee-row employee-row--mentor">
                                <div className="employee-row-info">
                                    <span className="employee-name">{selectedStage.title}</span>
                                    <span className="employee-dept">{selectedRoute?.title}</span>
                                </div>
                                <img src={cross} className="remove-icon" alt="x"
                                    onClick={() => { setSelectedStage(null); setStageSearch(''); }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Описание */}
                <div className="input-item">
                    <h4>Описание задания</h4>
                    <MarkdownEditor
                        value={description}
                        onChange={setDescription}
                        placeholder="Опишите, что нужно сделать сотруднику..."
                        minHeight="120px"
                    />
                </div>

                {/* Тип задания */}
                <div className="input-item">
                    <h4>Тип задания</h4>
                    <div className="task-type-options">
                        <div className="task-type-option" onClick={() => setTaskType('general')}>
                            <div className={`answer-marker round${taskType === 'general' ? ' active' : ''}`} />
                            Общее — для всех сотрудников
                        </div>
                        <div className="task-type-option" onClick={() => setTaskType('individual')}>
                            <div className={`answer-marker round${taskType === 'individual' ? ' active' : ''}`} />
                            Индивидуальное — для конкретного сотрудника
                        </div>
                    </div>
                </div>

                {/* Выбор сотрудника для индивидуального задания */}
                {taskType === 'individual' && (
                    <div className="input-item">
                        <h4>Сотрудник</h4>
                        <div className="input-search-wrapper">
                            <input
                                className="input-field"
                                placeholder={routeLoading ? 'Загрузка сотрудников...' : 'Найти сотрудника...'}
                                value={userSearch}
                                disabled={routeLoading}
                                onChange={e => { setUserSearch(e.target.value); setUserDropdownOpen(true); setSelectedUser(null); }}
                                onFocus={() => setUserDropdownOpen(true)}
                                onBlur={() => setTimeout(() => setUserDropdownOpen(false), 150)}
                            />
                            <img src={searchIcon} alt="" className="input-search-icon" />
                            {userDropdownOpen && filteredUsers.length > 0 && (
                                <div className="search-results">
                                    {filteredUsers.map(u => (
                                        <div
                                            key={u.id}
                                            className={`search-item search-item--row${selectedUser?.id === u.id ? ' selected' : ''}`}
                                            onMouseDown={e => e.preventDefault()}
                                            onClick={() => { setSelectedUser(u); setUserSearch(u.fullName); setUserDropdownOpen(false); }}
                                        >
                                            <span>{u.fullName}<small>{u.position}</small></span>
                                            {u.department && <small className="search-item-dept">{u.department}</small>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {selectedUser && (
                            <div className="selected-employees-list">
                                <div className="employee-row employee-row--mentor">
                                    <div className="employee-row-info">
                                        <span className="employee-name">{selectedUser.fullName || (selectedUser as any).name}</span>
                                        <span className="employee-dept">{selectedUser.department || selectedUser.position}</span>
                                    </div>
                                    <img src={cross} className="remove-icon" alt="x"
                                        onClick={() => { setSelectedUser(null); setUserSearch(''); }} />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            <div className="card-footer">
                <button className="btn btn-secondary" onClick={() => navigate(returnTo ?? (-1 as any))}>Отмена</button>
                <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={saving || !description.trim() || !selectedStage}
                >
                    {isEditMode ? 'Сохранить изменения' : 'Создать задание'}
                </button>
            </div>
        </>
    );
};

export default AdminEditOnboardingTaskPage;
