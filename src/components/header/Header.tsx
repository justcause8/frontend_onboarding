import { useUserStore } from '../../store/useUserStore';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';

interface HeaderProps {
  title: string;
}

const PAGE_TITLES: Record<string, string> = {
  '': 'Мой адаптационный маршут',
  'courses': 'Курсы',
  'course': 'Курс',
  'edit': 'Редактирование',
};

const Header = ({ title }: HeaderProps) => {
  const { user, loginAs, logout } = useUserStore();
  const location = useLocation();

  const handleLoginAs = () => {
    const login = prompt("Введите логин сотрудника (например, ivanov_ii):");
    if (login) {
      loginAs(login);
    }
  };

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((seg, idx) => {
    const path = '/' + pathSegments.slice(0, idx + 1).join('/');
    const name = PAGE_TITLES[seg] || seg.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return { name, path };
  });

  return (
    <>
      <div className="header-wrapper">
        <header className="header">
          <div className="header-left">
            <h1 className="header-title">{title}</h1>
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
        
        {breadcrumbs.length > 0 && (
          <nav className="breadcrumbs">
            {breadcrumbs.map((bc, idx) => (
              <span key={bc.path}>
                <Link to={bc.path}>{bc.name}</Link>
                {idx < breadcrumbs.length - 1 && <span className="separator">/</span>}
              </span>
            ))}
          </nav>
        )}
      </div>
    </>
  );
};

export default Header;
