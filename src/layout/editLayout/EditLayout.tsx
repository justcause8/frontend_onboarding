import { Outlet } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';
import { Navigate } from 'react-router-dom';

const ALLOWED_ROLES = ['HrAdmin', 'Mentor', 'SuperAdmin'];

const EditLayout = () => {
  const { user, isLoading } = useUserStore();
  console.log(isLoading);

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default EditLayout;
