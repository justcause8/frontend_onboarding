import { useUserStore } from '../../store/useUserStore';
import { Link, useLocation } from 'react-router-dom';
import { getPageTitle, getBreadcrumbs } from '../../utils/routeUtils';
import { usePageTitle } from '../../contexts/PageTitleContext';
import './Header.css';

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