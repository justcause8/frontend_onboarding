import { Outlet, useLocation } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';
import Sidebar from '../components/sidebar/Sidebar';
import Header from '../components/header/Header';
import LoadingSpinner from '../components/loading/LoadingSpinner';
import "./MainLayout.css"

const MainLayout = () => {
  const { isLoading } = useUserStore();
  const location = useLocation();

  // Определяем, находимся ли мы в режиме редактирования по префиксу пути
  const isEditMode = location.pathname.startsWith('/edit');

  return (
    /* Добавляем класс edit-mode динамически */
    <div className={`container ${isEditMode ? 'edit-mode' : ''}`}>
      <Sidebar />

      <div className="main">
        <div className="main-header">
          <Header/>
        </div>

        <main className="main-content">
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;