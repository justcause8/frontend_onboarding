import { useUserStore } from '../../store/useUserStore';

interface HeaderProps {
  title: string;
}

const Header = ({ title }: HeaderProps) => {
  const { user, loginAs, logout } = useUserStore(); // fetchUser здесь больше не нужен для кнопки

  const handleLoginAs = () => {
    const login = prompt("Введите логин сотрудника (например, ivanov_ii):");
    if (login) {
      loginAs(login);
    }
  };

  return (
    <header className="main-header" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0 20px',
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #ddd'
    }}>
      <h1>{title}</h1>

      <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Кнопка "Войти как" остается для режима разработки/тестирования */}
          <button 
            onClick={handleLoginAs}
            style={{ 
              fontSize: '12px', 
              padding: '6px 12px',
              cursor: 'pointer',
              border: '1px dashed #F97316',
              borderRadius: '4px',
              background: 'none',
              color: '#F97316'
            }}
          >
            Войти как...
          </button>
        </div>

        {/* ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '1px solid #ccc', paddingLeft: '15px' }}>
          <div className="avatar" style={{
            width: '35px',
            height: '35px',
            borderRadius: '50%',
            backgroundColor: '#e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '12px'
          }}>
            {user && user.role !== 'None' 
              ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
              : '??'}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="user-name" style={{ fontSize: '14px', fontWeight: '500' }}>
              {user && user.role !== 'None' ? user.name : 'Гость'}
            </span>
            
            {/* Кнопка Выход появляется только если пользователь реально авторизован */}
            {user && user.role !== 'None' && (
              <button 
                onClick={logout}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#EF4444', 
                  padding: 0, 
                  fontSize: '11px', 
                  textAlign: 'left', 
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Выйти
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;