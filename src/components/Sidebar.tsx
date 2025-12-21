import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">ЭН<span>+</span> диджитал</div>
      </div>
      <nav className="sidebar-nav">
        <ul>
          <li><NavLink to="/dashboard">Личный кабинет</NavLink></li>
          <li><NavLink to="/">Мой план адаптации</NavLink></li>
          <li><NavLink to="/courses">Обучение и тестирование</NavLink></li>
          <li><NavLink to="/docs">Документы и ресурсы</NavLink></li>
        </ul>
        <hr className="nav-separator" />
        <ul>
          <li><NavLink to="/employees">Сотрудники</NavLink></li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;