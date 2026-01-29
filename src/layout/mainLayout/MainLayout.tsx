import { Outlet } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';
import Sidebar from '../../components/sidebar/Sidebar';
import Header from '../../components/header/Header';
import "./MainLayout.css"

const MainLayout = () => {
  const { isLoading } = useUserStore();
  console.log(isLoading);

  return (
    <div className="dashboard-container">
      <Sidebar />

      <div className="main-content">
        <Header title='Нужно изменить'/>

        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
