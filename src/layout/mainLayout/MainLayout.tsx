import { Outlet } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';
import Sidebar from '../../components/sidebar/Sidebar';
import Header from '../../components/header/Header';
import LoadingSpinner from '../../components/loading/LoadingSpinner';
import "./MainLayout.css"

const MainLayout = () => {
  const { isLoading } = useUserStore();
  console.log(isLoading);

  return (
    <div className="container">
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
