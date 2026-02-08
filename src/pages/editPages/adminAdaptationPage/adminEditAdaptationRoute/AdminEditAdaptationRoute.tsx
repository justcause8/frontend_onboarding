import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminEditAdaptationRoute.css';


interface Course {
  id: string;
  title: string;
}

interface Stage {
  id: string;
  title: string;
  description: string;
}

export const AdminEditAdaptationRoute: React.FC = () => {
  const navigate = useNavigate();

  const [routeName, setRouteName] = useState('');
  const [routeDesc, setRouteDesc] = useState('');
  const [mentors, setMentors] = useState<string[]>(['Колесников Тимофей Игоревич']);
  const [users, setUsers] = useState<string[]>(['Егоров Фёдор Иванович', 'Морозов Максим Григорьевич']);
  const [stages, setStages] = useState<Stage[]>([]);
  const [routeCourses, setRouteCourses] = useState<Course[]>([]);

  // --- Вспомогательная функция перемещения ---
  const moveItem = <T,>(list: T[], setList: (items: T[]) => void, index: number, direction: 'up' | 'down') => {
    const newList = [...list];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newList.length) return;

    [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
    setList(newList);
  };

  // --- Функции для Этапов ---
  const addStage = () => {
    const newStage: Stage = {
      id: Date.now().toString(),
      title: '',
      description: ''
    };
    setStages([...stages, newStage]);
  };

  const removeStage = (id: string) => {
    setStages(stages.filter(s => s.id !== id));
  };

  const updateStage = (id: string, field: keyof Stage, value: string) => {
    setStages(stages.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // --- Функции для Курсов ---
  const addRouteCourse = () => {
    const courseTitle = prompt('Введите название курса:');
    if (!courseTitle) return;

    setRouteCourses([...routeCourses, {
      id: Date.now().toString(),
      title: courseTitle
    }]);
  };

  const removeRouteCourse = (id: string) => {
    setRouteCourses(routeCourses.filter(c => c.id !== id));
  };

  const handleSave = () => {
    console.log('Данные для отправки:', { routeName, routeDesc, mentors, users, stages, routeCourses });
    navigate('/admin');
  };

  return (
    <div className="edit-page-container">
      <div className="edit-card">
        
        {/* Название и описание */}
        <div className="form-section">
          <label className="section-label">Название маршрута</label>
          <input
            className="input-field"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            placeholder="Введите название"
          />
        </div>

        <div className="form-section">
          <label className="section-label">Описание маршрута</label>
          <textarea
            className="textarea-field"
            value={routeDesc}
            onChange={(e) => setRouteDesc(e.target.value)}
            placeholder="Введите описание"
          />
        </div>

        {/* Наставники */}
        <div className="form-section">
          <label className="section-label">Назначить наставника</label>
          <input className="input-field search-icon" placeholder="Поиск по имени" />
          <div className="chips-container">
            {mentors.map((m, i) => (
              <div key={i} className="chip">
                {m} 
                <button className="chip-delete-btn" onClick={() => setMentors(mentors.filter((_, idx) => idx !== i))}>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Пользователи */}
        <div className="form-section">
          <label className="section-label">Назначить пользователей</label>
          <input className="input-field search-icon" placeholder="Поиск по имени" />
          <div className="chips-container">
            {users.map((u, i) => (
              <div key={i} className="chip">
                {u} 
                <button className="chip-delete-btn" onClick={() => setUsers(users.filter((_, idx) => idx !== i))}>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Блок добавления этапа */}
        <div className="add-placeholder-dashed">
          <p className="placeholder-text">Добавить этап маршрута</p>
          <div className="placeholder-btns">
            <button className="btn-secondary" onClick={addStage}>Создать новый</button>
          </div>
        </div>

        {/* Список этапов */}
        {stages.map((stage, index) => (
          <div key={stage.id} className="stage-block">
            <div className="stage-header">
              <span className="stage-title-label">Название этапа</span>
              <div className="stage-actions">
                <button className="action-icon-btn" onClick={() => moveItem(stages, setStages, index, 'up')}>
                </button>
                <button className="action-icon-btn" onClick={() => moveItem(stages, setStages, index, 'down')}>
                </button>
                <button className="action-icon-btn close" onClick={() => removeStage(stage.id)}>
                </button>
              </div>
            </div>

            <input
              className="stage-inner-input"
              value={stage.title}
              onChange={(e) => updateStage(stage.id, 'title', e.target.value)}
              placeholder="Введите название"
            />

            <span className="stage-title-label label-mt">Описание этапа</span>
            <textarea
              className="stage-inner-input"
              value={stage.description}
              onChange={(e) => updateStage(stage.id, 'description', e.target.value)}
              placeholder="Введите описание"
            />
          </div>
        ))}

        {/* Блок добавления курса */}
        <div className="add-placeholder-dashed mt-large">
          <p className="placeholder-text">Добавить существующий обучающий курс</p>
          <div className="placeholder-btns">
            <button className="btn-secondary" onClick={addRouteCourse}>Выбрать существующий</button>
          </div>
        </div>

        {/* Список курсов */}
        {routeCourses.map((course, index) => (
          <div key={course.id} className="course-row">
            <span className="course-name">Курс: "{course.title}"</span>
            <div className="stage-actions">
              <button className="action-icon-btn" onClick={() => moveItem(routeCourses, setRouteCourses, index, 'up')}>
              </button>
              <button className="action-icon-btn" onClick={() => moveItem(routeCourses, setRouteCourses, index, 'down')}>
              </button>
              <button className="action-icon-btn close" onClick={() => removeRouteCourse(course.id)}>
              </button>
            </div>
          </div>
        ))}

        <div className="footer-bar">
          <button className="save-btn" onClick={handleSave}>
            <span className="check-mark">✓</span> СОХРАНИТЬ
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminEditAdaptationRoute;