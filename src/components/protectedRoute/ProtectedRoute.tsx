import { Navigate } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';
import LoadingSpinner from '../loading/LoadingSpinner';

const ALLOWED_ROLES = ['HrAdmin', 'Mentor', 'SuperAdmin'];

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, isLoading } = useUserStore();

    if (isLoading) return <LoadingSpinner />;

    if (!user || !ALLOWED_ROLES.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
