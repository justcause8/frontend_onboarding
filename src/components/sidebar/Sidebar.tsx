import { NavLink } from 'react-router-dom';
import logo from '@/assets/logo/Logo_En_Plus.svg';
import "./SideBar.css";

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <nav className='sidebar-header'><img src={logo} alt="Эн+ Диджитал"/></nav>
      <nav className="sidebar-nav">
        <ul>
          <li><NavLink to="/">Мой план адаптации</NavLink></li>
          <li><NavLink to="/courses">Обучение и тестирование</NavLink></li>
          <li><NavLink to="/docs">Документы и ресурсы</NavLink></li>
          <li><NavLink to="/contacts">Контактная информация</NavLink></li>
        </ul>
        <hr className="nav-separator" />
        <ul>
          <li><NavLink to="/employees">Сотрудники</NavLink></li>
          <li><NavLink to="/anal">Отчеты</NavLink></li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;