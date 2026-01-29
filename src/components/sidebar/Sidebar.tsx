import { NavLink, useNavigate  } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';
import "./SideBar.css";
import logo from '@/assets/logo/Logo_En_Plus.svg';
import home from '@/assets/sidebar/home.svg';
import education from '@/assets/sidebar/education.png';
import file from '@/assets/sidebar/file.svg';
import contacts from '@/assets/sidebar/contacts.svg';
import people from '@/assets/sidebar/people.png';
import analysis from '@/assets/sidebar/analysis.png';

const ALLOWED_ROLES = ['HrAdmin', 'Mentor', 'SuperAdmin'];

const Sidebar = () => {
  const { user } = useUserStore();
  const navigate = useNavigate();

  const canEdit = user && ALLOWED_ROLES.includes(user.role);
  
  return (
    <aside className="sidebar">
      <nav className='sidebar-header'>
        <img src={logo} alt="Эн+ Диджитал"/>
      </nav>
      <nav className="sidebar-nav">
        <ul>
          <li>
            <NavLink to="/">
              <img src={home} className='icon' />
              Мой план адаптации
            </NavLink>
          </li>
          <li>
            <NavLink to="/courses">
              <img src={education} className='icon' />
              Обучение и тестирование
            </NavLink>
          </li>
          <li>
            <NavLink to="/files">
              <img src={file} className='icon' />
              Документы и ресурсы
            </NavLink>
          </li>
          <li>
            <NavLink to="/contacts">
              <img src={contacts} className='icon' />
              Контактная информация
            </NavLink>
          </li>
        </ul>
        <hr className="nav-separator" />
        <ul>
          <li>
            <NavLink to="/employees">
              <img src={people} className='icon' />
              Сотрудники
            </NavLink>
          </li>
          <li>
            <NavLink to="/analysis">
              <img src={analysis} className='icon' />
              Отчеты
            </NavLink>
          </li>
        </ul>
      </nav>
      {canEdit && (
        <button
          className="edit-button"
          onClick={() => navigate('/edit')}
        >
          Режим редактирования
        </button>
      )}
    </aside>
  );
};

export default Sidebar;