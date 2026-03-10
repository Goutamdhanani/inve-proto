import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore.js';

// redirect unauthenticated users to login page
export default function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
