import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';
import "./SideBar.css";
import logo from '@/assets/logo/Logo_En_Plus.svg';
import home from '@/assets/sidebar/home.svg';
import education from '@/assets/sidebar/education.png';
import file from '@/assets/sidebar/file.svg';
import contacts from '@/assets/sidebar/contacts.svg';
import people from '@/assets/sidebar/people.png';
import analysis from '@/assets/sidebar/analysis.png';
import request from '../../assets/sidebar/request.png';

const ALLOWED_ROLES = ['HrAdmin', 'Mentor', 'SuperAdmin'];

const Sidebar = () => {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();

  const canEdit = user && ALLOWED_ROLES.includes(user.role);

  // Режим редактирования теперь определяется по пути /edit
  const isEditMode = location.pathname.startsWith('/edit');

  const handleModeToggle = () => {
    if (isEditMode) {
      navigate('/'); // Возврат в обычный режим
    } else {
      navigate('/edit/adaptationRoutes'); // Переход в админку
    }
  };

  return (
    <aside className="sidebar">
      <nav className='sidebar-header'>
        <img src={logo} alt="Эн+ Диджитал" style={isEditMode ? { filter: 'grayscale(1) brightness(2)' } : {}}  />
      </nav>
      
      <nav className="sidebar-nav">
        {!isEditMode ? (
          /* ОБЫЧНЫЙ РЕЖИМ */
          <ul>
            <li>
              <NavLink to="/">
                <img src={home} className='icon' alt="" />
                Мой план адаптации
              </NavLink>
            </li>
            <li>
              <NavLink to="/courses">
                <img src={education} className='icon' alt="" />
                Обучение и тестирование
              </NavLink>
            </li>
            <li>
              <NavLink to="/files">
                <img src={file} className='icon' alt="" />
                Документы и ресурсы
              </NavLink>
            </li>
            <li>
              <NavLink to="/contacts">
                <img src={contacts} className='icon' alt="" />
                Контактная информация
              </NavLink>
            </li>
            <hr className="nav-separator" />
            <li>
              <NavLink to="/employees">
                <img src={people} className='icon' alt="" />
                Сотрудники
              </NavLink>
            </li>
            <li>
              <NavLink to="/analysis">
                <img src={analysis} className='icon' alt="" />
                Отчеты
              </NavLink>
            </li>
          </ul>
        ) : (
          /* РЕЖИМ РЕДАКТИРОВАНИЯ (пути из вашего App.tsx) */
          <ul>
            <li>
              <NavLink to="/edit/adaptationRoutes">
                <img src={home} className='icon' alt="" />
                Маршруты
              </NavLink>
            </li>
            <li>
              <NavLink to="/edit/Courses">
                <img src={education} className='icon' alt="" />
                Обучающие курсы
              </NavLink>
            </li>
            <li>
              <NavLink to="/edit/tests">
                <img src={analysis} className='icon' alt="" />
                Тесты
              </NavLink>
            </li>
            <li>
              <NavLink to="/edit/users">
                <img src={people} className='icon' alt="" />
                Пользователи
              </NavLink>
            </li>
            <li>
              <NavLink to="/edit/requests">
                <img src={request} className='icon' alt="" />
                Заявки
              </NavLink>
            </li>
          </ul>
        )}
      </nav>

      {canEdit && (
        <button
          className={`edit-button ${isEditMode ? 'active' : ''}`}
          onClick={handleModeToggle}
        >
          {isEditMode ? 'Обычный режим' : 'Режим редактирования'}
        </button>
      )}
    </aside>
  );
};

export default Sidebar;