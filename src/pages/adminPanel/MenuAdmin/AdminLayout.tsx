import { NavLink, Outlet } from 'react-router-dom';
import './AdminLayout.css';

export const AdminLayout = () => {
    return (
        <div className="admin-page">
            <div className="admin-tabs">
                <NavLink to="/admin" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`} end>
                    Адаптационные маршруты
                </NavLink>
                <NavLink to="/training" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
                    Обучающие курсы
                </NavLink>
                <NavLink to="/testPage" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
                    Тесты
                </NavLink>
                <NavLink to="/users" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
                    Пользователи
                </NavLink>
            </div>

            <div className="admin-content">
                <Outlet />
            </div>
        </div>
    );
};