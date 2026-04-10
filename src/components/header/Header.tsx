import { useUserStore } from '../../store/useUserStore';
import { Link, useLocation } from 'react-router-dom';
import { getPageTitle, getBreadcrumbs } from '../../utils/routeUtils';
import { usePageTitle } from '../../contexts/PageTitleContext';
import './Header.css';

const EDIT_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const Header = () => { // Убираем props
  const { user, loginAs, logout } = useUserStore();
  const location = useLocation();
  const { dynamicTitle } = usePageTitle(); // Получаем динамическое название из контекста
  
  // Получаем заголовок и хлебные крошки
  const pageTitle = getPageTitle(location.pathname, dynamicTitle);
  const breadcrumbs = getBreadcrumbs(location.pathname, dynamicTitle);

  const handleLoginAs = () => {
    const login = prompt("Введите логин сотрудника (например, ivanov_ii):");
    if (login) {
      loginAs(login);
    }
  };

  return (
    <div className="header-wrapper">
      <header className="header">
        <div className="header-left">
          <h1 className="header-title">{pageTitle}</h1>
        </div>

        <div className="header-user">
          <div className="dev-buttons">
            <button onClick={handleLoginAs}>Войти как...</button>
            {user && user.role !== 'None' && (
              <button className="logout-btn" onClick={logout}>Выйти</button>
            )}
          </div>

          {user && user.role !== 'None' ? (
            <div className="user-profile">
              <div className="avatar">
                {user.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase() || '??'}
              </div>
              <div className="user-info">
                <span className="user-name">{user.name}</span>
              </div>
            </div>
          ) : (
            <div className="user-profile-guest">Гость</div>
          )}
        </div>
      </header>
      
      {breadcrumbs.length > 1 && (
        <nav className="breadcrumbs">
          {breadcrumbs.map((bc, idx) => (
            <span key={bc.path}>
              {idx === breadcrumbs.length - 1 ? (
                <span className="breadcrumb-current">{bc.name}</span>
              ) : (
                <Link to={bc.path} className="breadcrumb-link">{bc.name}</Link>
              )}
              {idx < breadcrumbs.length - 1 && <span className="separator">/</span>}
            </span>
          ))}
        </nav>
      )}
    </div>
  );
};

export default Header;