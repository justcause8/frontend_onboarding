import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { adaptationService } from '../../../../services/adaptation.service';
import { userService, type UserShort } from '../../../../services/user.service';
import { courseService, type Course as CourseBase } from '../../../../services/course.service';

import LoadingSpinner from '../../../../components/loading/LoadingSpinner';
import { usePageTitle } from '../../../../contexts/PageTitleContext';

import './AdminEditAdaptationRoute.css';
import upIcon from '@/assets/editMode/UpIcon.png';
import downIcon from '@/assets/editMode/DownIcon.png';
import deleteIcon from '@/assets/editMode/DeleteIcon.png';
import cross from '@/assets/cross.png';

interface SelectedCourse {
  id: number;
  title: string;
}

interface Stage {
  id: string | number;
  title: string;
  description: string;
  courses: SelectedCourse[];
}

export const AdminEditAdaptationRoute: React.FC = () => {
  const { setDynamicTitle } = usePageTitle();
  const navigate = useNavigate();
  const { adaptationRouteId } = useParams<{ adaptationRouteId: string }>();
  const isEditMode = adaptationRouteId !== 'new';
  const [searchParams] = useSearchParams();
  const newCourseId = searchParams.get('newCourseId');
  const returnStageId = searchParams.get('stageId');
  
  const [loading, setLoading] = useState(isEditMode);
  const [allUsers, setAllUsers] = useState<UserShort[]>([]);
  const [allCourses, setAllCourses] = useState<CourseBase[]>([]);
  
  const [deletedStageIds, setDeletedStageIds] = useState<number[]>([]);
  const [originalCourseIds, setOriginalCourseIds] = useState<number[]>([]);

  const [routeName, setRouteName] = useState('');
  const [routeDesc, setRouteDesc] = useState('');

  const routeDescRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = routeDescRef.current;
    if (el) { el.style.height = 'inherit'; el.style.height = `${el.scrollHeight}px`; }
  }, [routeDesc]);
  const [selectedMentors, setSelectedMentors] = useState<UserShort[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<UserShort[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);

  const [searchMentor, setSearchMentor] = useState('');
  const [searchEmployee, setSearchEmployee] = useState('');
  const [searchDepartment, setSearchDepartment] = useState('');
  const [mentorDropdownOpen, setMentorDropdownOpen] = useState(false);
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [routeStatus, setRouteStatus] = useState('active');

  // --- Состояния для выпадающего списка курсов ---
  const [activeStageId, setActiveStageId] = useState<string | number | null>(null);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const draftProcessedRef = useRef(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        if (!isEditMode) {
          setDynamicTitle('Создание плана адаптации');
        }
        const [users, courses] = await Promise.all([
          userService.getAllUsers(),
          courseService.getAllCoursesAdmin()
        ]);
        setAllUsers(users);
        setAllCourses(courses);

        const draft = sessionStorage.getItem('route_draft');

        if (draft && !draftProcessedRef.current) {
          draftProcessedRef.current = true;
          const parsed = JSON.parse(draft);
          setRouteName(parsed.routeName || '');
          setRouteDesc(parsed.routeDesc || '');
          setRouteStatus(parsed.routeStatus || 'active');
          setSelectedMentors(parsed.selectedMentors || []);
          setSelectedEmployees(parsed.selectedEmployees || []);
          setSelectedDepartments(parsed.selectedDepartments || []);
          setDeletedStageIds(parsed.deletedStageIds || []);
          setOriginalCourseIds(parsed.originalCourseIds || []);

          let restoredStages: Stage[] = parsed.stages || [];

          if (newCourseId && returnStageId) {
            const newId = Number(newCourseId);
            const courseObj = courses.find(c => c.id === newId);
            if (courseObj) {
              restoredStages = restoredStages.map(s =>
                String(s.id) === returnStageId && !s.courses.find(c => c.id === newId)
                  ? { ...s, courses: [...s.courses, { id: courseObj.id, title: courseObj.title }] }
                  : s
              );
            }
          }

          setStages(restoredStages);
          sessionStorage.removeItem('route_draft');
        } else if (isEditMode) {
          const route = await adaptationService.getRoute(Number(adaptationRouteId));
          setRouteName(route.title);
          setDynamicTitle(route.title);
          setRouteDesc(route.description);
          setRouteStatus(route.status || 'active');

          if (route.mentor) {
            setSelectedMentors([{
              id: route.mentor.id,
              fullName: (route.mentor as any).name || route.mentor.fullName,
              position: route.mentor.position || 'Наставник',
              department: route.mentor.department
            }]);
          }

          const employees = (route.assignedEmployees || []).map((u: any) => ({
            id: u.id,
            fullName: u.name || u.fullName,
            department: u.department,
            position: u.position || 'Сотрудник'
          }));
          setSelectedEmployees(employees);

          const mappedStages: Stage[] = route.stages.map(s => ({
            id: s.id,
            title: s.title,
            description: s.description,
            courses: s.courses.map(c => ({ id: c.id, title: c.title }))
          }));
          setStages(mappedStages);

          const courseIds = mappedStages.flatMap(s => s.courses.map(c => c.id));
          setOriginalCourseIds(courseIds);
        }
      } catch (e) {
        console.error("Ошибка загрузки:", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adaptationRouteId, isEditMode]);

  // Закрытие выпадающего списка курсов при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (!target.closest('.course-search-wrapper')) {
            setActiveStageId(null);
            setCourseSearchQuery('');
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRemoveCourse = (stageId: string | number, courseId: number) => {
      setStages(prev => prev.map(s => {
          if (s.id === stageId) {
              return { ...s, courses: s.courses.filter(c => c.id !== courseId) };
          }
          return s;
      }));
  };

  const handleDeleteStage = (stageId: string | number) => {
      if (typeof stageId === 'number') {
          setDeletedStageIds(prev => [...prev, stageId]);
      }
      setStages(prev => prev.filter(s => s.id !== stageId));
  };

  const handleSaveRoute = async () => {
    try {
        setLoading(true);
        if (!selectedMentors.length || !routeName) {
            setLoading(false);
            return;
        }

        let currentRouteId: number;

        if (isEditMode) {
            currentRouteId = Number(adaptationRouteId);

            // 1. Удаляем удалённые этапы
            for (const id of deletedStageIds) {
                await adaptationService.deleteStage(id);
            }
            setDeletedStageIds([]);

            // 2. Обновляем существующие этапы (числовой ID)
            for (const stage of stages) {
                if (typeof stage.id === 'number') {
                    try {
                        await adaptationService.updateStage(stage.id, {
                            title: stage.title,
                            description: stage.description,
                            orderIndex: stages.indexOf(stage) + 1
                        });
                    } catch (err) {
                        console.warn(`Не удалось обновить этап ${stage.id}`);
                    }
                }
            }

            // 3. Добавляем новые этапы (строковый ID) одним батч-запросом
            const newStagesToAdd = stages
                .filter(s => typeof s.id === 'string')
                .map((s) => ({
                    title: s.title || `Этап ${stages.indexOf(s) + 1}`,
                    description: s.description || '',
                    orderIndex: stages.indexOf(s) + 1
                }));

            if (newStagesToAdd.length > 0) {
                try {
                    await adaptationService.addStages(currentRouteId, newStagesToAdd);
                } catch (err) {
                    console.error('Не удалось добавить новые этапы:', err);
                    // Продолжаем — сохраняем курсы и данные маршрута для существующих этапов
                }
            }

            // 4. Обновляем основные данные маршрута
            const routeData = {
                title: routeName,
                description: routeDesc,
                mentorId: selectedMentors[0].id,
                userIds: selectedEmployees.map(e => e.id).filter(id => !!id),
                status: routeStatus
            };
            await adaptationService.updateRoute(currentRouteId, routeData);

        } else {
            const routeData = {
              title: routeName.trim(),
              description: routeDesc.trim(),
              mentorId: selectedMentors[0].id,
              // Очищаем массив пользователей от возможных пустых значений
              userIds: selectedEmployees
                  .map(e => Number(e.id))
                  .filter(id => !isNaN(id) && id > 0), 
              status: 'active'
          };

          const res = await adaptationService.createRoute(routeData);
          currentRouteId = res.routeId;

          const stagesToSave = stages.map((s, idx) => ({
              title: s.title || `Этап ${idx + 1}`,
              description: s.description || '',
              orderIndex: idx + 1
          }));
          if (stagesToSave.length > 0) {
              try {
                  await adaptationService.addStages(currentRouteId, stagesToSave);
              } catch (err) {
                  console.error('Не удалось добавить этапы:', err);
              }
          }
        }

        // Получаем свежие данные маршрута, чтобы знать ID только что созданных этапов
        const fullRouteFromDb = await adaptationService.getRoute(currentRouteId);

        const existingDbStageIds = new Set(
            stages.filter(s => typeof s.id === 'number').map(s => s.id as number)
        );
        const newDbStages = [...fullRouteFromDb.stages]
            .filter(s => !existingDbStageIds.has(s.id))
            .sort((a, b) => a.orderIndex - b.orderIndex);

        const stageDbIdMap = new Map<string | number, number>();
        stages.filter(s => typeof s.id === 'number').forEach(s => stageDbIdMap.set(s.id, s.id as number));

        let newStageIdx = 0;
        stages.filter(s => typeof s.id === 'string').forEach(s => {
            if (newDbStages[newStageIdx]) {
                stageDbIdMap.set(s.id, newDbStages[newStageIdx].id);
                newStageIdx++;
            }
        });

        // Привязываем курсы к правильным этапам
        const currentCourseIdsInUI = stages.flatMap(s => s.courses.map(c => c.id));

        for (const stage of stages) {
            const dbStageId = stageDbIdMap.get(stage.id);
            if (dbStageId === undefined || stage.courses.length === 0) continue;

            for (let j = 0; j < stage.courses.length; j++) {
                const fullCourse = allCourses.find(ac => ac.id === stage.courses[j].id);
                if (fullCourse) {
                    await courseService.linkCourseToStage(fullCourse, dbStageId, j + 1);
                }
            }
        }

        // Отвязываем курсы, которые были удалены из этапов
        const coursesToUnlinkIds = originalCourseIds.filter(id => !currentCourseIdsInUI.includes(id));
        for (const id of coursesToUnlinkIds) {
            const fullCourse = allCourses.find(ac => ac.id === id);
            if (fullCourse) {
                await courseService.linkCourseToStage(fullCourse, null, 0);
            }
        }

        navigate('/edit/adaptationRoutes');
    } catch (e) {
        console.error("Ошибка при сохранении плана:", e);
        alert("Произошла ошибка при сохранении.");
    } finally {
        setLoading(false);
    }
  };

  const autoResize = (target: HTMLTextAreaElement) => {
    target.style.height = 'inherit';
    target.style.height = `${target.scrollHeight}px`;
  };

  const handleCreateCourseRedirect = (stageId: string | number) => {
    const draft = {
      routeName,
      routeDesc,
      routeStatus,
      selectedMentors,
      selectedEmployees,
      selectedDepartments,
      stages,
      deletedStageIds,
      originalCourseIds,
    };
    sessionStorage.setItem('route_draft', JSON.stringify(draft));
    navigate(`/edit/courses/new?returnToRoute=${adaptationRouteId}&stageId=${stageId}`);
  };

  if (loading) return <LoadingSpinner />;

  const filteredMentors = allUsers.filter(u => {
    const isMentor = u.role === 'Mentor' || u.role === 'HrAdmin';
    return isMentor && u.fullName.toLowerCase().includes(searchMentor.toLowerCase());
  }).slice(0, 20);

  const filteredEmployees = allUsers.filter(u => {
    const isUser = u.role === 'User' || !u.role;
    return isUser && u.fullName.toLowerCase().includes(searchEmployee.toLowerCase());
  }).slice(0, 20);

  const allDepartments = [...new Set(
    allUsers
      .filter(u => u.role === 'User' || !u.role)
      .map(u => u.department)
      .filter(Boolean)
  )] as string[];

  const filteredDepartments = allDepartments
    .filter(d => d.toLowerCase().includes(searchDepartment.toLowerCase()))
    .slice(0, 20);

  const handleSelectDepartment = (dept: string) => {
    if (selectedDepartments.includes(dept)) {
      setSearchDepartment('');
      setDepartmentDropdownOpen(false);
      return;
    }
    const deptUsers = allUsers.filter(u =>
      (u.role === 'User' || !u.role) && u.department === dept
    );
    setSelectedDepartments(prev => [...prev, dept]);
    setSelectedEmployees(prev => {
      const existingIds = new Set(prev.map(e => e.id));
      return [...prev, ...deptUsers.filter(u => !existingIds.has(u.id))];
    });
    setSearchDepartment('');
    setDepartmentDropdownOpen(false);
  };

  const handleRemoveDepartment = (dept: string) => {
    const deptUserIds = new Set(
      allUsers
        .filter(u => (u.role === 'User' || !u.role) && u.department === dept)
        .map(u => u.id)
    );
    setSelectedDepartments(prev => prev.filter(d => d !== dept));
    setSelectedEmployees(prev => prev.filter(u => !deptUserIds.has(u.id)));
  };

  // Фильтрация курсов (archived не показываем)
  const getFilteredCourses = (query: string) =>
    allCourses
        .filter(c => c.status !== 'archived' && c.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 15);

  const moveStage = (idx: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? idx - 1 : idx + 1;
    
      if (target < 0 || target >= stages.length) return;

      setStages(prevStages => {
          const newStages = [...prevStages];
          const temp = newStages[idx];
          newStages[idx] = newStages[target];
          newStages[target] = temp;
          return newStages;
      });
  };

  return (
    <>
      <section className="card text">
        <h2>{isEditMode ? 'Редактирование плана' : 'Информация о плане'}</h2>
        <div className="input-item">
          <h4>Название плана адаптации</h4>
          <input 
            className="input-field" 
            value={routeName}
            onChange={e => setRouteName(e.target.value)} 
            placeholder="Например: Адаптация нового сотрудника" 
          />
        </div>
        <div className="input-item">
          <h4>Описание</h4>
          <textarea
            ref={routeDescRef}
            className="textarea-field"
            value={routeDesc}
            onChange={e => {
              setRouteDesc(e.target.value);
              autoResize(e.target);
            }}
            placeholder="Укажите цели адаптации"
          />
        </div>
      </section>

      <section className="card text">
        <h2>Назначение сотрудников</h2>
        <div className="assignment-row">

          {/* Наставники */}
          <div className="assign-block input-item">
            <h4>Наставники</h4>
            <div className="search-container">
              <div style={{ position: 'relative' }}>
                <input
                  className="input-field"
                  value={searchMentor}
                  onChange={e => { setSearchMentor(e.target.value); setMentorDropdownOpen(true); }}
                  onFocus={() => setMentorDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setMentorDropdownOpen(false), 150)}
                  placeholder="Найти наставника..."
                />
                {mentorDropdownOpen && filteredMentors.length > 0 && (
                  <div className="search-results">
                    {filteredMentors.map(u => (
                      <div 
                        key={u.id} 
                        // Добавили класс search-item--row для флекс-сетки
                        className="search-item search-item--row" 
                        onMouseDown={e => e.preventDefault()} 
                        onClick={() => {
                          if (!selectedMentors.find(m => m.id === u.id)) setSelectedMentors([...selectedMentors, u]);
                          setSearchMentor('');
                          setMentorDropdownOpen(false);
                        }}
                      >
                        {/* Левая часть: Имя и Должность */}
                        <span>
                          {u.fullName}
                          <small>{u.position}</small>
                        </span>
                        
                        {/* Правая часть: Отдел (если есть) */}
                        {u.department && (
                          <small className="search-item-dept">{u.department}</small>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Вывод выбранных наставников */}
              {selectedMentors.length > 0 && (
                <div className="selected-employees-list">
                  {selectedMentors.map(m => (
                    <div key={m.id} className="employee-row employee-row--mentor">
                      <div className="employee-row-info">
                        <span className="employee-name">{m.fullName}</span>
                        {m.department && <span className="employee-dept">{m.department}</span>}
                      </div>
                      <img
                        src={cross}
                        className="remove-icon"
                        onClick={() => setSelectedMentors(selectedMentors.filter(x => x.id !== m.id))}
                        alt="x"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Сотрудники */}
          <div className="assign-block input-item">
            <h4>Сотрудники</h4>
            <div className="search-container">

              {/* Поиск по отделу */}
              <div style={{ position: 'relative' }}>
                <input
                  className="input-field"
                  value={searchDepartment}
                  onChange={e => { setSearchDepartment(e.target.value); setDepartmentDropdownOpen(true); }}
                  onFocus={() => setDepartmentDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setDepartmentDropdownOpen(false), 150)}
                  placeholder="Добавить сотрудников из отдела..."
                />
                {departmentDropdownOpen && (
                  <div className="search-results">
                    {filteredDepartments.length > 0
                      ? filteredDepartments.map(dept => (
                          <div key={dept} className={`search-item${selectedDepartments.includes(dept) ? ' selected' : ''}`}
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => handleSelectDepartment(dept)}
                          >
                            {dept}
                            {selectedDepartments.includes(dept) && <small>уже добавлен</small>}
                          </div>
                        ))
                      : <div className="search-item disabled">Отделы не найдены</div>
                    }
                  </div>
                )}
              </div>

              {/* Чипы выбранных отделов */}
              {selectedDepartments.length > 0 && (
                <div className="chips-display-zone">
                  {selectedDepartments.map(dept => (
                    <div key={dept} className="chip department-chip">
                      {dept}
                      <img src={cross} className="chip-remove-icon" onClick={() => handleRemoveDepartment(dept)} alt="x" />
                    </div>
                  ))}
                </div>
              )}

              {/* Поиск отдельных сотрудников */}
              <div className="assign-divider"><span>или добавить вручную</span></div>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-field"
                  value={searchEmployee}
                  onChange={e => { setSearchEmployee(e.target.value); setEmployeeDropdownOpen(true); }}
                  onFocus={() => setEmployeeDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setEmployeeDropdownOpen(false), 150)}
                  placeholder="Найти сотрудника..."
                />
                {employeeDropdownOpen && filteredEmployees.length > 0 && (
                  <div className="search-results">
                    {filteredEmployees.map(u => (
                      <div key={u.id} className={`search-item search-item--row${selectedEmployees.find(e => e.id === u.id) ? ' selected' : ''}`}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          if (!selectedEmployees.find(e => e.id === u.id)) setSelectedEmployees([...selectedEmployees, u]);
                          setSearchEmployee('');
                          setEmployeeDropdownOpen(false);
                        }}
                      >
                        <span>{u.fullName}<small>{u.position}</small></span>
                        {u.department && <small className="search-item-dept">{u.department}</small>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Список выбранных сотрудников */}
              {selectedEmployees.length > 0 && (
                <div className="selected-employees-list">
                  {selectedEmployees.map(u => (
                    <div key={u.id} className="employee-row">
                      <div className="employee-row-info">
                        <span className="employee-name">{u.fullName}</span>
                        {u.department && <span className="employee-dept">{u.department}</span>}
                      </div>
                      <img 
                        src={cross} 
                        className="remove-icon" 
                        onClick={() => setSelectedEmployees(selectedEmployees.filter(e => e.id !== u.id))} 
                        alt="x" 
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="card text">
        <h2>Этапы плана адаптации</h2>
        <div className="stages-list">
          {stages.map((stage, index) => (
            <div key={stage.id} className="stage-card">
              <div className="stage-card-header">
                <div className="stage-number">{index + 1}</div>
                <input 
                  className={"input-field"}
                  value={stage.title} 
                  placeholder="Название этапа..."
                  onChange={e => setStages(stages.map(s => s.id === stage.id ? {...s, title: e.target.value} : s))}
                />
                <div className="order-controls">
                  <button type="button" className="control-btn" onClick={() => moveStage(index, 'up')}><img src={upIcon} alt="U" /></button>
                  <button type="button" className="control-btn" onClick={() => moveStage(index, 'down')}><img src={downIcon} alt="D" /></button>
                  <button type="button" className="control-btn del-btn" onClick={() => handleDeleteStage(stage.id)}><img src={deleteIcon} alt="X" /></button>
                </div>
              </div>

              <div className="input-item">
                <h4>Описание этапа</h4>
                <textarea 
                  className="textarea-field"
                  value={stage.description}
                  onChange={e => {
                    setStages(stages.map(s => s.id === stage.id ? {...s, description: e.target.value} : s));
                    autoResize(e.target);
                  }}
                />
              </div>
              
              <div className="input-item">
                <h4>Добавить курс</h4>
                <button
                  className="add-test"
                  onClick={() => handleCreateCourseRedirect(stage.id)}
                >
                  + Создать новый курс
                </button>
                <div className="nested-courses">
                  {stage.courses.length > 0 && (
                    <div className="courses-grid">
                      {stage.courses.map(c => (
                        <div key={c.id} className="course-item-mini">
                          <span>{c.title}</span>
                          <img src={cross} className="remove-icon" onClick={() => handleRemoveCourse(stage.id, c.id)} alt="x" />
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* ВЫПАДАЮЩИЙ ПОИСК КУРСОВ */}
                  <div className="course-search-wrapper" style={{ position: 'relative' }}>
                    <div className="search-container course-search-wrapper">
                        <div style={{ position: 'relative' }}>
                            <input
                                className="input-field"
                                style={{ fontSize: '13px', padding: '8px 12px' }}
                                placeholder="Выбрать курс..."
                                value={activeStageId === stage.id ? courseSearchQuery : ''}
                                onFocus={() => {
                                    setActiveStageId(stage.id);
                                    setCourseSearchQuery('');
                                }}
                                onChange={e => {
                                    setCourseSearchQuery(e.target.value);
                                    setActiveStageId(stage.id);
                                }}
                            />
                            
                            <div 
                                className={`search-arrow ${activeStageId === stage.id ? 'open' : ''}`}
                                onClick={() => setActiveStageId(activeStageId === stage.id ? null : stage.id)}
                            >
                                <img className='search-dropdown' src={downIcon} alt="" />
                            </div>

                            {activeStageId === stage.id && (
                                <div className="search-results">
                                    {getFilteredCourses(courseSearchQuery).map(course => {
                                        const isSelected = stage.courses.find(sc => sc.id === course.id);
                                        return (
                                            <div 
                                                key={course.id} 
                                                className={`search-item ${isSelected ? 'selected' : ''}`} 
                                                onClick={() => {
                                                    if (!isSelected) {
                                                        setStages(stages.map(s => {
                                                            if (s.id === stage.id) {
                                                                return { ...s, courses: [...s.courses, { id: course.id, title: course.title }] };
                                                            }
                                                            return s;
                                                        }));
                                                    }
                                                    setActiveStageId(null);
                                                    setCourseSearchQuery('');
                                                }}
                                            >
                                                {course.title}
                                            </div>
                                        );
                                    })}
                                    {getFilteredCourses(courseSearchQuery).length === 0 && (
                                        <div className="search-item disabled">Курсы не найдены</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <button className="btn-add-stage-dashed" onClick={() => setStages([...stages, { id: Date.now().toString(), title: '', description: '', courses: [] }])}>
          + Добавить новый этап
        </button>
      </section>

      <div className="card-footer">
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Отмена</button>
        <button className="btn btn-primary" onClick={handleSaveRoute}>
            {isEditMode ? 'Сохранить изменения' : 'Создать план'}
        </button>
      </div>
    </>
  );
};

export default AdminEditAdaptationRoute;