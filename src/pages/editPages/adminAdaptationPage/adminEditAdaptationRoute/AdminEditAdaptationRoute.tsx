import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
// Используем import type для соответствия правилу verbatimModuleSyntax
import { adaptationService } from '../../../../services/adaptation.service';
import type { UserShort, CourseBase } from '../../../../services/adaptation.service';

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
  id: string; // Временный ID (Date.now())
  title: string;
  description: string;
  courses: SelectedCourse[];
}

export const AdminEditAdaptationRoute: React.FC = () => {
  const navigate = useNavigate();
  const { adaptationRouteId } = useParams<{ adaptationRouteId: string }>();
  
  const [allUsers, setAllUsers] = useState<UserShort[]>([]);
  const [allCourses, setAllCourses] = useState<CourseBase[]>([]);
  
  const [routeName, setRouteName] = useState('');
  const [routeDesc, setRouteDesc] = useState('');
  
  const [selectedMentors, setSelectedMentors] = useState<UserShort[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<UserShort[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);

  const [searchMentor, setSearchMentor] = useState('');
  const [searchEmployee, setSearchEmployee] = useState('');
  const [activeCourseSearch, setActiveCourseSearch] = useState<{stageId: string, query: string} | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const u = await adaptationService.getAllUsers();
      console.log("Загруженные пользователи:", u);
      setAllUsers(u);
      try {
        const [u, c] = await Promise.all([
          adaptationService.getAllUsers(),
          adaptationService.getAllCourses()
        ]);
        setAllUsers(u);
        setAllCourses(c);

        // Если мы редактируем существующий (не 'new'), можно загрузить данные здесь
        if (adaptationRouteId && adaptationRouteId !== 'new') {
            const route = await adaptationService.getRoute(Number(adaptationRouteId));
            setRouteName(route.title);
            setRouteDesc(route.description);
            // ... заполнение остальных полей
        }
      } catch (e) {
        console.error("Ошибка загрузки данных", e);
      }
    };
    loadData();
  }, [adaptationRouteId]);

  // --- ЛОГИКА СОХРАНЕНИЯ ---
  const handleSaveRoute = async () => {
    try {
      if (!selectedMentors.length) return alert("Выберите наставника");
      if (!routeName) return alert("Введите название маршрута");

      // 1. Создаем маршрут
      const routeRes = await adaptationService.createRoute({
        title: routeName,
        description: routeDesc,
        mentorId: selectedMentors[0].id,
        userIds: selectedEmployees.map(e => e.id)
      });
      
      const newRouteId = routeRes.routeId; 

      // 2. Создаем этапы (добавляем order)
      const stagesToSave = stages.map((s, idx) => ({
        title: s.title || `Этап ${idx + 1}`,
        description: s.description || '',
        order: idx + 1
      }));

      await adaptationService.addStages(newRouteId, stagesToSave);
      
      // 3. Привязываем курсы
      const fullRoute = await adaptationService.getRoute(newRouteId);
      
      for (let i = 0; i < stages.length; i++) {
        const dbStage = fullRoute.stages[i]; // Бэкенд возвращает их в порядке order
        const frontStage = stages[i];
        
        if (dbStage && frontStage.courses.length > 0) {
          for (let j = 0; j < frontStage.courses.length; j++) {
            await adaptationService.linkCourseToStage(
              frontStage.courses[j].id, 
              dbStage.id, 
              j + 1
            );
          }
        }
      }

      alert("Маршрут успешно сохранен!");
      navigate('/edit/adaptationRoutes');
    } catch (e) {
      console.error(e);
      alert("Ошибка при сохранении");
    }
  };

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
    <div className="edit-page-container">
      <section className="card">
        <h2>Информация о маршруте</h2>
        <div className="input-group">
            <label className="section-label">Название маршрута</label>
            <input className="input-field" value={routeName} onChange={e => setRouteName(e.target.value)} placeholder="Название" />
        </div>
        <div className="input-group">
            <label className="section-label">Описание</label>
            <textarea className="textarea-field" value={routeDesc} onChange={e => setRouteDesc(e.target.value)} placeholder="Описание" />
        </div>
      </section>

      <section className="card">
        <h2>Назначения</h2>
        <div className="assignment-row">
          <div className="assign-block">
            <label className="section-label">Наставник (Mentor)</label>
            <input 
              className="search-input" 
              value={searchMentor} 
              onChange={e => setSearchMentor(e.target.value)} 
              placeholder="Поиск наставника..." 
            />
            {searchMentor && (
              <div className="search-results">
                {filteredMentors.map(u => (
                  <div key={u.id} className="search-item" onClick={() => {
                    setSelectedMentors([u]);
                    setSearchMentor('');
                  }}>
                    {u.fullName} <small style={{opacity: 0.6}}>{u.position}</small>
                  </div>
                ))}
              </div>
            )}
            <div className="chips-container">
              {selectedMentors.map(m => (
                <div key={m.id} className="chip">
                    {m.fullName} 
                    <img src={cross} className="chip-remove-icon" onClick={() => setSelectedMentors([])} alt="x" />
                </div>
              ))}
            </div>
          </div>

          <div className="assign-block">
            <label className="section-label">Сотрудники (User)</label>
            <input 
              className="search-input" 
              value={searchEmployee} 
              onChange={e => setSearchEmployee(e.target.value)} 
              placeholder="Поиск сотрудников..." 
            />
            {searchEmployee && (
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
            <div className="chips-container">
              {selectedEmployees.map(u => (
                <div key={u.id} className="chip">
                  {u.fullName} 
                  <img src={cross} className="chip-remove-icon" onClick={() => setSelectedEmployees(selectedEmployees.filter(e => e.id !== u.id))} alt="x" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Этапы адаптации</h2>
        <div className="stages-list">
            {stages.map((stage, index) => (
            <div key={stage.id} className="stage-card">
                <div className="stage-card-header">
                    <div className="stage-number">{index + 1}</div>
                    <input 
                    className="stage-title-input" 
                    value={stage.title} 
                    placeholder="Заголовок этапа"
                    onChange={e => setStages(stages.map(s => s.id === stage.id ? {...s, title: e.target.value} : s))}
                    />
                    <div className="order-controls">
                        <button onClick={() => moveStage(index, 'up')}><img src={upIcon} alt="U" /></button>
                        <button onClick={() => moveStage(index, 'down')}><img src={downIcon} alt="D" /></button>
                        <button className="del-btn" onClick={() => setStages(stages.filter(s => s.id !== stage.id))}>
                            <img src={deleteIcon} alt="X" />
                        </button>
                    </div>
                </div>
                
                <div className="nested-courses">
                {stage.courses.map(c => (
                    <div key={c.id} className="course-item-mini">
                        {c.title}
                        <img 
                            src={cross} 
                            className="course-remove-icon" 
                            onClick={() => setStages(stages.map(s => s.id === stage.id ? {...s, courses: s.courses.filter(crs => crs.id !== c.id)} : s))} 
                            alt="x" 
                        />
                    </div>
                ))}
                
                <div className="course-search-container">
                    <input 
                    className="search-input"
                    style={{fontSize: '13px'}}
                    placeholder="+ Привязать курс..."
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
            ))}
        </div>
        <button className="btn-add-stage-dashed" onClick={() => setStages([...stages, { id: Date.now().toString(), title: '', description: '', courses: [] }])}>
          + Добавить новый этап
        </button>
      </section>

      <div className="card-footer">
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Отмена</button>
        <button className="btn btn-primary" onClick={handleSaveRoute}>Сохранить маршрут</button>
      </div>
    </div>
  );
};

export default AdminEditAdaptationRoute;