import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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
  
  const [loading, setLoading] = useState(isEditMode);
  const [allUsers, setAllUsers] = useState<UserShort[]>([]);
  const [allCourses, setAllCourses] = useState<CourseBase[]>([]);
  
  const [deletedStageIds, setDeletedStageIds] = useState<number[]>([]);
  const [originalCourseIds, setOriginalCourseIds] = useState<number[]>([]);

  const [routeName, setRouteName] = useState('');
  const [routeDesc, setRouteDesc] = useState('');
  const [selectedMentors, setSelectedMentors] = useState<UserShort[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<UserShort[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);

  const [searchMentor, setSearchMentor] = useState('');
  const [searchEmployee, setSearchEmployee] = useState('');
  const [routeStatus, setRouteStatus] = useState('active');

  // --- Состояния для выпадающего списка курсов ---
  const [activeStageId, setActiveStageId] = useState<string | number | null>(null);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        if (!isEditMode) {
          setDynamicTitle('Создание адаптационного маршрута');
        }
        const [users, courses] = await Promise.all([
          userService.getAllUsers(),
          courseService.getAllCoursesAdmin()
        ]);
        setAllUsers(users);
        setAllCourses(courses);

        if (isEditMode) {
          const route = await adaptationService.getRoute(Number(adaptationRouteId));
          setRouteName(route.title);
          setDynamicTitle(route.title);
          setRouteDesc(route.description);
          setRouteStatus(route.status || 'active');
          
          if (route.mentor) {
              setSelectedMentors([{
                  id: route.mentor.id,
                  fullName: (route.mentor as any).name || route.mentor.fullName,
                  position: route.mentor.position || 'Наставник'
              }]);
          }
          
          const employees = (route.assignedEmployees || []).map((u: any) => ({
              id: u.id,
              fullName: u.name || u.fullName,
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
  }, [adaptationRouteId, isEditMode, setDynamicTitle]);

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
            for (const id of deletedStageIds) {
                await adaptationService.deleteStage(id);
            }
            setDeletedStageIds([]);

            for (const stage of stages) {
                if (typeof stage.id === 'number') {
                    try {
                        await adaptationService.updateStage(stage.id, {
                            title: stage.title,
                            description: stage.description,
                            order: stages.indexOf(stage) + 1
                        });
                    } catch (err) {
                        console.warn(`Не удалось обновить этап ${stage.id}`);
                    }
                } else {
                    await adaptationService.addStages(currentRouteId, [{
                        title: stage.title,
                        description: stage.description,
                        order: stages.indexOf(stage) + 1
                    }]);
                }
            }

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
                title: routeName,
                description: routeDesc,
                mentorId: selectedMentors[0].id,
                userIds: selectedEmployees.map(e => e.id),
                status: 'active'
            };

            const res = await adaptationService.createRoute(routeData);
            currentRouteId = res.routeId;

            const stagesToSave = stages.map((s, idx) => ({
                title: s.title || `Этап ${idx + 1}`,
                description: s.description || '',
                order: idx + 1
            }));
            await adaptationService.addStages(currentRouteId, stagesToSave);
        }

        const fullRouteFromDb = await adaptationService.getRoute(currentRouteId);
        const currentCourseIdsInUI = stages.flatMap(s => s.courses.map(c => c.id));

        for (let i = 0; i < stages.length; i++) {
            const dbStage = fullRouteFromDb.stages[i]; 
            const frontStage = stages[i];
            
            if (dbStage && frontStage.courses.length > 0) {
                for (let j = 0; j < frontStage.courses.length; j++) {
                    await courseService.linkCourseToStage(
                        frontStage.courses[j].id, 
                        dbStage.id, 
                        j + 1
                    );
                }
            }
        }

        const coursesToUnlink = originalCourseIds.filter(id => !currentCourseIdsInUI.includes(id));
        for (const id of coursesToUnlink) {
            await courseService.linkCourseToStage(id, null, 0);
        }

        navigate('/edit/adaptationRoutes');
    } catch (e) {
        console.error("Ошибка при сохранении маршрута:", e);
        alert("Произошла ошибка при сохранении.");
    } finally {
        setLoading(false);
    }
  };

  const autoResize = (target: HTMLTextAreaElement) => {
    target.style.height = 'inherit';
    target.style.height = `${target.scrollHeight}px`;
  };

  if (loading) return <LoadingSpinner />;

  const filteredMentors = allUsers.filter(u => {
    const isMentor = u.role === 'Mentor' || u.role === 'HrAdmin'; 
    return isMentor && u.fullName.toLowerCase().includes(searchMentor.toLowerCase());
  }).slice(0, 5);

  const filteredEmployees = allUsers.filter(u => {
    const isUser = u.role === 'User' || !u.role;
    return isUser && u.fullName.toLowerCase().includes(searchEmployee.toLowerCase());
  }).slice(0, 5);

  // Фильтрация курсов
  const getFilteredCourses = (query: string) =>
    allCourses
        .filter(c => c.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 15);

  const moveStage = (idx: number, dir: 'up' | 'down') => {
    const newStages = [...stages];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= newStages.length) return;
    [newStages[idx], newStages[target]] = [newStages[target], newStages[idx]];
    setStages(newStages);
  }

  return (
    <>
      <section className="card text">
        <h2>{isEditMode ? 'Редактирование маршрута' : 'Информация о маршруте'}</h2>
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
            className="textarea-field"
            value={routeDesc} 
            onChange={e => {
              setRouteDesc(e.target.value);
              autoResize(e.target);
            }}
            placeholder="Укажите цели адаптации " 
          />
        </div>
      </section>

      <section className="card text">
        <h2>Назначение сотрудников</h2>
        <div className="assignment-row">
          
          {/* Блок Наставников */}
          <div className="assign-block input-item">
            <h4>Наставники</h4>
            <div className="search-container">
              <div style={{ position: 'relative' }}>
                <input 
                  className="input-field" 
                  value={searchMentor} 
                  onChange={e => setSearchMentor(e.target.value)} 
                  placeholder="Добавить наставника..." 
                />
                {searchMentor && filteredMentors.length > 0 && (
                  <div className="search-results">
                    {filteredMentors.map(u => (
                      <div key={u.id} className="search-item" onClick={() => {
                        if (!selectedMentors.find(m => m.id === u.id)) {
                          setSelectedMentors([...selectedMentors, u]);
                        }
                        setSearchMentor('');
                      }}>
                        {u.fullName} <small>{u.position}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="chips-display-zone">
                {selectedMentors.map(m => (
                  <div key={m.id} className="chip mentor-chip">
                    {m.fullName}
                    <img src={cross} className="chip-remove-icon" onClick={() => setSelectedMentors(selectedMentors.filter(mentor => mentor.id !== m.id))} alt="remove" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Блок Сотрудников */}
          <div className="assign-block input-item">
            <h4>Сотрудники</h4>
            <div className="search-container">
              <div style={{ position: 'relative' }}>
                <input 
                  className="input-field" 
                  value={searchEmployee} 
                  onChange={e => setSearchEmployee(e.target.value)} 
                  placeholder="Добавить сотрудника..." 
                />
                {searchEmployee && filteredEmployees.length > 0 && (
                  <div className="search-results">
                    {filteredEmployees.map(u => (
                      <div key={u.id} className="search-item" onClick={() => {
                        if (!selectedEmployees.find(e => e.id === u.id)) {
                          setSelectedEmployees([...selectedEmployees, u]);
                        }
                        setSearchEmployee('');
                      }}>
                        {u.fullName}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="chips-display-zone">
                {selectedEmployees.map(u => (
                  <div key={u.id} className="chip">
                    {u.fullName} 
                    <img src={cross} className="chip-remove-icon" onClick={() => setSelectedEmployees(selectedEmployees.filter(e => e.id !== u.id))} alt="x" />
                  </div>
                ))}
              </div>
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
                  <button className="control-btn" onClick={() => moveStage(index, 'up')}><img src={upIcon} alt="U" /></button>
                  <button className="control-btn" onClick={() => moveStage(index, 'down')}><img src={downIcon} alt="D" /></button>
                  <button className="control-btn del-btn" onClick={() => handleDeleteStage(stage.id)}><img src={deleteIcon} alt="X" /></button>
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
                                placeholder="Найти или выбрать курс из списка..."
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
            {isEditMode ? 'Сохранить изменения' : 'Создать маршрут'}
        </button>
      </div>
    </>
  );
};

export default AdminEditAdaptationRoute;