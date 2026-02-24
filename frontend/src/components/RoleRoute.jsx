import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore.js';

// redirect unauthorized users to the forbidden page based on their role
export default function RoleRoute({ roles, children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || !roles.includes(user.role)) return <Navigate to="/forbidden" replace />;
  return children;
}
