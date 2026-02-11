import React, { useState, useEffect } from 'react';
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
  const [activeCourseSearch, setActiveCourseSearch] = useState<{stageId: string | number, query: string} | null>(null);
  const [routeStatus, setRouteStatus] = useState('active');

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
          setDynamicTitle(route.title)
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

          // Запоминаем ID всех курсов, которые были в маршруте изначально
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
  }, [adaptationRouteId, isEditMode]);

  // Удаление курса
  const handleRemoveCourse = (stageId: string | number, courseId: number) => {
      setStages(prev => prev.map(s => {
          if (s.id === stageId) {
              return { ...s, courses: s.courses.filter(c => c.id !== courseId) };
          }
          return s;
      }));
  };

  // Удаление этапа
  const handleDeleteStage = (stageId: string | number) => {
      if (typeof stageId === 'number') {
          setDeletedStageIds(prev => [...prev, stageId]);
      }
      setStages(prev => prev.filter(s => s.id !== stageId));
  };

  const handleSaveRoute = async () => {
    try {
        setLoading(true);
        // Базовая валидация
        if (!selectedMentors.length || !routeName) {
            setLoading(false);
            return;
        }

        let currentRouteId: number;

        if (isEditMode) {
            currentRouteId = Number(adaptationRouteId);

            // 1. Сначала удаляем этапы, которые пользователь пометил на удаление
            for (const id of deletedStageIds) {
                await adaptationService.deleteStage(id);
            }
            setDeletedStageIds([]); // Очищаем список после удаления

            // 2. Обновляем существующие этапы или создаем новые, добавленные в процессе редактирования
            // Делаем это ДО обновления статуса самого маршрута
            for (const stage of stages) {
                if (typeof stage.id === 'number') {
                    try {
                        // Обновляем существующий этап
                        await adaptationService.updateStage(stage.id, {
                            title: stage.title,
                            description: stage.description,
                            order: stages.indexOf(stage) + 1
                        });
                    } catch (err) {
                        console.warn(`Не удалось обновить этап ${stage.id}, возможно он был удален или не изменен`);
                    }
                } else {
                    // Создаем новый этап (у него временный строковый ID)
                    await adaptationService.addStages(currentRouteId, [{
                        title: stage.title,
                        description: stage.description,
                        order: stages.indexOf(stage) + 1
                    }]);
                }
            }

            // 3. В ПОСЛЕДНЮЮ ОЧЕРЕДЬ обновляем основную информацию маршрута и его СТАТУС
            const routeData = {
                title: routeName,
                description: routeDesc,
                mentorId: selectedMentors[0].id,
                userIds: selectedEmployees.map(e => e.id).filter(id => !!id),
                status: routeStatus
            };
            console.log("SENDING TO BACKEND:", routeData);
            await adaptationService.updateRoute(currentRouteId, routeData);

        } else {
            // --- ЛОГИКА СОЗДАНИЯ НОВОГО МАРШРУТА ---
            const routeData = {
                title: routeName,
                description: routeDesc,
                mentorId: selectedMentors[0].id,
                userIds: selectedEmployees.map(e => e.id),
                status: 'active'
            };

            const res = await adaptationService.createRoute(routeData);
            currentRouteId = res.routeId;

            // Добавляем этапы для нового маршрута
            const stagesToSave = stages.map((s, idx) => ({
                title: s.title || `Этап ${idx + 1}`,
                description: s.description || '',
                order: idx + 1
            }));
            await adaptationService.addStages(currentRouteId, stagesToSave);
        }

        // --- СИНХРОНИЗАЦИЯ КУРСОВ (После того как все этапы точно созданы/обновлены) ---
        
        // Получаем актуальную структуру из БД, чтобы иметь правильные (числовые) ID новых этапов
        const fullRouteFromDb = await adaptationService.getRoute(currentRouteId);
        const currentCourseIdsInUI = stages.flatMap(s => s.courses.map(c => c.id));

        // 1. Привязываем/обновляем курсы к этапам
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

        // 2. Отвязываем курсы, которые были удалены из интерфейса
        const coursesToUnlink = originalCourseIds.filter(id => !currentCourseIdsInUI.includes(id));
        for (const id of coursesToUnlink) {
            await courseService.linkCourseToStage(id, null, 0);
        }

        // Успешное завершение
        navigate('/edit/adaptationRoutes');
    } catch (e) {
        console.error("Ошибка при сохранении маршрута:", e);
        alert("Произошла ошибка при сохранении. Проверьте корректность данных.");
    } finally {
        setLoading(false);
    }
  };

  const autoResize = (target: HTMLTextAreaElement) => {
    target.style.height = 'inherit';
    target.style.height = `${target.scrollHeight}px`;
  };

  if (loading) return <LoadingSpinner />;

  // --- ФИЛЬТРАЦИЯ ---
  // Наставники
  const filteredMentors = allUsers.filter(u => {
    // Если роль Mentor или (для теста) если ролей вообще нет, но мы ищем по имени
    const isMentor = u.role === 'Mentor' || u.role === 'HrAdmin'; 
    return isMentor && u.fullName.toLowerCase().includes(searchMentor.toLowerCase());
  }).slice(0, 5);

  // Сотрудники
  const filteredEmployees = allUsers.filter(u => {
    const isUser = u.role === 'User' || !u.role; // Если роль не указана, считаем User
    return isUser && u.fullName.toLowerCase().includes(searchEmployee.toLowerCase());
  }).slice(0, 5);

  const filteredCourses = (query: string) =>
    allCourses.filter(c => c.title.toLowerCase().includes(query.toLowerCase())).slice(0, 5);

  // Функции перемещения этапов
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
        <h2>Назначение сотрудников в план адаптации</h2>
        <div className="assignment-row">
          
          {/* Блок Наставников */}
          <div className="assign-block input-item">
            <h4>Наставники</h4>
            <div className="search-container">
              <div style={{ position: 'relative' }}> {/* Обертка для позиционирования результатов */}
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
                    <img 
                      src={cross} 
                      className="chip-remove-icon" 
                      onClick={() => setSelectedMentors(selectedMentors.filter(mentor => mentor.id !== m.id))} 
                      alt="remove" 
                    />
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
                    <img 
                      src={cross} 
                      className="chip-remove-icon" 
                      onClick={() => setSelectedEmployees(selectedEmployees.filter(e => e.id !== u.id))} 
                      alt="x" 
                    />
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
                  placeholder="Например: Знакомство с культурой компании"
                  onChange={e => setStages(stages.map(s => s.id === stage.id ? {...s, title: e.target.value} : s))}
                />
                <div className="order-controls">
                  <button className="control-btn" onClick={() => moveStage(index, 'up')} title="Вверх">
                    <img src={upIcon} alt="U" />
                  </button>
                  <button className="control-btn" onClick={() => moveStage(index, 'down')} title="Вниз">
                    <img src={downIcon} alt="D" />
                  </button>
                  <button 
                      className="control-btn del-btn" 
                      onClick={() => handleDeleteStage(stage.id)}
                      title="Удалить этап"
                  >
                      <img src={deleteIcon} alt="X" />
                  </button>
                </div>
              </div>

              <div className="input-item">
                <h4>Описание эпапа</h4>
                <textarea 
                  className="textarea-field"
                  value={stage.description}
                  placeholder="О чем должен узнать сотрудник на этом шаге? (например: график работы и дресс-код)..."
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
                          <img 
                            src={cross} 
                            className="remove-icon" 
                            onClick={() => handleRemoveCourse(stage.id, c.id)}
                            alt="x" 
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="course-search-container" style={{ position: 'relative' }}>
                    <input
                      className="input-field"
                      style={{ fontSize: '13px', padding: '8px 12px' }}
                      placeholder="Введите название курса..."
                      value={activeCourseSearch?.stageId === stage.id ? activeCourseSearch.query : ''}
                      onChange={e => setActiveCourseSearch({ stageId: stage.id, query: e.target.value })}
                    />
                    {activeCourseSearch?.stageId === stage.id && activeCourseSearch.query && (
                      <div className="search-results">
                        {filteredCourses(activeCourseSearch.query).map(course => (
                          <div key={course.id} className="search-item" onClick={() => {
                            setStages(stages.map(s => {
                              if (s.id === stage.id && !s.courses.find(c => c.id === course.id)) {
                                return { ...s, courses: [...s.courses, { id: course.id, title: course.title }] };
                              }
                              return s;
                            }));
                            setActiveCourseSearch(null);
                          }}>
                            {course.title}
                          </div>
                        ))}
                      </div>
                    )}
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