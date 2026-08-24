import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { OrbitMark } from './OrbitMark';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-space-950">
        <OrbitMark size={40} className="animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
